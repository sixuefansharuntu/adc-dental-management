import {BadRequestException,ConflictException,ForbiddenException,HttpException,HttpStatus} from '@nestjs/common';
import {randomUUID} from 'node:crypto';
import type {Request,Response} from 'express';
import {objectInput,textInput,contactInput} from './booking-domain';
import {uuidInput} from './domain';
import {credentialHash,credentialMatches,newPatientPassword} from './credentials';
import {CourseDemoGate,demoDigest} from './course-demo';
import {LoginThrottle} from './login-throttle';
import {canonicalIp} from './proxy-policy';

export function registrationInput(value:unknown){
 const b=objectInput(value,['requestId','loginName','password','name','contact','syntheticOnly']);
 if(b.syntheticOnly!==true)throw new BadRequestException('请确认仅使用合成资料进行课程演示。');
 const loginName=textInput(b.loginName,'账号',32).toLowerCase();
 if(!/^[a-z][a-z0-9_]{3,31}$/.test(loginName))throw new BadRequestException('账号须为4—32位小写字母、数字或下划线，以字母开头。');
 const password=newPatientPassword(b.password);
 return{requestId:uuidInput(b.requestId),loginName,password,name:textInput(b.name,'预约姓名',40),contact:contactInput(b.contact)};
}
export class CoursePatientRegistration {
 private throttle=new LoginThrottle(Date.now,512,2);
 constructor(private pool:any,private gate:CourseDemoGate){}
 async register(req:Request,res:Response,value:unknown,caller=canonicalIp(req.ip||req.socket?.remoteAddress||'')){
  if(!this.gate.registrationEnabled||!this.gate.manifest)throw new ForbiddenException('当前环境未开放患者自助注册。');
  const input=registrationInput(value),ticket=this.throttle.acquire(caller);
  if(!ticket.allowed){res.setHeader('Retry-After',String(ticket.retryAfter));throw new HttpException('注册尝试过多，请稍后再试。',HttpStatus.TOO_MANY_REQUESTS);}
  let c:any;
  try{
   await this.gate.assertEnvironment();
   const verifier=await credentialHash(input.password),datasetId=this.gate.manifest.datasetId;
   const inputSha256=demoDigest(JSON.stringify({loginName:input.loginName,name:input.name,contact:input.contact}));
   c=await this.pool.connect();await c.query('BEGIN');
   await c.query("SELECT pg_advisory_xact_lock(hashtext('adc.course.registration'),hashtext($1))",[datasetId]);
   await this.gate.assertEnvironment(c);
   const prior=(await c.query('SELECT action_code,after_content FROM adc.business_operation WHERE operation_id=$1',[input.requestId])).rows[0];
   if(prior){
    const p=prior.after_content;
    if(prior.action_code!=='course.patient.register'||p?.datasetId!==datasetId||p?.inputSha256!==inputSha256)throw new ConflictException('注册请求与原提交不一致，请先尝试登录原账号。');
    const r=(await c.query('SELECT i.identity_id AS "identityId",i.booking_subject_id AS "subjectId",i.login_name AS "loginName",i.credential_verifier AS verifier,s.verified_identity_key AS key,s.patient_id AS "patientId" FROM adc_auth.local_identity i JOIN adc.patient_booking_subject s USING(booking_subject_id) WHERE i.identity_id=$1 AND i.enabled=true',[p.identityId])).rows[0];
    if(!r||!await credentialMatches(input.password,r.verifier)||!await this.gate.allowsIdentity(r,c))throw new ConflictException('无法采用原注册结果，请核对账号后登录。');
    await c.query('COMMIT');return{registered:true,loginName:input.loginName,repeated:true};
   }
   if((await c.query('SELECT 1 FROM adc_auth.local_identity WHERE lower(login_name)=$1',[input.loginName])).rows.length)throw new ConflictException('这个账号不可用，请换一个账号；如果已经注册，请直接登录。');
   const count=(await c.query("SELECT count(*)::int n FROM adc.business_operation WHERE action_code='course.patient.register' AND after_content->>'datasetId'=$1",[datasetId])).rows[0].n;
   if(count>=200)throw new ConflictException('本次演示的注册名额已满，请联系演示负责人。');
   const identityId=randomUUID(),subjectId=randomUUID(),key=`course-registration:${datasetId}:${input.requestId}`;
   await c.query("INSERT INTO adc.patient_booking_subject(booking_subject_id,verified_identity_key,verification_kind,verified_at,contact_value,patient_id,row_version) VALUES($1,$2,'online',clock_timestamp(),$3,NULL,1)",[subjectId,key,input.contact]);
   await c.query('INSERT INTO adc_auth.local_identity(identity_id,login_name,booking_subject_id,credential_verifier,display_name,enabled) VALUES($1,$2,$3,$4,$5,true)',[identityId,input.loginName,subjectId,verifier,input.name]);
   const after={schemaVersion:1,syntheticOnly:true,datasetId,identityId,subjectId,loginName:input.loginName,verifierSha256:demoDigest(verifier),inputSha256};
   await c.query("INSERT INTO adc.business_operation(operation_id,patient_actor_id,occurred_at,action_code,subject_kind,subject_key,after_content,reason) VALUES($1,$2,clock_timestamp(),'course.patient.register','course_patient_identity',$3,$4,'课程演示自助注册；联系方式未验证，不关联既有诊所档案')",[input.requestId,subjectId,identityId,JSON.stringify(after)]);
   await c.query('COMMIT');return{registered:true,loginName:input.loginName,repeated:false};
  }catch(error:any){if(c)await c.query('ROLLBACK').catch(()=>{});if(error?.code==='23505')throw new ConflictException('这个账号或注册请求不可用，请先核对原提交。');throw error;}
  finally{if(c)c.release();ticket.finish(true);}
 }
}
