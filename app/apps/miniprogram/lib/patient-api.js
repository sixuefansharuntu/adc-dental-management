const { loginFailure } = require('./access-feedback');

function createPatientApi(platform, baseUrl, options = {}) {
  let token = '', epoch = 0, subjectId = '';
  const journal = options.journal;
  const originalBase = baseUrl();
  const uuid = v => typeof v==='string' && /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v);
  function call(path, method, data, anonymous, accountOperation = false) {
    const owner = epoch, credential = token;
    const isLogin = path === '/local-session';
    return new Promise((resolve, reject) => {
      const fail = (message, status, definite, code) => { const e = new Error(message); e.status = status || 0; e.definite = !!definite; e.code = code; reject(e); };
      if(baseUrl()!==originalBase){fail('后端地址已变化，请重新打开页面验证。');return;}
      if (!anonymous && !credential) { fail('请先登录患者账号。', 401, true, 'NO_SESSION'); return; }
      try {
        platform.request({
          url: originalBase.replace(/\/$/, '') + '/miniprogram' + path,
          method, data: data || {}, timeout: 12000,
          header: { 'content-type': 'application/json', ...(!anonymous ? { Authorization: 'Bearer ' + credential } : {}) },
          success(res) {
            if (owner !== epoch || baseUrl()!==originalBase) { fail('验证身份或后端地址已变化，请重新核对。'); return; }
            if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data);
            else {
              if (res.statusCode === 401 && !anonymous && !accountOperation) token = '';
              const serverMessage = accountOperation && res.statusCode >= 400 && res.statusCode < 500 && typeof res.data?.message === 'string' ? res.data.message : '';
              const message = isLogin ? loginFailure(res.statusCode) : serverMessage || (res.statusCode === 409 ? '时段或预约安排已变化，请重新查询。' : res.statusCode === 401 ? '登录已失效，请重新登录。' : res.statusCode === 403 ? '当前患者入口未开放。' : '请求未完成，请核实后再试。');
              fail(message, res.statusCode, res.statusCode >= 400 && res.statusCode < 500);
            }
          },
          fail(error) {
            if (!isLogin) { fail('连接中断，提交结果可能尚未核实。'); return; }
            fail(/timeout|超时/i.test(error?.errMsg || '') ? '登录请求超时，请检查网络后重试。' : '暂时无法连接登录服务，请检查网络后重试。');
          }
        });
      } catch (_) { fail(isLogin ? '暂时无法连接登录服务，请检查网络后重试。' : '请求未能完成，请核实后再试。'); }
    });
  }
  async function mutate(kind, appointmentId, body) {
    body = JSON.parse(JSON.stringify(body));
    const owner = epoch;
    if(!token||!subjectId){const e=new Error('请先重新验证患者。');e.status=401;e.definite=true;throw e;}
    const receipt = {schemaVersion:1,subjectId,kind,requestId:body.requestId,appointmentId};
    const previousReceipt = journal ? journal.read() : null;
    if (journal) journal.save(receipt);
    const path = kind==='book'?'/appointments':'/appointments/'+encodeURIComponent(appointmentId)+'/'+kind;
    let r; try { r = await call(path,'POST',body); } catch(e) { if(owner===epoch && baseUrl()===originalBase && journal && !previousReceipt && e.definite && e.status!==401) journal.clear(receipt); throw e; }
    if(owner!==epoch||baseUrl()!==originalBase)throw Error('验证身份或后端地址已变化，原凭证继续保留。');
    if(journal) { if(!r||!uuid(r.id)||!Number.isInteger(r.version)||r.version<1||(kind!=='book'&&(r.id!==appointmentId||r.version!==body.version+1))||r.disposition!==(kind==='cancel'?'cancelled':'active'))throw Error('原结果尚不完整，凭证继续保留。'); journal.clear(receipt); }
    return r;
  }
  return {
    register(body) { return call('/register', 'POST', body, true, true); },
    async changePassword(body) {
      const owner = epoch;
      const result = await call('/password', 'POST', body, false, true);
      if (!result || result.changed !== true || result.loginRequired !== true) throw Error('尚未确认密码修改结果。');
      if (owner === epoch) { token = ''; subjectId = ''; epoch++; }
      return result;
    },
    async login(credentials) {
      const loginName = typeof credentials?.loginName === 'string' ? credentials.loginName.trim() : '';
      const password = credentials?.password;
      if (!loginName || !password) throw new Error(loginName ? '请输入密码。' : '请输入账号。');
      token = ''; subjectId = ''; const owner = ++epoch;
      const result = await call('/local-session', 'POST', {loginName, password}, true);
      if (owner !== epoch || baseUrl()!==originalBase) throw new Error('验证身份已变化，请重新核对。');
      if (!result || result.mode !== 'local-synthetic' || !/^mp_[a-f0-9]{64}$/.test(result.token || '') || !result.patient ||
        typeof result.patient.subjectId !== 'string' || typeof result.patient.name !== 'string' || typeof result.patient.contact !== 'string') throw new Error('登录结果不完整，请稍后重试。');
      token = result.token;
      subjectId = result.patient.subjectId;
      return { subjectId: result.patient.subjectId, name: result.patient.name, contact: result.patient.contact };
    },
    quote(selection) { return call('/quote', 'POST', selection); },
    book(body) { return mutate('book',null,body); },
    async session() { const owner=epoch,p = await call('/session', 'GET'); if(owner!==epoch||baseUrl()!==originalBase)throw Error('验证身份已变化。');subjectId=p.subjectId;return p; },
    mine(cursor, filters = { state: 'all', limit: '20' }) {
      return call('/appointments/queue', 'GET', { ...filters, ...(cursor ? { cursor } : {}) });
    },
    reschedule(id, body) { return mutate('reschedule',id,body); },
    cancel(id, body) { return mutate('cancel',id,body); },
    async retire(receipt) {
      const owner=epoch,subject=subjectId;
      if(!journal||!receipt||receipt.subjectId!==subject)throw Error('请重新验证原患者。');
      const stored=journal.read();
      if(!stored||['subjectId','kind','requestId','appointmentId'].some(k=>stored[k]!==receipt[k]))throw Error('凭证已变化，请重新读取。');
      const r=await call('/request-retirements/'+encodeURIComponent(receipt.requestId),'POST',{kind:receipt.kind,...(receipt.kind==='book'?{}:{appointmentId:receipt.appointmentId}),confirmed:true});
      if(owner!==epoch||baseUrl()!==originalBase||r.state!=='retired'||r.requestId!==receipt.requestId.toLowerCase()||r.kind!==receipt.kind||(r.appointmentId||null)!==(receipt.appointmentId?receipt.appointmentId.toLowerCase():null))throw Error('原请求封存结果尚未核实，凭证继续保留。');
      journal.clear(receipt);return r;
    },
    async status(requestId, kind, appointmentId) {
      const owner=epoch,originalSubject=subjectId,receipt=journal?journal.read():null;
      if(receipt&&receipt.requestId===requestId&&receipt.subjectId!==originalSubject)throw Error('请使用原患者核实提交结果。');
      const r = await (kind && kind !== 'book' ? call('/action-commands/' + encodeURIComponent(requestId), 'GET', { kind, appointmentId }) : call('/appointment-commands/' + encodeURIComponent(requestId), 'GET'));
      if(owner!==epoch||baseUrl()!==originalBase)throw Error('验证身份或后端地址已变化，原凭证继续保留。');
      if(journal && r.state==='retired') { if(r.kind!==(kind||'book')||r.requestId!==requestId.toLowerCase()||(r.appointmentId||null)!==(appointmentId?appointmentId.toLowerCase():null))throw Error('封存结果尚不能核实。');journal.clear({subjectId:originalSubject,kind:kind||'book',requestId,appointmentId:appointmentId||null}); }
      if(journal && r.state==='completed') { if(!uuid(r.appointmentId)||!Number.isInteger(r.version)||r.version<1||(r.kind&&r.kind!==(kind||'book'))||(kind && kind!=='book' && r.appointmentId!==appointmentId)||r.disposition!==(kind==='cancel'?'cancelled':'active')) throw new Error('原结果尚不完整，凭证继续保留。'); journal.clear({subjectId:originalSubject,kind:kind||'book',requestId,appointmentId:appointmentId||null}); }
      return r;
    },
    async logout() { const owner=epoch;try { if (token) await call('/logout', 'POST'); } finally { if(owner===epoch){token = '';subjectId='';epoch++;} } },
    forget() { token = '';subjectId=''; epoch++; }
  };
}
function requestId(platform) {
  return new Promise((resolve, reject) => {
    if (typeof platform.getRandomValues !== 'function') { reject(new Error('当前环境不支持安全请求编号，请升级后重试。')); return; }
    platform.getRandomValues({ length: 16, success(res) {
      const bytes = new Uint8Array(res.randomValues);
      if (bytes.length !== 16) { reject(new Error('请求编号生成失败。')); return; }
      bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
      const h = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
      resolve(h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20));
    }, fail() { reject(new Error('请求编号生成失败，请重试。')); } });
  });
}
module.exports = { createPatientApi, requestId };
