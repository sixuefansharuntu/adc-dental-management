<script setup lang="ts">
import{ref,watch,onBeforeUnmount}from'vue';import{History,RefreshCw}from'@lucide/vue';
const props=withDefaults(defineProps<{visitId:string;canClinical:boolean;canBill?:boolean;treatments:any[]}>(),{canBill:true}),emit=defineEmits(['unauthorized']);
const expanded=ref(false),kind=ref('record'),treatment=ref(''),items=ref<any[]>([]),next=ref<number|null>(null),current=ref<number|null>(null),loading=ref(false),error=ref(''),limit=ref(50),loaded=ref(false);
let generation=0,controller:AbortController|null=null;
const time=(s:string)=>s?new Date(s).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false}):'未登记';
function clear(){generation++;controller?.abort();controller=null;items.value=[];next.value=null;current.value=null;loaded.value=false;error.value='';loading.value=false;}
watch(()=>[props.visitId,props.canClinical,props.canBill],()=>{clear();expanded.value=false;kind.value=props.canClinical?'record':props.canBill?'bill':'';treatment.value=props.treatments[0]?.id||'';},{immediate:true});
watch(()=>props.treatments.map(x=>x.id).join(','),()=>{if(!props.treatments.some(x=>x.id===treatment.value)){clear();treatment.value=props.treatments[0]?.id||'';}});
async function load(more=false){
 if(loading.value)return;if(!more)clear();if(!kind.value||(kind.value==='bill'&&!props.canBill)||(kind.value!=='bill'&&!props.canClinical)||(kind.value==='treatment'&&!treatment.value))return;
 const gen=++generation,visitId=props.visitId;controller=new AbortController();const own=controller;loading.value=true;error.value='';
 const q=new URLSearchParams({kind:kind.value,limit:String(limit.value)});if(kind.value==='treatment')q.set('treatmentId',treatment.value);if(more&&next.value)q.set('beforeVersion',String(next.value));
 const timer=setTimeout(()=>own.abort(),12000);
 try{const r=await fetch(`/api/v1/clinical/visits/${visitId}/history?${q}`,{credentials:'same-origin',signal:own.signal});const b=await r.json().catch(()=>({}));if(gen!==generation)return;
  if(!r.ok){if(r.status===401||r.status===403){clear();expanded.value=false;emit('unauthorized',r.status);}throw new Error(b.message||'读取原版失败。');}
  items.value=more?[...items.value,...b.items]:b.items;next.value=b.nextVersion;current.value=b.currentVersion;loaded.value=true;
 }catch(e){if(gen===generation){if(!more)items.value=[];error.value=e instanceof Error&&e.name!=='AbortError'?e.message:'读取超时，请重新读取原版。';}}
 finally{clearTimeout(timer);if(gen===generation){loading.value=false;controller=null;}}
}
function change(){clear();if(expanded.value)load();}
function toggle(){expanded.value=!expanded.value;if(expanded.value&&!loaded.value)load();else if(!expanded.value)clear();}
onBeforeUnmount(clear);
</script>

