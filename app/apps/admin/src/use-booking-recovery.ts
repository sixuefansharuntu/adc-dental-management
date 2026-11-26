import{ref,watch,onBeforeUnmount}from'vue';
export type BookingPending={path:string;body:Record<string,any>;label:string;subjectId:string;identityId?:string};
type Identity={subjectId:string;identityId:string};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const key=(i:Identity)=>'adc.pendingBooking:'+i.subjectId;
const scope=(i:Identity|null)=>i?i.identityId+'|'+i.subjectId:'';
export function pendingKind(p:BookingPending){return p.path.endsWith('/cancel')?'cancel':p.path.endsWith('/reschedule')?'reschedule':'book';}
export function parseBookingPending(raw:string,i:Identity):BookingPending{
 if(raw.length>12000)throw Error('原请求缓存过大');const p=JSON.parse(raw),b=p?.body;
 if(!p||Object.keys(p).some(k=>!['path','body','label','subjectId','identityId'].includes(k))||p.subjectId!==i.subjectId||(p.identityId!==undefined&&p.identityId!==i.identityId)||typeof p.path!=='string'||!/^\/patient\/appointments(?:\/[0-9a-f-]{36}\/(?:reschedule|cancel))?$/i.test(p.path)||typeof p.label!=='string'||p.label.length>150||!b||typeof b!=='object'||Array.isArray(b)||!uuid.test(b.requestId))throw Error('原请求缓存无效');
 const kind=pendingKind(p),target=p.path.split('/')[3];if(kind!=='book'&&!uuid.test(target))throw Error('原目标无效');
 const text=(v:any,max:number)=>typeof v==='string'&&!!v.trim()&&v.length<=max&&!/[\u0000-\u001f]/.test(v);
 const fields=kind==='cancel'?['requestId','version','reason']:['requestId','version','scheduleId','serviceVersionId','ruleVersionId','startsAt','name','contact','intention'];
 if(Object.keys(b).some(k=>!fields.includes(k))||(kind!=='book'&&(!Number.isSafeInteger(b.version)||b.version<1)))throw Error('原请求字段无效');
 if(kind==='cancel'){if(!text(b.reason,500))throw Error('原原因无效');}
 else if(!uuid.test(b.scheduleId)||!uuid.test(b.serviceVersionId)||!uuid.test(b.ruleVersionId)||!text(b.startsAt,40)||!Number.isFinite(Date.parse(b.startsAt))||!text(b.name,100)||!text(b.contact,40)||!text(b.intention,500))throw Error('原预约内容无效');
 return {...p,identityId:i.identityId};
}
export function useBookingRecovery(o:{identity:()=>Identity|null;storage:()=>Pick<Storage,'getItem'|'setItem'|'removeItem'>;read:(path:string,signal:AbortSignal)=>Promise<any>;write:(path:string,body:any)=>Promise<any>;completed:(r:any,label:string)=>void|Promise<void>;unauthorized:()=>void}){
 const pending=ref<BookingPending|null>(null),working=ref(false),state=ref<'unknown'|'processing'|'not_found'|'completed'|'rejected'>('unknown'),error=ref(''),blocked=ref(false),result=ref<any>(null),ownConflict=ref(false);
 let generation=0,controller:AbortController|null=null,disposed=false;
 const current=(g:number,s:string)=>!disposed&&g===generation&&s===scope(o.identity());
 function dismissFeedback(){if(!pending.value&&!working.value&&!blocked.value){error.value='';ownConflict.value=false;}}
 function reset(){generation++;controller?.abort();controller=null;pending.value=null;working.value=false;state.value='unknown';result.value=null;blocked.value=false;dismissFeedback();}
 function restore(){reset();const i=o.identity();if(!i)return;try{const raw=o.storage().getItem(key(i));if(raw)pending.value=parseBookingPending(raw,i);}catch{blocked.value=true;error.value='无法安全读取原提交缓存，已暂停新的预约办理。请先核对原提交或联系前台。';}}
 function save(p:BookingPending){try{o.storage().setItem(key(p as Identity),JSON.stringify(p));return true;}catch{error.value='此次请求尚未发出：无法保存恢复依据。请恢复本标签页存储后重试，暂勿另建预约。';return false;}}
 function clear(p:BookingPending){try{o.storage().removeItem(key(p as Identity));pending.value=null;return true;}catch{error.value='结果已核实，但本标签页缓存暂未清除。请点击“完成核对”清理，请勿重复提交。';return false;}}
 async function complete(r:any,p:BookingPending){state.value='completed';result.value=r;clear(p);try{await o.completed(r,p.label);}catch{error.value='保存结果已确认，列表刷新失败，请刷新查看；请勿重复提交。';}}
 async function execute(p:BookingPending){
  const s=scope(o.identity()),g=++generation;working.value=true;error.value='';ownConflict.value=false;
  try{const r=await o.write(p.path,p.body);if(!current(g,s))return;
   if(!uuid.test(r?.id)||!Number.isSafeInteger(r.version)||r.version<1||!['active','cancelled','arrived','no_show'].includes(r.disposition))throw Error('提交回复不完整，请核实原请求。');await complete(r,p);}
  catch(e:any){if(!current(g,s))return;
   if(typeof e?.status==='number'&&e.status>=400&&e.status<500&&![401,408,429].includes(e.status)){
    state.value='rejected';error.value=e.message||'原提交未获接受，请重新核对。';ownConflict.value=clear(p)&&e.code==='OWN_APPOINTMENT_OVERLAP';
   }else{state.value='unknown';error.value='提交结果暂不能确认。请先“核实原提交”，不要重新预约。';if(e?.status===401)o.unauthorized();}
  }finally{if(current(g,s))working.value=false;}
 }
 async function send(path:string,body:any,label:string){
  const i=o.identity();if(!i||working.value||disposed)return;
  if(pending.value||blocked.value){error.value='请先处理当前身份待核实的原提交。';return;}
  dismissFeedback();
  let p:BookingPending;try{p=parseBookingPending(JSON.stringify({path,body,label,subjectId:i.subjectId,identityId:i.identityId}),i);}catch{error.value='提交内容无效，请重新核对。';return;}
  pending.value=p;state.value='unknown';if(!save(p))return;await execute(p);
 }
 async function verify(){
  const p=pending.value,i=o.identity();if(!p||!i||working.value||blocked.value||p.subjectId!==i.subjectId||p.identityId!==i.identityId||disposed)return;
  const s=scope(i),g=++generation;controller?.abort();controller=new AbortController();working.value=true;error.value='';
  const kind=pendingKind(p),q=new URLSearchParams({kind});if(kind!=='book')q.set('appointmentId',p.path.split('/')[3]);
  try{const r=await o.read('/patient/appointment-commands/'+p.body.requestId+'?'+q,controller.signal);if(!current(g,s))return;
   if(!['completed','processing','not_found'].includes(r?.state)||r.kind!==kind)throw Error('核实结果格式无效，请稍后重新核实。');
   if(r.state==='completed'){
    if(!uuid.test(r.appointmentId)||!Number.isSafeInteger(r.version)||r.version<1||!['active','cancelled','arrived','no_show'].includes(r.disposition)||(kind!=='book'&&r.appointmentId!==p.path.split('/')[3]))throw Error('原请求结果不完整，请勿重复办理。');
    await complete({...r,id:r.appointmentId,repeated:true,originalResult:true},p);
   }else{state.value=r.state;result.value=null;}
  }catch(e:any){if(!current(g,s))return;state.value='unknown';error.value=e?.message||'暂不能核实，请稍后重试。';if(e?.status===401||e?.status===403)o.unauthorized();}
  finally{if(current(g,s))working.value=false;}
 }
 async function retry(confirmed:boolean){const p=pending.value,i=o.identity();if(!confirmed||!p||!i||working.value||blocked.value||state.value!=='not_found'||p.subjectId!==i.subjectId||p.identityId!==i.identityId)return;state.value='unknown';if(!save(p))return;await execute(p);}
 function finish(){const p=pending.value;if(p&&['completed','rejected'].includes(state.value)&&!working.value)clear(p);}
 watch(()=>scope(o.identity()),restore,{flush:'sync',immediate:true});onBeforeUnmount(()=>{disposed=true;reset();});
 return{pending,working,state,error,blocked,result,ownConflict,dismissFeedback,restore,send,verify,retry,finish};
}
