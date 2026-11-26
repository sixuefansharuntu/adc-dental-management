import { BadRequestException } from '@nestjs/common';
import { uuidInput,dateInput } from './domain';

export function objectInput(value: unknown, fields: string[]): Record<string,unknown> {
 if(!value||typeof value!=='object'||Array.isArray(value))throw new BadRequestException('提交内容无效。');
 const b=value as Record<string,unknown>;
 if(Object.keys(b).some(k=>!fields.includes(k)))throw new BadRequestException('提交包含不支持的字段。');
 return b;
}
export function textInput(value:unknown,name:string,max=200){
 if(typeof value!=='string'||!value.trim()||value.trim().length>max||/[\u0000-\u001f]/.test(value))throw new BadRequestException(`请填写有效的${name}。`);
 return value.trim();
}
export function instantInput(value:unknown){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)||!Number.isFinite(Date.parse(value)))throw new BadRequestException('时间格式无效。');
 dateInput(value.slice(0,10));if(Number(value.slice(11,13))>23||Number(value.slice(14,16))>59||Number(value.slice(17,19))>59)throw new BadRequestException('时间格式无效。');
 return new Date(value).toISOString();
}
export function bookingInput(value:unknown,write=false){
 const b=objectInput(value,['scheduleId','serviceVersionId','ruleVersionId','startsAt',...(write?['requestId','name','contact','intention','version']:[])]);
 return {scheduleId:uuidInput(b.scheduleId),serviceVersionId:uuidInput(b.serviceVersionId),ruleVersionId:uuidInput(b.ruleVersionId),startsAt:instantInput(b.startsAt),
 ...(write?{requestId:uuidInput(b.requestId),name:textInput(b.name,'姓名',100),contact:contactInput(b.contact),intention:textInput(b.intention,'就诊意向',500),version:b.version}: {})};
}
export function contactInput(value:unknown){const s=textInput(value,'联系电话',40);if(!/^\+?[0-9 ()-]{6,40}$/.test(s))throw new BadRequestException('联系电话格式无效。');return s;}
export function versionInput(value:unknown){if(typeof value!=='number'||!Number.isSafeInteger(value)||value<1)throw new BadRequestException('请刷新预约版本后重试。');return value;}
export interface Interval {startsAt:string|Date;endsAt:string|Date}
export function overlaps(a:Interval,b:Interval){return +new Date(a.startsAt)<+new Date(b.endsAt)&&+new Date(b.startsAt)<+new Date(a.endsAt);}
export function peakOccupancy(start:number,end:number,intervals:Interval[]){
 const events: [number,number][]=[];
 for(const i of intervals){const a=Math.max(start,+new Date(i.startsAt)),z=Math.min(end,+new Date(i.endsAt));if(a<z){events.push([a,1],[z,-1]);}}
 events.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);let n=0,max=0;for(const [,d]of events){n+=d;max=Math.max(max,n);}return max;
}
export function beforeCutoff(now:Date,cutoff:Date|string){return now.getTime()<new Date(cutoff).getTime();}
