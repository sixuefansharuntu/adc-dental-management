import {ConflictException} from '@nestjs/common';
import {dateInput} from './domain';
export const shanghaiDay=(at:Date|number)=>new Date(+at+8*3600000).toISOString().slice(0,10);
export function availabilityDay(date:string){
 const start=+new Date(dateInput(date)+'T00:00:00+08:00');return {start,end:start+86400000};
}
// 保留排班起点的服务网格；归属开始日，但不截断跨午夜的完整服务。
export function dailySlotStarts(scheduleStart:Date,scheduleEnd:Date,minutes:number,date:string){
 const {start,end}=availabilityDay(date),origin=+scheduleStart,last=+scheduleEnd,step=minutes*60000;
 if(!Number.isSafeInteger(minutes)||minutes<1||minutes>480||!Number.isFinite(origin)||!Number.isFinite(last)||last<=origin)
  throw new ConflictException('排班或服务时长需核实，请重新选择。');
 const first=origin+Math.max(0,Math.ceil((start-origin)/step))*step,result:number[]=[];
 for(let at=first;at<end&&at+step<=last;at+=step)result.push(at);
 return result;
}
export function operatingForSlot(facts:{practices:any[];closures:any[]},start:number,end:number){
 const from=shanghaiDay(start),to=shanghaiDay(end-1);
 return facts.practices.some(p=>p.valid_from<=from&&(!p.valid_to||p.valid_to>=to))&&
  !facts.closures.some(p=>+new Date(p.effective_from)<end&&(!p.effective_to||+new Date(p.effective_to)>start));
}
