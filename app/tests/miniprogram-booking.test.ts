import test from 'node:test';import assert from 'node:assert/strict';
import {createRequire} from 'node:module';import {randomBytes} from 'node:crypto';
import {miniprogramPage, simulateMiniCloud} from './helpers/miniprogram-page';
import {MiniProgramLocalAuth} from '../apps/api/src/miniprogram.controller';
const require=createRequire(import.meta.url),{createPatientApi,requestId}=require('../apps/miniprogram/lib/patient-api.js');
const tick=()=>new Promise<void>(r=>setImmediate(r)),id=(n:number)=>`${String(n).padStart(8,'0')}-1111-4111-8111-111111111111`;
const selection={scheduleId:id(1),serviceVersionId:id(2),ruleVersionId:id(3),startsAt:'2028-02-29T01:00:00.000Z'};
const input=(field:string,value:string)=>({currentTarget:{dataset:{field}},detail:{value}}),confirm={detail:{value:['yes']}};
const loginForm=(loginName='',password='')=>({detail:{value:{loginName,password}}});
const patient={subjectId:id(4),name:'合成患者',contact:'13800000001'};
const quote={...selection,endsAt:'2028-02-29T01:30:00.000Z',durationMinutes:30,doctorName:'林医生',clinicName:'东城诊所',serviceName:'咨询',address:'示例路'};
const saved={id:id(9),version:1,disposition:'active'};
function setup(extra:any={}){
 const {cloud,calls}=simulateMiniCloud(201),state={pending:null as any};let navigation='';
 const platform={cloud,getRandomValues(o:any){o.success({randomValues:Uint8Array.from(randomBytes(16)).buffer});},navigateTo(o:any){navigation=o.url;}};
 const page=miniprogramPage(platform,undefined,{page:'booking',globalData:{localBookingEnabled:true,miniBookingState:state,...extra}});page.onLoad(selection);page.onShow();
 return{page,calls,state,platform,navigation:()=>navigation};
}
async function ready(){const s=setup();const p=s.page.onLogin(loginForm('alice','synthetic-test-only'));assert.equal(s.page.data.passwordReset,1);assert.ok(!Object.hasOwn(s.page.data,'credentials'));s.calls[0].reply({mode:'local-synthetic',token:'mp_'+'a'.repeat(64),patient});await p;s.page.onInput(input('intention','咨询牙齿清洁'));return s;}
async function quoted(){const s=await ready(),p=s.page.onQuote();s.calls.at(-1).reply(quote);await p;s.page.onConfirm(confirm);return s;}
test('小程序预约实际入口默认关闭时不验证不发送请求',async()=>{const s=setup({localBookingEnabled:false});await s.page.onLogin();assert.equal(s.page.data.phase,'disabled');assert.equal(s.calls.length,0);});
test('预约登录提示区分缺项、错凭据、频率限制与断网',async()=>{
 const {page,calls}=setup();await page.onLogin(loginForm());assert.match(page.data.error,/输入账号/);assert.equal(calls.length,0);
 await page.onLogin(loginForm('sample'));assert.match(page.data.error,/输入密码/);
 for(const [status,message] of [[401,/账号或密码不正确/],[429,/尝试过于频繁/],[503,/服务暂时无法使用/]] as const){
  const waiting=page.onLogin(loginForm('sample','Wrong123'));calls.at(-1)!.reply({message:'INTERNAL'},status);await waiting;assert.match(page.data.error,message);
 }
 const waiting=page.onLogin(loginForm('sample','Wrong123'));calls.at(-1)!.fail();await waiting;assert.match(page.data.error,/检查网络/);
});
test('原生验证使用独立端点及Bearer，口令清页面且token不进入data',async()=>{
 const{page,calls}=await ready();assert.equal(calls[0].options.path,'/local-session');assert.equal(calls[0].name,'adcApi');assert.equal(calls[0].options.token,'');assert.equal(page.data.patient.subjectId,id(4));assert.equal(JSON.stringify(page.data).includes('mp_'),false);
 const p=page.onQuote();const c=calls[1];assert.equal(c.options.token,'mp_'+'a'.repeat(64));assert.deepEqual(Object.keys(c.options).sort(),['data','method','path','token']);c.reply(quote);await p;assert.equal(page.data.quote.range,'2028-02-29 09:00 — 2028-02-29 09:30');
});
test('预约确认后仅提交一笔原请求，忙时重复点击不发第二笔',async()=>{
 const{page,calls,state}=await quoted();const p=page.onSubmit();await page.onSubmit();await tick();assert.equal(calls.length,3);const body=structuredClone(calls[2].options.data);assert.match(body.requestId,/^[a-f0-9-]{36}$/);assert.equal(body.intention,'咨询牙齿清洁');
 page.onInput(input('name','不应覆盖'));assert.equal(page.data.form.name,patient.name);calls[2].reply(saved);await p;assert.equal(page.data.phase,'saved');assert.equal(state.pending.phase,'saved');await page.onSubmit();assert.equal(calls.length,3);
});
test('未确认、未核对或无效联系方式不提交',async()=>{
 const{page,calls}=await ready();await page.onSubmit();assert.equal(calls.length,1);page.onInput(input('contact','bad'));await page.onQuote();assert.equal(calls.length,1);assert.match(page.data.error,/电话/);
});
test('核对后编辑内容撤销确认，不能沿用旧确认提交',async()=>{const{page,calls}=await quoted();page.onInput(input('intention','改成修复咨询'));assert.equal(page.data.quote,null);assert.equal(page.data.confirmed,false);await page.onSubmit();assert.equal(calls.length,2);});
test('错误服务版或起点的核对结果不接受',async()=>{for(const bad of [{...quote,serviceVersionId:id(20)},{...quote,startsAt:'2028-02-29T02:00:00.000Z'},{...quote,endsAt:'2028-03-01T01:30:00Z'}]){const{page,calls}=await ready(),p=page.onQuote();calls.at(-1).reply(bad);await p;assert.equal(page.data.quote,null);assert.ok(page.data.error);}});
test('断网后锁原表单，先GET核实已成功，不重复POST',async()=>{
 const{page,calls,state}=await quoted(),p=page.onSubmit();await tick();calls[2].fail();await p;const original=structuredClone(state.pending.body);assert.equal(page.data.phase,'unknown');page.onInput(input('name','不能修改'));assert.equal(page.data.form.name,patient.name);
 await page.onLogout();assert.equal(calls.length,3);const r=page.onRecover();assert.equal(calls[3].options.method,'GET');assert.ok(calls[3].options.path.endsWith(original.requestId));calls[3].reply({...saved,appointmentId:saved.id,state:'completed'},200);await r;assert.equal(page.data.phase,'saved');assert.equal(calls.filter(c=>c.options.path.endsWith('/appointments')).length,1);
});
test('原请求未见结果不自动提交，确认后再次GET并重用原UUID及正文',async()=>{
 const{page,calls,state}=await quoted(),p=page.onSubmit();await tick();calls[2].reply({},503);await p;const original=structuredClone(state.pending.body);
 let r=page.onRecover();calls[3].reply({state:'not_found'},200);await r;assert.equal(page.data.retryAllowed,true);await page.onRetrySubmit();assert.equal(calls.length,4);
 page.onRetryConfirm(confirm);r=page.onRetrySubmit();assert.equal(calls[4].options.method,'GET');calls[4].reply({state:'not_found'},200);await tick();assert.deepEqual(calls[5].options.data,original);calls[5].reply(saved);await r;assert.equal(page.data.phase,'saved');
});
test('原请求处理中不允许重发',async()=>{
 const{page,calls}=await quoted(),p=page.onSubmit();await tick();calls[2].fail();await p;const r=page.onRecover();calls[3].reply({state:'processing'},200);await r;page.onRetryConfirm(confirm);await page.onRetrySubmit();assert.equal(page.data.retryAllowed,false);assert.equal(calls.length,4);
});
test('未知原请求重试遭明确4xx仍保留原请求，不误认为第一次拒绝',async()=>{
 const{page,calls,state}=await quoted(),p=page.onSubmit();await tick();calls[2].fail();await p;let r=page.onRecover();calls[3].reply({state:'not_found'},200);await r;page.onRetryConfirm(confirm);r=page.onRetrySubmit();calls[4].reply({state:'not_found'},200);await tick();calls[5].reply({},409);await r;assert.ok(state.pending);assert.equal(page.data.phase,'unknown');
});
test('首次明确拒绝清未执行请求并要求重新核对',async()=>{const{page,calls,state}=await quoted(),p=page.onSubmit();await tick();calls[2].reply({},409);await p;assert.equal(state.pending,null);assert.equal(page.data.phase,'ready');assert.equal(page.data.quote,null);});
test('隐藏时保存成功只保留原结果，返回显示已保存',async()=>{
 const{page,calls,state}=await quoted(),p=page.onSubmit();await tick();page.onHide();const updates=page.updates;calls[2].reply(saved);await p;assert.equal(page.updates,updates);assert.equal(state.pending.phase,'saved');await page.onShow();assert.equal(page.data.phase,'saved');assert.equal(calls.length,3);
 assert.equal(page.data.result.id,saved.id);assert.equal(page.data.summary.range,'2028-02-29 09:00 — 2028-02-29 09:30');assert.equal(page.data.quote,null);
});
test('核对前摘要只显示同一时段的内存预览',()=>{
 const preview={selection,doctorName:'林医生',clinicName:'东城诊所',serviceName:'咨询',range:'2028-02-29 09:00—09:30'};
 assert.equal(setup({miniBookingPreview:preview}).page.data.preview.doctorName,'林医生');
 assert.equal(setup({miniBookingPreview:{...preview,selection:{...selection,ruleVersionId:id(99)}}}).page.data.preview,null);
});
test('卸载后迟到核对不写页面',async()=>{const{page,calls}=await ready(),p=page.onQuote();page.onUnload();const updates=page.updates;calls[1].reply(quote);await p;assert.equal(page.updates,updates);});
test('保存返回格式不完整时保留未知，不把异常回复当成功',async()=>{const{page,calls,state}=await quoted(),p=page.onSubmit();await tick();calls[2].reply({id:'bad',version:1,disposition:'active'});await p;assert.equal(page.data.phase,'unknown');assert.ok(state.pending);});
test('原请求401保留编号，重新验证只许原患者继续核实',async()=>{
 const{page,calls,state}=await quoted(),p=page.onSubmit();await tick();calls[2].reply({},401);await p;assert.equal(page.data.patient,null);assert.ok(state.pending);const login=page.onLogin(loginForm('alice','other-test-only'));calls[3].reply({mode:'local-synthetic',token:'mp_'+'b'.repeat(64),patient:{...patient,subjectId:id(50)}});await tick();calls[4].reply({success:true});await login;assert.equal(page.data.patient,null);assert.ok(state.pending);assert.match(page.data.error,/原合成患者/);
});
test('安全随机UUID不降级为Math.random，缺接口时禁止生成',async()=>{const a=await requestId({getRandomValues(o:any){o.success({randomValues:Uint8Array.from(randomBytes(16)).buffer});}});assert.match(a,/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);await assert.rejects(requestId({}),/不支持/);});
test('认证晚到回复不覆盖较新的认证',async()=>{
 const calls:any[]=[];const api=createPatientApi({request(o:any){calls.push(o);}},()=>'/api/v1');const a=api.login({loginName:'a',password:'x'}),b=api.login({loginName:'b',password:'y'});calls[1].success({statusCode:201,data:{mode:'local-synthetic',token:'mp_'+'b'.repeat(64),patient}});await b;calls[0].success({statusCode:201,data:{mode:'local-synthetic',token:'mp_'+'a'.repeat(64),patient}});await assert.rejects(a,/变化/);const q=api.quote(selection);assert.equal(calls[2].header.Authorization,'Bearer mp_'+'b'.repeat(64));calls[2].success({statusCode:201,data:quote});await q;
});
test('后端合成入口默认关闭、生产关闭，拒网页Cookie来源及非本机连接',()=>{
 const old={flag:process.env.ADC_MINIPROGRAM_LOCAL_ENABLED,local:process.env.ADC_LOCAL_IDENTITY_ENABLED,node:process.env.NODE_ENV};const auth=new MiniProgramLocalAuth({}as any),request:any={ip:'127.0.0.1',headers:{}};
 try{
  delete process.env.ADC_MINIPROGRAM_LOCAL_ENABLED;process.env.ADC_LOCAL_IDENTITY_ENABLED='true';process.env.NODE_ENV='test';assert.throws(()=>auth.gate(request));
  process.env.ADC_MINIPROGRAM_LOCAL_ENABLED='true';assert.doesNotThrow(()=>auth.gate(request));
  for(const headers of [{cookie:'adc_patient=anything'},{origin:'http://127.0.0.1:5173'},{'x-forwarded-for':'127.0.0.1'}])assert.throws(()=>auth.gate({...request,headers}));
  assert.throws(()=>auth.gate({...request,ip:'192.168.1.2'}));process.env.NODE_ENV='production';assert.throws(()=>auth.gate(request));
 }finally{for(const[key,value]of Object.entries({ADC_MINIPROGRAM_LOCAL_ENABLED:old.flag,ADC_LOCAL_IDENTITY_ENABLED:old.local,NODE_ENV:old.node})){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
});
