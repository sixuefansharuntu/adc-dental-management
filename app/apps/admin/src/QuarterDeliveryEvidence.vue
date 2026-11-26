<script setup lang="ts">
const props=defineProps<{items:any[];clinics?:any[]}>();
const short=(s:string)=>s.slice(0,8).toUpperCase(),time=(s:string)=>new Date(s).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false});
const clinicName=(s:string)=>props.clinics?.find(c=>c.clinicId===s)?.name||(s?short(s):'原诊所'),quantity=(s:string)=>s.replace(/(\.\d*?)0+$/,'$1').replace(/\.$/,'');
</script>
<template><details v-if="items.length" class="q-delivery-evidence"><summary>交付核对依据（{{items.length}}项，不计金额）</summary><p>本期间实际交付与库存来源仅供完整性核对，不再计作收入、材料领用或牙医成本。已确认结果保留所采用的原依据。</p><article v-for="d in items" :key="d.deliveryLineId"><strong>{{clinicName(d.clinicId)}} · 销售 {{short(d.saleId)}} · 库存 {{short(d.stockId)}}</strong><p>交付数量 {{quantity(d.quantity)}} {{d.unit||'单位待核实'}} · 实际 {{time(d.at)}}<br/>本次登记 {{time(d.recordedAt)}}</p><small>交付 {{short(d.deliveryLineId)}} · 来源行 {{short(d.saleLineId)}}</small></article></details></template>
<style scoped>.q-delivery-evidence{margin:18px 0;padding:16px;background:#f5f8f0;border:1px solid #dce7da;border-radius:10px}.q-delivery-evidence summary{cursor:pointer;font-weight:600}.q-delivery-evidence p{font-size:14px;line-height:1.7;overflow-wrap:anywhere}.q-delivery-evidence article{padding:12px 0;border-top:1px solid #dce7da}.q-delivery-evidence small{overflow-wrap:anywhere}</style>
