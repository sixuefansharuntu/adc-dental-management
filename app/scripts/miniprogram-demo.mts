import pg from 'pg';import {randomBytes,randomUUID} from 'node:crypto';
import {readFile,writeFile,rm,stat} from 'node:fs/promises';import{join,resolve}from'node:path';
import{config,pgOptions,root}from'./config.mjs';import{startDatabase}from'./database.mjs';import{migrate}from'./migrate.mjs';import{seedBooking}from'./seed-booking.mts';
import{demoArgs,demoPaths,prepareDemoProject}from'./miniprogram-demo-project.mjs';
export async function runDemo(args=process.argv.slice(2)){
 const options=demoArgs(args),env=await config(),savedEnv={...process.env};
 if(process.env.NODE_ENV==='production'||env.PGHOST!=='127.0.0.1')throw Error('演示仅支持本机开发数据库。');
 const name='adc_miniprogram_demo_test_'+Date.now(),paths=demoPaths(root,name),controller=new AbortController(),stop=()=>controller.abort();
 const onInput=(chunk:Buffer)=>{if(chunk.toString().trim()==='stop')stop();};
 process.on('SIGINT',stop);process.on('SIGTERM',stop);
 let app:any,admin:any,created=false,result:any;
 const ensureActive=()=>{if(controller.signal.aborted)throw Error('演示启动已取消。');};
 try{
  try{await stat(paths.folder);throw Error('演示目录已存在，未覆盖。');}catch(e:any){if(e.code!=='ENOENT')throw e;}
  await startDatabase({initialize:false,env});ensureActive();
  admin=new pg.Client(pgOptions(env,'postgres'));await admin.connect();await admin.query('CREATE DATABASE "'+name+'"');created=true;
  const local={...env};for(const key of Object.keys(local))if(key.startsWith('ADC_')&&key.endsWith('_PASSWORD'))local[key]=randomBytes(20).toString('base64url');
  Object.assign(process.env,local,{PGDATABASE:name,ADC_ISOLATED_SEED_REPORTS:'true',ADC_LOCAL_IDENTITY_ENABLED:'true',ADC_MINIPROGRAM_LOCAL_ENABLED:'true',BOOKING_DEMO_DATE:new Date(Date.now()+86400000).toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'})});
  await migrate();ensureActive();await seedBooking();ensureActive();
  const{createApp}=await import('../apps/api/src/app.ts');app=await createApp({shutdownHooks:false});await app.listen(0,'127.0.0.1');const base=(await app.getUrl())+'/api/v1';
  const project=await prepareDemoProject(root,name,base,options.appid),accountFile=join(paths.folder,'预约演示账号.txt');
  await writeFile(accountFile,`仅本次临时小程序演示，停止后删除。不要提交此文件。\n演示日期：${process.env.BOOKING_DEMO_DATE}\n患者甲 alice：${local.ADC_PATIENT_A_PASSWORD}\n患者乙 bob：${local.ADC_PATIENT_B_PASSWORD}\n不访问原工作台或真实患者。\n`);
  await writeFile(join(paths.folder,'联调入口.json'),JSON.stringify({database:name,apiBaseUrl:base,projectPath:project.project,accountFile,demoDate:process.env.BOOKING_DEMO_DATE,appid:options.appid},null,2));
  ensureActive();
  result={batch:297,mode:options.check?'check':'interactive',database:name,projectPath:project.project,accountFile,apiBaseUrl:base,demoDate:process.env.BOOKING_DEMO_DATE,copiedFiles:project.files,wechatCompiled:false,wechatTested:false};
  if(options.check){
   const request=async(path:string,body?:any,token?:string)=>{const r=await fetch(base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});if(r.status!==200&&r.status!==201)throw Error('演示接口自检失败：'+path+' '+r.status);return r.json();};
   const catalogue=await request('/catalogue');if(catalogue.items.length!==3)throw Error('演示目录不完整。');
   const item=catalogue.items[0],availability=await request('/availability?'+new URLSearchParams({date:process.env.BOOKING_DEMO_DATE!,clinicId:item.clinicId,doctorId:item.doctorId,serviceVersionId:item.serviceVersionId}));
   const group=availability.groups.find((g:any)=>g.slots.some((s:any)=>s.status==='available')),slot=group?.slots.find((s:any)=>s.status==='available');if(!slot)throw Error('无可用演示时段。');
   const login=await request('/miniprogram/local-session',{loginName:'alice',password:local.ADC_PATIENT_A_PASSWORD});
   const quote=await request('/miniprogram/quote',{scheduleId:group.scheduleId,ruleVersionId:group.ruleVersionId,serviceVersionId:group.serviceVersionId,startsAt:slot.startsAt},login.token);
   const book=await request('/miniprogram/appointments',{scheduleId:group.scheduleId,ruleVersionId:group.ruleVersionId,serviceVersionId:group.serviceVersionId,startsAt:quote.startsAt,requestId:randomUUID(),name:login.patient.name,contact:login.patient.contact,intention:'临时联调自检'},login.token);
   const cancel=await request('/miniprogram/appointments/'+book.id+'/cancel',{requestId:randomUUID(),version:book.version,reason:'临时联调自检结束'},login.token);if(cancel.disposition!=='cancelled'||cancel.version!==2)throw Error('演示取消结果不符。');
   await request('/miniprogram/logout',{},login.token);
   const generated=await readFile(join(project.project,'app.js'),'utf8');if(!generated.includes(base)||!generated.includes('localBookingEnabled: true'))throw Error('副本配置不符。');
   result.checks=5;result.passed=['受控源文件副本及本机接口','三名医生目录','未来公开可用时段','合成验证核对与预约保存','原版本取消及退出'];
  }else{
   console.log('ADC_MINI_DEMO_READY '+JSON.stringify(result));
   console.log('在微信开发者工具导入上述projectPath，账号只在accountFile。Ctrl+C或输入stop停止并删除本次演示库及副本。原开发项目保持不变。');
   process.stdin.on('data',onInput);process.stdin.resume();
   if(!controller.signal.aborted)await new Promise<void>(r=>controller.signal.addEventListener('abort',()=>r(),{once:true}));
  }
 }finally{
  process.stdin.removeListener('data',onInput);if(!options.check)process.stdin.pause();process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);
  if(app)await app.close();
  try{if(created){demoPaths(root,name);await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()',[name]);await admin.query('DROP DATABASE "'+name+'"');await rm(paths.folder,{recursive:true,force:true});}}finally{if(admin)await admin.end();}
  for(const key of Object.keys(process.env))if(!(key in savedEnv))delete process.env[key];Object.assign(process.env,savedEnv);
 }
 if(result&&options.check)await writeFile(join(root,'artifacts/mini-demo-check-latest.json'),JSON.stringify({...result,cleaned:true,developmentBusinessWrites:false,originalCredentialsChanged:false,temporaryCredentialsGenerated:true,checkedAt:new Date().toISOString()},null,2));
 console.log('ADC_MINI_DEMO_CLOSED '+name);return result;
}
if(process.argv[1]?.endsWith('miniprogram-demo.mts'))runDemo().catch(e=>{console.error(e.message);process.exitCode=1;});
