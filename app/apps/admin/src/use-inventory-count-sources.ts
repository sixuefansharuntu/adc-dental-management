import{ref,watch,onBeforeUnmount,type Ref}from'vue';
export function useInventoryCountSources(o:{preview:Ref<any>;context:()=>string;read:(path:string,signal:AbortSignal)=>Promise<any>;invalidated:(status:number)=>void}){
 const loading=ref(false),error=ref('');let generation=0,alive=true,controller:AbortController|null=null;
 const key=()=>JSON.stringify([o.context(),o.preview.value?.countId,o.preview.value?.signature]);
 function reset(){generation++;controller?.abort();controller=null;loading.value=false;error.value='';}
 watch(key,reset,{flush:'sync'});onBeforeUnmount(()=>{alive=false;reset();});
 async function load(lineId:string){
 const anchor=o.preview.value,line=anchor?.lines.find((l:any)=>l.id===lineId),cursor=line?.sourceNext;if(!alive||loading.value||!cursor)return false;
 const k=key(),g=++generation,own=new AbortController();controller?.abort();controller=own;loading.value=true;error.value='';
 try{const r=await o.read('/counts/'+anchor.countId+'/sources?'+new URLSearchParams({lineId,cursor}),own.signal);
 if(!alive||g!==generation||key()!==k||o.preview.value!==anchor)return false;
 if(r.countId!==anchor.countId||r.lineId!==lineId||r.signature!==anchor.signature||r.asOf!==anchor.asOf||r.total!==line.sourceTotal)throw Object.assign(Error('盘点来源已变化，请关闭后重新预览差异。'),{status:409});
 o.preview.value={...anchor,lines:anchor.lines.map((l:any)=>l.id===lineId?{...l,sources:[...l.sources,...r.items],sourceNext:r.next}:l)};return true;
 }catch(e:any){if(!alive||g!==generation||key()!==k||o.preview.value!==anchor)return false;
 if([401,403,409].includes(e?.status)){o.preview.value=null;o.invalidated(e.status);}error.value=e.message||'读取来源失败，可重试原页。';return false;
 }finally{if(g===generation){loading.value=false;controller=null;}}
 }
 return{loading,error,load,reset};
}
