import test from 'node:test';import assert from 'node:assert/strict';
import {createRenderer,ref}from'vue';import {useMyAppointments}from'../apps/admin/src/use-my-appointments';
function mounted(){
 const identity=ref<any>({identityId:'identity-a',subjectId:'subject-a'}),requests:any[]=[],node=()=>({parent:null as any,children:[]as any[]});
 let model:any,unauthorized=0;
 const renderer=createRenderer<any,any>({createElement:node,createText:node,createComment:node,
  setText(){},setElementText(){},patchProp(){},insert(child,parent){child.parent=parent;parent.children.push(child);},
  remove(child){if(child.parent)child.parent.children=child.parent.children.filter((x:any)=>x!==child);},
  parentNode:n=>n.parent,nextSibling:()=>null});
 const app=renderer.createApp({setup(){model=useMyAppointments({identity:()=>identity.value,
  read:(path,signal)=>new Promise((resolve,reject)=>requests.push({path,signal,resolve,reject})),
  unauthorized:()=>{unauthorized++;identity.value=null;}});return()=>null;}});app.mount(node());
 return {model,identity,requests,app,unauthorized:()=>unauthorized};
}
const result=(id:string)=>({items:[{id}],clinics:[{id:'clinic-'+id,name:id}],summary:{total:1},total:1,nextCursor:null,asOf:'2026-10-27T00:00:00Z'});
test('新查询先完成后旧响应才返回，列表和统计仍属新条件',async()=>{
 const c=mounted();try{const first=c.model.load();c.model.state.value='cancelled';const second=c.model.load();
  assert.equal(c.requests[0].signal.aborted,true);c.requests[1].resolve(result('new'));await second;
  c.requests[0].resolve(result('old'));await first;assert.deepEqual(c.model.items.value,[{id:'new'}]);
  assert.equal(c.model.loading.value,false);assert.equal(c.model.dirty.value,false);
 }finally{c.app.unmount();}
});
test('查询途中切换本人身份立即清旧内容，旧身份响应不得回填',async()=>{
 const c=mounted();try{const first=c.model.load();c.requests[0].resolve(result('a'));await first;
  const pending=c.model.load();c.identity.value={identityId:'identity-b',subjectId:'subject-b'};
  assert.equal(c.requests[1].signal.aborted,true);assert.deepEqual(c.model.items.value,[]);assert.deepEqual(c.model.clinics.value,[]);
  c.requests[1].resolve(result('a-late'));await pending;assert.deepEqual(c.model.items.value,[]);
  const next=c.model.load();c.requests[2].resolve(result('b'));await next;assert.deepEqual(c.model.items.value,[{id:'b'}]);
 }finally{c.app.unmount();}
});
test('401清除旧预约和诊所，并交给父组件撤销当前身份',async()=>{
 const c=mounted();try{const first=c.model.load();c.requests[0].resolve(result('a'));await first;
  const next=c.model.load();c.requests[1].reject(Object.assign(Error('验证失效'),{status:401}));await next;
  assert.equal(c.unauthorized(),1);assert.equal(c.identity.value,null);assert.deepEqual(c.model.items.value,[]);
  assert.deepEqual(c.model.clinics.value,[]);assert.equal(c.model.loading.value,false);
 }finally{c.app.unmount();}
});
test('离开组件取消未完成读取，随后到达的响应不能重建私有列表',async()=>{
 const c=mounted();const pending=c.model.load();c.app.unmount();assert.equal(c.requests[0].signal.aborted,true);
 c.requests[0].resolve(result('late'));await pending;assert.deepEqual(c.model.items.value,[]);
 assert.equal(c.model.summary.value,null);assert.equal(c.model.loading.value,false);
});
