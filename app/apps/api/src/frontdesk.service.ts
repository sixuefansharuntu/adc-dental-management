import{ScheduleQueueService}from'./schedule-queue.service';import type{ScheduleQueueQuery}from'./schedule-queue-domain';
import{VisitQueueService}from'./visit-queue.service';import type{VisitQueueQuery}from'./visit-queue-domain';
import{AppointmentQueueService}from'./appointment-queue.service';import type{AppointmentQueueQuery}from'./appointment-queue-domain';
import{FrontdeskIdentityService}from'./frontdesk-identity.service';import type{IdentitySearchQuery}from'./frontdesk-identity-domain';
import { Injectable,Inject,ConflictException,NotFoundException,ForbiddenException,BadRequestException,ServiceUnavailableException } from '@nestjs/common';
import { randomUUID,createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import { DatabaseService } from './database.service';
import { AuthService,type StaffActor } from './auth.service';
import { BookingService } from './booking.service';
import { contactDue,actualTime,assertTimeOrder,assignmentValid } from './frontdesk-domain';
import { contactInput } from './booking-domain';

type Context={c:PoolClient;now:Date};
type Effect={result:any;subjectKind:string;subjectKey:string;before?:any;after?:any;reason?:string;revisions?:{kind:string;id:string}[];afterAudit?:(c:PoolClient,operationId:string)=>Promise<void>};
const digest=(x:any)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const day=(x:Date|string)=>new Date(x).toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'});
const revisionTypes:Record<string,{table:string;id:string;root:string;rootId:string}>={
 practice:{table:'practice_revision',id:'practice_revision_id',root:'practice_assignment',rootId:'practice_id'},
 patient:{table:'patient_revision',id:'patient_revision_id',root:'patient',rootId:'patient_id'},
 appointment:{table:'appointment_revision',id:'appointment_revision_id',root:'appointment',rootId:'appointment_id'},
 schedule:{table:'schedule_revision',id:'schedule_revision_id',root:'doctor_schedule',rootId:'schedule_id'},
 visit:{table:'visit_revision',id:'visit_revision_id',root:'visit',rootId:'visit_id'},
 record:{table:'clinical_record_revision',id:'record_revision_id',root:'clinical_record',rootId:'record_id'},
 treatment:{table:'treatment_revision',id:'treatment_revision_id',root:'treatment',rootId:'treatment_id'},
 bill:{table:'bill_revision',id:'bill_revision_id',root:'treatment_bill',rootId:'bill_id'},
 receipt:{table:'receipt_revision',id:'receipt_revision_id',root:'receipt',rootId:'receipt_id'},
 image:{table:'clinical_image_revision',id:'image_revision_id',root:'clinical_image',rootId:'image_id'},
 expense:{table:'expense_revision',id:'expense_revision_id',root:'operating_expense',rootId:'expense_id'},
 issue:{table:'issue_revision',id:'issue_revision_id',root:'material_issue',rootId:'issue_id'}
};
@Injectable()
export class FrontdeskService {
 constructor(@Inject(DatabaseService)readonly db:DatabaseService,@Inject(AuthService)readonly auth:AuthService,@Inject(BookingService)readonly booking:BookingService,@Inject(FrontdeskIdentityService)readonly identity:FrontdeskIdentityService,@Inject(AppointmentQueueService)readonly queue:AppointmentQueueService,@Inject(VisitQueueService)readonly visitQueue:VisitQueueService,@Inject(ScheduleQueueService)readonly scheduleQueue:ScheduleQueueService){}
 async insert(c:PoolClient,table:string,data:Record<string,unknown>){const cols=Object.keys(data);return c.query(`INSERT INTO adc.${table}(${cols.join(',')}) VALUES(${cols.map((_,i)=>'$'+(i+1)).join(',')})`,Object.values(data));}
 async snapshot(c:PoolClient,kind:string,id:string,op:string){
  const t=revisionTypes[kind];if(!t)throw Error('Invalid revision kind');const row=(await c.query(`SELECT * FROM adc.${t.root} WHERE ${t.rootId}=$1`,[id])).rows[0];
  const cols=(await c.query('SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2',['adc',t.table])).rows.map(x=>x.column_name);
  const key=randomUUID();const extra:any={};
  if(kind==='bill')extra.visit_revision_id=(await c.query('SELECT r.visit_revision_id FROM adc.visit_revision r JOIN adc.visit v ON v.visit_id=r.visit_id AND v.row_version=r.version_no WHERE v.visit_id=$1',[row.visit_id])).rows[0]?.visit_revision_id;
  if(kind==='receipt'){
   if(Number(row.row_version)>1){const prev=(await c.query('SELECT bill_revision_id,sale_revision_id FROM adc.receipt_revision WHERE receipt_id=$1 AND version_no=$2',[id,Number(row.row_version)-1])).rows[0];if(!prev)throw new ConflictException('前一收款原版缺失，不能替换采用单据。');Object.assign(extra,prev);}
   else{extra.bill_revision_id=row.bill_id?(await c.query('SELECT r.bill_revision_id FROM adc.bill_revision r JOIN adc.treatment_bill b ON b.bill_id=r.bill_id AND b.row_version=r.version_no WHERE b.bill_id=$1',[row.bill_id])).rows[0]?.bill_revision_id:null;extra.sale_revision_id=row.sale_id?(await c.query('SELECT r.sale_revision_id FROM adc.sale_revision r JOIN adc.product_sale s ON s.sale_id=r.sale_id AND s.row_version=r.version_no WHERE s.sale_id=$1',[row.sale_id])).rows[0]?.sale_revision_id:null;}
  }
  const all={...row,...extra,[t.id]:key,version_no:row.row_version,operation_id:op};const data=Object.fromEntries(cols.map(k=>[k,all[k]]));await this.insert(c,t.table,data);
  if(kind==='visit')await c.query('INSERT INTO adc.visit_revision_nurse SELECT $1,nurse_id FROM adc.visit_nurse WHERE visit_id=$2',[key,id]);
  if(kind==='record')await c.query('INSERT INTO adc.record_revision_writer SELECT $1,doctor_id FROM adc.clinical_record_writer WHERE record_id=$2',[key,id]);
  if(kind==='treatment')await c.query('INSERT INTO adc.treatment_revision_tooth SELECT $1,tooth_code FROM adc.treatment_tooth WHERE treatment_id=$2',[key,id]);
  if(kind==='bill'){
   await c.query('INSERT INTO adc.bill_revision_staff SELECT $1,employee_id FROM adc.bill_staff WHERE bill_id=$2',[key,id]);
   const lines=(await c.query('SELECT l.*,r.treatment_revision_id,i.name AS item_name,i.charge_unit FROM adc.treatment_bill_line l JOIN adc.treatment t ON t.treatment_id=l.treatment_id JOIN adc.treatment_revision r ON r.treatment_id=t.treatment_id AND r.version_no=t.row_version JOIN adc.treatment_item i ON i.item_id=t.item_id WHERE l.bill_id=$1',[id])).rows;
   for(const l of lines)await this.insert(c,'bill_revision_line',{revision_line_id:randomUUID(),bill_revision_id:key,bill_line_id:l.bill_line_id,treatment_id:l.treatment_id,price_version_id:l.price_version_id,quantity:l.quantity,adopted_unit_price:l.adopted_unit_price,treatment_revision_id:l.treatment_revision_id,item_name:l.item_name,charge_unit:l.charge_unit});
  }
  if(kind==='patient'){
   for(const [source,target,columns]of [['patient_allergy','patient_revision_allergy','allergen,description'],['patient_tag','patient_revision_tag','tag_name'],['patient_channel','patient_revision_channel','channel_kind,channel_reference,association_state']] as const){
    // Collections are empty in first registration; later versions must still copy the full set.
    const current=await c.query('SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2',['adc',target]);
    const fields=current.rows.map(x=>x.column_name).filter(x=>x!=='patient_revision_id');
    if(fields.length)await c.query(`INSERT INTO adc.${target}(patient_revision_id,${fields.join(',')}) SELECT $1,${fields.join(',')} FROM adc.${source} WHERE patient_id=$2`,[key,id]);
   }
  }
  return key;
 }
 async run(actor:StaffActor,code:string,input:any,scopes:string[],fn:string,resource:string,fields:string[],locks:string[],work:(x:Context)=>Promise<Effect>,afterWrite?:()=>Promise<void>){
  const c=await this.db.pool.connect();try{
   await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['request:'+input.requestId]);
   for(const clinic of [...new Set(scopes)].sort())await this.auth.assertAccess(c,actor,fn,clinic,resource,fields);
   const prior=(await c.query('SELECT d.*,o.after_content FROM adc.command_dedup d JOIN adc.business_operation o ON o.operation_id=d.operation_id WHERE request_key=$1',[input.requestId])).rows[0];
   const fingerprint=digest({code,input});
   if(prior){if(prior.actor_id!==actor.employeeId||prior.patient_actor_id||prior.command_code!==code||prior.payload_fingerprint!==fingerprint)throw new ConflictException('原请求标识已被使用，请核对原提交。');
    const originalScopes=await c.query('SELECT clinic_id FROM adc.operation_clinic WHERE operation_id=$1',[prior.operation_id]);for(const r of originalScopes.rows)await this.auth.assertAccess(c,actor,fn,r.clinic_id,resource,fields);
    await c.query('COMMIT');return {...prior.after_content.result,repeated:true,originalResult:true};}
   for(const key of [...new Set(locks)].sort())await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[key]);
   const now=new Date((await c.query('SELECT clock_timestamp() AS now')).rows[0].now);const effect=await work({c,now});
   if(effect.result.existing&&code!=='frontdesk.visit.arrive'){await c.query('COMMIT');return effect.result;}
   const op=randomUUID();await this.insert(c,'business_operation',{operation_id:op,actor_id:actor.employeeId,occurred_at:now,action_code:code,subject_kind:effect.subjectKind,subject_key:effect.subjectKey,before_content:effect.before?JSON.stringify(effect.before):null,after_content:JSON.stringify({...effect.after,result:effect.result}),reason:effect.reason||null});
   if(effect.afterAudit)await effect.afterAudit(c,op);
   for(const clinic of new Set(scopes))await this.insert(c,'operation_clinic',{operation_id:op,clinic_id:clinic});
   for(const r of effect.revisions||[])await this.snapshot(c,r.kind,r.id,op);
   await this.insert(c,'command_dedup',{request_key:input.requestId,actor_id:actor.employeeId,command_code:code,payload_fingerprint:fingerprint,operation_id:op,result_kind:effect.subjectKind,result_key:effect.subjectKey});
   if(afterWrite)await afterWrite();await c.query('COMMIT');return {...effect.result,repeated:false};
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }
 private async appointment(id:string){const r=(await this.db.pool.query('SELECT * FROM adc.appointment WHERE appointment_id=$1',[id])).rows[0];if(!r)throw new NotFoundException('未找到预约。');return r;}
 private locks(a:any,doctor?:string,patient?:string,subject?:string){return [...(a?.doctor_id?[`doctor:${a.doctor_id}`]:[]),...(doctor?[`doctor:${doctor}`]:[]),...(a?.booking_subject_id?[`subject:${a.booking_subject_id}`]:[]),...(subject?[`subject:${subject}`]:[]),...(a?.patient_id?[`patient:${a.patient_id}`]:[]),...(patient?[`patient:${patient}`]:[])];}
 async appointmentCommandStatus(a:StaffActor,requestId:string,clinicId:string,scheduleId:string){requestId=requestId.toLowerCase();clinicId=clinicId.toLowerCase();scheduleId=scheduleId.toLowerCase();const c=await this.db.pool.connect();try{await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ');await this.auth.assertAccess(c,a,'appointment.read',clinicId);const schedule=(await c.query('SELECT clinic_id FROM adc.doctor_schedule WHERE schedule_id=$1',[scheduleId])).rows[0];if(!schedule||schedule.clinic_id!==clinicId)throw new ConflictException('请核对原排班所属诊所后再核实。');
 const matches=(await c.query("SELECT d.actor_id,d.patient_actor_id,d.command_code,d.result_key,d.result_kind,o.actor_id AS operation_actor,o.action_code,o.operation_id,o.subject_key,o.subject_kind,o.after_content->'result' result,o.occurred_at FROM adc.command_dedup d JOIN adc.business_operation o USING(operation_id) WHERE lower(d.request_key)=$1 LIMIT 2",[requestId])).rows;if(matches.length>1)throw new ServiceUnavailableException('原请求编号存在歧义，请保留原请求人工核查。');const candidate=matches[0],p=candidate&&candidate.actor_id===a.employeeId&&candidate.operation_actor===a.employeeId&&candidate.patient_actor_id===null&&candidate.command_code==='frontdesk.appointment.book'&&candidate.action_code==='frontdesk.appointment.book'?candidate:undefined;let result:any={requestId,clinicId,scheduleId,state:'not_found'};
 if(p){const r=p.result;if(p.result_kind!=='appointment'||p.subject_kind!=='appointment'||p.subject_key!==p.result_key||r?.id!==p.result_key||!Number.isSafeInteger(r.version)||r.version<1)throw new ServiceUnavailableException('原预约结果无法核对，请保留原请求。');if(r.clinicId===clinicId&&r.scheduleId===scheduleId){const rows=(await c.query('SELECT appointment_revision_id,version_no,clinic_id,schedule_id FROM adc.appointment_revision WHERE appointment_id=$1 AND operation_id=$2 AND version_no=$3',[r.id,p.operation_id,r.version])).rows,scopes=(await c.query('SELECT clinic_id FROM adc.operation_clinic WHERE operation_id=$1',[p.operation_id])).rows;if(rows.length!==1||rows[0].clinic_id!==clinicId||rows[0].schedule_id!==scheduleId||!scopes.some(x=>x.clinic_id===clinicId))throw new ServiceUnavailableException('原预约版本或范围无法核对。');for(const x of scopes)await this.auth.assertAccess(c,a,'appointment.read',x.clinic_id);result={...result,state:'completed',resultId:r.id,version:r.version,revisionId:rows[0].appointment_revision_id,completedAt:p.occurred_at.toISOString()};}}
 const op=randomUUID();await this.insert(c,'business_operation',{operation_id:op,actor_id:a.employeeId,occurred_at:new Date(),action_code:'frontdesk.appointment.command.view',subject_kind:'doctor_schedule',subject_key:scheduleId,access_scope:JSON.stringify({requestId,clinicId,scheduleId,state:result.state,clinicalBody:false})});await this.insert(c,'operation_clinic',{operation_id:op,clinic_id:clinicId});await c.query('COMMIT');return result;
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
 async appointmentActionStatus(a:StaffActor,requestId:string,clinicId:string,appointmentId:string,kind:'reschedule'|'cancel'|'contact'){requestId=requestId.toLowerCase();clinicId=clinicId.toLowerCase();appointmentId=appointmentId.toLowerCase();const c=await this.db.pool.connect();try{await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ');await this.auth.assertAccess(c,a,'appointment.read',clinicId);const target=(await c.query('SELECT clinic_id FROM adc.appointment WHERE appointment_id=$1',[appointmentId])).rows[0];if(!target||target.clinic_id!==clinicId)throw new ConflictException('请核对原预约当前所属诊所后再核实。');
 const code='frontdesk.appointment.'+kind,matches=(await c.query("SELECT d.actor_id,d.patient_actor_id,d.command_code,d.result_key,d.result_kind,o.actor_id AS operation_actor,o.action_code,o.operation_id,o.subject_key,o.subject_kind,o.after_content->'result' result,o.occurred_at FROM adc.command_dedup d JOIN adc.business_operation o USING(operation_id) WHERE lower(d.request_key)=$1 LIMIT 2",[requestId])).rows;if(matches.length>1)throw new ServiceUnavailableException('原请求编号存在歧义，请保留原请求核查。');const candidate=matches[0],p=candidate&&candidate.actor_id===a.employeeId&&candidate.operation_actor===a.employeeId&&candidate.patient_actor_id===null&&candidate.command_code===code&&candidate.action_code===code?candidate:undefined;let result:any={requestId,clinicId,appointmentId,kind,state:'not_found'};
 if(p){const r=p.result,contact=kind==='contact',expected=contact?'appointment_contact':'appointment';if(p.result_kind!==expected||p.subject_kind!==expected||p.subject_key!==p.result_key||r?.id!==p.result_key)throw new ServiceUnavailableException('原办理结果无法核对。');if(contact?r.appointmentId===appointmentId:r.id===appointmentId){const scopes=(await c.query('SELECT clinic_id FROM adc.operation_clinic WHERE operation_id=$1',[p.operation_id])).rows;if(!scopes.length)throw new ServiceUnavailableException('原办理范围缺失。');for(const x of scopes)await this.auth.assertAccess(c,a,'appointment.read',x.clinic_id);
 if(contact){const rows=(await c.query('SELECT appointment_id,employee_id FROM adc.appointment_contact WHERE contact_id=$1',[r.id])).rows;if(rows.length!==1||rows[0].appointment_id!==appointmentId||rows[0].employee_id!==a.employeeId)throw new ServiceUnavailableException('原联系记录或范围无法核对。');result={...result,state:'completed',resultId:r.id,completedAt:p.occurred_at.toISOString()};}
 else{if(!Number.isSafeInteger(r.version)||r.version<1)throw new ServiceUnavailableException('原预约版本缺失。');const rows=(await c.query('SELECT appointment_revision_id,clinic_id FROM adc.appointment_revision WHERE appointment_id=$1 AND operation_id=$2 AND version_no=$3',[appointmentId,p.operation_id,r.version])).rows;if(rows.length!==1||rows[0].clinic_id!==r.clinicId||!scopes.some(x=>x.clinic_id===rows[0].clinic_id))throw new ServiceUnavailableException('原预约原版或范围无法核对。');result={...result,state:'completed',resultId:r.id,version:r.version,revisionId:rows[0].appointment_revision_id,completedAt:p.occurred_at.toISOString()};}}}
 const op=randomUUID();await this.insert(c,'business_operation',{operation_id:op,actor_id:a.employeeId,occurred_at:new Date(),action_code:'frontdesk.appointment.action.command.view',subject_kind:'appointment',subject_key:appointmentId,access_scope:JSON.stringify({requestId,clinicId,appointmentId,kind,state:result.state,clinicalBody:false})});await this.insert(c,'operation_clinic',{operation_id:op,clinic_id:clinicId});await c.query('COMMIT');return result;
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
 async commandStatus(a:StaffActor,requestId:string,clinicId:string,targetId:string,kind:'patient'|'arrive'|'progress'|'schedule'|'no_show'){requestId=requestId.toLowerCase();clinicId=clinicId.toLowerCase();targetId=targetId.toLowerCase();const config={patient:{code:'frontdesk.patient.create',fn:'patient.identity',table:'patient_revision',key:'patient_revision_id',root:'patient_id',scope:'created_clinic_id',type:'patient'},arrive:{code:'frontdesk.visit.arrive',fn:'visit.read',table:'visit_revision',key:'visit_revision_id',root:'visit_id',scope:'clinic_id',type:'visit'},progress:{code:'frontdesk.visit.progress',fn:'visit.read',table:'visit_revision',key:'visit_revision_id',root:'visit_id',scope:'clinic_id',type:'visit'},schedule:{code:'frontdesk.schedule.save',fn:'schedule.manage',table:'schedule_revision',key:'schedule_revision_id',root:'schedule_id',scope:'clinic_id',type:'doctor_schedule'},no_show:{code:'frontdesk.appointment.no_show',fn:'appointment.read',table:'appointment_revision',key:'appointment_revision_id',root:'appointment_id',scope:'clinic_id',type:'appointment'}}[kind],c=await this.db.pool.connect();try{await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ');await this.auth.assertAccess(c,a,config.fn,clinicId);
 if(kind==='patient'){if(targetId!==clinicId)throw new ConflictException('请核对原建档诊所。');}
 else if(kind==='arrive'){await this.identity.assertSelection(c,a,targetId,[clinicId]);}
 else if(kind==='schedule'){if(!(await c.query('SELECT 1 FROM adc.practice_assignment WHERE employee_id=$1 AND clinic_id=$2',[targetId,clinicId])).rowCount)throw new ConflictException('请核对原排班医生和诊所。');}
 else{const table=kind==='progress'?'visit':'appointment',key=kind==='progress'?'visit_id':'appointment_id',r=(await c.query(`SELECT clinic_id FROM adc.${table} WHERE ${key}=$1`,[targetId])).rows[0];if(!r||r.clinic_id!==clinicId)throw new ConflictException('原办理对象不属于当前诊所。');}
 const matches=(await c.query("SELECT d.actor_id,d.patient_actor_id,d.command_code,d.result_kind,d.result_key,o.actor_id AS operation_actor,o.action_code,o.subject_kind,o.subject_key,o.operation_id,o.occurred_at,o.after_content->'result' result,o.after_content->>'adoptedRevisionId' adopted_revision FROM adc.command_dedup d JOIN adc.business_operation o USING(operation_id) WHERE lower(d.request_key)=$1 LIMIT 2",[requestId])).rows;if(matches.length>1)throw new ServiceUnavailableException('原请求编号存在歧义，请保留核查。');const candidate=matches[0],p=candidate&&candidate.actor_id===a.employeeId&&candidate.operation_actor===a.employeeId&&candidate.patient_actor_id===null&&candidate.command_code===config.code&&candidate.action_code===config.code?candidate:null;let result:any={requestId,clinicId,targetId,kind,state:'not_found'};
 if(p){const r=p.result;if(p.result_kind!==config.type||p.subject_kind!==config.type||p.subject_key!==p.result_key||r?.id!==p.result_key||!Number.isSafeInteger(r.version)||r.version<1)throw new ServiceUnavailableException('原办理结果不完整。');const adopted=kind==='arrive'&&r.existing===true;const rows=(await c.query(`SELECT * FROM adc.${config.table} WHERE ${config.root}=$1 AND version_no=$2 AND ${adopted?config.key:'operation_id'}=$3`,[r.id,r.version,adopted?p.adopted_revision:p.operation_id])).rows;if(rows.length!==1)throw new ServiceUnavailableException('原办理版本无法核对。');const v=rows[0],targetMatches=kind==='patient'?v.created_clinic_id===targetId:kind==='arrive'?v.patient_id===targetId:kind==='schedule'?v.doctor_id===targetId:r.id===targetId;if(targetMatches&&v[config.scope]===clinicId){const scopes=(await c.query('SELECT clinic_id FROM adc.operation_clinic WHERE operation_id=$1',[p.operation_id])).rows;if(!scopes.some(x=>x.clinic_id===clinicId))throw new ServiceUnavailableException('原办理范围缺失。');for(const x of scopes)await this.auth.assertAccess(c,a,config.fn,x.clinic_id);result={...result,state:'completed',resultId:r.id,version:r.version,revisionId:v[config.key],completedAt:p.occurred_at.toISOString(),...(adopted?{existing:true}:{})};}}
 const op=randomUUID();await this.insert(c,'business_operation',{operation_id:op,actor_id:a.employeeId,occurred_at:new Date(),action_code:'frontdesk.command.view',subject_kind:kind==='patient'?'clinic':kind==='arrive'?'patient':kind==='schedule'?'employee':config.type,subject_key:targetId,access_scope:JSON.stringify({requestId,clinicId,targetId,kind,state:result.state,clinicalBody:false})});await this.insert(c,'operation_clinic',{operation_id:op,clinic_id:clinicId});await c.query('COMMIT');return result;
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
 async bootstrap(actor:StaffActor){return {clinics:await this.auth.clinics(actor,'appointment.read'),today:day(new Date()),now:new Date().toISOString()};}
 async people(actor:StaffActor,q:IdentitySearchQuery){return this.identity.search(actor,q);}
 private async selectionAccess(actor:StaffActor,fn:string,scopes:string[],patientId?:string|null,subjectId?:string|null){const c=await this.db.pool.connect();try{await c.query('BEGIN');for(const clinic of [...new Set(scopes)])await this.auth.assertAccess(c,actor,fn,clinic);const subject=subjectId?(await c.query('SELECT patient_id FROM adc.patient_booking_subject WHERE booking_subject_id=$1',[subjectId])).rows[0]:null;for(const id of new Set([patientId,subject?.patient_id].filter(Boolean) as string[]))await this.identity.assertSelection(c,actor,id,scopes);await c.query('COMMIT');}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
 async createPatient(actor:StaffActor,input:any,afterWrite?:()=>Promise<void>){
  contactInput(input.phone);return this.run(actor,'frontdesk.patient.create',input,[input.clinicId],'patient.create','patient',['identity'],[],async({c,now})=>{
   if(input.birthDate&&input.birthDate>day(now))throw new BadRequestException('出生日期不能晚于今天。');
   const id=randomUUID();await this.insert(c,'patient',{patient_id:id,name:input.name,phone:input.phone,birth_date:input.birthDate,source_note:input.sourceNote,created_clinic_id:input.clinicId,allergy_knowledge:'unknown',row_version:1});
   const row=(await c.query('SELECT * FROM adc.patient WHERE patient_id=$1',[id])).rows[0];return {result:{id,name:row.name,phone:row.phone,version:1},subjectKind:'patient',subjectKey:id,after:row,reason:input.identityBasis,revisions:[{kind:'patient',id}]};
  },afterWrite);
 }
 async list(actor:StaffActor,q:AppointmentQueueQuery){return this.queue.list(actor,q);}
 private async addContact(c:PoolClient,actor:StaffActor,id:string,now:Date,info:any,forcedReached?:boolean){
  const contacted=actualTime(info.contactedAt,now),key=randomUUID();
  const reached=forcedReached??info.outcome!=='unreachable';
  const note=(info.outcome?'['+({coming:'正在赶来',unreachable:'未接通',cannot_come:'确认来不了',other:'其他已联系'} as any)[info.outcome]+'] ':'')+info.note;
  await this.insert(c,'appointment_contact',{contact_id:key,appointment_id:id,contacted_at:contacted,employee_id:actor.employeeId,result_note:note,next_action:JSON.stringify({actionNote:info.nextAction||null,estimatedArrivalAt:info.estimatedArrivalAt||null}),reached_patient:reached});return key;
 }
 async appointmentCommand(actor:StaffActor,kind:'book'|'reschedule'|'cancel'|'contact'|'no_show',input:any,id?:string,afterWrite?:()=>Promise<void>){
  input={...input,appointmentId:id||null};
  const initial=id?await this.appointment(id):null;
  const schedule=input.scheduleId?(await this.db.pool.query('SELECT * FROM adc.doctor_schedule WHERE schedule_id=$1',[input.scheduleId])).rows[0]:null;
  if((kind==='book'||kind==='reschedule')&&!schedule)throw new NotFoundException('未找到排班。');
  const scopes=[...(initial?[initial.clinic_id]:[]),...(schedule?[schedule.clinic_id]:[])];
  const subjectId=input.bookingSubjectId||initial?.booking_subject_id;
  const patientId=input.patientId||initial?.patient_id;
  if(kind==='book'||kind==='reschedule')await this.selectionAccess(actor,'appointment.manage',scopes,patientId,subjectId);
  return this.run(actor,'frontdesk.appointment.'+kind,input,scopes,'appointment.manage','appointment',[kind==='contact'?'contact':'arrangement'],[...scopes.map(id=>'clinic-config:'+id),...this.locks(initial,schedule?.doctor_id,patientId,subjectId)],async({c,now})=>{
   let before=initial?(await c.query('SELECT * FROM adc.appointment WHERE appointment_id=$1 FOR UPDATE',[id])).rows[0]:null;
   if(before&&(Number(before.row_version)!==input.version))throw new ConflictException('预约已变化，请刷新核对。');
   const hasVisit=before&&(await c.query('SELECT 1 FROM adc.visit WHERE appointment_id=$1',[id])).rowCount;
   if(kind==='contact'){
    const contactId=await this.addContact(c,actor,id!,now,input);return {result:{id:contactId,appointmentId:id,disposition:before.disposition},subjectKind:'appointment_contact',subjectKey:contactId,after:{appointmentId:id,...input}};
   }
   if(before&&(before.disposition!=='active'||hasVisit))throw new ConflictException('该预约已到院或已结案，不能按旧状态处理。');
   if(kind==='no_show'){
    if(now<before.scheduled_end_at)throw new ConflictException('预约窗口尚未结束，不能登记未到。');
    if(input.checkedRegistration!==true||input.verifiedNoShow!==true)throw new BadRequestException('请先排除漏登记，并明确核实真实未到。');
    await c.query("UPDATE adc.appointment SET disposition='no_show',no_show_verified_at=$2,no_show_verified_by=$3,no_show_basis=$4,row_version=row_version+1 WHERE appointment_id=$1",[id,now,actor.employeeId,input.basis]);
   }else if(kind==='cancel'){
    if(input.confirmedWithPatient!==true)throw new BadRequestException('必须核实患者明确取消意愿。');
    await this.addContact(c,actor,id!,now,{...input,note:input.contactNote},true);
    await c.query("UPDATE adc.appointment SET disposition='cancelled',cancelled_at=$2,cancel_reason=$3,cancel_channel='front_desk',row_version=row_version+1 WHERE appointment_id=$1",[id,now,input.reason]);
   }else{
    if(input.confirmedWithPatient!==true)throw new BadRequestException('必须先与患者商定具体安排。');
    let subject:any;
    if(subjectId){subject=(await c.query('SELECT * FROM adc.patient_booking_subject WHERE booking_subject_id=$1 FOR UPDATE',[subjectId])).rows[0];if(!subject)throw new NotFoundException('未找到已核实预约主体。');
     const inScope=await c.query('SELECT 1 FROM adc.appointment WHERE booking_subject_id=$1 AND clinic_id=ANY($2::uuid[])',[subjectId,scopes]);if(!inScope.rowCount)throw new ForbiddenException('请从授权诊所的预约关联中核实选择该主体。');
     if(patientId&&subject.patient_id&&subject.patient_id!==patientId)throw new ConflictException('主体与所选档案不一致，请重新核实。');
    }else{
     if(patientId&&!(await c.query('SELECT 1 FROM adc.patient WHERE patient_id=$1',[patientId])).rowCount)throw new NotFoundException('未找到患者档案。');
     subject={booking_subject_id:randomUUID(),patient_id:patientId||null};
     await this.insert(c,'patient_booking_subject',{...subject,verification_kind:'front_desk',verified_by:actor.employeeId,verified_at:now,contact_value:input.contact,row_version:1});
    }
    if(before?.patient_id&&patientId&&before.patient_id!==patientId)throw new ConflictException('原预约与所选档案不一致，请重新核实。');
    const knownPatient=subject.patient_id||before?.patient_id||patientId||null;
    if(knownPatient)await this.identity.assertSelection(c,actor,knownPatient,scopes);
    const q=await this.booking.validate(c,input,now,{subjectId:subject.booking_subject_id,patientId:knownPatient},id,true),s=q.schedule;
    if(before){
     await this.addContact(c,actor,id!,now,{...input,note:input.contactNote},true);
     await c.query(`UPDATE adc.appointment SET clinic_id=$2,doctor_id=$3,scheduled_at=$4,scheduled_end_at=$5,schedule_id=$6,schedule_row_version=$7,service_version_id=$8,rule_version_id=$9,cancel_cutoff_at=$10,reschedule_cutoff_at=$11,booked_name=$12,booked_contact=$13,confirmation_note=$14,row_version=row_version+1 WHERE appointment_id=$1`,[id,s.clinic_id,s.doctor_id,q.startsAt,q.endsAt,s.schedule_id,s.row_version,q.serviceVersionId,q.ruleVersionId,q.cancelCutoffAt,q.rescheduleCutoffAt,input.name,input.contact,input.intention]);
    }else{
     id=randomUUID();await this.insert(c,'appointment',{appointment_id:id,patient_id:knownPatient,booking_subject_id:subject.booking_subject_id,clinic_id:s.clinic_id,doctor_id:s.doctor_id,scheduled_at:q.startsAt,scheduled_end_at:q.endsAt,schedule_id:s.schedule_id,schedule_row_version:s.row_version,service_version_id:q.serviceVersionId,rule_version_id:q.ruleVersionId,cancel_cutoff_at:q.cancelCutoffAt,reschedule_cutoff_at:q.rescheduleCutoffAt,booked_name:input.name,booked_contact:input.contact,confirmation_note:input.intention,disposition:'active',row_version:1});
    }
   }
   const after=(await c.query('SELECT * FROM adc.appointment WHERE appointment_id=$1',[id])).rows[0];return {result:await this.booking.view(c,id!),subjectKind:'appointment',subjectKey:id!,before,after,reason:input.reason||input.basis||input.identityBasis||input.contactNote,revisions:[{kind:'appointment',id:id!}]};
  },afterWrite);
 }
 async staffChoices(actor:StaffActor,clinic:string,date:string){
  const c=await this.db.pool.connect();try{await this.auth.assertAccess(c,actor,'visit.manage',clinic);
   const doctors=(await c.query("SELECT DISTINCT e.employee_id AS id,e.name FROM adc.employee e JOIN adc.practice_assignment p ON p.employee_id=e.employee_id WHERE p.clinic_id=$1 AND p.practice_arrangement='enabled' AND p.valid_from<=$2::date AND (p.valid_to IS NULL OR p.valid_to>=$2::date) ORDER BY e.name",[clinic,date])).rows;
   const nurses=(await c.query('SELECT employee_id AS id,name,employment_arrangement FROM adc.employee ORDER BY name')).rows.filter(e=>assignmentValid(e.employment_arrangement,clinic,'nurse',date)).map(({employment_arrangement,...x})=>x);return {doctors,nurses};
  }finally{c.release();}
 }
 private async validPersonnel(c:PoolClient,clinic:string,doctor:string,nurses:string[],at:string){
  const date=day(at);const choices=(await c.query("SELECT 1 FROM adc.practice_assignment WHERE employee_id=$1 AND clinic_id=$2 AND practice_arrangement='enabled' AND valid_from<=$3::date AND (valid_to IS NULL OR valid_to>=$3::date)",[doctor,clinic,date])).rowCount;
  if(!choices)throw new ConflictException('医生在该日无有效执业安排。');
  const shift=await c.query('SELECT 1 FROM adc.doctor_schedule WHERE doctor_id=$1 AND clinic_id=$2 AND starts_at<=$3 AND ends_at>$3 AND can_receive=true',[doctor,clinic,at]);if(!shift.rowCount)throw new ConflictException('医生在实际到院时段不可接诊，请核实当前安排。');
  const staff=await c.query('SELECT employee_id,employment_arrangement FROM adc.employee WHERE employee_id=ANY($1::uuid[])',[nurses]);
  if(staff.rowCount!==nurses.length||staff.rows.some(x=>!assignmentValid(x.employment_arrangement,clinic,'nurse',date)))throw new ConflictException('配合护士任职安排无效，请重新核实。');
 }
 async visits(actor:StaffActor,q:VisitQueueQuery){return this.visitQueue.list(actor,q);}
 private async visitView(c:PoolClient,id:string){
  const r=(await c.query(`SELECT v.visit_id AS id,v.row_version::int AS version,v.patient_id AS "patientId",p.name AS "patientName",v.clinic_id AS "clinicId",v.appointment_id AS "appointmentId",v.doctor_id AS "doctorId",e.name AS "doctorName",v.arrived_at AS "arrivedAt",v.started_at AS "startedAt",v.ended_at AS "endedAt",v.left_at AS "leftAt",v.progress_basis AS basis,
   COALESCE((SELECT jsonb_agg(jsonb_build_object('id',n.nurse_id,'name',x.name) ORDER BY x.name) FROM adc.visit_nurse n JOIN adc.employee x ON x.employee_id=n.nurse_id WHERE n.visit_id=v.visit_id),'[]') AS nurses,
   a.disposition AS "originalAppointmentState",CASE WHEN a.scheduled_at IS NULL THEN NULL ELSE GREATEST(0,extract(epoch FROM v.arrived_at-a.scheduled_at)/60)::int END AS "lateMinutes"
   FROM adc.visit v JOIN adc.patient p ON p.patient_id=v.patient_id JOIN adc.employee e ON e.employee_id=v.doctor_id LEFT JOIN adc.appointment a ON a.appointment_id=v.appointment_id WHERE v.visit_id=$1`,[id])).rows[0];if(!r)throw new NotFoundException('未找到实际就诊。');return r;
 }
 async arrive(actor:StaffActor,input:any,afterWrite?:()=>Promise<void>){
  const initial=input.appointmentId?await this.appointment(input.appointmentId):null;
  if(initial&&initial.clinic_id!==input.clinicId)throw new ConflictException('原预约不属于实际登记诊所；跨店须另核实际安排。');
  await this.selectionAccess(actor,'visit.manage',[input.clinicId],input.patientId);
  return this.run(actor,'frontdesk.visit.arrive',input,[input.clinicId],'visit.manage','visit',['arrived_at','arrangement'],this.locks(initial,input.doctorId,input.patientId),async({c,now})=>{
   const at=actualTime(input.arrivedAt,now);await this.validPersonnel(c,input.clinicId,input.doctorId,input.nurseIds,at);
   await this.identity.assertSelection(c,actor,input.patientId,[input.clinicId]);
   const patient=(await c.query('SELECT patient_id FROM adc.patient WHERE patient_id=$1 FOR SHARE',[input.patientId])).rows[0];if(!patient)throw new NotFoundException('请先核实或建立患者档案。');
   let a=initial?(await c.query('SELECT * FROM adc.appointment WHERE appointment_id=$1 FOR UPDATE',[input.appointmentId])).rows[0]:null;let adopted=null;const revisions:{kind:string;id:string}[]=[];let subjectBefore=null;
   if(a){const existing=(await c.query('SELECT visit_id,patient_id FROM adc.visit WHERE appointment_id=$1',[a.appointment_id])).rows[0];if(existing){if(existing.patient_id!==input.patientId)throw new ConflictException('该预约已登记其他档案，请核实。');const view=await this.visitView(c,existing.visit_id),revision=(await c.query('SELECT visit_revision_id FROM adc.visit_revision WHERE visit_id=$1 AND version_no=$2',[existing.visit_id,view.version])).rows[0];if(!revision)throw new ServiceUnavailableException('既有就诊原版缺失，不能确认采用结果。');return {result:{...view,existing:true},subjectKind:'visit',subjectKey:existing.visit_id,after:{adoptedRevisionId:revision.visit_revision_id}};}
    if(Number(a.row_version)!==input.appointmentVersion)throw new ConflictException('预约已变化，请刷新后核对到院。');
    if(a.patient_id&&a.patient_id!==input.patientId)throw new ConflictException('预约与所选档案不一致，不允许自动合档。');
    if(input.identityConfirmed!==true)throw new BadRequestException('须明确核实预约人与正式档案的对应关系。');
    adopted=(await c.query('SELECT appointment_revision_id FROM adc.appointment_revision WHERE appointment_id=$1 AND version_no=$2',[a.appointment_id,a.row_version])).rows[0]?.appointment_revision_id;if(!adopted)throw new ConflictException('预约来源原版缺失，不能猜测补齐。');
    if(a.booking_subject_id){subjectBefore=(await c.query('SELECT * FROM adc.patient_booking_subject WHERE booking_subject_id=$1 FOR UPDATE',[a.booking_subject_id])).rows[0];if(subjectBefore.patient_id&&subjectBefore.patient_id!==input.patientId)throw new ConflictException('本人主体与档案关联不一致，请重新核实。');if(!subjectBefore.patient_id)await c.query('UPDATE adc.patient_booking_subject SET patient_id=$2,row_version=row_version+1 WHERE booking_subject_id=$1',[a.booking_subject_id,input.patientId]);}
    // A closed appointment remains closed; the later real visit never restores occupancy.
    const missedRegistration=a.disposition==='no_show'&&Date.parse(at)<=+a.scheduled_end_at;
    if(missedRegistration&&(input.reviewedPriorNoShow!==true||!input.reason))throw new ConflictException('所录到院早于原未到窗口结束，须明确复核原结论并填写更正原因。');
    if(a.disposition==='active'||missedRegistration){await c.query("UPDATE adc.appointment SET patient_id=$2,disposition='arrived',no_show_verified_at=NULL,no_show_verified_by=NULL,no_show_basis=NULL,row_version=row_version+1 WHERE appointment_id=$1",[a.appointment_id,input.patientId]);revisions.push({kind:'appointment',id:a.appointment_id});}
   }
   const id=randomUUID();await this.insert(c,'visit',{visit_id:id,patient_id:input.patientId,clinic_id:input.clinicId,appointment_id:a?.appointment_id||null,registrar_id:actor.employeeId,doctor_id:input.doctorId,arrived_at:at,appointment_revision_id:adopted,progress_basis:input.basis,row_version:1});
   for(const nurse of input.nurseIds)await this.insert(c,'visit_nurse',{visit_id:id,nurse_id:nurse});
   const row=(await c.query('SELECT * FROM adc.visit WHERE visit_id=$1',[id])).rows[0];revisions.push({kind:'visit',id});
   return {result:await this.visitView(c,id),subjectKind:'visit',subjectKey:id,before:{appointment:a,bookingSubject:subjectBefore},after:{...row,nurseIds:input.nurseIds,identityBasis:input.identityBasis,coordination:input.coordination,reason:input.reason},reason:input.reason||input.identityBasis,revisions};
  },afterWrite);
 }
 async progress(actor:StaffActor,id:string,input:any,afterWrite?:()=>Promise<void>){
  input={...input,visitId:id};
  const original=(await this.db.pool.query('SELECT * FROM adc.visit WHERE visit_id=$1',[id])).rows[0];if(!original)throw new NotFoundException('未找到实际就诊。');
  return this.run(actor,'frontdesk.visit.progress',input,[original.clinic_id],'visit.manage','visit',[input.field],this.locks(original,original.doctor_id,original.patient_id),async({c,now})=>{
   const before=(await c.query('SELECT * FROM adc.visit WHERE visit_id=$1 FOR UPDATE',[id])).rows[0];if(Number(before.row_version)!==input.version)throw new ConflictException('就诊进展已变化，请刷新后核对。');
   const at=actualTime(input.occurredAt,now);if((before[input.field]||before.left_at||input.isBackfill)&&!input.reason)throw new BadRequestException('补录、更正或离开后补充须填写原因。');
   const after={...before,[input.field]:at};assertTimeOrder(after);const revisions=[{kind:'visit',id}];let priorNoShow=null;
   if(input.field==='arrived_at'&&before.appointment_id){const a=(await c.query('SELECT * FROM adc.appointment WHERE appointment_id=$1 FOR UPDATE',[before.appointment_id])).rows[0];
    if(a?.disposition==='no_show'&&Date.parse(at)<=+a.scheduled_end_at){if(input.reviewedPriorNoShow!==true||!input.reason)throw new ConflictException('此次更正涉及原未到结论，须复核并说明更正原因。');priorNoShow=a;await c.query("UPDATE adc.appointment SET disposition='arrived',patient_id=$2,no_show_verified_at=NULL,no_show_verified_by=NULL,no_show_basis=NULL,row_version=row_version+1 WHERE appointment_id=$1",[a.appointment_id,before.patient_id]);revisions.push({kind:'appointment',id:a.appointment_id});}
   }
   // Keep a known departure when adding earlier facts. No automatic reopen or clinical writes.
   await c.query(`UPDATE adc.visit SET ${input.field}=$2,progress_basis=$3,row_version=row_version+1 WHERE visit_id=$1`,[id,at,input.basis]);
   return {result:await this.visitView(c,id),subjectKind:'visit',subjectKey:id,before:{...before,priorNoShow},after:{...after,row_version:Number(before.row_version)+1,progress_basis:input.basis},reason:input.reason,revisions};
  },afterWrite);
 }
 async schedules(actor:StaffActor,q:ScheduleQueueQuery){return this.scheduleQueue.list(actor,q);}
 private async schedulePlan(c:PoolClient,actor:StaffActor,input:any,now:Date){
  await this.auth.assertAccess(c,actor,'schedule.manage',input.clinicId,'schedule',['arrangement']);
  const old=input.id?(await c.query('SELECT * FROM adc.doctor_schedule WHERE schedule_id=$1',[input.id])).rows[0]:null;
  if(input.id&&!old)throw new NotFoundException('未找到排班。');
  if(old&&(old.clinic_id!==input.clinicId||old.doctor_id!==input.doctorId))throw new ConflictException('原排班医生和诊所不能迁移，请另建排班。');
  if(old&&Number(old.row_version)!==input.version)throw new ConflictException('排班已变化，请重新核对。');
  if(Date.parse(input.endsAt)<=Date.parse(input.startsAt))throw new BadRequestException('结束须晚于开始。');
  const practice=await c.query("SELECT 1 FROM adc.practice_assignment WHERE employee_id=$1 AND clinic_id=$2 AND practice_arrangement='enabled' AND valid_from<=$3::date AND (valid_to IS NULL OR valid_to>=$4::date)",[input.doctorId,input.clinicId,day(input.startsAt),day(new Date(Date.parse(input.endsAt)-1))]);if(!practice.rowCount)throw new ConflictException('该安排超出有效执业期间。');
  const conflicts=await c.query('SELECT 1 FROM adc.doctor_schedule WHERE doctor_id=$1 AND starts_at<$3 AND ends_at>$2 AND ($4::uuid IS NULL OR schedule_id<>$4) AND (can_receive=true OR $5=true)',[input.doctorId,input.startsAt,input.endsAt,input.id||null,input.canReceive]);if(conflicts.rowCount)throw new ConflictException('医生同店或跨店安排重叠，请先核对原排班。');
  const current=old?(await c.query("SELECT appointment_id,row_version,scheduled_at,scheduled_end_at,booked_name,disposition FROM adc.appointment WHERE schedule_id=$1 AND disposition='active' ORDER BY appointment_id",[input.id])).rows:[];
  const affected=current.filter(a=>!input.canReceive||input.publicStatus!=='open'||a.scheduled_at<new Date(input.startsAt)||a.scheduled_end_at>new Date(input.endsAt)||input.capacityLimit<old.capacity_limit);
  const stable={id:input.id||null,version:input.version||null,clinicId:input.clinicId,doctorId:input.doctorId,startsAt:input.startsAt,endsAt:input.endsAt,canReceive:input.canReceive,publicStatus:input.publicStatus,capacityLimit:input.capacityLimit,reason:input.reason};
  return {old,affected,token:digest({stable,current:current.map(a=>({id:a.appointment_id,version:a.row_version}))})};
 }
 async previewSchedule(actor:StaffActor,input:any){const c=await this.db.pool.connect();try{await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ');const plan=await this.schedulePlan(c,actor,input,new Date());await c.query('COMMIT');return {impactToken:plan.token,affected:plan.affected,message:'只预览不保存；保存后前台另行联系，不自动取消或改约。'};}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
 async saveSchedule(actor:StaffActor,input:any,afterWrite?:()=>Promise<void>){
  return this.run(actor,'frontdesk.schedule.save',input,[input.clinicId],'schedule.manage','schedule',['arrangement'],['doctor:'+input.doctorId],async({c,now})=>{
   if(input.id)await c.query('SELECT 1 FROM adc.doctor_schedule WHERE schedule_id=$1 FOR UPDATE',[input.id]);const plan=await this.schedulePlan(c,actor,input,now);
   if(plan.token!==input.impactToken)throw new ConflictException('排班或预约影响已变化，请重新预览核对。');if(plan.affected.length&&input.confirmImpact!==true)throw new BadRequestException('请明确确认受影响预约，另行联系处理。');
   const id=input.id||randomUUID();
   if(plan.old)await c.query('UPDATE adc.doctor_schedule SET starts_at=$2,ends_at=$3,can_receive=$4,public_status=$5,capacity_limit=$6,change_reason=$7,row_version=row_version+1 WHERE schedule_id=$1',[id,input.startsAt,input.endsAt,input.canReceive,input.publicStatus,input.capacityLimit,input.reason]);
   else await this.insert(c,'doctor_schedule',{schedule_id:id,doctor_id:input.doctorId,clinic_id:input.clinicId,starts_at:input.startsAt,ends_at:input.endsAt,can_receive:input.canReceive,public_status:input.publicStatus,capacity_limit:input.capacityLimit,change_reason:input.reason,row_version:1});
   const after=(await c.query('SELECT * FROM adc.doctor_schedule WHERE schedule_id=$1',[id])).rows[0];return {result:{id,version:Number(after.row_version),affected:plan.affected,publicStatus:after.public_status},subjectKind:'doctor_schedule',subjectKey:id,before:plan.old,after,reason:input.reason,revisions:[{kind:'schedule',id}]};
  },afterWrite);
 }
}
