const {createAppointmentsPage}=require('../apps/miniprogram/lib/appointments-page.js');
import test from 'node:test';import assert from 'node:assert/strict';
const row={id:'original',version:2,disposition:'active',name:'甲',contact:'13800000001',intention:'咨询',startsAt:'2028-01-01T01:00:00Z',endsAt:'2028-01-01T01:30:00Z',canCancel:true,canReschedule:true};
const event={currentTarget:{dataset:{id:'original'}}},yes={detail:{value:['yes']}};
function setup(overrides:any={}){const calls:any[]=[],state:any={pending:null};let route='';const api:any={session:async()=>({subjectId:'a',name:'甲'}),mine:async()=>({items:[row],nextCursor:null}),cancel:async(id:any,b:any)=>{calls.push({id,body:b});return{id,version:3,disposition:'cancelled'};},status:async()=>({state:'not_found'}),...overrides};const definition=createAppointmentsPage({api,state,enabled:()=>true,newRequestId:async()=> 'request-original',navigate:(r:any)=>{route=r;}});const p:any={...definition,data:structuredClone(definition.data),setData(x:any){Object.assign(this.data,x);}};return{p,state,calls,route:()=>route};}
test('本人预约展示完整北京时间并把原编号版本带入改约',async()=>{const{p,state,route}=setup();await p.onLoad();p.reschedule(event);assert.equal(state.reschedule.id,'original');assert.equal(state.reschedule.version,2);assert.equal(state.reschedule.subjectId,'a');assert.equal(route(),'/pages/index/index');assert.match(p.data.rows[0].range,/09:00/);});
test('取消须先选择、填原因、明确确认，采用原版本',async()=>{const{p,calls}=setup();await p.onLoad();await p.cancel();assert.equal(calls.length,0);p.chooseCancel(event);p.input({currentTarget:{dataset:{field:'reason'}},detail:{value:'协商取消'}});p.confirm(yes);await p.cancel();assert.equal(calls.length,1);assert.deepEqual(calls[0],{id:'original',body:{requestId:'request-original',version:2,reason:'协商取消'}});});
test('已取消或不允许变更不打开操作',async()=>{const{p,state}=setup({mine:async()=>({items:[{...row,canCancel:false,canReschedule:false}],nextCursor:null})});await p.onLoad();p.chooseCancel(event);p.reschedule(event);assert.equal(p.data.selected,null);assert.equal(state.reschedule,undefined);});
test('取消回复未知保留原请求，已完成只查不重发',async()=>{let posts=0;const{p,state}=setup({cancel:async()=>{posts++;throw Error('断网');},status:async()=>({state:'completed',appointmentId:'original',version:3,disposition:'cancelled'})});await p.onLoad();p.chooseCancel(event);p.data.reason='取消';p.confirm(yes);await p.cancel();assert.equal(p.data.unknown,true);const original=structuredClone(state.pending.body);await p.onRecover();assert.equal(posts,1);assert.equal(state.pending.phase,'saved');assert.deepEqual(state.pending.body,original);});
test('未知取消未见结果须确认才重试，原正文不变',async()=>{let n=0;const bodies:any[]=[];const{p,state}=setup({cancel:async(id:any,b:any)=>{bodies.push(b);if(n++===0)throw Error('断网');return{id,version:3,disposition:'cancelled'};}});await p.onLoad();p.chooseCancel(event);p.data.reason='取消';p.confirm(yes);await p.cancel();await p.onRecover();await p.onRetry();assert.equal(bodies.length,1);p.confirmRetry(yes);await p.onRetry();assert.deepEqual(bodies[0],bodies[1]);assert.equal(state.pending.phase,'saved');});
test('未知操作期间禁止开启第二笔取消或改约',async()=>{const{p,state}=setup();await p.onLoad();state.pending={kind:'book',phase:'unknown',subjectId:'a'};p.chooseCancel(event);p.reschedule(event);assert.equal(p.data.selected,null);assert.equal(state.reschedule,undefined);});
test('隐藏使迟到的本人列表无效，返回重新读取',async()=>{let resolve:any;const{p}=setup({mine:()=>new Promise(r=>{resolve=r;})});const load=p.onLoad();await new Promise(r=>setImmediate(r));p.onHide();resolve({items:[row],nextCursor:null});await load;assert.equal(p.data.rows.length,0);});
test('分页失败清旧游标和列表，避免拼接失效数据',async()=>{let n=0;const{p}=setup({mine:async()=>{if(n++)throw Error('分页失效');return{items:[row],nextCursor:'cursor'};}});await p.onLoad();await p.more();assert.equal(p.data.rows.length,0);assert.equal(p.data.cursor,null);assert.match(p.data.error,/失效/);});
test('小程序预约分组切换重置游标，详情可展开，续页只查询当前分组',async()=>{
 const requests:unknown[][]=[];
 const {p}=setup({mine:async(cursor:unknown,view:unknown)=>{
  requests.push([cursor,view]);
  return {items:[row],nextCursor:cursor?null:'new-page'};
 }});
 await p.onLoad();
 p.toggleDetail(event);
 assert.equal(p.data.detailId,'original');
 assert.equal(p.data.rows[0].shortId,'ORIGINAL');
 await p.changeView({currentTarget:{dataset:{view:'history'}}});
 assert.equal(p.data.detailId,'');
 await p.more();
 assert.deepEqual(requests,[[null,'upcoming'],[null,'history'],['new-page','history']]);
});
