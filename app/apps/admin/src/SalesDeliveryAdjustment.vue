<script setup lang="ts">
import{ref,watch}from'vue';
const props=defineProps<{saleId:string;deliveredAt:string;modelValue:string[];disabled?:boolean}>(),emit=defineEmits(['update:modelValue']);
const items=ref<any[]|null>(null),busy=ref(false),error=ref('');
watch(()=>[props.saleId,props.deliveredAt],()=>{items.value=null;error.value='';emit('update:modelValue',[]);});
async function inspect(){
 busy.value=true;error.value='';items.value=null;emit('update:modelValue',[]);const key=props.saleId+'|'+props.deliveredAt;
 try{if(!props.deliveredAt)throw Error('请先填写实际整单交付时间。');const r=await fetch('/api/v1/sales/'+props.saleId+'/delivery-options?'+new URLSearchParams({deliveredAt:props.deliveredAt}),{credentials:'same-origin'}),b=await r.json();if(!r.ok)throw Error(b.message||'未取得交付季度要求。');if(key!==props.saleId+'|'+props.deliveredAt)return;items.value=b.items;}
 catch(e){if(key===props.saleId+'|'+props.deliveredAt)error.value=e instanceof Error?e.message:'交付核对失败。';}finally{busy.value=false;}
}
function choose(id:string,checked:boolean){emit('update:modelValue',checked?[...props.modelValue.filter(x=>x!==id),id]:props.modelValue.filter(x=>x!==id));}
</script>
<template><div class="sd-adjustment"><button type="button" class="b-button outline small" :disabled="disabled||busy" @click="inspect">{{busy?'正在核对…':'核对实际交付季度要求'}}</button><p v-if="error" role="alert">{{error}}</p><p v-if="items?.length===0">实际交付所属季度尚未确认，无需选择总部调整轮次。</p><article v-for="q in items||[]" :key="q.quarterId"><strong>{{q.label}}</strong><template v-if="q.canWrite"><p>总部当前事项：{{q.reason}}</p><label class="b-checkbox"><input type="checkbox" :disabled="disabled" :checked="modelValue.includes(q.adjustmentId)" @change="choose(q.adjustmentId,($event.target as HTMLInputElement).checked)"/><span>已核实真实整单交付和库存来源，明确采用本季度当前调整轮次。</span></label></template><p v-else>{{q.status==='pending_review'?'已有待复核调整版，须先由总部退回，再办理交付晚录。':'该季度已有确认结果，须先由总部记录针对最新确认结果的调整事项。'}}</p></article><p class="b-help">实际时间改变后重新核对。交付与实收分开，不因交付再计算收入或材料领用。</p></div></template>
<style scoped>.sd-adjustment{margin:16px 0;padding:16px;border:1px solid #dce7da;border-radius:10px;background:#f5f8f0}.sd-adjustment p{font-size:13px;line-height:1.7;overflow-wrap:anywhere}.sd-adjustment article{padding-top:12px;margin-top:12px;border-top:1px solid #dce7da}</style>
