const uuid=(v:any)=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
export function dentistPendingTarget(p:any){
 const m=typeof p?.path==='string'?p.path.match(/^\/([a-f0-9-]{36})\/(profile|skills|public|practice)$/):null;
 if(!m||!uuid(m[1])||!uuid(p.body?.requestId))throw Error('原牙医请求目标无效，请保留记录核查。');
 const target={requestId:p.body.requestId.toLowerCase(),doctorId:m[1].toLowerCase(),branch:m[2]};
 if(target.branch!=='practice')return target;
 if(!uuid(p.body.clinicId)||p.body.practiceId!==null&&!uuid(p.body.practiceId))throw Error('原执业目标无效，请保留记录核查。');
 return{...target,clinicId:p.body.clinicId.toLowerCase(),practiceId:p.body.practiceId?.toLowerCase()??null};
}
export function dentistStatusUrl(p:any){const t=dentistPendingTarget(p),{requestId,...query}=t;return'/api/v1/dentists/commands/'+requestId+'?'+new URLSearchParams(Object.fromEntries(Object.entries(query).map(([k,v])=>[k,v===null?'new':v])));}
export function validDentistStatus(p:any,r:any){
 const t=dentistPendingTarget(p);
 for(const[k,v]of Object.entries(t))if(r?.[k]!==v)throw Error('原牙医提交核实目标不一致，请保留记录。');
 if(!['completed','not_found'].includes(r.state))throw Error('原牙医提交核实状态无效。');
 if(r.state==='completed'&&(!uuid(r.resultId)||!Number.isSafeInteger(r.version)||r.version<1||!Number.isFinite(Date.parse(r.completedAt))||(t.branch!=='practice'?r.resultId.toLowerCase()!==t.doctorId:t.practiceId!==null&&r.resultId.toLowerCase()!==t.practiceId)))throw Error('原牙医结果不完整，请保留记录。');
 return r;
}
export function validDentistSaved(p:any,r:any){
 const t=dentistPendingTarget(p),expected=t.branch==='practice'&&t.practiceId===null?1:p.body.version+1;
 if(!uuid(r?.id)||r.doctorId?.toLowerCase()!==t.doctorId||!Number.isSafeInteger(r.version)||r.version!==expected||(t.branch!=='practice'?r.id.toLowerCase()!==t.doctorId:t.practiceId!==null&&r.id.toLowerCase()!==t.practiceId))throw Error('保存回复不完整，请保留原请求并先只读核实。');
 return r;
}
