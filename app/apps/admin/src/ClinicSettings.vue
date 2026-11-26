<script setup lang="ts">
import { computed } from 'vue';
import { Building2, ChevronRight, ClipboardList, ShieldCheck, Stethoscope } from '@lucide/vue';

const props = defineProps<{ functions: string[] }>();
const emit = defineEmits<{ open: [area: string] }>();
const available = computed(() => [
  { area: 'clinic', title: '诊所资料与预约规则', detail: '名称、地址和患者自助改约及取消规则。', icon: Building2, permission: 'clinic.read' },
  { area: 'dentist', title: '牙医资料与执业', detail: '公开介绍、专业、资质和执业安排。', icon: Stethoscope, permission: 'dentist.read' },
  { area: 'prices', title: '治疗项目参考价', detail: '按诊所查看参考单价及其生效版本。', icon: ClipboardList, permission: 'price.manage' },
  { area: 'security', title: '员工账号与权限', detail: '账号启停、诊所范围和已授权的岗位功能。', icon: ShieldCheck, permission: 'security.read' },
].filter(entry => props.functions.includes(entry.permission)));
</script>

<template>
  <section class="b-card clinic-settings" aria-label="诊所设置">
    <button v-for="entry in available" :key="entry.area" type="button" class="clinic-settings-entry" @click="emit('open', entry.area)">
      <span class="clinic-settings-icon"><component :is="entry.icon" :size="21" aria-hidden="true"/></span>
      <span><strong>{{ entry.title }}</strong><small>{{ entry.detail }}</small></span>
      <ChevronRight :size="18" aria-hidden="true"/>
    </button>
  </section>
</template>

<style scoped>
.clinic-settings{padding:0;overflow:hidden;max-width:920px}
.clinic-settings-entry{display:grid;grid-template-columns:42px minmax(0,1fr) auto;align-items:center;gap:14px;width:100%;border:0;border-bottom:1px solid #d9e5e4;background:#fff;padding:18px 20px;color:#173b3d;text-align:left;font:inherit;cursor:pointer}
.clinic-settings-entry:last-child{border-bottom:0}
.clinic-settings-entry:hover{background:#f5faf9}
.clinic-settings-entry small{display:block;margin-top:4px;color:#526b68}
.clinic-settings-icon{display:grid;place-items:center;width:42px;height:42px;border-radius:9px;background:#e6f2f3;color:#195967}
</style>
