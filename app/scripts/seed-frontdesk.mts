import pg from 'pg';
import { config,pgOptions } from './config.mjs';
import { fixtureId as id } from './seed.mjs';
export async function seedFrontdesk(){
 const env=await config(),c=new pg.Client(pgOptions(env));await c.connect();const bootstrap=id('booking-bootstrap'),east=id('clinic-east'),river=id('clinic-river');
 async function put(table:string,data:Record<string,unknown>){const keys=Object.keys(data);await c.query(`INSERT INTO adc.${table}(${keys.join(',')}) VALUES(${keys.map((_,i)=>'$'+(i+1)).join(',')}) ON CONFLICT DO NOTHING`,Object.values(data));}
 try{await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(170002)');
  const role=id('role-frontdesk'),rv=id('role-frontdesk-v1');
  await put('security_role',{role_id:role,name:'前台预约与接诊',responsibility:'本诊所代办/联系/排班/实际登记；不含临床病历或收款',row_version:1});
  await put('role_version',{role_version_id:rv,role_id:role,version_no:1,name:'前台预约与接诊',configured_by:bootstrap,configured_at:new Date()});
  for(const fn of ['appointment.read','appointment.manage','schedule.manage','patient.identity','patient.create','visit.read','visit.manage'])await put('role_function',{role_version_id:rv,function_code:fn});
  for(const [key,clinic]of [['front-east',east],['front-river',river]]){
   const grant=id('grant-frontdesk-'+key);await put('access_grant',{grant_id:grant,account_id:id('account-'+key),version_no:2,effective_from:'2026-10-01T00:00:00Z',configured_by:bootstrap,configured_at:new Date()});await put('grant_role',{grant_id:grant,role_version_id:rv});await put('grant_clinic',{grant_id:grant,clinic_id:clinic});
   for(const [resource,fields]of [['appointment',['arrangement','contact']],['schedule',['arrangement']],['patient',['identity']],['visit',['arrived_at','started_at','ended_at','left_at','arrangement']]] as const)for(const field of fields)await put('grant_field',{grant_field_id:id(grant+resource+field),grant_id:grant,resource_code:resource,field_code:field,action_code:'maintain'});
  }
  for(const [key,name,clinic]of [['nurse-east-a','张护士（合成）',east],['nurse-east-b','李护士（合成）',east],['nurse-river','王护士（合成）',river]])await put('employee',{employee_id:id(key),name,employment_arrangement:JSON.stringify({assignments:[{clinicId:clinic,role:'nurse',from:'2026-01-01',to:null}]}),row_version:1,public_enabled:false});
  const now=new Date((await c.query('SELECT clock_timestamp() AS now')).rows[0].now),today=now.toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'});
  for(const [key,clinic]of [['lin',east],['zhou',east],['chen',river]]){
   const doctor=id('booking-'+key);const shifts=(await c.query('SELECT * FROM adc.doctor_schedule WHERE doctor_id=$1 AND starts_at<$3 AND ends_at>$2 ORDER BY starts_at',[doctor,today+'T00:00:00+08:00',new Date(+new Date(today+'T00:00:00+08:00')+86400000)])).rows;
   if(shifts.some(s=>s.can_receive&&s.clinic_id===clinic&&s.starts_at<=now&&s.ends_at>now))continue;
   let start=new Date(today+'T00:00:00+08:00'),end=new Date(+start+86400000);
   for(const s of shifts){if(s.ends_at<=now&&s.ends_at>start)start=s.ends_at;if(s.starts_at>now&&s.starts_at<end)end=s.starts_at;}
   if(shifts.some(s=>s.starts_at<=now&&s.ends_at>now)||end<=start)continue;
   const sid=id('frontdesk-shift-'+doctor+'-'+start.toISOString()),op=id('seed-'+sid);
   const data={schedule_id:sid,doctor_id:doctor,clinic_id:clinic,starts_at:start,ends_at:end,can_receive:true,change_reason:'本日课程合成内部值班，仅便于检查真实到院登记；不对外开放。',row_version:1,public_status:'not_open',capacity_limit:1};
   await put('doctor_schedule',data);await put('business_operation',{operation_id:op,actor_id:bootstrap,occurred_at:now,action_code:'seed.frontdesk.shift',subject_kind:'doctor_schedule',subject_key:sid,after_content:JSON.stringify(data)});const {row_version,...rest}=data;await put('schedule_revision',{schedule_revision_id:id('revision-'+sid),...rest,version_no:row_version,operation_id:op});await put('operation_clinic',{operation_id:op,clinic_id:clinic});
  }
  await c.query('COMMIT');console.log('Frontdesk synthetic assignments and versioned grants ready; no real visit created.');
 }catch(e){await c.query('ROLLBACK');throw e;}finally{await c.end();}
}
if(process.argv[1]?.endsWith('seed-frontdesk.mts'))seedFrontdesk().catch(e=>{console.error(e.message);process.exitCode=1;});
