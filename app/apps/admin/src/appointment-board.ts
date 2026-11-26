import { bookingTimeRange } from './booking-time';

export interface BoardAppointment {
  id: string;
  doctorId: string;
  doctorName: string;
  name: string;
  startsAt: string;
  endsAt: string;
  serviceName: string;
  disposition: string;
  visitId?: string | null;
  visitState?: string | null;
  arrivedAt?: string | null;
}

export interface BoardDoctor { id: string; name: string }
const MINUTE = 60_000;
const statusLabels: Record<string, string> = {
  active: '已确认', cancelled: '已取消', arrived: '已到院', no_show: '未到结案',
  waiting: '已到院待接诊', in_progress: '接诊中', ended: '接诊结束', left: '已离开',
};

export function boardStatus(appointment: BoardAppointment) {
  const kind = appointment.visitState || (appointment.visitId ? 'arrived' : appointment.disposition);
  return { kind, label: statusLabels[kind] || '待核对', appointmentLabel: statusLabels[appointment.disposition] || '待核对' };
}

export function appointmentBoard(date: string, doctors: BoardDoctor[], appointments: BoardAppointment[]) {
  const midnight = Date.parse(date + 'T00:00:00+08:00');
  const entries = appointments.map(appointment => ({
    appointment,
    start: (Date.parse(appointment.startsAt) - midnight) / MINUTE,
    end: (Date.parse(appointment.endsAt) - midnight) / MINUTE,
  })).filter(({ start, end }) => start >= 0 && start < 1440 && end > start && Number.isFinite(end));
  const startHour = Math.floor(Math.min(9 * 60, ...entries.map(entry => entry.start)) / 60);
  const endHour = Math.ceil(Math.max(17 * 60, ...entries.map(entry => entry.end)) / 60);
  const doctorIndex = new Map(doctors.map(doctor => [doctor.id, doctor]));
  for (const { appointment } of entries) {
    if (!doctorIndex.has(appointment.doctorId)) {
      doctorIndex.set(appointment.doctorId, { id: appointment.doctorId, name: appointment.doctorName });
    }
  }
  const columns = [...doctorIndex.values()].map(doctor => {
    const laneEnds: number[] = [];
    const scheduled = entries.filter(entry => entry.appointment.doctorId === doctor.id)
      .sort((a, b) => a.start - b.start || a.end - b.end);
    const events = scheduled.map(entry => {
      const freeLane = laneEnds.findIndex(end => end <= entry.start);
      const lane = freeLane === -1 ? laneEnds.length : freeLane;
      laneEnds[lane] = entry.end;
      return { ...entry, lane, range: bookingTimeRange(entry.appointment.startsAt, entry.appointment.endsAt), ...boardStatus(entry.appointment) };
    });
    return { ...doctor, events, lanes: Math.max(1, laneEnds.length) };
  });
  return { startMinute: startHour * 60, hours: endHour - startHour, columns };
}
