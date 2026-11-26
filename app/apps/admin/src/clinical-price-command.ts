import{pricePendingTarget,samePricePending}from'./clinical-price-status';
function object(v:any,required:string[],optional:string[]=[]){if(!v||typeof v!=='object'||Array.isArray(v)||required.some(k=>!Object.hasOwn(v,k))||Object.keys(v).some(k=>!required.includes(k)&&!optional.includes(k)))throw Error('原调价请求字段不完整。');}
function text(v:any,max:number){if(typeof v!=='string'||!v.trim()||v.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v))throw Error('原调价文字无效。');}
export function priceCommand(v:any,owner:any){
 const modern=v?.schemaVersion!==undefined;
 object(v,['path','body','label',...(modern?['schemaVersion','accountId','employeeId']:[])],['phase','known']);
 if(!owner?.accountId||!owner.employeeId||modern&&(v.schemaVersion!==1||v.accountId!==owner.accountId||v.employeeId!==owner.employeeId))throw Error('原调价缓存身份不匹配。');
 pricePendingTarget(v);text(v.label,300);const b=v.body;
 object(b,['requestId','clinicId','itemId','amount','effectiveFrom','reason']);
 if(typeof b.amount!=='string'||!/^(0|[1-9][0-9]{0,13})(\.[0-9]{1,4})?$/.test(b.amount))throw Error('原参考价须为四位以内精度的非负十进制文本。');
 if(typeof b.effectiveFrom!=='string'||!/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(b.effectiveFrom)||!Number.isFinite(Date.parse(b.effectiveFrom)))throw Error('原价格生效时刻无效。');
 text(b.reason,1000);
 const phase=v.phase??(v.known===true?'confirmed':'pending');
 if(!['pending','confirmed','rejected'].includes(phase)||v.known!==undefined&&(typeof v.known!=='boolean'||v.known!==(phase!=='pending')))throw Error('原调价缓存阶段无效。');
 const result={schemaVersion:1,accountId:owner.accountId,employeeId:owner.employeeId,path:v.path,body:JSON.parse(JSON.stringify(b)),label:v.label,phase,known:phase!=='pending'};
 if(JSON.stringify(result).length>1000000)throw Error('原调价缓存过大。');return result;
}
function parse(raw:string,owner:any){if(raw.length>1000000)throw Error('原调价缓存过大。');return priceCommand(JSON.parse(raw),owner);}
export function keepPriceCache(storage:Storage,key:string,p:any,owner:any){const v=priceCommand(p,owner),raw=storage.getItem(key);if(raw&&!samePricePending(parse(raw,owner),v))throw Error('原缓存已是另一笔请求。');if(storage.getItem(key)!==raw)throw Error('原缓存已变化。');storage.setItem(key,JSON.stringify(v));return v;}
export function clearPriceCache(storage:Storage,key:string,p:any,owner:any){const v=priceCommand(p,owner),raw=storage.getItem(key);if(raw&&!samePricePending(parse(raw,owner),v))throw Error('原缓存已是另一笔请求。');if(storage.getItem(key)!==raw)throw Error('原缓存已变化。');storage.removeItem(key);}
