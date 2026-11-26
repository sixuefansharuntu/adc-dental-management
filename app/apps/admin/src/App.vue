<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw, Users, Package, Wallet, Settings, ArrowUpRight, Clock3, Check, X, LockKeyhole, Database, LogOut, Stethoscope, CircleHelp, Smartphone, LayoutDashboard } from '@lucide/vue';

interface Doctor { id: string; clinicName: string; publicName: string; specialty: string; serviceName: string; durationMinutes: number }
interface Slot { startsAt: string; endsAt: string; status: string }
interface Schedule { id: string; doctorId: string; doctorName: string; clinicName: string; specialty: string; serviceName: string; startsAt: string; endsAt: string; publicStatus: string; version: number; slots: Slot[]; bookingEnabled: false }
const patientOnly = new URLSearchParams(location.search).get('view') === 'patient';
const loading = ref(true), saving = ref(''), error = ref(''), notice = ref(''), connected = ref(false), dbVersion = ref('');
const doctors = ref<Doctor[]>([]), schedules = ref<Schedule[]>([]), publicSchedules = ref<Schedule[]>([]);
const selectedClinic = ref(''), selectedDoctor = ref(''), selectedDate = ref('2026-10-25'), seedDate = ref('2026-10-25');
const patientDoctor = ref(''), loggedIn = ref(false), loginOpen = ref(false), password = ref(''), loginError = ref(''), loggingIn = ref(false);
const passwordField = ref<HTMLInputElement | null>(null);
const uncertain = ref<{ id: string; body: { publicStatus: string; version: number; requestId: string } } | null>(null);
let generation = 0;
class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController(); const timeout = window.setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`/api${path}`, { credentials: 'same-origin', ...options, signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...options.headers } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new ApiError(response.status, Array.isArray(body.message) ? body.message.join('；') : body.message || '请求失败，请稍后重试。');
    return body;
  } finally { clearTimeout(timeout); }
}
const clinics = computed(() => [...new Set(doctors.value.map(d => d.clinicName))]);
const clinicDoctors = computed(() => doctors.value.filter(d => !selectedClinic.value || d.clinicName === selectedClinic.value));
const visible = computed(() => schedules.value.filter(s => (!selectedClinic.value || s.clinicName === selectedClinic.value) && (!selectedDoctor.value || s.doctorId === selectedDoctor.value)));
const openRows = computed(() => visible.value.filter(s => s.publicStatus === 'open').length);
const selectedPublicDoctor = computed(() => clinicDoctors.value.find(d => d.id === patientDoctor.value) || clinicDoctors.value[0]);
const patientSlots = computed(() => publicSchedules.value.filter(s => s.doctorId === selectedPublicDoctor.value?.id).flatMap(s => s.slots));
const availableCount = computed(() => patientSlots.value.filter(s => s.status === 'available').length);
const weekDates = computed(() => Array.from({ length: 7 }, (_,i) => { const d = new Date(`${seedDate.value}T00:00:00Z`); d.setUTCDate(d.getUTCDate()+i); return d.toISOString().slice(0,10); }));
const dayLabel = (value: string) => new Date(`${value}T12:00:00+08:00`).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long', timeZone: 'Asia/Shanghai' });
const shortWeekday = (value: string) => new Date(`${value}T12:00:00+08:00`).toLocaleDateString('zh-CN', { weekday: 'short', timeZone: 'Asia/Shanghai' });
const timeLabel = (value: string) => new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Shanghai' }).format(new Date(value));
function setClinic() { selectedDoctor.value = ''; patientDoctor.value = clinicDoctors.value[0]?.id || ''; }
async function refresh() {
  const mine = ++generation; loading.value = true; error.value = '';
  try {
    const health = await api<{ database: { version: string }; demoDate: string }>('/health');
    connected.value = true; dbVersion.value = health.database.version; seedDate.value = health.demoDate;
    const [people, pub] = await Promise.all([api<Doctor[]>('/public/doctors'), api<Schedule[]>(`/public/schedules?date=${selectedDate.value}`)]);
    let rows = pub;
    if (loggedIn.value && !patientOnly) {
      try { rows = await api<Schedule[]>(`/admin/schedules?date=${selectedDate.value}`); }
      catch (e) { if (e instanceof ApiError && e.status === 401) loggedIn.value = false; else throw e; }
    }
    if (mine !== generation) return;
    doctors.value = people; publicSchedules.value = pub; schedules.value = rows;
    if (!selectedClinic.value) selectedClinic.value = people[0]?.clinicName || '';
    if (!patientDoctor.value) patientDoctor.value = people[0]?.id || '';
  } catch(e) {
    if (mine !== generation) return;
    error.value = e instanceof Error ? e.message : '连接失败';
    connected.value = false; schedules.value = []; publicSchedules.value = [];
  } finally { if (mine === generation) loading.value = false; }
}
function pickDate(value: string) { selectedDate.value = value; notice.value = ''; refresh(); }
function moveDate(amount: number) { const date = new Date(`${selectedDate.value}T00:00:00Z`); date.setUTCDate(date.getUTCDate()+amount); pickDate(date.toISOString().slice(0,10)); }
async function openLogin() { loginOpen.value = true; loginError.value = ''; password.value = ''; await nextTick(); passwordField.value?.focus(); }
async function login() {
  loggingIn.value = true; loginError.value = '';
  try { await api('/admin/session', { method:'POST', body: JSON.stringify({ password: password.value }) }); loggedIn.value = true; loginOpen.value = false; password.value=''; await refresh(); notice.value='本机技术账号已登录，可以维护示例排班。'; }
  catch(e) { loginError.value = e instanceof Error ? e.message : '登录失败'; }
  finally { loggingIn.value = false; }
}
async function logout() { try { await api('/admin/logout',{method:'POST',body:'{}'}); loggedIn.value=false; uncertain.value=null; await refresh(); } catch(e) { error.value=String(e); } }
async function change(row: Schedule) {
  if (!loggedIn.value) return openLogin();
  if (uncertain.value) { error.value='请先核实上一笔结果不明的提交。'; return; }
  const body = { publicStatus: row.publicStatus === 'open' ? 'paused' : 'open', version: row.version, requestId: crypto.randomUUID() };
  await submitChange(row.id,body);
}
async function submitChange(id: string, body: { publicStatus: string; version: number; requestId: string }) {
  saving.value=id; error.value=''; notice.value='';
  try {
    await api(`/admin/schedules/${id}/status`,{method:'POST',body:JSON.stringify(body)});
    uncertain.value=null; await refresh(); notice.value='排班状态已保存到PostgreSQL，患者预览已刷新。';
  } catch(e) {
    if (e instanceof ApiError) { uncertain.value=null; if(e.status===401)loggedIn.value=false; error.value=e.message; if(e.status===409)await refresh(); }
    else { uncertain.value={id,body}; error.value='提交结果暂不明确。请核实原提交，不要重复创建新的请求。'; }
  } finally { saving.value=''; }
}
function escapeDialog(e: KeyboardEvent) { if(e.key==='Escape'&&!loggingIn.value)loginOpen.value=false; }
onMounted(async () => { window.addEventListener('keydown',escapeDialog); try { const health=await api<{demoDate:string}>('/health'); selectedDate.value=health.demoDate; if (!patientOnly) { await api('/admin/session'); loggedIn.value=true; } } catch {} await refresh(); });
onUnmounted(() => window.removeEventListener('keydown',escapeDialog));
</script>

