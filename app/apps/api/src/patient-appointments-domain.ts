import {BadRequestException} from '@nestjs/common';
import {dateInput,uuidInput} from './domain';
import {appointmentPage} from './appointment-queue-domain';
export interface PatientAppointmentsQuery {
 fromDate:string|null;toDate:string|null;clinicId:string|null;state:string;
 limit:number;cursor:string|null;soonest?:boolean;
}
export function patientAppointmentsQuery(input:Record<string,unknown>):PatientAppointmentsQuery {
 if(Object.keys(input).some(k=>!['fromDate','toDate','clinicId','state','limit','cursor','sort'].includes(k)))
  throw new BadRequestException('包含不支持的本人预约筛选条件。');
 const hasFrom=input.fromDate!==undefined&&input.fromDate!=='',hasTo=input.toDate!==undefined&&input.toDate!=='';
 if(hasFrom!==hasTo)throw new BadRequestException('预约日期起止须成对填写。');
 const fromDate=hasFrom?dateInput(input.fromDate):null,toDate=hasTo?dateInput(input.toDate):null;
 if(fromDate&&toDate){
  if(toDate<fromDate)throw new BadRequestException('预约开始日期不能晚于结束日期。');
  if((Date.parse(toDate)-Date.parse(fromDate))/86400000>=366)throw new BadRequestException('预约日期范围最多为366天。');
 }
 const state=input.state??'all';
 if(typeof state!=='string'||!['all','active','upcoming','history','arrived','cancelled','no_show'].includes(state))
  throw new BadRequestException('本人预约状态筛选无效。');
 if(input.sort!==undefined&&(input.sort!=='soonest'||state!=='upcoming'))
  throw new BadRequestException('仅即将就诊的预约可由近到远排序。');
 return {fromDate,toDate,clinicId:input.clinicId===undefined?null:uuidInput(input.clinicId),state,
  ...appointmentPage({...input,limit:input.limit??'20'}),...(input.sort==='soonest'?{soonest:true}:{})};
}
export function patientAppointmentUpcoming(r:any,now:Date){
 return r.disposition==='active'&&!r.actualVisit&&Date.parse(r.startsAt)>+now;
}
export function patientAppointmentActions(r:any,now:Date){
 const active=r.disposition==='active'&&!r.actualVisit&&r.ruleEnabled===true;
 return {canCancel:active&&+now<Date.parse(r.cancelCutoffAt),canReschedule:active&&+now<Date.parse(r.rescheduleCutoffAt)};
}
export function patientAppointmentsSummary(rows:any[],now:Date){
 return {total:rows.length,active:rows.filter(r=>r.disposition==='active').length,
  upcoming:rows.filter(r=>patientAppointmentUpcoming(r,now)).length,
  arrived:rows.filter(r=>r.disposition==='arrived').length,
  cancelled:rows.filter(r=>r.disposition==='cancelled').length,
  noShow:rows.filter(r=>r.disposition==='no_show').length};
}
