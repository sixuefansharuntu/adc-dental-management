import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requestAbort } from '../apps/admin/src/request-abort';

test('网页请求在没有 AbortSignal.any 的环境中仍响应取消，并保留取消原因', t => {
  t.mock.method(AbortSignal, 'any', () => { throw Error('此浏览器没有 AbortSignal.any'); });
  const upstream = new AbortController();
  const pending = requestAbort(1000, upstream.signal);
  assert.equal(pending.signal.aborted, false);
  upstream.abort('close');
  assert.equal(pending.signal.aborted, true);
  assert.equal(pending.signal.reason, 'close');
  pending.dispose();
  const alreadyCancelled = requestAbort(1000, upstream.signal);
  assert.equal(alreadyCancelled.signal.aborted, true);
  alreadyCancelled.dispose();
});

test('超时取消请求，结束后清理计时器和上游监听器', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const timeout = requestAbort(20);
  t.mock.timers.tick(20);
  assert.equal(timeout.signal.aborted, true);
  timeout.dispose();
  const upstream = new AbortController();
  const finished = requestAbort(20, upstream.signal);
  finished.dispose();
  upstream.abort();
  t.mock.timers.tick(20);
  assert.equal(finished.signal.aborted, false);
});
