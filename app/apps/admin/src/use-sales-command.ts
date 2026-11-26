import{ref,watch,onBeforeUnmount}from'vue';type Owner={accountId:string;employeeId:string};
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function salesCommand(value:any,owner:Owner){if(!value||typeof value!=='object'||Array.isArray(value)||typeof value.path!=='string'||!value.body||typeof value.body!=='object'||Array.isArray(value.body)||typeof value.body.requestId!=='string'||!uuid.test(value.body.requestId))throw Error('原销售提交记录无法完整识别，未发送。');const parts=value.path.split('/');if(value.path!==''&&(parts.length!==3||parts[0]!==''||!uuid.test(parts[1])||!['receipt','delivery'].includes(parts[2])))throw Error('原销售提交地址无效，未发送。');if(value.version!==undefined&&(value.version!==1||value.accountId!==owner.accountId||value.employeeId!==owner.employeeId))throw Error('原销售提交身份不匹配，未发送。');const phase=value.phase??'pending';if(!['pending','confirmed','rejected'].includes(phase))throw Error('原销售提交状态无效，未发送。');const kind=value.path===''?'sale':parts[2],label=kind==='sale'?'销售单已建立，尚未收款，也未扣减库存。':kind==='receipt'?'实际全额到账已登记，交付状态保持真实事实。':'实际整单交付已保存，库存按各真实来源扣减一次。';return{version:1,accountId:owner.accountId,employeeId:owner.employeeId,path:value.path,body:JSON.parse(JSON.stringify(value.body)),phase,label,summary:kind==='sale'?'商品销售开单':('销售 '+parts[1].slice(0,8).toUpperCase()+' · '+(kind==='receipt'?'实际收款':'整单交付'))};}
export function salesStatusPath(p:any){const parts=p.path.split('/');if(p.path===''){if(typeof p.body.clinicId!=='string'||!uuid.test(p.body.clinicId))throw Error('原开单诊所无效，请保留原请求。');return '/commands/'+p.body.requestId+'?'+new URLSearchParams({kind:'create',clinicId:p.body.clinicId});}return '/commands/'+p.body.requestId+'?'+new URLSearchParams({kind:parts[2],saleId:parts[1]});}
export function useSalesCommand(o:{owner:()=>Owner|null;storage:()=>Pick<Storage,'getItem'|'setItem'|'removeItem'>;send:(path:string,body:any)=>Promise<any>;read?:(path:string)=>Promise<any>;completed:(path:string,result:any)=>Promise<void>|void}){
 const pending=ref<any>(null),busy=ref(false),error=ref(''),notice=ref(''),status=ref<any>(null);let generation=0,alive=true,blocked=false;
 const identity=()=>JSON.stringify([o.owner()?.accountId,o.owner()?.employeeId]),key=(a:Owner)=>'adc.salesPending:'+a.accountId,current=(g:number,k:string)=>alive&&g===generation&&k===identity();
 function reset(){generation++;status.value=null;pending.value=null;busy.value=false;error.value='';notice.value='';blocked=false;}
 function restore(){reset();const a=o.owner();if(!a)return;try{const raw=o.storage().getItem(key(a));if(raw)pending.value=salesCommand(JSON.parse(raw),a);}catch{blocked=true;error.value='无法读取或识别原提交记录。请保留本机记录并核查，未发送新办理。';}}
 watch(identity,()=>restore(),{flush:'sync'});onBeforeUnmount(()=>{alive=false;reset();});
 function cleanup(){if(busy.value||blocked||!pending.value||pending.value.phase==='pending')return false;try{o.storage().removeItem(key(o.owner()!));pending.value=null;error.value='';return true;}catch{error.value='未能清理本机提示；不会因此重新办理。';return false;}}
 async function verify(){if(!pending.value||pending.value.phase!=='pending'||busy.value||!o.read||blocked)return false;const g=++generation,k=identity();busy.value=true;status.value=null;error.value='';try{const r=await o.read(salesStatusPath(pending.value));if(!current(g,k))return false;if(!['completed','not_found'].includes(r.state))throw Error('未能识别核实结果，请保留原请求。');const p=pending.value,parts=p.path.split('/'),kind=p.path===''?'create':parts[2];if(r.kind!==kind||(kind==='create'?r.clinicId!==p.body.clinicId:r.saleId!==parts[1])||r.state==='completed'&&(typeof r.resultId!=='string'||!uuid.test(r.resultId)||typeof r.saleId!=='string'||!uuid.test(r.saleId)||!Number.isFinite(Date.parse(r.completedAt))||typeof r.existing!=='boolean'||r.version!==undefined&&(!Number.isSafeInteger(r.version)||r.version<1)))throw Error('原销售结果无法核对，请保留原请求。');status.value=r;return true;}catch(e:any){if(current(g,k))error.value=e.message||'核实失败，原请求保持。';return false;}finally{if(current(g,k))busy.value=false;}}
 function acknowledge(){if(busy.value||blocked||!pending.value||status.value?.state!=='completed')return false;pending.value={...pending.value,phase:'confirmed'};try{o.storage().setItem(key(o.owner()!),JSON.stringify(pending.value));}catch{/* Cleanup still never resends in this page. */}return cleanup();}
 async function submit(path:string,body:any,retry=false){
  const a=o.owner();if(!a||busy.value)return false;if(blocked){error.value='原提交记录尚未核查，未发送新办理。';return false;}
  if(pending.value&&!retry){error.value='请先处理原提交，未发送新办理。';return false;}
  let command:any;try{command=retry?pending.value:salesCommand({path,body},a);if(!command||command.phase!=='pending')return false;command=salesCommand(command,a);}catch(e:any){error.value=e.message;return false;}
  const g=++generation,k=identity(),cacheKey=key(a);error.value='';notice.value='';status.value=null;
  try{o.storage().setItem(cacheKey,JSON.stringify(command));}catch{pending.value=retry?command:null;error.value='本机无法保存原提交记录，本次没有发送。请恢复存储后再试。';return false;}
  pending.value=command;busy.value=true;
  try{const result=await o.send(command.path,command.body);if(!current(g,k))return false;
   command={...command,phase:'confirmed'};pending.value=command;
   try{o.storage().setItem(cacheKey,JSON.stringify(command));}catch{/* In memory stays confirmed: cleanup never resends. */}
   let cleared=true;try{o.storage().removeItem(cacheKey);pending.value=null;}catch{cleared=false;}
   notice.value=command.label;if(!cleared)error.value='业务已成功，只有本机提示未清理。请清理提示，不要重新办理。';
   try{await o.completed(command.path,result);}catch{if(current(g,k))error.value='业务已成功，重新读取详情失败，请刷新核对。';}return true;
  }catch(e:any){if(!current(g,k))return false;
   if(typeof e?.status==='number'&&e.status>=400&&e.status<500&&e.status!==401){command={...command,phase:'rejected'};pending.value=command;try{o.storage().setItem(cacheKey,JSON.stringify(command));o.storage().removeItem(cacheKey);pending.value=null;}catch{/* Clear-only state remains in memory. */}error.value=e.message||'办理被拒绝，请核对后重新填写。';}
   else{pending.value=command;error.value='结果暂不明确，已保留原请求。请保持原账号，核对后重试原提交。';}return false;
  }finally{if(current(g,k))busy.value=false;}
 }
 return{pending,busy,error,notice,status,verify,acknowledge,restore,cleanup,submit,isBlocked:()=>blocked,retry:()=>pending.value?submit(pending.value.path,pending.value.body,true):Promise.resolve(false)};
}
