<script setup lang="ts">
import {computed,ref,nextTick,onBeforeUnmount} from 'vue';
import {X,LockKeyhole} from '@lucide/vue';
import type {DemoAccount} from './DemoAccountPicker.vue';
import {missingLoginInput,loginFailure} from './login-feedback';
const props=defineProps<{registrationAllowed:boolean;courseDemo:boolean;demoAccounts?:DemoAccount[];api:(path:string,body?:any,signal?:AbortSignal)=>Promise<any>}>();
const emit=defineEmits<{close:[];authenticated:[actor:any]}>();
const mode=ref<'login'|'register'>('login'),loginName=ref(''),password=ref(''),confirmation=ref(''),name=ref(''),contact=ref(''),syntheticOnly=ref(false),busy=ref(false),error=ref(''),notice=ref(''),unknown=ref(false);
const demoRole=ref('');
const selectedDemo=computed(()=>props.demoAccounts?.find(account=>account.id===demoRole.value));
const form=ref<HTMLFormElement|null>(null);
const loginInput=ref<HTMLInputElement|null>(null);
const submitButton=ref<HTMLButtonElement|null>(null);
type Field='loginName'|'password'|'confirmation'|'name'|'contact'|'syntheticOnly';
const fieldErrors=ref<Partial<Record<Field,string>>>({});
const passwordRules=computed(()=>[
 {text:'长度 8—128 位',met:password.value.length>=8&&password.value.length<=128},
 {text:'至少 1 个英文字母（A–Z 或 a–z）',met:/[a-z]/i.test(password.value)},
 {text:'至少 1 个数字（0–9）',met:/[0-9]/.test(password.value)},
]);
const passwordValid=computed(()=>passwordRules.value.every(rule=>rule.met)&&!/[\u0000-\u001f]/.test(password.value));
const confirmationMatches=computed(()=>confirmation.value.length>0&&confirmation.value===password.value);
let alive=true,pending:any=null,controller:AbortController|null=null;
onBeforeUnmount(()=>{alive=false;controller?.abort();password.value='';confirmation.value='';pending=null;});
function changeMode(next:'login'|'register'){if(busy.value||next==='register'&&!props.registrationAllowed)return;mode.value=next;demoRole.value='';password.value='';confirmation.value='';pending=null;unknown.value=false;error.value='';notice.value='';fieldErrors.value={};if(form.value)form.value.scrollTop=0;}
async function switchLoginMethod(){
 if(busy.value)return;
 demoRole.value=selectedDemo.value?'':props.demoAccounts?.[0]?.id??'';
 password.value='';error.value='';notice.value='';
 await nextTick();
 (selectedDemo.value?submitButton.value:loginInput.value)?.focus();
}
function validateRegistration(){
 const invalid:Partial<Record<Field,string>>={};
 if(!/^[a-z][a-z0-9_]{3,31}$/i.test(loginName.value.trim()))invalid.loginName='账号须以英文字母开头，使用4—32位英文字母、数字或下划线（_）。';
 if(!passwordValid.value)invalid.password=passwordRules.value.every(rule=>rule.met)?'请删除密码中无法显示的字符。':'请满足下方全部密码要求。';
 if(!confirmationMatches.value)invalid.confirmation='请再次输入相同的密码。';
 if(!name.value.trim()||name.value.trim().length>40||/[\u0000-\u001f]/.test(name.value))invalid.name='请填写预约姓名，最多40字。';
 if(!/^\+?[0-9 ()-]{6,40}$/.test(contact.value.trim()))invalid.contact='请填写有效的预约联系电话，演示请使用合成号码。';
 if(!syntheticOnly.value)invalid.syntheticOnly='请勾选确认，仅使用合成资料。';
 fieldErrors.value=invalid;
 const first=Object.keys(invalid)[0];
 if(!first)return true;
 void nextTick(()=>{
  const input=form.value?.querySelector<HTMLInputElement>(`[name="${first}"]`);
  input?.scrollIntoView({block:'center'});
  input?.focus({preventScroll:true});
 });
 return false;
}
function registrationRequestId(){
 if(typeof crypto.randomUUID==='function')return crypto.randomUUID();
 const bytes=crypto.getRandomValues(new Uint8Array(16));
 bytes[6]=(bytes[6]&0x0f)|0x40;
 bytes[8]=(bytes[8]&0x3f)|0x80;
 const hex=Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('');
 return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
}
async function submit(){
 if(busy.value)return;error.value='';notice.value='';
 const role=selectedDemo.value?.id;
 if(mode.value==='register'&&!props.registrationAllowed){error.value='当前环境未开放注册，请返回登录。';return;}
 if(mode.value==='login'&&!role){
  error.value=missingLoginInput(loginName.value,password.value);
  if(error.value)return;
 }
 if(mode.value==='register'&&!pending){
  if(!validateRegistration())return;
  try{pending={requestId:registrationRequestId(),loginName:loginName.value.trim(),password:password.value,name:name.value.trim(),contact:contact.value.trim(),syntheticOnly:true};}
  catch{error.value='无法准备注册，请重新打开页面后再试。';return;}
 }
 busy.value=true;controller=new AbortController();const submittedMode=mode.value;
 try{
  if(submittedMode==='register'){
   const result=await props.api('/patient/register',pending,controller.signal);if(!alive)return;
   loginName.value=result.loginName;password.value='';confirmation.value='';pending=null;unknown.value=false;mode.value='login';notice.value='注册成功。请使用刚设置的账号和密码登录；预约联系电话尚未验证。';if(form.value)form.value.scrollTop=0;
  }else{
   const actor=role
    ? await props.api('/demo/session',{role},controller.signal)
    : await props.api('/patient/session',{loginName:loginName.value,password:password.value},controller.signal);
   if(!alive)return;password.value='';emit('authenticated',actor);
  }
 }catch(e:any){
  if(!alive)return;
  if(submittedMode==='register'){
   if(typeof e?.status!=='number'||e.status>=500){unknown.value=true;error.value='尚未确认注册结果。可以使用同一请求重试，也可返回登录尝试刚设置的账号。';}
   else{pending=null;unknown.value=false;error.value=e?.message||'注册未完成，请检查填写内容。';}
  }else error.value=loginFailure(e,!!role);
 }finally{if(alive){busy.value=false;controller=null;}}
}
</script>
<template>
 <div class="b-backdrop"><form ref="form" class="b-dialog patient-access" novalidate @submit.prevent="submit" aria-label="患者账号">
  <button type="button" class="b-close" aria-label="关闭患者登录" :disabled="busy" @click="emit('close')"><X :size="21"/></button>
  <div class="b-dialog-icon"><LockKeyhole :size="24"/></div>
  <h2>{{mode==='register'?'注册患者账号':'登录患者账号'}}</h2>
  <p>{{mode==='register'?'建立自己的预约账号，注册后即可登录预约。':'登录后可查看、改约或取消本人的预约。'}}</p>
  <div v-if="courseDemo" class="b-help">课程演示仅使用合成资料，联系电话尚未验证；注册不会关联或开放诊所既有病历。</div>
  <div v-if="error" class="b-alert error" role="alert">{{error}}</div><div v-if="notice" class="b-alert success" role="status">{{notice}}</div>
  <template v-if="mode==='register'||!selectedDemo">
   <label>患者账号<input ref="loginInput" v-model="loginName" name="loginName" :disabled="busy||unknown" autocomplete="username" autocapitalize="none" :spellcheck="false" required :maxlength="mode==='register'?32:100" :aria-invalid="fieldErrors.loginName?true:undefined" :aria-describedby="mode==='register'?'register-name-help':undefined" @input="delete fieldErrors.loginName;if(mode==='login')error=''"/>
    <small v-if="mode==='register'" id="register-name-help" :class="{'field-error':fieldErrors.loginName}">{{fieldErrors.loginName||'以英文字母开头，4—32位，可用数字和下划线（_）。'}}</small>
   </label>
   <label>密码<input v-model="password" name="password" :disabled="busy||unknown" type="password" :autocomplete="mode==='register'?'new-password':'current-password'" required :maxlength="mode==='register'?128:200" :aria-invalid="mode==='register'&&(fieldErrors.password||password&&!passwordValid)?true:undefined" :aria-describedby="mode==='register'?'register-password-help':undefined" @input="delete fieldErrors.password;delete fieldErrors.confirmation;if(mode==='login')error=''"/>
    <span v-if="mode==='register'" id="register-password-help" class="password-help">
     <small v-if="fieldErrors.password" class="field-error">{{fieldErrors.password}}</small>
     <span class="password-help-title">密码要求</span>
     <span class="password-rules" role="list" aria-live="polite">
      <span v-for="rule in passwordRules" :key="rule.text" class="password-rule" role="listitem">
       <span v-if="password||fieldErrors.password" class="password-status" :class="rule.met?'rule-met':'field-error'">{{rule.met?'已满足':'未满足'}}</span>
       <span>{{rule.text}}</span>
      </span>
     </span>
    </span>
   </label>
  </template>
  <template v-else>
   <label v-if="demoAccounts && demoAccounts.length>1">演示账号
    <select v-model="demoRole" :disabled="busy" @change="error=''">
     <option v-for="account in demoAccounts" :key="account.id" :value="account.id">{{account.label}}（{{account.loginName}}）</option>
    </select>
   </label>
   <div v-else class="demo-selection">{{selectedDemo.label}}（{{selectedDemo.loginName}}）</div>
  </template>
  <template v-if="mode==='register'">
   <label>确认密码<input v-model="confirmation" name="confirmation" :disabled="busy||unknown" type="password" autocomplete="new-password" required maxlength="128" :aria-invalid="fieldErrors.confirmation||confirmation&&!confirmationMatches?true:undefined" aria-describedby="register-confirmation-status" @input="delete fieldErrors.confirmation"/>
    <small id="register-confirmation-status" aria-live="polite" :class="confirmation?(confirmationMatches?'rule-met':'field-error'):fieldErrors.confirmation?'field-error':''">{{confirmation?(confirmationMatches?'两次密码一致。':'两次密码不一致。'):fieldErrors.confirmation||'请再次输入密码。'}}</small></label>
   <label>预约姓名<input v-model="name" name="name" :disabled="busy||unknown" required maxlength="40" autocomplete="off" placeholder="请填写合成姓名" :aria-invalid="fieldErrors.name?true:undefined" :aria-describedby="fieldErrors.name?'register-patient-error':undefined" @input="delete fieldErrors.name"/>
    <small v-if="fieldErrors.name" id="register-patient-error" class="field-error">{{fieldErrors.name}}</small></label>
   <label>预约联系电话<input v-model="contact" name="contact" :disabled="busy||unknown" required maxlength="40" type="tel" autocomplete="off" placeholder="请填写合成联系电话" :aria-invalid="fieldErrors.contact?true:undefined" :aria-describedby="fieldErrors.contact?'register-contact-error':undefined" @input="delete fieldErrors.contact"/>
    <small v-if="fieldErrors.contact" id="register-contact-error" class="field-error">{{fieldErrors.contact}}</small></label>
   <label class="registration-consent"><input v-model="syntheticOnly" name="syntheticOnly" type="checkbox" :disabled="busy||unknown" required :aria-invalid="fieldErrors.syntheticOnly?true:undefined" :aria-describedby="fieldErrors.syntheticOnly?'register-consent-error':undefined" @change="delete fieldErrors.syntheticOnly"/><span>我确认仅使用合成资料进行课程演示<small v-if="fieldErrors.syntheticOnly" id="register-consent-error" class="field-error">{{fieldErrors.syntheticOnly}}</small></span></label>
  </template>
  <button ref="submitButton" class="b-button full" :disabled="busy">{{busy?'正在处理…':mode==='register'?(unknown?'重试原注册请求':'创建患者账号'):selectedDemo?'登录演示账号':'登录'}}</button>
  <button v-if="mode==='login'&&demoAccounts?.length" class="login-mode-switch" type="button" :disabled="busy" @click="switchLoginMethod">{{selectedDemo?'返回账号密码登录':'使用演示账号'}}</button>
  <button v-if="mode==='login'&&registrationAllowed" type="button" class="b-button outline full" :disabled="busy" @click="changeMode('register')">新用户？注册患者账号</button>
  <button v-if="mode==='register'" type="button" class="b-button outline full" :disabled="busy" @click="changeMode('login')">已有账号，返回登录</button>
 </form></div>
