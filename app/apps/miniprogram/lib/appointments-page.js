function createAppointmentsPage({api,state,enabled,newRequestId,navigate,revealCancel=()=>{}}) {
 const display = rows => rows.map(r=>{
  if(!r||typeof r.id!=='string'||!Number.isInteger(r.version)||typeof r.canCancel!=='boolean'||typeof r.canReschedule!=='boolean'||!Number.isFinite(Date.parse(r.startsAt))||!Number.isFinite(Date.parse(r.endsAt)))throw Error('预约资料不完整，请重新查询。');
  const clock=s=>new Date(Date.parse(s)+28800000).toISOString().slice(0,16).replace('T',' ');
  const start=clock(r.startsAt),end=clock(r.endsAt);
  const [year,month,date]=start.slice(0,10).split('-').map(Number);
  const weekday='日一二三四五六'[new Date(start.slice(0,10)+'T00:00:00Z').getUTCDay()];
  const dayLabel=year+'年'+month+'月'+date+'日 · 周'+weekday;
  const timeLabel=start.slice(11)+'—'+(start.slice(0,10)!==end.slice(0,10)?end.slice(5,10)+' ':'')+end.slice(11);
  return {...r,range:start+' — '+end,dayLabel,timeLabel,shortId:r.id.slice(0,8).toUpperCase(),
   statusLabel:({active:'已确认',cancelled:'已取消',arrived:'已到院',no_show:'未到结案'})[r.disposition]||'请核实'};
 });
 return {
  data:{enabled:false,patient:null,loginName:'',password:'',rows:[],view:'upcoming',detailId:'',cursor:null,busy:false,error:'',selected:null,reason:'',confirmed:false,otherPending:false,unknown:false,retryAllowed:false,retryConfirmed:false},
  onLoad(){this._alive=true;this._visible=true;this._epoch=0;this.setData({enabled:enabled()});if(this.data.enabled)return this.restore();},
  onHide(){this._visible=false;this._epoch++;this.setData({rows:[],cursor:null,detailId:'',password:'',busy:false,selected:null,confirmed:false});},
  onUnload(){this._alive=false;this._visible=false;this._epoch++;},
  onShow(){if(!this._visible&&this._alive){this._visible=true;return this.restore();}},
  current(t){return this._alive&&this._visible&&t===this._epoch;},
  input(e){if(this.data.busy)return;const k=e.currentTarget.dataset.field;if(['loginName','password','reason'].includes(k)&&typeof e.detail.value==='string')this.setData({[k]:e.detail.value,confirmed:false});},
  async login(){if(this.data.busy||!this.data.enabled||!this._visible)return;const t=++this._epoch,b={loginName:this.data.loginName,password:this.data.password};this.setData({busy:true,password:'',error:'',rows:[],patient:null});try{const p=await api.login(b);if(this.current(t)){this.adopt(p);await this.load(false,t);}}catch(e){if(this.current(t))this.setData({error:e.message});}finally{if(this.current(t))this.setData({busy:false});}},
  adopt(p){if(state.pending&&state.pending.phase!=='saved'&&state.pending.subjectId!==p.subjectId){api.forget();throw Error('请用原患者核实未完成请求。');}this.setData({patient:p,otherPending:!!state.pending&&state.pending.kind!=='cancel'&&state.pending.phase!=='saved',unknown:!!state.pending&&state.pending.kind==='cancel'&&state.pending.phase!=='saved'});},
  async restore(){const t=++this._epoch;this.setData({busy:true,error:'',rows:[],patient:null});try{const p=await api.session();if(this.current(t)){this.adopt(p);await this.load(false,t);}}catch(e){if(this.current(t))this.setData({error:e.message,patient:null});}finally{if(this.current(t))this.setData({busy:false});}},
  async load(append,t){const r=await api.mine(append?this.data.cursor:null,this.data.view);if(!this.current(t))return;if(!r||!Array.isArray(r.items)||(r.nextCursor!==null&&typeof r.nextCursor!=='string'))throw Error('预约列表不完整，请重新查询。');const rows=display(r.items);this.setData({rows:append?this.data.rows.concat(rows):rows,cursor:r.nextCursor});},
  changeView(e){
   const view=e.currentTarget.dataset.view;
   if(!this._visible||!this.data.patient||this.data.busy||this.data.selected||!['upcoming','history'].includes(view)||view===this.data.view)return;
   this.setData({view,detailId:''});
   return this.refresh();
  },
  toggleDetail(e){const row=this.row(e);if(row&&!this.data.busy)this.setData({detailId:this.data.detailId===row.id?'':row.id});},
  async refresh(){if(this.data.busy||!this.data.patient||!this._visible)return;const t=++this._epoch;this.setData({busy:true,error:'',rows:[],cursor:null,selected:null});try{await this.load(false,t);}catch(e){if(this.current(t))this.setData({error:e.message,...(e.status===401?{patient:null}: {})});}finally{if(this.current(t))this.setData({busy:false});}},
  async more(){if(this.data.busy||!this.data.cursor||!this._visible)return;const t=++this._epoch;this.setData({busy:true,error:''});try{await this.load(true,t);}catch(e){if(this.current(t))this.setData({error:e.message,rows:[],cursor:null,...(e.status===401?{patient:null}: {})});}finally{if(this.current(t))this.setData({busy:false});}},
  row(e){return this.data.rows.find(r=>r.id===e.currentTarget.dataset.id);},
  blocked(){return this.data.busy||!this.data.patient||!this._visible||state.pending&&state.pending.phase!=='saved';},
  chooseCancel(e){if(this.blocked())return;const r=this.row(e);if(r&&r.canCancel)this.setData({selected:{id:r.id,version:r.version,range:r.range,doctorName:r.doctorName,clinicName:r.clinicName,serviceName:r.serviceName},reason:'',confirmed:false,error:''},revealCancel);},
  dismissCancel(){if(!this.blocked())this.setData({selected:null,reason:'',confirmed:false,error:''});},
  confirm(e){if(!this.data.busy)this.setData({confirmed:e.detail.value.includes('yes')});},
  confirmRetry(e){if(!this.data.busy)this.setData({retryConfirmed:e.detail.value.includes('yes')});},
  reschedule(e){if(this.blocked())return;const r=this.row(e);if(!r||!r.canReschedule)return;if(state.pending)state.pending=null;state.reschedule={id:r.id,version:r.version,subjectId:this.data.patient.subjectId,form:{name:r.name,contact:r.contact,intention:r.intention}};navigate('/pages/index/index');},
  async cancel(){if(this.blocked()||!this.data.selected||!this.data.confirmed)return;const reason=this.data.reason.trim();if(!reason||reason.length>500||/[\u0000-\u001f]/.test(reason)){this.setData({error:'请填写有效取消原因。'});return;}const t=++this._epoch,target={...this.data.selected};this.setData({busy:true,error:''});try{const requestId=await newRequestId();if(!this.current(t))return;state.pending={kind:'cancel',subjectId:this.data.patient.subjectId,appointmentId:target.id,body:{requestId,version:target.version,reason},phase:'unknown'};await this.send(t,false);}catch(e){if(this.current(t))this.setData({error:e.message});}finally{if(this.current(t))this.setData({busy:false});}},
  saved(p,r){if(!r||(r.id||r.appointmentId)!==p.appointmentId||!Number.isInteger(r.version)||r.version!==p.body.version+1||r.disposition!=='cancelled')throw Error('原取消结果尚不能完整核实。');p.phase='saved';p.result={id:p.appointmentId,version:r.version,disposition:r.disposition};},
  async send(t,retry){const p=state.pending;try{const r=await api.cancel(p.appointmentId,{...p.body});if(state.pending!==p)return;this.saved(p,r);if(this.current(t)){this.setData({unknown:false,selected:null,confirmed:false,retryAllowed:false,error:''});await this.load(false,t);}}catch(e){if(state.pending===p&&!retry&&e.definite&&e.status!==401)state.pending=null;if(this.current(t))this.setData({unknown:!!state.pending&&state.pending.phase!=='saved',error:e.message,...(e.status===401?{patient:null,rows:[]}: {})});}},
  async recover(retry=false){const p=state.pending;if(this.data.busy||!this._visible||!this.data.patient||!p||p.kind!=='cancel'||p.subjectId!==this.data.patient.subjectId||retry&&(!this.data.retryAllowed||!this.data.retryConfirmed))return;const t=++this._epoch;this.setData({busy:true,error:'',retryAllowed:false,retryConfirmed:false});try{const r=await api.status(p.body.requestId,'cancel',p.appointmentId);if(!this.current(t)||state.pending!==p)return;if(r.state==='retired'){state.pending=null;this.setData({unknown:false,selected:null,error:'原未执行取消已结束，预约状态未改变。'});await this.load(false,t);}else if(r.state==='completed'){this.saved(p,r);this.setData({unknown:false,selected:null});await this.load(false,t);}else if(r.state==='not_found'){if(retry)await this.send(t,true);else this.setData({unknown:true,retryAllowed:true,error:'暂未查到原结果，确认后可重试原取消请求。'});}else if(r.state==='processing')this.setData({error:'原请求仍在处理中，请稍后核实。'});else throw Error('原结果无法核实。');}catch(e){if(this.current(t))this.setData({error:e.message,...(e.status===401?{patient:null,rows:[]}: {})});}finally{if(this.current(t))this.setData({busy:false});}},
  continuePending(){if(this.data.otherPending)navigate('/pages/booking/index');},
  onRecover(){return this.recover(false);},onRetry(){return this.recover(true);}
 };
}
module.exports={createAppointmentsPage};
