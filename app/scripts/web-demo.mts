import pg from 'pg';
import assert from 'node:assert/strict';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdir,writeFile,rm} from 'node:fs/promises';
import {resolve,join,sep} from 'node:path';
import {config,pgOptions,root} from './config.mjs';
import {startDatabase} from './database.mjs';
import {migrate} from './migrate.mjs';
import {seedBooking} from './seed-booking.mts';
import {seedFrontdesk} from './seed-frontdesk.mts';
import {seedClinical} from './seed-clinical.mts';
import {seedBusiness} from './seed-business.mts';
import {fixtureId as id} from './seed.mjs';
import {populateWebDemo} from './populate-web-demo.mts';

export function webDemoPath(name:string){
 if(!/^adc_web_demo_test_\d+$/.test(name))throw Error('非法网页演示库名称。');
 const base=resolve(root,'.runtime'),folder=resolve(base,name);
 if(!folder.startsWith(base+sep))throw Error('网页演示路径越界。');
 return folder;
}
export async function runWebDemo(args=process.argv.slice(2)){
 if(new Set(args).size!==args.length||args.some(x=>!['--check','--clinical','--populated'].includes(x)))throw Error('仅支持 --check、--clinical 和 --populated。');
 const check=args.includes('--check'),populated=args.includes('--populated');
 if(check&&populated)throw Error('--check 基于空白业务库。使用 --populated 时会核对新生成的业务数据。');
 const clinical=args.includes('--clinical')||populated,env=await config(),saved={...process.env};
 if(process.env.NODE_ENV==='production'||env.PGHOST!=='127.0.0.1')throw Error('网页演示仅支持本机开发。');
 const name='adc_web_demo_test_'+Date.now(),folder=webDemoPath(name);
 const controller=new AbortController(),stop=()=>controller.abort();
 const input=(b:Buffer)=>{if(b.toString().trim()==='stop')stop();};
 process.on('SIGINT',stop);process.on('SIGTERM',stop);
 let admin:any,app:any,web:any,created=false,owned=false,result:any;
 const active=()=>{if(controller.signal.aborted)throw Error('网页演示启动已取消。');};
 try{
  await mkdir(folder);owned=true;
  await startDatabase({initialize:false,env});active();
  admin=new pg.Client(pgOptions(env,'postgres'));await admin.connect();
  await admin.query('CREATE DATABASE "'+name+'"');created=true;
  const local={...env};for(const key of Object.keys(local))if(key.startsWith('ADC_')&&key.endsWith('_PASSWORD'))local[key]=randomBytes(20).toString('base64url');
  const demoDate=new Date(Date.now()+86400000).toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'});
  Object.assign(process.env,local,{PGDATABASE:name,ADC_ISOLATED_SEED_REPORTS:'true',ADC_LOCAL_IDENTITY_ENABLED:'true',ADC_MINIPROGRAM_LOCAL_ENABLED:'false',BOOKING_DEMO_DATE:demoDate,ADC_FILE_ROOT:join(folder,'files')});
  const populatedDays=30;
  await migrate();active();
  await seedBooking(populated?{days:populatedDays,historyDays:populatedDays-1}:undefined);
  await seedFrontdesk();if(clinical){await seedClinical();await seedBusiness(false,['front.east','front.river']);}active();
  const {createApp}=await import('../apps/api/src/app.ts');app=await createApp({shutdownHooks:false});await app.listen(0,'127.0.0.1');
  const api=await app.getUrl();
  const {createServer}=await import('vite');
  web=await createServer({configFile:resolve(root,'apps/admin/vite.config.ts'),root:resolve(root,'apps/admin'),server:{host:'127.0.0.1',port:0,strictPort:false,open:false,proxy:{'/api':api}}});
  await web.listen();active();
  const address=web.httpServer.address();assert.ok(address&&typeof address!=='string');
  const origin='http://localhost:'+address.port;process.env.ADMIN_ORIGIN=origin;
  const accountFile=join(folder,'网页演示账号.json');
  const accounts:Record<string,string>={alice:local.ADC_PATIENT_A_PASSWORD,bob:local.ADC_PATIENT_B_PASSWORD,'front.east':local.ADC_STAFF_EAST_PASSWORD,'front.river':local.ADC_STAFF_RIVER_PASSWORD};
  if(clinical)Object.assign(accounts,{'doctor.lin':local.ADC_DOCTOR_LIN_PASSWORD,'doctor.zhou':local.ADC_DOCTOR_ZHOU_PASSWORD,'doctor.river':local.ADC_DOCTOR_RIVER_PASSWORD,'nurse.east':local.ADC_NURSE_EAST_PASSWORD});
  await writeFile(accountFile,JSON.stringify({note:'仅本次独立网页演示；stop后删除。不要提交或上传。',accounts},null,2));
  const data=populated?await populateWebDemo(origin,demoDate,accounts,populatedDays):undefined;
  result={database:name,origin,patientUrl:origin+'/?view=patient',staffUrl:origin+'/',accountFile,demoDate,scope:populated?'populated':clinical?'clinical':'frontdesk',...(data?{data}:{})};
  await writeFile(join(folder,'网页入口.json'),JSON.stringify(result,null,2));
  if(check){
   const passed:string[]=[];const call=async(path:string,body?:any,cookie='')=>{
    const r=await fetch(origin+'/api/v1'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(body?{Origin:origin}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});
    return {status:r.status,json:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]||''};
   };
   const ok=(r:any)=>{assert.ok([200,201].includes(r.status),'接口自检失败 '+r.status+' '+JSON.stringify(r.json));return r;};
   const login=async(kind:string,loginName:string)=>ok(await call('/'+kind+'/session',{loginName,password:accounts[loginName as keyof typeof accounts]})).cookie;
   const html=await fetch(origin);assert.equal(html.status,200);assert.match(await html.text(),/src\/main.ts/);passed.push('网页与同源API代理可用');
   assert.equal((await fetch(origin+'/@fs/'+folder.replaceAll('\\','/')+'/网页演示账号.json')).status,403);passed.push('私有目录不供网页读取');
   const catalogue=ok(await call('/catalogue')).json,item=catalogue.items.find((x:any)=>x.doctorId===id('booking-lin'));
   const groups=ok(await call('/availability?'+new URLSearchParams({date:demoDate,clinicId:item.clinicId,doctorId:item.doctorId,serviceVersionId:item.serviceVersionId}))).json.groups;
   const group=groups.find((g:any)=>g.slots.filter((s:any)=>s.status==='available').length>=3),slots=group.slots.filter((s:any)=>s.status==='available');passed.push('未来七天有可约安排');
   const alice=await login('patient','alice'),bob=await login('patient','bob'),front=await login('staff','front.east'),river=await login('staff','front.river');
   const selection=(n:number)=>({scheduleId:group.scheduleId,ruleVersionId:group.ruleVersionId,serviceVersionId:group.serviceVersionId,startsAt:slots[n].startsAt});
   const body={...selection(0),requestId:randomUUID(),name:'网页联调患者',contact:'13800000299',intention:'独立网页联调'};
   const booking=ok(await call('/patient/appointments',body,alice)).json;
   assert.equal(ok(await call('/patient/appointments',body,alice)).json.id,booking.id);passed.push('患者预约直接确认且原请求不重复');
   const move=ok(await call('/patient/appointments/'+booking.id+'/reschedule',{...body,...selection(1),requestId:randomUUID(),version:booking.version},alice)).json;
   assert.equal(move.version,2);
   const cancelBody={requestId:randomUUID(),version:move.version,reason:'网页联调取消'};
   assert.equal(ok(await call('/patient/appointments/'+booking.id+'/cancel',cancelBody,alice)).json.disposition,'cancelled');
   ok(await call('/patient/appointments/'+booking.id+'/cancel',cancelBody,alice));passed.push('改约及取消采用原版本且可重放');
   assert.equal(ok(await call('/patient/appointments/queue',undefined,bob)).json.items.length,0);
   assert.equal((await call('/frontdesk/appointments?clinicId='+item.clinicId+'&date='+demoDate,undefined,river)).status,403);passed.push('患者本人及前台诊所隔离');
   const patient=ok(await call('/frontdesk/patients',{requestId:randomUUID(),clinicId:item.clinicId,name:'网页接诊患者',phone:'13800000300',identityBasis:'独立合成场景当面核实'},front)).json;
   let visit=ok(await call('/frontdesk/visits',{requestId:randomUUID(),clinicId:item.clinicId,patientId:patient.id,doctorId:item.doctorId,nurseIds:[id('nurse-east-a')],arrivedAt:new Date(Date.now()-1000).toISOString(),basis:'合成实际到院',identityConfirmed:true,identityBasis:'合成姓名身份已核实',coordination:'合成当日内部值班已核实接诊'},front)).json;
   for(const field of ['started_at','ended_at','left_at'])visit=ok(await call('/frontdesk/visits/'+visit.id+'/progress',{requestId:randomUUID(),version:visit.version,field,occurredAt:new Date(Date.now()-100).toISOString(),basis:'合成前台核实实际发生',reason:'独立网页联调'},front)).json;
   assert.ok(visit.leftAt);passed.push('前台建档到院与开始结束离开');
   if(clinical){
    const doctor=await login('staff','doctor.lin'),nurse=await login('staff','nurse.east'),path='/clinical/visits/'+visit.id;
    const record={requestId:randomUUID(),recordVersion:0,clinicalAt:visit.endedAt,body:'合成软件检查正文，不作为临床意见。',pendingNote:null,completeness:'complete',doctorConfirmed:true,treatments:[{id:null,version:0,itemId:id('item171-exam'),performedAt:visit.endedAt,teeth:[]}],reason:null};
    ok(await call(path+'/record',record,doctor));ok(await call(path+'/record',record,doctor));
    assert.equal((await call(path+'/record',{...record,requestId:randomUUID()},nurse)).status,403);passed.push('医生确认治疗与护士临床写入拒绝');
    const source=ok(await call(path+'/billing-source',undefined,nurse)).json;
    const billInput={billId:null,billVersion:0,priceBasis:null,lines:source.items.map((x:any)=>({treatmentId:x.id,treatmentVersion:x.version,priceVersionId:x.priceVersionId,quantity:'1.2500',unitPrice:x.referencePrice}))};
    const draft=ok(await call(path+'/draft',billInput,nurse)).json;assert.equal(draft.total,'62.50');
    const billBody={...billInput,requestId:randomUUID(),draftToken:draft.draftToken,reason:null};
    ok(await call(path+'/bill',billBody,nurse));ok(await call(path+'/bill',billBody,nurse));passed.push('明确数量单价核费62.50及开单去重');
    const receipt={requestId:randomUUID(),billVersion:1,amount:'62.50',paymentMethod:'cash',receivedAt:new Date(Date.now()-100).toISOString(),actualReceived:true,adjustmentIds:[],basis:'合成软件检查：只登记已发生付款，不执行扣款'};
    assert.equal((await call(path+'/receipt',receipt,nurse)).status,403);ok(await call(path+'/receipt',receipt,front));ok(await call(path+'/receipt',receipt,front));
    const detail=ok(await call(path,undefined,front)).json;assert.equal(detail.bill.total,'62.50');assert.equal(detail.bill.paymentState,'paid');assert.equal(detail.record,null);passed.push('前台实收去重、已付状态与病历隔离');
    const dc=new pg.Client(pgOptions({...local,PGDATABASE:name}));await dc.connect();try{
     const count=(await dc.query('SELECT count(*)::int n FROM adc.receipt')).rows[0].n;assert.equal(count,1);
     const chain=(await dc.query('SELECT rr.amount FROM adc.receipt_revision rr JOIN adc.bill_revision br ON br.bill_revision_id=rr.bill_revision_id JOIN adc.treatment_bill b ON b.bill_id=br.bill_id WHERE b.visit_id=$1',[visit.id])).rows;assert.equal(chain.length,1);assert.equal(chain[0].amount,'62.50');
    }finally{await dc.end();}passed.push('就诊账单实收原版同源与金额守恒');
    const day=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'}),report=ok(await call('/business/reports',{dimension:'daily',clinicIds:[item.clinicId],fromDay:day,toDay:day,employeeId:null,itemKey:null},front)).json;assert.equal(report.snapshot.report.totals.receivedAmount,'62.50');passed.push('本店经营日报实收与原收款62.50一致');
    ok(await call('/staff/logout',{},doctor));ok(await call('/staff/logout',{},nurse));
   }
   const c=new pg.Client(pgOptions({...local,PGDATABASE:name}));await c.connect();
   try{assert.equal((await c.query('SELECT count(*)::int n FROM adc.visit')).rows[0].n,1);assert.equal((await c.query('SELECT count(*)::int n FROM adc.appointment')).rows[0].n,1);}finally{await c.end();}
   for(const [kind,cookie]of [['patient',alice],['patient',bob],['staff',front],['staff',river]])ok(await call('/'+kind+'/logout',{},cookie));
   result.checks=passed;result.browserBusinessJourney=false;
  }else{
   console.log('ADC_WEB_DEMO_READY '+JSON.stringify(result));
   console.log('使用以上localhost入口及本次私有账号，选择demoDate。原127.0.0.1工作台保持；输入stop结束并删除本次演示数据。');
   process.stdin.on('data',input);process.stdin.on('end',stop);process.stdin.resume();
   if(!controller.signal.aborted)await new Promise<void>(r=>controller.signal.addEventListener('abort',()=>r(),{once:true}));
  }
 }finally{
  process.stdin.removeListener('data',input);process.stdin.removeListener('end',stop);if(!check)process.stdin.pause();
  try{if(web)await web.close();if(app)await app.close();}
  finally{try{if(created){webDemoPath(name);await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()',[name]);await admin.query('DROP DATABASE "'+name+'"');}if(owned)await rm(webDemoPath(name),{recursive:true,force:true});}finally{if(admin)await admin.end();for(const key of Object.keys(process.env))if(!(key in saved))delete process.env[key];Object.assign(process.env,saved);process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);}}
 }
 if(check)await writeFile(join(root,'artifacts/web-demo-check-latest.json'),JSON.stringify({...result,cleaned:true,checkedAt:new Date().toISOString()},null,2));
 console.log('ADC_WEB_DEMO_CLOSED '+name);return result;
}
if(process.argv[1]?.endsWith('web-demo.mts'))runWebDemo().catch(e=>{console.error(e.message);process.exitCode=1;});
