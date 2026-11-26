import {Controller,Inject,Get,Post,Body,Req,Param,Query,Injectable,ForbiddenException,UnauthorizedException,HttpException,HttpStatus} from '@nestjs/common';
import type {Request} from 'express';
import {randomBytes,createHash} from 'node:crypto';
import {DatabaseService} from './database.service';
import {BookingService} from './booking.service';
import {credentialMatches,type PatientActor} from './auth.service';
import {bookingInput,objectInput,textInput,versionInput} from './booking-domain';
import {patientAppointmentsQuery} from './patient-appointments-domain';
import {bookingRecoveryQuery} from './booking-recovery-domain';
import {PatientRequestRetirementService,retirementInput} from './patient-request-retirement.service';
import {uuidInput} from './domain';

// Temporary native-client adapter. Deliberately separate from browser cookies
// and from a future verified WeChat code exchange; never usable in production.
@Injectable()
export class MiniProgramLocalAuth {
 constructor(@Inject(DatabaseService) private db:DatabaseService){}
 private attempts=new Map<string,{count:number;until:number}>();
 gate(req:Request){
  if(process.env.ADC_MINIPROGRAM_LOCAL_ENABLED!=='true'||process.env.ADC_LOCAL_IDENTITY_ENABLED!=='true'||process.env.NODE_ENV==='production'||
    !['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.ip||req.socket?.remoteAddress||'')||
    req.headers.origin!==undefined||req.headers.cookie!==undefined||req.headers['x-forwarded-for']!==undefined)
   throw new ForbiddenException('本机小程序合成验证未开放。');
 }
 private digest(token:string){return createHash('sha256').update('miniprogram-local:'+token).digest('hex');}
 private token(req:Request){const h=req.headers.authorization;if(typeof h!=='string'||!/^Bearer mp_[a-f0-9]{64}$/.test(h))throw new UnauthorizedException('请先完成合成患者验证。');return h.slice(7);}
 async login(req:Request,value:unknown){
  this.gate(req);if(req.headers.authorization!==undefined)throw new ForbiddenException('请使用独立验证请求。');
  const b=objectInput(value,['loginName','password']),login=textInput(b.loginName,'登录名',100),password=textInput(b.password,'密码',200),ip=req.ip||'',now=Date.now(),attempt=this.attempts.get(ip);
  if(attempt&&attempt.until>now&&attempt.count>=8)throw new HttpException('尝试过多，请一分钟后再试。',HttpStatus.TOO_MANY_REQUESTS);
  const row=(await this.db.pool.query('SELECT identity_id,credential_verifier FROM adc_auth.local_identity WHERE login_name=$1 AND enabled=true',[login])).rows[0];
  if(!await credentialMatches(password,row?.credential_verifier||'scrypt:00000000000000000000000000000000:'+'0'.repeat(128))||!row){
   for(const[k,v]of this.attempts)if(v.until<=now)this.attempts.delete(k);
   this.attempts.set(ip,{count:attempt&&attempt.until>now?attempt.count+1:1,until:now+60000});throw new UnauthorizedException('账号或密码不正确。');
  }
  this.attempts.delete(ip);const token='mp_'+randomBytes(32).toString('hex'),expiresAt=new Date(Date.now()+7200000).toISOString();
  const c=await this.db.pool.connect();
  try{
   await c.query('BEGIN');
   const patient=(await c.query(`SELECT i.identity_id AS "identityId",s.booking_subject_id AS "subjectId",s.patient_id AS "patientId",i.display_name AS name,s.contact_value AS contact
    FROM adc_auth.local_identity i JOIN adc.patient_booking_subject s ON s.booking_subject_id=i.booking_subject_id
    WHERE i.identity_id=$1 AND i.enabled=true AND s.verification_kind='online' AND s.verified_identity_key IS NOT NULL FOR SHARE OF i,s`,[row.identity_id])).rows[0];
   if(!patient)throw new UnauthorizedException('合成患者身份当前不可用。');
   await c.query('INSERT INTO adc_auth.session(token_hash,identity_id,expires_at) VALUES($1,$2,$3)',[this.digest(token),row.identity_id,expiresAt]);
   await c.query('COMMIT');return{mode:'local-synthetic',token,expiresAt,patient:{subjectId:patient.subjectId,name:patient.name,contact:patient.contact}};
  }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
 }
 async patient(req:Request):Promise<PatientActor>{
  this.gate(req);const token=this.token(req);
  const row=(await this.db.pool.query(`SELECT s.booking_subject_id AS "subjectId",s.patient_id AS "patientId",i.display_name AS name,s.contact_value AS contact,i.identity_id AS "identityId"
   FROM adc_auth.session x JOIN adc_auth.local_identity i ON i.identity_id=x.identity_id JOIN adc.patient_booking_subject s ON s.booking_subject_id=i.booking_subject_id
   WHERE x.token_hash=$1 AND x.expires_at>clock_timestamp() AND i.enabled=true AND s.verification_kind='online' AND s.verified_identity_key IS NOT NULL`,[this.digest(token)])).rows[0];
  if(!row)throw new UnauthorizedException('合成患者验证已失效，请重新验证。');return row;
 }
 async logout(req:Request){this.gate(req);await this.db.pool.query('DELETE FROM adc_auth.session WHERE token_hash=$1',[this.digest(this.token(req))]);return{success:true};}
}

@Controller('api/v1/miniprogram')
export class MiniProgramController {
 constructor(@Inject(MiniProgramLocalAuth)private auth:MiniProgramLocalAuth,@Inject(BookingService)private bookings:BookingService,@Inject(PatientRequestRetirementService)private retirement:PatientRequestRetirementService){}
 @Post('local-session')login(@Req()req:Request,@Body()body:unknown){return this.auth.login(req,body);}
 @Get('session')async session(@Req()req:Request){const a=await this.auth.patient(req);return{subjectId:a.subjectId,name:a.name,contact:a.contact};}
 @Post('logout')logout(@Req()req:Request){return this.auth.logout(req);}
 @Post('quote')async quote(@Req()req:Request,@Body()body:unknown){await this.auth.patient(req);return this.bookings.quote(bookingInput(body));}
 @Post('appointments')async book(@Req()req:Request,@Body()body:unknown){return this.bookings.command(await this.auth.patient(req),'book',bookingInput(body,true));}
 @Get('appointments/queue')async mine(@Req()req:Request,@Query()q:Record<string,unknown>){return this.bookings.minePage(await this.auth.patient(req),patientAppointmentsQuery(q));}
 @Post('appointments/:id/reschedule')async reschedule(@Req()req:Request,@Param('id')id:unknown,@Body()body:unknown){const actor=await this.auth.patient(req),input=bookingInput(body,true);versionInput(input.version);return this.bookings.command(actor,'reschedule',input,uuidInput(id));}
 @Post('appointments/:id/cancel')async cancel(@Req()req:Request,@Param('id')id:unknown,@Body()body:unknown){const actor=await this.auth.patient(req),b=objectInput(body,['requestId','version','reason']);return this.bookings.command(actor,'cancel',{requestId:uuidInput(b.requestId),version:versionInput(b.version),reason:textInput(b.reason,'取消原因',500)},uuidInput(id));}
 @Post('request-retirements/:requestId')async retire(@Req()req:Request,@Param('requestId')requestId:unknown,@Body()body:unknown){return this.retirement.retire(await this.auth.patient(req),uuidInput(requestId),retirementInput(body));}
 @Get('action-commands/:requestId')async actionStatus(@Req()req:Request,@Param('requestId')requestId:unknown,@Query()q:Record<string,unknown>){const a=await this.auth.patient(req),key=uuidInput(requestId),query=bookingRecoveryQuery(q);return await this.retirement.status(a,key,query.kind,query.appointmentId)||this.bookings.commandStatus(a,key,query);}
 @Get('appointment-commands/:requestId')async status(@Req()req:Request,@Param('requestId')requestId:unknown){const a=await this.auth.patient(req),key=uuidInput(requestId);return await this.retirement.status(a,key,'book')||this.bookings.commandStatus(a,key,{kind:'book',appointmentId:undefined});}
}
