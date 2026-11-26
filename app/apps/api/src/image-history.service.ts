import{Injectable,Inject,ForbiddenException,NotFoundException,ConflictException,ServiceUnavailableException}from'@nestjs/common';
import{randomUUID,createHash}from'node:crypto';import{readFile,stat}from'node:fs/promises';import{resolve,join}from'node:path';import type{PoolClient}from'pg';
import{DatabaseService}from'./database.service';import{AuthService,type StaffActor}from'./auth.service';import{FrontdeskService}from'./frontdesk.service';
import{FollowupQueueCursor}from'./followup-queue-domain';import{imageHistoryItem,type ImageHistoryQuery}from'./image-history-domain';import{MAX_FILE}from'./care-domain';
@Injectable()export class ImageHistoryService{
 private readonly cursors=new FollowupQueueCursor();
 constructor(@Inject(DatabaseService)readonly db:DatabaseService,@Inject(AuthService)readonly auth:AuthService,@Inject(FrontdeskService)readonly tx:FrontdeskService){}
 private async access(c:PoolClient,a:StaffActor,visitId:string){
  const v=(await c.query('SELECT visit_id,clinic_id,doctor_id FROM adc.visit WHERE visit_id=$1',[visitId])).rows[0];if(!v)throw new NotFoundException('未找到实际就诊。');
  await this.auth.assertAccess(c,a,'image.read',v.clinic_id);
  let imaging=false;try{await this.auth.assertAccess(c,a,'image.scan',v.clinic_id);imaging=true;}catch(e){if(!(e instanceof ForbiddenException))throw e;}
  if(!imaging&&v.doctor_id!==a.employeeId&&!(await c.query('SELECT 1 FROM adc.visit_nurse WHERE visit_id=$1 AND nurse_id=$2',[visitId,a.employeeId])).rowCount)throw new ForbiddenException('仅能查看本人负责或参与就诊的影像原版。');
  return v;
 }
 private async audit(c:PoolClient,a:StaffActor,v:any,action:string,scope:any){const op=randomUUID();await this.tx.insert(c,'business_operation',{operation_id:op,actor_id:a.employeeId,occurred_at:new Date(),action_code:action,subject_kind:'visit',subject_key:v.visit_id,access_scope:JSON.stringify({visitIds:[v.visit_id],...scope})});await this.tx.insert(c,'operation_clinic',{operation_id:op,clinic_id:v.clinic_id});}
 async history(a:StaffActor,visitId:string,q:ImageHistoryQuery){const c=await this.db.pool.connect();try{
  await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ');const v=await this.access(c,a,visitId),scope=createHash('sha256').update(JSON.stringify([a.accountId,a.employeeId,visitId,q.imageId,q.limit])).digest('hex');
  const token=q.cursor?this.cursors.decode(q.cursor):null;if(token&&(token.scope!==scope||typeof token.lastAt!=='string'||typeof token.lastId!=='string'||!/^\d{4}-/.test(token.lastAt)||!Number.isFinite(Date.parse(token.lastAt))||!/^[a-f0-9-]{36}$/.test(token.lastId)))throw new ConflictException('翻页条件或账号已变化，请重新读取影像原版。');
  const asOf=token?.asOf||(await c.query('SELECT clock_timestamp()::text value')).rows[0].value,expires=token?.expires||Date.now()+15*60000;
  const missing=await c.query('SELECT 1 FROM adc.clinical_image i WHERE i.visit_id=$1 AND ($2::uuid IS NULL OR i.image_id=$2) AND NOT EXISTS(SELECT 1 FROM adc.clinical_image_revision r WHERE r.image_id=i.image_id AND r.version_no=i.row_version AND r.visit_id=i.visit_id) LIMIT 1',[visitId,q.imageId]);if(missing.rowCount)throw new ConflictException('当前影像缺少对应原版，请核查归档来源，不能用当前内容替代旧版。');
  const values=[visitId,q.imageId,asOf],where='r.visit_id=$1 AND ($2::uuid IS NULL OR r.image_id=$2) AND o.occurred_at<=$3::timestamptz';
  const total=Number((await c.query(`SELECT count(*) n FROM adc.clinical_image_revision r JOIN adc.business_operation o USING(operation_id) WHERE ${where}`,values)).rows[0].n);
  if(q.imageId&&!total)throw new NotFoundException('本次就诊没有该影像的原版。');
  const rows=(await c.query(`SELECT r.*,o.actor_id,o.occurred_at saved_at,o.occurred_at::text saved_key,o.reason,e.name actor_name,ae.name archiver_name,f.media_type,f.byte_size,f.content_digest FROM adc.clinical_image_revision r JOIN adc.business_operation o USING(operation_id) JOIN adc.employee e ON e.employee_id=o.actor_id JOIN adc.employee ae ON ae.employee_id=r.archived_by JOIN adc.file_asset f ON f.file_id=r.file_id WHERE ${where} AND ($4::timestamptz IS NULL OR (o.occurred_at,r.image_revision_id)<($4::timestamptz,$5::uuid)) ORDER BY o.occurred_at DESC,r.image_revision_id DESC LIMIT $6`,[...values,token?.lastAt||null,token?.lastId||null,q.limit+1])).rows;
  const page=rows.slice(0,q.limit),last=page.at(-1),result={visitId,imageId:q.imageId,asOf,total,limit:q.limit,items:page.map(imageHistoryItem),nextCursor:rows.length>q.limit?this.cursors.encode({scope,asOf,expires,lastAt:last.saved_key,lastId:last.image_revision_id}):null,referenceNamesAreCurrent:true};
  if(Buffer.byteLength(JSON.stringify(result))>5*1024*1024)throw new ConflictException('原版内容超过5MiB，请减少每页版本数后重试。');
  await this.audit(c,a,v,'image.history.view',{imageIds:[...new Set(page.map(r=>r.image_id))],revisionIds:page.map(r=>r.image_revision_id),fileIds:page.map(r=>r.file_id),asOf});await c.query('COMMIT');return result;
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
 async content(a:StaffActor,visitId:string,revisionId:string,download=false){const c=await this.db.pool.connect();try{
  await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ');const v=await this.access(c,a,visitId),r=(await c.query('SELECT r.image_id,r.file_id,r.version_no,f.* FROM adc.clinical_image_revision r JOIN adc.file_asset f USING(file_id) WHERE r.image_revision_id=$1 AND r.visit_id=$2',[revisionId,visitId])).rows[0];if(!r)throw new NotFoundException('未找到本次就诊的影像原版文件。');
  let bytes:Buffer;try{if(!/^[a-f0-9-]{36}\.bin$/.test(r.storage_key)||!['image/png','image/jpeg'].includes(r.media_type)||r.lifecycle_state!=='archived'||Number(r.byte_size)>MAX_FILE)throw Error();const path=join(resolve(process.env.ADC_FILE_ROOT||join(process.cwd(),'.runtime','private-files')),r.storage_key);if((await stat(path)).size!==Number(r.byte_size))throw Error();bytes=await readFile(path);if(bytes.length!==Number(r.byte_size)||createHash('sha256').update(bytes).digest('hex')!==r.content_digest)throw Error();}catch{throw new ServiceUnavailableException('本版原文件不可读取或完整性校验失败；未改用当前文件。');}
  await this.audit(c,a,v,download?'image.history.download':'image.history.content',{imageIds:[r.image_id],revisionIds:[revisionId],fileIds:[r.file_id],versions:[Number(r.version_no)]});await c.query('COMMIT');return{bytes,type:r.media_type,digest:r.content_digest};
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
}
