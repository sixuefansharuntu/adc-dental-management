import{BadRequestException,ConflictException}from'@nestjs/common';import{uuidInput}from'./domain';
export interface LabHistoryQuery{eventType:string;requirementId:string|null;limit:number;cursor:string|null;}
export function labHistoryQuery(input:Record<string,unknown>):LabHistoryQuery{
 if(Object.keys(input).some(k=>!['eventType','requirementId','limit','cursor'].includes(k)))throw new BadRequestException('包含不支持的加工历史条件。');
 const eventType=input.eventType??'all';if(typeof eventType!=='string'||!['all','requirement','sent','received','progress','review','problem','treatment_change'].includes(eventType))throw new BadRequestException('加工办理类别无效。');
 const requirementId=input.requirementId===undefined?null:uuidInput(input.requirementId);let limit=25;
 if(input.limit!==undefined){if(typeof input.limit!=='string'||!/^\d+$/.test(input.limit)||Number(input.limit)<1||Number(input.limit)>50)throw new BadRequestException('每页须为1至50项。');limit=Number(input.limit);}
 const cursor=input.cursor===undefined?null:input.cursor;if(cursor!==null&&(typeof cursor!=='string'||!cursor||cursor.length>3000))throw new BadRequestException('加工历史翻页标识无效。');return{eventType,requirementId,limit,cursor:cursor as string|null};
}
const stateKeys=['progress_pending_note','current_received_handover_id','current_review_id','has_open_usability_issue','current_expected_return_at'];
function state(x:any){if(!x||stateKeys.some(k=>!Object.hasOwn(x,k)))throw new ConflictException('加工原始状态未完整留存，不能用当前状态补造。');return Object.fromEntries(stateKeys.map(k=>[k,x[k]]));}
export function labHistoryEvent(r:any){
 const a=r.after_content,b=r.before_content,q=r.requirement,type=r.action_code.slice(4),version=type==='treatment_change'?Number(b?.row_version):Number(a?.result?.version);
 if(!a||!q||!Number.isSafeInteger(version)||version<1||!q.requirement_id||!q.requirement_text)throw new ConflictException('加工操作或采用要求依据不完整，请核查原始记录。');
 const common={id:r.operation_id,type,orderVersion:version,savedAt:r.occurred_at,editor:{id:r.actor_id,name:r.actor_name},reason:r.reason||null,requirement:{id:q.requirement_id,version:Number(q.version_no),text:q.requirement_text,expectedReturnAt:q.expected_return_at,recordedAt:q.recorded_at,doctor:{id:q.doctor_id,name:r.requirement_doctor_name},adoptedTreatmentVersion:q.adoptedTreatmentVersion?Number(q.adoptedTreatmentVersion):null}};
 if(type==='requirement'){if(q.operation_id!==r.operation_id)throw new ConflictException('要求操作与原版要求不符。');return{...common,before:b?state(b):null,after:null,phase:null};}
 if(type==='treatment_change')return{...common,orderVersion:null,beforeOrderVersion:version,before:state(b),after:null,phase:null};
 const before=state(b),after=state(a),p=r.phase;
 if(['sent','received','review'].includes(type)){
  if(!p||p.operation_id!==r.operation_id||p.requirement_id!==q.requirement_id)throw new ConflictException('阶段与采用要求不一致，请核查原始依据。');
  if(type==='review')return{...common,before,after,phase:{id:p.review_id,occurredAt:p.reviewed_at,performerId:p.doctor_id,content:p.conclusion,isUsable:p.is_usable,receivedId:p.received_handover_id}};
  if(p.direction!==type)throw new ConflictException('交接方向与原操作不符。');return{...common,before,after,phase:{id:p.handover_id,occurredAt:p.occurred_at,performerId:p.employee_id,content:p.handover_content,matchesRequirement:p.matches_requirement}};
 }
 if(!['progress','problem'].includes(type))throw new ConflictException('不是加工办理历史。');return{...common,before,after,phase:null};
}
