<script lang="ts">
export type DemoAccount = { id: string; kind: 'patient' | 'staff'; label: string; loginName: string };
</script>

<script setup lang="ts">
defineProps<{ accounts: DemoAccount[]; label: string; busy: boolean }>();
const selected = defineModel<string>({ required: true });
</script>

<template>
  <label class="demo-account-field">
    {{ label }}
    <select v-model="selected" :disabled="busy">
      <option value="">手动输入账号</option>
      <option v-for="account in accounts" :key="account.id" :value="account.id">
        {{ account.label }}（{{ account.loginName }}）
      </option>
    </select>
  </label>
  <div v-if="selected" class="demo-account-field" role="status">
    演示凭证
    <span class="demo-mask" aria-hidden="true">••••••••</span>
    <small>已就绪，点击下方按钮登录。</small>
  </div>
</template>

<style scoped>
.demo-account-field { display: grid; gap: 8px; margin-top: 18px; }
.demo-account-field select { width: 100%; min-width: 0; min-height: 45px; color: #213d38; background: #f6faf7; }
.demo-mask { display: flex; align-items: center; min-height: 45px; padding: 0 12px; border: 1px solid #d5e1d7; border-radius: 7px; background: #f6faf7; letter-spacing: 2px; }
.demo-account-field small { color: #486c60; }
</style>
