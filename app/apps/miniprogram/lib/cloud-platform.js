/**
 * 把 wx.request 换成 wx.cloud.callFunction 的适配层。
 *
 * 为什么：体验版真机会校验“服务器域名必须是已备案域名”，而本项目只有公网 IP，
 * 无法加入 request 合法域名白名单。改走云函数后，出网发生在云端，不受该限制。
 *
 * 用法与原 platform 完全一致（public-request / patient-api 都不用改）：
 *   createPublicGet(createCloudPlatform(wx), () => app.globalData.apiBaseUrl)
 *   createPatientApi(createCloudPlatform(wx), () => app.globalData.apiBaseUrl, {...})
 */

const API_MARK = '/api/v1';
const FUNCTIONS = 'adcApi';

function toPath(url) {
  const s = String(url || '');
  const i = s.indexOf(API_MARK);
  let p = i >= 0 ? s.slice(i + API_MARK.length) : s;
  // 患者通道在小程序侧写作 /miniprogram/xxx，云函数侧对应 /api/v1/mp/xxx
  if (p.indexOf('/miniprogram') === 0) p = p.slice('/miniprogram'.length) || '/';
  return p || '/';
}

function createCloudPlatform(wx) {
  function request(opts) {
    if (/^http:\/\/127\.0\.0\.1:\d+\/api\/v1\//.test(String(opts?.url || ''))) {
      return wx.request(opts);
    }
    const path = toPath(opts && opts.url);
    if (path.charAt(0) !== '/') {
      if (opts && opts.fail) opts.fail({ errMsg: '请求地址无效。' });
      return;
    }
    const header = (opts && opts.header) || {};
    const token = String(header.Authorization || '').replace(/^Bearer\s+/i, '');
    let settled = false;
    const done = data => {
      if (settled) return;
      settled = true;
      if (opts && opts.success) opts.success(data);
    };
    const fail = e => {
      if (settled) return;
      settled = true;
      if (opts && opts.fail) opts.fail(e || { errMsg: '云函数调用失败。' });
    };

    if (!wx.cloud || typeof wx.cloud.callFunction !== 'function') {
      fail({ errMsg: '当前基础库不支持云开发，请升级或改用真机。' });
      return;
    }

    wx.cloud.callFunction({
      name: FUNCTIONS,
      data: {
        path: path,
        method: String((opts && opts.method) || 'GET').toUpperCase(),
        data: (opts && opts.data) || {},
        token: token,
      },
      success(res) {
        const r = (res && res.result) || {};
        const status = typeof r.status === 'number' ? r.status : 502;
        const data = r.data === undefined ? { message: r.message || '请求未完成，请核实后再试。' } : r.data;
        done({ statusCode: status, data: data });
      },
      fail(e) {
        fail(e || { errMsg: '云函数调用失败。' });
      },
    });
  }

  return {
    request: request,
    // 供 requestId(wx) 之外的场景复用；patient-api 只在传入 platform 上取 request
    getRandomValues(spec) {
      if (typeof wx.getRandomValues === 'function') {
        wx.getRandomValues(spec);
        return;
      }
      if (spec && spec.fail) spec.fail();
    },
  };
}

module.exports = { createCloudPlatform, toPath };
