import{patientAppointmentsQuery}from'./patient-appointments-domain';
import{bookingRecoveryQuery}from'./booking-recovery-domain';
import { Controller,Inject,Get,Post,Body,Query,Req,Res,Param } from '@nestjs/common';
import type { Request,Response } from 'express';
import { AuthService } from './auth.service';
import { BookingService } from './booking.service';
import { bookingInput,objectInput,textInput,versionInput } from './booking-domain';
import { dateInput,uuidInput } from './domain';

@Controller('api/v1')
export class BookingController {
 constructor(@Inject(AuthService)private auth:AuthService,@Inject(BookingService)private bookings:BookingService){}
 @Get('catalogue')async catalogue(){return{...await this.bookings.catalogue(),experience:this.auth.experience(),patientRegistrationEnabled:this.auth.patientRegistrationEnabled(),teacherDemoLoginEnabled:this.auth.courseLoginEnabled(),teacherDemoLoginPublic:this.auth.publicCourseLogin()};}
 @Get('demo/options') demoOptions(@Req()req:Request,@Res({passthrough:true})res:Response){res.setHeader('Cache-Control','no-store');return this.auth.demoLoginOptions(req);}
 @Post('demo/access') demoAccess(@Req()req:Request,@Res({passthrough:true})res:Response,@Body()body:unknown){return this.auth.openDemoLogin(req,res,body);}
 @Post('demo/session') demoSession(@Req()req:Request,@Res({passthrough:true})res:Response,@Body()body:unknown){return this.auth.demoLogin(req,res,body);}
 @Post('patient/register')register(@Req()req:Request,@Res({passthrough:true})res:Response,@Body()body:unknown){return this.auth.registerPatient(req,res,body);}
 @Post('patient/password')changePassword(@Req()req:Request,@Res({passthrough:true})res:Response,@Body()body:unknown){return this.auth.changePatientPassword(req,res,body);}
 @Get('availability') availability(@Query('date') date:unknown,@Query('doctorId') doctor:unknown,@Query('clinicId') clinic:unknown,@Query('serviceVersionId') service:unknown){return this.bookings.availability(dateInput(date),doctor?uuidInput(doctor):undefined,clinic?uuidInput(clinic):undefined,service?uuidInput(service):undefined);}
 @Get('availability/next') nextAvailability(@Query('after') after:unknown,@Query('doctorId') doctor:unknown,@Query('clinicId') clinic:unknown,@Query('serviceVersionId') service:unknown){
  return this.bookings.nextAvailability(dateInput(after),uuidInput(doctor),uuidInput(clinic),uuidInput(service));
 }
 @Post('quote') quote(@Req()req:Request,@Body()body:unknown){this.auth.origin(req);return this.bookings.quote(bookingInput(body));}
 @Post('patient/session') patientLogin(@Req()req:Request,@Res({passthrough:true})res:Response,@Body()body:unknown){return this.auth.login('patient',req,res,body);}
 @Get('patient/session') patient(@Req()req:Request){return this.auth.patient(req);}
 @Post('patient/logout') patientLogout(@Req()req:Request,@Res({passthrough:true})res:Response){return this.auth.logout('patient',req,res);}
 @Get('patient/appointments/queue')async minePage(@Req()req:Request,@Query()q:Record<string,unknown>){return this.bookings.minePage(await this.auth.patient(req),patientAppointmentsQuery(q));}
 @Get('patient/appointments')async mine(@Req()req:Request){return this.bookings.mine(await this.auth.patient(req));}
 @Get('patient/appointment-commands/:requestId')async commandStatus(@Req()req:Request,@Param('requestId')requestId:unknown,@Query()q:Record<string,unknown>){return this.bookings.commandStatus(await this.auth.patient(req),uuidInput(requestId),bookingRecoveryQuery(q));}
 @Post('patient/appointments')async book(@Req()req:Request,@Body()body:unknown){this.auth.origin(req);return this.bookings.command(await this.auth.patient(req),'book',bookingInput(body,true));}
 @Post('patient/appointments/:id/reschedule')async reschedule(@Req()req:Request,@Param('id')id:unknown,@Body()body:unknown){this.auth.origin(req);const input=bookingInput(body,true);versionInput(input.version);return this.bookings.command(await this.auth.patient(req),'reschedule',input,uuidInput(id));}
 @Post('patient/appointments/:id/cancel')async cancel(@Req()req:Request,@Param('id')id:unknown,@Body()body:unknown){this.auth.origin(req);const b=objectInput(body,['requestId','version','reason']);return this.bookings.command(await this.auth.patient(req),'cancel',{requestId:uuidInput(b.requestId),version:versionInput(b.version),reason:textInput(b.reason,'取消原因',500)},uuidInput(id));}
 @Post('staff/session') staffLogin(@Req()req:Request,@Res({passthrough:true})res:Response,@Body()body:unknown){return this.auth.login('staff',req,res,body);}
 @Get('staff/session')async staff(@Req()req:Request){const a=await this.auth.staff(req);return {...a,clinics:await this.auth.clinics(a,'appointment.read'),functions:await this.auth.functions(a)};}
 @Post('staff/logout') staffLogout(@Req()req:Request,@Res({passthrough:true})res:Response){return this.auth.logout('staff',req,res);}
 @Get('staff/appointments')async staffAppointments(@Req()req:Request,@Query('date')date:unknown,@Query('clinicId')clinic:unknown){return this.bookings.staffList(await this.auth.staff(req),dateInput(date),clinic?uuidInput(clinic):undefined);}
}
