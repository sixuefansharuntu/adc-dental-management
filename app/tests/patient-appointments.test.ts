import assert from 'node:assert/strict';import test from 'node:test';
import {patientAppointmentsQuery,patientAppointmentUpcoming,patientAppointmentActions,patientAppointmentsSummary}from'../apps/api/src/patient-appointments-domain';
test('本人预约默认全期全店全状态20份，不接受来路主体或身份',()=>{
 assert.deepEqual(patientAppointmentsQuery({}),{fromDate:null,toDate:null,clinicId:null,state:'all',limit:20,cursor:null});
 for(const key of['subjectId','patientId','identityId','accountId'])assert.throws(()=>patientAppointmentsQuery({[key]:'x'}));
});
test('日期须成对、合法、含端1—366天，支持全期清空',()=>{
 assert.equal(patientAppointmentsQuery({fromDate:'2026-01-01',toDate:'2027-01-01'}).fromDate,'2026-01-01');
 for(const q of[{fromDate:'2026-01-01'},{fromDate:'2026-02-30',toDate:'2026-03-01'},
  {fromDate:'2026-02-01',toDate:'2026-01-01'},{fromDate:'2026-01-01',toDate:'2027-01-02'}])assert.throws(()=>patientAppointmentsQuery(q));
 assert.equal(patientAppointmentsQuery({fromDate:'',toDate:''}).fromDate,null);
});
test('拒绝伪造多值筛选与超量页数，续页参数有界',()=>{
 for(const q of[{clinicId:'bad'},{state:'closed'},{state:['active','cancelled']},{limit:'0'},
  {limit:'51'},{limit:['10','20']},{cursor:''},{cursor:'x'.repeat(3001)}])assert.throws(()=>patientAppointmentsQuery(q));
});
test('小程序可独立查询历史并按最近时间查未来预约，其他筛选不接受新排序',()=>{
 assert.equal(patientAppointmentsQuery({state:'history'}).state,'history');
 assert.equal(patientAppointmentsQuery({state:'upcoming',sort:'soonest'}).soonest,true);
 assert.throws(()=>patientAppointmentsQuery({state:'history',sort:'soonest'}));
 assert.throws(()=>patientAppointmentsQuery({state:'upcoming',sort:['soonest','soonest']}));
});
test('未来待就诊须有效且尚无到院，不因过期自动标未到',()=>{
 const now=new Date('2026-10-28T09:00:00+08:00'),r={disposition:'active',startsAt:'2026-10-28T09:00:00+08:00',actualVisit:false};
 assert.equal(patientAppointmentUpcoming(r,now),false);
 assert.equal(patientAppointmentUpcoming({...r,startsAt:'2026-10-28T09:01:00+08:00'},now),true);
 assert.equal(patientAppointmentUpcoming({...r,startsAt:'2026-10-28T09:01:00+08:00',actualVisit:true},now),false);
 assert.equal(r.disposition,'active');
});
test('改约取消可办理提示依原截止、原规则及真实到院，不替代命令重验',()=>{
 const now=new Date('2026-10-28T08:00:00+08:00'),r={disposition:'active',ruleEnabled:true,actualVisit:false,
  cancelCutoffAt:'2026-10-28T08:00:00+08:00',rescheduleCutoffAt:'2026-10-28T08:01:00+08:00'};
 assert.deepEqual(patientAppointmentActions(r,now),{canCancel:false,canReschedule:true});
 assert.deepEqual(patientAppointmentActions({...r,actualVisit:true},now),{canCancel:false,canReschedule:false});
 assert.deepEqual(patientAppointmentActions({...r,ruleEnabled:false},now),{canCancel:false,canReschedule:false});
});
test('全范围状态统计保留过期有效预约，未来待就诊为有效预约子集',()=>{
 const now=new Date('2026-10-28T09:00:00+08:00'),rows=[{disposition:'active',startsAt:'2026-10-28T10:00:00+08:00'},
  {disposition:'active',startsAt:'2026-10-27T10:00:00+08:00'},{disposition:'cancelled'},
  {disposition:'arrived'},{disposition:'no_show'}];
 assert.deepEqual(patientAppointmentsSummary(rows,now),{total:5,active:2,upcoming:1,cancelled:1,arrived:1,noShow:1});
});
