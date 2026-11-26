import{BadRequestException}from'@nestjs/common';import{uuidInput}from'./domain';
export function clinicStatusQuery(q:Record<string,unknown>){if(Object.keys(q).some(k=>!['clinicId','kind'].includes(k))||typeof q.kind!=='string'||!['profile','rule'].includes(q.kind))throw new BadRequestException('原诊所提交核实条件无效。');return{clinicId:uuidInput(q.clinicId).toLowerCase(),kind:q.kind as 'profile'|'rule'};}
