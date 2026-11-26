<script setup lang="ts">
import {ref,onBeforeUnmount} from 'vue';
import {X,LockKeyhole} from '@lucide/vue';
import DemoAccountPicker, { type DemoAccount } from './DemoAccountPicker.vue';
const props=defineProps<{registrationAllowed:boolean;courseDemo:boolean;demoAccounts?:DemoAccount[];api:(path:string,body?:any,signal?:AbortSignal)=>Promise<any>}>();
const emit=defineEmits<{close:[];authenticated:[actor:any]}>();
const mode=ref<'login'|'register'>('login'),loginName=ref(''),password=ref(''),confirmation=ref(''),name=ref(''),contact=ref(''),syntheticOnly=ref(false),busy=ref(false),error=ref(''),notice=ref(''),unknown=ref(false);
const demoRole=ref('');
let alive=true,pending:any=null,controller:AbortController|null=null;
onBeforeUnmount(()=>{alive=false;controller?.abort();password.value='';confirmation.value='';pending=null;});
function changeMode(next:'login'|'register'){if(busy.value||next==='register'&&!props.registrationAllowed)return;mode.value=next;demoRole.value='';password.value='';confirmation.value='';pending=null;unknown.value=false;error.value='';notice.value='';}
async function submit(){
 if(busy.value)return;error.value='';notice.value='';
 if(mode.value==='register'&&!props.registrationAllowed){error.value='当前环境未开放注册，请返回登录。';return;}
 if(mode.value==='register'&&!pending){
  if(!syntheticOnly.value){error.value='请确认仅使用合成资料进行课程演示。';return;}
  if(password.value!==confirmation.value){error.value='两次输入的密码不一致。';return;}
  pending={requestId:crypto.randomUUID(),loginName:loginName.value,password:password.value,name:name.value,contact:contact.value,syntheticOnly:true};
 }
 busy.value=true;controller=new AbortController();const submittedMode=mode.value;
 try{
  if(submittedMode==='register'){
   const result=await props.api('/patient/register',pending,controller.signal);if(!alive)return;
   loginName.value=result.loginName;password.value='';confirmation.value='';pending=null;unknown.value=false;mode.value='login';notice.value='注册成功。请使用刚设置的账号和密码登录；预约联系电话尚未验证。';
  }else{
   const actor=demoRole.value
    ? await props.api('/demo/session',{role:demoRole.value},controller.signal)
    : await props.api('/patient/session',{loginName:loginName.value,password:password.value},controller.signal);
   if(!alive)return;password.value='';emit('authenticated',actor);
  }
 }catch(e:any){
  if(!alive)return;
  if(submittedMode==='register'){
   if(typeof e?.status!=='number'||e.status>=500){unknown.value=true;error.value='尚未确认注册结果。可以使用同一请求重试，也可返回登录尝试刚设置的账号。';}
   else{pending=null;unknown.value=false;error.value=e?.message||'注册未完成，请检查填写内容。';}
  }else error.value=e?.message||'登录未完成，请稍后再试。';
 }finally{if(alive){busy.value=false;controller=null;}}
}
</script>
<template>
 <div class="b-backdrop"><form class="b-dialog patient-access" @submit.prevent="submit" aria-label="患者账号">
  <button type="button" class="b-close" aria-label="关闭患者登录" :disabled="busy" @click="emit('close')"><X :size="21"/></button>
  <div class="b-dialog-icon"><LockKeyhole :size="24"/></div>
  <h2>{{mode==='register'?'注册患者账号':'登录患者账号'}}</h2>
  <p>{{mode==='register'?'建立自己的预约账号，注册后即可登录预约。':'登录后可查看、改约或取消本人的预约。'}}</p>
  <div v-if="courseDemo" class="b-help">课程演示仅使用合成资料，联系电话尚未验证；注册不会关联或开放诊所既有病历。</div>
  <div v-if="error" class="b-alert error" role="alert">{{error}}</div><div v-if="notice" class="b-alert success" role="status">{{notice}}</div>
  <DemoAccountPicker v-if="mode==='login' && demoAccounts?.length" v-model="demoRole" :accounts="demoAccounts" label="患者账号" :busy="busy" @update:model-value="password='';error=''"/>
  <template v-if="mode==='register'||!demoRole">
   <label>患者账号<input v-model="loginName" :disabled="busy||unknown" autocomplete="username" required :maxlength="mode==='register'?32:100" :pattern="mode==='register'?'[a-zA-Z][a-zA-Z0-9_]{3,31}':undefined" placeholder="注册账号为4—32位字母、数字或下划线"/></label>
   <label>密码<input v-model="password" :disabled="busy||unknown" type="password" :autocomplete="mode==='register'?'new-password':'current-password'" required :minlength="mode==='register'?8:undefined" :maxlength="mode==='register'?128:200"/></label>
  </template>
  <template v-if="mode==='register'">
   <div class="b-help">密码至少8位，包含字母和数字。</div>
   <label>确认密码<input v-model="confirmation" :disabled="busy||unknown" type="password" autocomplete="new-password" required minlength="8" maxlength="128"/></label>
   <label>预约姓名<input v-model="name" :disabled="busy||unknown" required maxlength="40" autocomplete="off" placeholder="请填写合成姓名"/></label>
   <label>预约联系电话<input v-model="contact" :disabled="busy||unknown" required maxlength="40" type="tel" autocomplete="off" placeholder="请填写合成联系电话"/></label>
   <label class="registration-consent"><input v-model="syntheticOnly" type="checkbox" :disabled="busy||unknown" required/>我确认仅使用合成资料进行课程演示</label>
  </template>
  <button class="b-button full" :disabled="busy">{{busy?'正在处理…':mode==='register'?(unknown?'重试原注册请求':'创建患者账号'):'登录'}}</button>
  <button v-if="mode==='login'&&registrationAllowed" type="button" class="b-button outline full" :disabled="busy" @click="changeMode('register')">新用户？注册患者账号</button>
  <button v-if="mode==='register'" type="button" class="b-button outline full" :disabled="busy" @click="changeMode('login')">已有账号，返回登录</button>
 </form></div>
</template>
<style scoped>
.patient-access{max-height:90vh;overflow-y:auto}.patient-access .b-button+.b-button{margin-top:10px}.registration-consent{display:flex;align-items:flex-start;gap:8px;font-size:13px}.registration-consent input{width:16px;min-width:16px;height:16px;margin-top:2px}
</style>
