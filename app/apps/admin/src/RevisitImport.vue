<script setup lang="ts">
import{ref,watch}from'vue';import{decodeRevisitHint}from'./revisit-handoff';
const props=defineProps<{clinicId:string;blocked:boolean}>(),emit=defineEmits(['adopt']),raw=ref(''),error=ref('');
watch(()=>props.clinicId,()=>{raw.value='';error.value='';},{flush:'sync'});
function adopt(){if(props.blocked)return;try{const hint=decodeRevisitHint(raw.value);if(hint.clinicId!==props.clinicId.toLowerCase())throw Error('协作信息属于其他诊所，请核对当前办理诊所。');emit('adopt',hint);raw.value='';error.value='';}catch(e){error.value=(e as Error).message;}}
</script>
<template><details class="b-card revisit-import"><summary>采用人工复诊协作信息</summary><p class="b-help">粘贴随访人员提供的线索。前台须核实本店患者身份，再与患者确认医生、项目和时段；不会自动预约。</p><label>待核实的协作信息<textarea v-model="raw" rows="4" maxlength="2000" :disabled="blocked"/></label><button type="button" class="b-button outline small" :disabled="blocked||!raw" @click="adopt">核对并打开代约表单</button><p v-if="error" role="alert">{{error}}</p></details></template>
<style scoped>.revisit-import{margin-block:16px;padding:20px}.revisit-import summary{cursor:pointer;font-weight:600}.revisit-import label{display:block;margin-block:12px}.revisit-import textarea{display:block;width:100%;box-sizing:border-box;min-height:110px}</style>
