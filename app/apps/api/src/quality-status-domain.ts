import{BadRequestException}from'@nestjs/common';import{uuidInput}from'./domain';import{quarterWindow}from'./quarter-domain';
export type QualityStatusTarget={kind:'scan';clinicId:string;year:number;quarter:number}|{kind:'manual';clinicId:string;year:number;quarter:number;sourceKind:'expense'|'issue'|'record';sourceId:string}|{kind:'action';issueId:string;actionKind:'assign'|'notify'|'handle'|'recheck'};
export function qualityStatusQuery(q:Record<string,unknown>):QualityStatusTarget{
 const fail=()=>{throw new BadRequestException('原资料检查提交目标无效。');};
 if(typeof q.kind!=='string'||!['scan','manual','action'].includes(q.kind))return fail();
 const allowed=q.kind==='action'?['kind','issueId','actionKind']:['kind','clinicId','year','quarter',...(q.kind==='manual'?['sourceKind','sourceId']:[])];if(Object.keys(q).some(k=>!allowed.includes(k)))return fail();
 if(q.kind==='action'){if(typeof q.actionKind!=='string'||!['assign','notify','handle','recheck'].includes(q.actionKind))return fail();return{kind:'action',issueId:uuidInput(q.issueId).toLowerCase(),actionKind:q.actionKind as any};}
 if(typeof q.year!=='string'||!/^\d{4}$/.test(q.year)||typeof q.quarter!=='string'||!/^[1-4]$/.test(q.quarter))return fail();const period=quarterWindow(Number(q.year),Number(q.quarter)),base={clinicId:uuidInput(q.clinicId).toLowerCase(),year:period.year,quarter:period.quarter};
 if(q.kind==='scan')return{kind:'scan',...base};if(typeof q.sourceKind!=='string'||!['expense','issue','record'].includes(q.sourceKind))return fail();return{kind:'manual',...base,sourceKind:q.sourceKind as any,sourceId:uuidInput(q.sourceId).toLowerCase()};
}
