const uuid=(v:any)=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
export function isClinicalReceiptPending(p:any){return typeof p?.path==='string'&&/^\/visits\/[^/]+\/receipt$/.test(p.path);}
export function receiptPendingTarget(p:any){const m=p?.path?.match(/^\/visits\/([a-f0-9-]{36})\/receipt$/i);if(!m||!uuid(m[1])||!uuid(p.body?.requestId)||!Number.isSafeInteger(p.body.billVersion)||p.body.billVersion<0||p.body.billVersion<1)throw Error('原收款请求目标无效，请保留原记录。');return{requestId:p.body.requestId.toLowerCase(),visitId:m[1].toLowerCase()};}
export function validClinicalReceiptStatus(p:any,r:any){const t=receiptPendingTarget(p);if(r?.requestId!==t.requestId||r?.visitId!==t.visitId||!['completed','not_found'].includes(r.state))throw Error('原收款核实目标不一致。');if(r.state==='completed'&&(!uuid(r.resultId)||!uuid(r.revisionId)||r.version!==1||r.billVersion!==p.body.billVersion||!Number.isFinite(Date.parse(r.completedAt))))throw Error('原收款核实结果不完整。');return r;}
export function validClinicalReceiptSaved(p:any,r:any){const t=receiptPendingTarget(p);if(!uuid(r?.id)||r.visitId?.toLowerCase()!==t.visitId||!Number.isSafeInteger(r.version)||r.version<1||r.existing!==true&&r.version!==1||r.paymentState!=='paid')throw Error('原收款保存回复不完整。');}
export function sameClinicalReceiptPending(a:any,b:any){return a?.path===b?.path&&JSON.stringify(a?.body)===JSON.stringify(b?.body);}

export{keepReceiptCache,clearReceiptCache}from'./clinical-receipt-command';
