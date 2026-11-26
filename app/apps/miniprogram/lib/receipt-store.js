const uuid = v => typeof v === 'string' && /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v);
function createReceiptStore(platform, baseUrl) {
  const originalBase = baseUrl();
  const key = () => { if(baseUrl()!==originalBase)throw Error('后端地址已变化，请重新打开页面核实原环境。');return 'adc-mini-receipt-v1:' + encodeURIComponent(originalBase); };
  function read() {
    let raw;
    try { raw = platform.getStorageSync(key()); } catch (_) { throw Error('无法读取原请求凭证，已暂停新提交。'); }
    if (raw === '' || raw === undefined) return null;
    try {
      if (typeof raw !== 'string' || raw.length > 2048) throw Error();
      const r = JSON.parse(raw);
      if (!r || Object.keys(r).sort().join(',') !== 'appointmentId,kind,requestId,schemaVersion,subjectId' || r.schemaVersion !== 1 || !uuid(r.requestId) || !uuid(r.subjectId) || !['book','reschedule','cancel'].includes(r.kind) || (r.kind === 'book' ? r.appointmentId !== null : !uuid(r.appointmentId))) throw Error();
      return r;
    } catch (_) { throw Error('原请求凭证不完整，已保留原内容并暂停新提交。'); }
  }
  function same(a,b) { return a && b && ['subjectId','kind','requestId','appointmentId'].every(k=>a[k]===b[k]); }
  return {
    read,
    save(r) {
      const prior = read();
      if (prior && !same(prior,r)) throw Error('还有原请求未核实，请先打开“找回提交结果”。');
      const raw = JSON.stringify({schemaVersion:1,subjectId:r.subjectId,kind:r.kind,requestId:r.requestId,appointmentId:r.appointmentId});
      if (!uuid(r.subjectId)||!uuid(r.requestId)||!['book','reschedule','cancel'].includes(r.kind)||(r.kind==='book'?r.appointmentId!==null:!uuid(r.appointmentId))) throw Error('请求凭证无效，未发送提交。');
      try { platform.setStorageSync(key(),raw); if(platform.getStorageSync(key())!==raw)throw Error(); }
      catch (_) { throw Error('原请求凭证未能保存，未发送提交。'); }
    },
    clear(r) {
      const current = read();
      if (!current || !same(current,r)) return;
      try { platform.removeStorageSync(key()); } catch (_) { throw Error('结果已核实，凭证尚未清理；请再次核实。'); }
      if(read())throw Error('结果已核实，凭证尚未清理；请再次核实。');
    }
  };
}
module.exports={createReceiptStore};
