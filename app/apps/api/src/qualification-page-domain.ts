import{BadRequestException,ConflictException}from'@nestjs/common';
import{appointmentPage}from'./appointment-queue-domain';
export function qualificationPageQuery(q:Record<string,unknown>){
 if(Object.keys(q).some(k=>!['limit','cursor'].includes(k)))throw new BadRequestException('证书分页包含不支持的条件。');
 return appointmentPage({...q,limit:q.limit===undefined?'20':q.limit});
}
export function qualificationPageBound(value:unknown){if(Buffer.byteLength(JSON.stringify(value))>5*1024*1024)throw new ConflictException('证书完整来源超过5MiB，请核查范围，未截断。');}
