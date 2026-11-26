import{PatientAppointmentsService}from'./patient-appointments.service';import type{PatientAppointmentsQuery}from'./patient-appointments-domain';
import{availabilityDay,dailySlotStarts,operatingForSlot,shanghaiDay}from'./availability-domain';
import { Injectable,Inject,ConflictException,NotFoundException,ForbiddenException,UnauthorizedException,ServiceUnavailableException } from '@nestjs/common';
import type{bookingRecoveryQuery}from'./booking-recovery-domain';
import { randomUUID,createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import { DatabaseService } from './database.service';
import { AuthService,type PatientActor,type StaffActor } from './auth.service';
import { bookingInput,overlaps,peakOccupancy,beforeCutoff,versionInput } from './booking-domain';
type Selection=ReturnType<typeof bookingInput>;
const active="disposition IN ('active','arrived')";
const time=(v:unknown)=>new Date(v as string|Date);

@Injectable()
export class BookingService {
 constructor(@Inject(DatabaseService) readonly db:DatabaseService,@Inject(AuthService) private auth:AuthService,@Inject(PatientAppointmentsService)readonly patientAppointments:PatientAppointmentsService){}
 async catalogue(){
  const {rows}=await this.db.pool.query(`SELECT c.clinic_id AS "clinicId",c.name AS "clinicName",c.address,e.employee_id AS "doctorId",e.public_name AS "doctorName",e.public_specialty AS specialty,e.public_intro AS introduction,
  v.service_code AS "serviceCode",v.service_name AS "serviceName",v.service_version_id AS "serviceVersionId",v.duration_minutes AS "durationMinutes"
  FROM adc.booking_service_version v JOIN adc.clinic c ON c.clinic_id=v.clinic_id JOIN adc.employee e ON e.employee_id=v.doctor_id
  WHERE v.effective_from<=clock_timestamp() AND v.enabled=true AND e.public_enabled=true
  AND NOT EXISTS(SELECT 1 FROM adc.booking_service_version z WHERE z.clinic_id=v.clinic_id AND z.doctor_id=v.doctor_id AND z.service_code=v.service_code AND z.effective_from<=clock_timestamp() AND (z.effective_from>v.effective_from OR (z.effective_from=v.effective_from AND z.version_no>v.version_no)))
  ORDER BY c.name,e.public_name,v.service_code`);
  return {items:rows,localIdentity:process.env.ADC_LOCAL_IDENTITY_ENABLED==='true',demoDate:process.env.BOOKING_DEMO_DATE,baseline:166};
 }
 private async context(client:PoolClient,scheduleId:string,serviceVersionId:string,now:Date){
  const {rows}=await client.query(`SELECT s.*,e.public_name,e.public_specialty,e.public_enabled,c.name AS clinic_name,c.address,
   v.service_version_id,v.service_code,v.service_name,v.duration_minutes,v.enabled AS service_enabled,
   r.rule_version_id,r.self_cancel_lead_minutes,r.self_reschedule_lead_minutes,r.self_service_enabled
   FROM adc.doctor_schedule s JOIN adc.employee e ON e.employee_id=s.doctor_id JOIN adc.clinic c ON c.clinic_id=s.clinic_id
   LEFT JOIN LATERAL(SELECT x.* FROM adc.booking_service_version x WHERE x.clinic_id=s.clinic_id AND x.doctor_id=s.doctor_id AND x.service_code=(SELECT service_code FROM adc.booking_service_version WHERE service_version_id=$2) AND x.effective_from<=$3 ORDER BY x.effective_from DESC,x.version_no DESC LIMIT 1)v ON true
   LEFT JOIN LATERAL(SELECT x.* FROM adc.clinic_booking_rule_version x WHERE x.clinic_id=s.clinic_id AND x.effective_from<=$3 ORDER BY x.effective_from DESC,x.version_no DESC LIMIT 1)r ON true
   WHERE s.schedule_id=$1`,[scheduleId,serviceVersionId,now]);
  if(!rows[0])throw new NotFoundException('未找到该排班。');return rows[0];
 }
 private async operatingFacts(client:PoolClient,s:any,start:Date,end:Date){
  const practices=(await client.query(`SELECT valid_from::text,valid_to::text FROM adc.practice_assignment WHERE employee_id=$1 AND clinic_id=$2 AND practice_arrangement='enabled'
   AND valid_from<=($4::timestamptz AT TIME ZONE 'Asia/Shanghai')::date AND(valid_to IS NULL OR valid_to>=($3::timestamptz AT TIME ZONE 'Asia/Shanghai')::date) LIMIT 2001`,[s.doctor_id,s.clinic_id,start,new Date(+end-1)])).rows;
  const closures=(await client.query('SELECT effective_from,effective_to FROM adc.clinic_availability_plan WHERE clinic_id=$1 AND business_enabled=false AND effective_from<$3 AND(effective_to IS NULL OR effective_to>$2) LIMIT 2001',[s.clinic_id,start,end])).rows;
  if(practices.length>2000||closures.length>2000)throw new ConflictException('业务安排过多，请联系前台核实，未截断判断。');return{practices,closures};
 }
 private async operating(client:PoolClient,s:any,start:Date,end:Date){return operatingForSlot(await this.operatingFacts(client,s,start,end),+start,+end);}
 private async occupancy(client:PoolClient,s:any,start:Date,end:Date,exclude?:string){
  const {rows}=await client.query(`SELECT appointment_id,clinic_id,scheduled_at AS "startsAt",scheduled_end_at AS "endsAt" FROM adc.appointment WHERE doctor_id=$1 AND ${active} AND scheduled_at<$3 AND scheduled_end_at>$2 AND ($4::uuid IS NULL OR appointment_id<>$4)`,[s.doctor_id,start,end,exclude||null]);return rows;
 }
 async validate(client:PoolClient,input:Selection,now:Date,subject?:any,exclude?:string,frontdesk=false){
  const s=await this.context(client,input.scheduleId,input.serviceVersionId,now);
  if(s.service_version_id!==input.serviceVersionId||s.rule_version_id!==input.ruleVersionId)throw new ConflictException('预约配置已更新，请重新查询并核对。');
  if(!s.public_enabled||!s.service_enabled||!s.rule_version_id||(!frontdesk&&!s.self_service_enabled))throw new ConflictException('该服务或适用规则当前不可用，请联系前台。');
  if(!s.can_receive||s.public_status!=='open')throw new ConflictException('医生当前未开放预约，请重新选择。');
  const start=time(input.startsAt),end=new Date(+start+s.duration_minutes*60_000);
  if(+start<=+now||+start<+time(s.starts_at)||+end>+time(s.ends_at)||(+start-+time(s.starts_at))%(s.duration_minutes*60_000)!==0)throw new ConflictException('所选时间已过或不符合配置的完整服务时长。');
  if(!await this.operating(client,s,start,end))throw new ConflictException('当前执业或诊所业务安排不支持该预约。');
  const occupied=await this.occupancy(client,s,start,end,exclude);
  if(occupied.some(x=>x.clinic_id!==s.clinic_id)||peakOccupancy(+start,+end,occupied)>=s.capacity_limit)throw new ConflictException('时段已约满或存在医生跨诊所冲突，请另选。');
  if(subject){
   const conflict=await client.query(`SELECT 1 FROM adc.appointment WHERE ${active} AND (booking_subject_id=$1 OR ($2::uuid IS NOT NULL AND patient_id=$2)) AND scheduled_at<$4 AND scheduled_end_at>$3 AND ($5::uuid IS NULL OR appointment_id<>$5)`,[subject.subjectId,subject.patientId,start,end,exclude||null]);
   if(conflict.rowCount)throw new ConflictException('您已有相同时段的预约，请选择其他时间。');
  }
  return {schedule:s,startsAt:start.toISOString(),endsAt:end.toISOString(),durationMinutes:s.duration_minutes,
   cancelCutoffAt:new Date(+start-s.self_cancel_lead_minutes*60_000).toISOString(),rescheduleCutoffAt:new Date(+start-s.self_reschedule_lead_minutes*60_000).toISOString(),
   ruleVersionId:s.rule_version_id,serviceVersionId:s.service_version_id,doctorName:s.public_name,clinicName:s.clinic_name,address:s.address,serviceName:s.service_name};
 }
 private async readAvailability<T>(read:(client:PoolClient,now:Date)=>Promise<T>){
  const client=await this.db.pool.connect();try{
   await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
   const now=time((await client.query('SELECT clock_timestamp() AS now')).rows[0].now);
   const result=await read(client,now);
   await client.query('COMMIT');return result;
  }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }
 async availability(date:string,doctorId?:string,clinicId?:string,serviceVersionId?:string){
  return this.readAvailability((client,now)=>this.availabilityForDay(client,now,date,doctorId,clinicId,serviceVersionId));
 }
 async nextAvailability(after:string,doctorId:string,clinicId:string,serviceVersionId:string){
  return this.readAvailability(async(client,now)=>{
   const dayMs=24*60*60*1000;
   const start=Math.max(availabilityDay(after).end,availabilityDay(shanghaiDay(now)).start);
   const end=Math.min(start+30*dayMs,availabilityDay('9999-12-31').end);
   const queriedAt=now.toISOString();
   if(start>=end)return {date:null,groups:[],searchedFrom:null,searchedThrough:null,queriedAt};
   const searchedFrom=shanghaiDay(start),searchedThrough=shanghaiDay(end-1);
   const days=Array.from({length:(end-start)/dayMs},(_,i)=>new Date(start+i*dayMs));
   const {rows}=await client.query<{day:Date}>(`SELECT candidate.day FROM unnest($1::timestamptz[]) AS candidate(day)
    WHERE EXISTS (SELECT 1 FROM adc.doctor_schedule s JOIN adc.employee e ON e.employee_id=s.doctor_id AND e.public_enabled
     WHERE s.doctor_id=$2 AND s.clinic_id=$3 AND s.can_receive AND s.public_status='open'
      AND s.starts_at<candidate.day+interval '24 hours' AND s.ends_at>candidate.day AND s.ends_at>$4)
    ORDER BY candidate.day`,[days,doctorId,clinicId,now]);
   for(const row of rows){
    const date=shanghaiDay(row.day);
    const result=await this.availabilityForDay(client,now,date,doctorId,clinicId,serviceVersionId);
    if(result.groups.some(group=>group.slots.some(slot=>slot.status==='available')))
     return {...result,date,searchedFrom,searchedThrough};
   }
   return {date:null,groups:[],searchedFrom,searchedThrough,queriedAt};
  });
 }
 private async availabilityForDay(client:PoolClient,now:Date,date:string,doctorId?:string,clinicId?:string,serviceVersionId?:string){
   const range=availabilityDay(date);
   const {rows}=await client.query(`SELECT s.schedule_id,v.service_version_id FROM adc.doctor_schedule s JOIN adc.employee e ON e.employee_id=s.doctor_id AND e.public_enabled=true
    JOIN adc.booking_service_version v ON v.clinic_id=s.clinic_id AND v.doctor_id=s.doctor_id
    WHERE s.starts_at<$6::timestamptz AND s.ends_at>$1::timestamptz AND ($2::uuid IS NULL OR s.doctor_id=$2) AND ($3::uuid IS NULL OR s.clinic_id=$3) AND ($4::uuid IS NULL OR v.service_version_id=$4)
    AND v.effective_from<=$5 AND NOT EXISTS(SELECT 1 FROM adc.booking_service_version z WHERE z.clinic_id=v.clinic_id AND z.doctor_id=v.doctor_id AND z.service_code=v.service_code AND z.effective_from<=$5 AND (z.effective_from>v.effective_from OR (z.effective_from=v.effective_from AND z.version_no>v.version_no))) ORDER BY s.starts_at,s.schedule_id,v.service_version_id LIMIT 501`,[new Date(range.start),doctorId||null,clinicId||null,serviceVersionId||null,now,new Date(range.end)]);
   if(rows.length>500)throw new ConflictException('时段安排过多，请选择诊所、医生和具体服务后查询；未截断结果。');
   const groups=[];let slotCount=0;
   for(const row of rows){
    const s=await this.context(client,row.schedule_id,row.service_version_id,now),starts=dailySlotStarts(time(s.starts_at),time(s.ends_at),s.duration_minutes,date);
    if(!starts.length)continue;slotCount+=starts.length;if(slotCount>5000)throw new ConflictException('完整时段超过5000项，请选择具体诊所、医生和服务；未截断结果。');
    const spanStart=new Date(starts[0]!),spanEnd=new Date(starts.at(-1)!+s.duration_minutes*60000),facts=await this.operatingFacts(client,s,spanStart,spanEnd);
    const occupied=await this.occupancy(client,s,spanStart,spanEnd);const slots=[];
    for(const start of starts){
     const end=start+s.duration_minutes*60_000,operating=operatingForSlot(facts,start,end);
     const status=!s.can_receive||!operating?'closed':s.public_status==='not_open'?'not_open':s.public_status==='paused'?'paused':!s.service_enabled||!s.self_service_enabled||!s.rule_version_id?'config_unavailable':start<=+now?'past':occupied.some(x=>x.clinic_id!==s.clinic_id&&overlaps({startsAt:new Date(start),endsAt:new Date(end)},x))||peakOccupancy(start,end,occupied)>=s.capacity_limit?'full':'available';
     slots.push({startsAt:new Date(start).toISOString(),endsAt:new Date(end).toISOString(),status});
    }
    groups.push({scheduleId:s.schedule_id,doctorId:s.doctor_id,doctorName:s.public_name,specialty:s.public_specialty,clinicId:s.clinic_id,clinicName:s.clinic_name,address:s.address,serviceVersionId:s.service_version_id,ruleVersionId:s.rule_version_id,serviceName:s.service_name,durationMinutes:s.duration_minutes,slots});
   }
   const result={queriedAt:now.toISOString(),groups};if(Buffer.byteLength(JSON.stringify(result))>5*1024*1024)throw new ConflictException('时段结果超过5MiB，请缩小诊所、医生或服务范围。');
   return result;
 }
 async quote(input:Selection){const c=await this.db.pool.connect();try{await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');const now=time((await c.query('SELECT clock_timestamp() AS now')).rows[0].now);const {schedule,...q}=await this.validate(c,input,now);await c.query('COMMIT');return {...q,queriedAt:now.toISOString()};}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
 async view(c:PoolClient,id:string,subjectId?:string){
  const {rows}=await c.query(`SELECT a.appointment_id AS id,a.row_version::int AS version,a.disposition,a.booked_name AS name,a.booked_contact AS contact,a.confirmation_note AS intention,
   a.scheduled_at AS "startsAt",a.scheduled_end_at AS "endsAt",a.cancel_cutoff_at AS "cancelCutoffAt",a.reschedule_cutoff_at AS "rescheduleCutoffAt",
   a.cancel_reason AS "cancelReason",e.public_name AS "doctorName",c.name AS "clinicName",c.clinic_id AS "clinicId",c.address,v.service_name AS "serviceName",v.duration_minutes AS "durationMinutes",
   a.service_version_id AS "serviceVersionId",a.rule_version_id AS "ruleVersionId",a.schedule_id AS "scheduleId",a.doctor_id AS "doctorId"
   FROM adc.appointment a JOIN adc.employee e ON e.employee_id=a.doctor_id JOIN adc.clinic c ON c.clinic_id=a.clinic_id JOIN adc.booking_service_version v ON v.service_version_id=a.service_version_id
   WHERE a.appointment_id=$1 AND ($2::uuid IS NULL OR a.booking_subject_id=$2)`,[id,subjectId||null]);
  if(!rows[0])throw new NotFoundException('未找到本人预约。');return rows[0];
 }
 async mine(actor:PatientActor){return this.patientAppointments.legacy(actor);}
 async minePage(actor:PatientActor,q:PatientAppointmentsQuery){return this.patientAppointments.list(actor,q);}
 async commandStatus(actor:PatientActor,requestId:string,q:ReturnType<typeof bookingRecoveryQuery>){
  const c=await this.db.pool.connect();try{
   await c.query('BEGIN');
   const identity=await c.query(`SELECT 1 FROM adc_auth.local_identity i JOIN adc.patient_booking_subject s
    ON s.booking_subject_id=i.booking_subject_id WHERE i.identity_id=$1 AND i.booking_subject_id=$2
    AND i.enabled=true AND s.verification_kind='online' AND s.verified_identity_key IS NOT NULL FOR SHARE OF i,s`,[actor.identityId,actor.subjectId]);
   if(!identity.rowCount)throw new UnauthorizedException('本人验证已失效，请重新验证。');
   const now=(await c.query('SELECT clock_timestamp() AS now')).rows[0].now;
   // The original command owns the same request lock until commit/rollback. A status
   // lookup never waits for it and never executes a command on an absent result.
   const locked=(await c.query('SELECT pg_try_advisory_xact_lock(hashtextextended($1,0)) AS locked',[`patient-request:${actor.subjectId}:${requestId.toLowerCase()}`])).rows[0].locked;
   let result:any={state:locked?'not_found':'processing',kind:q.kind,queriedAt:now.toISOString()},clinic:string|null=null;
   if(locked){
    const p=(await c.query(`SELECT d.result_key,o.after_content,o.occurred_at,o.subject_key,o.subject_kind,o.action_code
     FROM adc.command_dedup d JOIN adc.business_operation o ON o.operation_id=d.operation_id
     WHERE d.request_key=$1 AND d.patient_actor_id=$2 AND o.patient_actor_id=$2
      AND d.command_code=$3 AND d.result_kind='appointment'
      AND($4::text IS NULL OR d.result_key=$4)`,[requestId,actor.subjectId,q.kind,q.appointmentId||null])).rows[0];
    if(p){
     const original=p.after_content;
     if(p.subject_kind!=='appointment'||p.action_code!==q.kind||p.subject_key!==p.result_key||original?.appointment_id!==p.result_key||original?.booking_subject_id!==actor.subjectId||!Number.isSafeInteger(Number(original.row_version))||Number(original.row_version)<1||!['active','cancelled','arrived','no_show'].includes(original.disposition)||typeof original.clinic_id!=='string')
      throw new ServiceUnavailableException('原请求结果暂不能完整核实，请稍后查询；请勿重新办理。');
     result={...result,state:'completed',appointmentId:p.result_key,version:Number(original.row_version),disposition:original.disposition,completedAt:p.occurred_at.toISOString()};clinic=original.clinic_id;
    }
   }
   const op=randomUUID(),scope={requestId,commandKind:q.kind,state:result.state,appointmentIds:result.appointmentId?[result.appointmentId]:[],queriedAt:result.queriedAt};
   await c.query(`INSERT INTO adc.business_operation(operation_id,patient_actor_id,occurred_at,action_code,subject_kind,subject_key,access_scope)
    VALUES($1,$2,clock_timestamp(),'patient.appointment-command.view','patient_booking_subject',$3,$4)`,[op,actor.subjectId,actor.subjectId,JSON.stringify(scope)]);
   if(clinic)await c.query('INSERT INTO adc.operation_clinic(operation_id,clinic_id) VALUES($1,$2)',[op,clinic]);
   await c.query('COMMIT');return result;
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }
 async staffList(actor:StaffActor,date:string,clinicId?:string){
  const allowed=await this.auth.clinics(actor,'appointment.read');if(clinicId&&!allowed.some(c=>c.id===clinicId))throw new ForbiddenException('没有该诊所的预约查看权限。');
  if(!allowed.length)throw new ForbiddenException('当前账号没有预约查看范围。');
  const c=await this.db.pool.connect();try{const {rows}=await c.query("SELECT appointment_id FROM adc.appointment WHERE clinic_id=ANY($1::uuid[]) AND (scheduled_at AT TIME ZONE 'Asia/Shanghai')::date=$2::date ORDER BY scheduled_at",[clinicId?[clinicId]:allowed.map(x=>x.id),date]);return {clinics:allowed,items:await Promise.all(rows.map(r=>this.view(c,r.appointment_id)))};}finally{c.release();}
 }
 private async audit(c:PoolClient,id:string,actor:PatientActor,kind:string,before:any,reason:string|null,requestId:string,fingerprint:string){
  const after=(await c.query('SELECT * FROM adc.appointment WHERE appointment_id=$1',[id])).rows[0];const operationId=randomUUID();
  await c.query(`INSERT INTO adc.business_operation(operation_id,patient_actor_id,occurred_at,action_code,subject_kind,subject_key,before_content,after_content,reason) VALUES($1,$2,clock_timestamp(),$3,'appointment',$4,$5,$6,$7)`,[operationId,actor.subjectId,kind,id,before?JSON.stringify(before):null,JSON.stringify(after),reason]);
  await c.query('INSERT INTO adc.operation_clinic VALUES($1,$2)',[operationId,after.clinic_id]);
  if(before&&before.clinic_id!==after.clinic_id)await c.query('INSERT INTO adc.operation_clinic VALUES($1,$2)',[operationId,before.clinic_id]);
  await c.query(`INSERT INTO adc.appointment_revision SELECT $1,a.appointment_id,a.row_version,a.patient_id,a.clinic_id,a.doctor_id,a.scheduled_at,a.cancelled_at,a.confirmation_note,$2,a.booking_subject_id,a.booked_name,a.booked_contact,a.schedule_id,a.schedule_row_version,a.service_version_id,a.scheduled_end_at,a.rule_version_id,a.cancel_cutoff_at,a.reschedule_cutoff_at,a.disposition,a.cancel_channel,a.cancel_reason,a.no_show_verified_at,a.no_show_verified_by,a.no_show_basis FROM adc.appointment a WHERE appointment_id=$3`,[randomUUID(),operationId,id]);
  await c.query("INSERT INTO adc.command_dedup(request_key,patient_actor_id,command_code,payload_fingerprint,operation_id,result_kind,result_key) VALUES($1,$2,$3,$4,$5,'appointment',$6)",[requestId,actor.subjectId,kind,fingerprint,operationId,id]);
  return {...await this.view(c,id,actor.subjectId),repeated:false};
 }
 async command(actor:PatientActor,kind:'book'|'reschedule'|'cancel',input:any,id?:string,afterWrite?:()=>Promise<void>){
  const fingerprint=createHash('sha256').update(JSON.stringify({kind,id:id||null,input})).digest('hex');
  const c=await this.db.pool.connect();try{
   await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['request:'+input.requestId.toLowerCase()]);
   await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`patient-request:${actor.subjectId}:${input.requestId.toLowerCase()}`]);
   // Recheck local adapter/subject in the transaction, not a caller-supplied subject or phone.
   const valid=await c.query('SELECT s.patient_id FROM adc_auth.local_identity i JOIN adc.patient_booking_subject s ON s.booking_subject_id=i.booking_subject_id WHERE i.identity_id=$1 AND i.booking_subject_id=$2 AND i.enabled=true',[actor.identityId,actor.subjectId]);
   if(!valid.rowCount)throw new ForbiddenException('本人验证已失效。');actor={...actor,patientId:valid.rows[0].patient_id};
   const prior=await c.query('SELECT d.*,o.after_content FROM adc.command_dedup d JOIN adc.business_operation o ON o.operation_id=d.operation_id WHERE lower(d.request_key)=lower($1)',[input.requestId]);
   if(prior.rows.length>1)throw new ServiceUnavailableException('原请求标识有歧义，请联系核实。');
   if(prior.rowCount){const p=prior.rows[0];if(p.patient_actor_id!==actor.subjectId||p.command_code!==kind||p.payload_fingerprint!==fingerprint)throw new ConflictException('请求标识已使用，请核对原提交。');await c.query('COMMIT');return {id:p.result_key,version:Number(p.after_content.row_version),disposition:p.after_content.disposition,repeated:true,originalResult:true};}
   let before:any=null;
   if(id){before=(await c.query('SELECT * FROM adc.appointment WHERE appointment_id=$1 AND booking_subject_id=$2',[id,actor.subjectId])).rows[0];if(!before)throw new NotFoundException('未找到本人预约。');}
   const newSchedule=kind==='cancel'?null:(await c.query('SELECT doctor_id,clinic_id FROM adc.doctor_schedule WHERE schedule_id=$1',[input.scheduleId])).rows[0],newDoctor=newSchedule?.doctor_id;
   const locks=[...(before?[`clinic-config:${before.clinic_id}`]:[]),...(newSchedule?[`clinic-config:${newSchedule.clinic_id}`]:[]),`subject:${actor.subjectId}`,...(actor.patientId?[`patient:${actor.patientId}`]:[]),...(before?[`doctor:${before.doctor_id}`]:[]),...(newDoctor?[`doctor:${newDoctor}`]:[])];
   for(const lock of [...new Set(locks)].sort())await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[lock]);
   if(id){before=(await c.query('SELECT * FROM adc.appointment WHERE appointment_id=$1 AND booking_subject_id=$2 FOR UPDATE',[id,actor.subjectId])).rows[0];if(!before)throw new NotFoundException('未找到本人预约。');}
   const now=time((await c.query('SELECT clock_timestamp() AS now')).rows[0].now);
   if(before){if(Number(before.row_version)!==versionInput(input.version))throw new ConflictException('预约已发生变化，请刷新后核对。');if(before.disposition!=='active')throw new ConflictException('当前预约已到院或已结案，不能自助变更，请联系前台。');
    const rule=(await c.query('SELECT self_service_enabled FROM adc.clinic_booking_rule_version WHERE rule_version_id=$1',[before.rule_version_id])).rows[0];
    if(!rule?.self_service_enabled||!beforeCutoff(now,kind==='cancel'?before.cancel_cutoff_at:before.reschedule_cutoff_at))throw new ConflictException('已到变更截止或规则不可用，请联系前台。');
   }
   if(kind==='cancel'){
    await c.query("UPDATE adc.appointment SET disposition='cancelled',cancelled_at=$2,cancel_reason=$3,cancel_channel='patient_self',row_version=row_version+1 WHERE appointment_id=$1",[id,now,input.reason]);
   }else{
    await c.query('SELECT 1 FROM adc.doctor_schedule WHERE schedule_id=$1 FOR UPDATE',[input.scheduleId]);const q=await this.validate(c,input,now,actor,id);const s=q.schedule;
    if(kind==='reschedule'){
     await c.query(`UPDATE adc.appointment SET clinic_id=$2,doctor_id=$3,scheduled_at=$4,scheduled_end_at=$5,schedule_id=$6,schedule_row_version=$7,service_version_id=$8,rule_version_id=$9,cancel_cutoff_at=$10,reschedule_cutoff_at=$11,booked_name=$12,booked_contact=$13,confirmation_note=$14,row_version=row_version+1 WHERE appointment_id=$1`,[id,s.clinic_id,s.doctor_id,q.startsAt,q.endsAt,s.schedule_id,s.row_version,q.serviceVersionId,q.ruleVersionId,q.cancelCutoffAt,q.rescheduleCutoffAt,input.name,input.contact,input.intention]);
    }else{
     id=randomUUID();await c.query(`INSERT INTO adc.appointment(appointment_id,patient_id,booking_subject_id,clinic_id,doctor_id,scheduled_at,scheduled_end_at,schedule_id,schedule_row_version,service_version_id,rule_version_id,cancel_cutoff_at,reschedule_cutoff_at,booked_name,booked_contact,confirmation_note,row_version,disposition)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,1,'active')`,[id,actor.patientId,actor.subjectId,s.clinic_id,s.doctor_id,q.startsAt,q.endsAt,s.schedule_id,s.row_version,q.serviceVersionId,q.ruleVersionId,q.cancelCutoffAt,q.rescheduleCutoffAt,input.name,input.contact,input.intention]);
    }
   }
   if(afterWrite)await afterWrite();const result=await this.audit(c,id!,actor,kind,before,kind==='cancel'?input.reason:null,input.requestId,fingerprint);await c.query('COMMIT');return result;
  }catch(error){await c.query('ROLLBACK');throw error;}finally{c.release();}
 }
}
