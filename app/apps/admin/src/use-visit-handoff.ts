import{ref,watch}from'vue';
export type VisitEntry={accountId:string;employeeId:string;clinicId:string;date:string;visitId:string};
export function visitEntry(value:unknown,staff:any):VisitEntry{
 const v=value as VisitEntry,uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 if(!v||!staff?.accountId||!staff?.employeeId||v.accountId!==staff.accountId||v.employeeId!==staff.employeeId||!uuid.test(v.clinicId)||!uuid.test(v.visitId)||typeof v.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v.date)||new Date(v.date+'T00:00:00Z').toISOString().slice(0,10)!==v.date)throw Error('原就诊交接身份或定位无效，请返回重新打开。');
 return{accountId:v.accountId,employeeId:v.employeeId,clinicId:v.clinicId,date:v.date,visitId:v.visitId};
}
export function useVisitHandoff(o:{staff:()=>any;area:()=>string;setArea:(v:string)=>void;error:(s:string)=>void}){
 const careEntry=ref<VisitEntry|null>(null),clinicalEntry=ref<VisitEntry|null>(null);
 const clear=()=>{careEntry.value=null;clinicalEntry.value=null;};
 watch(()=>JSON.stringify([o.staff()?.accountId,o.staff()?.employeeId]),clear,{flush:'sync'});
 watch(o.area,v=>{if(v==='care')clinicalEntry.value=null;else if(v==='clinical')careEntry.value=null;else clear();},{flush:'sync'});
 function open(value:unknown){if(o.area()!=='clinical'||!o.staff()?.functions?.some((s:string)=>['image.read','lab.read'].includes(s)))return;try{careEntry.value=visitEntry(value,o.staff());clinicalEntry.value=null;o.setArea('care');}catch(e){o.error(e instanceof Error?e.message:'原就诊定位无效。');}}
 function back(){if(o.area()!=='care'||!careEntry.value||!o.staff()?.functions?.includes('bill.read'))return;try{clinicalEntry.value=visitEntry(careEntry.value,o.staff());careEntry.value=null;o.setArea('clinical');}catch(e){clear();o.error(e instanceof Error?e.message:'原就诊定位无效。');}}
 return{careEntry,clinicalEntry,open,back};
}
