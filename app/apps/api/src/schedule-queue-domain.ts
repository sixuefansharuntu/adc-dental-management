import {BadRequestException} from '@nestjs/common';
import {dateInput,uuidInput} from './domain';
import {appointmentPage} from './appointment-queue-domain';

export interface ScheduleQueueQuery {
 date:string;clinicId:string;doctorId:string|null;internal:string;publicState:string;
 limit:number;cursor:string|null;
}
export function scheduleQueueQuery(input:Record<string,unknown>):ScheduleQueueQuery {
 if(Object.keys(input).some(k=>!['date','clinicId','doctorId','internal','publicState','limit','cursor'].includes(k)))
  throw new BadRequestException('包含不支持的排班筛选条件。');
 const internal=input.internal??'all',publicState=input.publicState??'all';
 if(typeof internal!=='string'||!['all','available','unavailable'].includes(internal))
  throw new BadRequestException('内部接诊筛选无效。');
 if(typeof publicState!=='string'||!['all','open','paused','not_open'].includes(publicState))
  throw new BadRequestException('对外开放筛选无效。');
 return {date:dateInput(input.date),clinicId:uuidInput(input.clinicId),
  doctorId:input.doctorId===undefined?null:uuidInput(input.doctorId),internal,publicState,...appointmentPage(input)};
}
export function scheduleDayRange(date:string) {
 const start=new Date(dateInput(date)+'T00:00:00+08:00');
 return {start:start.toISOString(),end:new Date(+start+86400000).toISOString()};
}
export function scheduleMatches(r:any,q:Pick<ScheduleQueueQuery,'internal'|'publicState'>) {
 return (q.internal==='all'||r.can_receive===(q.internal==='available'))&&
  (q.publicState==='all'||r.public_status===q.publicState);
}
export function scheduleSummary(rows:any[]) {
 return {total:rows.length,available:rows.filter(r=>r.can_receive).length,
  unavailable:rows.filter(r=>!r.can_receive).length,
  open:rows.filter(r=>r.public_status==='open').length,
  paused:rows.filter(r=>r.public_status==='paused').length,
  notOpen:rows.filter(r=>r.public_status==='not_open').length};
}
