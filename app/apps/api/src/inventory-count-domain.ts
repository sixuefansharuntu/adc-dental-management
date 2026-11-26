import{BadRequestException,ConflictException}from'@nestjs/common';
import{uuidInput}from'./domain';
export function inventoryCountSourceQuery(q:Record<string,unknown>){
 if(Object.keys(q).some(k=>!['lineId','cursor'].includes(k))||typeof q.cursor!=='string'||!q.cursor||q.cursor.length>3000)throw new BadRequestException('盘点来源续页条件无效。');
 return{lineId:uuidInput(q.lineId).toLowerCase(),cursor:q.cursor};
}
export function inventoryCountBound(value:unknown,label='盘点预览'){
 if(Buffer.byteLength(JSON.stringify(value))>5*1024*1024)throw new ConflictException(label+'超过5MiB，未截断计算，请核查完整盘点范围。');
}
