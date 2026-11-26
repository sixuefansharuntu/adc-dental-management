<script setup lang="ts">
import { requestAbort } from './request-abort';
import { missingLoginInput, loginFailure } from './login-feedback';
import{useTreatmentHandoff}from'./use-treatment-handoff';
import{useVisitHandoff}from'./use-visit-handoff';
import WorkflowGuide from './WorkflowGuide.vue';
import StaffWelcome from './StaffWelcome.vue';
import ClinicSettings from './ClinicSettings.vue';
import { Settings } from '@lucide/vue';
import{useQualityNavigation}from'./use-quality-navigation';
import{useMyAppointments}from'./use-my-appointments';
import{useBookingRecovery,pendingKind}from'./use-booking-recovery';
import BookingRecoveryPanel from './BookingRecoveryPanel.vue';
import PatientAccessDialog from './PatientAccessDialog.vue';
import DemoAccountPicker, { type DemoAccount } from './DemoAccountPicker.vue';
import PatientPasswordDialog from './PatientPasswordDialog.vue';
import patientWelcomePhoto from './assets/patient-welcome.jpg';
import{bookingTimeRange,bookingPeriod}from'./booking-time';
import{beijingToday,bookingDays}from'./booking-calendar';
import { ref,computed,onMounted,nextTick,watch } from 'vue';
import { CalendarDays,Stethoscope,ArrowUpRight,Clock3,MapPin,Check,ShieldCheck,RefreshCw,LogOut,X,ChevronRight,ChevronDown,Users,LayoutDashboard,ArrowLeft,LockKeyhole,Package,BarChart3 } from '@lucide/vue';
import FrontdeskWorkspace from './FrontdeskWorkspace.vue';
import ClinicalWorkspace from './ClinicalWorkspace.vue';
import CareWorkspace from './CareWorkspace.vue';
import FollowupWorkspace from './FollowupWorkspace.vue';
import InventoryWorkspace from './InventoryWorkspace.vue';
import SalesWorkspace from './SalesWorkspace.vue';
import QuarterWorkspace from './QuarterWorkspace.vue';
import QualityWorkspace from './QualityWorkspace.vue';
import ReceiptWorkspace from './ReceiptWorkspace.vue';
import BusinessWorkspace from './BusinessWorkspace.vue';
import ClinicWorkspace from './ClinicWorkspace.vue';
import DentistWorkspace from './DentistWorkspace.vue';
import SecurityWorkspace from './SecurityWorkspace.vue';import PatientWorkspace from './PatientWorkspace.vue';const patientRecordRef=ref<any>(null);
const securityRef=ref<any>(null),securityPending=ref(false);
const dentistRef=ref<any>(null);
const clinicRef=ref<any>(null);
const businessRef=ref<any>(null);
type Item={clinicId:string;clinicName:string;address:string;doctorId:string;doctorName:string;specialty:string;introduction:string;serviceCode:string;serviceName:string;serviceVersionId:string;durationMinutes:number};
type Slot={startsAt:string;endsAt:string;status:string};type Group=Item&{scheduleId:string;ruleVersionId:string;slots:Slot[]};
type Appointment={id:string;version:number;disposition:string;name:string;contact:string;intention:string;startsAt:string;endsAt:string;cancelCutoffAt:string;rescheduleCutoffAt:string;doctorName:string;clinicName:string;clinicId:string;address:string;serviceName:string;durationMinutes:number;cancelReason?:string;canCancel?:boolean;canReschedule?:boolean};
const staffMenuOpen=ref(false);
const patientOnly=new URLSearchParams(location.search).get('view')==='patient';
if(patientOnly)document.title='在线预约 | ADC 牙科';
const courseDemo=ref(false),registrationAvailable=ref(false),passwordDialog=ref(false);
const demoAccounts=ref<DemoAccount[]>([]),staffDemoRole=ref(''),demoAccessNotice=ref('');
const staffDemoAccounts=computed(()=>demoAccounts.value.filter(account=>account.kind==='staff'));
const patientDemoAccounts=computed(()=>demoAccounts.value.filter(account=>account.kind==='patient'));
function patientPasswordChanged(message:string){passwordDialog.value=false;patient.value=null;selection.value=null;rescheduling.value=null;cancelTarget.value=null;loginKind.value='patient';notice.value=message;}
const items=ref<Item[]>([]),groups=ref<Group[]>([]),staffRows=ref<Appointment[]>([]);
const patient=ref<any>(null),staff=ref<any>(null),clinic=ref(''),doctor=ref(''),service=ref(''),date=ref(beijingToday()),calendarStart=ref(beijingToday()),queriedAt=ref('');
const {items:mine,fromDate:mineFrom,toDate:mineTo,clinicId:mineClinic,state:mineState,limit:mineLimit,clinics:mineClinics,summary:mineSummary,total:mineTotal,next:mineNext,asOf:mineAsOf,loading:mineLoading,error:mineError,dirty:mineDirty,load:loadMine,reset:resetMine,clearFilters:clearMineFilters}=useMyAppointments({identity:()=>patient.value,read:(path,signal)=>api(path,undefined,signal),unauthorized:()=>{patient.value=null;selection.value=null;rescheduling.value=null;cancelTarget.value=null;}});
const tab=ref('book'),loading=ref(true),busy=ref(false),error=ref(''),notice=ref(''),ready=ref(false);
const frontdeskRef=ref<any>(null);
const frontSection=ref('appointments');
const clinicalRef=ref<any>(null),careRef=ref<any>(null),followupRef=ref<any>(null),inventoryRef=ref<any>(null),salesRef=ref<any>(null),quarterRef=ref<any>(null),qualityRef=ref<any>(null),receiptRef=ref<any>(null),workArea=ref('frontdesk');
const settingsAvailable=computed(()=>staff.value?.functions?.some((fn:string)=>['clinic.read','dentist.read','security.read','price.manage'].includes(fn))===true);
function openSettings(){if(settingsAvailable.value){workArea.value='settings';staffMenuOpen.value=false;}}
const treatmentHandoff=useTreatmentHandoff({staff:()=>staff.value,area:()=>workArea.value,setArea:v=>workArea.value=v,error:s=>error.value=s});
const visitHandoff=useVisitHandoff({staff:()=>staff.value,area:()=>workArea.value,setArea:v=>workArea.value=v,error:s=>error.value=s});
const qualityNavigation=useQualityNavigation({staff:()=>staff.value,area:()=>workArea.value,setArea:v=>workArea.value=v,error:s=>error.value=s});
async function openFrontSection(s:string){if(!staff.value){openLogin('staff');return;}workArea.value='frontdesk';await nextTick();frontdeskRef.value?.setSection(s);}
function openClinical(){if(!staff.value){openLogin('staff');return;}workArea.value='clinical';}
function chooseArea(){workArea.value=staff.value?.functions?.includes('security.read')?'security':staff.value?.functions?.some((f:string)=>['clinical.write','bill.manage'].includes(f))?'clinical':staff.value?.functions?.includes('image.read')?'care':staff.value?.functions?.some((f:string)=>['followup.read','followup.plan.read'].includes(f))?'followup':staff.value?.functions?.includes('stock.read')?'inventory':staff.value?.functions?.includes('sale.read')&&!staff.value?.functions?.includes('appointment.read')?'sales':staff.value?.functions?.includes('quarter.read')&&!staff.value?.functions?.includes('appointment.read')?'quarter':staff.value?.functions?.includes('quality.read')?'quality':'frontdesk';}
const loginKind=ref<'patient'|'staff'|''>(''),loginName=ref(''),password=ref(''),loginError=ref('');
const selection=ref<{group:Group;slot:Slot;quote:any}|null>(null),rescheduling=ref<Appointment|null>(null),cancelTarget=ref<Appointment|null>(null);
const selectedSlot=ref<{group:Group;slot:Slot}|null>(null);
const showUnavailable=ref(false);
const findingNext=ref(false),nextUnavailable=ref(''),nextAvailabilityError=ref('');
let nextAvailabilityRequest:AbortController|null=null;
const reviewButton=ref<HTMLButtonElement|null>(null),reviewDialogTitle=ref<HTMLElement|null>(null);
const doctorPicker=ref<HTMLElement|null>(null);
let cancelButton:HTMLElement|null=null;
watch(loginKind,async(kind,previous)=>{
 if(!kind&&previous==='patient'&&selection.value){await nextTick();reviewDialogTitle.value?.focus();}
});
const name=ref(''),contact=ref(''),intention=ref(''),reason=ref(''),confirmed=ref(false);
let generation=0;const retryConfirmed=ref(false);
const recovery=useBookingRecovery({identity:()=>patientOnly?patient.value:null,storage:()=>sessionStorage,
 read:(path,signal)=>api(path,undefined,signal),write:(path,body)=>api(path,body),
 unauthorized:()=>{patient.value=null;selection.value=null;rescheduling.value=null;cancelTarget.value=null;},
 completed:async(r,label)=>{selection.value=null;cancelTarget.value=null;rescheduling.value=null;retryConfirmed.value=false;notice.value=r.originalResult||r.repeated?'原提交已完成，已找回当次结果；当前状态请查看预约列表。':label;tab.value='mine';await Promise.all([loadMine(),loadAvailability()]);}});
