import assert from 'node:assert/strict';
import pg from 'pg';
import {randomUUID} from 'node:crypto';
import {rm,writeFile} from 'node:fs/promises';
import {resolve,join,sep} from 'node:path';
import {config,pgOptions,root} from './config.mjs';
import {migrate} from './migrate.mjs';
import {seedBooking} from './seed-booking.mts';
import {fixtureId as id} from './seed.mjs';
import {databaseSnapshot} from './snapshot-startup186.mjs';
import {miniprogramPage} from '../tests/helpers/miniprogram-page';

const env=await config(),originalEnv={...process.env},name='adc_miniprogram_public_test_'+Date.now(),folder=resolve(root,'.runtime',name);
assert.match(name,/^adc_miniprogram_public_test_\d+$/);assert.ok(folder.startsWith(resolve(root,'.runtime')+sep));
const admin=new pg.Client(pgOptions(env,'postgres'));await admin.connect();
let app:any,created=false;
const passed:string[]=[],requests:any[]=[];
const check=async(label:string,f:()=>Promise<void>)=>{await f();passed.push(label);console.log('PASS',label);};
try{
 await admin.query('CREATE DATABASE "'+name+'"');created=true;
 Object.assign(process.env,env,{PGDATABASE:name,ADC_ISOLATED_SEED_REPORTS:'true',BOOKING_DEMO_DATE:new Date(Date.now()+86400000).toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'})});
 await migrate();await seedBooking();
 const{createApp}=await import('../apps/api/src/app.ts'),{DatabaseService}=await import('../apps/api/src/database.service.ts');
 app=await createApp();await app.listen(0,'127.0.0.1');const base=(await app.getUrl())+'/api/v1',db=app.get(DatabaseService),isolatedEnv={...env,PGDATABASE:name};
 const east=id('clinic-east'),lin=id('booking-lin'),zhou=id('booking-zhou'),date=process.env.BOOKING_DEMO_DATE!;
 // Preflight fixture columns before running the complete page journey.
 await db.pool.query('EXPLAIN SELECT public_enabled FROM adc.employee WHERE employee_id=$1',[lin]);
 await db.pool.query('EXPLAIN SELECT service_version_id,service_code,version_no,duration_minutes FROM adc.booking_service_version');
 await db.pool.query('EXPLAIN SELECT schedule_id,starts_at,ends_at,public_status,can_receive FROM adc.doctor_schedule');
 await db.pool.query('EXPLAIN SELECT self_service_enabled FROM adc.clinic_booking_rule_version');
 let refreshStopped=0;
 const page=miniprogramPage({
  request(options:any){
   assert.equal(options.method,'GET');assert.equal(options.header,undefined);
   const u=new URL(options.url);for(const[k,v]of Object.entries(options.data))u.searchParams.set(k,String(v));
   assert.ok(['/api/v1/catalogue','/api/v1/availability'].includes(u.pathname));
   const controller=new AbortController();
   fetch(u,{method:'GET',signal:controller.signal}).then(async r=>{const data=await r.json();requests.push({method:'GET',path:u.pathname,status:r.status});options.success({statusCode:r.status,data});}).catch(()=>options.fail());
   return{abort(){controller.abort();}};
  },stopPullDownRefresh(){refreshStopped++;}
 },base);
 const pick=(value:any)=>({detail:{value}});
 const selectDoctor=async(doctorId:string)=>{await page.onClinic(pick(page.data.clinics.findIndex((c:any)=>c.clinicId===east)));await page.onDoctor(pick(page.data.doctors.findIndex((d:any)=>d.doctorId===doctorId)));};
 const onlyReads=async(f:()=>Promise<void>)=>{const before=await databaseSnapshot(isolatedEnv);await f();assert.deepEqual(await databaseSnapshot(isolatedEnv),before);};

 await check('实际小程序Page入口匿名读取真实目录，两个诊所三名医生，仅采用公开投影',async()=>onlyReads(async()=>{
  await page.onLoad();page.onShow();assert.equal(page.data.clinics.length,2);assert.equal(new Set(page._items.map((r:any)=>r.doctorId)).size,3);assert.equal(page.data.error,'');
  for(const key of ['credential','phone','patientId','contact_value','localIdentity'])assert.equal(JSON.stringify(page.data).includes(key),false,key);
 }));
 await check('真实未来完整时段按诊所医生服务日期读取，诊所切换无旧结果',async()=>onlyReads(async()=>{
  await page.onDate(pick(date));await selectDoctor(lin);assert.equal(page.data.error,'');assert.equal(page.data.slots.length,12);assert.equal(page.data.availableCount,12);assert.equal(page.data.slots[0].range,'09:00—09:30');
  await page.onClinic(pick(page.data.clinics.findIndex((c:any)=>c.clinicId!==east)));assert.equal(page.data.selected.clinicId,id('clinic-river'));assert.equal(page.data.availableCount,12);
 }));
 await check('真实周医生暂停时段与可约时段分别展示，不把暂停算可约',async()=>onlyReads(async()=>{
  await selectDoctor(zhou);assert.equal(page.data.slots.length,6);assert.equal(page.data.availableCount,3);assert.equal(page.data.slots.filter((s:any)=>s.label==='暂停预约').length,3);assert.equal(page.data.slots[0].range,'09:00—10:00');
 }));
 await check('无排班日期返回正常空结果，不误报网络失败',async()=>onlyReads(async()=>{
  await page.onDate(pick(new Date(Date.parse(date)+30*86400000).toISOString().slice(0,10)));assert.equal(page.data.slots.length,0);assert.equal(page.data.error,'');
 }));
 const service=(await db.pool.query('SELECT to_jsonb(v) row FROM adc.booking_service_version v WHERE doctor_id=$1',[lin])).rows[0].row;
 const extraService={...service,service_version_id:randomUUID(),service_code:'MP_LONG',version_no:1,service_name:'隔离长时评估',duration_minutes:60};
 await db.pool.query('INSERT INTO adc.booking_service_version SELECT * FROM jsonb_populate_record(NULL::adc.booking_service_version,$1::jsonb)',[JSON.stringify(extraService)]);
 await check('真实新增服务经目录刷新出现，切换采用服务版本与60分钟完整时长',async()=>onlyReads(async()=>{
  await page.refresh();await selectDoctor(lin);await page.onService(pick(page.data.services.findIndex((s:any)=>s.serviceVersionId===extraService.service_version_id)));await page.onDate(pick(date));
  assert.equal(page.data.selected.durationMinutes,60);assert.equal(page.data.slots.length,6);assert.equal(page.data.slots[0].range,'09:00—10:00');
 }));
 const shift=(await db.pool.query('SELECT to_jsonb(s) row FROM adc.doctor_schedule s WHERE doctor_id=$1 ORDER BY starts_at LIMIT 1',[lin])).rows[0].row;
 const night=new Date(Date.parse(date)+12*86400000).toISOString().slice(0,10),next=new Date(Date.parse(night)+86400000).toISOString().slice(0,10);
 const nightShift={...shift,schedule_id:randomUUID(),starts_at:night+'T23:30:00+08:00',ends_at:next+'T00:30:00+08:00'};
 await db.pool.query('INSERT INTO adc.doctor_schedule SELECT * FROM jsonb_populate_record(NULL::adc.doctor_schedule,$1::jsonb)',[JSON.stringify(nightShift)]);
 await check('真实跨午夜完整服务显示次日终点，不截为起点',async()=>onlyReads(async()=>{
  await page.onDate(pick(night));assert.equal(page.data.slots.length,1);assert.equal(page.data.slots[0].range,'23:30—次日 00:30');assert.equal(page.data.availableCount,1);
 }));
 await check('真实未开放和不可接诊状态刷新同步变化，GET不改任何表',async()=>{
  for(const[publicStatus,canReceive,label]of [['not_open',true,'尚未开放'],['open',false,'不可接诊']]as const){
   await db.pool.query('UPDATE adc.doctor_schedule SET public_status=$2,can_receive=$3 WHERE schedule_id=$1',[nightShift.schedule_id,publicStatus,canReceive]);
   await onlyReads(async()=>{await page.onPullDownRefresh();assert.equal(page.data.slots[0].label,label);assert.equal(page.data.availableCount,0);});
  }
  assert.equal(refreshStopped,2);
 });
 await db.pool.query('UPDATE adc.doctor_schedule SET public_status=\'open\',can_receive=true WHERE schedule_id=$1',[nightShift.schedule_id]);
 const rule=(await db.pool.query('SELECT to_jsonb(r) row FROM adc.clinic_booking_rule_version r WHERE clinic_id=$1 ORDER BY version_no DESC LIMIT 1',[east])).rows[0].row;
 await db.pool.query('INSERT INTO adc.clinic_booking_rule_version SELECT * FROM jsonb_populate_record(NULL::adc.clinic_booking_rule_version,$1::jsonb)',[JSON.stringify({...rule,rule_version_id:randomUUID(),version_no:rule.version_no+1,effective_from:new Date().toISOString(),self_service_enabled:false,created_at:new Date().toISOString()})]);
 await check('真实规则停用不显示可约，返回页面重读最新规则',async()=>onlyReads(async()=>{
  page.onHide();assert.equal(page.data.slots.length,0);await page.onShow();assert.equal(page.data.slots[0].label,'暂不可预约');assert.equal(page.data.availableCount,0);
 }));
 const linServices=(await db.pool.query('SELECT to_jsonb(v) row FROM adc.booking_service_version v WHERE doctor_id=$1',[lin])).rows;
 for(const {row}of linServices)await db.pool.query('INSERT INTO adc.booking_service_version SELECT * FROM jsonb_populate_record(NULL::adc.booking_service_version,$1::jsonb)',[JSON.stringify({...row,service_version_id:randomUUID(),version_no:row.version_no+1,effective_from:new Date().toISOString(),enabled:false,created_at:new Date().toISOString()})]);
 await check('医生全部服务下架后重取目录，旧医生介绍服务及排班被移除',async()=>onlyReads(async()=>{
  await page.onPullDownRefresh();assert.equal(page._items.some((r:any)=>r.doctorId===lin),false);assert.notEqual(page.data.selected.doctorId,lin);assert.equal(page.data.slots.length,0);assert.equal(page.data.error,'');
 }));
 page.onUnload();assert.ok(requests.every(r=>r.status===200));
 await writeFile(join(root,'artifacts/291-miniprogram-public-check.json'),JSON.stringify({batch:291,checks:passed.length,passed,actualPageEntry:true,realBackend:true,networkMocked:false,wxRequestBridge:'Node fetch adapter; no WeChat runtime',requests,isolatedDatabase:name,fixtureWritesOnly:true,developmentBusinessWrites:false,wechatCompiled:false,wechatTested:false,checkedAt:new Date().toISOString()},null,2));
 console.log('Mini program public integration checks passed:',passed.length);
}finally{
 if(app)await app.close();
 for(const k of Object.keys(process.env))if(!(k in originalEnv))delete process.env[k];Object.assign(process.env,originalEnv);
 try{if(created){await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()',[name]);await admin.query('DROP DATABASE "'+name+'"');}}finally{await admin.end();}
 assert.ok(folder.startsWith(resolve(root,'.runtime')+sep)&&/^adc_miniprogram_public_test_\d+$/.test(name));await rm(folder,{recursive:true,force:true});
}
