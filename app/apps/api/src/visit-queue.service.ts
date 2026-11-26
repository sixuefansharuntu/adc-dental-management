import {Injectable,Inject,ConflictException} from '@nestjs/common';
import {randomUUID,createHash} from 'node:crypto';
import {DatabaseService} from './database.service';
import {AuthService,type StaffActor} from './auth.service';
import {FollowupQueueCursor} from './followup-queue-domain';
import {visitQueueState,visitQueueSummary,type VisitQueueQuery} from './visit-queue-domain';

const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
@Injectable()
export class VisitQueueService {
 private readonly cursors=new FollowupQueueCursor();
 constructor(@Inject(DatabaseService)readonly db:DatabaseService,@Inject(AuthService)readonly auth:AuthService){}

 async list(a:StaffActor,q:VisitQueueQuery) {
  const c=await this.db.pool.connect();
  try {
   await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
   await this.auth.assertAccess(c,a,'visit.read',q.clinicId);
   const needle='%'+q.search.replace(/[\\%_]/g,'\\$&')+'%';
   const rows=(await c.query(`SELECT v.visit_id id,v.row_version::int version,
    v.patient_id "patientId",p.name "patientName",v.clinic_id "clinicId",
    v.appointment_id "appointmentId",v.doctor_id "doctorId",e.name "doctorName",
    v.arrived_at "arrivedAt",v.arrived_at::text sort_key,v.started_at "startedAt",
    v.ended_at "endedAt",v.left_at "leftAt",v.progress_basis basis,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('id',n.nurse_id,'name',x.name)
      ORDER BY x.name,n.nurse_id) FROM adc.visit_nurse n JOIN adc.employee x
      ON x.employee_id=n.nurse_id WHERE n.visit_id=v.visit_id),'[]') nurses,
    ap.disposition "originalAppointmentState",
    CASE WHEN ap.scheduled_at IS NULL THEN NULL ELSE
     GREATEST(0,extract(epoch FROM v.arrived_at-ap.scheduled_at)/60)::int END "lateMinutes"
    FROM adc.visit v JOIN adc.patient p ON p.patient_id=v.patient_id
    JOIN adc.employee e ON e.employee_id=v.doctor_id
    LEFT JOIN adc.appointment ap ON ap.appointment_id=v.appointment_id
    WHERE v.clinic_id=$1 AND(v.arrived_at AT TIME ZONE 'Asia/Shanghai')::date=$2::date
     AND($3::uuid IS NULL OR v.doctor_id=$3) AND($4='' OR p.name ILIKE $5 ESCAPE '\\')
     AND($6::uuid IS NULL OR v.visit_id=$6)
    ORDER BY v.arrived_at,v.visit_id LIMIT 5001`,
    [q.clinicId,q.date,q.doctorId,q.search,needle,q.visitId??null])).rows;
   if(rows.length>5000)throw new ConflictException('匹配接诊超过5000份，请补充患者姓名或医生条件后查询；未截断结果。');
   if(rows.some(r=>!r.nurses.length||r.nurses.length>20))
    throw new ConflictException('接诊配合人员资料需核实，未截断或推定人员。');
   const fingerprint=hash(rows),scope=hash(['visit_queue',a.accountId,a.employeeId,
    q.clinicId,q.date,q.search,q.doctorId,q.state,q.limit,...(q.visitId?[q.visitId]:[])]);
   const token=q.cursor?this.cursors.decode(q.cursor):null;
   if(token&&(token.scope!==scope||token.fingerprint!==fingerprint||typeof token.lastId!=='string'))
    throw new ConflictException('接诊、人员资料或筛选条件已变化，请重新查询。');
   const filtered=q.state==='all'?rows:rows.filter(r=>visitQueueState(r)===q.state);
   const index=token?filtered.findIndex(r=>r.id===token.lastId)+1:0;
   if(token&&index===0)throw new ConflictException('原接诊续页位置已变化，请重新查询。');
   const asOf=token?.asOf||(await c.query('SELECT clock_timestamp()::text value')).rows[0].value;
   const expires=token?.expires||Date.now()+15*60000,page=filtered.slice(index,index+q.limit);
   const result={items:page.map(({sort_key,...r})=>({...r,state:visitQueueState(r)})),
    total:filtered.length,summary:visitQueueSummary(rows),limit:q.limit,asOf:new Date(asOf).toISOString(),
    doctors:[...new Map(rows.map(r=>[r.doctorId,{id:r.doctorId,name:r.doctorName}])).values()],
    nextCursor:index+page.length<filtered.length?this.cursors.encode({scope,fingerprint,
     asOf,expires,lastId:page.at(-1).id}):null};
   if(Buffer.byteLength(JSON.stringify(result))>5*1024*1024)
    throw new ConflictException('接诊结果超过5MiB，请减少每页数量。');
   const op=randomUUID();
   await c.query(`INSERT INTO adc.business_operation(operation_id,actor_id,occurred_at,
    action_code,subject_kind,subject_key,access_scope)
    VALUES($1,$2,clock_timestamp(),'frontdesk.visits.list','visit_queue',$3,$4)`,
    [op,a.employeeId,q.clinicId,JSON.stringify({date:q.date,state:q.state,doctorId:q.doctorId,
     queryDigest:hash(q.search),visitIds:page.map(r=>r.id),total:result.total,asOf:result.asOf})]);
   await c.query('INSERT INTO adc.operation_clinic VALUES($1,$2)',[op,q.clinicId]);
   await c.query('COMMIT');return result;
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }
}
