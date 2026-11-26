import test from 'node:test';
import assert from 'node:assert/strict';
import {beijingToday,bookingDays} from '../apps/admin/src/booking-calendar';

test('患者日期按北京时间跨日，不依赖电脑所在时区',()=>{
  assert.equal(beijingToday(new Date('2026-11-12T15:59:59Z')),'2026-11-12');
  assert.equal(beijingToday(new Date('2026-11-12T16:00:00Z')),'2026-11-13');
});
test('七日日期可跨年，保持连续且不重复',()=>{
  assert.deepEqual(bookingDays('2026-12-29'),['2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-02','2027-01-03','2027-01-04']);
});
test('日期栏正确保留闰日',()=>{
  assert.deepEqual(bookingDays('2028-02-28').slice(0,3),['2028-02-28','2028-02-29','2028-03-01']);
});
test('空值和不存在的日期回到北京当天，不使用旧演示日期',()=>{
  for(const date of ['', '2026-02-30','bad'])assert.equal(bookingDays(date,new Date('2026-11-12T18:00:00Z'))[0],'2026-11-13');
});
