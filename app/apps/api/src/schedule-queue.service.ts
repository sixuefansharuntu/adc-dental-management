import {Injectable,Inject,ConflictException} from '@nestjs/common';
import {randomUUID,createHash} from 'node:crypto';
import {DatabaseService} from './database.service';
import {AuthService,type StaffActor} from './auth.service';
import {FollowupQueueCursor} from './followup-queue-domain';
import {scheduleDayRange,scheduleMatches,scheduleSummary,type ScheduleQueueQuery} from './schedule-queue-domain';

const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
@Injectable()
export class ScheduleQueueService {
 private readonly cursors=new FollowupQueueCursor();
 constructor(@Inject(DatabaseService)readonly db:DatabaseService,@Inject(AuthService)readonly auth:AuthService){}
 async list(a:StaffActor,q:ScheduleQueueQuery) {
  const c=await this.db.pool.connect();
  try {
   await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
   // 沿用前台原排班查看范围，不新增只读角色或授权。
   await this.auth.assertAccess(c,a,'schedule.manage',q.clinicId);
   const {start,end}=scheduleDayRange(q.date);
   const rows=(await c.query(`SELECT s.schedule_id,s.doctor_id,s.clinic_id,
    s.starts_at,s.ends_at,s.starts_at::text start_key,s.ends_at::text end_key,
    s.can_receive,s.public_status,s.capacity_limit,s.change_reason,s.row_version,
    e.name doctor_name FROM adc.doctor_schedule s JOIN adc.employee e ON e.employee_id=s.doctor_id
    WHERE s.clinic_id=$1 AND s.starts_at<$3::timestamptz AND s.ends_at>$2::timestamptz
     AND($4::uuid IS NULL OR s.doctor_id=$4)
    ORDER BY s.starts_at,s.schedule_id LIMIT 5001`,[q.clinicId,start,end,q.doctorId])).rows;
   if(rows.length>5000)throw new ConflictException('匹配排班超过5000份，请选择医生或其他日期后查询；未截断结果。');
   const fingerprint=hash(rows),scope=hash(['schedule_queue',a.accountId,a.employeeId,
    q.clinicId,q.date,q.doctorId,q.internal,q.publicState,q.limit]);
   const token=q.cursor?this.cursors.decode(q.cursor):null;
   if(token&&(token.scope!==scope||token.fingerprint!==fingerprint||typeof token.lastId!=='string'))
    throw new ConflictException('排班、医生资料或筛选条件已变化，请重新查询。');
   const filtered=rows.filter(r=>scheduleMatches(r,q));
   const index=token?filtered.findIndex(r=>r.schedule_id===token.lastId)+1:0;
   if(token&&index===0)throw new ConflictException('原排班续页位置已变化，请重新查询。');
   const asOf=token?.asOf||(await c.query('SELECT clock_timestamp()::text value')).rows[0].value;
   const expires=token?.expires||Date.now()+15*60000,page=filtered.slice(index,index+q.limit);
   const result={items:page.map(({start_key,end_key,...r})=>r),
    total:filtered.length,summary:scheduleSummary(rows),limit:q.limit,asOf:new Date(asOf).toISOString(),
    doctors:[...new Map(rows.map(r=>[r.doctor_id,{id:r.doctor_id,name:r.doctor_name}])).values()],
    nextCursor:index+page.length<filtered.length?this.cursors.encode({scope,fingerprint,
     asOf,expires,lastId:page.at(-1).schedule_id}):null};
   if(Buffer.byteLength(JSON.stringify(result))>5*1024*1024)
    throw new ConflictException('排班结果超过5MiB，请减少每页数量。');
   const op=randomUUID();
   await c.query(`INSERT INTO adc.business_operation(operation_id,actor_id,occurred_at,
    action_code,subject_kind,subject_key,access_scope)
    VALUES($1,$2,clock_timestamp(),'frontdesk.schedules.list','schedule_queue',$3,$4)`,
    [op,a.employeeId,q.clinicId,JSON.stringify({date:q.date,doctorId:q.doctorId,
     internal:q.internal,publicState:q.publicState,scheduleIds:page.map(r=>r.schedule_id),
     total:result.total,asOf:result.asOf})]);
   await c.query('INSERT INTO adc.operation_clinic VALUES($1,$2)',[op,q.clinicId]);
   await c.query('COMMIT');return result;
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }
}
