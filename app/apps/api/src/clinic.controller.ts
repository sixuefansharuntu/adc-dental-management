import{clinicHistoryQuery}from'./clinic-history-domain';
import{clinicStatusQuery}from'./clinic-status-domain';
import{Controller,Get,Post,Req,Query,Param,Body,Inject,BadRequestException}from'@nestjs/common';import type{Request}from'express';import{ClinicService}from'./clinic.service';import{AuthService}from'./auth.service';import{uuidInput}from'./domain';import{versionInput}from'./booking-domain';import{clinicInput,clinicRuleInput}from'./clinic-domain';
@Controller('api/v1/clinics')export class ClinicController{constructor(@Inject(ClinicService)readonly s:ClinicService,@Inject(AuthService)readonly auth:AuthService){}private async actor(r:Request,write=false){if(write)this.auth.origin(r);return this.auth.staff(r);}
 @Get('bootstrap')async bootstrap(@Req()r:Request){return this.s.bootstrap(await this.actor(r));}
 @Get('commands/:requestId')async commandStatus(@Req()r:Request,@Param('requestId')id:unknown,@Query()q:Record<string,unknown>){return this.s.commandStatus(await this.actor(r),uuidInput(id).toLowerCase(),clinicStatusQuery(q));}
 @Get(':id')async detail(@Req()r:Request,@Param('id')id:unknown){return this.s.detail(await this.actor(r),uuidInput(id));}
 @Get(':id/history-page')async historyPage(@Req()r:Request,@Param('id')id:unknown,@Query()q:Record<string,unknown>){return this.s.historyPage(await this.actor(r),uuidInput(id),clinicHistoryQuery(q));}
 @Get(':id/history')async history(@Req()r:Request,@Param('id')id:unknown,@Query('kind')kind:unknown,@Query('beforeVersion')v:unknown){if(kind!=='profile'&&kind!=='rule')throw new BadRequestException('历史类型无效。');return this.s.history(await this.actor(r),uuidInput(id),kind,v===undefined?undefined:versionInput(Number(v)));}
 @Post(':id/profile')async save(@Req()r:Request,@Param('id')id:unknown,@Body()v:unknown){return this.s.save(await this.actor(r,true),uuidInput(id),clinicInput(v));}
 @Post(':id/rules')async rule(@Req()r:Request,@Param('id')id:unknown,@Body()v:unknown){return this.s.saveRule(await this.actor(r,true),uuidInput(id),clinicRuleInput(v));}
}