<template><section v-if="canClinical||canBill" class="b-card c-history">
 <div class="c-history-heading"><div><h2><History :size="19"/>原版追查</h2><p>逐版查看保存时的内容与采用依据。</p></div><button class="b-button outline small" :aria-expanded="expanded" @click="toggle">{{expanded?'收起原版':'查看原版历史'}}</button></div>
 <template v-if="expanded">
  <div class="c-history-controls"><label>记录类别<select aria-label="记录类别" v-model="kind" @change="change"><template v-if="canClinical"><option value="record">病历原版</option><option value="treatment">实际治疗原版</option></template><option v-if="canBill" value="bill">治疗账单原版</option></select></label>
   <label v-if="kind==='treatment'">实际治疗<select aria-label="实际治疗" v-model="treatment" @change="change"><option v-if="!treatments.length" value="">尚无已确认治疗</option><option v-for="t in treatments" :key="t.id" :value="t.id">{{t.name}} · {{t.id.slice(0,8).toUpperCase()}}</option></select></label>
   <label>每页版本<select aria-label="每页版本" v-model="limit" @change="change"><option :value="10">10</option><option :value="25">25</option><option :value="50">50</option></select></label><button class="b-button outline small" :disabled="loading" @click="load()"><RefreshCw :size="15"/>重新读取</button>
  </div>
  <p class="b-help" v-if="kind==='bill'">名称、单位、牙位和金额来自本版采用的快照。这里不展示后来的收款，也不将当前付款状态当作历史状态。</p>
  <p class="b-help" v-else-if="kind==='treatment'">项目标识、牙位和确认事实来自原版；辅助项目名称来自当前项目目录。</p>
  <p class="b-help">原版中的人员标识固定，辅助姓名来自当前员工目录。读取时当前根版本：{{current??'无记录'}}。</p>
  <div v-if="error" class="b-alert error" role="alert">{{error}}</div><p v-if="loading" role="status">正在读取原版…</p>
  <p v-if="loaded&&!items.length" class="b-empty">{{current?'此游标之前没有更早原版。':'本次就诊尚无这类已保存记录。'}}</p>
  <article v-for="r in items" :key="r.revisionId" class="c-history-version">
   <header><strong>版本 {{r.version}}</strong><span>保存 {{time(r.savedAt)}}</span><span>操作人 {{r.editor.name}}</span></header>
   <p class="c-history-meta">原版 {{r.revisionId.slice(0,8).toUpperCase()}} · 操作 {{r.operationId.slice(0,8).toUpperCase()}}</p><p>保存依据：{{r.reason||'本版未登记更正原因'}}</p>
   <template v-if="kind==='record'"><p>诊疗时间 {{time(r.clinicalAt)}} · <span class="b-pill">{{r.completeness==='complete'?'病历完整':'病历待补'}}</span></p><p>原版记录人：{{r.writers.map((x:any)=>x.name).join('、')||'本版未登记'}}</p><div v-if="r.body" class="c-history-body">{{r.body}}</div><p v-else class="b-help">本版未保存病历正文。</p><div v-if="r.pendingNote" class="c-history-body">待补说明：{{r.pendingNote}}</div></template>
   <template v-if="kind==='treatment'"><p><strong>{{r.currentItemName||'未取得当前目录名称'}}</strong> <small>当前目录名</small></p><p class="c-history-key">原项目标识 {{r.itemId}}</p><p>原版牙位：{{r.teeth.join('、')||'无特定牙位'}}</p><p>实际实施 {{time(r.performedAt)}}</p><p>确认医生 {{r.confirmingDoctor.name||r.confirmingDoctor.id}} · 确认 {{time(r.confirmedAt)}}</p></template>
   <template v-if="kind==='bill'"><p>原开单 {{time(r.openedAt)}} · 原版相关人员：{{r.staff.map((x:any)=>x.name).join('、')||'本版未登记'}}</p><div class="b-table-scroll"><table><thead><tr><th>采用项目 / 牙位</th><th>数量 / 单位</th><th>采用单价</th><th>小计</th></tr></thead><tbody><tr v-for="l in r.lines" :key="l.id"><td>{{l.name}}<small>牙位 {{l.teeth.join('、')||'无特定牙位'}} · 治疗版本 {{l.treatmentVersion}}</small><details><summary>采用依据标识</summary><p class="c-history-key">治疗原版 {{l.treatmentRevisionId}}</p><p class="c-history-key">价格版本 {{l.priceVersionId}}</p></details></td><td>{{l.quantity}} {{l.unit}}</td><td>¥{{l.unitPrice}}</td><td>¥{{l.subtotal}}</td></tr></tbody></table></div><p class="c-history-total">本版合计 <strong>¥{{r.total}}</strong></p><details><summary>采用就诊原版</summary><p class="c-history-key">{{r.visitRevisionId}}</p></details></template>
  </article>
  <button v-if="next" class="b-button outline" :disabled="loading" @click="load(true)">读取更早版本</button>
 </template>
</section></template>

<style scoped>
.c-history{padding:24px;min-width:0}.c-history-heading,.c-history-heading h2{display:flex;align-items:center;gap:10px}.c-history-heading{justify-content:space-between;gap:16px}.c-history h2{font-size:18px;margin:0}.c-history-heading p{font-size:14px;color:#61756f;margin:7px 0}.c-history-controls{display:flex;gap:14px;align-items:end;flex-wrap:wrap;margin:20px 0 12px}.c-history-controls label{display:grid;gap:7px;min-width:130px;font-size:14px}.c-history-controls select{padding:9px 12px;border:1px solid #cedbd5;border-radius:8px;background:white;max-width:100%}.c-history-version{border:1px solid #dce7e1;border-radius:10px;padding:20px;margin:18px 0;min-width:0;font-size:15px;line-height:1.7;overflow-wrap:anywhere}.c-history-version header{display:flex;align-items:center;gap:14px;flex-wrap:wrap}.c-history-version header strong{color:#176b52}.c-history-version p{margin:9px 0}.c-history-meta,.c-history-key,.c-history-version small{font-size:13px;color:#62736d}.c-history-body{white-space:pre-wrap;padding:12px;background:#f5f8f6;border-radius:8px;margin:10px 0}.c-history-total{text-align:right;font-size:17px}.c-history-version table{font-size:14px}.c-history-version td small{display:block}.c-history-version details{font-size:13px;margin-top:5px}.c-history-version summary{cursor:pointer;color:#176b52}.c-history .b-help{font-size:14px;line-height:1.7}.c-history .b-table-scroll{max-width:100%}@media(max-width:760px){.c-history{padding:16px}.c-history-heading{align-items:flex-start;flex-wrap:wrap}.c-history-version{padding:14px}.c-history-controls label{min-width:0;flex:1 1 135px}.c-history-controls label:nth-child(2){max-width:100%}.c-history-controls select{min-width:0;width:100%}.c-history-version table{min-width:560px}}
</style>
