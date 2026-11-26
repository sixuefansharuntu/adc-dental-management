import{BadRequestException}from'@nestjs/common';import{dateInput,uuidInput}from'./domain';import{appointmentPage}from'./appointment-queue-domain';import{visitQueueState}from'./visit-queue-domain';
export function clinicalQueueQuery(q:Record<string,unknown>){
 if(Object.keys(q).some(k=>!['clinicId','date','q','doctorId','progress','record','payment','limit','cursor'].includes(k)))throw new BadRequestException('包含不支持的诊疗筛选条件。');
 const search=q.q??'';if(typeof search!=='string'||search.trim().length>100||/[\u0000-\u001f\u007f]/.test(search))throw new BadRequestException('患者姓名须为100字以内的单行文字。');
 const pick=(value:unknown,allowed:string[],label:string)=>{const s=value??'all';if(typeof s!=='string'||!allowed.includes(s))throw new BadRequestException(label+'筛选无效。');return s;};
 return{clinicId:uuidInput(q.clinicId),date:dateInput(q.date),search:search.trim(),doctorId:q.doctorId===undefined?null:uuidInput(q.doctorId),
  progress:pick(q.progress,['all','waiting','in_progress','ended','left'],'接诊进展'),record:pick(q.record,['all','not_recorded','pending','complete'],'病历完整性'),payment:pick(q.payment,['all','not_billed','unpaid','paid'],'账单状态'),...appointmentPage(q)};
}
export type ClinicalQueueQuery=ReturnType<typeof clinicalQueueQuery>;
export function clinicalQueueMatches(r:any,q:Pick<ClinicalQueueQuery,'progress'|'record'|'payment'>){return(q.progress==='all'||visitQueueState(r)===q.progress)&&(q.record==='all'||r.recordState===q.record)&&(q.payment==='all'||r.paymentState===q.payment);}
export function clinicalQueueSummary(rows:any[]){const result={total:rows.length,progress:{waiting:0,in_progress:0,ended:0,left:0},record:{available:0,not_recorded:0,pending:0,complete:0},payment:{available:0,not_billed:0,unpaid:0,paid:0}};
 for(const r of rows){result.progress[visitQueueState(r)as keyof typeof result.progress]++;if(r.recordState!==null){result.record.available++;result.record[r.recordState as 'not_recorded'|'pending'|'complete']++;}if(r.paymentState!==null){result.payment.available++;result.payment[r.paymentState as 'not_billed'|'unpaid'|'paid']++;}}return result;
}
