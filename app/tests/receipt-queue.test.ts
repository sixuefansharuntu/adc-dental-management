import test from'node:test';import assert from'node:assert/strict';import{receiptQueueQuery,receiptQueueSummary}from'../apps/api/src/receipt-queue-domain';
const base={clinicId:'11111111-1111-4111-8111-111111111111',date:'2026-10-25'};
test('实收查询日期诊所必填，默认50条，可按姓名和类别筛选',()=>{assert.equal(receiptQueueQuery(base).limit,50);assert.equal(receiptQueueQuery({...base,q:' 王 ',kind:'sale',limit:'10'}).search,'王');});
test('实收查询拒未知键多值非法日期ID类别与姓名控制字符',()=>{for(const extra of[{bad:'1'},{date:'2026-02-30'},{clinicId:'x'},{q:['a','b']},{kind:['sale']},{kind:'x'},{q:'a\nb'},{q:'x'.repeat(101)}])assert.throws(()=>receiptQueueQuery({...base,...extra}));});
test('实收每页1至50、续页拒空和超长标识',()=>{for(const extra of[{limit:'0'},{limit:'51'},{limit:'1e1'},{after:''},{after:['x']},{after:'x'.repeat(3001)}])assert.throws(()=>receiptQueueQuery({...base,...extra}));});
test('实收完整金额以分精确合计，不产生浮点误差',()=>{assert.deepEqual(receiptQueueSummary([{kind:'bill',amount:'999999999999.99'},{kind:'sale',amount:'0.02'},{kind:'bill',amount:'0.10'}]),{total:3,bills:2,sales:1,amount:'1000000000000.11',billAmount:'1000000000000.09',saleAmount:'0.02'});assert.equal(receiptQueueSummary([]).amount,'0.00');});
