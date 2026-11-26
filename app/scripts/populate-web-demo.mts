import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fixtureId as fixture } from './seed.mjs';

const tz = 'Asia/Shanghai';
const requestId = () => ({ requestId: randomUUID() });
const shiftDate = (date: string, days: number) =>
  new Date(Date.parse(date + 'T00:00:00Z') + days * 86400000).toISOString().slice(0, 10);

export async function populateWebDemo(origin: string, demoDate: string, accounts: Record<string, string>, days: number) {
  assert.match(origin, /^http:\/\/localhost:\d+$/);
  assert.match(process.env.PGDATABASE ?? '', /^adc_web_demo_test_\d+$/);

  return populateDemoData(async (path, body, cookie) => {
    const response = await fetch(origin + '/api/v1' + path, {
      method: body ? 'POST' : 'GET',
      headers: {
        ...(body ? { Origin: origin, 'Content-Type': 'application/json' } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    if (!response.ok) throw Error(`演示数据操作 ${path} 失败（${response.status}）：${data.message ?? '未知错误'}`);
    return { data, cookie: response.headers.get('set-cookie')?.split(';')[0] };
  }, demoDate, accounts, days);
}

type DemoCall = (path: string, body?: object, cookie?: string) => Promise<{data:any;cookie?:string}>;
type DemoSchedulePreparation = (call: DemoCall, staff: Map<string,string>, catalogue: any[]) => Promise<void>;

export async function populateDemoData(call: DemoCall, demoDate: string, accounts: Record<string,string>, days: number,
  options: {historyEnd?:string; prepareSchedules?:DemoSchedulePreparation} = {}) {
  const staff = new Map<string, string>();
  for (const loginName of ['front.east', 'front.river', 'doctor.lin', 'doctor.zhou', 'nurse.east']) {
    const session = await call('/staff/session', { loginName, password: accounts[loginName] });
    assert.ok(session.cookie);
    staff.set(loginName, session.cookie);
  }
  const patients = new Map<string, string>();
  for (const loginName of ['alice', 'bob']) {
    const session = await call('/patient/session', { loginName, password: accounts[loginName] });
    assert.ok(session.cookie);
    patients.set(loginName, session.cookie);
  }

  const catalogue = (await call('/catalogue')).data.items;
  if(options.prepareSchedules) await options.prepareSchedules(call,staff,catalogue);
  let appointments = 0, cancelled = 0, frontBookings = 0;
  const ownedBookings = new Map<string,Set<string>>([...patients.keys()].map(login=>[login,new Set()]));
  for (const [doctor, branch] of [['lin', 'east'], ['zhou', 'east'], ['chen', 'river']]) {
    const service = catalogue.find((item: any) => item.doctorId === fixture('booking-' + doctor));
    assert.ok(service);
    const front = staff.get('front.' + branch);
    for (let day = 0; day < days; day++) {
      const date = shiftDate(demoDate, day);
      const query = new URLSearchParams({ date, clinicId: service.clinicId, doctorId: service.doctorId, serviceVersionId: service.serviceVersionId });
      const { groups } = (await call('/availability?' + query)).data;
      const free = groups.flatMap((group: any) => group.slots
        .filter((slot: any) => slot.status === 'available')
        .map((slot: any) => ({ scheduleId: group.scheduleId, ruleVersionId: group.ruleVersionId,
          serviceVersionId: group.serviceVersionId, startsAt: slot.startsAt })));
      assert.ok(free.length >= 3);
      const frontSlots = Math.max(1, Math.floor(free.length * 0.62));
      for (const slot of free.slice(0, frontSlots)) {
        const number = ++appointments;
        const booking = (await call('/frontdesk/appointments', {
          ...slot, ...requestId(), name: `演示预约 ${String(number).padStart(2, '0')}`,
          contact: `13800010${String(number).padStart(3, '0')}`, intention: service.serviceName,
          identityBasis: '课程合成患者电话预约，已核对预约信息', confirmedWithPatient: true,
        }, front)).data;
        assert.equal(booking.disposition, 'active');
        if (++frontBookings % 6 === 0 && frontSlots > 1) {
          const result = (await call('/frontdesk/appointments/' + booking.id + '/cancel', {
            ...requestId(), version: booking.version, reason: '合成患者行程有变，主动取消',
            confirmedWithPatient: true, contactedAt: new Date().toISOString(), contactNote: '课程合成通话，已核对取消意愿',
          }, front)).data;
          assert.equal(result.disposition, 'cancelled');
          cancelled++;
        }
      }
      const loginName = doctor === 'lin' ? 'alice' : doctor === 'chen' ? 'bob' : null;
      if (loginName) {
        const result = (await call('/patient/appointments', {
          ...free[frontSlots], ...requestId(), name: loginName === 'alice' ? '示例患者甲' : '示例患者乙',
          contact: loginName === 'alice' ? '13800000001' : '13800000002', intention: '课程演示预约',
        }, patients.get(loginName))).data;
        assert.equal(result.disposition, 'active');
        ownedBookings.get(loginName)!.add(result.id);
        appointments++;
        if (day % 7 === 3 || day % 7 === 6) {
          const updated = (await call('/patient/appointments/' + result.id + '/cancel', {
            ...requestId(), version: result.version, reason: '演示患者调整日程',
          }, patients.get(loginName))).data;
          assert.equal(updated.disposition, 'cancelled');
          cancelled++;
        }
      }
      const remaining = (await call('/availability?' + query)).data.groups.flatMap((group: any) => group.slots);
      assert.ok(remaining.some((slot: any) => slot.status === 'available'));
      assert.ok(remaining.some((slot: any) => slot.status === 'full'));
    }
  }

  const actualToday = new Date().toLocaleDateString('en-CA', { timeZone: tz });
  const today = options.historyEnd ?? actualToday;
  const minute = 60000;
  const crews = [
    { branch: 'east', doctor: 'lin', nurses: ['nurse-east-a'], visits: 12 },
    { branch: 'east', doctor: 'zhou', nurses: ['nurse-east-b', 'nurse-east-a'], visits: 8 },
    { branch: 'river', doctor: 'chen', nurses: ['nurse-river'], visits: 10 },
  ];
  const progress = [
    { field: 'started_at', remaining: 3 },
    { field: 'ended_at', remaining: 1 },
    { field: 'left_at', remaining: 0 },
  ];
  let visits = 0, bills = 0, receipts = 0;
  const dailyCrews = Array.from({ length: days }, (_, day) => crews.map(crew => ({
    ...crew,
    day,
    date: shiftDate(today, -day),
    visits: day ? 1 : crew.visits,
  }))).flat();
  for (const scenario of dailyCrews) {
    const startOfDay = Date.parse(scenario.date + 'T00:00:00+08:00');
    const baseTime = scenario.date === actualToday ? Date.now() - 1200
      : Date.parse(scenario.date + (scenario.day ? 'T11:00:00+08:00' : 'T16:30:00+08:00'));
    const at = (minutesBefore: number) => new Date(Math.max(startOfDay, baseTime - minutesBefore * minute)).toISOString();
    for (let index = 0; index < scenario.visits; index++) {
      const steps = scenario.day ? 3 : index < 2 ? index : index % 4 === 2 ? 2 : 3;
      const number = ++visits;
      const offset = index * 21 + 2;
      const front = staff.get('front.' + scenario.branch);
      const clinicId = fixture('clinic-' + scenario.branch);
      const patient = (await call('/frontdesk/patients', {
        ...requestId(), clinicId, name: `演示就诊 ${String(number).padStart(2, '0')}`,
        phone: `13800020${String(number).padStart(3, '0')}`,
        identityBasis: '课程合成现场核对',
      }, front)).data;
      let visit = (await call('/frontdesk/visits', {
        ...requestId(), clinicId, patientId: patient.id, doctorId: fixture('booking-' + scenario.doctor),
        nurseIds: scenario.nurses.map(nurse => fixture(nurse)), arrivedAt: at(offset + 5),
        basis: '课程合成到院', identityConfirmed: true,
        identityBasis: '合成身份核对', coordination: '核对实际就诊日的值班安排',
      }, front)).data;
      for (const {field, remaining} of progress.slice(0, steps)) {
        visit = (await call('/frontdesk/visits/' + visit.id + '/progress', {
          ...requestId(), version: visit.version, field, occurredAt: at(offset + remaining), basis: '课程合成就诊进度',
        }, front)).data;
      }
      if (scenario.branch !== 'east' || steps < 2) continue;

      const path = '/clinical/visits/' + visit.id;
      const nurse = staff.get('nurse.east');
      const isExam = (index + scenario.day) % 2 === 0;
      await call(path + '/record', {
        ...requestId(), recordVersion: 0, clinicalAt: visit.endedAt, body: '课程合成病历，用于展示收费流程。',
        pendingNote: null, completeness: 'complete', doctorConfirmed: true,
        treatments: [{ id: null, version: 0, itemId: fixture(isExam ? 'item171-exam' : 'item171-clean'), performedAt: visit.endedAt, teeth: [] }],
        reason: null,
      }, staff.get('doctor.' + scenario.doctor));
      const source = (await call(path + '/billing-source', undefined, nurse)).data;
      const input = {
        billId: null, billVersion: 0, priceBasis: null,
        lines: source.items.map((item: any) => ({ treatmentId: item.id, treatmentVersion: item.version,
          priceVersionId: item.priceVersionId, quantity: '1.0000', unitPrice: item.referencePrice })),
      };
      const draft = (await call(path + '/draft', input, nurse)).data;
      assert.equal(draft.total, isExam ? '50.00' : '180.00');
      await call(path + '/bill', { ...input, ...requestId(), draftToken: draft.draftToken, reason: null }, nurse);
      bills++;
      const paid = steps === 3 && (scenario.day % 5 !== 0 || scenario.day === 0);
      if (paid) {
        await call(path + '/receipt', {
          ...requestId(), billVersion: 1, amount: draft.total, paymentMethod: 'cash', receivedAt: at(offset),
          actualReceived: true, adjustmentIds: [], basis: '课程合成实收，仅演示登记',
        }, front);
        receipts++;
      }
      const detail = (await call(path, undefined, front)).data;
      assert.equal(detail.bill.paymentState === 'paid', paid);
    }
  }
  for (const day of [0, Math.floor(days / 2), days - 1]) {
    for (const branch of ['east', 'river']) {
      const date = shiftDate(today, -day);
      const query = new URLSearchParams({ date, clinicId: fixture('clinic-' + branch), state: 'all', limit: '50' });
      const queue = (await call('/frontdesk/visits?' + query, undefined, staff.get('front.' + branch))).data;
      const expected=dailyCrews.filter(crew => crew.branch === branch && crew.day === day).reduce((sum, crew) => sum + crew.visits, 0);
      assert.ok(options.historyEnd ? queue.total >= expected : queue.total === expected);
    }
  }
  for (const cookie of staff.values()) await call('/staff/logout', {}, cookie);
  for (const [login,cookie] of patients) {
    const queue = (await call('/patient/appointments/queue?limit=50&fromDate='+demoDate+'&toDate='+shiftDate(demoDate,days-1), undefined, cookie)).data;
    const generated=queue.items.filter((appointment:any)=>ownedBookings.get(login)!.has(appointment.id));
    assert.equal(generated.length, days);
    const expectedCancelled = Array.from({ length: days }, (_, day) => day).filter(day => day % 7 === 3 || day % 7 === 6).length;
    assert.equal(generated.filter((appointment: any) => appointment.disposition === 'cancelled').length, expectedCancelled);
    await call('/patient/logout', {}, cookie);
  }
  return {
    today, appointmentThrough: shiftDate(demoDate, days - 1), historyFrom: shiftDate(today, 1 - days),
    appointments, cancelled, patientOwned: 2 * days, visits, bills, receipts,
  };
}