const{pending:uncertain,state:recoveryState,error:recoveryError,blocked:recoveryBlocked,working:recoveryWorking,ownConflict}=recovery;
const recoverySummary=computed(()=>{const p=uncertain.value;if(!p)return'';const kind=pendingKind(p);return (kind==='book'?'原预约':kind==='reschedule'?'原改约请求':'原取消请求')+(kind==='book'?'':' · 预约编号 '+p.path.split('/')[3].slice(0,8).toUpperCase())+'\n'+(kind==='cancel'?'原取消原因：'+p.body.reason:'原选定开始时间：'+full(p.body.startsAt));});
function recoverPending(){if(patientOnly)recovery.restore();}
async function verifyPending(){retryConfirmed.value=false;await recovery.verify();}
async function retryPending(){await recovery.retry(retryConfirmed.value);retryConfirmed.value=false;}
class ApiError extends Error{constructor(public status:number,message:string,public code?:string){super(message);}}
async function api<T=any>(path:string,body?:any,signal?:AbortSignal):Promise<T>{const abort=requestAbort(12000,signal);try{const r=await fetch('/api/v1'+path,{method:body?'POST':'GET',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:abort.signal});const b=await r.json().catch(()=>({}));if(!r.ok)throw new ApiError(r.status,b.message||'请求失败，请稍后重试。',b.code);return b;}finally{abort.dispose();}}
async function loadDemoAccounts(enabled:boolean,invite:string|null,publicLogin:boolean){
 if(!enabled){if(invite!==null)demoAccessNotice.value='演示登录未启用或邀请已过期。';return;}
 try{
  if(invite!==null&&!publicLogin)await api('/demo/access',{invite});
  demoAccounts.value=(await api<{items:DemoAccount[]}>('/demo/options')).items;
 }catch{demoAccessNotice.value=publicLogin?'暂时无法载入演示账号，请刷新后再试。':'未能启用演示登录，请重新打开老师专用链接。';}
}
function takeDemoInvite(){
 const marker='#teacher-demo=';
 if(!location.hash.startsWith(marker))return null;
 const invite=location.hash.slice(marker.length);
 history.replaceState(history.state,'',location.pathname+location.search);
 return invite;
}
const clinics=computed(()=>Array.from(new Map(items.value.map(i=>[i.clinicId,{id:i.clinicId,name:i.clinicName,address:i.address}])).values()));
const doctors=computed(()=>Array.from(new Map(items.value.filter(i=>i.clinicId===clinic.value).map(i=>[i.doctorId,i])).values()));
const services=computed(()=>items.value.filter(i=>i.clinicId===clinic.value&&i.doctorId===doctor.value));
const selectedClinic=computed(()=>clinics.value.find(c=>c.id===clinic.value));
const selectedDoctor=computed(()=>doctors.value.find(i=>i.doctorId===doctor.value));
const selectedService=computed(()=>services.value.find(s=>s.serviceVersionId===service.value));
const days=computed(()=>bookingDays(calendarStart.value));
function dayLabel(day:string){return new Date(day+'T12:00:00+08:00').toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'long',timeZone:'Asia/Shanghai'});}
const selectedDayLabel=computed(()=>date.value?dayLabel(date.value):'');
function isSelectedSlot(group:Group,slot:Slot){return selectedSlot.value?.group.scheduleId===group.scheduleId&&selectedSlot.value?.slot.startsAt===slot.startsAt;}
async function selectSlot(group:Group,slot:Slot,event:MouseEvent){
 selectedSlot.value={group,slot};
 if(event.detail===0&&!uncertain.value&&!recoveryBlocked.value){await nextTick();reviewButton.value?.focus();}
}
async function openSlotReview(){
 const pending=selectedSlot.value;
 if(!pending||busy.value||loading.value)return;
 recovery.dismissFeedback();
 await choose(pending.group,pending.slot);
 if(selection.value){await nextTick();reviewDialogTitle.value?.focus();}
}
function changeDate(){calendarStart.value=date.value||beijingToday();return loadAvailability();}
function goToday(){date.value=beijingToday();return changeDate();}
function resetNextAvailability(){
 nextAvailabilityRequest?.abort();nextAvailabilityRequest=null;
 findingNext.value=false;nextUnavailable.value='';nextAvailabilityError.value='';
}
async function findNextAvailableDate(){
 if(findingNext.value||loading.value||busy.value||!date.value||!selectedService.value)return;
 const request=new AbortController();nextAvailabilityRequest=request;
 findingNext.value=true;nextAvailabilityError.value='';
 try{
  const query=new URLSearchParams({after:date.value,clinicId:clinic.value,doctorId:doctor.value,serviceVersionId:service.value});
  const result=await api<{date:string|null;groups:Group[];queriedAt:string;searchedFrom:string|null;searchedThrough:string|null}>(`/availability/next?${query}`,undefined,request.signal);
  if(nextAvailabilityRequest!==request)return;
  if(result.date){
   date.value=result.date;calendarStart.value=result.date;
   groups.value=result.groups;queriedAt.value=result.queriedAt;selectedSlot.value=null;showUnavailable.value=false;
  }else{
   const period=result.searchedFrom&&result.searchedThrough?`${result.searchedFrom} 至 ${result.searchedThrough}`:'该日期之后';
   nextUnavailable.value=`${period}，当前医生和服务暂无可约时段。可以换医生或选其他日期。`;
  }
 }catch{
  if(nextAvailabilityRequest===request)nextAvailabilityError.value='暂时无法查询之后的时段，请重试。';
 }finally{
  if(nextAvailabilityRequest===request){nextAvailabilityRequest=null;findingNext.value=false;}
 }
}
function focusDoctors(){
 doctorPicker.value?.scrollIntoView({block:'nearest'});
 doctorPicker.value?.querySelector<HTMLElement>('[aria-pressed="false"]:not(:disabled)')?.focus({preventScroll:true});
}
function openMyAppointments(){
 tab.value='mine';selectedSlot.value=null;
 if(patient.value)void loadMine();
 else openLogin('patient');
}
const scheduleSlots=computed(()=>groups.value.flatMap(group=>group.slots.map(slot=>({group,slot})))
 .sort((a,b)=>Date.parse(a.slot.startsAt)-Date.parse(b.slot.startsAt)));
