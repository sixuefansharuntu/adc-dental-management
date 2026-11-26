/**
 * adcApi —— 小程序对外通道的云函数代理
 *
 * 作用：把小程序端的 wx.cloud.callFunction 转成对现有后端的 HTTPS 请求。
 * 为什么需要它：体验版真机会校验“服务器域名必须是已备案域名”，而我们只有公网 IP，
 * 无法加入 request 合法域名白名单；云函数在云端出网，不受这条限制。
 *
 * 安全边界：
 *  1. 只放行白名单内的路径与方法，不做通用转发；
 *  2. 用共享密钥对 (时间戳 + openid) 做 HMAC 签名，后端据此认定“请求确实来自本云函数”；
 *  3. 令牌由客户端携带并透传，云函数不持久化任何令牌，也不记录口令。
 */

const cloud = require('wx-server-sdk');
const https = require('https');
const crypto = require('crypto');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 患者通道（需要签名）
const MP_BASE = process.env.ADC_API_BASE || '';
// 公开查询（后端本就匿名可读，代理只为绕开域名校验）
const PUBLIC_BASE = process.env.ADC_PUBLIC_BASE || '';

const SECRET = process.env.ADC_MP_SOURCE_SECRET || '';
const MAX_BODY = 8 * 1024;
const TIMEOUT = 12000;

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

// scope: 'mp' 走签名通道；'public' 走匿名查询
const ROUTES = [
  { scope: 'public', method: 'GET', test: p => p === '/catalogue' },
  { scope: 'public', method: 'GET', test: p => p === '/availability' },
  { scope: 'mp', method: 'POST', test: p => p === '/local-session' },
  { scope: 'mp', method: 'GET', test: p => p === '/session' },
  { scope: 'mp', method: 'POST', test: p => p === '/logout' },
  { scope: 'mp', method: 'POST', test: p => p === '/quote' },
  { scope: 'mp', method: 'POST', test: p => p === '/appointments' },
  { scope: 'mp', method: 'GET', test: p => p === '/appointments/queue' },
  { scope: 'mp', method: 'POST', test: p => new RegExp('^/appointments/' + UUID + '/reschedule$').test(p) },
  { scope: 'mp', method: 'POST', test: p => new RegExp('^/appointments/' + UUID + '/cancel$').test(p) },
  { scope: 'mp', method: 'POST', test: p => new RegExp('^/request-retirements/' + UUID + '$').test(p) },
  { scope: 'mp', method: 'GET', test: p => new RegExp('^/action-commands/' + UUID + '$').test(p) },
  { scope: 'mp', method: 'GET', test: p => new RegExp('^/appointment-commands/' + UUID + '$').test(p) },
];

function match(method, path) {
  return ROUTES.find(r => r.method === method && r.test(path)) || null;
}

function sign(ts, openid) {
  return crypto.createHmac('sha256', SECRET).update(ts + '\n' + openid).digest('hex');
}

function queryOf(data) {
  if (!data || typeof data !== 'object') return '';
  return Object.keys(data)
    .filter(k => data[k] !== undefined && data[k] !== null && data[k] !== '')
    .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(String(data[k])))
    .join('&');
}

function call(base, method, pathWithQuery, body, token, ts, openid) {
  return new Promise((resolve, reject) => {
    const target = new URL(base);
    if (target.protocol !== 'https:' || target.username || target.password || target.search || target.hash) {
      throw new Error('云函数后端必须为有效的 HTTPS 地址。');
    }
    const url = new URL(base.replace(/\/$/, '') + pathWithQuery);
    const payload = body === undefined || body === null ? null : Buffer.from(JSON.stringify(body));
    const headers = { 'content-type': 'application/json', 'content-length': payload ? payload.length : 0 };
    if (ts) {
      headers['x-adc-mp-ts'] = ts;
      headers['x-adc-mp-sign'] = sign(ts, openid);
      headers['x-adc-mp-openid'] = openid;
    }
    if (token) headers.authorization = 'Bearer ' + token;

    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method,
        headers,
        timeout: TIMEOUT,
      },
      res => {
        const chunks = [];
        let size = 0;
        res.on('data', c => {
          size += c.length;
          if (size > 512 * 1024) {
            req.destroy(new Error('响应过大'));
            return;
          }
          chunks.push(c);
        });
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let parsed = null;
          try {
            parsed = text ? JSON.parse(text) : null;
          } catch (e) {
            parsed = { message: '返回内容无法解析。' };
          }
          resolve({ status: res.statusCode, data: parsed });
        });
      }
    );
    req.on('timeout', () => req.destroy(new Error('请求后端超时')));
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

exports.main = async event => {
  const wx = cloud.getWXContext();
  const openid = wx.OPENID || '';

  const method = String(event.method || 'GET').toUpperCase();
  let path = String(event.path || '');
  if (!path.startsWith('/')) path = '/' + path;
  // 只允许路径本身，禁止绝对地址与目录穿越，避免被当成通用代理
  if (/^[a-z]+:\/\//i.test(path) || path.includes('..')) {
    return { ok: false, status: 400, message: '请求路径不受支持。' };
  }

  const route = match(method, path);
  if (!route) return { ok: false, status: 403, message: '请求路径不受支持。' };

  const data = event.data === undefined ? undefined : event.data;
  if (data !== undefined && Buffer.byteLength(JSON.stringify(data)) > MAX_BODY) {
    return { ok: false, status: 413, message: '请求内容过大。' };
  }

  let body = data;
  if (method === 'GET') {
    const qs = queryOf(data);
    if (qs) path += (path.includes('?') ? '&' : '?') + qs;
    body = undefined;
  }

  if (route.scope === 'public') {
    if (!PUBLIC_BASE) return { ok: false, status: 503, message: '云函数未配公开查询地址。' };
    try {
      const r = await call(PUBLIC_BASE, method, path, body, '', '', openid);
      return { ok: r.status >= 200 && r.status < 300, status: r.status, data: r.data };
    } catch (e) {
      return { ok: false, status: 502, message: '暂时无法查询，请稍后重试。' };
    }
  }

  if (!MP_BASE || SECRET.length < 32) return { ok: false, status: 503, message: '云函数未配置预约后端或签名密钥。' };
  if (!openid) return { ok: false, status: 401, message: '无法识别调用者。' };

  const token = typeof event.token === 'string' ? event.token : '';
  if (token && !/^mp_[a-f0-9]{64}$/.test(token)) {
    return { ok: false, status: 401, message: '登录状态无效，请重新登录。' };
  }

  const ts = String(Math.floor(Date.now() / 1000));
  try {
    const r = await call(MP_BASE, method, path, body, token, ts, openid);
    return { ok: r.status >= 200 && r.status < 300, status: r.status, data: r.data };
  } catch (e) {
    return { ok: false, status: 502, message: '暂时无法连接服务，请稍后重试。' };
  }
};
