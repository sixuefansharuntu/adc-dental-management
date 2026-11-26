import{ref,watch,onBeforeUnmount}from'vue';
export function useFollowupSources(o:{context:()=>string;clinic:()=>string;date:()=>string;read:(path:string,signal:AbortSignal)=>Promise<any>;cleared:()=>void;loaded:(workers:any[])=>void;invalidated:(status:number)=>void}){
 const search=ref(''),items=ref<any[]>([]),total=ref(0),next=ref<string|null>(null),asOf=ref(''),sourceFingerprint=ref(''),loading=ref(false),loaded=ref(false),error=ref('');let generation=0,alive=true,controller:AbortController|null=null;
 const key=()=>JSON.stringify([o.context(),o.clinic(),o.date()]);
 function clear(){generation++;controller?.abort();controller=null;loading.value=false;loaded.value=false;items.value=[];total.value=0;next.value=null;asOf.value='';sourceFingerprint.value='';error.value='';o.cleared();}
 watch(key,()=>{if(search.value)search.value='';else clear();},{flush:'sync'});watch(search,clear,{flush:'sync'});onBeforeUnmount(()=>{alive=false;generation++;controller?.abort();});
 async function load(more=false){if(!alive||!o.clinic()||!o.date()||more&&(loading.value||!next.value))return false;const word=search.value.trim();if(word.length>100||/[\u0000-\u001f\u007f]/.test(word)){clear();error.value='请输入100字以内单行线索。';return false;}
 const cursor=more?next.value:null,originalFingerprint=sourceFingerprint.value,originalAsOf=asOf.value;if(!more)clear();const g=++generation,k=key(),own=new AbortController();controller?.abort();controller=own;loading.value=true;error.value='';const q=new URLSearchParams({clinicId:o.clinic(),date:o.date(),q:word,limit:'20'});if(cursor)q.set('cursor',cursor);
 try{const r=await o.read('/source-choices?'+q,own.signal);if(!alive||g!==generation||key()!==k||search.value.trim()!==word)return false;if(r.clinicId!==o.clinic()||r.date!==o.date()||more&&(r.sourceFingerprint!==originalFingerprint||r.asOf!==originalAsOf))throw Object.assign(Error('原治疗来源已变化，请重新查找。'),{status:409});items.value=more?[...items.value,...r.items]:r.items;total.value=r.total;next.value=r.next;asOf.value=r.asOf;sourceFingerprint.value=r.sourceFingerprint;loaded.value=true;o.loaded(r.workers);return true;
 }catch(e:any){if(!alive||g!==generation||key()!==k)return false;if(!more||[401,403,409].includes(e?.status))clear();if([401,403,409].includes(e?.status))o.invalidated(e.status);error.value=e.message||'治疗来源读取失败，可重试原页。';return false;}finally{if(g===generation){loading.value=false;controller=null;}}
 }
 return{search,items,total,next,asOf,sourceFingerprint,loading,loaded,error,load,clear};
}
