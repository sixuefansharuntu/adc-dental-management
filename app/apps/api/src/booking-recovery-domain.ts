import{BadRequestException}from'@nestjs/common';
import{objectInput}from'./booking-domain';import{uuidInput}from'./domain';
export type BookingCommandKind='book'|'reschedule'|'cancel';
export function bookingRecoveryQuery(value:unknown){
 const b=objectInput(value,['kind','appointmentId']);
 if(!['book','reschedule','cancel'].includes(b.kind as string))throw new BadRequestException('原请求类型无效。');
 const kind=b.kind as BookingCommandKind;
 if(kind==='book'&&b.appointmentId!==undefined)throw new BadRequestException('新预约请求不应指定目标预约。');
 return {kind,appointmentId:kind==='book'?undefined:uuidInput(b.appointmentId)};
}
