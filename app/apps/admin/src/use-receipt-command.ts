import{ref,watch,onBeforeUnmount}from'vue';
type Owner={accountId:string;employeeId:string};
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function receiptCommand(value:any,owner:Owner){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('原更正记录无效，请保留并核查。');
 const target=value.path??value.id,b=value.body;
 if(typeof target!=='string'||!uuid.test(target)||!b||typeof b!=='object'||Array.isArray(b)||typeof b.requestId!=='string'||!uuid.test(b.requestId))throw Error('原更正编号或请求无效，未发送。');
 if(value.version!==undefined&&(value.version!==1||value.accountId!==owner.accountId||value.employeeId!==owner.employeeId))throw Error('原更正身份不匹配，未发送。');
 const keys=['requestId','version','receivedAt','paymentMethod','basis','reason','actualConfirmed','adjustmentIds'];
 if(Object.keys(b).some(k=>!keys.includes(k))||!Number.isSafeInteger(b.version)||b.version<1||typeof b.receivedAt!=='string'||!/^\d{4}-\d\d-\d\dT/.test(b.receivedAt)||!/(Z|[+-]\d\d:\d\d)$/.test(b.receivedAt)||!Number.isFinite(Date.parse(b.receivedAt))||!['cash','card','bank','wechat','alipay','other'].includes(b.paymentMethod)||b.actualConfirmed!==true||['basis','reason'].some(k=>typeof b[k]!=='string'||!b[k].trim()||b[k].length>1500)||b.adjustmentIds!==undefined&&(!Array.isArray(b.adjustmentIds)||b.adjustmentIds.length>2||b.adjustmentIds.some((x:any)=>typeof x!=='string'||!uuid.test(x))||new Set(b.adjustmentIds).size!==b.adjustmentIds.length))throw Error('原更正内容不完整，未发送。');
 const phase=value.phase??'pending';if(!['pending','confirmed','rejected'].includes(phase))throw Error('原更正状态无效，未发送。');
 return{version:1,accountId:owner.accountId,employeeId:owner.employeeId,path:target,body:JSON.parse(JSON.stringify(b)),phase,label:'实收核实更正已保存，原版与首次登记信息保留。',summary:'收款 '+target.slice(0,8).toUpperCase()+' · 原第'+b.version+'版'};
}
export function useReceiptCommand(o:{owner:()=>Owner|null;storage:()=>Pick<Storage,'getItem'|'setItem'|'removeItem'>;send:(path:string,body:any)=>Promise<any>;read?:(path:string)=>Promise<any>;completed:(id:string)=>Promise<void>|void}){
 const pending=ref<any>(null),busy=ref(false),error=ref(''),notice=ref(''),status=ref<any>(null);let generation=0,alive=true,blocked=false;
 const identity=()=>JSON.stringify([o.owner()?.accountId,o.owner()?.employeeId]),key=(a:Owner)=>'adc.receiptPending:'+a.accountId,current=(g:number,k:string)=>alive&&g===generation&&k===identity();
 function reset(){generation++;status.value=null;pending.value=null;busy.value=false;error.value='';notice.value='';blocked=false;}
 function restore(){reset();const a=o.owner();if(!a)return;try{const raw=o.storage().getItem(key(a));if(raw)pending.value=receiptCommand(JSON.parse(raw),a);}catch{blocked=true;error.value='无法读取或识别原提交记录。请保留本机记录并核查，未发送新办理。';}}
 watch(identity,()=>restore(),{flush:'sync'});onBeforeUnmount(()=>{alive=false;reset();});
 function cleanup(){if(busy.value||blocked||!pending.value||pending.value.phase==='pending')return false;try{o.storage().removeItem(key(o.owner()!));pending.value=null;error.value='';return true;}catch{error.value='未能清理本机提示；不会因此重新办理。';return false;}}
 async function verify(){if(!pending.value||pending.value.phase!=='pending'||busy.value||!o.read||blocked)return false;const g=++generation,k=identity();busy.value=true;status.value=null;error.value='';try{const r=await o.read('/commands/'+pending.value.body.requestId+'?'+new URLSearchParams({receiptId:pending.value.path}));if(!current(g,k))return false;if(!['completed','not_found'].includes(r.state))throw Error('未能识别核实结果，请保留原请求。');if(r.receiptId!==pending.value.path||r.state==='completed'&&(r.resultId!==pending.value.path||!Number.isSafeInteger(r.version)||r.version<2||!Number.isFinite(Date.parse(r.completedAt))))throw Error('原结果编号或版本无法核对，请保留原请求。');status.value=r;return true;}catch(e:any){if(current(g,k))error.value=e.message||'核实失败，原请求保持。';return false;}finally{if(current(g,k))busy.value=false;}}
 function acknowledge(){if(busy.value||blocked||!pending.value||status.value?.state!=='completed')return false;pending.value={...pending.value,phase:'confirmed'};try{o.storage().setItem(key(o.owner()!),JSON.stringify(pending.value));}catch{/* Cleanup still never resends in this page. */}return cleanup();}
 async function submit(path:string,body:any,retry=false){
  const a=o.owner();if(!a||busy.value)return false;if(blocked){error.value='原提交记录尚未核查，未发送新办理。';return false;}
  if(pending.value&&!retry){error.value='请先处理原提交，未发送新办理。';return false;}
  let command:any;try{command=retry?pending.value:receiptCommand({path,body},a);if(!command||command.phase!=='pending')return false;command=receiptCommand(command,a);}catch(e:any){error.value=e.message;return false;}
  const g=++generation,k=identity(),cacheKey=key(a);error.value='';notice.value='';status.value=null;
  try{o.storage().setItem(cacheKey,JSON.stringify(command));}catch{pending.value=retry?command:null;error.value='本机无法保存原提交记录，本次没有发送。请恢复存储后再试。';return false;}
  pending.value=command;busy.value=true;
  try{await o.send(command.path,command.body);if(!current(g,k))return false;
   command={...command,phase:'confirmed'};pending.value=command;
   try{o.storage().setItem(cacheKey,JSON.stringify(command));}catch{/* In memory stays confirmed: cleanup never resends. */}
   let cleared=true;try{o.storage().removeItem(cacheKey);pending.value=null;}catch{cleared=false;}
   notice.value=command.label;if(!cleared)error.value='业务已成功，只有本机提示未清理。请清理提示，不要重新办理。';
   try{await o.completed(command.path);}catch{if(current(g,k))error.value='业务已成功，重新读取详情失败，请刷新核对。';}return true;
  }catch(e:any){if(!current(g,k))return false;
   if(typeof e?.status==='number'&&e.status>=400&&e.status<500&&e.status!==401){command={...command,phase:'rejected'};pending.value=command;try{o.storage().setItem(cacheKey,JSON.stringify(command));o.storage().removeItem(cacheKey);pending.value=null;}catch{/* Clear-only state remains in memory. */}error.value=e.message||'办理被拒绝，请核对后重新填写。';}
   else{pending.value=command;error.value='结果暂不明确，已保留原请求。请保持原账号，核对后重试原提交。';}return false;
  }finally{if(current(g,k))busy.value=false;}
 }
 return{pending,busy,error,notice,status,verify,acknowledge,restore,cleanup,submit,isBlocked:()=>blocked,retry:()=>pending.value?submit(pending.value.path,pending.value.body,true):Promise.resolve(false)};
}
