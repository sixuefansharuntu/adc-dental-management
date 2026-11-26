import{BadRequestException}from'@nestjs/common';
import{qualityQueueQuery}from'./quality-page-domain';
export function qualitySourceQuery(q:Record<string,unknown>){
 if(Object.keys(q).some(k=>!['clinicId','year','quarter','kind','term','limit','cursor'].includes(k))||typeof q.kind!=='string'||!['expense','issue','record'].includes(q.kind)||q.term!==undefined&&(typeof q.term!=='string'||q.term.length>100))throw new BadRequestException('来源查选条件无效。');
 const{kind,term,...page}=q;
 return{...qualityQueueQuery(page),kind:kind as 'expense'|'issue'|'record',term:((term??'')as string).trim().toLowerCase()};
}
