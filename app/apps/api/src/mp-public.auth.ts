import{Injectable,Inject,ForbiddenException,UnauthorizedException,BadRequestException,HttpException,HttpStatus,ServiceUnavailableException}from'@nestjs/common';
import{createHash,createHmac,randomBytes,timingSafeEqual}from'node:crypto';
import type{Request}from'express';
import{DatabaseService}from'./database.service';
import{objectInput,textInput}from'./booking-domain';
import{credentialMatches}from'./credentials';
import{CourseDemoGate}from'./course-demo';
import{LoginThrottle}from'./login-throttle';
import type{PatientActor}from'./auth.service';

/**
 * 小程序「对外」合成患者通道。
 *
 * 与 MiniProgramLocalAuth 的区别：
 *  1. 允许公网调用，但只接受带签名头的云函数请求（客户端直连公网无效）；
 *  2. 令牌哈希统一用 sha256(token)，与网页端、改密校验、会话撤销共用同一语义；
 *  3. 限流分三层：调用来源（openid）、账号（loginName）、全局并发与总配额。
 *
 * 刻意未做的事：不复制 MiniProgramLocalAuth.gate() 的本机限制，
 * 也不放开原 /api/v1/miniprogram/* 的任何条件——原通道保持原样。
 */
@Injectable()
export class MpPublicAuth{
 private demo:CourseDemoGate;
 private loginThrottle=new LoginThrottle(Date.now,4096,24);
 private userWindow=new Map<string,{count:number;until:number}>();
 private globalWindow={count:0,until:0};
 private active=0;
 private readonly perUserPerMinute=60;
 private readonly globalPerMinute=300;
 private readonly maxConcurrent=24;

 constructor(@Inject(DatabaseService)private db:DatabaseService){
  this.demo=new CourseDemoGate(db.pool);
 }

 private digest(token:string){return createHash('sha256').update(token).digest('hex');}

 /** 校验云函数签名，返回发起调用的 openid；不通过直接拒绝 */
 private source(req:Request):string{
  const secret=process.env.ADC_MP_SOURCE_SECRET||'';
  if(secret.length<32)throw new ServiceUnavailableException('小程序对外通道未配置。');
  const ts=String(req.headers['x-adc-mp-ts']||'');
  const sign=String(req.headers['x-adc-mp-sign']||'');
  const openid=String(req.headers['x-adc-mp-openid']||'');
  if(!/^\d{10,}$/.test(ts)||!/^[a-f0-9]{64}$/.test(sign)||openid.length<8||openid.length>128)throw new ForbiddenException('调用来源不受信任。');
  if(Math.abs(Date.now()-Number(ts)*1000)>300000)throw new ForbiddenException('请求已过期，请重试。');
  const expect=createHmac('sha256',secret).update(ts+'\n'+openid).digest('hex');
  const a=Buffer.from(expect,'hex'),b=Buffer.from(sign,'hex');
  if(a.length!==b.length||!timingSafeEqual(a,b))throw new ForbiddenException('调用来源不受信任。');
  return openid;
 }

 /** 三层配额的共同入口，返回释放函数 */
 private budget(openid:string):()=>void{
  const now=Date.now();
  if(this.globalWindow.until<=now)this.globalWindow={count:0,until:now+60000};
  if(++this.globalWindow.count>this.globalPerMinute)throw new HttpException('服务繁忙，请稍后再试。',HttpStatus.TOO_MANY_REQUESTS);
  if(this.active>=this.maxConcurrent)throw new HttpException('服务繁忙，请稍后再试。',HttpStatus.TOO_MANY_REQUESTS);
  if(this.userWindow.size>8192)for(const[k,v]of this.userWindow)if(v.until<=now)this.userWindow.delete(k);
  let entry=this.userWindow.get(openid);
  if(!entry||entry.until<=now){entry={count:0,until:now+60000};this.userWindow.set(openid,entry);}
  if(++entry.count>this.perUserPerMinute)throw new HttpException('操作过于频繁，请稍后再试。',HttpStatus.TOO_MANY_REQUESTS);
  this.active++;
  let released=false;
  return()=>{if(released)return;released=true;this.active--;};
 }

