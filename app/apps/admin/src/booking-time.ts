const day=(s:string)=>new Date(Date.parse(s)+8*3600000).toISOString().slice(0,10);
export function bookingPeriod(start:string){
 const hour=new Date(Date.parse(start)+8*3600000).getUTCHours();
 return hour<6?'凌晨':hour<12?'上午':hour<18?'下午':'夜间';
}
export function bookingTimeRange(start:string,end:string){
 const clock=(s:string)=>new Date(Date.parse(s)+8*3600000).toISOString().slice(11,16);
 return clock(start)+'—'+(day(start)!==day(end)?'次日 ':'')+clock(end);
}
