import{BadRequestException,ConflictException}from'@nestjs/common';import{uuidInput}from'./domain';
export type FollowupJournalKind='contacts'|'issues'|'events';
export interface FollowupJournalQuery{kind:FollowupJournalKind;eventType:'all'|'arrangement'|'contact'|'issue';issueId:string|null;limit:number;cursor:string|null;}
export function followupJournalQuery(input:Record<string,unknown>):FollowupJournalQuery{
 if(Object.keys(input).some(k=>!['kind','eventType','issueId','limit','cursor'].includes(k)))throw new BadRequestException('不支持的随访历史查询条件。');
 const kind=input.kind??'events',eventType=input.eventType??'all';if(typeof kind!=='string'||!['contacts','issues','events'].includes(kind))throw new BadRequestException('历史目录类别无效。');if(typeof eventType!=='string'||!['all','arrangement','contact','issue'].includes(eventType))throw new BadRequestException('办理类别无效。');
 if(kind!=='events'&&(input.eventType!==undefined||input.issueId!==undefined))throw new BadRequestException('联系和问题目录不接受办理经过筛选。');
 const issueId=input.issueId===undefined?null:uuidInput(input.issueId);if(issueId&&eventType!=='issue')throw new BadRequestException('单项问题追查须选择问题处理类别。');
 let limit=50;if(input.limit!==undefined){if(typeof input.limit!=='string'||!/^\d+$/.test(input.limit)||Number(input.limit)<1||Number(input.limit)>50)throw new BadRequestException('每页须为1至50项。');limit=Number(input.limit);}
 const cursor=input.cursor??null;if(cursor!==null&&(typeof cursor!=='string'||!cursor||cursor.length>3000))throw new BadRequestException('历史分页标识无效。');return{kind:kind as FollowupJournalKind,eventType:eventType as FollowupJournalQuery['eventType'],issueId,limit,cursor:cursor as string|null};
}
const arrangementKeys=['treatment_id','plan_version_id','node_id','doctor_instruction','instruction_doctor_id','planned_at','planned_content','responsible_id','next_action','row_version'];
const issueKeys=['followup_issue_id','followup_id','problem','doctor_id','progress_conclusion','resolved_at','source_contact_id','clinical_record_id','clinical_basis','recorded_by','recorded_at'];
function pick(value:any,keys:string[]){return Object.fromEntries(keys.map(k=>[k,value?.[k]??null]));}
export function journalEvent(row:any){
 const a=row.after_content,b=row.before_content,result=a?.result;if(!a||!result)throw new ConflictException('该操作缺少可核实的历史内容，请核实来源，不能用当前记录补造旧经过。');
 const common={id:row.operation_id,savedAt:row.occurred_at,editor:{id:row.actor_id,name:row.actor_name},reason:row.reason||null,taskVersion:result.version??null};
 if(row.action_code==='followup.task.save'){if(!a.treatment_id||!a.planned_at)throw new ConflictException('安排原始内容不完整。');return{...common,type:'arrangement',before:b?pick(b,arrangementKeys):null,after:{...pick(a,arrangementKeys),adoptedTreatmentVersion:a.treatmentVersion??null}};}
 if(row.action_code==='followup.contact'){const x=a.contact;if(!x||typeof x.reached!=='boolean'||!x.contactedAt||!Array.isArray(x.problems))throw new ConflictException('联系原始内容不完整。');return{...common,type:'contact',contactId:result.contactId||null,beforeNextAction:b?.next_action??null,contact:{contactedAt:x.contactedAt,channel:x.channel,reached:x.reached,feedback:x.feedback,nextAction:x.nextAction??null,problems:x.problems.map((p:any)=>({problem:p.problem,doctorId:p.doctorId??null}))}};}
 if(row.action_code==='followup.issue'){if(!a.followup_issue_id||!b?.followup_issue_id)throw new ConflictException('问题处理原始内容不完整。');return{...common,type:'issue',issueId:a.followup_issue_id,before:pick(b,issueKeys),after:pick(a,issueKeys)};}
 throw new ConflictException('不是可供阅的随访办理记录。');
}
