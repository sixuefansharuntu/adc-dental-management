import{Controller,Inject,Get,Post,Body,Req,Param,Query}from'@nestjs/common';import type{Request}from'express';import{BusinessService}from'./business.service';import{AuthService}from'./auth.service';import{businessInput}from'./business-domain';import{uuidInput}from'./domain';import{objectInput,textInput}from'./booking-domain';
@Controller('api/v1/business')export class BusinessController{
 constructor(@Inject(BusinessService)private s:BusinessService,@Inject(AuthService)private auth:AuthService){}
 private actor(r:Request,w=false){if(w)this.auth.origin(r);return this.auth.staff(r);}
 @Get('bootstrap')async bootstrap(@Req()r:Request){return this.s.bootstrap(await this.actor(r));}
 @Get('history')async history(@Req()r:Request,@Query('beforeId')id:unknown){return this.s.history(await this.actor(r),id===undefined?undefined:uuidInput(id));}
 @Post('reports')async query(@Req()r:Request,@Body()b:unknown){return this.s.query(await this.actor(r,true),businessInput(b));}
 @Get('reports/:id')async read(@Req()r:Request,@Param('id')id:unknown){return this.s.read(await this.actor(r),uuidInput(id));}
 @Post('reports/:id/export')async export(@Req()r:Request,@Param('id')id:unknown,@Body()v:unknown){const b=objectInput(v,['viewToken']);return this.s.export(await this.actor(r,true),uuidInput(id),textInput(b.viewToken,'查询原版标识',128));}
}
