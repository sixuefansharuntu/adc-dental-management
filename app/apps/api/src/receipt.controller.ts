import{ReceiptQueueService}from'./receipt-queue.service';import{receiptQueueQuery}from'./receipt-queue-domain';
import{Controller,Inject,Get,Post,Req,Body,Param,Query,BadRequestException}from'@nestjs/common';import type{Request}from'express';import{ReceiptService}from'./receipt.service';import{AuthService}from'./auth.service';import{uuidInput,dateInput}from'./domain';import{instantInput}from'./booking-domain';import{receiptCorrection}from'./receipt-domain';
const version=(x:unknown)=>{if(x==null)return undefined;if(typeof x!=='string'||!/^\d+$/.test(x))throw new BadRequestException('历史分页版本无效。');const n=Number(x);if(!Number.isSafeInteger(n)||n<1)throw new BadRequestException('历史分页版本无效。');return n;};
@Controller('api/v1/receipts')export class ReceiptController{
 constructor(@Inject(ReceiptService)private s:ReceiptService,@Inject(AuthService)private auth:AuthService,@Inject(ReceiptQueueService)private queue:ReceiptQueueService){}
 @Get('bootstrap')async bootstrap(@Req()r:Request){return this.s.bootstrap(await this.auth.staff(r));}
 @Get('commands/:requestId')async status(@Req()r:Request,@Param('requestId')id:unknown,@Query()q:Record<string,unknown>){if(Object.keys(q).some(k=>k!=='receiptId'))throw new BadRequestException('原更正核实条件无效。');return this.s.commandStatus(await this.auth.staff(r),uuidInput(id),uuidInput(q.receiptId));}
 @Get('adjustments')async adjustments(@Req()r:Request,@Query('clinicId')c:unknown,@Query('kind')k:unknown,@Query('receivedAt')at:unknown,@Query('receiptId')id:unknown){if(k!=='bill'&&k!=='sale')throw new BadRequestException('单据类别无效。');return this.s.adjustments(await this.auth.staff(r),uuidInput(c),k,instantInput(at),id?uuidInput(id):undefined);}
 @Get()async list(@Req()r:Request,@Query()q:Record<string,unknown>){return this.queue.list(await this.auth.staff(r),receiptQueueQuery(q));}
 @Get(':id')async detail(@Req()r:Request,@Param('id')id:unknown,@Query()q:Record<string,unknown>){if(Object.keys(q).some(k=>!['beforeVersion','atVersion'].includes(k)))throw new BadRequestException('历史查询条件无效。');return this.s.detail(await this.auth.staff(r),uuidInput(id),version(q.beforeVersion),version(q.atVersion));}
 @Post(':id/correction')async correct(@Req()r:Request,@Param('id')id:unknown,@Body()b:unknown){this.auth.origin(r);return this.s.correct(await this.auth.staff(r),uuidInput(id),receiptCorrection(b));}
}
