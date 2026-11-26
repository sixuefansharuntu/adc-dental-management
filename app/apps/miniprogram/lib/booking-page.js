const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value);
function selection(value) {
  if (!value || !['scheduleId', 'serviceVersionId', 'ruleVersionId'].every(k => uuid(value[k])) ||
    typeof value.startsAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value.startsAt) || !/(Z|[+-]\d{2}:\d{2})$/.test(value.startsAt) || !Number.isFinite(Date.parse(value.startsAt))) throw new Error('预约时段无效，请返回重新选择。');
  return { scheduleId: value.scheduleId, serviceVersionId: value.serviceVersionId, ruleVersionId: value.ruleVersionId, startsAt: new Date(value.startsAt).toISOString() };
}
function clock(value) { return new Date(Date.parse(value) + 8 * 3600000).toISOString().slice(0, 16).replace('T', ' '); }
function checkedQuote(q, s) {
  if (!q || q.startsAt !== s.startsAt || q.serviceVersionId !== s.serviceVersionId || q.ruleVersionId !== s.ruleVersionId ||
    !Number.isInteger(q.durationMinutes) || q.durationMinutes < 1 || Date.parse(q.endsAt) - Date.parse(q.startsAt) !== q.durationMinutes * 60000 ||
    !['doctorName', 'clinicName', 'serviceName'].every(k => typeof q[k] === 'string' && q[k])) throw new Error('核对结果已变化，请返回重新查询。');
  return { doctorName: q.doctorName, clinicName: q.clinicName, serviceName: q.serviceName, durationMinutes: q.durationMinutes,
    range: clock(q.startsAt) + ' — ' + clock(q.endsAt), address: typeof q.address === 'string' ? q.address : '' };
}
function result(value) {
  const id = value && (value.appointmentId || value.id);
  if (!uuid(id) || !Number.isSafeInteger(value.version) || value.version < 1 || value.disposition !== 'active') throw new Error('提交结果尚不完整，请核实原请求。');
  return { id, version: value.version, disposition: value.disposition };
}
function form(value) {
  const out = {};
  for (const [key, max] of [['name', 100], ['contact', 40], ['intention', 500]]) {
    if (typeof value[key] !== 'string' || !value[key].trim() || value[key].trim().length > max || /[\u0000-\u001f]/.test(value[key])) throw new Error('请完整填写姓名、联系电话及就诊意向。');
    out[key] = value[key].trim();
  }
  if (!/^\+?[0-9 ()-]{6,40}$/.test(out.contact)) throw new Error('请填写有效的联系电话。');
  return out;
}
function createBookingPage({ api, state, enabled, newRequestId, takePreview = () => null }) {
  return {
    data: { changing: false, enabled: false, patient: null, passwordReset: 0, form: { name: '', contact: '', intention: '' },
      phase: 'needs_login', preview: null, summary: null, quote: null, confirmed: false, retryConfirmed: false, retryAllowed: false, busy: false, error: '', result: null },
    onLoad(options) {
      this._visible = true; this._dead = false; this._epoch = 0;
      const preview = takePreview();
      this.setData({ enabled: enabled(), changing: !!state.reschedule || state.pending?.kind === 'reschedule' });
      if (!this.data.enabled) { this.setData({ phase: 'disabled' }); return; }
      try {
        this._selection = state.pending ? state.pending.selection : selection({ ...options, startsAt: decodeURIComponent(options.startsAt || '') });
        if (preview && Object.keys(this._selection).every(key => preview.selection?.[key] === this._selection[key])) {
          const { clinicName, doctorName, serviceName, address, range } = preview;
          this.setData({ preview: { clinicName, doctorName, serviceName, address, range } });
        }
      }
      catch (e) { this.setData({ phase: 'invalid', error: e.message }); }
    },
    onHide() { this._visible = false; this._epoch++; this.setData({ busy: false, quote: null, confirmed: false, passwordReset: this.data.passwordReset + 1 }); },
    onUnload() { this._dead = true; this._visible = false; this._epoch++; },
    onShow() {
      if (this._visible === false && !this._dead) {
        this._visible = true;
        if (!this.data.enabled || this.data.phase === 'saved' || this.data.phase === 'retired' || !this._selection) return;
        if (state.pending && this.data.patient) return this.onRecover();
        this.setData({ phase: this._invalidChange ? 'invalid' : this.data.patient ? 'ready' : 'needs_login' });
      }
    },
    _current(t) { return !this._dead && this._visible && this._epoch === t; },
    onInput(e) {
      if (!this._visible || this._dead || this.data.busy) return;
      const field = e.currentTarget.dataset.field, value = e.detail.value;
      if (typeof value !== 'string') return;
      if (['name', 'contact', 'intention'].includes(field) && !state.pending && this.data.phase !== 'saved') this.setData({ form: { ...this.data.form, [field]: value }, quote: null, confirmed: false, phase: this.data.patient ? 'ready' : 'needs_login' });
    },
    async onLogin(e) {
      if (!this.data.enabled || !this._selection || this.data.busy || !this._visible || this._dead) return;
      const token = ++this._epoch;
      this.setData({ busy: true, error: '', passwordReset: this.data.passwordReset + 1, quote: null, confirmed: false, patient: null });
      try {
        const patient = await api.login(e?.detail?.value);
        if (!this._current(token)) return;
        if (state.pending && state.pending.subjectId !== patient.subjectId) { await api.logout(); throw new Error('原请求尚未核实，请使用原合成患者账号。'); }
        this.setData({ patient, form: state.pending ? { ...state.pending.form } : state.reschedule && state.reschedule.subjectId === patient.subjectId ? { ...state.reschedule.form } : { name: patient.name, contact: patient.contact, intention: '' }, phase: state.pending ? 'unknown' : 'ready' });
        if (state.reschedule && state.reschedule.subjectId !== patient.subjectId) { state.reschedule = null; this._invalidChange = true; this.setData({ phase: 'invalid', error: '改约身份已变化，请返回我的预约重新选择。' }); }
      } catch (e) { if (this._current(token)) this.setData({ error: e.message, phase: 'needs_login' }); }
      finally { if (this._current(token)) this.setData({ busy: false }); }
    },
    async onQuote() {
      if (this._invalidChange || !this.data.patient || this.data.busy || state.pending || !this._visible || this._dead) return;
      let fields; try { fields = form(this.data.form); } catch (e) { this.setData({ error: e.message }); return; }
      const token = ++this._epoch;
      this.setData({ busy: true, error: '', confirmed: false, quote: null });
      try { const q = checkedQuote(await api.quote(this._selection), this._selection); if (this._current(token)) this.setData({ quote: q, form: fields, phase: 'quoted' }); }
      catch (e) { if (this._current(token)) this.setData({ error: e.message, phase: e.status === 401 ? 'needs_login' : 'ready', ...(e.status === 401 ? { patient: null } : {}) }); }
      finally { if (this._current(token)) this.setData({ busy: false }); }
    },
    onConfirm(e) { if (!this.data.busy) this.setData({ confirmed: Array.isArray(e.detail.value) && e.detail.value.includes('yes') }); },
    onRetryConfirm(e) { if (!this.data.busy) this.setData({ retryConfirmed: Array.isArray(e.detail.value) && e.detail.value.includes('yes') }); },
    async onSubmit() {
      if (!this._visible || this._dead || this.data.busy || state.pending || !this.data.patient || this.data.phase !== 'quoted' || !this.data.quote || !this.data.confirmed) return;
      const token = ++this._epoch, patient = this.data.patient;
      this.setData({ busy: true, error: '' });
      try {
        const fields = form(this.data.form), request = await newRequestId();
        if (!this._current(token)) return;
        if (!uuid(request)) throw new Error('请求编号生成失败。');
        const change = state.reschedule;
        state.pending = { subjectId: patient.subjectId, kind: change ? 'reschedule' : 'book', appointmentId: change ? change.id : null, selection: { ...this._selection }, form: { ...fields }, body: { ...this._selection, ...fields, requestId: request, ...(change ? { version: change.version } : {}) }, phase: 'unknown', result: null, summary: { ...this.data.quote } };
        await this._send(token, false);
      } catch (e) { if (this._current(token)) this.setData({ error: e.message }); }
      finally { if (this._current(token)) this.setData({ busy: false }); }
    },
    async _send(token, retry) {
      const pending = state.pending;
      try {
        const saved = result(await (pending.kind === 'reschedule' ? api.reschedule(pending.appointmentId, { ...pending.body }) : api.book({ ...pending.body })));
        if (state.pending !== pending) return;
        pending.phase = 'saved'; pending.result = saved; if (pending.kind === 'reschedule') state.reschedule = null;
        if (this._current(token)) this._showResult(pending);
      } catch (e) {
        if (state.pending !== pending) return;
        if (!retry && e.definite && e.status !== 401) state.pending = null;
        if (this._current(token)) this.setData({ phase: e.status === 401 ? 'needs_login' : state.pending ? 'unknown' : 'ready', quote: null, confirmed: false, retryAllowed: false, error: e.message, ...(e.status === 401 ? { patient: null } : {}) });
      }
    },
    _showResult(pending) {
      this.setData({ phase: 'saved', changing: pending.kind === 'reschedule', result: pending.result,
        summary: pending.summary || null, quote: null, confirmed: false, error: '', retryAllowed: false });
    },
    async _recover(token) {
      const pending = state.pending;
      if (!pending || !this.data.patient || pending.subjectId !== this.data.patient.subjectId) return;
      if (pending.phase === 'saved') { if (this._current(token)) this._showResult(pending); return 'completed'; }
      const status = await api.status(pending.body.requestId, pending.kind, pending.appointmentId);
      if (!this._current(token) || state.pending !== pending) return;
      if (status.state === 'retired') { state.pending = null; if(pending.kind==='reschedule')state.reschedule=null; this.setData({phase:'retired',quote:null,confirmed:false,retryAllowed:false,error:''}); return 'retired'; }
      if (status.state === 'completed') {
        const saved = result(status); pending.phase = 'saved'; pending.result = saved; if (pending.kind === 'reschedule') state.reschedule = null;
        this._showResult(pending);
      } else if (status.state === 'not_found' || status.state === 'processing') {
        this.setData({ phase: 'unknown', retryAllowed: status.state === 'not_found', retryConfirmed: false, error: status.state === 'processing' ? '原请求仍在处理，请稍后再次核实。' : '暂未查到原请求结果，确认后可重试同一请求。' });
      } else throw new Error('原请求结果尚不能核实，请稍后再查。');
      return status.state;
    },
    async onRecover() {
      if (!state.pending || !this.data.patient || this.data.busy || !this._visible || this._dead) return;
      const token = ++this._epoch; this.setData({ busy: true, error: '', retryAllowed: false, retryConfirmed: false });
      try { await this._recover(token); }
      catch (e) { if (this._current(token)) this.setData({ error: e.message, phase: e.status === 401 ? 'needs_login' : 'unknown', ...(e.status === 401 ? { patient: null } : {}) }); }
      finally { if (this._current(token)) this.setData({ busy: false }); }
    },
    async onRetrySubmit() {
      if (!state.pending || !this.data.patient || this.data.busy || !this.data.retryAllowed || !this.data.retryConfirmed || !this._visible || this._dead) return;
      const token = ++this._epoch; this.setData({ busy: true, error: '', retryAllowed: false, retryConfirmed: false });
      try { if (await this._recover(token) === 'not_found' && this._current(token)) await this._send(token, true); }
      catch (e) { if (this._current(token)) this.setData({ error: e.message, phase: e.status === 401 ? 'needs_login' : 'unknown', ...(e.status === 401 ? { patient: null } : {}) }); }
      finally { if (this._current(token)) this.setData({ busy: false }); }
    },
    async onLogout() {
      if (this.data.busy || !this._visible || this._dead) return;
      if (state.pending && state.pending.phase !== 'saved') { this.setData({ error: '请先核实原请求，再退出验证。' }); return; }
      const token = ++this._epoch; this.setData({ busy: true });
      try { await api.logout(); if (state.pending && state.pending.phase === 'saved') state.pending = null; state.reschedule = null; }
      catch (_) { /* Local credential is always forgotten by the adapter. */ }
      finally { if (this._current(token)) this.setData({ busy: false, patient: null, phase: 'needs_login', quote: null, confirmed: false, result: null, form: { name: '', contact: '', intention: '' } }); }
    }
  };
}
module.exports = { createBookingPage, selection };
