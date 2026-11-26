import pg from 'pg';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { config,pgOptions,root,seedReportDirectory } from './config.mjs';
import { fixtureId as id } from './seed.mjs';
import { credentialHash } from '../apps/api/src/auth.service.ts';

export async function seedBooking({days=7,historyDays=0}:{days?:number;historyDays?:number}={}){
 const env=await config(),c=new pg.Client(pgOptions(env));await c.connect();
 const bootstrap=id('booking-bootstrap'),east=id('clinic-east'),river=id('clinic-river');const start=env.BOOKING_DEMO_DATE;
 async function insert(table:string,data:Record<string,unknown>){const keys=Object.keys(data);await c.query(`INSERT INTO ${table}(${keys.join(',')}) VALUES(${keys.map((_,i)=>'$'+(i+1)).join(',')}) ON CONFLICT DO NOTHING`,Object.values(data));}
 try{
  await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(169002)');
  for(const [key,name,specialty]of [['bootstrap','系统初始化人员（合成）',''],['lin','林医生','综合牙科'],['zhou','周医生','口腔修复'],['chen','陈医生','牙周诊疗'],['front-east','东城前台（合成）',''],['front-river','滨江前台（合成）',''],['no-access','无权限演示员工','']]){
   await insert('adc.employee',{employee_id:id('booking-'+key),name,public_name:specialty?name:null,public_specialty:specialty||null,public_intro:specialty?'课程合成医生资料，用于预约流程演示。':null,public_enabled:!!specialty,row_version:1});
  }
  for(const [clinic,name,address]of [[east,'ADC 东城诊所（示例）','东城路18号 · 合成地址'],[river,'ADC 滨江诊所（示例）','滨江路26号 · 合成地址']]){
   await insert('adc.clinic',{clinic_id:clinic,name,address,created_by:bootstrap,created_at:new Date(),updated_by:bootstrap,updated_at:new Date(),row_version:1});
   await insert('adc.clinic_booking_rule_version',{rule_version_id:id('rule-'+clinic),clinic_id:clinic,version_no:1,effective_from:'2026-01-01T00:00:00Z',self_cancel_lead_minutes:60,self_reschedule_lead_minutes:60,self_service_enabled:true,created_by:bootstrap,created_at:new Date()});
  }
  const role=id('role-booking-read'),rv=id('role-booking-read-v1');
  await insert('adc.security_role',{role_id:role,name:'预约供阅',responsibility:'仅允许所在授权诊所预约供阅；不包含临床及权限配置',row_version:1});
  await insert('adc.role_version',{role_version_id:rv,role_id:role,version_no:1,name:'预约供阅',configured_by:bootstrap,configured_at:new Date()});
  await insert('adc.role_function',{role_version_id:rv,function_code:'appointment.read'});
  for(const [key,login,secret,clinic]of [['front-east','front.east',env.ADC_STAFF_EAST_PASSWORD,east],['front-river','front.river',env.ADC_STAFF_RIVER_PASSWORD,river],['no-access','staff.none',env.ADC_STAFF_NONE_PASSWORD,null]]){
   const account=id('account-'+key),grant=id('grant-'+key);
   await insert('adc.staff_account',{account_id:account,employee_id:id('booking-'+key),login_name:login,credential_verifier:await credentialHash(secret!),activation_arrangement:'enabled',opened_at:new Date(),maintained_by:bootstrap,maintained_at:new Date(),row_version:1});
   await insert('adc.access_grant',{grant_id:grant,account_id:account,version_no:1,effective_from:'2026-01-01T00:00:00Z',configured_by:bootstrap,configured_at:new Date()});
   await insert('adc.grant_role',{grant_id:grant,role_version_id:rv});if(clinic)await insert('adc.grant_clinic',{grant_id:grant,clinic_id:clinic});
  }
  for(const [key,name,phone,secret]of [['alice','示例患者甲','13800000001',env.ADC_PATIENT_A_PASSWORD],['bob','示例患者乙','13800000002',env.ADC_PATIENT_B_PASSWORD]]){
   const subject=id('subject-'+key);await insert('adc.patient_booking_subject',{booking_subject_id:subject,verified_identity_key:'local-fixture:'+key,verification_kind:'online',verified_at:new Date(),contact_value:phone,row_version:1});
   await insert('adc_auth.local_identity',{identity_id:id('identity-'+key),login_name:key,booking_subject_id:subject,credential_verifier:await credentialHash(secret!),display_name:name,enabled:true});
  }
  for(const [key,clinic,minutes,service]of [['lin',east,30,'初诊咨询'],['zhou',east,60,'复诊评估'],['chen',river,30,'初诊咨询']] as const){
   const doctor=id('booking-'+key);
   await insert('adc.practice_assignment',{practice_id:id('practice-'+key),employee_id:doctor,clinic_id:clinic,valid_from:'2026-01-01',practice_arrangement:'enabled',updated_by:bootstrap,updated_at:new Date(),row_version:1});
   await insert('adc.booking_service_version',{service_version_id:id('service-'+key),clinic_id:clinic,doctor_id:doctor,service_code:key==='zhou'?'REVIEW':'CONSULT',version_no:1,service_name:service+'（示例配置）',duration_minutes:minutes,effective_from:'2026-01-01T00:00:00Z',enabled:true,created_by:bootstrap,created_at:new Date()});
   for(let day=historyDays?-historyDays-1:0;day<days;day++){
    if(day===-1)continue;
    const historical=day<0;
    const d=new Date(start+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+day);const date=d.toISOString().slice(0,10);
    for(const [a,z]of historical?[['09:00','17:00']]:[['09:00','12:00'],['14:00','17:00']]){
     const schedule=id(`formal-${key}-${date}-${a}`),operation=id('seed-'+schedule),paused=key==='zhou'&&day===0&&a==='14:00';
     const data={schedule_id:schedule,doctor_id:doctor,clinic_id:clinic,starts_at:date+'T'+a+':00+08:00',ends_at:date+'T'+z+':00+08:00',can_receive:true,change_reason:'课程合成排班，非真实诊所。',row_version:1,public_status:historical?'not_open':paused?'paused':'open',capacity_limit:1};
     await insert('adc.doctor_schedule',data);
     await insert('adc.business_operation',{operation_id:operation,actor_id:bootstrap,occurred_at:new Date(),action_code:'seed.schedule',subject_kind:'doctor_schedule',subject_key:schedule,after_content:JSON.stringify(data)});
     const {row_version,...snapshot}=data;await insert('adc.schedule_revision',{schedule_revision_id:id('snapshot-'+schedule),...snapshot,version_no:row_version,operation_id:operation});
     await insert('adc.operation_clinic',{operation_id:operation,clinic_id:clinic});
    }
   }
  }
  await c.query('COMMIT');
 }catch(e){await c.query('ROLLBACK');throw e;}finally{await c.end();}
 await writeFile(join(await seedReportDirectory(env),'预约演示账号.txt'),`ADC本机合成身份（不要提交）\n患者入口：http://127.0.0.1:5173/?view=patient\n员工入口：http://127.0.0.1:5173/\n示例排班：${start}起${days}天\n\n患者甲 alice：${env.ADC_PATIENT_A_PASSWORD}\n患者乙 bob：${env.ADC_PATIENT_B_PASSWORD}\n东城前台 front.east：${env.ADC_STAFF_EAST_PASSWORD}\n滨江前台 front.river：${env.ADC_STAFF_RIVER_PASSWORD}\n无权限 staff.none：${env.ADC_STAFF_NONE_PASSWORD}\n\n患者口令仅为本机验证适配，不能当作已接通微信认证；不使用真实患者。\n`,'utf8');
 console.log('Booking fixtures ready; credentials written privately under .runtime.');
}
if(process.argv[1]?.endsWith('seed-booking.mts'))seedBooking().catch(e=>{console.error(e.message);process.exitCode=1;});

