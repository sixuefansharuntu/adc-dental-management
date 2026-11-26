import {BadRequestException,ConflictException,ForbiddenException,HttpException,HttpStatus,UnauthorizedException} from '@nestjs/common';
import {randomUUID,createHash} from 'node:crypto';
import type {Request,Response} from 'express';
import {objectInput} from './booking-domain';
import {credentialHash,credentialMatches,newPatientPassword} from './credentials';
import {CourseDemoGate,demoDigest} from './course-demo';
import {LoginThrottle} from './login-throttle';
import {canonicalIp} from './proxy-policy';
export function passwordChangeInput(value:unknown){const b=objectInput(value,['oldPassword','newPassword']);if(typeof b.oldPassword!=='string'||!b.oldPassword.length||b.oldPassword.length>200||/[\u0000-\u001f]/.test(b.oldPassword))throw new BadRequestException('请填写原密码。');const next=newPatientPassword(b.newPassword);if(next===b.oldPassword)throw new BadRequestException('新密码不能与原密码相同。');return{oldPassword:b.oldPassword,newPassword:next};}
export class PatientPasswordChange{
 private throttle=new LoginThrottle(Date.now,512,2);
 constructor(private pool:any,private gate:CourseDemoGate){}
 async change(req:Request,res:Response,value:unknown,actor:{identityId:string;subjectId:string},token:string,caller=canonicalIp(req.ip||req.socket?.remoteAddress||'')){
  if(!this.gate.enabled||!this.gate.manifest)throw new ForbiddenException('当前身份入口不支持密码修改。');
  const input=passwordChangeInput(value),ticket=this.throttle.acquire(`${actor.identityId}:${caller}`);
  if(!ticket.allowed){res.setHeader('Retry-After',String(ticket.retryAfter));throw new HttpException('密码尝试过多，请稍后再试。',HttpStatus.TOO_MANY_REQUESTS);}
  let c:any;
  try{
   c=await this.pool.connect();await c.query('BEGIN');
   const r=(await c.query('SELECT i.identity_id AS "identityId",i.booking_subject_id AS "subjectId",i.login_name AS "loginName",i.credential_verifier AS verifier,s.verified_identity_key AS key FROM adc_auth.local_identity i JOIN adc.patient_booking_subject s USING(booking_subject_id) WHERE i.identity_id=$1 AND i.booking_subject_id=$2 AND i.enabled=true FOR UPDATE OF i',[actor.identityId,actor.subjectId])).rows[0];
   const session=(await c.query('SELECT 1 FROM adc_auth.session WHERE token_hash=$1 AND identity_id=$2 AND expires_at>clock_timestamp()',[createHash('sha256').update(token).digest('hex'),actor.identityId])).rows.length;
   if(!session||!r)throw new UnauthorizedException('登录已失效，请重新登录。');
   await this.gate.assertEnvironment(c);if(!await this.gate.allowsIdentity(r,c))throw new ForbiddenException('身份凭据不匹配。');
   if(!await credentialMatches(input.oldPassword,r.verifier))throw new UnauthorizedException('原密码不正确。');
   const version=(await c.query("SELECT count(*)::int n FROM adc.business_operation WHERE action_code='course.patient.password' AND subject_kind='course_patient_identity' AND subject_key=$1 AND patient_actor_id=$2",[r.identityId,r.subjectId])).rows[0].n+1;
   if(version>500)throw new ConflictException('密码修改次数已达本次演示上限，请联系演示负责人。');
   const verifier=await credentialHash(input.newPassword);
   await c.query('UPDATE adc_auth.local_identity SET credential_verifier=$2 WHERE identity_id=$1',[r.identityId,verifier]);
   const after={schemaVersion:1,syntheticOnly:true,datasetId:this.gate.manifest.datasetId,identityId:r.identityId,subjectId:r.subjectId,loginName:r.loginName,credentialVersion:version,fromVerifierSha256:demoDigest(r.verifier),toVerifierSha256:demoDigest(verifier)};
   await c.query("INSERT INTO adc.business_operation(operation_id,patient_actor_id,occurred_at,action_code,subject_kind,subject_key,after_content,reason) VALUES($1,$2,clock_timestamp(),'course.patient.password','course_patient_identity',$3,$4,'患者核验原密码后修改；撤销全部旧会话')",[randomUUID(),r.subjectId,r.identityId,JSON.stringify(after)]);
   await c.query('DELETE FROM adc_auth.session WHERE identity_id=$1',[r.identityId]);await c.query('COMMIT');
   return{changed:true,loginRequired:true};
  }catch(e){if(c)await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c?.release();ticket.finish(true);}
 }
}
