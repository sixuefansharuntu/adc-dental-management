import{receiptPendingTarget,sameClinicalReceiptPending}from'./clinical-receipt-status';
const uuid=(v:any)=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
function object(v:any,required:string[],optional:string[]=[]){if(!v||typeof v!=='object'||Array.isArray(v)||required.some(k=>!Object.hasOwn(v,k))||Object.keys(v).some(k=>!required.includes(k)&&!optional.includes(k)))throw Error('原收款请求字段不完整。');}
function text(v:any,max:number){if(typeof v!=='string'||!v.trim()||v.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v))throw Error('原收款文字无效。');}
export function receiptCommand(v:any,owner:any){
 const modern=v?.schemaVersion!==undefined;
 object(v,['path','body','label',...(modern?['schemaVersion','accountId','employeeId']:[])],['phase','known']);
 if(!owner?.accountId||!owner.employeeId||modern&&(v.schemaVersion!==1||v.accountId!==owner.accountId||v.employeeId!==owner.employeeId))throw Error('原收款缓存身份不匹配。');
 receiptPendingTarget(v);text(v.label,300);const b=v.body;
 object(b,['requestId','billVersion','amount','paymentMethod','receivedAt','actualReceived','basis','adjustmentIds']);
 if(typeof b.amount!=='string'||!/^(0|[1-9][0-9]{0,15})(\.[0-9]{1,2})?$/.test(b.amount))throw Error('原收款金额须为两位以内精度的非负十进制文本。');
 if(!['cash','card','wechat','alipay','other'].includes(b.paymentMethod)||typeof b.paymentMethod!=='string'||b.actualReceived!==true)throw Error('原收款方式或到账确认无效。');
 if(typeof b.receivedAt!=='string'||!/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(b.receivedAt)||!Number.isFinite(Date.parse(b.receivedAt)))throw Error('原收款到账时刻无效。');
 text(b.basis,1000);
 if(!Array.isArray(b.adjustmentIds)||b.adjustmentIds.length>2||b.adjustmentIds.some((id:any)=>!uuid(id))||new Set(b.adjustmentIds.map((id:string)=>id.toLowerCase())).size!==b.adjustmentIds.length)throw Error('原收款调整轮次无效或重复。');
 const phase=v.phase??(v.known===true?'confirmed':'pending');
 if(!['pending','confirmed','rejected'].includes(phase)||v.known!==undefined&&(typeof v.known!=='boolean'||v.known!==(phase!=='pending')))throw Error('原收款缓存阶段无效。');
 const result={schemaVersion:1,accountId:owner.accountId,employeeId:owner.employeeId,path:v.path,body:JSON.parse(JSON.stringify(b)),label:v.label,phase,known:phase!=='pending'};
 if(JSON.stringify(result).length>1000000)throw Error('原收款缓存过大。');return result;
}
function parse(raw:string,owner:any){if(raw.length>1000000)throw Error('原收款缓存过大。');return receiptCommand(JSON.parse(raw),owner);}
export function keepReceiptCache(storage:Storage,key:string,p:any,owner:any){const v=receiptCommand(p,owner),raw=storage.getItem(key);if(raw&&!sameClinicalReceiptPending(parse(raw,owner),v))throw Error('原缓存已是另一笔请求。');if(storage.getItem(key)!==raw)throw Error('原缓存已变化。');storage.setItem(key,JSON.stringify(v));return v;}
export function clearReceiptCache(storage:Storage,key:string,p:any,owner:any){const v=receiptCommand(p,owner),raw=storage.getItem(key);if(raw&&!sameClinicalReceiptPending(parse(raw,owner),v))throw Error('原缓存已是另一笔请求。');if(storage.getItem(key)!==raw)throw Error('原缓存已变化。');storage.removeItem(key);}
