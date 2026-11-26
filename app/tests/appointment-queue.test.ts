import assert from'node:assert/strict';import test from'node:test';import{appointmentQueueQuery,appointmentContactQuery,queueState,queueSummary,queueMatches}from'../apps/api/src/appointment-queue-domain';
const d={date:'2026-10-27'};
test('预约队列默认全部/50，线索去首尾空白',()=>{assert.deepEqual(appointmentQueueQuery({...d,q:' 患者 '}),{date:d.date,clinicId:null,doctorId:null,search:'患者',state:'all',limit:50,cursor:null});});
test('预约条件拒未知/多值/非法ID日期及控制字符',()=>{for(const extra of[{state:'x'},{state:['all','due']},{doctorId:'x'},{q:'a\nb'},{q:'x'.repeat(101)},{unknown:'x'},{date:'2026-02-30'}])assert.throws(()=>appointmentQueueQuery({...d,...extra}));});
test('分页范围和联系独立参数受限',()=>{for(const limit of['0','51','1e1',['1','2']])assert.throws(()=>appointmentQueueQuery({...d,limit}));assert.equal(appointmentContactQuery({}).limit,20);assert.throws(()=>appointmentContactQuery({state:'all'}));assert.throws(()=>appointmentContactQuery({cursor:''}));});
test('待联系严格超过五分钟，不改变预约状态或推定未到',()=>{const r={startsAt:'2026-10-27T09:00:00+08:00',endsAt:'2026-10-27T10:00:00+08:00',disposition:'active',visitId:null};assert.equal(queueState(r,new Date('2026-10-27T09:05:00+08:00')).contactDue,false);assert.equal(queueState(r,new Date('2026-10-27T09:05:00.001+08:00')).contactDue,true);assert.equal(queueState(r,new Date('2026-10-27T10:00:00+08:00')).noShowAllowed,true);assert.equal(r.disposition,'active');});
test('已有实际到院不进入待联系/未到动作，旧取消可与到院统计重叠',()=>{const now=new Date('2026-10-27T12:00:00+08:00'),r={startsAt:'2026-10-27T09:00:00+08:00',endsAt:'2026-10-27T10:00:00+08:00',disposition:'cancelled',visitId:'visit'};assert.equal(queueState(r,now).contactDue,false);assert.equal(queueMatches(r,'arrived',now),true);const s=queueSummary([r],now);assert.equal(s.cancelled,1);assert.equal(s.arrived,1);assert.equal(s.total,1);});
test('完整统计独立于状态筛选与当前页',()=>{const now=new Date('2026-10-27T12:00:00+08:00'),rows=[{startsAt:'2026-10-27T09:00:00+08:00',endsAt:'2026-10-27T10:00:00+08:00',disposition:'active',visitId:null},{disposition:'cancelled',visitId:null}];assert.equal(queueSummary(rows,now).total,2);assert.equal(rows.filter(r=>queueMatches(r,'due',now)).length,1);});
import { appointmentBoard, boardStatus } from '../apps/admin/src/appointment-board';

test('排班图按北京时间排列，重叠占独立列并保留跨午夜时段', () => {
 const appointment = {id:'a',doctorId:'zhou',doctorName:'周医生',name:'示例患者',serviceName:'复诊',
  startsAt:'2026-11-25T23:00:00+08:00',endsAt:'2026-11-26T00:30:00+08:00',disposition:'active'};
 const overlap = {...appointment,id:'b',startsAt:'2026-11-25T23:15:00+08:00',endsAt:'2026-11-25T23:45:00+08:00'};
 const board=appointmentBoard('2026-11-25',[{id:'zhou',name:'周医生'},{id:'lin',name:'林医生'}],
  [overlap,appointment,{...appointment,id:'invalid',startsAt:'invalid'}]);
 assert.equal(board.columns[0].lanes,2);
 assert.deepEqual(board.columns[0].events.map(e=>[e.appointment.id,e.lane]),[['a',0],['b',1]]);
 assert.equal(board.columns[0].events[0].range,'23:00—次日 00:30');
 assert.equal(board.startMinute / 60 + board.hours,25);
 assert.equal(board.columns[1].events.length,0);
 assert.equal(boardStatus({...appointment,visitId:'visit',visitState:'left'}).label,'已离开');
 assert.equal(boardStatus({...appointment,visitId:'visit'}).label,'已到院');
});
