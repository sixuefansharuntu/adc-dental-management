<script setup lang="ts">
defineProps<{pending:boolean;state:string;error:string;blocked:boolean;working:boolean;confirmed:boolean;summary:string;ownConflict?:boolean}>();
defineEmits<{'verify':[];'retry':[];'finish':[];'view-appointments':[];'update:confirmed':[value:boolean]}>();
</script>
<template>
 <section v-if="pending||error||blocked" class="b-recovery" role="status" aria-label="原预约提交核实">
  <strong>{{pending?'原提交结果核实':'预约办理提示'}}</strong>
  <p v-if="pending&&summary" class="b-original">{{summary}}</p>
  <p v-if="error">{{error}}</p>
  <button v-if="ownConflict&&!pending&&!blocked" class="b-button outline" type="button" :disabled="working" @click="$emit('view-appointments')">查看我的预约</button>
  <template v-if="pending&&!blocked">
   <p v-if="state==='not_found'">暂未查到原提交的完成结果，这不代表提交已经失败。可以稍后再次核实；如仍需办理，请明确确认后按原请求重试。</p>
   <p v-else-if="state==='processing'">原提交仍在处理中，请稍后再次核实。现在不会补办或重复发送。</p>
   <p v-else-if="state==='completed'||state==='rejected'">结果已经核实，仅需清除本标签页的原请求缓存。</p>
   <p v-else>核实只查询原请求结果，不会再次预约、改约或取消。</p>
   <button v-if="state==='completed'||state==='rejected'" class="b-button outline" type="button" :disabled="working" @click="$emit('finish')">完成核对</button>
   <template v-else>
    <button class="b-button outline" type="button" :disabled="working" @click="$emit('verify')">{{working?'正在核对…':'核实原提交'}}</button>
    <template v-if="state==='not_found'">
     <label class="b-checkbox"><input type="checkbox" :checked="confirmed" :disabled="working" @change="$emit('update:confirmed',($event.target as HTMLInputElement).checked)"/><span>我仍需办理这次原提交，同意按原内容重试；系统将重新检查当前规则。</span></label>
     <button class="b-button" type="button" :disabled="working||!confirmed" @click="$emit('retry')">按原请求重试</button>
    </template>
   </template>
  </template>
 </section>
</template>
<style scoped>
.b-recovery{padding:18px 20px;margin:14px 0;border:1px solid #d5c28a;border-radius:12px;background:#fff9e9;color:#51421e;min-width:0;overflow-wrap:anywhere;font-size:14px;line-height:1.65}.b-recovery strong{font-size:16px}.b-recovery p{margin:8px 0 12px}.b-recovery .b-checkbox{margin:14px 0}.b-recovery button{max-width:100%;white-space:normal}.b-recovery input{flex-shrink:0}
.b-recovery .b-original{padding:10px 12px;background:#fffdf5;border-radius:7px;white-space:pre-line;color:#493c20}
</style>