const available=computed(()=>scheduleSlots.value.filter(({slot})=>slot.status==='available').length);
const unavailable=computed(()=>scheduleSlots.value.length-available.value);
const timeGroups=computed(()=>{
 const periods=new Map<string,typeof scheduleSlots.value>();
 for(const entry of scheduleSlots.value){
  if(!showUnavailable.value&&entry.slot.status!=='available')continue;
  const period=bookingPeriod(entry.slot.startsAt);
  const entries=periods.get(period)??[];
  entries.push(entry);periods.set(period,entries);
 }
 return periods;
});
const clock=(s:string)=>s?new Date(s).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Shanghai'}):'--:--';
const full=(s:string)=>new Date(s).toLocaleString('zh-CN',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Shanghai'});
const weekday=(s:string)=>new Date(s+'T12:00:00+08:00').toLocaleDateString('zh-CN',{weekday:'short',timeZone:'Asia/Shanghai'});
const statusText:Record<string,string>={available:'可预约',full:'已约满',paused:'暂停预约',not_open:'尚未开放',closed:'休诊',past:'已过时',config_unavailable:'配置不可用',active:'已确认',cancelled:'已取消',arrived:'已到院',no_show:'未到结案'};
function explain(e:unknown){return e instanceof Error?e.message:'操作失败，请稍后再试。';}
function defaults(){if(!doctors.value.some(d=>d.doctorId===doctor.value))doctor.value=doctors.value[0]?.doctorId||'';if(!services.value.some(s=>s.serviceVersionId===service.value))service.value=services.value[0]?.serviceVersionId||'';}
async function loadAvailability(){resetNextAvailability();const g=++generation;loading.value=true;groups.value=[];selectedSlot.value=null;showUnavailable.value=false;queriedAt.value='';error.value='';try{if(!date.value||!doctor.value||!service.value){groups.value=[];return;}const r=await api(`/availability?date=${date.value}&clinicId=${clinic.value}&doctorId=${doctor.value}&serviceVersionId=${service.value}`);if(g!==generation)return;groups.value=r.groups;queriedAt.value=r.queriedAt;}catch(e){if(g!==generation)return;groups.value=[];error.value=explain(e);}finally{if(g===generation)loading.value=false;}}
async function changeFilter(){defaults();selection.value=null;await loadAvailability();}
async function loadStaff(){if(!staff.value)return;try{const r=await api(`/staff/appointments?date=${date.value}`);staffRows.value=r.items;}catch(e){staffRows.value=[];if(e instanceof ApiError&&e.status===401)staff.value=null;else if(e instanceof ApiError&&e.status===403)staff.value={...staff.value,clinics:[]};throw e;}}
async function refresh(){try{if(patientOnly)await Promise.all([loadAvailability(),loadMine()]);else if(staff.value)await(workArea.value==='patients'?patientRecordRef.value?.refresh():workArea.value==='security'?securityRef.value?.refresh():workArea.value==='dentist'?dentistRef.value?.refresh():workArea.value==='clinic'?clinicRef.value?.refresh():workArea.value==='business'?businessRef.value?.refresh():workArea.value==='receipts'?receiptRef.value?.refresh():(workArea.value==='clinical'||workArea.value==='prices')?clinicalRef.value?.refresh():workArea.value==='care'?careRef.value?.refresh():workArea.value==='followup'?followupRef.value?.refresh():workArea.value==='inventory'?inventoryRef.value?.refresh():workArea.value==='sales'?salesRef.value?.refresh():workArea.value==='quality'?qualityRef.value?.refresh():workArea.value==='quarter'?quarterRef.value?.refresh():frontdeskRef.value?.refresh());}catch(e){error.value=explain(e);}}
async function patientAuthenticated(actor:any){patient.value=actor;name.value=actor.name;contact.value=actor.contact;loginKind.value='';recoverPending();notice.value=uncertain.value?'已登录，请先核实原提交。':'已登录，可以继续预约。';try{await loadMine();}catch(e){error.value=explain(e);}}
function openLogin(kind:'patient'|'staff'){loginKind.value=kind;staffDemoRole.value='';loginName.value=kind==='patient'?'alice':'front.east';password.value='';loginError.value='';}
async function login(){
 if(busy.value||loginKind.value!=='staff')return;
 loginError.value=staffDemoRole.value?'':missingLoginInput(loginName.value,password.value);
 if(loginError.value)return;
 busy.value=true;loginError.value='';
 let accepted=false;
 try{
  if(staffDemoRole.value)await api('/demo/session',{role:staffDemoRole.value});
  else await api('/staff/session',{loginName:loginName.value,password:password.value});
  accepted=true;
  staff.value=await api('/staff/session');chooseArea();
  loginKind.value='';password.value='';notice.value='已登录，可以继续操作。';
 }catch(e){loginError.value=accepted&&e instanceof ApiError&&e.status===401?'登录会话未建立，请退出当前页面后重新打开再试。':loginFailure(e,!!staffDemoRole.value);}finally{busy.value=false;}
}
async function logout(){if(!patientOnly&&securityPending.value){error.value='请先核实账号管理原提交，再退出身份。';return;}if(uncertain.value){error.value='请先核实结果不明的提交，再退出身份。';return;}busy.value=true;try{const kind=patientOnly?'patient':'staff';await api(`/${kind}/logout`,{});if(patientOnly){patient.value=null;resetMine();selection.value=null;rescheduling.value=null;cancelTarget.value=null;tab.value='book';}else{staff.value=null;staffRows.value=[];}notice.value='已退出登录。';}catch(e){error.value=explain(e);}finally{busy.value=false;}}
function selectionBody(g:Group,s:Slot){return {scheduleId:g.scheduleId,serviceVersionId:g.serviceVersionId,ruleVersionId:g.ruleVersionId,startsAt:s.startsAt};}
async function choose(g:Group,s:Slot){if(uncertain.value){error.value='请先核实原提交结果。';return;}busy.value=true;error.value='';try{const quote=await api('/quote',selectionBody(g,s));selection.value={group:g,slot:s,quote};confirmed.value=false;if(rescheduling.value){name.value=rescheduling.value.name;contact.value=rescheduling.value.contact;intention.value=rescheduling.value.intention;}else{name.value=patient.value?.name||'';contact.value=patient.value?.contact||'';intention.value='';}}catch(e){await loadAvailability();error.value=explain(e);}finally{busy.value=false;}}
async function submit(path:string,body:any,label:string){if(!patient.value){openLogin('patient');return;}busy.value=true;error.value='';notice.value='';try{await recovery.send(path,body,label);}finally{busy.value=false;}}
async function book(){if(!patient.value){openLogin('patient');return;}if(!selection.value||!confirmed.value)return;const body={...selectionBody(selection.value.group,selection.value.slot),requestId:crypto.randomUUID(),name:name.value,contact:contact.value,intention:intention.value,...(rescheduling.value?{version:rescheduling.value.version}:{})};await submit(rescheduling.value?`/patient/appointments/${rescheduling.value.id}/reschedule`:'/patient/appointments',body,rescheduling.value?'改约成功，原安排已替换。':'预约成功，已直接确认，无需前台审批。');}
async function cancel(){if(!cancelTarget.value||!confirmed.value)return;await submit(`/patient/appointments/${cancelTarget.value.id}/cancel`,{requestId:crypto.randomUUID(),version:cancelTarget.value.version,reason:reason.value},'预约已取消，本次占用已释放。');}
function startReschedule(a:Appointment){if(uncertain.value){error.value='请先核实原提交。';return;}rescheduling.value=a;selection.value=null;selectedSlot.value=null;tab.value='book';notice.value='请选择新的安排。新预约成功前，原预约继续有效。';window.scrollTo({top:0,behavior:'smooth'});}
async function startCancel(a:Appointment){
 if(uncertain.value){error.value='请先核实原提交。';return;}
 recovery.dismissFeedback();
 cancelButton=document.activeElement instanceof HTMLElement?document.activeElement:null;
 cancelTarget.value=a;reason.value='';confirmed.value=false;error.value='';
 await nextTick();reviewDialogTitle.value?.focus();
}
function eligible(a:Appointment,kind:string){return (kind==='cancel'?a.canCancel:a.canReschedule)===true&&a.disposition==='active'&&Date.now()<Date.parse(kind==='cancel'?a.cancelCutoffAt:a.rescheduleCutoffAt);}
async function closeDialog(){
 if(busy.value||uncertain.value)return;
 const returnToReview=Boolean(selection.value);
 selection.value=null;cancelTarget.value=null;
 recovery.dismissFeedback();
 await nextTick();
 if(returnToReview)reviewButton.value?.focus();
 else cancelButton?.focus();
 cancelButton=null;
}
async function viewConflictingAppointments(){
 if(!ownConflict.value||busy.value||uncertain.value)return;
 await closeDialog();rescheduling.value=null;openMyAppointments();
}
function cycleReviewFocus(event:KeyboardEvent){
 const form=event.currentTarget as HTMLFormElement;
 const controls=[...form.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled)')].filter(control=>control.getClientRects().length>0);
 const first=controls[0],last=controls.at(-1);
 if(!first||!last){event.preventDefault();return;}
 if(event.shiftKey&&(!controls.includes(document.activeElement as HTMLElement)||document.activeElement===first)){event.preventDefault();last.focus();}
 else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
}
onMounted(async()=>{const invite=takeDemoInvite();try{const r=await api('/catalogue');courseDemo.value=r.experience==='teacher-demo';registrationAvailable.value=r.patientRegistrationEnabled===true;void loadDemoAccounts(r.teacherDemoLoginEnabled===true,invite,r.teacherDemoLoginPublic===true);items.value=r.items;clinic.value=clinics.value[0]?.id||'';defaults();if(patientOnly){try{patient.value=await api('/patient/session');}catch(e){if(!(e instanceof ApiError)||e.status!==401)throw e;}recoverPending();await Promise.all([loadAvailability(),loadMine()]);}else{try{staff.value=await api('/staff/session');chooseArea();}catch(e){if(!(e instanceof ApiError)||e.status!==401)throw e;}}ready.value=true;}catch(e){error.value=explain(e);}finally{loading.value=false;}});
</script>

<template>
<div class="booking-app" :class="{'patient-app':patientOnly,'patient-time-selected':patientOnly&&tab==='book'&&selectedSlot}">
 <main class="b-main" :inert="patientOnly&&Boolean(selection||cancelTarget)">
  <header class="b-top"><a v-if="patientOnly" class="b-brand" href="/?view=patient"><span class="patient-brand-icon"><Stethoscope :size="21" :stroke-width="1.8"/></span><span>ADC 牙科</span></a><div v-else class="b-breadcrumb"><button class="b-button outline small b-mobile-nav-toggle" aria-controls="staff-navigation" :aria-expanded="staffMenuOpen" @click="staffMenuOpen=!staffMenuOpen"><LayoutDashboard :size="16"/>{{staffMenuOpen?'关闭菜单':'工作区'}}</button>工作台 <ChevronRight :size="15"/> <b>{{workArea==='settings'?'诊所设置':workArea==='prices'?'治疗项目参考价':workArea==='patients'?'患者档案':workArea==='security'?'员工账号与权限':workArea==='dentist'?'牙医资料与执业':workArea==='clinic'?'诊所资料与规则':workArea==='business'?'经营查询':workArea==='receipts'?'实收核实与更正':workArea==='quality'?'资料检查与跟踪':workArea==='quarter'?'季度业绩核算':workArea==='sales'?'商品销售与交付':workArea==='inventory'?'物资与库存':workArea==='followup'?'诊后随访':workArea==='care'?'影像与加工':workArea==='clinical'?'诊疗与收费':'预约与接诊'}}</b></div><div class="b-top-actions"><a v-if="!patientOnly" class="b-link" href="/?view=patient" target="_blank">打开患者端 <ArrowUpRight :size="15"/></a><a v-else class="b-link" href="/">员工入口</a><button v-if="patientOnly&&patient&&courseDemo" class="b-button small outline" :disabled="busy||recoveryWorking" @click="passwordDialog=true">修改密码</button><span v-if="patientOnly?patient:staff" class="b-person">{{patientOnly?patient.name:staff.name}}<button :disabled="busy" aria-label="退出登录" @click="logout"><LogOut :size="17"/></button></span><button v-else class="b-button small" @click="openLogin(patientOnly?'patient':'staff')"><LockKeyhole :size="15"/>{{patientOnly?(registrationAvailable?'登录 / 注册':'患者登录'):'员工登录'}}</button></div></header>
 <aside v-if="!patientOnly" id="staff-navigation" class="b-sidebar" :class="{'mobile-open':staffMenuOpen}" @keydown.esc="staffMenuOpen=false"><a class="b-brand" href="/"><Stethoscope :size="29"/><span>ADC<small>DENTAL CARE</small></span></a><div class="b-work-label">诊所运营工作台</div><nav aria-label="员工工作区" @click="$event.target.closest('button') && (staffMenuOpen=false)"><div class="b-nav-label">日常工作</div><button v-if="staff?.functions?.includes('patient.directory.read')" :class="{current:workArea==='patients'}" @click="workArea='patients'"><Users :size="20"/>患者档案</button><button v-if="!staff||staff.functions?.includes('appointment.read')" :class="{current:workArea==='frontdesk'&&frontSection==='appointments'}" @click="openFrontSection('appointments')"><CalendarDays :size="20"/>预约工作台</button><button v-if="!staff||staff.functions?.includes('visit.read')" :class="{current:workArea==='frontdesk'&&frontSection==='visits'}" @click="openFrontSection('visits')"><Users :size="20"/>实际接诊</button><button v-if="!staff||staff.functions?.includes('schedule.manage')" :class="{current:workArea==='frontdesk'&&frontSection==='schedules'}" @click="openFrontSection('schedules')"><Clock3 :size="20"/>医生排班</button><button v-if="!staff||staff.functions?.includes('bill.read')" :class="{current:workArea==='clinical'}" @click="openClinical"><Stethoscope :size="20"/>诊疗与收费</button><button v-if="staff?.functions?.some((f:string)=>['image.read','lab.read'].includes(f))" :class="{current:workArea==='care'}" @click="workArea='care'"><Stethoscope :size="20"/>影像与加工</button><button v-if="staff?.functions?.some((f:string)=>['followup.read','followup.plan.read'].includes(f))" :class="{current:workArea==='followup'}" @click="workArea='followup'"><Clock3 :size="20"/>诊后随访</button><button v-if="staff?.functions?.includes('stock.read')" :class="{current:workArea==='inventory'}" @click="workArea='inventory'"><Package :size="20"/>物资与库存</button><button v-if="staff?.functions?.includes('sale.read')" :class="{current:workArea==='sales'}" @click="workArea='sales'"><Package :size="20"/>商品销售与交付</button><button v-if="staff?.functions?.includes('quarter.read')" :class="{current:workArea==='quarter'}" @click="workArea='quarter'"><LayoutDashboard :size="20"/>季度业绩核算</button><button v-if="staff?.functions?.includes('quality.read')" :class="{current:workArea==='quality'}" @click="workArea='quality'"><ShieldCheck :size="20"/>资料检查与跟踪</button><button v-if="staff?.functions?.includes('receipt.create')" :class="{current:workArea==='receipts'}" @click="workArea='receipts'"><ShieldCheck :size="20"/>实收核实与更正</button><button v-if="staff?.functions?.some((f:string)=>f.startsWith('business.')&&f.endsWith('.read'))" :class="{current:workArea==='business'}" @click="workArea='business'"><BarChart3 :size="20"/>经营查询</button><button v-if="staff?.functions?.includes('clinic.read')" :class="{current:workArea==='clinic'}" @click="workArea='clinic'"><ShieldCheck :size="20"/>诊所资料与规则</button><button v-if="staff?.functions?.includes('dentist.read')" :class="{current:workArea==='dentist'}" @click="workArea='dentist'"><Stethoscope :size="20"/>牙医资料与执业</button><button v-if="staff?.functions?.includes('security.read')" :class="{current:workArea==='security'}" @click="workArea='security'"><ShieldCheck :size="20"/>员工账号与权限</button><button v-if="settingsAvailable" class="b-settings-link" :class="{current:workArea==='settings'}" @click="openSettings"><Settings :size="20"/>诊所设置</button></nav><div class="b-side-foot"><ShieldCheck :size="19"/><span>ADC 诊所协作<br/><small>按岗位授权办理</small></span></div></aside>
  <nav v-if="patientOnly" class="patient-mobile-tabs" aria-label="患者服务">
   <button type="button" :aria-current="tab==='book'?'page':undefined" :disabled="busy" @click="tab='book'">预约看牙</button>
   <button type="button" :aria-current="tab==='mine'?'page':undefined" :disabled="busy" @click="openMyAppointments">我的预约</button>
  </nav>
  <div class="b-body">
   <div v-if="demoAccessNotice" class="b-alert warning" role="status">{{demoAccessNotice}}</div>
   <div v-if="courseDemo&&patientOnly" class="b-alert success b-course-notice" role="status"><ShieldCheck :size="17"/><span>课程演示，请使用合成资料{{registrationAvailable?'，联系电话尚未验证。':'。请使用分配的演示账号。'}}</span></div>
   <div v-else-if="courseDemo" class="b-alert success" role="status"><ShieldCheck :size="18"/>课程演示 · 仅使用合成资料；{{registrationAvailable?'患者可自助注册，联系电话尚未验证。':'患者请使用分配的演示账号。'}}</div>
   <div v-if="error" role="alert" class="b-alert error">{{error}} <button aria-label="关闭错误提示" @click="error=''">×</button></div><div v-if="notice" role="status" class="b-alert success"><Check :size="18"/>{{notice}}<button aria-label="关闭成功提示" @click="notice=''">×</button></div>
   <template v-if="!selection&&!cancelTarget"><BookingRecoveryPanel :pending="!!uncertain" :summary="recoverySummary" :state="recoveryState" :error="recoveryError" :blocked="recoveryBlocked" :working="busy||recoveryWorking" v-model:confirmed="retryConfirmed" @verify="verifyPending" @retry="retryPending" :own-conflict="ownConflict" @view-appointments="viewConflictingAppointments" @finish="recovery.finish"/></template>
   <template v-if="patientOnly">
     <section v-if="tab==='book'&&!rescheduling" class="patient-welcome" aria-labelledby="patient-welcome-title">
      <div class="patient-welcome-copy">
       <h1 id="patient-welcome-title">预约看牙</h1>
       <p>查看医生和可约时间，在线确认就诊。</p>
       <nav class="patient-welcome-actions" aria-label="患者服务">
        <a class="b-button" href="#patient-booking-title">查看可约时间</a>
        <button class="patient-text-action" type="button" :disabled="busy" @click="openMyAppointments">我的预约</button>
       </nav>
      </div>
      <figure class="patient-welcome-photo">
       <img :src="patientWelcomePhoto" alt="" fetchpriority="high"/>
      </figure>
     </section>
     <template v-if="tab==='book'">
      <div v-if="rescheduling" class="b-alert warning">正在改约：{{full(rescheduling.startsAt)}} · {{rescheduling.doctorName}}。原预约保持有效。<button type="button" :disabled="busy" @click="rescheduling=null;selectedSlot=null">退出改约</button></div>
      <h2 id="patient-booking-title" class="patient-booking-title" tabindex="-1">选择就诊安排</h2>
      <div class="patient-booking-layout">
       <section class="b-card patient-schedule" aria-labelledby="patient-schedule-title">
        <div class="patient-field-grid">
         <label>
          <span>诊所</span>
          <span class="patient-select"><select v-model="clinic" :disabled="busy||!clinics.length" @change="changeFilter"><option v-if="!clinics.length" value="">暂无诊所</option><option v-for="c in clinics" :key="c.id" :value="c.id">{{c.name}}</option></select><ChevronDown :size="16" aria-hidden="true"/></span>
         </label>
         <label>
          <span>预约服务</span>
          <span class="patient-select"><select v-model="service" :disabled="busy||!services.length" @change="loadAvailability"><option v-if="!services.length" value="">暂无服务</option><option v-for="s in services" :key="s.serviceVersionId" :value="s.serviceVersionId">{{s.serviceName}} · {{s.durationMinutes}} 分钟</option></select><ChevronDown :size="16" aria-hidden="true"/></span>
         </label>
        </div>
        <div ref="doctorPicker" class="patient-doctor-picker" role="group" aria-label="选择医生">
         <strong>医生</strong>
         <p v-if="!doctors.length">暂无医生</p>
         <div v-else class="patient-doctor-options">
          <button v-for="d in doctors" :key="d.doctorId" type="button" :aria-pressed="doctor===d.doctorId" :disabled="busy" @click="doctor=d.doctorId;changeFilter()">
           <span class="patient-doctor-option-name">{{d.doctorName}}</span>
           <small v-if="d.specialty">{{d.specialty}}</small>
           <Check v-if="doctor===d.doctorId" :size="16" aria-hidden="true"/>
          </button>
         </div>
        </div>
        <div class="patient-calendar">
         <div class="patient-calendar-heading">
          <div>
           <h2 id="patient-schedule-title">选择就诊时间</h2>
           <p v-if="selectedDayLabel">{{selectedDayLabel}}</p>
          </div>
          <button class="patient-today" type="button" :disabled="busy||loading" @click="goToday">回到今天</button>
         </div>
         <div class="patient-days" role="group" aria-label="一周内的日期">
          <button v-for="d in days" :key="d" type="button" :disabled="busy" :aria-label="dayLabel(d)" :aria-pressed="date===d" @click="date=d;loadAvailability()">
           <span>{{weekday(d)}}</span><strong>{{d.slice(8)}}</strong><small>{{d===beijingToday()?'今天':Number(d.slice(5,7))+'月'}}</small>
          </button>
         </div>
         <div class="patient-calendar-actions">
          <span class="patient-availability" role="status" aria-live="polite">
           <i v-if="!loading&&available" aria-hidden="true"></i>{{loading?'查询中…':available+' 个可约时段'}}
          </span>
          <div class="patient-calendar-tools">
           <input v-model="date" type="date" aria-label="跳转至其他日期" title="跳转至其他日期" :disabled="busy" @change="changeDate"/>
           <button class="patient-refresh" type="button" aria-label="刷新可约时段" title="刷新可约时段" :disabled="busy||loading" @click="loadAvailability"><RefreshCw :size="17"/></button>
          </div>
         </div>
         <div v-if="loading" class="patient-empty" aria-busy="true"><Clock3 :size="25"/><strong>正在查询最新安排</strong></div>
         <div v-else-if="!scheduleSlots.length" class="patient-empty">
          <CalendarDays :size="28"/>
          <strong>{{error?'暂时无法显示时段':!selectedService?'暂无可查询的预约服务':'当天暂无公开时段'}}</strong>
          <p role="status">{{nextUnavailable||nextAvailabilityError||(error?'请刷新后再试。':!selectedService?'可尝试选择其他诊所或医生。':'请选择其他日期或医生。')}}</p>
          <div v-if="!error && selectedService" class="patient-empty-actions">
           <button v-if="date&&!nextUnavailable" class="b-button small" type="button" :disabled="busy||findingNext" @click="findNextAvailableDate">{{findingNext?'正在查找…':'找最近可约日期'}}</button>
           <button v-if="doctors.length>1" class="b-button outline small" type="button" :disabled="busy" @click="focusDoctors">换医生</button>
          </div>
         </div>
         <template v-else>
          <div v-if="!available" class="patient-empty">
           <CalendarDays :size="28"/>
           <strong>当天没有可预约的时段</strong>
           <p role="status">{{nextUnavailable||nextAvailabilityError||'请尝试其他日期或医生。'}}</p>
           <div class="patient-empty-actions">
            <button v-if="date&&!nextUnavailable" class="b-button small" type="button" :disabled="busy||findingNext" @click="findNextAvailableDate">{{findingNext?'正在查找…':'找最近可约日期'}}</button>
            <button v-if="doctors.length>1" class="b-button outline small" type="button" :disabled="busy" @click="focusDoctors">换医生</button>
           </div>
          </div>
          <button v-if="unavailable" class="patient-unavailable-toggle" type="button" :aria-expanded="showUnavailable" aria-controls="patient-time-groups" @click="showUnavailable=!showUnavailable">
           {{showUnavailable?'收起不可约时段':'查看 '+unavailable+' 个不可约时段'}}<ChevronDown :size="16" aria-hidden="true"/>
          </button>
          <div id="patient-time-groups" class="patient-time-groups">
           <section v-for="[period, entries] in timeGroups" :key="period" class="patient-time-group">
            <h3>{{period}}</h3>
            <div class="patient-slots" role="group" :aria-label="period+'时段'">
             <button v-for="{group,slot} in entries" :key="group.scheduleId+'-'+slot.startsAt" type="button" :disabled="busy||slot.status!=='available'" :aria-pressed="slot.status==='available'?isSelectedSlot(group,slot):undefined" :class="{unavailable:slot.status!=='available'}" @click="selectSlot(group,slot,$event)">
              <span><strong>{{bookingTimeRange(slot.startsAt,slot.endsAt)}}</strong><small>{{isSelectedSlot(group,slot)?'已选':statusText[slot.status]}}</small></span>
              <Check v-if="isSelectedSlot(group,slot)" :size="16" aria-hidden="true"/>
             </button>
            </div>
           </section>
          </div>
         </template>
         <div class="patient-schedule-note"><Clock3 :size="15" aria-hidden="true"/><span>北京时间<span v-if="queriedAt">，{{clock(queriedAt)}} 更新</span></span></div>
        </div>
       </section>
       <aside class="b-card patient-summary" aria-labelledby="patient-summary-title">
        <div class="patient-summary-heading">
         <CalendarDays :size="23" aria-hidden="true"/>
         <h2 id="patient-summary-title">{{rescheduling?'新的预约安排':'预约摘要'}}</h2>
        </div>
        <div v-if="selectedDoctor" class="patient-summary-doctor">
         <span class="patient-initial" aria-hidden="true">{{selectedDoctor.doctorName.slice(0,1)}}</span>
         <div><strong>{{selectedDoctor.doctorName}}</strong><p v-if="selectedDoctor.specialty">{{selectedDoctor.specialty}}</p></div>
        </div>
        <details v-if="selectedDoctor?.introduction" class="patient-doctor-details">
         <summary>医生介绍</summary>
         <p>{{selectedDoctor.introduction}}</p>
        </details>
        <div class="patient-summary-details">
         <div v-if="selectedClinic"><MapPin :size="18" aria-hidden="true"/><div><strong>{{selectedClinic.name}}</strong><p v-if="selectedClinic.address">{{selectedClinic.address}}</p></div></div>
         <div v-if="selectedService"><Stethoscope :size="18" aria-hidden="true"/><div><strong>{{selectedService.serviceName}}</strong><p>{{selectedService.durationMinutes}} 分钟</p></div></div>
        </div>
        <div class="patient-review" :class="{'has-time':selectedSlot}">
         <div class="patient-review-time" aria-live="polite">
          <template v-if="selectedSlot"><small>{{selectedDayLabel}}</small><strong>{{bookingTimeRange(selectedSlot.slot.startsAt,selectedSlot.slot.endsAt)}}</strong></template>
          <template v-else><small>就诊时间</small><strong>尚未选择</strong></template>
         </div>
         <button ref="reviewButton" class="b-button patient-review-button" type="button" :disabled="!selectedSlot||busy||loading||!!uncertain||recoveryBlocked" @click="openSlotReview">{{busy?'正在核对…':'下一步'}}</button>
         <p>提交时再次核对时段是否可约。</p>
        </div>
       </aside>
      </div>
     </template>
    <section v-else class="b-mine"><div class="patient-page-heading"><div><h1>我的预约</h1><p>查看就诊安排，或在截止时间前改约、取消。</p></div><button type="button" class="b-button outline" @click="tab='book'">返回预约</button></div><div v-if="patient" class="b-heading"><div><h2>预约记录</h2></div><button class="b-button outline" :disabled="busy||mineLoading" @click="loadMine()"><RefreshCw :size="16"/>刷新</button></div><template v-if="patient"><form class="b-card m-filters" @submit.prevent="loadMine()">
<label>预约开始日期<input type="date" v-model="mineFrom"/></label><label>预约结束日期<input type="date" v-model="mineTo"/></label>
<label>预约诊所<select v-model="mineClinic"><option value="">全部本人预约诊所</option><option v-for="c in mineClinics" :key="c.id" :value="c.id">{{c.name}}</option></select></label>
<label>预约状态<select v-model="mineState"><option value="all">全部预约</option><option value="upcoming">未来待就诊</option><option value="active">有效预约</option><option value="arrived">已到院</option><option value="cancelled">已取消</option><option value="no_show">未到结案</option></select></label>
<label>每页预约<select v-model="mineLimit"><option :value="10">10</option><option :value="20">20</option><option :value="50">50</option></select></label>
<div class="m-query"><button class="b-button" :disabled="mineLoading">查询预约</button><button type="button" class="b-text-button" :disabled="mineLoading" @click="clearMineFilters">清空筛选</button></div>
<p v-if="mineDirty" class="m-dirty">筛选条件已改变，请查询后查看新结果。</p>
<p v-if="mineAsOf" class="m-summary">已显示 {{mine.length}} / {{mineTotal}} 份 · 读取时点 {{full(mineAsOf)}}。汇总覆盖所选日期和诊所下的全部本人预约，不随状态筛选缩小。</p>
<p class="m-help">日期按预约开始日计算，两项留空可查全期；未来待就诊是有效预约的一部分。查询不改变预约状态。</p>
</form><div v-if="mineError" class="b-alert error" role="alert">{{mineError}}</div>
<div class="m-overview"><div><strong>{{mineLoading?'—':mineSummary?.total??'—'}}</strong><span>范围内全部预约</span></div><div><strong>{{mineLoading?'—':mineSummary?.upcoming??'—'}}</strong><span>未来待就诊</span></div><div><strong>{{mineLoading?'—':mineSummary?.active??'—'}}</strong><span>有效预约</span></div><div><strong>{{mineLoading?'—':mineSummary?.cancelled??'—'}}</strong><span>已取消</span></div></div></template>
<div v-if="!patient" class="b-card b-empty"><LockKeyhole :size="30"/><strong>登录后查看本人预约</strong><button class="b-button" @click="openLogin('patient')">患者登录</button></div><div v-else-if="!mine.length" class="b-card b-empty"><CalendarDays :size="30"/><strong>{{mineLoading?'正在读取本人预约…':mineAsOf?'当前条件下没有预约':'请查询本人预约'}}</strong><button v-if="!mineLoading" class="b-button" @click="tab='book'">去预约</button></div><article v-for="a in mine" :key="a.id" class="b-card b-appointment"><div class="b-appointment-top"><span class="b-pill" :class="a.disposition">{{statusText[a.disposition]}}</span><small>预约编号 {{a.id.slice(0,8).toUpperCase()}}</small></div><h3>{{full(a.startsAt)}} — {{bookingTimeRange(a.startsAt,a.endsAt).split('—')[1]}}</h3><p>{{a.doctorName}} · {{a.serviceName}}</p><div class="b-address"><MapPin :size="16"/>{{a.clinicName}} · {{a.address}}</div><div class="b-cutoffs"><span>自助改约：{{full(a.rescheduleCutoffAt)}} 前</span><span>自助取消：{{full(a.cancelCutoffAt)}} 前</span></div><p v-if="a.cancelReason" class="b-help">取消原因：{{a.cancelReason}}</p><div v-if="a.disposition==='active'" class="b-appointment-actions"><small>逾期或已到院请联系前台。</small><button class="b-button outline" :disabled="busy||mineLoading||mineDirty||!eligible(a,'reschedule')||!!uncertain" @click="startReschedule(a)">更改时间</button><button class="b-text-button" :disabled="busy||mineLoading||mineDirty||!eligible(a,'cancel')||!!uncertain" @click="startCancel(a)">取消预约</button></div></article><div v-if="patient&&mineNext" class="m-more"><button class="b-button outline" :disabled="mineLoading||mineDirty" @click="loadMine(true)">{{mineLoading?'正在读取…':'继续读取预约'}}</button></div></section>
   </template>
   <template v-else>
    <div class="b-heading"><div><div class="b-eyebrow">ADC CLINIC WORKSPACE</div><h1>{{workArea==='settings'?'诊所设置':workArea==='prices'?'治疗项目参考价':workArea==='patients'?'患者档案':workArea==='security'?'员工账号与权限':workArea==='dentist'?'牙医资料与执业':workArea==='clinic'?'诊所资料与规则':workArea==='business'?'经营查询工作台':workArea==='receipts'?'实收核实工作台':workArea==='quality'?'资料检查工作台':workArea==='quarter'?'季度业绩核算工作台':workArea==='sales'?'商品销售与交付工作台':workArea==='inventory'?'物资与库存工作台':workArea==='followup'?'诊后随访工作台':workArea==='care'?'影像与加工工作台':workArea==='clinical'?'诊疗与收费工作台':'预约与接诊工作台'}}</h1><p>{{workArea==='settings'?'查看当前账号可管理的诊所、人员、价格和权限。':workArea==='prices'?'按诊所查看参考单价及生效版本。':workArea==='patients'?'核对患者档案、过敏和联系要求，按岗位保留完整原版。':workArea==='security'?'核对员工账号状态、可授范围和原配置历史。':workArea==='dentist'?'维护统一牙医身份，公开字段与执业安排分别核对。':workArea==='clinic'?'维护本诊所资料，保留患者已知规则与历史。':workArea==='business'?'分别核对日常工作量、开单和实收，保留原查询时点。':workArea==='receipts'?'核实实际到账，保留原版并衔接季度调整。':workArea==='quality'?'发现缺项，按岗位补正，以真实原记录复查。':workArea==='quarter'?'固定来源，逐笔核对归属，整批核算后由总部正式复核。':workArea==='sales'?'独立核对销售、实际到账和整单交付，库存随真实来源变动。':workArea==='inventory'?'核对实际收发来源，按期间净差处理盘点。':workArea==='followup'?'按实际治疗安排联系，分别记录成功事实与专业问题。':workArea==='care'?'正确归档影像，分别记录加工交接与临床核对。':workArea==='clinical'?'按岗位完成治疗确认、核费开单与实收登记。':'前台办理、实际接诊与患者预约使用同一份安排。'}}</p></div><button class="b-button outline" :disabled="!staff||busy" @click="refresh"><RefreshCw :size="17"/>{{workArea==='security'?'刷新账号':'刷新安排'}}</button></div>
    <StaffWelcome v-if="!staff" @login="openLogin('staff')"/>
    <template v-else><WorkflowGuide :functions="staff.functions" :area="workArea"/><div class="f-tabs" aria-label="工作区切换"><button v-if="staff.functions?.includes('patient.directory.read')" :class="{current:workArea==='patients'}" @click="workArea='patients'"><Users :size="20"/>患者档案</button><button v-if="staff.functions?.includes('appointment.read')" :class="{active:workArea==='frontdesk'}" @click="workArea='frontdesk'">预约与接诊</button><button v-if="staff.functions?.includes('bill.read')" :class="{active:workArea==='clinical'}" @click="workArea='clinical'">诊疗与收费</button><button v-if="staff.functions?.some((f:string)=>['image.read','lab.read'].includes(f))" :class="{active:workArea==='care'}" @click="workArea='care'">影像与加工</button><button v-if="staff.functions?.some((f:string)=>['followup.read','followup.plan.read'].includes(f))" :class="{active:workArea==='followup'}" @click="workArea='followup'">诊后随访</button><button v-if="staff.functions?.includes('stock.read')" :class="{active:workArea==='inventory'}" @click="workArea='inventory'">物资与库存</button><button v-if="staff.functions?.includes('sale.read')" :class="{active:workArea==='sales'}" @click="workArea='sales'">商品销售与交付</button><button v-if="staff.functions?.includes('quarter.read')" :class="{active:workArea==='quarter'}" @click="workArea='quarter'">季度业绩核算</button><button v-if="staff.functions?.includes('quality.read')" :class="{active:workArea==='quality'}" @click="workArea='quality'">资料检查与跟踪</button><button v-if="staff.functions?.includes('receipt.create')" :class="{active:workArea==='receipts'}" @click="workArea='receipts'">实收核实与更正</button><button v-if="staff.functions?.some((f:string)=>f.startsWith('business.')&&f.endsWith('.read'))" :class="{active:workArea==='business'}" @click="workArea='business'">经营查询</button><button v-if="staff.functions?.includes('clinic.read')" :class="{active:workArea==='clinic'}" @click="workArea='clinic'">诊所资料与规则</button><button v-if="staff.functions?.includes('security.read')" :class="{active:workArea==='security'}" @click="workArea='security'"><ShieldCheck :size="18"/>员工账号与权限</button><button v-if="staff.functions?.includes('dentist.read')" :class="{active:workArea==='dentist'}" @click="workArea='dentist'">牙医资料与执业</button></div><ClinicSettings v-if="workArea==='settings'" :functions="staff.functions||[]" @open="workArea=$event"/><PatientWorkspace v-else-if="workArea==='patients'" ref="patientRecordRef" :staff="staff" @unauthorized="staff=null"/><SecurityWorkspace v-else-if="workArea==='security'" ref="securityRef" :staff="staff" @unauthorized="staff=null" @pending-change="securityPending=$event"/><DentistWorkspace v-else-if="workArea==='dentist'" ref="dentistRef" :staff="staff" @unauthorized="staff=null"/><ClinicWorkspace v-else-if="workArea==='clinic'" ref="clinicRef" :staff="staff" @unauthorized="staff=null"/><BusinessWorkspace v-else-if="workArea==='business'" ref="businessRef" :staff="staff" @unauthorized="staff=null"/><ReceiptWorkspace v-else-if="workArea==='receipts'" ref="receiptRef" :staff="staff" @unauthorized="staff=null"/><QualityWorkspace v-else-if="workArea==='quality'" ref="qualityRef" :staff="staff" :return-entry="qualityNavigation.returnEntry.value" @open-inventory-source="qualityNavigation.open" @open-expense-source="qualityNavigation.openExpense" @open-record-source="qualityNavigation.openRecord" @return-consumed="qualityNavigation.consumed" @unauthorized="staff=null"/><QuarterWorkspace v-else-if="workArea==='quarter'" ref="quarterRef" :staff="staff" :source-entry="qualityNavigation.expenseEntry.value" @return-quality="qualityNavigation.backExpense" @unauthorized="staff=null"/><SalesWorkspace v-else-if="workArea==='sales'" ref="salesRef" :staff="staff" @unauthorized="staff=null"/><InventoryWorkspace v-else-if="workArea==='inventory'" ref="inventoryRef" :staff="staff" :source-entry="qualityNavigation.entry.value" @return-quality="qualityNavigation.back" @unauthorized="staff=null"/><FollowupWorkspace v-else-if="workArea==='followup'" ref="followupRef" :staff="staff" :treatment-entry="treatmentHandoff.entry.value" @return-clinical="treatmentHandoff.back" @unauthorized="staff=null"/><CareWorkspace v-else-if="workArea==='care'" ref="careRef" :staff="staff" :visit-entry="visitHandoff.careEntry.value" @return-clinical="visitHandoff.back" @unauthorized="staff=null"/><ClinicalWorkspace v-else-if="workArea==='clinical'||workArea==='prices'" :key="workArea" ref="clinicalRef" :staff="staff" :start-in-prices="workArea==='prices'" :visit-entry="visitHandoff.clinicalEntry.value||treatmentHandoff.clinicalEntry.value" @open-followup="treatmentHandoff.open" @open-care="visitHandoff.open" :source-entry="qualityNavigation.recordEntry.value" @return-quality="qualityNavigation.backRecord" @unauthorized="staff=null"/><FrontdeskWorkspace v-else ref="frontdeskRef" :staff="staff" @unauthorized="staff=null" @section-change="frontSection=$event"/></template>
   </template>
   <footer class="b-footer"><span>ADC · 合成数据演示环境</span><span>{{patientOnly?'在线预约 · 改约与取消':'诊所协作 · 按岗位授权'}}</span></footer>
  </div>
 </main>
 <PatientPasswordDialog v-if="passwordDialog&&patient" :api="api" @close="passwordDialog=false" @reauthenticate="patientPasswordChanged"/>
 <PatientAccessDialog v-if="loginKind==='patient'" :registration-allowed="registrationAvailable" :course-demo="courseDemo" :demo-accounts="patientDemoAccounts" :api="api" @close="loginKind=''" @authenticated="patientAuthenticated"/>
 <div v-if="loginKind==='staff'" class="b-backdrop">
  <form class="b-dialog" novalidate @submit.prevent="login">
   <button type="button" class="b-close" aria-label="关闭登录" :disabled="busy" @click="loginKind='';password=''"><X :size="21"/></button>
   <div class="b-dialog-icon"><LockKeyhole :size="24"/></div>
   <h2>登录员工账号</h2>
   <p>{{staffDemoAccounts.length?'可选择演示账号或输入诊所分配的账号。':'请使用诊所分配的员工账号。'}}</p>
   <div v-if="loginError" class="b-alert error" role="alert">{{loginError}}</div>
   <DemoAccountPicker v-if="staffDemoAccounts.length" v-model="staffDemoRole" :accounts="staffDemoAccounts" label="员工账号" :busy="busy" @update:model-value="password='';loginError=''"/>
   <template v-if="!staffDemoRole">
    <label>{{staffDemoAccounts.length?'登录名':'员工账号'}}<input v-model="loginName" autocomplete="username" autocapitalize="none" :spellcheck="false" required maxlength="100" @input="loginError=''"/></label>
    <label>密码<input v-model="password" type="password" autocomplete="current-password" required maxlength="200" @input="loginError=''"/></label>
   </template>
   <div class="b-help">账号与岗位权限由系统管理员管理。</div>
   <button class="b-button full" :disabled="busy">{{busy?'正在验证…':'确认登录'}}</button>
  </form>
 </div>
 <div v-if="selection||cancelTarget" v-show="!loginKind" class="b-backdrop"><form class="b-dialog wide" role="dialog" aria-modal="true" aria-labelledby="patient-review-title" @keydown.esc="closeDialog" @keydown.tab="cycleReviewFocus" @submit.prevent="cancelTarget?cancel():book()"><button class="b-close" type="button" aria-label="关闭核对" :disabled="busy||!!uncertain" @click="closeDialog"><X :size="21"/></button><h2 id="patient-review-title" ref="reviewDialogTitle" tabindex="-1">{{cancelTarget?'确认取消预约':rescheduling?'核对新的就诊安排':'核对就诊安排'}}</h2><div v-if="error" class="b-alert error" role="alert">{{error}}</div><div class="b-summary" v-if="selection"><strong>{{full(selection.quote.startsAt)}} — {{bookingTimeRange(selection.quote.startsAt,selection.quote.endsAt).split('—')[1]}}</strong><span>{{selection.quote.doctorName}} · {{selection.quote.serviceName}}</span><span>{{selection.quote.clinicName}}</span><small>地址：{{selection.quote.address}}</small><small>自助改约须早于：{{full(selection.quote.rescheduleCutoffAt)}}</small><small>自助取消须早于：{{full(selection.quote.cancelCutoffAt)}}</small></div><div v-if="cancelTarget" class="b-summary"><strong>{{full(cancelTarget.startsAt)}} · {{cancelTarget.doctorName}}</strong><span>{{cancelTarget.clinicName}}</span><small>取消截止：{{full(cancelTarget.cancelCutoffAt)}} 前</small></div><template v-if="selection"><div v-if="!patient" class="b-alert warning">提交前请先登录患者账号。<button type="button" @click="openLogin('patient')">去登录</button></div><div class="b-two-fields"><label>预约人姓名<input v-model="name" :disabled="!!uncertain" required maxlength="100"/></label><label>联系电话<input v-model="contact" :disabled="!!uncertain" required maxlength="40" inputmode="tel"/></label></div><label>就诊意向<textarea v-model="intention" :disabled="!!uncertain" required maxlength="500" placeholder="请简述希望咨询的问题，无需填写详细病历。" rows="2"/></label></template><label v-if="cancelTarget">取消原因<textarea v-model="reason" :disabled="!!uncertain" required maxlength="500" rows="2" placeholder="请简述取消原因"/></label><label class="b-checkbox"><input v-model="confirmed" type="checkbox" required/><span>{{cancelTarget?'我确认取消本次预约，系统将释放本次占用。':'我已核对起止时间、服务时长和变更截止规则。'}}</span></label><BookingRecoveryPanel :pending="!!uncertain" :summary="recoverySummary" :state="recoveryState" :error="recoveryError" :blocked="recoveryBlocked" :working="busy||recoveryWorking" v-model:confirmed="retryConfirmed" @verify="verifyPending" @retry="retryPending" :own-conflict="ownConflict" @view-appointments="viewConflictingAppointments" @finish="recovery.finish"/><button v-if="!uncertain" class="b-button full" :disabled="busy||recoveryWorking||recoveryBlocked||((patient||cancelTarget)&&!confirmed)" :formnovalidate="!patient&&!cancelTarget">{{busy?'正在保存…':cancelTarget?'确认取消':!patient?'先登录患者账号':rescheduling?'确认改约':'确认预约'}}</button><p class="b-help">{{cancelTarget?'取消不撤销真实就诊、治疗或收款。':'提交时再次检查容量与冲突，成功后立即确认。'}}</p></form></div>
</div>
</template>



