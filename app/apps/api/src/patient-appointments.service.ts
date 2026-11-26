import {Injectable,Inject,ConflictException,UnauthorizedException} from '@nestjs/common';
import {randomUUID,createHash} from 'node:crypto';
import {DatabaseService} from './database.service';
import type {PatientActor} from './auth.service';
import {FollowupQueueCursor} from './followup-queue-domain';
import {patientAppointmentsQuery,patientAppointmentUpcoming,patientAppointmentActions,
 patientAppointmentsSummary,type PatientAppointmentsQuery} from './patient-appointments-domain';
const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
@Injectable()
export class PatientAppointmentsService {
 private readonly cursors=new FollowupQueueCursor();
 constructor(@Inject(DatabaseService)readonly db:DatabaseService){}
 async legacy(a:PatientActor){return (await this.list(a,{...patientAppointmentsQuery({}),limit:50},true)).items;}
 async list(a:PatientActor,q:PatientAppointmentsQuery,legacy=false){
  const c=await this.db.pool.connect();
  try{
   await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
   const identity=await c.query(`SELECT 1 FROM adc_auth.local_identity i
    JOIN adc.patient_booking_subject s ON s.booking_subject_id=i.booking_subject_id
    WHERE i.identity_id=$1 AND i.booking_subject_id=$2 AND i.enabled=true
     AND s.verification_kind='online' AND s.verified_identity_key IS NOT NULL`,[a.identityId,a.subjectId]);
   if(!identity.rowCount)throw new UnauthorizedException('本人验证已失效，请重新验证。');
   const clinics=(await c.query(`SELECT DISTINCT cl.clinic_id id,cl.name FROM adc.appointment a
    JOIN adc.clinic cl ON cl.clinic_id=a.clinic_id WHERE a.booking_subject_id=$1
    ORDER BY cl.clinic_id LIMIT 201`,[a.subjectId])).rows;
   if(clinics.length>200)throw new ConflictException('本人预约涉及诊所过多，请联系前台核实；未截断诊所目录。');
   const rows=(await c.query(`SELECT a.appointment_id id,a.row_version::int version,a.disposition,
    a.booked_name name,a.booked_contact contact,a.confirmation_note intention,
    a.scheduled_at "startsAt",a.scheduled_at::text sort_key,a.scheduled_end_at "endsAt",
    a.scheduled_end_at::text end_key,a.cancel_cutoff_at "cancelCutoffAt",
    a.reschedule_cutoff_at "rescheduleCutoffAt",a.cancel_reason "cancelReason",
    e.public_name "doctorName",cl.name "clinicName",cl.clinic_id "clinicId",cl.address,
    v.service_name "serviceName",v.duration_minutes "durationMinutes",
    a.service_version_id "serviceVersionId",a.rule_version_id "ruleVersionId",
    a.schedule_id "scheduleId",a.doctor_id "doctorId",r.self_service_enabled "ruleEnabled",
    EXISTS(SELECT 1 FROM adc.visit x WHERE x.appointment_id=a.appointment_id) "actualVisit"
    FROM adc.appointment a JOIN adc.employee e ON e.employee_id=a.doctor_id
    JOIN adc.clinic cl ON cl.clinic_id=a.clinic_id
    JOIN adc.booking_service_version v ON v.service_version_id=a.service_version_id
    JOIN adc.clinic_booking_rule_version r ON r.rule_version_id=a.rule_version_id
    WHERE a.booking_subject_id=$1 AND($2::uuid IS NULL OR a.clinic_id=$2)
     AND($3::date IS NULL OR (a.scheduled_at AT TIME ZONE 'Asia/Shanghai')::date>=$3::date)
     AND($4::date IS NULL OR (a.scheduled_at AT TIME ZONE 'Asia/Shanghai')::date<=$4::date)
    ORDER BY a.scheduled_at DESC,a.appointment_id DESC LIMIT 5001`,
    [a.subjectId,q.clinicId,q.fromDate,q.toDate])).rows;
   if(rows.length>5000)throw new ConflictException('本人预约超过5000份，请选择日期或诊所后查询；未截断结果。');
   const fingerprint=hash([rows,clinics]),scope=hash(['patient_appointments',a.identityId,a.subjectId,
    q.fromDate,q.toDate,q.clinicId,q.state,q.limit,...(q.soonest?['soonest']:[])]),token=q.cursor?this.cursors.decode(q.cursor):null;
   if(token&&(token.scope!==scope||token.fingerprint!==fingerprint||typeof token.lastId!=='string'))
    throw new ConflictException('本人预约或筛选条件已变化，请重新查询。');
   const asOf=token?.asOf||(await c.query('SELECT clock_timestamp()::text value')).rows[0].value,
    now=new Date(asOf),expires=token?.expires||Date.now()+15*60000;
   const filtered=rows.filter(r=>{
    if(q.state==='upcoming')return patientAppointmentUpcoming(r,now);
    if(q.state==='history')return !patientAppointmentUpcoming(r,now);
    return q.state==='all'||r.disposition===q.state;
   });
   if(q.soonest)filtered.reverse();
   if(legacy&&filtered.length>q.limit)throw new ConflictException('本人预约较多，请使用“我的预约”的筛选分页入口；未截断记录。');
   const index=token?filtered.findIndex(r=>r.id===token.lastId)+1:0;
   if(token&&index===0)throw new ConflictException('原本人预约续页位置已变化，请重新查询。');
   const page=filtered.slice(index,index+q.limit),result={
    items:page.map(({actualVisit,ruleEnabled,sort_key,end_key,...r})=>({...r,
     ...patientAppointmentActions({...r,actualVisit,ruleEnabled},now)})),
    clinics,total:filtered.length,summary:patientAppointmentsSummary(rows,now),limit:q.limit,
    asOf:now.toISOString(),nextCursor:index+page.length<filtered.length?this.cursors.encode({scope,
     fingerprint,asOf,expires,lastId:page.at(-1).id}):null};
   if(Buffer.byteLength(JSON.stringify(result))>5*1024*1024)
    throw new ConflictException('本人预约结果超过5MiB，请减少每页数量。');
   const op=randomUUID(),directoryClinics=legacy?[]:clinics.map(r=>r.id);
   await c.query(`INSERT INTO adc.business_operation(operation_id,patient_actor_id,occurred_at,
    action_code,subject_kind,subject_key,access_scope)
    VALUES($1,$2,clock_timestamp(),'patient.appointments.list','patient_appointment_queue',$3,$4)`,
    [op,a.subjectId,a.subjectId,JSON.stringify({filters:{fromDate:q.fromDate,toDate:q.toDate,clinicId:q.clinicId,
     state:q.state},clinicIds:directoryClinics,appointmentIds:page.map(r=>r.id),total:result.total,limit:q.limit,asOf:result.asOf})]);
   for(const clinic of new Set([...page.map(r=>r.clinicId),...directoryClinics]))await c.query('INSERT INTO adc.operation_clinic VALUES($1,$2)',[op,clinic]);
   await c.query('COMMIT');return result;
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }
}
