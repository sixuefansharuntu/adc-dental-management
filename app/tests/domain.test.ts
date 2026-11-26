import test from 'node:test';
import assert from 'node:assert/strict';
import { dateInput, changeInput, slotsFor } from '../apps/api/src/domain';

test('日期拒绝自动溢出和非标格式，接受闰日', () => {
  assert.throws(() => dateInput('2026-02-30'));
  assert.throws(() => dateInput('2026-2-03'));
  assert.throws(() => dateInput(['2026-10-25']));
  assert.equal(dateInput('2028-02-29'),'2028-02-29');
});
test('维护命令拒绝未知字段、非法版本与状态', () => {
  const body = { publicStatus:'open',version:1,requestId:'11111111-1111-4111-a111-111111111111' };
  assert.throws(() => changeInput({...body,version:0}));
  assert.throws(() => changeInput({...body,publicStatus:'approved'}));
  assert.throws(() => changeInput({...body,doctorId:'another-doctor'}));
  assert.equal(changeInput(body).version,1);
});
test('时长取配置，最后不足完整时长的区间不输出', () => {
  const slots=slotsFor(new Date('2026-10-25T09:00:00+08:00'),new Date('2026-10-25T10:20:00+08:00'),30,true);
  assert.equal(slots.length,2);
  assert.equal(slots[1]?.endsAt,'2026-10-25T02:00:00.000Z');
});
test('暂停时段不标可用，缺时长不得自行猜测', () => {
  assert.equal(slotsFor(new Date('2026-10-25T01:00Z'),new Date('2026-10-25T02:00Z'),30,false)[0]?.status,'unavailable');
  assert.throws(() => slotsFor(new Date(),new Date(),0,true));
});
