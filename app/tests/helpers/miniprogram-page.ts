import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
export function simulateMiniCloud(defaultStatus = 200) {
 const calls: { options: { path:string; method:string; data:Record<string, unknown>; token:string }; name:string; reply(data:unknown,statusCode?:number):void; fail():void }[] = [];
 return { calls, cloud: { callFunction({name,data:options,success,fail}:any) {
  calls.push({name,options,reply(data,statusCode=defaultStatus){success({result:{status:statusCode,data}});},fail(){fail();}});
 } } };
}
// Register the actual page entry point with a replaceable wx network boundary.
export function miniprogramPage(platform:any, base='http://127.0.0.1/api/v1',options:{page?:'index'|'booking'|'appointments'|'recovery'|'account';globalData?:any}={}) {
 const entry=fileURLToPath(new URL('../../apps/miniprogram/pages/'+(options.page||'index')+'/index.js',import.meta.url));
 const globalData={apiBaseUrl:base,...options.globalData};
 const storage=new Map();
 if(!platform.getStorageSync)Object.assign(platform,{getStorageSync:(k:any)=>storage.get(k)||'',setStorageSync:(k:any,v:any)=>storage.set(k,v),removeStorageSync:(k:any)=>storage.delete(k)});
 let definition:any;
 vm.runInNewContext(readFileSync(entry,'utf8'),{require:createRequire(entry),wx:platform,getApp:()=>({globalData}),Page:(p:any)=>{definition=p;}});
 const page:any={...definition,data:structuredClone(definition.data),updates:0,setData(values:any){Object.assign(this.data,values);this.updates++;}};
 return page;
}
