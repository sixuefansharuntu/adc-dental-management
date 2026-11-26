const labels = {
  available: '可预约', full: '已约满', paused: '暂停预约', not_open: '尚未开放',
  closed: '不可接诊', past: '已过时', config_unavailable: '暂不可预约'
};
const day = value => new Date(Date.parse(value) + 8 * 3600000).toISOString().slice(0, 10);
const clock = value => new Date(Date.parse(value) + 8 * 3600000).toISOString().slice(11, 16);
const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
function calendar(start, today) {
  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(Date.parse(start) + offset * 86400000);
    const key = date.toISOString().slice(0, 10);
    return { key, weekday: weekdays[date.getUTCDay()], day: date.getUTCDate(),
      label: key === today ? '今天' : (date.getUTCMonth() + 1) + '月' };
  });
}
function slotGroups(slots, showUnavailable) {
  const names = ['凌晨', '上午', '下午', '晚上'];
  const groups = names.map(name => ({ name, entries: [] }));
  for (const slot of slots) {
    if (!showUnavailable && !slot.available) continue;
    const hour = Number(slot.range.slice(0, 2));
    groups[hour < 6 ? 0 : hour < 12 ? 1 : hour < 18 ? 2 : 3].entries.push(slot);
  }
  return groups.filter(group => group.entries.length);
}
function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
function instant(value) {
  return typeof value === 'string' && /(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
}
function text(value) { return typeof value === 'string' && value.trim().length > 0; }
function readCatalogue(result) {
  if (!result || !Array.isArray(result.items)) throw new Error('公开资料读取失败，请刷新重试。');
  const ids = new Set();
  return result.items.map(item => {
    if (!item || !['clinicId', 'doctorId', 'serviceVersionId', 'clinicName', 'doctorName', 'serviceName'].every(k => text(item[k])) ||
      !Number.isInteger(item.durationMinutes) || item.durationMinutes <= 0 ||
      !['address', 'specialty', 'introduction'].every(k => item[k] == null || typeof item[k] === 'string')) {
      throw new Error('公开资料不完整，请刷新重试。');
    }
    const key = [item.clinicId, item.doctorId, item.serviceVersionId].join('/');
    if (ids.has(key)) throw new Error('公开资料重复，请刷新重试。');
    ids.add(key);
    const row = {};
    for (const k of ['clinicId', 'doctorId', 'serviceVersionId', 'clinicName', 'doctorName', 'serviceName', 'durationMinutes', 'address', 'specialty', 'introduction']) row[k] = item[k] == null ? '' : item[k];
    return row;
  });
}
function choices(items, previous) {
  function unique(rows, key) { return rows.filter((row, i) => rows.findIndex(r => r[key] === row[key]) === i); }
  const clinics = unique(items, 'clinicId');
  const clinicIndex = Math.max(0, clinics.findIndex(c => c.clinicId === previous.clinicId));
  const doctors = unique(items.filter(c => c.clinicId === (clinics[clinicIndex] || {}).clinicId), 'doctorId');
  const doctorIndex = Math.max(0, doctors.findIndex(c => c.doctorId === previous.doctorId));
  const services = items.filter(c => c.clinicId === (clinics[clinicIndex] || {}).clinicId && c.doctorId === (doctors[doctorIndex] || {}).doctorId);
  const serviceIndex = Math.max(0, services.findIndex(c => c.serviceVersionId === previous.serviceVersionId));
  return { clinics, clinicNames: clinics.map(c => c.clinicName), clinicIndex,
    doctors, doctorNames: doctors.map(c => c.doctorName), doctorIndex,
    services, serviceNames: services.map(c => `${c.serviceName} · ${c.durationMinutes}分钟`), serviceIndex,
    selected: services[serviceIndex] || null };
}
function readAvailability(result, selected, date) {
  if (!result || !instant(result.queriedAt) || !Array.isArray(result.groups)) throw new Error('时段资料读取失败，请重试。');
  const keys = new Set(), slots = [];
  for (const group of result.groups) {
    if (!group || group.clinicId !== selected.clinicId || group.doctorId !== selected.doctorId ||
      group.serviceVersionId !== selected.serviceVersionId || !text(group.scheduleId) || !Array.isArray(group.slots)) {
      throw new Error('安排已变动，请刷新后重新查询。');
    }
    for (const slot of group.slots) {
      if (!slot || !instant(slot.startsAt) || !instant(slot.endsAt) || Date.parse(slot.endsAt) - Date.parse(slot.startsAt) !== selected.durationMinutes * 60000 ||
        day(slot.startsAt) !== date || typeof slot.status !== 'string') throw new Error('时段资料不完整，请刷新重试。');
      const key = group.scheduleId + '/' + slot.startsAt;
      if (keys.has(key)) throw new Error('时段资料重复，请刷新重试。');
      keys.add(key);
      slots.push({ key, startsAt: slot.startsAt, endsAt: slot.endsAt, scheduleId: group.scheduleId,
        serviceVersionId: group.serviceVersionId, ruleVersionId: typeof group.ruleVersionId === 'string' ? group.ruleVersionId : '',
        range: clock(slot.startsAt) + '—' + (day(slot.startsAt) !== day(slot.endsAt) ? '次日 ' : '') + clock(slot.endsAt),
        available: slot.status === 'available', label: labels[slot.status] || '暂不可预约' });
    }
  }
  slots.sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt) || a.key.localeCompare(b.key));
  return { slots, availableCount: slots.filter(s => s.available).length, queriedAt: clock(result.queriedAt) };
}
function createPublicPage({ request, today, stopRefresh, bookingEnabled = () => false, navigate = () => {}, changeMode = () => false, resetChange = () => {}, scrollToBooking = () => {}, scrollToDoctors = () => {} }) {
  return {
    data: { clinics: [], clinicNames: [], clinicIndex: 0, doctors: [], doctorNames: [], doctorIndex: 0,
      services: [], serviceNames: [], serviceIndex: 0, selected: null, date: '', slots: [], availableCount: 0,
      queriedAt: '', loading: false, ready: false, error: '', bookingEnabled: false, changing: false,
      days: [], today: '', groups: [], showUnavailable: false, selectedSlot: null, showDoctor: false,
      findingNext: false, nextUnavailable: '', nextError: '' },
    onLoad() {
      this._epoch = 0; this._tasks = new Set(); this._visible = true; this._dead = false;
      const date = today();
      this._items = []; this.setData({ date, today: date, days: calendar(date, date), bookingEnabled: bookingEnabled(), changing: changeMode() }); return this.refresh();
    },
    onShow() { if (this._visible === false && !this._dead) { this._visible = true; return this.refresh(); } },
    onHide() { this._visible = false; this._invalidate(); this.setData({ slots: [], groups: [], selectedSlot: null, queriedAt: '', availableCount: 0, loading: false }); },
    onUnload() { this._dead = true; this._visible = false; this._invalidate(); },
    _invalidate() {
      this._epoch++;
      for (const task of this._tasks || []) { try { task.abort(); } catch (_) { /* generation check also rejects late replies */ } }
      if (this._tasks) this._tasks.clear();
    },
    _begin() {
      this._invalidate(); this.setData({ slots: [], groups: [], selectedSlot: null, showUnavailable: false, availableCount: 0, queriedAt: '', loading: true, error: '', findingNext: false, nextUnavailable: '', nextError: '' });
      return this._epoch;
    },
    _current(token) { return !this._dead && this._visible && token === this._epoch; },
    async _get(path, params) {
      const task = request(path, params); this._tasks.add(task);
      try { return await task.promise; } finally { this._tasks.delete(task); }
    },
    async refresh() {
      if (!this._visible || this._dead) return;
      const previous = this.data.selected || {}, token = this._begin();
      const currentDay = today();
      this.setData({ ready: false, changing: changeMode(), showDoctor: false, today: currentDay,
        days: calendar(this.data.days[0]?.key || this.data.date, currentDay) });
      try {
        const result = await this._get('/catalogue');
        if (!this._current(token)) return;
        this._items = readCatalogue(result);
        this.setData({ ...choices(this._items, previous), ready: true });
        await this._loadSlots(token);
      } catch (e) {
        if (this._current(token)) {
          this._items = []; this.setData({ ...choices([], {}), ready: false, error: e.message || '查询失败，请重试。' });
        }
      } finally { if (this._current(token)) this.setData({ loading: false }); }
    },
    async _loadSlots(token) {
      const selected = this.data.selected, date = this.data.date;
      if (!selected) return;
      const result = await this._get('/availability', { date, clinicId: selected.clinicId, doctorId: selected.doctorId, serviceVersionId: selected.serviceVersionId });
      if (this._current(token)) {
        const availability = readAvailability(result, selected, date);
        this.setData({ ...availability, groups: slotGroups(availability.slots, false) });
      }
    },
    async _query() {
      const token = this._begin();
      try { await this._loadSlots(token); }
      catch (e) { if (this._current(token)) this.setData({ error: e.message || '查询失败，请重试。' }); }
      finally { if (this._current(token)) this.setData({ loading: false }); }
    },
    _pick(event, kind) {
      if (!this._visible || this._dead || !this.data.ready) return;
      const raw = event && event.detail && event.detail.value;
      if (!/^(0|[1-9]\d*)$/.test(String(raw))) return;
      const index = Number(raw), rows = this.data[kind + 's'];
      if (!Number.isSafeInteger(index) || !rows[index]) return;
      const row = rows[index];
      const previous = kind === 'clinic' ? { clinicId: row.clinicId } : kind === 'doctor' ?
        { clinicId: row.clinicId, doctorId: row.doctorId } : row;
      this.setData({ ...choices(this._items, previous), showDoctor: false }); return this._query();
    },
    onClinic(e) { return this._pick(e, 'clinic'); },
    onDoctor(e) { return this._pick(e, 'doctor'); },
    onDoctorChoice(e) {
      const index = this.data.doctors.findIndex(row => row.doctorId === e.currentTarget.dataset.id);
      if (index !== this.data.doctorIndex) return this._pick({ detail: { value: index } }, 'doctor');
    },
    onService(e) { return this._pick(e, 'service'); },
    onDate(e) {
      if (!this._visible || this._dead || !this.data.ready || !e || !e.detail || !validDate(e.detail.value)) return;
      const date = e.detail.value;
      const currentDay = today();
      const start = this.data.days.some(day => day.key === date) ? this.data.days[0].key : date;
      this.setData({ date, today: currentDay, days: calendar(start, currentDay) }); return this._query();
    },
    onDayChoice(e) { return this.onDate({ detail: { value: e.currentTarget.dataset.date } }); },
    onToday() {
      const currentDay = today();
      if (!this._visible || this._dead || !this.data.ready) return;
      this.setData({ date: currentDay, today: currentDay, days: calendar(currentDay, currentDay) });
      return this._query();
    },
    async onFindNext() {
      const {selected, date, loading, findingNext, availableCount, error, nextUnavailable} = this.data;
      if (!this._visible || this._dead || !selected || loading || findingNext || availableCount || error || nextUnavailable) return;
      this._invalidate();
      const token = this._epoch;
      this.setData({ findingNext: true, nextError: '' });
      try {
        const { clinicId, doctorId, serviceVersionId } = selected;
        const result = await this._get('/availability/next', { after: date, clinicId, doctorId, serviceVersionId });
        if (!this._current(token)) return;
        if (!result || !instant(result.queriedAt) || !Array.isArray(result.groups)) throw Error('查询结果不完整，请重试。');
        if (result.date === null && result.groups.length === 0) {
          const { searchedFrom, searchedThrough } = result;
          const period = validDate(searchedFrom) && validDate(searchedThrough) ? searchedFrom + ' 至 ' + searchedThrough : '当前开放预约范围内';
          this.setData({ nextUnavailable: period + '，当前医生和服务暂无可约时段。' });
          return;
        }
        if (!validDate(result.date) || result.date <= date) throw Error('查询结果不完整，请重试。');
        const availability = readAvailability(result, selected, result.date);
        if (!availability.availableCount) throw Error('可约时段已变化，请重新查找。');
        const currentDay = today();
        const start = this.data.days.some(item => item.key === result.date) ? this.data.days[0].key : result.date;
        this.setData({ ...availability, date: result.date, today: currentDay, days: calendar(start, currentDay),
          groups: slotGroups(availability.slots, false), showUnavailable: false, selectedSlot: null });
      } catch (e) {
        if (this._current(token)) this.setData({ nextError: e.message || '查询失败，请重试。' });
      } finally { if (this._current(token)) this.setData({ findingNext: false }); }
    },
    onFocusDoctors() { scrollToDoctors(); },
    onScrollToBooking() { scrollToBooking(); },
    onToggleDoctor() { this.setData({ showDoctor: !this.data.showDoctor }); },
    onToggleUnavailable() {
      if (this.data.loading) return;
      const showUnavailable = !this.data.showUnavailable;
      this.setData({ showUnavailable, groups: slotGroups(this.data.slots, showUnavailable) });
    },
    onNewBooking() { resetChange(); this.setData({ changing: changeMode(), selectedSlot: null }); },
    onRecovery() { if (this.data.bookingEnabled) navigate('/pages/recovery/index'); },
    onMine() { if (this.data.bookingEnabled && this._visible && !this._dead) navigate('/pages/appointments/index'); },
    onRetry() { return this.refresh(); },
    onSelectSlot(e) {
      if (!this._visible || this._dead || !this.data.bookingEnabled || this.data.loading) return;
      const slot = this.data.slots.find(s => s.key === e.currentTarget.dataset.key);
      if (!slot || !slot.available) return;
      this.setData({ selectedSlot: slot });
    },
    onContinue() {
      if (this.data.selectedSlot) return this._openBooking(this.data.selectedSlot.key);
    },
    onBook(e) { return this._openBooking(e.currentTarget.dataset.key); },
    _openBooking(key) {
      if (!this._visible || this._dead || !this.data.bookingEnabled || this.data.loading) return;
      const slot = this.data.slots.find(s => s.available && s.key === key);
      if (!slot) return;
      try {
        const selected = require('./booking-page').selection(slot);
        this.setData({ selectedSlot: null });
        const { clinicName, doctorName, serviceName, address } = this.data.selected;
        const preview = { selection: selected, clinicName, doctorName, serviceName, address, range: this.data.date + ' ' + slot.range };
        navigate('/pages/booking/index?' + Object.keys(selected).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(selected[k])).join('&'), preview);
      } catch (_) { this.setData({ error: '安排已变化，请刷新后重新选择。' }); }
    },
    onPullDownRefresh() { return this.refresh().finally(() => stopRefresh()); }
  };
}
module.exports = { createPublicPage };
