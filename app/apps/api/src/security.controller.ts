import {Controller,Inject,Get,Post,Param,Query,Req,Body} from '@nestjs/common';
import type {Request} from 'express';
import {AuthService} from './auth.service';
import {SecurityService} from './security.service';
import {securityInput} from './security-domain';
import {uuidInput} from './domain';
import {BadRequestException} from '@nestjs/common';
const kind=(v:string)=>{if(v!=='status'&&v!=='grant')throw new BadRequestException('账号办理分支无效。');return v;};
@Controller('api/v1/security')
export class SecurityController{
 constructor(@Inject(AuthService)readonly auth:AuthService,@Inject(SecurityService)readonly service:SecurityService){}
 @Get('bootstrap')async bootstrap(@Req()r:Request){return this.service.bootstrap(await this.auth.staff(r));}
 @Get()async list(@Req()r:Request,@Query('afterId')after?:string){return this.service.list(await this.auth.staff(r),after?uuidInput(after):undefined);}
 @Get(':id')async detail(@Req()r:Request,@Param('id')id:string){return this.service.detail(await this.auth.staff(r),uuidInput(id));}
 @Get(':id/history')async history(@Req()r:Request,@Param('id')id:string,@Query('beforeId')before?:string){return this.service.history(await this.auth.staff(r),uuidInput(id),before?uuidInput(before):undefined);}
 @Post(':id/:kind/preview')async preview(@Req()r:Request,@Param('id')id:string,@Param('kind')k:string,@Body()b:unknown){this.auth.origin(r);const branch=kind(k);return this.service.preview(await this.auth.staff(r),uuidInput(id),branch,securityInput(b,branch));}
 @Post(':id/:kind')async save(@Req()r:Request,@Param('id')id:string,@Param('kind')k:string,@Body()b:unknown){this.auth.origin(r);const branch=kind(k);return this.service.save(await this.auth.staff(r),uuidInput(id),branch,securityInput(b,branch,true));}
}
