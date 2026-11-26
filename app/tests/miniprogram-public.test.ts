import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {miniprogramPage, simulateMiniCloud} from './helpers/miniprogram-page';
const require=createRequire(import.meta.url),{createPublicGet}=require('../apps/miniprogram/lib/public-request.js');
const tick=()=>new Promise<void>(resolve=>setImmediate(resolve));
const pick=(value:any)=>({detail:{value}});
const rows=[
 {clinicId:'east',clinicName:'东城',doctorId:'lin',doctorName:'林医生',serviceVersionId:'lin-30',serviceName:'咨询',durationMinutes:30,address:'东城路',specialty:'综合',introduction:'林介绍'},
 {clinicId:'east',clinicName:'东城',doctorId:'lin',doctorName:'林医生',serviceVersionId:'lin-60',serviceName:'评估',durationMinutes:60},
 {clinicId:'east',clinicName:'东城',doctorId:'zhou',doctorName:'周医生',serviceVersionId:'zhou-60',serviceName:'修复评估',durationMinutes:60},
 {clinicId:'river',clinicName:'滨江',doctorId:'chen',doctorName:'陈医生',serviceVersionId:'chen-30',serviceName:'咨询',durationMinutes:30}
];
function setup(booking = false){
 const {cloud,calls}=simulateMiniCloud();let stopped=0;const navigation:string[]=[];
 const page=miniprogramPage({cloud,stopPullDownRefresh(){stopped++;},navigateTo({url}:any){navigation.push(url);}},undefined,{globalData:{localBookingEnabled:booking}});
 return{page,calls,stopped:()=>stopped,navigation};
}
function result(page:any,status='available',start?:string){
 const s=page.data.selected,startsAt=start||page.data.date+'T09:00:00+08:00';
 return{queriedAt:page.data.date+'T08:00:00+08:00',groups:[{scheduleId:'schedule',clinicId:s.clinicId,doctorId:s.doctorId,serviceVersionId:s.serviceVersionId,slots:[{startsAt,endsAt:new Date(Date.parse(startsAt)+s.durationMinutes*60000).toISOString(),status}]}]};
}
async function ready(s=setup()){
 const load=s.page.onLoad();s.page.onShow();assert.equal(s.calls.length,1);
 s.calls[0].reply({items:rows});await tick();s.calls[1].reply(result(s.page));await load;return s;
}
test('小程序实际入口只发正式匿名GET，按完整筛选查询并展示公开资料',async()=>{
 const{page,calls}=await ready();assert.equal(calls.length,2);assert.ok(calls.every(c=>c.name==='adcApi'&&c.options.method==='GET'&&c.options.token===''));
 assert.equal(calls[0].options.path,'/catalogue');
 assert.equal(calls[1].options.path,'/availability');
 assert.deepEqual(calls[1].options.data,{date:page.data.date,clinicId:'east',doctorId:'lin',serviceVersionId:'lin-30'});
 assert.equal(page.data.selected.introduction,'林介绍');assert.equal(page.data.slots[0].range,'09:00—09:30');assert.equal(page.data.availableCount,1);assert.equal(page.data.loading,false);
});
test('诊所切换重新派生医生服务，不夹带上店选择或旧时段',async()=>{
 const{page,calls}=await ready(),p=page.onClinic(pick('1'));assert.equal(page.data.slots.length,0);
 assert.deepEqual(page.data.doctorNames,['陈医生']);assert.equal(page.data.selected.serviceVersionId,'chen-30');
 assert.equal(calls[2].options.data.clinicId,'river');calls[2].reply(result(page,'full'));await p;assert.equal(page.data.slots[0].label,'已约满');assert.equal(page.data.availableCount,0);
});
test('医生和服务各自切换采用实际版本及完整时长',async()=>{
 const{page,calls}=await ready();let p=page.onService(pick(1));assert.equal(calls[2].options.data.serviceVersionId,'lin-60');calls[2].reply(result(page));await p;
 assert.equal(page.data.slots[0].range,'09:00—10:00');p=page.onDoctor(pick(1));assert.equal(page.data.selected.doctorId,'zhou');assert.equal(page.data.services.length,1);calls[3].reply(result(page,'paused'));await p;assert.equal(page.data.slots[0].label,'暂停预约');
});
test('相同筛选ABA的迟到回复不能覆盖最新时段或忙态',async()=>{
 const{page,calls}=await ready();const old=page.onDoctor(pick(1)),oldData=result(page,'full');const latest=page.onDoctor(pick(0));
 calls[3].reply(result(page,'available'));await latest;const expected=structuredClone(page.data);calls[2].reply(oldData);await old;assert.deepEqual(page.data,expected);
});
test('较早查询失败不覆盖较新结果',async()=>{
 const{page,calls}=await ready();const a=page.onService(pick(1)),b=page.onService(pick(0));calls[3].reply(result(page));await b;calls[2].fail();await a;assert.equal(page.data.error,'');assert.equal(page.data.slots.length,1);
});
test('较早查询结束不能解锁最新查询',async()=>{
 const{page,calls}=await ready();const a=page.onDoctor(pick(1)),old=result(page),b=page.onDoctor(pick(0));calls[2].reply(old);await a;assert.equal(page.data.loading,true);assert.equal(page.data.slots.length,0);calls[3].reply(result(page));await b;
});
test('切换日期立即清理旧结果，按北京时间标次日终点',async()=>{
 const{page,calls}=await ready(),p=page.onDate(pick('2028-02-29'));assert.equal(page.data.slots.length,0);assert.equal(calls[2].options.data.date,'2028-02-29');
 calls[2].reply(result(page,'available','2028-02-29T23:45:00+08:00'));await p;assert.equal(page.data.slots[0].range,'23:45—次日 00:15');
});
test('所有不可预约原因各自表达，未知状态保守显示',async()=>{
 const{page,calls}=await ready();for(const[status,label]of Object.entries({full:'已约满',paused:'暂停预约',not_open:'尚未开放',closed:'不可接诊',past:'已过时',config_unavailable:'暂不可预约',future_status:'暂不可预约'})){
  const p=page.onDate(pick(page.data.date));calls.at(-1).reply(result(page,status));await p;assert.equal(page.data.slots[0].label,label);assert.equal(page.data.slots[0].available,false);assert.equal(page.data.availableCount,0);
 }
});
test('查询失败清旧结果且可重试，不伪装空排班',async()=>{
 const s=await ready(),{page,calls}=s,p=page.onDate(pick(page.data.date));calls[2].reply({message:'PRIVATE内部错误'},503);await p;assert.equal(page.data.slots.length,0);assert.match(page.data.error,/重试/);assert.ok(!page.data.error.includes('PRIVATE'));
 const r=page.onRetry();calls[3].reply({items:rows});await tick();calls[4].reply(result(page));await r;assert.equal(page.data.error,'');assert.equal(page.data.slots.length,1);
});
test('空目录为正常结果，不发送缺少筛选的时段请求',async()=>{
 const{page,calls}=setup(),p=page.onLoad();calls[0].reply({items:[]});await p;assert.equal(calls.length,1);assert.equal(page.data.ready,true);assert.equal(page.data.selected,null);assert.equal(page.data.error,'');
});
test('空时段与错误区分',async()=>{
 const{page,calls}=await ready(),p=page.onDate(pick(page.data.date));calls[2].reply({queriedAt:new Date().toISOString(),groups:[]});await p;assert.equal(page.data.ready,true);assert.equal(page.data.error,'');assert.equal(page.data.slots.length,0);
});
test('坏目录拒绝并清公开资料，不对坏筛选继续发请求',async()=>{
 for(const items of [null,[{...rows[0],durationMinutes:0}],[rows[0],rows[0]]]){
  const{page,calls}=await ready(),p=page.refresh();calls[2].reply({items});await p;assert.equal(page.data.ready,false);assert.equal(page.data.selected,null);assert.equal(page.data.slots.length,0);assert.ok(page.data.error);assert.equal(calls.length,3);
 }
});
test('错目标、错日期、不完整时长与重复时段整批拒绝',async()=>{
 for(const change of [(r:any)=>{r.groups[0].clinicId='other';},(r:any)=>{r.groups[0].serviceVersionId='other';},(r:any)=>{r.groups[0].slots[0].startsAt='invalid';},(r:any)=>{r.groups[0].slots[0].endsAt='2030-01-01T00:00:00Z';},(r:any)=>{r.groups[0].slots.push(r.groups[0].slots[0]);}]){
  const{page,calls}=await ready(),p=page.onDate(pick(page.data.date)),r=result(page);change(r);calls[2].reply(r);await p;assert.equal(page.data.slots.length,0);assert.ok(page.data.error);
 }
});
test('下拉刷新保留合法选择和日期且重取目录，结束原生刷新',async()=>{
 const s=await ready(),{page,calls}=s;let p=page.onDoctor(pick(1));calls[2].reply(result(page));await p;p=page.onDate(pick('2028-01-02'));calls[3].reply(result(page));await p;
 p=page.onPullDownRefresh();calls[4].reply({items:rows});await tick();assert.equal(page.data.selected.doctorId,'zhou');assert.equal(page.data.date,'2028-01-02');calls[5].reply(result(page));await p;assert.equal(s.stopped(),1);
});
test('刷新遇到医生下架或服务换版回到有效选择，清除旧介绍',async()=>{
 const{page,calls}=await ready(),p=page.refresh();calls[2].reply({items:rows.slice(2)});await tick();assert.equal(page.data.selected.doctorId,'zhou');assert.equal(page.data.selected.introduction,'');assert.equal(calls[3].options.data.serviceVersionId,'zhou-60');calls[3].reply(result(page));await p;
});
test('隐藏后迟到回复无效，返回页面重新读取目录与时段',async()=>{
 const{page,calls}=await ready(),p=page.onDate(pick(page.data.date)),r=result(page);page.onHide();const updates=page.updates;calls[2].reply(r);await p;assert.equal(page.updates,updates);assert.equal(page.data.slots.length,0);
 const show=page.onShow();calls[3].reply({items:rows});await tick();calls[4].reply(result(page));await show;assert.equal(page.data.slots.length,1);
});
test('卸载后不再写页面也不再发请求',async()=>{
 const{page,calls}=setup(),p=page.onLoad();page.onUnload();const updates=page.updates;calls[0].reply({items:rows});await p;await page.onShow();assert.equal(page.updates,updates);assert.equal(calls.length,1);
});
test('无效日期及越界选择不发送请求也不破坏已有选择',async()=>{
 const{page,calls}=await ready(),before=structuredClone(page.data);for(const value of ['2027-02-29','2028-02-30','2028-13-01','2028-2-02','bad'])await page.onDate(pick(value));
 for(const value of [-1,99,'01','0.5','',null])await page.onDoctor(pick(value));assert.equal(calls.length,2);assert.deepEqual(page.data,before);
});
test('七天日期可跨闰日，选择日期发起正确查询并可回到今天', async()=>{
 const {page,calls}=await ready();
 const jump=page.onDate(pick('2028-02-27'));
 assert.deepEqual(page.data.days.slice(0,4).map((d:any)=>d.key),['2028-02-27','2028-02-28','2028-02-29','2028-03-01']);
 calls.at(-1)!.reply(result(page));await jump;
 const march=page.onDayChoice({currentTarget:{dataset:{date:'2028-03-01'}}});
 assert.equal(calls.at(-1)!.options.data.date,'2028-03-01');
 assert.equal(page.data.days[0].key,'2028-02-27');
 calls.at(-1)!.reply(result(page));await march;
 const today=page.onToday();
 assert.equal(page.data.days[0].key,page.data.today);
 calls.at(-1)!.reply(result(page));await today;
});
test('时段先选择再进入核对，已满不可选，刷新会清除旧选择', async()=>{
 const {page,calls,navigation}=setup(true);
 const load=page.onLoad();
 const serviceId='00000001-1111-4111-8111-111111111111';
 const scheduleId='00000002-1111-4111-8111-111111111111';
 const ruleVersionId='00000003-1111-4111-8111-111111111111';
 calls[0].reply({items:[{...rows[0],serviceVersionId:serviceId}]});await tick();
 const response=result(page);
 Object.assign(response.groups[0],{scheduleId,ruleVersionId});
 response.groups[0].slots.push(result(page,'full',page.data.date+'T14:00:00+08:00').groups[0].slots[0]);
 calls[1].reply(response);await load;
 const slotEvent=(key:string)=>({currentTarget:{dataset:{key}}});
 const [available,full]=page.data.slots;
 assert.deepEqual(page.data.groups.map((g:any)=>g.name),['上午']);
 page.onToggleUnavailable();
 assert.deepEqual(page.data.groups.map((g:any)=>g.name),['上午','下午']);
 page.onSelectSlot(slotEvent(full.key));page.onContinue();assert.equal(navigation.length,0);
 page.onSelectSlot(slotEvent(available.key));assert.equal(navigation.length,0);
 const refresh=page.onDate(pick(page.data.date));page.onContinue();assert.equal(navigation.length,0);
 calls[2].reply(response);await refresh;
 page.onSelectSlot(slotEvent(available.key));page.onContinue();page.onContinue();assert.equal(navigation.length,1);
 const url=new URL(navigation[0],'https://example.test');
 assert.equal(url.pathname,'/pages/booking/index');
 assert.deepEqual(Object.fromEntries(url.searchParams),{scheduleId,serviceVersionId:serviceId,ruleVersionId,startsAt:new Date(available.startsAt).toISOString()});
});
test('下拉失败也结束刷新，旧公开资料被清空',async()=>{
 const s=await ready(),p=s.page.onPullDownRefresh();s.calls[2].fail();await p;assert.equal(s.stopped(),1);assert.equal(s.page.data.selected,null);assert.ok(s.page.data.error);
});
test('匿名请求边界拒写路径，取消任务和同步网络异常可控',async()=>{
 let called=0,aborted=0;const get=createPublicGet({request(){called++;return{abort(){aborted++;}};}},()=>'/api/v1');
 await assert.rejects(get('/patient/session',{}).promise,/不支持/);assert.equal(called,0);const t=get('/catalogue');t.abort();assert.equal(aborted,1);
 const bad=createPublicGet({request(){throw Error('PRIVATE');}},()=>'/api/v1');await assert.rejects(bad('/catalogue').promise,/暂时无法连接/);
});
