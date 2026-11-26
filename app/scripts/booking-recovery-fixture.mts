import pg from'pg';import{randomBytes}from'node:crypto';import{rm}from'node:fs/promises';import{join,resolve,sep}from'node:path';
import{config,pgOptions,root}from'./config.mjs';import{migrate}from'./migrate.mjs';import{seedBooking}from'./seed-booking.mts';
export async function recoveryFixture(origin?:string){
 const env=await config(),original=env.PGDATABASE,testDb='adc_booking_recovery_test_'+Date.now();
 if(!/^adc_booking_recovery_test_\d+$/.test(testDb)||!['127.0.0.1','localhost'].includes(env.PGHOST))throw Error('Refuse nonlocal test fixture');
 env.BOOKING_DEMO_DATE=new Date(Date.now()+86400000).toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'});
 if(origin)env.ADMIN_ORIGIN=origin;
 for(const k of['ADC_PATIENT_A_PASSWORD','ADC_PATIENT_B_PASSWORD','ADC_STAFF_EAST_PASSWORD','ADC_STAFF_RIVER_PASSWORD','ADC_STAFF_NONE_PASSWORD'])env[k]=randomBytes(18).toString('base64url');
 Object.assign(process.env,env);process.env.ADC_ISOLATED_SEED_REPORTS='true';
 const admin=new pg.Client(pgOptions(env,'postgres'));await admin.connect();await admin.query(`CREATE DATABASE "${testDb}"`);process.env.PGDATABASE=testDb;
 let app:any;let fault:null|{kind:string;phase:'before'|'after'}=null;const faults:any[]=[];
 const close=async()=>{if(app)await app.close();process.env.PGDATABASE=original;await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()',[testDb]);await admin.query(`DROP DATABASE "${testDb}"`);await admin.end();const dir=resolve(root,'.runtime',testDb);if(!dir.startsWith(resolve(root,'.runtime')+sep))throw Error('Unsafe fixture cleanup');await rm(dir,{recursive:true,force:true});};
 try{
  await migrate();await seedBooking();const{createApp}=await import('../apps/api/src/app.ts');const{DatabaseService}=await import('../apps/api/src/database.service.ts');const{BookingService}=await import('../apps/api/src/booking.service.ts');const{AuthService}=await import('../apps/api/src/auth.service.ts');
  app=await createApp();app.use((req:any,res:any,next:any)=>{
   const kind=req.path==='/api/v1/patient/appointments'?'book':/\/patient\/appointments\/[\w-]+\/reschedule$/.test(req.path)?'reschedule':/\/patient\/appointments\/[\w-]+\/cancel$/.test(req.path)?'cancel':'';
   if(req.method==='POST'&&fault?.kind===kind){const f=fault;fault=null;
    if(f.phase==='before'){faults.push({...f,at:new Date().toISOString()});req.socket.destroy();return;}
    const end=res.end;res.end=function(...args:any[]){if(res.statusCode>=200&&res.statusCode<300){faults.push({...f,at:new Date().toISOString()});res.destroy();return res;}return end.apply(this,args);};
   }next();
  });await app.listen(0,'127.0.0.1');
  return{app,env,testDb,base:(await app.getUrl())+'/api/v1',db:app.get(DatabaseService),booking:app.get(BookingService),auth:app.get(AuthService),faults,arm:(kind:string,phase:'before'|'after'='after')=>{fault={kind,phase};},close};
 }catch(e){await close();throw e;}
}
