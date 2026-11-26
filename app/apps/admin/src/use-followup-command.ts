import{ref,watch,onBeforeUnmount}from'vue';
type Owner={accountId:string;employeeId:string};
const uuid='[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}',id=new RegExp('^'+uuid+'$','i'),toggle=new RegExp('^/plans/('+uuid+')/enabled$','i'),contact=new RegExp('^/tasks/('+uuid+')/contacts$','i'),issue=new RegExp('^/tasks/('+uuid+')/issues/('+uuid+')$','i');
export function followupCommand(value:any,owner:Owner){
 if(!value||typeof value!=='object'||Array.isArray(value)||!value.body||typeof value.body!=='object'||Array.isArray(value.body)||typeof value.body.requestId!=='string'||!id.test(value.body.requestId)||typeof value.path!=='string')throw Error('原提交记录无法完整识别，请保留记录核查，未重新发送。');
 const b=value.body,t=value.path.match(toggle),c=value.path.match(contact),i=value.path.match(issue);let label='',summary='';
 if(value.path==='/plans'){if(typeof b.clinicId!=='string'||!id.test(b.clinicId))throw Error('原方案诊所无效。');label='方案新版本已保存，既有任务不被改写。';summary='随访方案诊所 '+b.clinicId.slice(0,8).toUpperCase();}
 else if(value.path==='/tasks'){if(typeof b.treatmentId!=='string'||!id.test(b.treatmentId)||b.taskId!=null&&(typeof b.taskId!=='string'||!id.test(b.taskId)))throw Error('原随访治疗或任务无效。');label='随访安排已保存，尚不代表联系已完成。';summary='随访安排治疗 '+b.treatmentId.slice(0,8).toUpperCase();}
 else if(t){label='方案启停决定已保存，既有任务和历史保留。';summary='随访方案 '+t[1].slice(0,8).toUpperCase();}
 else if(c){label='实际联系已追加，联系结果与专业问题分别留存。';summary='实际联系任务 '+c[1].slice(0,8).toUpperCase();}
 else if(i){label='专业问题跟进已保存，医生结论与核实登记人员分别留存。';summary='专业问题 '+i[2].slice(0,8).toUpperCase();}
 else throw Error('原提交地址不属于随访办理，未重新发送。');
 if(value.version!==undefined&&(value.version!==1||value.accountId!==owner.accountId||value.employeeId!==owner.employeeId))throw Error('原提交身份不匹配，未重新发送。');
 const phase=value.phase??'pending';if(!['pending','confirmed','rejected'].includes(phase))throw Error('原提交状态无效。');
 return{version:1,accountId:owner.accountId,employeeId:owner.employeeId,path:value.path,body:JSON.parse(JSON.stringify(b)),label,summary,phase};
}
export function followupStatusPath(p:any){const b=p.body,t=p.path.match(toggle),c=p.path.match(contact),i=p.path.match(issue);let q:any;if(p.path==='/plans')q={kind:'plan',clinicId:b.clinicId,targetId:b.itemId,...(b.planId?{planId:b.planId}:{})};else if(p.path==='/tasks')q={kind:'task',targetId:b.treatmentId,...(b.taskId?{taskId:b.taskId}:{})};else if(t)q={kind:'toggle',targetId:t[1]};else if(c)q={kind:'contact',targetId:c[1]};else if(i)q={kind:'issue',targetId:i[1],issueId:i[2]};else throw Error('原核实地址无效。');for(const[k,v]of Object.entries(q))if(k!=='kind'&&(typeof v!=='string'||!id.test(v)))throw Error('原核实目标无效。');for(const key of Object.keys(q))if(key!=='kind')q[key]=q[key].toLowerCase();return '/commands/'+b.requestId+'?'+new URLSearchParams(q);}
export function useFollowupCommand(o:{owner:()=>Owner|null;storage:()=>Pick<Storage,'getItem'|'setItem'|'removeItem'>;send:(path:string,body:any)=>Promise<any>;read?:(path:string)=>Promise<any>;completed:(path:string,result:any)=>Promise<void>|void}){
 const pending=ref<any>(null),busy=ref(false),error=ref(''),notice=ref(''),status=ref<any>(null);let generation=0,alive=true,blocked=false;
 const identity=()=>JSON.stringify([o.owner()?.accountId,o.owner()?.employeeId]),key=(a:Owner)=>'adc.followupPending:'+a.accountId,current=(g:number,k:string)=>alive&&g===generation&&k===identity();
 function reset(){generation++;status.value=null;pending.value=null;busy.value=false;error.value='';notice.value='';blocked=false;}
 function restore(){reset();const a=o.owner();if(!a)return;try{const raw=o.storage().getItem(key(a));if(raw)pending.value=followupCommand(JSON.parse(raw),a);}catch{blocked=true;error.value='无法读取或识别原提交记录。请保留本机记录并核查，未发送新办理。';}}
 watch(identity,()=>restore(),{flush:'sync'});onBeforeUnmount(()=>{alive=false;reset();});
 function cleanup(){if(busy.value||blocked||!pending.value||pending.value.phase==='pending')return false;try{o.storage().removeItem(key(o.owner()!));pending.value=null;error.value='';return true;}catch{error.value='未能清理本机提示；不会因此重新办理。';return false;}}
 async function verify(){if(!pending.value||pending.value.phase!=='pending'||busy.value||!o.read||blocked)return false;const g=++generation,k=identity();busy.value=true;status.value=null;error.value='';try{const path=followupStatusPath(pending.value),r=await o.read(path);if(!current(g,k))return false;if(!['completed','not_found'].includes(r.state))throw Error('未能识别核实结果，请保留原请求。');const expected=new URLSearchParams(path.split('?')[1]);for(const key of['kind','targetId','clinicId','planId','taskId','issueId'])if((r[key]??null)!==expected.get(key))throw Error('原核实结果目标不匹配。');if(r.state==='completed'&&(typeof r.resultId!=='string'||!id.test(r.resultId)||!Number.isSafeInteger(r.version)||r.version<1||!Number.isFinite(Date.parse(r.completedAt))))throw Error('原成功结果不完整，请保留原请求。');status.value=r;return true;}catch(e:any){if(current(g,k))error.value=e.message||'核实失败，原请求保留。';return false;}finally{if(current(g,k))busy.value=false;}}
 function acknowledge(){if(busy.value||blocked||!pending.value||status.value?.state!=='completed')return false;pending.value={...pending.value,phase:'confirmed'};try{o.storage().setItem(key(o.owner()!),JSON.stringify(pending.value));}catch{/* 清理失败也不重办 */}notice.value='原请求已核实完成，不需要重新提交。';return cleanup();}
 async function submit(path:string,body:any,retry=false){
  const a=o.owner();if(!a||busy.value||retry&&o.read&&status.value?.state!=='not_found')return false;if(blocked){error.value='原提交记录尚未核查，未发送新办理。';return false;}
  if(pending.value&&!retry){error.value='请先处理原提交，未发送新办理。';return false;}
  let command:any;try{command=retry?pending.value:followupCommand({path,body},a);if(!command||command.phase!=='pending')return false;command=followupCommand(command,a);}catch(e:any){error.value=e.message;return false;}
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
