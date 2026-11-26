import{BadRequestException,ConflictException}from'@nestjs/common';
import{uuidInput}from'./domain';import{appointmentPage}from'./appointment-queue-domain';
export function patientPageQuery(q:Record<string,unknown>,history=false){
 const allowed=history?['clinicId','limit','cursor']:['clinicId','q','limit','cursor'];
 if(Object.keys(q).some(k=>!allowed.includes(k)))throw new BadRequestException('患者分页条件无效。');
 const search=q.q??'';
 if(typeof search!=='string'||search.trim().length>100||/[\u0000-\u001f\u007f]/.test(search))throw new BadRequestException('患者线索须为100字以内单行文字。');
 return{clinicId:uuidInput(q.clinicId).toLowerCase(),search:search.trim(),...appointmentPage(q)};
}
export function patientPageBound(v:unknown){if(Buffer.byteLength(JSON.stringify(v))>5*1024*1024)throw new ConflictException('患者完整目录或历史超过5MiB，请核查范围，未截断结果。');}
