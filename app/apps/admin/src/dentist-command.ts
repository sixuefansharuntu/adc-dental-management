import{dentistPendingTarget}from'./dentist-pending-status';
type Owner={accountId:string;employeeId:string};
function text(v:any,max:number,optional=false){if(optional&&(v===null||v===''))return;if(typeof v!=='string'||!v.trim()||v.trim().length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v))throw Error('原牙医请求文字无效。');}
function date(v:any){if(typeof v!=='string'||!/^\d{4}-\d\d-\d\d$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw Error('原执业日期无效。');}
export function dentistCommand(v:any,owner:Owner){
 if(!owner?.accountId||!owner.employeeId)throw Error('原牙医身份无效。');const t=dentistPendingTarget(v);
 if(v.version!==undefined?(v.version!==1||v.accountId!==owner.accountId||v.employeeId!==owner.employeeId):(v.accountId!==undefined||v.employeeId!==undefined))throw Error('原牙医记录身份不符。');
 const b=v.body,fields={profile:['name','contactInfo','personalProfile'],skills:['skills'],public:['publicName','publicSpecialty','publicIntro','publicEnabled'],practice:['clinicId','practiceId','validFrom','validTo']}[t.branch]!;
 const keys=['version','reason','requestId','impactToken','checked','confirmImpact',...fields];if(!b||Object.keys(b).length!==keys.length||Object.keys(b).some(k=>!keys.includes(k)))throw Error('原牙医请求字段不完整。');
 if(!Number.isSafeInteger(b.version)||b.version<1||b.checked!==true||typeof b.confirmImpact!=='boolean')throw Error('原版本或确认无效。');text(b.reason,1500);text(b.impactToken,128);
 if(t.branch==='profile'){text(b.name,100);text(b.contactInfo,500,true);text(b.personalProfile,3000,true);}
 if(t.branch==='skills'){if(!Array.isArray(b.skills)||b.skills.length>50)throw Error('原技能集合无效。');b.skills.forEach((s:any)=>text(s,120));if(new Set(b.skills.map((s:string)=>s.trim().toLocaleLowerCase())).size!==b.skills.length)throw Error('原技能重复。');}
 if(t.branch==='public'){text(b.publicName,100,!b.publicEnabled);text(b.publicSpecialty,1000,!b.publicEnabled);text(b.publicIntro,3000,!b.publicEnabled);if(typeof b.publicEnabled!=='boolean')throw Error('原公开状态无效。');}
 if(t.branch==='practice'){date(b.validFrom);if(b.validTo!==null){date(b.validTo);if(b.validTo<b.validFrom)throw Error('原执业期间无效。');}}
 const phase=v.phase??(v.known===true?'confirmed':'pending');if(!['pending','confirmed','rejected'].includes(phase)||v.known!==undefined&&(typeof v.known!=='boolean'||v.known!==(phase!=='pending')))throw Error('原请求状态无效。');
 return{version:1,accountId:owner.accountId,employeeId:owner.employeeId,path:v.path,body:JSON.parse(JSON.stringify(b)),phase,known:phase!=='pending'};
}
export function parseDentistCommand(raw:string,owner:Owner){if(raw.length>1000000)throw Error('原牙医缓存过大，请保留核查。');return dentistCommand(JSON.parse(raw),owner);}
export function sameDentistCommand(a:any,b:any){return a?.path===b?.path&&JSON.stringify(a?.body)===JSON.stringify(b?.body);}
