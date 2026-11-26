import{qualityPendingTarget}from'./quality-pending-status';
type Owner={accountId:string;employeeId:string};
const uuid=(v:any)=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v),hash=(v:any)=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v),copy=(v:any)=>JSON.parse(JSON.stringify(v)),roles=['前台','医生','护士','物资管理人员','财务人员','诊所管理人员'];
function object(v:any,keys:string[],optional:string[]=[]){if(!v||typeof v!=='object'||Array.isArray(v)||keys.some(k=>!Object.hasOwn(v,k))||Object.keys(v).some(k=>!keys.includes(k)&&!optional.includes(k)))throw Error('原资料检查请求字段不完整。');}
function text(v:any,max:number){if(typeof v!=='string'||!v.trim()||v.trim().length>max||/[\u0000-\u001f]/.test(v))throw Error('原资料检查文字无效。');}
export function qualityCommand(v:any,owner:Owner){
 if(!owner?.accountId||!owner.employeeId)throw Error('原请求身份无效。');
 const modern=v?.schemaVersion!==undefined;
 object(v,['path','body','label',...(modern?['schemaVersion','accountId','employeeId']:[])],['phase']);
 if(modern&&(v.schemaVersion!==1||v.accountId!==owner.accountId||v.employeeId!==owner.employeeId))throw Error('原资料检查缓存身份不匹配。');
 const t=qualityPendingTarget(v),b=v.body;text(v.label,300);
 if(t.kind==='scan'){object(b,['requestId','clinicId','year','quarter','kinds','token']);if(!Array.isArray(b.kinds)||!b.kinds.length||b.kinds.length>3||b.kinds.some((x:any)=>!['expense','issue','record'].includes(x))||new Set(b.kinds).size!==b.kinds.length||!hash(b.token))throw Error('原检查类别或预览标识无效。');}
 else if(t.kind==='manual'){object(b,['requestId','clinicId','year','quarter','kind','sourceId','sourceToken','severity','role','note']);if(!hash(b.sourceToken)||!['critical','noncritical'].includes(b.severity)||!roles.includes(b.role))throw Error('原人工来源或责任岗位无效。');text(b.note,2000);}
 else{object(b,['requestId','version','sourceToken','kind','role','note','decision','blank','actualChecked']);if(!hash(b.sourceToken)||typeof b.actualChecked!=='boolean'||(b.kind==='assign'?!roles.includes(b.role):b.role!==null)||(b.kind==='recheck'?!['unresolved','corrected','justified_blank'].includes(b.decision)||b.actualChecked!==true:b.decision!==null))throw Error('原处理或复查确认无效。');text(b.note,2000);if(b.blank!==null)text(b.blank,2000);if(b.decision==='justified_blank'&&!b.blank?.trim())throw Error('合理空项须保留原解释。');}
 const phase=v.phase??'pending';if(!['pending','confirmed','rejected'].includes(phase))throw Error('原提交阶段无效。');
 return{schemaVersion:1,accountId:owner.accountId,employeeId:owner.employeeId,path:v.path,body:copy(b),label:v.label,phase};
}
export function parseQualityCommand(raw:string,owner:Owner){if(raw.length>1000000)throw Error('原资料检查缓存过大，请保留核查。');return qualityCommand(JSON.parse(raw),owner);}
export function validQualitySaved(p:any,r:any){const t=qualityPendingTarget(p);if(!uuid(r?.id)||t.kind==='scan'&&(r.id.toLowerCase()!==t.clinicId||!Number.isSafeInteger(r.count)||!Number.isSafeInteger(r.found)||r.count<0||r.found<r.count||r.found>3000)||t.kind==='action'&&(r.id.toLowerCase()!==t.issueId||r.version!==p.body.version+1||!['open','corrected','justified_blank'].includes(r.state)))throw Error('原办理回复不完整，请保留原请求并先只读核实。');}
