import {BadRequestException,ForbiddenException} from '@nestjs/common';
import {createHash} from 'node:crypto';
import {objectInput,textInput,versionInput} from './booking-domain';
import {uuidInput} from './domain';
export type GrantField={resource:string;field:string;action:'maintain'};
export type ManagedTarget={accountId:string;employeeId:string;clinicIds:string[];functions:string[];fields:GrantField[];grantEditable:boolean};
export type ManagementPolicy={schemaVersion:1;kind:'bounded-account-management';targets:ManagedTarget[]};
const code=(x:unknown)=>{if(typeof x!=='string'||!/^[a-z][a-z0-9_.]{0,99}$/.test(x))throw new BadRequestException('权限标识无效。');return x;};
function unique<T>(items:T[],key:(x:T)=>string){if(new Set(items.map(key)).size!==items.length)throw new BadRequestException('配置不能包含重复项。');return [...items].sort((a,b)=>key(a).localeCompare(key(b),'en'));}
export const fieldKey=(f:GrantField)=>`${f.resource}:${f.field}:${f.action}`;
function ids(v:unknown,max:number){if(!Array.isArray(v)||v.length>max)throw new BadRequestException('诊所范围数量无效。');return unique(v.map(uuidInput),x=>x);}
function functions(v:unknown){if(!Array.isArray(v)||v.length>150)throw new BadRequestException('功能范围数量无效。');return unique(v.map(code),x=>x);}
function fields(v:unknown){if(!Array.isArray(v)||v.length>200)throw new BadRequestException('字段范围数量无效。');return unique(v.map(x=>{const b=objectInput(x,['resource','field','action']);if(b.action!=='maintain')throw new BadRequestException('本批仅支持明确维护字段。');return{resource:code(b.resource),field:code(b.field),action:'maintain' as const};}),fieldKey);}
export function managementPolicy(value:unknown):ManagementPolicy{
 try{const b=objectInput(typeof value==='string'?JSON.parse(value):value,['schemaVersion','kind','targets']);if(b.schemaVersion!==1||b.kind!=='bounded-account-management'||!Array.isArray(b.targets)||!b.targets.length||b.targets.length>100)throw Error();const targets=b.targets.map(v=>{const t=objectInput(v,['accountId','employeeId','clinicIds','functions','fields','grantEditable']);if(typeof t.grantEditable!=='boolean')throw Error();return{accountId:uuidInput(t.accountId),employeeId:uuidInput(t.employeeId),clinicIds:ids(t.clinicIds,20),functions:functions(t.functions),fields:fields(t.fields),grantEditable:t.grantEditable};});return{schemaVersion:1,kind:'bounded-account-management',targets:unique(targets,x=>x.accountId)};}catch{throw new ForbiddenException('当前管理员没有可验证的管理范围；请由授权配置人员核对。');}
}
export function securityInput(value:unknown,kind:'status'|'grant',submit=false){
 const b=objectInput(value,['requestId','accountVersion','baseGrantId','reason','checked','previewToken',...(kind==='status'?['enabled']:['functions','clinicIds','fields'])]);
 const result:any={accountVersion:versionInput(b.accountVersion),baseGrantId:b.baseGrantId===null?null:uuidInput(b.baseGrantId),reason:textInput(b.reason,'办理依据',1000)};
 if(kind==='status'){if(typeof b.enabled!=='boolean')throw new BadRequestException('请明确启用或停用。');result.enabled=b.enabled;}
 else{result.functions=functions(b.functions);result.clinicIds=ids(b.clinicIds,20);result.fields=fields(b.fields);if(result.functions.length&&!result.clinicIds.length)throw new BadRequestException('配置功能时须明确诊所范围。');if(!result.functions.length&&(result.clinicIds.length||result.fields.length))throw new BadRequestException('清空功能时请同时清空诊所与字段。');}
 if(submit){result.requestId=uuidInput(b.requestId);if(typeof b.previewToken!=='string'||!/^[a-f0-9]{64}$/.test(b.previewToken))throw new BadRequestException('请先核对本次变更。');result.previewToken=b.previewToken;result.checked=b.checked===true;}
 return result;
}
export function assertDelegable(target:ManagedTarget,input:any){
 if(!target.grantEditable)throw new ForbiddenException('此账号只允许状态维护，不能配置其管理授权。');
 if(input.functions.some((f:string)=>f.startsWith('security.')||!target.functions.includes(f))||input.clinicIds.some((id:string)=>!target.clinicIds.includes(id))||input.fields.some((f:GrantField)=>!target.fields.some(x=>fieldKey(x)===fieldKey(f))))throw new ForbiddenException('超出这个账号明确批准的可授范围；不能转授其他岗位功能。');
}
export const securityHash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
export const safeAccount=(r:any)=>({id:r.account_id,employeeId:r.employee_id,loginName:r.login_name,enabled:r.activation_arrangement==='enabled'&&r.disabled_at===null,activation:r.activation_arrangement,openedAt:r.opened_at,disabledAt:r.disabled_at,version:Number(r.row_version),maintainedBy:r.maintained_by,maintainedAt:r.maintained_at});
export const functionNames:Record<string,string>={
 'patient.directory.read':'检索本店患者','patient.profile.read':'查看患者基本联系资料','patient.profile.manage':'维护患者基本联系资料','patient.health.read':'查看患者过敏与标签','patient.health.manage':'维护患者过敏与标签','dentist.qualification.read':'查看牙医证书','dentist.qualification.manage':'维护证书及私有附件','followup.assist':'执行随访协助','material.manage':'维护物资目录','lab.read':'查看义齿加工','receipt.manage':'核实实收资料','business.daily.read':'查看经营日报','business.staff.read':'查询医护工作量','business.composition.read':'查询收入构成','quarter.expense.manage':'维护运营费用','appointment.read':'查看预约','appointment.manage':'代办预约与联系','schedule.manage':'维护接诊安排','patient.identity':'核对患者身份','patient.create':'登记患者','visit.read':'查看接诊','visit.manage':'登记接诊时间','clinical.read':'查看参与诊疗','clinical.write':'确认诊疗与病历','bill.read':'查看治疗费用','bill.manage':'核对治疗费用','receipt.create':'登记实收','image.read':'查阅影像','image.manage':'维护影像','lab.manage':'维护义齿加工','followup.read':'查看随访任务','followup.manage':'登记随访与反馈','followup.plan.read':'查看随访方案','followup.plan.manage':'维护随访方案','stock.read':'查看库存','stock.manage':'维护物资资料','stock.receive':'登记入库','stock.issue':'登记领用','stock.count':'执行盘点','supplier.manage':'维护供应商','sale.read':'查看商品销售','sale.manage':'开具及交付商品','quarter.read':'查看季度','quarter.submit':'提交季度资料','quarter.expense':'维护运营费用','quarter.calculate':'计算季度贡献','quarter.review':'总部复核','quarter.result.read':'查看季度结果','quarter.result.export':'导出季度结果','quality.read':'查看资料问题','quality.manage':'检查与复查资料','business.read':'查询经营汇总','business.export':'导出经营汇总','clinic.read':'查看诊所资料','clinic.manage':'维护诊所及自助规则','dentist.read':'查看牙医资料','dentist.manage':'维护牙医与执业','security.read':'查看账号授权','security.manage':'管理已限定账号'};
