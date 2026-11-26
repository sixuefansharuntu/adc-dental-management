import test from'node:test';import assert from'node:assert/strict';import{salesQueueQuery,salesQueueSummary,salesHistoryVersion}from'../apps/api/src/sales-queue-domain';
const q={clinicId:'11111111-1111-4111-8111-111111111111',date:'2026-10-25'};
test('销售查询默认50条，两维独立，姓名字面包含',()=>{assert.equal(salesQueueQuery(q).limit,50);const r=salesQueueQuery({...q,payment:'unpaid',delivery:'delivered',q:' 甲 '});assert.equal(r.search,'甲');assert.equal(r.delivery,'delivered');});
test('销售查询拒未知多值非法日期ID状态和超长控制字符',()=>{for(const x of[{x:'1'},{q:['x']},{q:'a\nb'},{q:'a'.repeat(101)},{payment:'delivered'},{delivery:'paid'},{date:'2026-02-30'},{clinicId:'bad'}])assert.throws(()=>salesQueueQuery({...q,...x}));});
test('销售分页只接受1至50及非空有界标识',()=>{for(const x of[{limit:'0'},{limit:'51'},{limit:'1e1'},{cursor:''},{cursor:['x']},{cursor:'x'.repeat(3001)}])assert.throws(()=>salesQueueQuery({...q,...x}));});
test('销售两维各自覆盖总数，应付金额以分精确合计',()=>{const r=salesQueueSummary([{paid:true,delivered:false,total:'0.10'},{paid:false,delivered:true,total:'0.20'}]);assert.deepEqual(r,{total:2,paid:1,unpaid:1,delivered:1,pending:1,orderAmount:'0.30'});});
test('销售历史版本拒空多值指数和非整数',()=>{assert.equal(salesHistoryVersion('54'),54);assert.equal(salesHistoryVersion(undefined),undefined);for(const x of['',[],['1','2'],'0','1e2','1.5'])assert.throws(()=>salesHistoryVersion(x));});
