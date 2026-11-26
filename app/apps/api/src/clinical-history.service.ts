import {Injectable,Inject,ForbiddenException,NotFoundException,ConflictException,BadRequestException} from '@nestjs/common';
import {randomUUID} from 'node:crypto';import type {PoolClient} from 'pg';
import {DatabaseService} from './database.service';import {AuthService,type StaffActor} from './auth.service';
import {FrontdeskService} from './frontdesk.service';import {decimal,lineCents,totalAmount} from './clinical-domain';
import type {ClinicalHistoryQuery} from './clinical-history-domain';

@Injectable()
export class ClinicalHistoryService {
 constructor(@Inject(DatabaseService)readonly db:DatabaseService,@Inject(AuthService)readonly auth:AuthService,@Inject(FrontdeskService)readonly tx:FrontdeskService){}
 private async access(c:PoolClient,a:StaffActor,visitId:string,kind:string){
  const v=(await c.query('SELECT visit_id,clinic_id,doctor_id FROM adc.visit WHERE visit_id=$1',[visitId])).rows[0];
  if(!v)throw new NotFoundException('未找到实际就诊。');
  await this.auth.assertAccess(c,a,kind==='bill'?'bill.read':'clinical.read',v.clinic_id);
  let settlement=false;
  if(kind==='bill')try{await this.auth.assertAccess(c,a,'receipt.create',v.clinic_id);settlement=true;}catch(e){if(!(e instanceof ForbiddenException))throw e;}
  if(!settlement){if(kind==='bill')await this.auth.assertAccess(c,a,'clinical.read',v.clinic_id);
   if(v.doctor_id!==a.employeeId&&!(await c.query('SELECT 1 FROM adc.visit_nurse WHERE visit_id=$1 AND nurse_id=$2',[visitId,a.employeeId])).rowCount)throw new ForbiddenException('仅能查看本人负责或参与就诊的临床原版。');}
  return v;
 }
 async history(a:StaffActor,visitId:string,q:ClinicalHistoryQuery){
  if((q.kind==='treatment')!==!!q.treatmentId)throw new BadRequestException('治疗原版须指定本次就诊的治疗；其他类别不接受治疗标识。');
  const c=await this.db.pool.connect();try{
   await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ');const v=await this.access(c,a,visitId,q.kind);
   const cfg=q.kind==='record'?{root:'clinical_record',key:'record_id',table:'clinical_record_revision',revision:'record_revision_id'}:
    q.kind==='bill'?{root:'treatment_bill',key:'bill_id',table:'bill_revision',revision:'bill_revision_id'}:
    {root:'treatment',key:'treatment_id',table:'treatment_revision',revision:'treatment_revision_id'};
   const root=(await c.query(`SELECT ${cfg.key} AS id,row_version::int AS version FROM adc.${cfg.root} WHERE visit_id=$1${q.kind==='treatment'?' AND treatment_id=$2':''}`,
    q.kind==='treatment'?[visitId,q.treatmentId]:[visitId])).rows[0];
   if(!root&&q.kind==='treatment')throw new NotFoundException('未找到本次就诊的实际治疗。');
   let rows:any[]=[];const items:any[]=[];
   if(root){rows=(await c.query(`SELECT r.*,o.occurred_at AS saved_at,o.reason,o.actor_id,e.name AS actor_name FROM adc.${cfg.table} r JOIN adc.business_operation o USING(operation_id) JOIN adc.employee e ON e.employee_id=o.actor_id WHERE r.${cfg.key}=$1 AND r.visit_id=$2 AND ($3::bigint IS NULL OR r.version_no<$3) ORDER BY r.version_no DESC LIMIT $4`,[root.id,visitId,q.beforeVersion||null,q.limit+1])).rows;
    if(!q.beforeVersion&&!rows.some(r=>Number(r.version_no)===root.version))throw new ConflictException('当前版本缺少对应原版，请核实来源，不能用当前内容冒充旧版。');
   }
   for(const r of rows.slice(0,q.limit)){
    const common={revisionId:r[cfg.revision],entityId:root.id,version:Number(r.version_no),savedAt:r.saved_at,operationId:r.operation_id,editor:{id:r.actor_id,name:r.actor_name},reason:r.reason};
    if(q.kind==='record'){
     const writers=(await c.query('SELECT w.doctor_id AS id,e.name FROM adc.record_revision_writer w JOIN adc.employee e ON e.employee_id=w.doctor_id WHERE w.record_revision_id=$1 ORDER BY w.doctor_id LIMIT 101',[r.record_revision_id])).rows;
     if(writers.length>100)throw new ConflictException('原版记录人超过完整供阅范围，请先核实。');
     items.push({...common,clinicalAt:r.clinical_at,body:r.body,pendingNote:r.pending_note,completeness:r.completeness,writers});
    }else if(q.kind==='treatment'){
     const teeth=(await c.query('SELECT tooth_code FROM adc.treatment_revision_tooth WHERE treatment_revision_id=$1 ORDER BY tooth_code LIMIT 65',[r.treatment_revision_id])).rows.map(x=>x.tooth_code);
     if(teeth.length>64)throw new ConflictException('原版牙位超过完整供阅范围，请先核实。');
     const item=(await c.query('SELECT name FROM adc.treatment_item WHERE item_id=$1',[r.item_id])).rows[0],doctor=(await c.query('SELECT name FROM adc.employee WHERE employee_id=$1',[r.confirming_doctor_id])).rows[0];
     items.push({...common,itemId:r.item_id,currentItemName:item?.name||null,performedAt:r.performed_at,confirmedAt:r.confirmed_at,confirmingDoctor:{id:r.confirming_doctor_id,name:doctor?.name||null},teeth});
    }else{
     const lines=(await c.query(`SELECT l.bill_line_id AS id,l.treatment_id AS "treatmentId",l.treatment_revision_id AS "treatmentRevisionId",t.version_no::int AS "treatmentVersion",l.price_version_id AS "priceVersionId",l.item_name AS name,l.charge_unit AS unit,l.quantity,l.adopted_unit_price AS "unitPrice",COALESCE((SELECT jsonb_agg(z.tooth_code ORDER BY z.tooth_code) FROM adc.treatment_revision_tooth z WHERE z.treatment_revision_id=l.treatment_revision_id),'[]') AS teeth FROM adc.bill_revision_line l JOIN adc.treatment_revision t ON t.treatment_revision_id=l.treatment_revision_id AND t.treatment_id=l.treatment_id WHERE l.bill_revision_id=$1 ORDER BY l.bill_line_id LIMIT 101`,[r.bill_revision_id])).rows;
     if(lines.length>100||lines.some(l=>l.teeth.length>64))throw new ConflictException('原版账单超出完整供阅范围，请先核实。');
     if(!lines.length)throw new ConflictException('原版账单缺少采用明细，不能猜测金额。');
     const staff=(await c.query('SELECT s.employee_id AS id,e.name FROM adc.bill_revision_staff s JOIN adc.employee e ON e.employee_id=s.employee_id WHERE s.bill_revision_id=$1 ORDER BY s.employee_id LIMIT 101',[r.bill_revision_id])).rows;
     if(staff.length>100)throw new ConflictException('原版相关人员超出完整供阅范围。');
     const priced=lines.map(l=>({...l,subtotal:decimal(lineCents(l.quantity,l.unitPrice),2)}));
     items.push({...common,openedAt:r.opened_at,creatorId:r.creator_id,visitRevisionId:r.visit_revision_id,staff,lines:priced,total:totalAmount(priced)});
    }
   }
   const result={kind:q.kind,visitId,entityId:root?.id||null,currentVersion:root?.version||null,items,nextVersion:rows.length>q.limit?Number(rows[q.limit-1].version_no):null,limit:q.limit,referenceNamesAreCurrent:true};
   if(Buffer.byteLength(JSON.stringify(result))>5*1024*1024)throw new ConflictException('原版内容超过5MiB，请减少每页版本数后重试。');
   const op=randomUUID();await this.tx.insert(c,'business_operation',{operation_id:op,actor_id:a.employeeId,occurred_at:new Date(),action_code:q.kind==='bill'?'bill.history.view':'clinical.history.view',subject_kind:'visit',subject_key:visitId,access_scope:JSON.stringify({visitIds:[visitId],kind:q.kind,entityId:root?.id||null,revisionIds:items.map(x=>x.revisionId),versions:items.map(x=>x.version),clinicalBody:q.kind==='record'})});
   await this.tx.insert(c,'operation_clinic',{operation_id:op,clinic_id:v.clinic_id});await c.query('COMMIT');return result;
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }
}
