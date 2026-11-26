import{BadRequestException,ConflictException}from'@nestjs/common';import{appointmentPage}from'./appointment-queue-domain';
export function clinicHistoryQuery(q:Record<string,unknown>){if(Object.keys(q).some(k=>!['kind','limit','cursor'].includes(k))||typeof q.kind!=='string'||!['profile','rule'].includes(q.kind))throw new BadRequestException('诊所历史条件无效。');return{kind:q.kind as 'profile'|'rule',...appointmentPage(q)};}
export function clinicHistoryBound(v:any){if(Buffer.byteLength(JSON.stringify(v))>5*1024*1024)throw new ConflictException('诊所完整历史超过5MiB，请核查范围，未截断。');}
