import{BadRequestException}from'@nestjs/common';import{uuidInput}from'./domain';
export function followupStatusQuery(q:Record<string,unknown>){
 if(typeof q.kind!=='string'||!['plan','toggle','task','contact','issue'].includes(q.kind))throw new BadRequestException('随访核实类型无效。');
 const allowed=q.kind==='plan'?['kind','clinicId','targetId','planId']:q.kind==='task'?['kind','targetId','taskId']:q.kind==='issue'?['kind','targetId','issueId']:['kind','targetId'];
 if(Object.keys(q).some(k=>!allowed.includes(k)))throw new BadRequestException('随访核实条件无效。');
 const result:any={kind:q.kind,targetId:uuidInput(q.targetId).toLowerCase()};
 if(q.kind==='plan')result.clinicId=uuidInput(q.clinicId).toLowerCase();
 for(const key of['planId','taskId','issueId'])if(q[key]!==undefined||key==='issueId'&&q.kind==='issue')result[key]=uuidInput(q[key]).toLowerCase();
 return result as {kind:string;targetId:string;clinicId?:string;planId?:string;taskId?:string;issueId?:string};
}
