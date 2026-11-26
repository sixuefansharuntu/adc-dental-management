import assert from 'node:assert/strict';
import test from 'node:test';
import {visitQueueQuery,visitQueueState,visitQueueSummary} from '../apps/api/src/visit-queue-domain';
const base={clinicId:'00000000-0000-4000-8000-000000000001',date:'2026-10-27'};
test('接诊查询要求实际到院日期和明确诊所，默认全进展50项',()=>{
 assert.deepEqual(visitQueueQuery({...base,q:' 丁 '}),{...base,search:'丁',doctorId:null,state:'all',limit:50,cursor:null});
 assert.throws(()=>visitQueueQuery({date:base.date}));
});
test('接诊筛选拒非法日期/ID/多值/未知条件及超长控制字符',()=>{
 for(const value of[{date:'2026-02-30'},{clinicId:'bad'},{doctorId:'bad'},{state:'active'},
  {state:['all','left']},{q:['丁']},{q:'a\nb'},{q:'字'.repeat(101)},{unknown:'x'}])
  assert.throws(()=>visitQueueQuery({...base,...value}));
});
test('接诊续页每页1—50，拒空或过大标识',()=>{
 for(const value of[{limit:'0'},{limit:'51'},{limit:'1e1'},{limit:['1','2']},{cursor:''},{cursor:'x'.repeat(3001)}])
  assert.throws(()=>visitQueueQuery({...base,...value}));
});
test('早退没有开始结束仍为已离开，不推定治疗完成',()=>{
 const early={arrivedAt:'2026-10-27T09:00:00+08:00',startedAt:null,endedAt:null,leftAt:'2026-10-27T09:10:00+08:00'};
 assert.equal(visitQueueState(early),'left');assert.equal(early.startedAt,null);assert.equal(early.endedAt,null);
 assert.equal(visitQueueState({startedAt:null,endedAt:null,leftAt:null}),'waiting');
 assert.equal(visitQueueState({startedAt:'at'}),'in_progress');
 assert.equal(visitQueueState({startedAt:'at',endedAt:'later'}),'ended');
});
test('四类统计互斥且总和覆盖完整范围，跟预约状态无关',()=>{
 const rows=[{}, {startedAt:'a'},{startedAt:'a',endedAt:'b'}, {leftAt:'c',originalAppointmentState:'cancelled'}, {startedAt:'a',endedAt:'b',leftAt:'c'}];
 assert.deepEqual(visitQueueSummary(rows),{total:5,waiting:1,inProgress:1,ended:1,left:2});
});
