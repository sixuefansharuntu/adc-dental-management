import {BadRequestException} from '@nestjs/common';
import {dateInput, uuidInput} from './domain';
import {appointmentPage} from './appointment-queue-domain';

export interface VisitQueueQuery {
 date:string; clinicId:string; search:string; doctorId:string|null;
 state:string; limit:number; cursor:string|null; visitId?:string;
}
export function visitQueueQuery(input:Record<string,unknown>):VisitQueueQuery {
 if(Object.keys(input).some(k=>!['date','clinicId','q','doctorId','state','limit','cursor','visitId'].includes(k)))
  throw new BadRequestException('包含不支持的接诊筛选条件。');
 const search=input.q??'',state=input.state??'all';
 if(typeof search!=='string'||search.trim().length>100||/[\u0000-\u001f\u007f]/.test(search))
  throw new BadRequestException('患者姓名线索须为100字以内的单行文字。');
 if(typeof state!=='string'||!['all','waiting','in_progress','ended','left'].includes(state))
  throw new BadRequestException('接诊进展筛选无效。');
 return {date:dateInput(input.date),clinicId:uuidInput(input.clinicId),search:search.trim(),
  doctorId:input.doctorId===undefined?null:uuidInput(input.doctorId),state,...appointmentPage(input),
  ...(input.visitId===undefined?{}:{visitId:uuidInput(input.visitId)})};
}
// 离开不推定已治疗；仅对已登记的事实作互斥分类。
export function visitQueueState(r:any):string {
 return r.leftAt?'left':r.endedAt?'ended':r.startedAt?'in_progress':'waiting';
}
export function visitQueueSummary(rows:any[]) {
 const result={total:rows.length,waiting:0,inProgress:0,ended:0,left:0};
 for(const r of rows) {
  const state=visitQueueState(r);
  if(state==='in_progress')result.inProgress++;
  else if(state==='waiting')result.waiting++;
  else if(state==='ended')result.ended++;
  else result.left++;
 }
 return result;
}
