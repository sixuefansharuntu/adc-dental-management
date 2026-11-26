import{patientPageQuery}from'./patient-page-domain';
import{patientStatusQuery}from'./patient-status-domain';
import{Controller,Inject,Get,Post,Req,Body,Param,Query}from'@nestjs/common';import type{Request}from'express';import{AuthService}from'./auth.service';import{PatientService}from'./patient.service';import{patientInput}from'./patient-domain';import{uuidInput}from'./domain';import{versionInput}from'./booking-domain';
@Controller('api/v1/patients')export class PatientController{
 constructor(@Inject(AuthService)readonly auth:AuthService,@Inject(PatientService)readonly service:PatientService){}
 @Get('bootstrap')async bootstrap(@Req()r:Request){return this.service.bootstrap(await this.auth.staff(r));}
 @Get()async list(@Req()r:Request,@Query('clinicId')clinic:unknown,@Query('q')q?:string,@Query('afterId')after?:string){return this.service.list(await this.auth.staff(r),uuidInput(clinic),q||'',after?uuidInput(after):undefined);}
 @Get('directory')async directory(@Req()r:Request,@Query()q:Record<string,unknown>){return this.service.directory(await this.auth.staff(r),patientPageQuery(q));}
 @Get(':id/history-page')async historyPage(@Req()r:Request,@Param('id')id:unknown,@Query()q:Record<string,unknown>){return this.service.historyPage(await this.auth.staff(r),uuidInput(id),patientPageQuery(q,true));}
 @Get('commands/:requestId')async commandStatus(@Req()r:Request,@Param('requestId')id:unknown,@Query()q:Record<string,unknown>){return this.service.commandStatus(await this.auth.staff(r),uuidInput(id).toLowerCase(),patientStatusQuery(q));}
 @Get(':id')async detail(@Req()r:Request,@Param('id')id:unknown,@Query('clinicId')clinic:unknown){return this.service.detail(await this.auth.staff(r),uuidInput(id),uuidInput(clinic));}
 @Get(':id/history')async history(@Req()r:Request,@Param('id')id:unknown,@Query('clinicId')clinic:unknown,@Query('beforeVersion')before?:string){return this.service.history(await this.auth.staff(r),uuidInput(id),uuidInput(clinic),before?versionInput(Number(before)):undefined);}
 @Post(':id/preview')async preview(@Req()r:Request,@Param('id')id:unknown,@Body()b:unknown){this.auth.origin(r);return this.service.preview(await this.auth.staff(r),uuidInput(id),patientInput(b));}
 @Post(':id')async save(@Req()r:Request,@Param('id')id:unknown,@Body()b:unknown){this.auth.origin(r);return this.service.save(await this.auth.staff(r),uuidInput(id),patientInput(b,true));}
}
