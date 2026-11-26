import{qualitySourceQuery}from'./quality-source-domain';
import{qualityQueueQuery,qualityHistoryQuery}from'./quality-page-domain';
import{qualityStatusQuery}from'./quality-status-domain';
import {Controller,Inject,Get,Post,Req,Body,Param,Query,BadRequestException} from '@nestjs/common';
import type {Request} from 'express';
import {QualityService} from './quality.service';
import {AuthService} from './auth.service';
import {uuidInput} from './domain';
import {objectInput,textInput,versionInput} from './booking-domain';
const kind=(v:unknown)=>{if(!['expense','issue','record'].includes(String(v)))throw new BadRequestException('请选择本批支持的来源类别。');return v as 'expense'|'issue'|'record';};
const role=(v:unknown)=>{if(!['前台','医生','护士','物资管理人员','财务人员','诊所管理人员'].includes(String(v)))throw new BadRequestException('责任岗位无效。');return String(v);};
function scan(v:unknown,save=false){const b=objectInput(v,['clinicId','year','quarter','kinds',...(save?['requestId','token']:[])]);if(!Array.isArray(b.kinds)||!b.kinds.length||b.kinds.length>3)throw new BadRequestException('须选择检查类别。');const kinds=b.kinds.map(kind).sort();if(new Set(kinds).size!==kinds.length)throw new BadRequestException('类别不能重复。');return{clinicId:uuidInput(b.clinicId),year:b.year,quarter:b.quarter,kinds,...(save?{requestId:uuidInput(b.requestId),token:textInput(b.token,'检查预览标识',128)}:{})};}
@Controller('api/v1/quality') export class QualityController {
 constructor(@Inject(QualityService)private s:QualityService,@Inject(AuthService)private auth:AuthService){}
 private actor(r:Request,w=false){if(w)this.auth.origin(r);return this.auth.staff(r);}
 @Get('commands/:requestId')async commandStatus(@Req()r:Request,@Param('requestId')id:unknown,@Query()q:Record<string,unknown>){return this.s.commandStatus(await this.actor(r),uuidInput(id).toLowerCase(),qualityStatusQuery(q));}
 @Get('queue')async queuePage(@Req()r:Request,@Query()q:Record<string,unknown>){return this.s.queuePage(await this.actor(r),qualityQueueQuery(q));}
 @Get('source-choices')async sourceChoices(@Req()r:Request,@Query()q:Record<string,unknown>){return this.s.sourceChoices(await this.actor(r),qualitySourceQuery(q));}
 @Get(':id/view')async view(@Req()r:Request,@Param('id')id:unknown){return this.s.view(await this.actor(r),uuidInput(id).toLowerCase());}
 @Get(':id/history-page')async historyPage(@Req()r:Request,@Param('id')id:unknown,@Query()q:Record<string,unknown>){return this.s.historyPage(await this.actor(r),uuidInput(id).toLowerCase(),qualityHistoryQuery(q));}
 @Get('bootstrap')async bootstrap(@Req()r:Request){return this.s.bootstrap(await this.actor(r));}
 @Post('preview')async preview(@Req()r:Request,@Body()b:unknown){return this.s.preview(await this.actor(r,true),scan(b));}
 @Post('scan')async saveScan(@Req()r:Request,@Body()b:unknown){return this.s.saveScan(await this.actor(r,true),scan(b,true));}
 @Get('source')async source(@Req()r:Request,@Query('clinicId')c:unknown,@Query('kind')k:unknown,@Query('id')i:unknown){return this.s.inspect(await this.actor(r),uuidInput(c),kind(k),uuidInput(i));}
 @Get()async list(@Req()r:Request,@Query('clinicId')c:unknown,@Query('year')y:string,@Query('quarter')q:string,@Query('after')after?:unknown){return this.s.list(await this.actor(r),uuidInput(c),Number(y),Number(q),after?uuidInput(after):null);}
 @Post('manual')async manual(@Req()r:Request,@Body()v:unknown){const b=objectInput(v,['requestId','clinicId','year','quarter','kind','sourceId','sourceToken','severity','role','note']);if(!['critical','noncritical'].includes(String(b.severity)))throw new BadRequestException('关键程度无效。');return this.s.manual(await this.actor(r,true),{requestId:uuidInput(b.requestId),clinicId:uuidInput(b.clinicId),year:b.year,quarter:b.quarter,kind:kind(b.kind),sourceId:uuidInput(b.sourceId),sourceToken:textInput(b.sourceToken,'来源基准',128),severity:b.severity,role:role(b.role),note:textInput(b.note,'人工核查事项',2000)});}
 @Get(':id')async detail(@Req()r:Request,@Param('id')id:unknown){return this.s.detail(await this.actor(r),uuidInput(id));}
 @Post(':id/actions')async handle(@Req()r:Request,@Param('id')id:unknown,@Body()v:unknown){const b=objectInput(v,['requestId','version','sourceToken','kind','role','note','decision','blank','actualChecked']);if(!['assign','notify','handle','recheck'].includes(String(b.kind)))throw new BadRequestException('处理动作无效。');if(b.kind==='recheck'&&!['corrected','justified_blank','unresolved'].includes(String(b.decision)))throw new BadRequestException('复查结论无效。');return this.s.handle(await this.actor(r,true),uuidInput(id),{requestId:uuidInput(b.requestId),version:versionInput(b.version),sourceToken:textInput(b.sourceToken,'来源基准',128),kind:b.kind,role:b.kind==='assign'?role(b.role):null,note:textInput(b.note,'本次实际经过或复查依据',2000),decision:b.kind==='recheck'?b.decision:null,blank:b.blank?textInput(b.blank,'合理空项解释',2000):null,actualChecked:b.actualChecked===true});}
}
