import { BadRequestException,ConflictException } from '@nestjs/common';
import { objectInput,textInput,instantInput,versionInput } from './booking-domain';
import { uuidInput,dateInput } from './domain';

export function contactDue(starts:Date|string,now:Date,state:string,hasVisit=false){return state==='active'&&!hasVisit&&+now-+new Date(starts)>5*60_000;}
export function actualTime(value:unknown,now:Date){const s=instantInput(value);if(Date.parse(s)>+now)throw new ConflictException('实际发生时间不能晚于当前时间。');return s;}
export function assertTimeOrder(a:{arrived_at:Date|string;started_at?:Date|string|null;ended_at?:Date|string|null;left_at?:Date|string|null}){
 const at=+new Date(a.arrived_at),s=a.started_at?+new Date(a.started_at):null,e=a.ended_at?+new Date(a.ended_at):null,l=a.left_at?+new Date(a.left_at):null;
 if((s!==null&&s<at)||(e!==null&&(s===null||e<s))||(l!==null&&(l<at||(s!==null&&l<s)||(e!==null&&l<e))))throw new ConflictException('实际时间顺序不一致；结束须先有真实开始，离开不能早于已有事实。');
}
export function staffIdInput(b:Record<string,unknown>){return {requestId:uuidInput(b.requestId),version:versionInput(b.version)};}
export function nursesInput(value:unknown){if(!Array.isArray(value)||value.length<1||value.length>20)throw new BadRequestException('请选择至少一名配合护士。');const ids=value.map(uuidInput);if(new Set(ids).size!==ids.length)throw new BadRequestException('配合护士不能重复。');return ids;}
export function assignmentValid(value:string|null,clinic:string,role:string,date:string){
 try{const a=JSON.parse(value||'null');return Array.isArray(a?.assignments)&&a.assignments.some((x:any)=>x.clinicId===clinic&&x.role===role&&x.from<=date&&(!x.to||x.to>=date));}catch{return false;}
}
export function patientCreateInput(value:unknown){const b=objectInput(value,['requestId','clinicId','name','phone','birthDate','sourceNote','identityBasis']);return {requestId:uuidInput(b.requestId),clinicId:uuidInput(b.clinicId),name:textInput(b.name,'患者姓名',100),phone:textInput(b.phone,'联系电话',40),birthDate:b.birthDate?dateInput(b.birthDate):null,sourceNote:b.sourceNote?textInput(b.sourceNote,'患者来源',500):null,identityBasis:textInput(b.identityBasis,'身份核实依据',500)};}