<template>
  <div class="workspace" :class="{'patient-only':patientOnly}">
    <aside v-if="!patientOnly" class="sidebar">
      <a class="brand" href="/"><span class="brand-mark"><Stethoscope :size="23" /></span><span>ADC<span class="brand-sub">DENTAL CARE</span></span></a>
      <div class="workspace-label">诊所运营管理 <span>LOCAL</span></div>
      <nav aria-label="工作台导航">
        <span class="nav-section">日常工作</span>
        <button class="nav-item active" aria-current="page"><CalendarDays :size="19"/>排班与预约<span class="nav-dot"></span></button>
        <button class="nav-item" disabled><Users :size="19"/>患者与诊疗<span class="soon">待开发</span></button>
        <button class="nav-item" disabled><Package :size="19"/>物资与库存<span class="soon">待开发</span></button>
        <span class="nav-section second">经营管理</span>
        <button class="nav-item" disabled><Wallet :size="19"/>季度核算<span class="soon">待开发</span></button>
        <button class="nav-item" disabled><LayoutDashboard :size="19"/>经营分析<span class="soon">待开发</span></button>
        <button class="nav-item" disabled><Settings :size="19"/>基础管理<span class="soon">待开发</span></button>
      </nav>
      <div class="sidebar-note"><span class="tiny-label">开发批次 00</span><strong>先连接，后完善。</strong><p>基于完整设计166<br>当前使用合成技术验证数据</p><div class="progress-track"><i></i></div><span class="small-muted">正在验证基础设施</span></div>
      <div class="sidebar-bottom"><CircleHelp :size="16"/><span>本地开发环境</span><span class="small-dot"></span></div>
    </aside>

    <main v-if="!patientOnly" class="main-content">
      <header class="topbar"><div class="breadcrumb">工作台 <ChevronRight :size="14"/><strong>排班与公开时段</strong></div><div class="topbar-right"><span class="connection" :class="{offline:!connected}"><i></i>{{connected?'数据库已连接':'正在检查连接'}}</span><span class="separator"></span><button v-if="!loggedIn" class="account-button" @click="openLogin"><span class="avatar small">访</span>只读访客<ChevronRight :size="14"/></button><button v-else class="account-button" @click="logout"><span class="avatar small">技</span>技术账号<LogOut :size="15"/></button></div></header>
      <div class="page-body">
        <div class="page-heading"><div><div class="eyebrow">SCHEDULE & AVAILABILITY</div><h1>排班与可约时段</h1><p>统一维护示例排班，查看患者端读取到的公开安排。</p></div><a class="secondary-button" href="/?view=patient" target="_blank" rel="noopener"><Smartphone :size="17"/>打开患者预览<ArrowUpRight :size="15"/></a></div>
        <div class="scope-banner"><span class="scope-tag">技术验证</span><span>当前验证真实数据库读写，尚未开放正式预约、微信登录和临床业务。</span><span class="scope-version">BASELINE 166</span></div>
        <div class="metric-grid">
          <div class="metric-card"><div class="metric-label">当前诊所医生<Users :size="17"/></div><div class="metric-value">{{clinicDoctors.length}}<span>位</span></div><div class="metric-foot">均为合成示例资料</div></div>
          <div class="metric-card"><div class="metric-label">当日排班区间<CalendarDays :size="17"/></div><div class="metric-value">{{visible.length}}<span>段</span></div><div class="metric-foot">{{dayLabel(selectedDate)}}</div></div>
          <div class="metric-card"><div class="metric-label">已开放区间<Clock3 :size="17"/></div><div class="metric-value teal">{{openRows}}<span>段</span></div><div class="metric-foot"><i class="tiny-status"></i>根据当前数据库状态</div></div>
          <div class="metric-card connection-card"><div class="metric-label">数据来源<Database :size="17"/></div><div class="metric-value engine">PostgreSQL</div><div class="metric-foot">{{connected?`原生进程 · ${dbVersion}`:'连接尚未就绪'}}</div></div>
        </div>

        <div v-if="error" class="alert error" role="alert">{{error}}<button v-if="uncertain" @click="submitChange(uncertain.id,uncertain.body)" :disabled="!!saving">核实原提交</button><button v-else @click="refresh">刷新核实</button></div>
        <div v-if="notice" class="alert success" role="status"><Check :size="17"/>{{notice}}<button @click="notice=''" aria-label="关闭提示"><X :size="15"/></button></div>

        <div class="work-grid">
          <section class="schedule-panel panel" aria-labelledby="schedule-title">
            <div class="panel-heading"><div><h2 id="schedule-title">医生排班</h2><span>维护公开状态，患者端共享同一数据来源</span></div><button class="icon-button" @click="refresh" :disabled="loading" aria-label="刷新排班"><RefreshCw :size="17" :class="{spinning:loading}"/></button></div>
            <div class="filter-row"><label>诊所<select v-model="selectedClinic" @change="setClinic"><option v-for="clinic in clinics" :key="clinic">{{clinic}}</option></select></label><label>医生<select v-model="selectedDoctor"><option value="">全部医生</option><option v-for="d in clinicDoctors" :key="d.id" :value="d.id">{{d.publicName}}</option></select></label></div>
            <div class="calendar-strip"><button class="icon-button" @click="moveDate(-1)" aria-label="前一天"><ChevronLeft :size="17"/></button><button v-for="day in weekDates" :key="day" class="day-button" :class="{selected:day===selectedDate}" @click="pickDate(day)"><span>{{shortWeekday(day)}}</span><strong>{{Number(day.slice(-2))}}</strong><i v-if="day===selectedDate"></i></button><button class="icon-button" @click="moveDate(1)" aria-label="后一天"><ChevronRight :size="17"/></button></div>
            <div class="table-caption"><strong>{{dayLabel(selectedDate)}}</strong><span>Asia/Shanghai · 服务时长按演示配置</span></div>
            <div v-if="loading" class="empty-state"><RefreshCw :size="24" class="spinning"/><span>正在读取排班…</span></div>
            <div v-else-if="!visible.length" class="empty-state"><CalendarDays :size="32"/><strong>{{error?'暂时无法读取排班':'这一天没有示例排班'}}</strong><span>示例覆盖{{seedDate}}起的7天，可切换日期或刷新。</span></div>
            <div v-else class="table-scroll"><table class="schedule-table"><thead><tr><th>医生 / 服务</th><th>接诊区间</th><th>公开状态</th><th class="action-heading">操作</th></tr></thead><tbody><tr v-for="row in visible" :key="row.id"><td><div class="doctor-cell"><span class="avatar" :class="{warm:row.doctorName.startsWith('周')}">{{row.doctorName.slice(0,1)}}</span><div><strong>{{row.doctorName}}</strong><span>{{row.specialty}} · {{row.serviceName.replace('（演示配置）','')}}</span></div></div></td><td><strong class="time-range">{{timeLabel(row.startsAt)}} — {{timeLabel(row.endsAt)}}</strong><span class="cell-sub">每次{{clinicDoctors.find(d=>d.id===row.doctorId)?.durationMinutes}}分钟 · 演示配置</span></td><td><span class="status-badge" :class="row.publicStatus"><i></i>{{{open:'已开放',paused:'已暂停',not_open:'未开放'}[row.publicStatus]}}</span></td><td class="action-cell"><button class="text-button" @click="change(row)" :disabled="!!saving||!!uncertain">{{saving===row.id?'保存中…':loggedIn?(row.publicStatus==='open'?'暂停公开':'恢复公开'):'登录维护'}}</button><span class="version">v{{row.version}}</span></td></tr></tbody></table></div>
            <div class="panel-footer"><LockKeyhole :size="14"/><span>{{loggedIn?'更正采用当前版本检查，保存后刷新患者预览。':'公开查询无需登录；维护排班需本机技术账号。'}}</span></div>
          </section>

          <section class="patient-panel panel" aria-labelledby="patient-title">
            <div class="panel-heading"><div><h2 id="patient-title">患者视角</h2><span>公开字段预览</span></div><span class="live-tag"><i></i>真实接口</span></div>
            <div class="patient-preview"><div class="patient-hero"><span class="patient-brand"><Stethoscope :size="18"/> ADC 牙科</span><h3>为您的笑容<br>安排一个好时间。</h3><span>医生与时段 · 公开查询</span><div class="hero-orbit orbit-one"></div><div class="hero-orbit orbit-two"></div></div>
              <div class="patient-content"><label class="patient-selector">选择医生<select v-model="patientDoctor"><option v-for="doctor in clinicDoctors" :key="doctor.id" :value="doctor.id">{{doctor.publicName}} · {{doctor.specialty}}</option></select></label><div class="patient-date"><CalendarDays :size="15"/><strong>{{dayLabel(selectedDate)}}</strong><span>{{availableCount}}个示例时段</span></div><div class="slot-legend"><span><i></i>开放</span><span><i class="grey"></i>不可约</span></div>
                <div v-if="loading" class="preview-empty">正在读取公开安排…</div><div v-else-if="!patientSlots.length" class="preview-empty">{{error?'连接暂不可用':'暂无公开时段，请选择其他医生或日期。'}}</div><div v-else class="slot-grid"><button v-for="slot in patientSlots" :key="slot.startsAt" class="slot" :class="slot.status" disabled><span>{{timeLabel(slot.startsAt)}}</span><small>{{slot.status==='available'?'开放展示':'暂不可约'}}</small></button></div>
                <p class="patient-note">仅展示排班与配置时长。正式容量、身份校验与预约提交将在后续批次实现。</p><button class="patient-submit" disabled>预约功能开发中</button><span class="patient-disclaimer">技术验证 · 非真实诊疗服务</span></div>
            </div>
          </section>
        </div>
        <footer class="page-footer"><span>ADC Dental Management · 本地技术验证</span><span>数据持久化于PostgreSQL · 不含真实患者资料</span></footer>
      </div>
    </main>

    <main v-else class="standalone-patient"><a href="/" class="back-link"><ChevronLeft :size="16"/>回到工作台</a><section class="patient-preview"><div class="patient-hero"><span class="patient-brand"><Stethoscope :size="19"/> ADC 牙科</span><h3>为您的笑容<br>安排一个好时间。</h3><span>公开排班查询 · 技术验证</span><div class="hero-orbit orbit-one"></div></div><div class="patient-content"><p class="standalone-notice">当前为示例数据预览，尚不受理预约。</p><label class="patient-selector">诊所<select v-model="selectedClinic" @change="setClinic"><option v-for="clinic in clinics" :key="clinic">{{clinic}}</option></select></label><label class="patient-selector">医生<select v-model="patientDoctor"><option v-for="doctor in clinicDoctors" :key="doctor.id" :value="doctor.id">{{doctor.publicName}} · {{doctor.specialty}}</option></select></label><label class="patient-selector">就诊日期<input type="date" v-model="selectedDate" @change="refresh"/></label><div v-if="error" class="alert error">{{error}}<button @click="refresh">重试</button></div><div v-if="loading" class="preview-empty">正在查询…</div><div v-else class="slot-grid"><button v-for="slot in patientSlots" :key="slot.startsAt" class="slot" :class="slot.status" disabled><span>{{timeLabel(slot.startsAt)}}</span><small>{{slot.status==='available'?'开放展示':'暂不可约'}}</small></button></div><p v-if="!loading&&!patientSlots.length" class="patient-note">当前没有公开时段，请调整日期或医生。</p><button class="patient-submit" disabled>预约功能开发中</button><span class="patient-disclaimer">技术验证 · 非真实诊疗服务</span></div></section></main>

    <div v-if="loginOpen" class="modal-backdrop" @click.self="!loggingIn&&(loginOpen=false)"><section class="login-dialog" role="dialog" aria-modal="true" aria-labelledby="login-title"><button class="dialog-close icon-button" @click="loginOpen=false" :disabled="loggingIn" aria-label="关闭登录"><X :size="20"/></button><span class="login-icon"><LockKeyhole :size="25"/></span><h2 id="login-title">登录本机技术账号</h2><p>此账号仅维护本地合成排班，不代表正式员工账号或微信身份。</p><form @submit.prevent="login"><label>开发密码<input ref="passwordField" v-model="password" type="password" autocomplete="current-password" required placeholder="输入本机启动说明中的密码"/></label><p class="password-help">密码位于 app/.runtime/启动信息.txt</p><div v-if="loginError" class="alert error" role="alert">{{loginError}}</div><button class="primary-button" :disabled="loggingIn">{{loggingIn?'正在验证…':'登录并维护排班'}}<ArrowUpRight :size="16"/></button></form></section></div>
  </div>
</template>
