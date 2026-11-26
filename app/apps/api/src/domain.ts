import { BadRequestException } from '@nestjs/common';

export type PublicStatus = 'open' | 'paused' | 'not_open';
export function dateInput(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BadRequestException('请选择有效日期。');
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new BadRequestException('日期不存在。');
  return value;
}
export function uuidInput(value: unknown): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new BadRequestException('记录标识无效。');
  return value;
}
export function changeInput(body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new BadRequestException('提交内容无效。');
  const b = body as Record<string, unknown>;
  if (Object.keys(b).some(k => !['publicStatus', 'version', 'requestId'].includes(k))) throw new BadRequestException('提交包含不支持的字段。');
  if (!['open','paused','not_open'].includes(String(b.publicStatus)) || typeof b.publicStatus !== 'string') throw new BadRequestException('公开状态无效。');
  if (typeof b.version !== 'number' || !Number.isSafeInteger(b.version) || b.version < 1) throw new BadRequestException('请刷新当前版本后重试。');
  return { publicStatus: b.publicStatus as PublicStatus, version: b.version, requestId: uuidInput(b.requestId) };
}
export function slotsFor(start: Date, end: Date, minutes: number, available: boolean) {
  if (!Number.isInteger(minutes) || minutes <= 0) throw new Error('Service duration must be configured');
  const result = [];
  for (let time = start.getTime(); time + minutes * 60_000 <= end.getTime(); time += minutes * 60_000) {
    result.push({ startsAt: new Date(time).toISOString(), endsAt: new Date(time + minutes * 60_000).toISOString(), status: available ? 'available' : 'unavailable' });
  }
  return result;
}
