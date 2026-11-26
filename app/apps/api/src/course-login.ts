import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { ForbiddenException } from '@nestjs/common';
import type { Request, Response } from 'express';

export const courseLoginRoles = [
  { id: 'patient', kind: 'patient', label: '演示患者', loginName: 'alice' },
  { id: 'frontdesk', kind: 'staff', label: '东城前台', loginName: 'front.east', accountId: 'f2407184-ee5c-410e-aa77-c1fea2be3cce', employeeId: '73d094ae-360b-4412-af46-96a8f2b5a83e' },
  { id: 'doctor', kind: 'staff', label: '东城医生', loginName: 'doctor.lin', accountId: '31c26e49-5d18-4a4d-a98c-fd0cfd803e81', employeeId: 'c508dbd0-f62e-41c9-a44c-27bdf63659c5' },
] as const;

const cookie = 'adc_course_review';
const cookieOptions = { path: '/api/v1', httpOnly: true, sameSite: 'strict', secure: true } as const;
const lifetime = 2 * 60 * 60_000;
const hexDigest = /^[a-f0-9]{64}$/;
const inviteFormat = /^[A-Za-z0-9_-]{43}$/;

export class CourseLoginAccess {
  private readonly signatureKey = randomBytes(32);
  private readonly inviteDigest: Buffer | null;
  private readonly expiresAt: number;
  readonly publicEnabled: boolean;

  constructor(courseEnabled: boolean, env: NodeJS.ProcessEnv = process.env, private readonly clock = Date.now) {
    const hash = env.ADC_COURSE_LOGIN_INVITE_HASH || '';
    const until = env.ADC_COURSE_LOGIN_INVITE_UNTIL || '';
    const mode = env.ADC_COURSE_LOGIN_PUBLIC ?? 'false';
    this.publicEnabled = mode === 'true';
    if (!['true', 'false'].includes(mode) || this.publicEnabled && (!courseEnabled || hash || until)) {
      throw new Error('公开演示登录仅支持明确启用的专用课程环境。');
    }
    this.inviteDigest = hash ? Buffer.from(hash, 'hex') : null;
    this.expiresAt = until ? Date.parse(until) : 0;
    if ((hash || until) && (!courseEnabled || !hexDigest.test(hash) || !Number.isFinite(this.expiresAt) || new Date(this.expiresAt).toISOString() !== until)) {
      throw new Error('演示登录须配置专用课程环境、邀请摘要及 UTC 截止时间。');
    }
  }

  get enabled() { return this.publicEnabled || this.inviteDigest !== null && this.expiresAt > this.clock(); }

  private sign(payload: string) {
    return createHmac('sha256', this.signatureKey).update(payload).digest();
  }

  private inviteAllowed(invite: unknown) {
    return this.enabled && this.inviteDigest !== null && typeof invite === 'string' && inviteFormat.test(invite)
      && timingSafeEqual(this.inviteDigest, createHash('sha256').update(invite).digest());
  }

  async open(invite: unknown, res: Response, validateEnvironment: () => Promise<void>) {
    if (!this.inviteAllowed(invite)) throw new ForbiddenException('演示邀请无效或已过期。');
    await validateEnvironment();
    const now = this.clock();
    const expires = Math.min(this.expiresAt, now + lifetime);
    if (expires <= now) throw new ForbiddenException('演示邀请无效或已过期。');
    const payload = `${expires}.${randomBytes(16).toString('hex')}`;
    res.cookie(cookie, `${payload}.${this.sign(payload).toString('hex')}`, { ...cookieOptions, maxAge: expires - now });
    return { available: true };
  }

  expires(req: Request) {
    if (!this.enabled) return 0;
    if (this.publicEnabled) return this.clock() + lifetime;
    const value = (req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(`${cookie}=`))?.slice(cookie.length + 1);
    const bits = value?.match(/^(\d{13})\.([a-f0-9]{32})\.([a-f0-9]{64})$/);
    if (!bits) return 0;
    const expires = Number(bits[1]);
    if (expires <= this.clock() || expires > this.expiresAt || !timingSafeEqual(Buffer.from(bits[3]!, 'hex'), this.sign(`${bits[1]}.${bits[2]}`))) return 0;
    return expires;
  }

  options(req: Request) {
    return this.expires(req) ? courseLoginRoles.map(({ id, kind, label, loginName }) => ({ id, kind, label, loginName })) : [];
  }
}
