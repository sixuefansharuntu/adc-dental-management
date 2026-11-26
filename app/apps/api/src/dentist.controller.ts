import{dentistHistoryQuery}from'./dentist-history-domain';
import{dentistDirectoryQuery}from'./dentist-directory-domain';
import{dentistStatusQuery}from'./dentist-status-domain';
import{Controller,Get,Post,Req,Query,Param,Body,Inject,BadRequestException}from'@nestjs/common';import type{Request}from'express';import{DentistService}from'./dentist.service';import{AuthService}from'./auth.service';import{uuidInput}from'./domain';import{versionInput}from'./booking-domain';import{dentistInput,dentistBranches,type DentistBranch}from'./dentist-domain';
@Controller('api/v1/dentists')export class DentistController{constructor(@Inject(DentistService)readonly s:DentistService,@Inject(AuthService)readonly auth:AuthService){}private async actor(r:Request,write=false){if(write)this.auth.origin(r);return this.auth.staff(r);}private branch(v:string){if(!(dentistBranches as readonly string[]).includes(v))throw new BadRequestException('牙医维护分支无效。');return v as DentistBranch;}
 @Get('directory')async directory(@Req()r:Request,@Query()q:Record<string,unknown>){return this.s.directory(await this.actor(r),dentistDirectoryQuery(q));}
 @Get('bootstrap')async bootstrap(@Req()r:Request){return this.s.bootstrap(await this.actor(r));}
 @Get()async list(@Req()r:Request,@Query('clinicId')c:unknown,@Query('afterId')v:unknown){return this.s.list(await this.actor(r),uuidInput(c),v===undefined?undefined:uuidInput(v));}
 @Get('commands/:requestId')async commandStatus(@Req()r:Request,@Param('requestId')id:unknown,@Query()q:Record<string,unknown>){return this.s.commandStatus(await this.actor(r),uuidInput(id).toLowerCase(),dentistStatusQuery(q));}
 @Get(':id')async detail(@Req()r:Request,@Param('id')id:unknown){return this.s.detail(await this.actor(r),uuidInput(id));}
 @Get(':id/history-page')async historyPage(@Req()r:Request,@Param('id')id:unknown,@Query()q:Record<string,unknown>){return this.s.historyPage(await this.actor(r),uuidInput(id).toLowerCase(),dentistHistoryQuery(q));}
 @Get(':id/history')async history(@Req()r:Request,@Param('id')id:unknown,@Query('kind')kind:unknown,@Query('clinicId')clinic:unknown,@Query('beforeVersion')v:unknown){if(kind!=='profile'&&kind!=='practice')throw new BadRequestException('历史类型无效。');return this.s.history(await this.actor(r),uuidInput(id),kind,clinic?uuidInput(clinic):undefined,v===undefined?undefined:versionInput(Number(v)));}
 @Post(':id/:branch/preview')async preview(@Req()r:Request,@Param('id')id:unknown,@Param('branch')b:string,@Body()v:unknown){const branch=this.branch(b);return this.s.preview(await this.actor(r,true),uuidInput(id),branch,dentistInput(v,branch));}
 @Post(':id/:branch')async save(@Req()r:Request,@Param('id')id:unknown,@Param('branch')b:string,@Body()v:unknown){const branch=this.branch(b);return this.s.save(await this.actor(r,true),uuidInput(id),branch,dentistInput(v,branch,true));}
}
