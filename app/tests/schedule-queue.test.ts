import assert from 'node:assert/strict';
import test from 'node:test';
import {scheduleQueueQuery,scheduleDayRange,scheduleMatches,scheduleSummary} from '../apps/api/src/schedule-queue-domain';
const base={date:'2026-10-27',clinicId:'00000000-0000-4000-8000-000000000001'};
test('排班查询明确诊所覆盖日期，默认全状态50项',()=>{
 assert.deepEqual(scheduleQueueQuery(base),{...base,doctorId:null,internal:'all',publicState:'all',limit:50,cursor:null});
 assert.throws(()=>scheduleQueueQuery({date:base.date}));
});
test('排班条件拒非法日期ID状态多值及未知键',()=>{
 for(const value of[{date:'2026-02-30'},{doctorId:'bad'},{internal:'true'},
  {publicState:'cancelled'},{internal:['all','available']},{q:'医生'},
  {limit:'0'},{limit:'51'},{limit:['10','20']},{cursor:''}])assert.throws(()=>scheduleQueueQuery({...base,...value}));
});
test('覆盖日期为上海零点左闭至次日零点右开，不用UTC日',()=>{
 assert.deepEqual(scheduleDayRange('2026-10-27'),{start:'2026-10-26T16:00:00.000Z',end:'2026-10-27T16:00:00.000Z'});
 assert.deepEqual(scheduleDayRange('2026-12-31'),{start:'2026-12-30T16:00:00.000Z',end:'2026-12-31T16:00:00.000Z'});
});
test('内部接诊与公开状态独立按交集筛选，不能把未开放当不可接诊',()=>{
 const row={can_receive:true,public_status:'not_open'};
 assert.equal(scheduleMatches(row,{internal:'available',publicState:'all'}),true);
 assert.equal(scheduleMatches(row,{internal:'available',publicState:'open'}),false);
 assert.equal(scheduleMatches(row,{internal:'unavailable',publicState:'all'}),false);
 assert.equal(row.public_status,'not_open');
});
test('完整统计分别覆盖内部两类与公开三类，不能五类相加当总数',()=>{
 const rows=[{can_receive:true,public_status:'open'},{can_receive:true,public_status:'paused'},
  {can_receive:true,public_status:'not_open'},{can_receive:false,public_status:'not_open'}];
 assert.deepEqual(scheduleSummary(rows),{total:4,available:3,unavailable:1,open:1,paused:1,notOpen:2});
});
