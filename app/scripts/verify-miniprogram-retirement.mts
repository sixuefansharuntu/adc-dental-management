import assert from 'node:assert/strict';import pg from 'pg';import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {writeFile,rm} from 'node:fs/promises';import {resolve,join,sep} from 'node:path';import {createRequire} from 'node:module';
import {config,pgOptions,root} from './config.mjs';import {migrate} from './migrate.mjs';import {seedBooking} from './seed-booking.mts';import {fixtureId as id} from './seed.mjs';
import {bridgePublicMiniCloud,miniprogramPage} from '../tests/helpers/miniprogram-page';
const require=createRequire(import.meta.url),{createPatientApi}=require('../apps/miniprogram/lib/patient-api.js'),{createReceiptStore}=require('../apps/miniprogram/lib/receipt-store.js');
const env=await config(),originalEnv={...process.env},name='adc_miniprogram_retirement_test_'+Date.now(),folder=resolve(root,'.runtime',name);
assert.match(name,/^adc_miniprogram_retirement_test_\d+$/);assert.ok(folder.startsWith(resolve(root,'.runtime')+sep));
const admin=new pg.Client(pgOptions(env,'postgres'));await admin.connect();let app:any,created=false;
const passed:string[]=[],uiRequests:any[]=[],apiChecks:any[]=[],attempts:any[]=[];
const check=async(label:string,f:()=>Promise<void>)=>{await f();passed.push(label);console.log('PASS',label);};
try{
 await admin.query('CREATE DATABASE "'+name+'"');created=true;
 Object.assign(process.env,env,{PGDATABASE:name,ADC_ISOLATED_SEED_REPORTS:'true',BOOKING_DEMO_DATE:new Date(Date.now()+86400000).toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'})});delete process.env.ADC_MINIPROGRAM_LOCAL_ENABLED;
 await migrate();await seedBooking();const{createApp}=await import('../apps/api/src/app.ts'),{DatabaseService}=await import('../apps/api/src/database.service.ts');app=await createApp();await app.listen(0,'127.0.0.1');const base=(await app.getUrl())+'/api/v1',db=app.get(DatabaseService);
 await db.pool.query('EXPLAIN SELECT appointment_id,booking_subject_id,row_version,booked_name,booked_contact,service_version_id,rule_version_id FROM adc.appointment');
 await db.pool.query('EXPLAIN SELECT appointment_id,version_no FROM adc.appointment_revision');await db.pool.query('EXPLAIN SELECT request_key,patient_actor_id,command_code FROM adc.command_dedup');await db.pool.query('EXPLAIN SELECT token_hash,identity_id,expires_at FROM adc_auth.session');
 const call=async(path:string,body?:any,headers:Record<string,string>={})=>{const r=await fetch(base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...headers},body:body?JSON.stringify(body):undefined});const data=await r.json();apiChecks.push({method:body?'POST':'GET',path,status:r.status});return{status:r.status,data,cookie:r.headers.get('set-cookie')?.split(';')[0]||''};};
 const loginBody={loginName:'alice',password:env.ADC_PATIENT_A_PASSWORD};
 await check('合成入口默认关闭，不因既有本机身份开关自动开放',async()=>{assert.equal((await call('/miniprogram/local-session',loginBody)).status,403);assert.equal((await db.pool.query('SELECT count(*)::int n FROM adc_auth.session')).rows[0].n,0);});
 process.env.ADC_MINIPROGRAM_LOCAL_ENABLED='true';
 await check('网页登录来源及Cookie不能进入原生登录，错误密码拒绝',async()=>{
  for(const headers of [{Origin:env.ADMIN_ORIGIN!},{Cookie:'adc_patient=anything'},{'X-Forwarded-For':'127.0.0.1'}])assert.equal((await call('/miniprogram/local-session',loginBody,headers)).status,403);
  assert.equal((await call('/miniprogram/local-session',{loginName:'alice',password:'wrong-synthetic-only'})).status,401);
 });
 let dropAfter=false,dropBefore=false,navigation='',lastBody:any;
 const tokens=new Map<string,string>();
 const platform={request(options:any){
  const url=new URL(options.url),method=options.method||'GET',isBook=url.pathname==='/api/v1/miniprogram/appointments'||/\/(cancel|reschedule)$/.test(url.pathname);
  if(method==='GET')for(const[k,v]of Object.entries(options.data||{}))url.searchParams.set(k,String(v));
  if(isBook)lastBody=structuredClone(options.data);
  if(isBook&&dropBefore){dropBefore=false;attempts.push({path:url.pathname,simulatedLoss:'before-send'});queueMicrotask(()=>options.fail());return{abort(){}};}
  const controller=new AbortController();
  fetch(url,{method,signal:controller.signal,headers:options.header||{},body:method==='POST'?JSON.stringify(options.data):undefined}).then(async r=>{
   const data=await r.json();uiRequests.push({method,path:url.pathname,status:r.status});
   if(url.pathname.endsWith('/local-session')&&r.status===201)tokens.set(options.data.loginName,data.token);
   if(isBook&&dropAfter){dropAfter=false;attempts.push({path:url.pathname,simulatedLoss:'after-server-reply',status:r.status});options.fail();return;}
   options.success({statusCode:r.status,data});
  }).catch(()=>options.fail());return{abort(){controller.abort();}};
 },getRandomValues(o:any){o.success({randomValues:Uint8Array.from(randomBytes(16)).buffer});},navigateTo(o:any){navigation=o.url;},switchTab(o:any){navigation=o.url;},stopPullDownRefresh(){}};
 const storage=new Map<string,string>();Object.assign(platform,{getStorageSync:(k:string)=>storage.get(k)||'',setStorageSync:(k:string,v:string)=>storage.set(k,v),removeStorageSync:(k:string)=>storage.delete(k)});const journal=createReceiptStore(platform,()=>base);const state={pending:null as any},api=createPatientApi(platform,()=>base,{journal}),globals={localBookingEnabled:true,miniBookingState:state,miniBookingApi:api,miniReceiptStore:journal};
 bridgePublicMiniCloud(platform,base);
 const index=miniprogramPage(platform,base,{globalData:globals});const pick=(value:any)=>({detail:{value}}),input=(field:string,value:string)=>({currentTarget:{dataset:{field}},detail:{value}}),confirm={detail:{value:['yes']}};
 const openPage=()=>{const route=new URL('http://local'+navigation),options=Object.fromEntries(route.searchParams);const p=miniprogramPage(platform,base,{page:'booking',globalData:globals});p.onLoad(options);p.onShow();return p;};
 let page:any,firstId:string,firstBody:any;
 await check('实际公开Page选择未来时段进入实际预约Page，不在URL传患者资料',async()=>{
  await index.onLoad();await index.onDate(pick(process.env.BOOKING_DEMO_DATE));await index.onClinic(pick(index.data.clinics.findIndex((c:any)=>c.clinicId===id('clinic-east'))));await index.onDoctor(pick(index.data.doctors.findIndex((d:any)=>d.doctorId===id('booking-lin'))));
  const slot=index.data.slots.find((s:any)=>s.available);assert.ok(slot);index.onBook({currentTarget:{dataset:{key:slot.key}}});assert.ok(navigation.startsWith('/pages/booking/index?'));assert.equal(navigation.includes('name='),false);page=openPage();assert.equal(page.data.phase,'needs_login');
 });
 await check('实际预约页验证合成患者，独立token哈希入库，不发Cookie且不把token写data',async()=>{
  await page.onLogin({detail:{value:{loginName:'alice',password:env.ADC_PATIENT_A_PASSWORD!}}});assert.equal(page.data.patient.subjectId,id('subject-alice'));assert.equal(Object.hasOwn(page.data,'credentials'),false);assert.equal(JSON.stringify(page.data).includes(tokens.get('alice')!),false);
  const token=tokens.get('alice')!,hash=createHash('sha256').update('miniprogram-local:'+token).digest('hex');assert.equal((await db.pool.query('SELECT identity_id FROM adc_auth.session WHERE token_hash=$1',[hash])).rows[0].identity_id,id('identity-alice'));
  assert.equal((await call('/patient/session',undefined,{Authorization:'Bearer '+token})).status,401);
 });
 await check('网页与小程序认证互不混用，原网页来源校验保持',async()=>{
  const browser=await call('/patient/session',loginBody,{Origin:env.ADMIN_ORIGIN!});assert.equal(browser.status,201);assert.ok(browser.cookie);
  assert.equal((await call('/miniprogram/quote',page._selection,{Cookie:browser.cookie,Authorization:'Bearer '+tokens.get('alice')})).status,403);
  assert.equal((await call('/patient/appointments',{...page._selection,requestId:randomUUID(),name:'合成',contact:'13800000001',intention:'隔离核验'},{Authorization:'Bearer '+tokens.get('alice')})).status,403);
  assert.equal((await call('/patient/logout',{}, {Origin:env.ADMIN_ORIGIN!,Cookie:browser.cookie})).status,201);
 });
 await check('核对完整安排只读不占位，额外身份字段不能伪造预约主体',async()=>{
  page.onInput(input('intention','隔离小程序咨询'));await page.onQuote();assert.equal(page.data.phase,'quoted');assert.equal(page.data.quote.doctorName,'林医生');assert.ok(page.data.quote.range.includes('09:00'));assert.equal((await db.pool.query('SELECT count(*)::int n FROM adc.appointment')).rows[0].n,0);
  assert.equal((await call('/miniprogram/appointments',{...page._selection,requestId:randomUUID(),name:'合成',contact:'13800000001',intention:'隔离核验',subjectId:id('subject-bob')},{Authorization:'Bearer '+tokens.get('alice')})).status,400);
 });
 await check('服务器保存成功但模拟丢回复，页面先GET原结果，不重复POST',async()=>{
  page.onConfirm(confirm);dropAfter=true;await page.onSubmit();assert.equal(page.data.phase,'unknown');firstBody=structuredClone(lastBody);assert.equal((await db.pool.query('SELECT count(*)::int n FROM adc.appointment')).rows[0].n,1);const posts=uiRequests.filter(r=>r.path.endsWith('/miniprogram/appointments')).length;
  await check('全新客户端重新验证后凭最小存储GET找回已保存请求，不恢复token正文或重发',async()=>{
   const oldToken=tokens.get('alice'),freshJournal=createReceiptStore(platform,()=>base),freshApi=createPatientApi(platform,()=>base,{journal:freshJournal});
   assert.deepEqual(Object.keys(freshJournal.read()).sort(),['appointmentId','kind','requestId','schemaVersion','subjectId']);
   const fresh=miniprogramPage(platform,base,{page:'recovery',globalData:{localBookingEnabled:true,miniBookingApi:freshApi,miniReceiptStore:freshJournal}});fresh.onLoad();assert.equal(fresh.data.receipt,null);
   await fresh.login({detail:{value:{loginName:'alice',password:env.ADC_PATIENT_A_PASSWORD!}}});assert.equal(fresh.data.verified,true);const posts=uiRequests.filter(r=>r.path.endsWith('/miniprogram/appointments')).length;
   await check('原结果已完成但凭证删除失败，保原后再次GET核实而不重发',async()=>{
    const remove=(platform as any).removeStorageSync;let failed=false;(platform as any).removeStorageSync=(key:string)=>{if(!failed){failed=true;throw Error('isolated cleanup failure');}remove(key);};
    await fresh.recover();assert.equal(fresh.data.result,null);assert.ok(fresh.data.receipt);assert.ok(journal.read());assert.equal(uiRequests.filter(r=>r.path.endsWith('/miniprogram/appointments')).length,posts);
    await fresh.recover();(platform as any).removeStorageSync=remove;assert.ok(fresh.data.result.id);
   });assert.ok(fresh.data.result.id);assert.equal(uiRequests.filter(r=>r.path.endsWith('/miniprogram/appointments')).length,posts);assert.equal(journal.read(),null);await freshApi.logout();tokens.set('alice',oldToken!);fresh.onUnload();
  });
  await page.onRecover();assert.equal(page.data.phase,'saved');firstId=page.data.result.id;assert.equal(uiRequests.filter(r=>r.path.endsWith('/miniprogram/appointments')).length,posts);
  const a=(await db.pool.query('SELECT booking_subject_id,booked_name,booked_contact,row_version FROM adc.appointment WHERE appointment_id=$1',[firstId])).rows[0];assert.equal(a.booking_subject_id,id('subject-alice'));assert.equal(a.booked_name,page.data.form.name);assert.equal(a.booked_contact,page.data.form.contact);assert.equal(Number(a.row_version),1);
 });
 await check('原请求重复两次仍只有一份预约原版和去重，另一患者不能取得原结果或抢满时段',async()=>{
  for(let i=0;i<2;i++){const r=await call('/miniprogram/appointments',firstBody,{Authorization:'Bearer '+tokens.get('alice')});assert.equal(r.status,201);assert.equal(r.data.id,firstId);assert.equal(r.data.repeated,true);}
  assert.equal((await db.pool.query('SELECT count(*)::int n FROM adc.appointment_revision WHERE appointment_id=$1',[firstId])).rows[0].n,1);
  const b=await call('/miniprogram/local-session',{loginName:'bob',password:env.ADC_PATIENT_B_PASSWORD});assert.equal(b.status,201);tokens.set('bob',b.data.token);
  const h={Authorization:'Bearer '+b.data.token},status=await call('/miniprogram/appointment-commands/'+firstBody.requestId,undefined,h);assert.equal(status.status,200);assert.equal(status.data.state,'not_found');assert.equal('appointmentId'in status.data,false);
  assert.equal((await call('/miniprogram/appointments',{...firstBody,requestId:randomUUID(),name:'合成乙',contact:'13800000002'},h)).status,409);
 });
 await check('返回公开页重查已满状态，另选相邻时段不沿用原确认',async()=>{
  await page.onLogout();page.onUnload();await index.refresh();assert.equal(index.data.slots[0].label,'已约满');const next=index.data.slots.find((s:any)=>s.available);index.onBook({currentTarget:{dataset:{key:next.key}}});page=openPage();await page.onLogin({detail:{value:{loginName:'alice',password:env.ADC_PATIENT_A_PASSWORD!}}});page.onInput(input('intention','隔离第二相邻时段'));await page.onQuote();assert.equal(page.data.confirmed,false);assert.equal(page.data.phase,'quoted');
 });
 await check('模拟发送前断网，核实未见后明确确认，复查再用原编号正文保存一次',async()=>{
  page.onConfirm(confirm);dropBefore=true;await page.onSubmit();assert.equal(page.data.phase,'unknown');const original=structuredClone(state.pending.body);assert.equal((await db.pool.query('SELECT count(*)::int n FROM adc.appointment')).rows[0].n,1);
  await page.onRecover();assert.equal(page.data.retryAllowed,true);await page.onRetrySubmit();assert.equal((await db.pool.query('SELECT count(*)::int n FROM adc.appointment')).rows[0].n,1);
  page.onRetryConfirm(confirm);await page.onRetrySubmit();assert.equal(page.data.phase,'saved');assert.deepEqual(lastBody,original);assert.equal((await db.pool.query('SELECT count(*)::int n FROM adc.appointment')).rows[0].n,2);
  const rows=(await db.pool.query('SELECT patient_actor_id,command_code FROM adc.command_dedup WHERE request_key=$1',[original.requestId])).rows;assert.equal(rows.length,1);assert.equal(rows[0].patient_actor_id,id('subject-alice'));assert.equal(rows[0].command_code,'book');await page.onLogout();page.onUnload();index.onUnload();
 });
 await check('会话失效及生产模式均拒绝写入，不增加原版或命令',async()=>{
  const h={Authorization:'Bearer '+tokens.get('bob')};await db.pool.query('UPDATE adc_auth.session SET expires_at=clock_timestamp()-interval \'1 second\' WHERE identity_id=$1',[id('identity-bob')]);
  assert.equal((await call('/miniprogram/quote',page._selection,h)).status,401);assert.equal((await call('/miniprogram/logout',{},h)).status,201);
  const old=process.env.NODE_ENV;process.env.NODE_ENV='production';try{assert.equal((await call('/miniprogram/local-session',loginBody)).status,403);}finally{if(old===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=old;}
  for(const table of ['appointment','appointment_revision','command_dedup'])assert.equal((await db.pool.query('SELECT count(*)::int n FROM adc.'+table)).rows[0].n,2);
  assert.equal((await db.pool.query('SELECT count(*)::int n FROM adc_auth.session')).rows[0].n,0);
 });

 await check('实际我的预约Page读取本人分页结果，改约保留原编号采用原版本',async()=>{
  await api.login(loginBody);const listToken=tokens.get('alice');
  const mine=miniprogramPage(platform,base,{page:'appointments',globalData:globals});await mine.onLoad();assert.equal(mine.data.rows.length,2);
  mine.reschedule({currentTarget:{dataset:{id:firstId}}});assert.equal(state.reschedule.id,firstId);assert.equal(state.reschedule.version,1);
  await index.onLoad();await index.onDate(pick(process.env.BOOKING_DEMO_DATE));await index.onClinic(pick(index.data.clinics.findIndex((c:any)=>c.clinicId===id('clinic-east'))));await index.onDoctor(pick(index.data.doctors.findIndex((d:any)=>d.doctorId===id('booking-lin'))));
  const slot=index.data.slots.find((r:any)=>r.available);index.onBook({currentTarget:{dataset:{key:slot.key}}});page=openPage();assert.equal(page.data.changing,true);
  await page.onLogin({detail:{value:{loginName:'alice',password:env.ADC_PATIENT_A_PASSWORD!}}});await page.onQuote();page.onConfirm(confirm);await page.onSubmit();assert.equal(page.data.result.id,firstId);assert.equal(page.data.result.version,2);
  assert.equal((await call('/miniprogram/logout',{}, {Authorization:'Bearer '+listToken})).status,201);
  await mine.restore();assert.equal(mine.data.rows.find((r:any)=>r.id===firstId).version,2);
  mine.chooseCancel({currentTarget:{dataset:{id:firstId}}});mine.input(input('reason','合成患者变更安排'));mine.confirm(confirm);dropAfter=true;await mine.cancel();assert.equal(mine.data.unknown,true);
  const before=uiRequests.filter(r=>r.path.endsWith('/cancel')).length;await mine.onRecover();assert.equal(mine.data.unknown,false);assert.equal(uiRequests.filter(r=>r.path.endsWith('/cancel')).length,before);
  const row=mine.data.rows.find((r:any)=>r.id===firstId);assert.equal(row.disposition,'cancelled');assert.equal(row.version,3);assert.equal(row.canCancel,false);assert.equal(row.canReschedule,false);mine.onUnload();
 });
 await check('原生改约取消拒其他患者与旧版本，原取消请求重放不新增',async()=>{
  const original=structuredClone(state.pending.body),a={Authorization:'Bearer '+tokens.get('alice')};
  for(let n=0;n<2;n++){const r=await call('/miniprogram/appointments/'+firstId+'/cancel',original,a);assert.equal(r.status,201);assert.equal(r.data.version,3);assert.equal(r.data.repeated,true);}
  const b=await call('/miniprogram/local-session',{loginName:'bob',password:env.ADC_PATIENT_B_PASSWORD});assert.equal(b.status,201);const h={Authorization:'Bearer '+b.data.token};
  assert.equal((await call('/miniprogram/appointments/queue',undefined,h)).data.items.length,0);
  assert.equal((await call('/miniprogram/appointments/'+firstId+'/cancel',{requestId:randomUUID(),version:3,reason:'合成越界'},h)).status,404);
  assert.equal((await call('/miniprogram/appointments/'+firstId+'/cancel',{requestId:randomUUID(),version:1,reason:'合成旧版'},a)).status,409);
  await call('/miniprogram/logout',{},h);await api.logout();state.pending=null;state.reschedule=null;
  assert.equal((await db.pool.query('SELECT count(*)::int n FROM adc_auth.session')).rows[0].n,0);
 });

 const retiredKeys:string[]=[];
 await check('重建后的实际恢复Page明确结束三类未执行提交，原预约正文原版均不改',async()=>{
  const before=(await db.pool.query('SELECT to_jsonb(t)::text row FROM adc.appointment t ORDER BY appointment_id')).rows;
  const active=(await db.pool.query("SELECT appointment_id,row_version FROM adc.appointment WHERE disposition='active' ORDER BY appointment_id LIMIT 1")).rows[0];
  for(const kind of ['book','reschedule','cancel']){
   const requestId=randomUUID(),target=kind==='book'?null:active.appointment_id;retiredKeys.push(requestId);
   journal.save({schemaVersion:1,subjectId:id('subject-alice'),kind,requestId,appointmentId:target});
   const recovery=miniprogramPage(platform,base,{page:'recovery',globalData:globals});recovery.onLoad();await recovery.login({detail:{value:{loginName:'alice',password:env.ADC_PATIENT_A_PASSWORD!}}});assert.equal(recovery.data.verified,true);
   const posts=uiRequests.length;await recovery.retire();assert.equal(uiRequests.length,posts);await recovery.recover();assert.equal(recovery.data.canRetire,true);
   recovery.confirmRetire(confirm);await recovery.retire();assert.equal(recovery.data.receipt,null);assert.equal(journal.read(),null);
   const header={Authorization:'Bearer '+tokens.get('alice')},body={kind,...(target?{appointmentId:target}:{}),confirmed:true};
   for(let n=0;n<2;n++){const repeat=await call('/miniprogram/request-retirements/'+requestId,body,header);assert.equal(repeat.status,201);assert.equal(repeat.data.repeated,true);}
   const late=kind==='cancel'?{requestId:requestId.toUpperCase(),version:1,reason:'迟到原取消'}:{...firstBody,requestId:requestId.toUpperCase(),...(target?{version:1}:{})};
   const route=kind==='book'?'/miniprogram/appointments':'/miniprogram/appointments/'+target+'/'+kind;
   assert.equal((await call(route,late,header)).status,409);
   const status=await api.status(requestId,kind,target);assert.equal(status.state,'retired');await api.logout();recovery.onUnload();
  }
  assert.deepEqual((await db.pool.query('SELECT to_jsonb(t)::text row FROM adc.appointment t ORDER BY appointment_id')).rows,before);
  assert.equal((await db.pool.query("SELECT count(*)::int n FROM adc.command_dedup WHERE result_kind='retired_appointment_request'")).rows[0].n,3);
 });
 await check('已保存请求、其他患者请求与处理中请求不能被封存',async()=>{
  await api.login(loginBody);const header={Authorization:'Bearer '+tokens.get('alice')};
  assert.equal((await call('/miniprogram/request-retirements/'+firstBody.requestId,{kind:'book',confirmed:true},header)).status,409);
  assert.equal((await call('/miniprogram/request-retirements/'+randomUUID(),{kind:'book',confirmed:false},header)).status,409);
  const b=await call('/miniprogram/local-session',{loginName:'bob',password:env.ADC_PATIENT_B_PASSWORD});assert.equal(b.status,201);const other={Authorization:'Bearer '+b.data.token};
  assert.equal((await call('/miniprogram/request-retirements/'+retiredKeys[0],{kind:'book',confirmed:true},other)).status,403);await call('/miniprogram/logout',{},other);
  const key=randomUUID(),lock=await db.pool.connect();try{
   await lock.query('BEGIN');for(const k of ['request:'+key,'patient-request:'+id('subject-alice')+':'+key])await lock.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[k]);
   const state=await api.status(key);assert.equal(state.state,'processing');
   assert.equal((await call('/miniprogram/request-retirements/'+key,{kind:'book',confirmed:true},header)).status,409);
   assert.equal((await db.pool.query('SELECT count(*)::int n FROM adc.command_dedup WHERE request_key=$1',[key])).rows[0].n,0);
  }finally{await lock.query('ROLLBACK');lock.release();}await api.logout();
 });
 await check('原生合成验证连续八次失败后限流，第九次不建立会话',async()=>{
  for(let n=0;n<8;n++)assert.equal((await call('/miniprogram/local-session',{loginName:'unknown-synthetic',password:'wrong-test-only'})).status,401);
  assert.equal((await call('/miniprogram/local-session',{loginName:'unknown-synthetic',password:'wrong-test-only'})).status,429);
  assert.equal((await db.pool.query('SELECT count(*)::int n FROM adc_auth.session')).rows[0].n,0);
 });
 const counts={appointments:(await db.pool.query('SELECT count(*)::int n FROM adc.appointment')).rows[0].n,revisions:(await db.pool.query('SELECT count(*)::int n FROM adc.appointment_revision')).rows[0].n,commands:(await db.pool.query('SELECT count(*)::int n FROM adc.command_dedup')).rows[0].n};
 await writeFile(join(root,'artifacts/296-miniprogram-retirement-check.json'),JSON.stringify({batch:296,checks:passed.length,passed,actualPublicPage:true,actualBookingPage:true,realBackend:true,networkDataMocked:false,transportLossInjected:attempts,uiRequests,apiChecks,counts,isolatedDatabase:name,wechatCompiled:false,wechatTested:false,developmentBusinessWrites:false,checkedAt:new Date().toISOString()},null,2));console.log('Mini-program booking checks passed:',passed.length);
}finally{
 if(app)await app.close();for(const k of Object.keys(process.env))if(!(k in originalEnv))delete process.env[k];Object.assign(process.env,originalEnv);
 try{if(created){await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()',[name]);await admin.query('DROP DATABASE "'+name+'"');}}finally{await admin.end();}
 assert.ok(folder.startsWith(resolve(root,'.runtime')+sep)&&/^adc_miniprogram_retirement_test_\d+$/.test(name));await rm(folder,{recursive:true,force:true});
}
