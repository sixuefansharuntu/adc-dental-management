import{BadRequestException}from'@nestjs/common';import{uuidInput}from'./domain';
export function qualificationStatusQuery(q:Record<string,unknown>){if(Object.keys(q).some(k=>k!=='qualificationId')||!Object.hasOwn(q,'qualificationId'))throw new BadRequestException('原证书保存核实条件无效。');return{qualificationId:q.qualificationId==='new'?null:uuidInput(q.qualificationId).toLowerCase()};}
