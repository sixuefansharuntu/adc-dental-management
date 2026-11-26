import{ConflictException}from'@nestjs/common';
export function followupStatus(reached:boolean,openIssues:number,plannedAt:string|Date,now=new Date()){return{contactState:reached?'reached':'not_reached',professionalState:openIssues>0?'pending':'no_open_issue',openIssues,due:!reached&&+new Date(plannedAt)<=+now};}
export function followupTime(value:string,performedAt:Date,now?:Date){const t=new Date(value);if(!Number.isFinite(+t)||t<performedAt||(now&&t>now))throw new ConflictException(now?'真实联系/处理时刻不得早于来源或填写未来。':'计划不得早于治疗依据，请核对医生要求。');return t;}
