import test from'node:test';import assert from'node:assert/strict';import{createRenderer,ref}from'vue';
import{useBookingRecovery,parseBookingPending,pendingKind}from'../apps/admin/src/use-booking-recovery';
import{bookingRecoveryQuery}from'../apps/api/src/booking-recovery-domain';
const uid=(n:number)=>'10000000-0000-4000-8000-'+String(n).padStart(12,'0'),identity={subjectId:uid(1),identityId:uid(2)},path='/patient/appointments',body={requestId:uid(3),scheduleId:uid(4),serviceVersionId:uid(5),ruleVersionId:uid(6),startsAt:'2030-10-28T02:00:00.000Z',name:'合成患者',contact:'13800000000',intention:'合成预约'},saved={id:uid(7),version:1,disposition:'active'},status={state:'completed',kind:'book',appointmentId:uid(7),version:1,disposition:'active'};
const pending=()=>({path,body:{...body},label:'预约成功',...identity});
function mounted(initial?:string){
 const actor=ref<any>({...identity}),map=new Map<string,string>(),writes:any[]=[],reads:any[]=[],completed:any[]=[],node=()=>({parent:null as any,children:[]as any[]});let model:any,failGet=false,failSet=false,failRemove=false,failCompleted=false;
 if(initial!==undefined)map.set('adc.pendingBooking:'+identity.subjectId,initial);
 const storage={getItem:(k:string)=>{if(failGet)throw Error('storage unavailable');return map.get(k)||null;},setItem:(k:string,v:string)=>{if(failSet)throw Error('quota');map.set(k,v);},removeItem:(k:string)=>{if(failRemove)throw Error('storage locked');map.delete(k);}};
 const renderer=createRenderer<any,any>({createElement:node,createText:node,createComment:node,setText(){},setElementText(){},patchProp(){},insert(c,p){c.parent=p;p.children.push(c);},remove(){},parentNode:n=>n.parent,nextSibling:()=>null});
 const app=renderer.createApp({setup(){model=useBookingRecovery({identity:()=>actor.value,storage:()=>storage,read:(path,signal)=>new Promise((resolve,reject)=>reads.push({path,signal,resolve,reject})),write:(path,body)=>new Promise((resolve,reject)=>writes.push({path,body:JSON.parse(JSON.stringify(body)),resolve,reject})),completed:(r,label)=>{completed.push({r,label});if(failCompleted)throw Error("refresh failed");},unauthorized:()=>{actor.value=null;}});return()=>null;}});app.mount(node());
 return{model,actor,map,writes,reads,completed,app,failGet:(v:boolean)=>failGet=v,failSet:(v:boolean)=>failSet=v,failRemove:(v:boolean)=>failRemove=v,failCompleted:(v:boolean)=>failCompleted=v};
}
test('核实参数只接受三类请求及必要目标，不接受主体或多值注入',()=>{
 assert.deepEqual(bookingRecoveryQuery({kind:'book'}),{kind:'book',appointmentId:undefined});assert.equal(bookingRecoveryQuery({kind:'cancel',appointmentId:uid(7)}).appointmentId,uid(7));
 for(const q of[{kind:'x'},{kind:['book']},{kind:'book',subjectId:uid(1)},{kind:'book',appointmentId:uid(7)},{kind:'cancel'},{kind:'reschedule',appointmentId:['x']}])assert.throws(()=>bookingRecoveryQuery(q));
});
test('旧主体缓存兼容，新缓存强绑身份，损坏或跨身份不恢复',()=>{
 const p=pending();delete(p as any).identityId;assert.equal(parseBookingPending(JSON.stringify(p),identity).identityId,identity.identityId);
 for(const p of[{...pending(),subjectId:uid(8)},{...pending(),identityId:uid(8)},{...pending(),path:'/staff/appointments'},{...pending(),body:{...body,subjectId:uid(8)}},{...pending(),body:{...body,requestId:'bad'}}])assert.throws(()=>parseBookingPending(JSON.stringify(p),identity));
 assert.throws(()=>parseBookingPending('x'.repeat(12001),identity));assert.equal(pendingKind({...pending(),path:path+'/'+uid(7)+'/cancel'}),'cancel');
});
test('原请求先缓存再发出，回复丢失后只读核实不补写',async()=>{
 const c=mounted();try{const sending=c.model.send(path,body,'预约成功');assert.equal(c.writes.length,1);assert.equal(JSON.parse(c.map.values().next().value!).body.requestId,body.requestId);c.writes[0].reject(TypeError('network lost'));await sending;assert.equal(c.model.state.value,'unknown');
 const verifying=c.model.verify();assert.equal(c.writes.length,1);assert.match(c.reads[0].path,/appointment-commands/);c.reads[0].resolve(status);await verifying;assert.equal(c.writes.length,1);assert.equal(c.model.pending.value,null);assert.equal(c.completed[0].r.originalResult,true);assert.equal(c.map.size,0);
 }finally{c.app.unmount();}
});
test('换时段能清除已拒绝的冲突提示，但保留结果不明确的原请求',async()=>{
 const c=mounted();try{
  const rejected=c.model.send(path,body,'预约成功');c.writes[0].reject(Object.assign(Error('原时段与本人预约冲突'),{status:409,code:'OWN_APPOINTMENT_OVERLAP'}));await rejected;
  assert.match(c.model.error.value,/冲突/);assert.equal(c.model.ownConflict.value,true);assert.equal(c.model.pending.value,null);
  c.model.dismissFeedback();assert.equal(c.model.error.value,'');assert.equal(c.model.ownConflict.value,false);
  const unknown=c.model.send(path,{...body,requestId:uid(8)},'预约成功');c.writes[1].reject(TypeError('network lost'));await unknown;
  c.model.dismissFeedback();assert.match(c.model.error.value,/暂不能确认/);assert.equal(c.model.pending.value.body.requestId,uid(8));
 }finally{c.app.unmount();}
});
test('未查到不自动重试，必须明确确认且沿用原请求内容及标识',async()=>{
 const c=mounted(JSON.stringify(pending()));try{const p=c.model.verify();c.reads[0].resolve({state:'not_found',kind:'book'});await p;assert.equal(c.writes.length,0);await c.model.retry(false);assert.equal(c.writes.length,0);
 const r=c.model.retry(true);assert.deepEqual(c.writes[0].body,body);c.writes[0].resolve(saved);await r;assert.equal(c.completed.length,1);assert.equal(c.map.size,0);
 }finally{c.app.unmount();}
});
test('处理中不允许重试或并行核实',async()=>{
 const c=mounted(JSON.stringify(pending()));try{const p=c.model.verify();await c.model.verify();assert.equal(c.reads.length,1);c.reads[0].resolve({state:'processing',kind:'book'});await p;await c.model.retry(true);assert.equal(c.writes.length,0);assert.ok(c.model.pending.value);
 }finally{c.app.unmount();}
});
test('存储写入失败不发送，仍可核实，恢复后明确重试',async()=>{
 const c=mounted();try{c.failSet(true);await c.model.send(path,body,'预约成功');assert.equal(c.writes.length,0);assert.ok(c.model.pending.value);assert.match(c.model.error.value,/尚未发出/);
 const v=c.model.verify();c.reads[0].resolve({state:'not_found',kind:'book'});await v;c.failSet(false);const r=c.model.retry(true);assert.equal(c.writes.length,1);c.writes[0].resolve(saved);await r;assert.equal(c.map.size,0);
 }finally{c.app.unmount();}
});
test('存储读取异常或坏缓存阻止覆盖原依据和新提交',async()=>{
 const c=mounted('{broken');try{assert.equal(c.model.blocked.value,true);await c.model.send(path,body,'预约成功');assert.equal(c.writes.length,0);assert.equal(c.map.values().next().value,'{broken');c.failGet(true);c.model.restore();assert.equal(c.model.blocked.value,true);
 }finally{c.app.unmount();}
});
test('成功后缓存删除失败只允许完成清理，不能重发',async()=>{
 const c=mounted();try{c.failRemove(true);const p=c.model.send(path,body,'预约成功');c.writes[0].resolve(saved);await p;assert.equal(c.model.state.value,'completed');assert.ok(c.model.pending.value);assert.equal(c.completed.length,1);await c.model.retry(true);assert.equal(c.writes.length,1);c.failRemove(false);c.model.finish();assert.equal(c.model.pending.value,null);assert.equal(c.map.size,0);
 }finally{c.app.unmount();}
});
test('后续列表刷新失败不会把已确认保存误判为提交失败',async()=>{
 const c=mounted();try{c.failCompleted(true);const p=c.model.send(path,body,'预约成功');c.writes[0].resolve(saved);await p;assert.equal(c.model.pending.value,null);assert.equal(c.model.state.value,'completed');assert.equal(c.writes.length,1);
 }finally{c.app.unmount();}
});
test('身份切换取消核实并清内存，晚到结果不回填且原缓存仍在',async()=>{
 const c=mounted(JSON.stringify(pending()));try{const p=c.model.verify();c.actor.value={subjectId:uid(10),identityId:uid(11)};assert.equal(c.reads[0].signal.aborted,true);assert.equal(c.model.pending.value,null);c.reads[0].resolve(status);await p;assert.equal(c.completed.length,0);assert.equal(c.map.size,1);c.actor.value={...identity};assert.ok(c.model.pending.value);
 }finally{c.app.unmount();}
});
test('写入回复到达前切换身份不能在新身份显示原结果',async()=>{
 const c=mounted();try{const p=c.model.send(path,body,'预约成功');c.actor.value=null;c.writes[0].resolve(saved);await p;assert.equal(c.completed.length,0);assert.equal(c.model.pending.value,null);assert.equal(c.map.size,1);
 }finally{c.app.unmount();}
});
test('401清身份保原缓存，重新验证后可再核实',async()=>{
 const c=mounted(JSON.stringify(pending()));try{const p=c.model.verify();c.reads[0].reject(Object.assign(Error('expired'),{status:401}));await p;assert.equal(c.actor.value,null);assert.equal(c.model.pending.value,null);assert.equal(c.map.size,1);c.actor.value={...identity};assert.ok(c.model.pending.value);
 }finally{c.app.unmount();}
});
test('卸载后晚到核实结果不触发成功回调，不擦原缓存',async()=>{
 const c=mounted(JSON.stringify(pending()));const p=c.model.verify();c.app.unmount();assert.equal(c.reads[0].signal.aborted,true);c.reads[0].resolve(status);await p;assert.equal(c.completed.length,0);assert.equal(c.map.size,1);
});
test('错误类型或损坏成功回复不能清原请求，核实失败不重发',async()=>{
 const c=mounted();try{const p=c.model.send(path,body,'预约成功');c.writes[0].resolve({});await p;assert.equal(c.model.state.value,'unknown');assert.equal(c.map.size,1);const v=c.model.verify();c.reads[0].resolve({...status,kind:'cancel'});await v;assert.ok(c.model.pending.value);assert.equal(c.completed.length,0);assert.equal(c.writes.length,1);
 }finally{c.app.unmount();}
});
test('业务拒绝清原缓存，重复点击不会并发发第二条命令',async()=>{
 const c=mounted();try{const p=c.model.send(path,body,'预约成功');await c.model.send(path,{...body,requestId:uid(20)},'预约成功');assert.equal(c.writes.length,1);c.writes[0].reject(Object.assign(Error('时段已满'),{status:409}));await p;assert.equal(c.map.size,0);assert.equal(c.model.pending.value,null);assert.match(c.model.error.value,/时段已满/);
 }finally{c.app.unmount();}
});
