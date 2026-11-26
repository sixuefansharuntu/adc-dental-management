import { Injectable,Inject,UnauthorizedException,ForbiddenException,BadRequestException,HttpException,HttpStatus } from '@nestjs/common';
import { randomBytes,createHash } from 'node:crypto';
import type { Request,Response } from 'express';
import { DatabaseService } from './database.service';
import { objectInput,textInput } from './booking-domain';
import type { PoolClient } from 'pg';
import {canonicalIp} from './proxy-policy';
import {LoginThrottle} from './login-throttle';
import{CourseDemoGate}from'./course-demo';
import{credentialMatches}from'./credentials';
export{credentialHash,credentialMatches}from'./credentials';
import{CoursePatientRegistration}from'./course-registration';
import{PatientPasswordChange}from'./patient-password';
import {CourseLoginAccess,courseLoginRoles} from './course-login';
export interface PatientActor {subjectId:string;patientId:string|null;name:string;contact:string;identityId:string}
export interface StaffActor {accountId:string;employeeId:string;name:string}
@Injectable()
export class AuthService {
 private demo:CourseDemoGate;
 private registration:CoursePatientRegistration;
 private passwords:PatientPasswordChange;
 private courseLogin:CourseLoginAccess;
 constructor(@Inject(DatabaseService) readonly db:DatabaseService){this.demo=new CourseDemoGate(db.pool);this.registration=new CoursePatientRegistration(db.pool,this.demo);this.passwords=new PatientPasswordChange(db.pool,this.demo);this.courseLogin=new CourseLoginAccess(this.demo.enabled);}
 async assertExperience(){await this.demo.assertEnvironment();}
 experience(){return this.demo.enabled?'teacher-demo':'standard';}
 patientRegistrationEnabled(){return this.demo.registrationEnabled;}
 async registerPatient(req:Request,res:Response,value:unknown){this.origin(req);return this.registration.register(req,res,value);}
 async changePatientPassword(req:Request,res:Response,value:unknown){
  this.origin(req);
  const actor=await this.patient(req);
  const result=await this.passwords.change(req,res,value,actor,this.cookie(req,'patient'));
  res.clearCookie('adc_course_patient',{path:'/api/v1'});
  return result;
 }
 private loginThrottle=new LoginThrottle();
 origin(req:Request){if(req.headers.origin!==(process.env.ADMIN_ORIGIN||'http://127.0.0.1:5173'))throw new ForbiddenException('写入请求来源不受允许。');}
 private cookieName(kind:'patient'|'staff'){return(this.demo.enabled?'adc_course_':'adc_')+kind;}
 private cookie(req:Request,kind:'patient'|'staff'){return (req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(this.cookieName(kind)+'='))?.split('=')[1]||'';}
 private digest(token:string){return createHash('sha256').update(token).digest('hex');}
 courseLoginEnabled(){return this.courseLogin.enabled;}
 publicCourseLogin(){return this.courseLogin.publicEnabled;}
 demoLoginOptions(req:Request){return {items:this.courseLogin.options(req)};}
 async openDemoLogin(req:Request,res:Response,value:unknown){
  this.origin(req);
  const {invite}=objectInput(value,['invite']);
  return this.loginAttempt('course-invite',req,res,()=>this.courseLogin.open(invite,res,()=>this.demo.assertEnvironment()));
 }
 async demoLogin(req:Request,res:Response,value:unknown){
  this.origin(req);
  const expires=this.courseLogin.expires(req);
  if(!expires)throw new ForbiddenException('演示授权已失效，请重新打开老师专用链接。');
  const {role}=objectInput(value,['role']);
  const chosen=courseLoginRoles.find(option=>option.id===role);
  if(!chosen)throw new BadRequestException('请选择可用的演示账号。');
  return this.loginAttempt(chosen.kind,req,res,async()=>{
   await this.demo.assertEnvironment();
   const row=chosen.kind==='patient'
    ? (await this.db.pool.query(`SELECT i.identity_id AS id,i.credential_verifier,i.login_name,i.booking_subject_id,s.verified_identity_key,s.patient_id
        FROM adc_auth.local_identity i JOIN adc.patient_booking_subject s USING(booking_subject_id)
        WHERE i.identity_id=$1 AND i.login_name=$2 AND i.enabled=true`,[this.demo.manifest?.identities.find(i=>i.loginName===chosen.loginName)?.identityId,chosen.loginName])).rows[0]
    : (await this.db.pool.query(`SELECT account_id AS id,credential_verifier FROM adc.staff_account
        WHERE account_id=$1 AND employee_id=$2 AND login_name=$3 AND activation_arrangement='enabled' AND disabled_at IS NULL`,[chosen.accountId,chosen.employeeId,chosen.loginName])).rows[0];
   if(!row||chosen.kind==='patient'&&!await this.demo.allowsIdentity({identityId:row.id,subjectId:row.booking_subject_id,loginName:row.login_name,verifier:row.credential_verifier,key:row.verified_identity_key,patientId:row.patient_id})){
    throw new UnauthorizedException('该演示账号当前不可用。');
   }
   const duration=Math.min(45*60_000,expires-Date.now());
   if(duration<=0)throw new ForbiddenException('演示授权已失效，请重新打开老师专用链接。');
   return this.issueSession(chosen.kind,req,res,row.id,row.credential_verifier,duration,chosen.kind==='staff'?chosen.employeeId:undefined);
  });
 }
 async login(kind:'patient'|'staff',req:Request,res:Response,value:unknown){
  this.origin(req);const b=objectInput(value,['loginName','password']);const rawLogin=textInput(b.loginName,'登录名',100),login=kind==='patient'?rawLogin.toLowerCase():rawLogin;
  if(typeof b.password!=='string'||!b.password.length||b.password.length>200||/[\u0000-\u001f]/.test(b.password))throw new BadRequestException('请填写有效的密码。');
  const password=b.password;
  if(kind==='patient'&&!this.demo.enabled&&(process.env.ADC_LOCAL_IDENTITY_ENABLED!=='true'||process.env.NODE_ENV==='production'))throw new ForbiddenException('本地身份适配只用于本机开发；微信身份入口尚待配置。');
  return this.loginAttempt(kind,req,res,async()=>{
  if(kind==='patient')await this.demo.assertEnvironment();
  const {rows}=await this.db.pool.query(kind==='patient'?'SELECT i.identity_id AS id,i.credential_verifier,i.login_name,i.booking_subject_id,s.verified_identity_key,s.patient_id FROM adc_auth.local_identity i JOIN adc.patient_booking_subject s USING(booking_subject_id) WHERE i.login_name=$1 AND i.enabled=true':"SELECT account_id AS id,credential_verifier FROM adc.staff_account WHERE login_name=$1 AND activation_arrangement='enabled' AND disabled_at IS NULL",[login]);
  if(kind==='patient'&&this.demo.enabled&&rows[0]&&!await this.demo.allowsIdentity({identityId:rows[0].id,subjectId:rows[0].booking_subject_id,loginName:rows[0].login_name,verifier:rows[0].credential_verifier,key:rows[0].verified_identity_key,patientId:rows[0].patient_id??null}))rows.splice(0);
  // Unknown accounts still perform the same password work to avoid an account-existence timing shortcut.
  const verifier=rows[0]?.credential_verifier||'scrypt:00000000000000000000000000000000:'+ '0'.repeat(128);
  if(!await credentialMatches(password,verifier)||!rows[0])throw new UnauthorizedException('账号或密码不正确。');
  return this.issueSession(kind,req,res,rows[0].id,verifier);
  });
 }
 private async loginAttempt<T>(kind:string,req:Request,res:Response,work:()=>Promise<T>){
  const key=`${kind}:${canonicalIp(req.ip||req.socket?.remoteAddress||'')}`,ticket=this.loginThrottle.acquire(key);
  if(!ticket.allowed){res.setHeader('Retry-After',String(ticket.retryAfter));throw new HttpException('尝试过多，请稍后再试。',HttpStatus.TOO_MANY_REQUESTS);}
  let failed=true;try{const result=await work();failed=false;return result;}finally{ticket.finish(failed);}
 }
 private async issueSession(kind:'patient'|'staff',req:Request,res:Response,id:string,verifier:string,duration=2*60*60_000,employeeId?:string){
  const token=randomBytes(32).toString('hex');
  await this.db.pool.query('DELETE FROM adc_auth.session WHERE expires_at<=clock_timestamp()');
  const args=[this.digest(token),id,verifier,duration];
  const saved=kind==='patient'
   ? await this.db.pool.query(`INSERT INTO adc_auth.session(token_hash,identity_id,expires_at)
      SELECT $1,identity_id,clock_timestamp()+$4::int*interval '1 millisecond' FROM adc_auth.local_identity
      WHERE identity_id=$2 AND credential_verifier=$3 AND enabled=true FOR SHARE`,args)
   : await this.db.pool.query(`INSERT INTO adc_auth.session(token_hash,account_id,expires_at)
      SELECT $1,account_id,clock_timestamp()+$4::int*interval '1 millisecond' FROM adc.staff_account
      WHERE account_id=$2 AND credential_verifier=$3 AND activation_arrangement='enabled' AND disabled_at IS NULL
      AND ($5::uuid IS NULL OR employee_id=$5) FOR SHARE`,[...args,employeeId??null]);
  if(!saved.rowCount)throw new UnauthorizedException('账号状态已变化，请重新登录。');
  const actor=await (kind==='patient'?this.patient(req,token):this.staff(req,token));
  res.cookie(this.cookieName(kind),token,{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/api/v1',maxAge:duration});
  return actor;
 }
 async patient(req:Request,override?:string):Promise<PatientActor>{
  if(!this.demo.enabled&&(process.env.ADC_LOCAL_IDENTITY_ENABLED!=='true'||process.env.NODE_ENV==='production'))throw new UnauthorizedException('本机患者身份适配未启用。');
  const token=override||this.cookie(req,'patient');if(!/^[a-f0-9]{64}$/.test(token))throw new UnauthorizedException('请先完成本人验证。');
  await this.demo.assertEnvironment();
  const {rows}=await this.db.pool.query(`SELECT s.booking_subject_id AS "subjectId",s.patient_id AS "patientId",i.display_name AS name,s.contact_value AS contact,i.identity_id AS "identityId",i.login_name AS "_login",i.credential_verifier AS "_verifier",s.verified_identity_key AS "_key"
   FROM adc_auth.session x JOIN adc_auth.local_identity i ON i.identity_id=x.identity_id JOIN adc.patient_booking_subject s ON s.booking_subject_id=i.booking_subject_id
   WHERE x.token_hash=$1 AND x.expires_at>clock_timestamp() AND i.enabled=true AND s.verification_kind='online' AND s.verified_identity_key IS NOT NULL`,[this.digest(token)]);
  const a=rows[0];if(!a)throw new UnauthorizedException('登录已失效，请重新登录。');if(this.demo.enabled&&!await this.demo.allowsIdentity({identityId:a.identityId,subjectId:a.subjectId,loginName:a._login,verifier:a._verifier,key:a._key,patientId:a.patientId}))throw new ForbiddenException('该身份不属于本次合成演示。');return{subjectId:a.subjectId,patientId:a.patientId,name:a.name,contact:a.contact,identityId:a.identityId};
 }
 async staff(req:Request,override?:string):Promise<StaffActor>{
  const token=override||this.cookie(req,'staff');if(!/^[a-f0-9]{64}$/.test(token))throw new UnauthorizedException('请先登录员工账号。');
  const {rows}=await this.db.pool.query(`SELECT a.account_id AS "accountId",a.employee_id AS "employeeId",e.name FROM adc_auth.session s JOIN adc.staff_account a ON a.account_id=s.account_id JOIN adc.employee e ON e.employee_id=a.employee_id
  WHERE s.token_hash=$1 AND s.expires_at>clock_timestamp() AND a.activation_arrangement='enabled' AND a.disabled_at IS NULL`,[this.digest(token)]);
  if(!rows[0])throw new UnauthorizedException('员工会话已失效。');return rows[0];
 }
 async clinics(actor:StaffActor,fn:string){
  const {rows}=await this.db.pool.query(`SELECT DISTINCT c.clinic_id AS id,c.name,c.address FROM adc.access_grant g
   JOIN adc.grant_role gr ON gr.grant_id=g.grant_id JOIN adc.role_function f ON f.role_version_id=gr.role_version_id AND f.function_code=$2
   JOIN adc.grant_clinic gc ON gc.grant_id=g.grant_id JOIN adc.clinic c ON c.clinic_id=gc.clinic_id
   WHERE g.account_id=$1 AND g.effective_from<=clock_timestamp() AND (g.effective_to IS NULL OR g.effective_to>clock_timestamp())
   AND NOT EXISTS(SELECT 1 FROM adc.access_grant later WHERE later.account_id=g.account_id AND later.effective_from<=clock_timestamp() AND (later.effective_from>g.effective_from OR (later.effective_from=g.effective_from AND later.version_no>g.version_no))) ORDER BY c.name`,[actor.accountId,fn]);return rows;
 }
 async assertAccess(c:PoolClient,actor:StaffActor,fn:string,clinic:string,resource?:string,fields:string[]=[]){
  const valid=await c.query("SELECT 1 FROM adc.staff_account WHERE account_id=$1 AND employee_id=$2 AND activation_arrangement='enabled' AND disabled_at IS NULL FOR SHARE",[actor.accountId,actor.employeeId]);
  if(!valid.rowCount)throw new UnauthorizedException('员工账号当前不可用。');
  const grants=await c.query(`SELECT DISTINCT g.grant_id FROM adc.access_grant g JOIN adc.grant_role gr ON gr.grant_id=g.grant_id JOIN adc.role_function f ON f.role_version_id=gr.role_version_id AND f.function_code=$3 JOIN adc.grant_clinic gc ON gc.grant_id=g.grant_id AND gc.clinic_id=$2
   WHERE g.account_id=$1 AND g.effective_from<=clock_timestamp() AND (g.effective_to IS NULL OR g.effective_to>clock_timestamp()) AND NOT EXISTS(SELECT 1 FROM adc.access_grant later WHERE later.account_id=g.account_id AND later.effective_from<=clock_timestamp() AND (later.effective_from>g.effective_from OR (later.effective_from=g.effective_from AND later.version_no>g.version_no)))`,[actor.accountId,clinic,fn]);
  if(!grants.rowCount)throw new ForbiddenException('没有本诊所的相应办理权限。');
  for(const field of fields){const ok=await c.query("SELECT 1 FROM adc.grant_field WHERE grant_id=ANY($1::uuid[]) AND resource_code=$2 AND field_code=$3 AND action_code='maintain'",[grants.rows.map(x=>x.grant_id),resource,field]);if(!ok.rowCount)throw new ForbiddenException('没有该字段的维护权限。');}
 }
 async functions(actor:StaffActor){const {rows}=await this.db.pool.query(`SELECT DISTINCT f.function_code FROM adc.access_grant g JOIN adc.grant_role gr ON gr.grant_id=g.grant_id JOIN adc.role_function f ON f.role_version_id=gr.role_version_id WHERE g.account_id=$1 AND g.effective_from<=clock_timestamp() AND (g.effective_to IS NULL OR g.effective_to>clock_timestamp()) AND EXISTS(SELECT 1 FROM adc.grant_clinic gc WHERE gc.grant_id=g.grant_id) AND NOT EXISTS(SELECT 1 FROM adc.access_grant x WHERE x.account_id=g.account_id AND x.effective_from<=clock_timestamp() AND (x.effective_from>g.effective_from OR(x.effective_from=g.effective_from AND x.version_no>g.version_no)))`,[actor.accountId]);return rows.map(x=>x.function_code);}
 async logout(kind:'patient'|'staff',req:Request,res:Response){this.origin(req);await this.db.pool.query('DELETE FROM adc_auth.session WHERE token_hash=$1',[this.digest(this.cookie(req,kind))]);res.clearCookie(this.cookieName(kind),{path:'/api/v1'});return {success:true};}
}
