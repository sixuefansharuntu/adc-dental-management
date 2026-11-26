import{test}from'node:test';import assert from'node:assert/strict';import{historyKind,historyNumber}from'../apps/api/src/clinical-history-domain';
test('原版查询类别只接受三个白名单',()=>{for(const k of['record','treatment','bill'])assert.equal(historyKind(k),k);for(const k of['receipt','../record',null,[],{}])assert.throws(()=>historyKind(k));});
test('游标保持正安全整数，不接受数组负数或科学计数',()=>{assert.equal(historyNumber(undefined,'游标'),undefined);assert.equal(historyNumber('53','游标'),53);for(const x of['',0,'0','-1','1.2','1e3','9007199254740992',[],['2']])assert.throws(()=>historyNumber(x,'游标'));});
test('每页版本数1到50，超限拒绝而非截断',()=>{for(const n of['1','25','50'])assert.equal(historyNumber(n,'页数',50),Number(n));for(const n of['51','99999'])assert.throws(()=>historyNumber(n,'页数',50));});
