import{BadRequestException,ConflictException}from'@nestjs/common';import{uuidInput,dateInput}from'./domain';
export function followupSourceQuery(q:Record<string,unknown>){
 if(Object.keys(q).some(k=>!['clinicId','date','q','limit','cursor'].includes(k)))throw new BadRequestException('治疗来源查询条件无效。');
 const search=q.q??'';if(typeof search!=='string'||search.trim().length>100||/[\u0000-\u001f\u007f]/.test(search))throw new BadRequestException('查找线索须为100字以内单行文字。');
 let limit=20;if(q.limit!==undefined){if(typeof q.limit!=='string'||!/^\d+$/.test(q.limit)||Number(q.limit)<1||Number(q.limit)>50)throw new BadRequestException('每页须为1至50项。');limit=Number(q.limit);}
 const cursor=q.cursor??null;if(cursor!==null&&(typeof cursor!=='string'||!cursor||cursor.length>3000))throw new BadRequestException('来源续页标识无效。');
 return{clinicId:uuidInput(q.clinicId).toLowerCase(),date:dateInput(q.date),search:search.trim(),limit,cursor:cursor as string|null};
}
export function followupSourceBound(v:unknown){if(Buffer.byteLength(JSON.stringify(v))>5*1024*1024)throw new ConflictException('来源结果超过5MiB，请减少每页数量，未截断。');}
