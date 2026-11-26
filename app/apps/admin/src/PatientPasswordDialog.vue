<script setup lang="ts">
import {ref,onBeforeUnmount} from 'vue';
import {X,LockKeyhole} from '@lucide/vue';
const props=defineProps<{api:(path:string,body?:any,signal?:AbortSignal)=>Promise<any>}>();
const emit=defineEmits<{close:[];reauthenticate:[message:string]}>();
const oldPassword=ref(''),newPassword=ref(''),confirmation=ref(''),busy=ref(false),error=ref(''),unknown=ref(false);
let alive=true,controller:AbortController|null=null;
onBeforeUnmount(()=>{alive=false;controller?.abort();oldPassword.value='';newPassword.value='';confirmation.value='';});
async function submit(){
 if(busy.value||unknown.value)return;error.value='';
 if(newPassword.value!==confirmation.value){error.value='两次输入的新密码不一致。';return;}
 if(newPassword.value===oldPassword.value){error.value='新密码不能与原密码相同。';return;}
 if(newPassword.value.length<8||newPassword.value.length>128||!/[a-z]/i.test(newPassword.value)||!/[0-9]/.test(newPassword.value)||/[\u0000-\u001f]/.test(newPassword.value)){error.value='密码须为8—128位，包含字母和数字。';return;}
 busy.value=true;controller=new AbortController();
 try{await props.api('/patient/password',{oldPassword:oldPassword.value,newPassword:newPassword.value},controller.signal);if(!alive)return;oldPassword.value='';newPassword.value='';confirmation.value='';emit('reauthenticate','密码已修改，所有旧登录已退出。请使用新密码重新登录。');}
 catch(e:any){if(!alive)return;if(typeof e?.status!=='number'||e.status>=500){unknown.value=true;error.value='尚未确认修改结果，请先用新密码重新登录；若提示密码不正确，再尝试原密码。请勿重复提交。';}else error.value=e?.message||'密码未修改，请检查后再试。';}
 finally{if(alive){busy.value=false;controller=null;}}
}
</script>
<template>
 <div class="b-backdrop"><form class="b-dialog patient-password" aria-label="修改患者密码" @submit.prevent="submit">
  <button type="button" class="b-close" :disabled="busy" aria-label="关闭修改密码" @click="emit('close')"><X :size="21"/></button>
  <div class="b-dialog-icon"><LockKeyhole :size="24"/></div><h2>修改密码</h2>
  <p>修改后需要重新登录，其他设备上的旧登录也会退出。</p>
  <div v-if="error" class="b-alert error" role="alert">{{error}}</div>
  <template v-if="!unknown">
   <label>原密码<input v-model="oldPassword" type="password" autocomplete="current-password" required maxlength="200" :disabled="busy"/></label>
   <label>新密码<input v-model="newPassword" type="password" autocomplete="new-password" required minlength="8" maxlength="128" :disabled="busy"/></label>
   <div class="b-help">至少8位，包含字母和数字，无需特殊符号。</div>
   <label>确认新密码<input v-model="confirmation" type="password" autocomplete="new-password" required minlength="8" maxlength="128" :disabled="busy"/></label>
   <button class="b-button full" :disabled="busy">{{busy?'正在修改…':'保存新密码'}}</button>
  </template>
  <button v-else type="button" class="b-button full" @click="emit('reauthenticate','请先尝试新密码登录；若不正确，再使用原密码。')">前往重新登录</button>
 </form></div>
</template>
<style scoped>.patient-password{max-height:90vh;overflow-y:auto}</style>
