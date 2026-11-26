import {Injectable,Inject,ConflictException,ForbiddenException,UnauthorizedException,ServiceUnavailableException} from '@nestjs/common';
import {randomUUID,createHash} from 'node:crypto';
import {DatabaseService} from './database.service';
import type {PatientActor} from './auth.service';
import type {BookingCommandKind} from './booking-recovery-domain';
import {objectInput} from './booking-domain';
import {uuidInput} from './domain';

export function retirementInput(value:unknown){
 const b=objectInput(value,['kind','appointmentId','confirmed']);
 if(b.confirmed!==true||!['book','reschedule','cancel'].includes(b.kind as string))throw new ConflictException('请明确确认结束原未执行提交。');
 if(b.kind==='book'&&b.appointmentId!==undefined)throw new ConflictException('新预约请求不应指定目标。');
 return {kind:b.kind as BookingCommandKind,appointmentId:b.kind==='book'?null:uuidInput(b.appointmentId).toLowerCase()};
}
@Injectable()
export class PatientRequestRetirementService {
 constructor(@Inject(DatabaseService)private db:DatabaseService){}
 private matches(p:any,a:PatientActor,key:string,kind:BookingCommandKind,target:string|null){return p.patient_actor_id===a.subjectId&&p.command_code===kind&&p.result_kind==='retired_appointment_request'&&p.result_key===key&&p.action_code==='patient.request.retire'&&p.operation_patient===a.subjectId&&p.subject_key===a.subjectId&&p.access_scope?.kind===kind&&(p.access_scope?.appointmentId??null)===target;}
 async status(a:PatientActor,key:string,kind:BookingCommandKind,target?:string){
  key=key.toLowerCase();const rows=(await this.db.pool.query(`SELECT d.*,o.action_code,o.patient_actor_id operation_patient,o.subject_key,o.access_scope FROM adc.command_dedup d JOIN adc.business_operation o USING(operation_id) WHERE lower(d.request_key)=$1`,[key])).rows;
  if(rows.length>1)throw new ServiceUnavailableException('原请求标识有歧义，请联系核实。');
  if(rows[0]&&this.matches(rows[0],a,key,kind,target?.toLowerCase()||null))return{state:'retired',kind,requestId:key,appointmentId:target?.toLowerCase()||null};
  return null;
 }
 async retire(a:PatientActor,key:string,input:ReturnType<typeof retirementInput>){
  key=key.toLowerCase();const c=await this.db.pool.connect();try{
   await c.query('BEGIN');
   for(const lock of ['request:'+key,`patient-request:${a.subjectId}:${key}`])if(!(await c.query('SELECT pg_try_advisory_xact_lock(hashtextextended($1,0)) ok',[lock])).rows[0].ok)throw new ConflictException('原请求仍在处理中，请稍后核实，尚未封存。');
   const identity=await c.query(`SELECT 1 FROM adc_auth.local_identity i JOIN adc.patient_booking_subject s ON s.booking_subject_id=i.booking_subject_id WHERE i.identity_id=$1 AND i.booking_subject_id=$2 AND i.enabled=true AND s.verification_kind='online' AND s.verified_identity_key IS NOT NULL FOR SHARE OF i,s`,[a.identityId,a.subjectId]);
   if(!identity.rowCount)throw new UnauthorizedException('本人验证已失效。');
   const rows=(await c.query(`SELECT d.*,o.action_code,o.patient_actor_id operation_patient,o.subject_key,o.access_scope FROM adc.command_dedup d JOIN adc.business_operation o USING(operation_id) WHERE lower(d.request_key)=$1`,[key])).rows;
   if(rows.length>1)throw new ServiceUnavailableException('原请求标识有歧义，请联系核实。');
   if(rows[0]){
    if(rows[0].patient_actor_id!==a.subjectId)throw new ForbiddenException('不能结束此请求，请核实原本人提交。');
    if(!this.matches(rows[0],a,key,input.kind,input.appointmentId))throw new ConflictException('原请求已有结果或类型不符，请先查询原结果。');
    await c.query('COMMIT');return{state:'retired',requestId:key,...input,repeated:true};
   }
   let clinic:string|null=null;
   if(input.appointmentId){const target=(await c.query('SELECT clinic_id FROM adc.appointment WHERE appointment_id=$1 AND booking_subject_id=$2 FOR SHARE',[input.appointmentId,a.subjectId])).rows[0];if(!target)throw new ForbiddenException('不能结束非本人预约的变更请求。');clinic=target.clinic_id;}
   const op=randomUUID(),scope={requestId:key,kind:input.kind,appointmentId:input.appointmentId,state:'retired'};
   await c.query(`INSERT INTO adc.business_operation(operation_id,patient_actor_id,occurred_at,action_code,subject_kind,subject_key,access_scope) VALUES($1,$2,clock_timestamp(),'patient.request.retire','patient_booking_subject',$4,$3)`,[op,a.subjectId,JSON.stringify(scope),a.subjectId]);
   await c.query(`INSERT INTO adc.command_dedup(request_key,patient_actor_id,command_code,payload_fingerprint,operation_id,result_kind,result_key) VALUES($1,$2,$3,$4,$5,'retired_appointment_request',$6)`,[key,a.subjectId,input.kind,createHash('sha256').update('retired-native-appointment:'+JSON.stringify(scope)).digest('hex'),op,key]);
   if(clinic)await c.query('INSERT INTO adc.operation_clinic VALUES($1,$2)',[op,clinic]);
   await c.query('COMMIT');return{state:'retired',requestId:key,...input,repeated:false};
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }
}
