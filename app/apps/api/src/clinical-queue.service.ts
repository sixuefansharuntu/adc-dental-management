import{Injectable,Inject,ConflictException,ForbiddenException}from'@nestjs/common';import{randomUUID,createHash}from'node:crypto';
import{DatabaseService}from'./database.service';import{AuthService,type StaffActor}from'./auth.service';import{clinicalAccess,clinicalObjectAccess}from'./clinical-access';import{FollowupQueueCursor}from'./followup-queue-domain';import{clinicalQueueMatches,clinicalQueueSummary,type ClinicalQueueQuery}from'./clinical-queue-domain';import{visitQueueState}from'./visit-queue-domain';
const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
@Injectable()export class ClinicalQueueService{
 private readonly cursors=new FollowupQueueCursor();constructor(@Inject(DatabaseService)readonly db:DatabaseService,@Inject(AuthService)readonly auth:AuthService){}
 async list(a:StaffActor,q:ClinicalQueueQuery){const c=await this.db.pool.connect();try{
  await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ');const capability=await clinicalAccess(c,this.auth,a,q.clinicId);
  if(!capability.clinicalRead&&!capability.settlement)throw new ForbiddenException('没有本诊所的诊疗或结算供阅范围。');
  if(q.record!=='all'&&!capability.clinicalRead)throw new ForbiddenException('没有本诊所的病历状态供阅范围。');
  if(q.payment!=='all'&&!capability.billRead)throw new ForbiddenException('没有本诊所的账单状态供阅范围。');
  const needle='%'+q.search.replace(/[\\%_]/g,'\\$&')+'%',rows=(await c.query(`WITH selected AS(
   SELECT v.*,p.name patient_name,p.row_version patient_version,e.name doctor_name,
    (v.doctor_id=$3 OR EXISTS(SELECT 1 FROM adc.visit_nurse n WHERE n.visit_id=v.visit_id AND n.nurse_id=$3)) participant,
    ARRAY(SELECT n.nurse_id FROM adc.visit_nurse n WHERE n.visit_id=v.visit_id ORDER BY n.nurse_id) nurse_keys
   FROM adc.visit v JOIN adc.patient p ON p.patient_id=v.patient_id JOIN adc.employee e ON e.employee_id=v.doctor_id
   WHERE v.clinic_id=$1 AND(v.arrived_at AT TIME ZONE 'Asia/Shanghai')::date=$2::date
    AND($4::uuid IS NULL OR v.doctor_id=$4) AND($5='' OR p.name ILIKE $6 ESCAPE '\\'))
   SELECT v.visit_id id,v.row_version::int version,v.patient_name "patientName",v.patient_version,v.doctor_id "doctorId",v.doctor_name "doctorName",
    v.arrived_at "arrivedAt",v.arrived_at::text sort_key,v.started_at "startedAt",v.ended_at "endedAt",v.left_at "leftAt",v.participant,v.nurse_keys,
    CASE WHEN $7 AND v.participant THEN cr.record_id END "recordId",
    CASE WHEN $7 AND v.participant THEN cr.row_version::int END record_version,
    CASE WHEN $7 AND v.participant THEN COALESCE(cr.completeness,'not_recorded') END "recordState",
    CASE WHEN $8 THEN b.bill_id END "billId",CASE WHEN $8 THEN b.row_version::int END bill_version,
    CASE WHEN $8 THEN r.receipt_id END receipt_key,CASE WHEN $8 THEN r.row_version::int END receipt_version,
    CASE WHEN $8 THEN CASE WHEN r.receipt_id IS NOT NULL THEN 'paid' WHEN b.bill_id IS NOT NULL THEN 'unpaid' ELSE 'not_billed' END END "paymentState",
    CASE WHEN $7 AND v.participant THEN(SELECT count(*)::int FROM adc.treatment t WHERE t.visit_id=v.visit_id) END "treatmentCount"
   FROM selected v LEFT JOIN adc.clinical_record cr ON cr.visit_id=v.visit_id
   LEFT JOIN adc.treatment_bill b ON b.visit_id=v.visit_id LEFT JOIN adc.receipt r ON r.bill_id=b.bill_id
   WHERE $9 OR($7 AND v.participant) ORDER BY v.arrived_at,v.visit_id LIMIT 5001`,
   [q.clinicId,q.date,a.employeeId,q.doctorId,q.search,needle,capability.clinicalRead,capability.billRead,capability.settlement])).rows;
  if(rows.length>5000)throw new ConflictException('匹配就诊超过5000份，请补充患者姓名或医生条件；未截断结果。');
  if(rows.some(r=>r.nurse_keys.length<1||r.nurse_keys.length>20))throw new ConflictException('就诊参与人员需要完整核对，未截断人员范围。');
  const fingerprint=hash(rows);
  // The cursor itself must not become part of its own condition binding.
  const binding=hash(['clinical_queue',a.accountId,a.employeeId,{...q,cursor:null},capability]),token=q.cursor?this.cursors.decode(q.cursor):null;
  if(token&&(token.scope!==binding||token.fingerprint!==fingerprint||typeof token.lastId!=='string'))throw new ConflictException('就诊、参与人员、权限或筛选条件已变化，请重新查询。');
  const filtered=rows.filter(r=>clinicalQueueMatches(r,q)),index=token?filtered.findIndex(r=>r.id===token.lastId)+1:0;if(token&&index===0)throw new ConflictException('原就诊续页位置已变化，请重新查询。');
  const asOf=token?.asOf||(await c.query('SELECT clock_timestamp()::text value')).rows[0].value,expires=token?.expires||Date.now()+15*60000,page=filtered.slice(index,index+q.limit);
  const result={items:page.map(({sort_key,nurse_keys,participant,patient_version,record_version,bill_version,receipt_key,receipt_version,...r})=>({...r,progress:visitQueueState(r),...clinicalObjectAccess(capability,participant,r.doctorId===a.employeeId)})),
   total:filtered.length,summary:clinicalQueueSummary(rows),capabilities:capability,doctors:[...new Map(rows.map(r=>[r.doctorId,{id:r.doctorId,name:r.doctorName}])).values()],limit:q.limit,asOf:new Date(asOf).toISOString(),
   nextCursor:index+page.length<filtered.length?this.cursors.encode({scope:binding,fingerprint,asOf,expires,lastId:page.at(-1).id}):null};
  if(Buffer.byteLength(JSON.stringify(result))>5*1024*1024)throw new ConflictException('诊疗列表超过5MiB，请减少每页数量。');
  const op=randomUUID();await c.query(`INSERT INTO adc.business_operation(operation_id,actor_id,occurred_at,action_code,subject_kind,subject_key,access_scope)
   VALUES($1,$2,clock_timestamp(),'clinical.visits.list','clinical_queue',$3,$4)`,[op,a.employeeId,q.clinicId,JSON.stringify({date:q.date,doctorId:q.doctorId,queryDigest:hash(q.search),progress:q.progress,record:q.record,payment:q.payment,visitIds:page.map(r=>r.id),recordIds:page.filter(r=>r.recordId).map(r=>r.recordId),billIds:page.filter(r=>r.billId).map(r=>r.billId),total:result.total,asOf:result.asOf})]);await c.query('INSERT INTO adc.operation_clinic VALUES($1,$2)',[op,q.clinicId]);await c.query('COMMIT');return result;
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
}
