import{BadRequestException,ConflictException}from'@nestjs/common';import{randomBytes,createHmac,timingSafeEqual}from'node:crypto';
import{dateInput,uuidInput}from'./domain';
export type FollowupQueueState='all'|'due'|'issues'|'unreached'|'reached';
export interface FollowupQueueQuery{state:FollowupQueueState;search:string;fromDate:string|null;toDate:string|null;responsible:string;limit:number;cursor:string|null;}
export function followupQueueQuery(input:Record<string,unknown>):FollowupQueueQuery{
 if(Object.keys(input).some(k=>!['clinicId','state','q','fromDate','toDate','responsible','limit','cursor'].includes(k)))throw new BadRequestException('包含不支持的随访筛选条件。');
 const state=input.state===undefined?'all':input.state;if(!['all','due','issues','unreached','reached'].includes(state as string)||typeof state!=='string')throw new BadRequestException('随访状态筛选无效。');
 const search=input.q===undefined?'':input.q;if(typeof search!=='string'||search.trim().length>100||/[\u0000-\u001f\u007f]/.test(search))throw new BadRequestException('检索姓名或项目须为100字以内的单行文字。');
 const hasFrom=input.fromDate!==undefined&&input.fromDate!=='',hasTo=input.toDate!==undefined&&input.toDate!=='';if(hasFrom!==hasTo)throw new BadRequestException('计划日期起止须成对填写。');
 const fromDate=hasFrom?dateInput(input.fromDate):null,toDate=hasTo?dateInput(input.toDate):null;
 if(fromDate&&toDate&&(toDate<fromDate||(Date.parse(toDate)-Date.parse(fromDate))/86400000>=366))throw new BadRequestException('计划日期范围须为1至366天。');
 const responsible=input.responsible===undefined?'all':input.responsible;if(typeof responsible!=='string')throw new BadRequestException('责任范围无效。');if(!['all','mine'].includes(responsible))uuidInput(responsible);
 let limit=50;if(input.limit!==undefined){if(typeof input.limit!=='string'||!/^\d+$/.test(input.limit)||Number(input.limit)<1||Number(input.limit)>50)throw new BadRequestException('每页须为1至50条。');limit=Number(input.limit);}
 const cursor=input.cursor===undefined?null:input.cursor;if(cursor!==null&&(typeof cursor!=='string'||!cursor||cursor.length>3000))throw new BadRequestException('翻页标识无效。');
 return{state:state as FollowupQueueState,search:search.trim(),fromDate,toDate,responsible,limit,cursor:cursor as string|null};
}
export class FollowupQueueCursor{
 private readonly secret=randomBytes(32);
 encode(value:unknown){const body=Buffer.from(JSON.stringify(value)).toString('base64url');return body+'.'+createHmac('sha256',this.secret).update(body).digest('base64url');}
 decode(token:string){try{const parts=token.split('.');if(parts.length!==2)throw Error();const body=parts[0]!,mac=Buffer.from(parts[1]!,'base64url'),expected=createHmac('sha256',this.secret).update(body).digest();if(mac.toString('base64url')!==parts[1]||mac.length!==expected.length||!timingSafeEqual(mac,expected))throw Error();const value=JSON.parse(Buffer.from(body,'base64url').toString('utf8'));if(!value||typeof value!=='object'||typeof value.asOf!=='string'||typeof value.expires!=='number'||Date.now()>value.expires||value.expires>Date.now()+16*60000||!Number.isFinite(Date.parse(value.asOf)))throw Error();return value;}catch{throw new ConflictException('翻页标识已过期或失效，请重新查询。');}}
}
