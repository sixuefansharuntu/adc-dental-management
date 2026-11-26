// Public booking dates use the clinic's Beijing calendar, not a fixture date.
export function beijingToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}

export function bookingDays(start: string, now = new Date()): string[] {
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(start) ? new Date(start+'T00:00:00Z') : new Date(NaN);
  const base = Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10)===start
    ? parsed : new Date(beijingToday(now)+'T00:00:00Z');
  return Array.from({length:7},(_,i)=>{
    const day = new Date(base); day.setUTCDate(day.getUTCDate()+i);
    return day.toISOString().slice(0,10);
  });
}
