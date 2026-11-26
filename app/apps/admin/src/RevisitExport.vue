<script setup lang="ts">
import{ref,watch}from'vue';import{encodeRevisitHint}from'./revisit-handoff';
const props=defineProps<{source:unknown;blocked:boolean}>(),text=ref(''),message=ref('');let generation=0;
watch(()=>[JSON.stringify(props.source),props.blocked],()=>{generation++;text.value='';message.value='';},{flush:'sync'});
function prepare(){if(props.blocked)return;try{text.value=encodeRevisitHint(props.source);message.value='';}catch{message.value='当前协作信息不完整，请核对患者和任务。';}}
async function copy(){if(props.blocked||!text.value)return;const current=++generation;try{await navigator.clipboard.writeText(text.value);if(current===generation)message.value='已复制，请交给有权前台核实办理。';}catch{if(current===generation)message.value='无法自动复制，可选中上方文字手动复制。';}}
</script>
<template><section class="b-card revisit-handoff"><h3>需要协助安排复诊？</h3><p class="b-help">生成姓名、联系电话、原医生及任务编号，供有权前台人工核实。仅是协作线索，不代表已与患者约定复诊。</p><button type="button" class="b-button outline small" :disabled="blocked" @click="prepare">准备复诊协作信息</button><template v-if="text"><label>复诊协作信息（含患者联系线索）<textarea :value="text" readonly rows="5"/></label><button type="button" class="b-button outline small" :disabled="blocked" @click="copy">复制协作信息</button></template><p v-if="message" role="status">{{message}}</p></section></template>
<style scoped>.revisit-handoff{margin-block:16px;padding:24px}.revisit-handoff label{display:block;margin-block:12px}.revisit-handoff textarea{display:block;width:100%;box-sizing:border-box;overflow-wrap:anywhere;min-height:120px}</style>
