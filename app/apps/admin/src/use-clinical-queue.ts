import{ref,computed,watch,onBeforeUnmount}from'vue';
export function useClinicalQueue(o:{account:()=>any;clinic:()=>string;date:()=>string;read:(path:string,signal:AbortSignal)=>Promise<any>;invalidated:(status:number)=>void}){
 const items=ref<any[]>([]),search=ref(''),doctorId=ref(''),doctorName=ref(''),progress=ref('all'),record=ref('all'),payment=ref('all'),limit=ref(50),doctors=ref<any[]>([]),summary=ref<any>(null),capabilities=ref<any>(null),total=ref(0),next=ref<string|null>(null),asOf=ref(''),loading=ref(false),error=ref(''),applied=ref('');
 let generation=0,controller:AbortController|null=null;
 const base=()=>JSON.stringify([o.account()?.accountId,o.account()?.employeeId,o.clinic(),o.date()]),key=()=>JSON.stringify([base(),search.value.trim(),doctorId.value,progress.value,record.value,payment.value,limit.value]);
 const dirty=computed(()=>!!applied.value&&applied.value!==key()),doctorOptions=computed(()=>doctorId.value&&!doctors.value.some(d=>d.id===doctorId.value)?[...doctors.value,{id:doctorId.value,name:doctorName.value||'已选医生'}]:doctors.value);
 watch(doctorId,id=>{doctorName.value=doctors.value.find(d=>d.id===id)?.name||'';},{flush:'sync'});
 function clearList(){items.value=[];summary.value=null;total.value=0;next.value=null;asOf.value='';applied.value='';capabilities.value=null;}
 function reset(filters=true){generation++;controller?.abort();controller=null;loading.value=false;clearList();doctors.value=[];error.value='';if(filters){search.value='';doctorId.value='';progress.value='all';record.value='all';payment.value='all';limit.value=50;}}
 watch(base,()=>{reset();o.invalidated(0);},{flush:'sync'});onBeforeUnmount(()=>reset());
 async function load(more=false){
  if(!o.account()||!o.clinic()||!o.date()){reset();return false;}
  if(more&&(loading.value||dirty.value||!next.value))return false;
  const cursor=more?next.value:null,k=key(),gen=++generation;controller?.abort();const own=new AbortController();controller=own;loading.value=true;error.value='';if(!more)clearList();
  const params=new URLSearchParams({clinicId:o.clinic(),date:o.date(),q:search.value.trim(),progress:progress.value,record:record.value,payment:payment.value,limit:String(limit.value)});if(doctorId.value)params.set('doctorId',doctorId.value);if(cursor)params.set('cursor',cursor);
  try{const r=await o.read('/visits?'+params,own.signal);if(gen!==generation||key()!==k)return false;items.value=more?[...items.value,...r.items]:r.items;summary.value=r.summary;total.value=r.total;next.value=r.nextCursor;asOf.value=r.asOf;capabilities.value=r.capabilities;doctors.value=r.doctors;applied.value=k;return true;}
  catch(e:any){if(gen!==generation)return false;if([401,403].includes(e?.status)){reset(false);o.invalidated(e.status);}else if(!more||e?.status===409){clearList();o.invalidated(e.status||0);}error.value=e instanceof Error?e.message:'读取失败，请重新查询。';return false;}
  finally{if(gen===generation){loading.value=false;controller=null;}}
 }
 function clearFilters(){search.value='';doctorId.value='';progress.value='all';record.value='all';payment.value='all';return load();}
 return{items,search,doctorId,progress,record,payment,limit,doctors:doctorOptions,summary,capabilities,total,next,asOf,loading,error,dirty,load,reset,clearFilters};
}
