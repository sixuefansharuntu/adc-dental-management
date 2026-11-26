import{Controller,Inject,Get,Post,Body,Req,Res,Param,Query}from'@nestjs/common';
import type{Request,Response}from'express';
import{BookingService}from'./booking.service';
import{PatientRequestRetirementService,retirementInput}from'./patient-request-retirement.service';
import{bookingInput,objectInput,textInput,versionInput}from'./booking-domain';
import{patientAppointmentsQuery}from'./patient-appointments-domain';
import{bookingRecoveryQuery}from'./booking-recovery-domain';
import{uuidInput}from'./domain';
import{MpPublicAuth}from'./mp-public.auth';

/**
 * 小程序对外通道（云函数专用）。
 * 预约路由沿用 /api/v1/miniprogram/* 的模型，另提供课程患者账号操作。
 * 只认带签名的云函数请求，令牌用 Bearer mp_，会话语义与网页端一致。
 *
 * 原 /api/v1/miniprogram/* 保持"仅本机 + 非生产"不变，不做任何放开。
 */
@Controller('api/v1/mp')
export class MpPublicController{
 constructor(@Inject(MpPublicAuth)private auth:MpPublicAuth,@Inject(BookingService)private bookings:BookingService,@Inject(PatientRequestRetirementService)private retirement:PatientRequestRetirementService){}

 @Post('local-session')login(@Req()req:Request,@Body()body:unknown){return this.auth.login(req,body);}
 @Post('register')register(@Req()req:Request,@Res({passthrough:true})res:Response,@Body()body:unknown){return this.auth.register(req,res,body);}
 @Post('password')changePassword(@Req()req:Request,@Res({passthrough:true})res:Response,@Body()body:unknown){return this.auth.changePassword(req,res,body);}

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
