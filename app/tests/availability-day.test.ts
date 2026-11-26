import test from 'node:test';import assert from 'node:assert/strict';
import {dailySlotStarts,operatingForSlot}from'../apps/api/src/availability-domain';
import {bookingTimeRange,bookingPeriod}from'../apps/admin/src/booking-time';
import {readFile}from'node:fs/promises';
import {parse,compileScript}from'@vue/compiler-sfc';
const at=(s:string)=>new Date(s+'+08:00');
test('跨午夜完整服务归开始日，次日延续原23:20网格不改成零点',()=>{
 const start=at('2026-10-28T23:20:00'),end=at('2026-10-29T02:30:00');
 assert.deepEqual(dailySlotStarts(start,end,60,'2026-10-28'),[+start]);
 assert.deepEqual(dailySlotStarts(start,end,60,'2026-10-29'),[+at('2026-10-29T00:20:00'),+at('2026-10-29T01:20:00')]);
});
test('零点起点仅属于次日；不足完整服务尾段不放出',()=>{
 assert.deepEqual(dailySlotStarts(at('2026-10-28T23:00:00'),at('2026-10-29T00:00:00'),60,'2026-10-29'),[]);
 assert.deepEqual(dailySlotStarts(at('2026-10-28T23:00:00'),at('2026-10-29T00:15:00'),60,'2026-10-29'),[]);
});
test('多日长排班直接定位当天时段，不循环历史天数',()=>{
 assert.equal(dailySlotStarts(at('2026-01-01T00:00:00'),at('2027-01-01T00:00:00'),1,'2026-10-29').length,1440);
 assert.throws(()=>dailySlotStarts(at('2026-10-28T23:00:00'),at('2026-10-29T00:00:00'),0,'2026-10-28'));
});
test('执业有效终日以服务结束前一刻判断，跨过零点须次日有效',()=>{
 const facts={practices:[{valid_from:'2026-01-01',valid_to:'2026-10-28'}],closures:[]};
 assert.equal(operatingForSlot(facts,+at('2026-10-28T23:00:00'),+at('2026-10-29T00:00:00')),true);
 assert.equal(operatingForSlot(facts,+at('2026-10-28T23:20:00'),+at('2026-10-29T00:20:00')),false);
});
test('局部休诊只关闭相交完整时段，相接边界仍可用',()=>{
 const facts={practices:[{valid_from:'2026-01-01',valid_to:null}],closures:[{effective_from:at('2026-10-29T00:20:00'),effective_to:at('2026-10-29T01:20:00')}]};
 assert.equal(operatingForSlot(facts,+at('2026-10-28T23:20:00'),+at('2026-10-29T00:20:00')),true);
 assert.equal(operatingForSlot(facts,+at('2026-10-29T00:20:00'),+at('2026-10-29T01:20:00')),false);
 assert.equal(operatingForSlot(facts,+at('2026-10-29T01:20:00'),+at('2026-10-29T02:20:00')),true);
});
test('患者端与前台完整时段标签明确次日，含年末及零点',()=>{
 assert.equal(bookingTimeRange('2026-10-28T09:00:00+08:00','2026-10-28T10:00:00+08:00'),'09:00—10:00');
 assert.equal(bookingTimeRange('2026-12-31T23:20:00+08:00','2027-01-01T00:20:00+08:00'),'23:20—次日 00:20');
 assert.equal(bookingTimeRange('2026-10-28T23:00:00+08:00','2026-10-29T00:00:00+08:00'),'23:00—次日 00:00');
 assert.equal(bookingPeriod('2026-10-28T23:20:00+08:00'),'夜间');
 assert.equal(bookingPeriod('2026-10-29T00:20:00+08:00'),'凌晨');
});
test('实际Vue模板的时段函数须暴露为setup绑定，避免构建通过但渲染失败',async()=>{
 for(const name of['BookingApp','FrontdeskWorkspace']){
  const filename=new URL('../apps/admin/src/'+name+'.vue',import.meta.url);
  const {descriptor,errors}=parse(await readFile(filename,'utf8'));
  assert.deepEqual(errors,[]);
  const compiled=compileScript(descriptor,{id:name});
  assert.ok(compiled.bindings.bookingTimeRange,name+'未向模板提供时段函数');
 }
});