 private async patientByToken(token:string):Promise<PatientActor>{
  const{rows}=await this.db.pool.query(`SELECT s.booking_subject_id AS "subjectId",s.patient_id AS "patientId",i.display_name AS name,s.contact_value AS contact,i.identity_id AS "identityId",i.login_name AS "_login",i.credential_verifier AS "_verifier",s.verified_identity_key AS "_key"
   FROM adc_auth.session x JOIN adc_auth.local_identity i ON i.identity_id=x.identity_id JOIN adc.patient_booking_subject s ON s.booking_subject_id=i.booking_subject_id
   WHERE x.token_hash=$1 AND x.expires_at>clock_timestamp() AND i.enabled=true AND s.verification_kind='online' AND s.verified_identity_key IS NOT NULL`,[this.digest(token)]);
  const a=rows[0];
  if(!a)throw new UnauthorizedException('登录已失效，请重新登录。');
  if(this.demo.enabled&&!await this.demo.allowsIdentity({identityId:a.identityId,subjectId:a.subjectId,loginName:a._login,verifier:a._verifier,key:a._key,patientId:a.patientId}))
   throw new ForbiddenException('该身份不属于本次合成演示。');
  return{subjectId:a.subjectId,patientId:a.patientId,name:a.name,contact:a.contact,identityId:a.identityId};
 }

 async login(req:Request,value:unknown){
  const openid=this.source(req),release=this.budget(openid);
  const b=objectInput(value,['loginName','password']);
  const login=textInput(b.loginName,'登录名',100).toLowerCase();
  if(typeof b.password!=='string'||!b.password.length||b.password.length>200||/[\u0000-\u001f]/.test(b.password)){release();throw new BadRequestException('请填写有效的密码。');}
  // 按账号限流：换账号不能绕过；按 openid 的配额在 budget() 里已生效
  const ticket=this.loginThrottle.acquire('mp-login:'+login);
  if(!ticket.allowed){release();throw new HttpException('尝试过多，请稍后再试。',HttpStatus.TOO_MANY_REQUESTS);}
  let failed=true;
  try{
   await this.demo.assertEnvironment();
   const{rows}=await this.db.pool.query('SELECT i.identity_id AS id,i.credential_verifier,i.login_name,i.booking_subject_id,s.verified_identity_key,s.patient_id FROM adc_auth.local_identity i JOIN adc.patient_booking_subject s USING(booking_subject_id) WHERE i.login_name=$1 AND i.enabled=true',[login]);
   if(rows[0]&&this.demo.enabled&&!await this.demo.allowsIdentity({identityId:rows[0].id,subjectId:rows[0].booking_subject_id,loginName:rows[0].login_name,verifier:rows[0].credential_verifier,key:rows[0].verified_identity_key,patientId:rows[0].patient_id??null}))rows.splice(0);
   // 账号不存在时也走一次等价的密码运算，避免通过响应时间探测账号是否存在
   const verifier=rows[0]?.credential_verifier||'scrypt:00000000000000000000000000000000:'+'0'.repeat(128);
   if(!await credentialMatches(b.password,verifier)||!rows[0])throw new UnauthorizedException('账号或密码不正确。');
   const token='mp_'+randomBytes(32).toString('hex');
   await this.db.pool.query('DELETE FROM adc_auth.session WHERE expires_at<=clock_timestamp()');
   const saved=await this.db.pool.query("INSERT INTO adc_auth.session(token_hash,identity_id,expires_at) SELECT $1,identity_id,clock_timestamp()+interval '2 hours' FROM adc_auth.local_identity WHERE identity_id=$2 AND credential_verifier=$3 AND enabled=true FOR SHARE",[this.digest(token),rows[0].id,verifier]);
   if(!saved.rowCount)throw new UnauthorizedException('账号状态已变化，请重新登录。');
   const actor=await this.patientByToken(token);
   failed=false;
   return{mode:'local-synthetic',token,expiresAt:new Date(Date.now()+7200000).toISOString(),patient:{subjectId:actor.subjectId,name:actor.name,contact:actor.contact}};
  }finally{ticket.finish(failed);release();}
 }

 async patient(req:Request):Promise<PatientActor>{
  const openid=this.source(req),release=this.budget(openid);
  try{
   const h=req.headers.authorization;
   if(typeof h!=='string'||!/^Bearer mp_[a-f0-9]{64}$/.test(h))throw new UnauthorizedException('请先完成本人验证。');
   await this.demo.assertEnvironment();
   return await this.patientByToken(h.slice(7));
  }finally{release();}
 }

 async logout(req:Request){
  const openid=this.source(req),release=this.budget(openid);
  try{
   const h=req.headers.authorization;
   if(typeof h==='string'&&/^Bearer mp_[a-f0-9]{64}$/.test(h))await this.db.pool.query('DELETE FROM adc_auth.session WHERE token_hash=$1',[this.digest(h.slice(7))]);
   return{success:true};
  }finally{release();}
 }
}