</template>
<style scoped>
.patient-access{max-height:90vh;max-height:calc(100dvh - 32px);overflow-y:auto;overscroll-behavior:contain}
.patient-access .b-button+.b-button{margin-top:10px}
.patient-access input:not([type=checkbox]){font-size:16px}
.patient-access label small{display:block;font-size:13px;line-height:1.45}
.patient-access .field-error{color:#93442e}
.demo-selection{margin:16px 0 0;padding:12px;border:1px solid #d5e1df;border-radius:8px;background:#f6faf9;color:#35595b;font-size:15px}
.login-mode-switch{display:block;width:100%;min-height:44px;padding:8px;color:#1d5b65;text-decoration:underline;text-underline-offset:3px}
.login-mode-switch:disabled{opacity:.6;cursor:default}
.password-help{display:grid;gap:6px;padding:10px 12px;border:1px solid #d5e1df;border-radius:8px;background:#f6faf9;color:#35595b;font-size:13px;line-height:1.45}
.password-help-title{font-weight:650}
.password-rules{display:grid;gap:4px}
.password-rule{display:flex;align-items:baseline;gap:8px}
.password-status{flex:none;font-weight:650}
.patient-access .rule-met{color:#23634d}
.patient-access input[aria-invalid=true]{border-color:#ac6653}
.registration-consent{display:flex;align-items:flex-start;gap:8px;font-size:13px}
.registration-consent input{width:16px;min-width:16px;height:16px;margin-top:2px}
</style>
