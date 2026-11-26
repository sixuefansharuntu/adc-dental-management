import {ref,computed,watch,onBeforeUnmount} from 'vue';
export function useMyAppointments(options:{identity:()=>any;read:(path:string,signal:AbortSignal)=>Promise<any>;unauthorized:()=>void}){
 const items=ref<any[]>([]),fromDate=ref(''),toDate=ref(''),clinicId=ref(''),state=ref('all'),limit=ref(20),
  clinics=ref<any[]>([]),summary=ref<any>(null),total=ref(0),next=ref<string|null>(null),
  asOf=ref(''),loading=ref(false),error=ref(''),applied=ref('');
 let generation=0,controller:AbortController|null=null;
 const identityKey=()=>{const a=options.identity();return a?a.identityId+'|'+a.subjectId:'';};
 const key=()=>JSON.stringify([identityKey(),fromDate.value,toDate.value,clinicId.value,state.value,limit.value]);
 const dirty=computed(()=>!!applied.value&&applied.value!==key());
 function clearList(){items.value=[];summary.value=null;total.value=0;next.value=null;asOf.value='';applied.value='';}
 function reset(){generation++;controller?.abort();controller=null;loading.value=false;clearList();
  clinics.value=[];error.value='';fromDate.value='';toDate.value='';clinicId.value='';state.value='all';limit.value=20;}
 watch(identityKey,reset,{flush:'sync'});onBeforeUnmount(reset);
 async function load(more=false){
  if(!options.identity()){reset();return;}
  if(more&&(loading.value||dirty.value||!next.value)){if(dirty.value)error.value='筛选条件已改变，请先查询。';return;}
  const cursor=more?next.value:null,currentKey=key(),gen=++generation;controller?.abort();
  const own=new AbortController();controller=own;loading.value=true;error.value='';if(!more)clearList();
  const q=new URLSearchParams({state:state.value,limit:String(limit.value)});
  if(fromDate.value)q.set('fromDate',fromDate.value);if(toDate.value)q.set('toDate',toDate.value);
  if(clinicId.value)q.set('clinicId',clinicId.value);if(cursor)q.set('cursor',cursor);
  try{
   const result=await options.read('/patient/appointments/queue?'+q,own.signal);
   if(gen!==generation||key()!==currentKey)return;
   items.value=more?[...items.value,...result.items]:result.items;clinics.value=result.clinics;
   summary.value=result.summary;total.value=result.total;next.value=result.nextCursor;asOf.value=result.asOf;applied.value=currentKey;
  }catch(e:any){
   if(gen!==generation)return;
   if(e?.status===401||e?.status===403){reset();options.unauthorized();}
   else if(!more||e?.status===409)clearList();
   error.value=e instanceof Error?e.message:'本人预约读取失败，请重新查询。';
  }finally{if(gen===generation){loading.value=false;controller=null;}}
 }
 function clearFilters(){fromDate.value='';toDate.value='';clinicId.value='';state.value='all';return load();}
 return {items,fromDate,toDate,clinicId,state,limit,clinics,summary,total,next,asOf,loading,error,dirty,load,reset,clearFilters};
}
