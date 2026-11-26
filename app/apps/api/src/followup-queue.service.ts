import{Injectable,Inject,ForbiddenException,ConflictException}from'@nestjs/common';import{createHash,randomUUID}from'node:crypto';import type{PoolClient}from'pg';
import{DatabaseService}from'./database.service';import{AuthService,type StaffActor}from'./auth.service';import{FrontdeskService}from'./frontdesk.service';
import{FollowupQueueCursor,followupQueueQuery,type FollowupQueueQuery}from'./followup-queue-domain';
const hash=(v:any)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
@Injectable()export class FollowupQueueService{
 readonly cursors=new FollowupQueueCursor();
 constructor(@Inject(DatabaseService)readonly db:DatabaseService,@Inject(AuthService)readonly auth:AuthService,@Inject(FrontdeskService)readonly tx:FrontdeskService){}
 async assist(c:PoolClient,a:StaffActor,clinic:string){try{await this.auth.assertAccess(c,a,'followup.assist',clinic);return true;}catch(e){if(e instanceof ForbiddenException)return false;throw e;}}
 async list(a:StaffActor,clinic:string,q:FollowupQueueQuery=followupQueueQuery({})){
  const c=await this.db.pool.connect();try{
   await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ');await this.auth.assertAccess(c,a,'followup.read',clinic);const assist=await this.assist(c,a,clinic),cursor=q.cursor?this.cursors.decode(q.cursor):null;
   const scope=hash({actor:a.accountId,employee:a.employeeId,clinic,assist,query:{...q,cursor:null}});if(cursor&&cursor.scope!==scope)throw new ConflictException('筛选、诊所或账号范围已变化，请重新查询。');
   const asOf=cursor?.asOf||new Date((await c.query('SELECT clock_timestamp() now')).rows[0].now).toISOString();
   const needle='%'+q.search.replace(/[\\%_]/g,'\\$&')+'%',responsible=q.responsible==='mine'?a.employeeId:q.responsible==='all'?null:q.responsible;
   const rows=(await c.query(`SELECT q.followup_id AS id,q.row_version::int AS version,p.name AS "patientName",i.name AS "itemName",q.planned_at AS "plannedAt",q.planned_at::text AS "plannedKey",q.responsible_id AS "responsibleId",e.name AS "responsibleName",EXISTS(SELECT 1 FROM adc.followup_contact x WHERE x.followup_id=q.followup_id AND x.reached_patient) AS reached,(SELECT count(*)::int FROM adc.followup_issue x WHERE x.followup_id=q.followup_id AND x.resolved_at IS NULL) AS "openIssues" FROM adc.followup_task q JOIN adc.treatment t ON t.treatment_id=q.treatment_id JOIN adc.visit v ON v.visit_id=t.visit_id JOIN adc.patient p ON p.patient_id=v.patient_id JOIN adc.treatment_item i ON i.item_id=t.item_id JOIN adc.employee e ON e.employee_id=q.responsible_id WHERE v.clinic_id=$1 AND ($2::boolean OR q.responsible_id=$3 OR EXISTS(SELECT 1 FROM adc.visit_nurse n WHERE n.visit_id=v.visit_id AND n.nurse_id=$3)) AND ($4::text='' OR p.name ILIKE $5 ESCAPE '\\' OR i.name ILIKE $5 ESCAPE '\\') AND ($6::date IS NULL OR q.planned_at >= ($6::date::timestamp AT TIME ZONE 'Asia/Shanghai')) AND ($7::date IS NULL OR q.planned_at < (($7::date+1)::timestamp AT TIME ZONE 'Asia/Shanghai')) AND ($8::uuid IS NULL OR q.responsible_id=$8) ORDER BY ((SELECT count(*) FROM adc.followup_issue x WHERE x.followup_id=q.followup_id AND x.resolved_at IS NULL)>0) DESC,q.planned_at,q.followup_id LIMIT 5001`,[clinic,assist,a.employeeId,q.search,needle,q.fromDate,q.toDate,responsible])).rows;
   if(rows.length>5000)throw new ConflictException('本次有权范围超过5000条，请缩小计划日期或检索范围后完整查询，不截断待办。');
   const fingerprint=hash(rows);if(cursor&&cursor.fingerprint!==fingerprint)throw new ConflictException('待办、人员资料或可见范围已变化，请重新查询，避免漏项或重复。');
   const all=rows.map(r=>({id:r.id,version:r.version,patientName:r.patientName,itemName:r.itemName,plannedAt:r.plannedAt,responsibleId:r.responsibleId,responsibleName:r.responsibleName,contactState:r.reached?'reached':'not_reached',professionalState:r.openIssues>0?'pending':'no_open_issue',openIssues:r.openIssues,due:!r.reached&&+r.plannedAt<=Date.parse(asOf)}));
   const summary={total:all.length,due:all.filter(x=>x.due).length,issues:all.filter(x=>x.openIssues>0).length,unreached:all.filter(x=>x.contactState!=='reached').length,reached:all.filter(x=>x.contactState==='reached').length};
   const filtered=all.filter(x=>q.state==='all'||q.state==='due'&&x.due||q.state==='issues'&&x.openIssues>0||q.state==='unreached'&&x.contactState!=='reached'||q.state==='reached'&&x.contactState==='reached');
   const start=cursor?filtered.findIndex(x=>x.id===cursor.afterId)+1:0;if(cursor&&start===0)throw new ConflictException('原分页位置不再可见，请重新查询。');const items=filtered.slice(start,start+q.limit),expires=cursor?.expires||Date.now()+15*60000;
   const nextCursor=start+items.length<filtered.length?this.cursors.encode({scope,fingerprint,asOf,expires,afterId:items[items.length-1]!.id}):null;
   const op=randomUUID();await this.tx.insert(c,'business_operation',{operation_id:op,actor_id:a.employeeId,occurred_at:new Date(),action_code:'followup.list',subject_kind:'followup',subject_key:clinic,access_scope:JSON.stringify({followupIds:items.map(x=>x.id),query:{...q,cursor:undefined},asOf,matched:filtered.length,summary,summaryScope:'date-search-responsible-before-state',nextPage:!!nextCursor})});await this.tx.insert(c,'operation_clinic',{operation_id:op,clinic_id:clinic});await c.query('COMMIT');
   return{items,nextCursor,summary,matched:filtered.length,asOf,limit:q.limit,summaryScope:'date-search-responsible-before-state'};
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }
}
