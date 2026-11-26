import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import { CourseLoginAccess } from '../apps/api/src/course-login';

test('课程链接未配置时默认关闭，其他环境拒绝启用', () => {
  const req = { headers: {} } as Request;
  assert.deepEqual(new CourseLoginAccess(true, {}).options(req), []);
  assert.throws(() => new CourseLoginAccess(false, {
    ADC_COURSE_LOGIN_INVITE_HASH: 'a'.repeat(64),
    ADC_COURSE_LOGIN_INVITE_UNTIL: new Date().toISOString(),
  }), /专用课程环境/);
});

test('公开演示只在课程环境显式启用，选项限于三种演示身份', () => {
  const env = { ADC_COURSE_LOGIN_PUBLIC: 'true' };
  const req = { headers: {} } as Request;
  assert.throws(() => new CourseLoginAccess(false, env), /专用课程环境/);
  assert.throws(() => new CourseLoginAccess(true, { ...env, ADC_COURSE_LOGIN_INVITE_HASH: 'a'.repeat(64) }), /专用课程环境/);
  const access = new CourseLoginAccess(true, env, () => 1_000);
  assert.ok(access.enabled);
  assert.ok(access.expires(req) > 1_000);
  assert.deepEqual(access.options(req).map(a => a.id), ['patient', 'frontdesk', 'doctor']);
});

test('浏览器授权只能在配置截止时间前使用，并在新进程失效', async () => {
  const invite = randomBytes(32).toString('base64url');
  let now = Date.parse('2026-11-26T00:00:00.000Z');
  const env = {
    ADC_COURSE_LOGIN_INVITE_HASH: createHash('sha256').update(invite).digest('hex'),
    ADC_COURSE_LOGIN_INVITE_UNTIL: new Date(now + 5_000).toISOString(),
  };
  const access = new CourseLoginAccess(true, env, () => now);
  let header = '';
  const res = { cookie(name: string, value: string, options: { maxAge: number }) {
    assert.equal(options.maxAge, 5_000);
    header = `${name}=${value}`;
  } } as Response;
  await assert.rejects(access.open(invite, res, async () => { throw new Error('课程环境不匹配'); }), /环境不匹配/);
  assert.equal(header, '');
  await access.open(invite, res, async () => {});
  const req = { headers: { cookie: header } } as Request;
  assert.equal(access.options(req).length, 3);
  assert.equal(new CourseLoginAccess(true, env, () => now).expires(req), 0);
  now += 5_000;
  assert.deepEqual(access.options(req), []);
  await assert.rejects(access.open(invite, res, async () => {}), /已过期/);
});
