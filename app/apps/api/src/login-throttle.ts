type Entry={failures:number;inFlight:number;until:number};
export type LoginTicket={allowed:true;finish:(failed:boolean)=>void}|{allowed:false;retryAfter:number};
// One API process; reserve before asynchronous credential/DB work.
export class LoginThrottle {
 private entries=new Map<string,Entry>();private active=0;
 constructor(private clock=Date.now,private capacity=4096,private concurrent=16){}
 acquire(key:string):LoginTicket {
  const now=this.clock();for(const[k,e]of this.entries)if(e.until<=now)this.entries.delete(k);
  let entry=this.entries.get(key);
  if(this.active>=this.concurrent)return {allowed:false,retryAfter:1};
  if(entry&&entry.failures+entry.inFlight>=8)return {allowed:false,retryAfter:Math.max(1,Math.ceil((entry.until-now)/1000))};
  if(!entry){if(this.entries.size>=this.capacity)return{allowed:false,retryAfter:60};entry={failures:0,inFlight:0,until:now+60_000};this.entries.set(key,entry);}
  const captured=entry;captured.inFlight++;this.active++;let done=false;
  return {allowed:true,finish:(failed:boolean)=>{if(done)return;done=true;this.active--;captured.inFlight--;if(this.entries.get(key)!==captured)return;if(failed)captured.failures++;if(!captured.failures&&!captured.inFlight)this.entries.delete(key);}};
 }
}
