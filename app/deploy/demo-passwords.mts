// Explicit owner-only maintenance for the 20 assigned synthetic accounts. Not an API.
import pg from 'pg';import {randomUUID} from 'node:crypto';import {readFile} from 'node:fs/promises';import {resolve} from 'node:path';import {fileURLToPath} from 'node:url';
import {CourseDemoGate,demoDigest} from '../apps/api/src/course-demo';
import {credentialHash,credentialMatches,newPatientPassword} from '../apps/api/src/credentials';
export const assignedDemoLogins=['alice','bob','front.east','front.river','staff.none','doctor.lin','doctor.zhou','doctor.river','nurse.east','imaging.east','followup.assist','stock.east','stock.river','sales.east','finance.hq','review.hq','manager.east','manager.river','quality.east','admin.local'];
export async function simplifyDemoPasswords(pool:any,gate:CourseDemoGate,input:any){
 if(!gate.enabled||!gate.manifest||!input?.syntheticOnly||!Array.isArray(input.accounts)||input.accounts.length!==20||input.accounts.map((a:any)=>a.loginName).sort().join()!==[...assignedDemoLogins].sort().join())throw Error('仅允许明确的20个预分配课程账号。');
 const password=newPatientPassword(input.newPassword);let c:any;
 try{
  c=await pool.connect();await c.query('BEGIN');const context=(await c.query('SELECT current_database() AS db,current_user AS usr')).rows[0];if(context.db!=='adc_course_demo'||context.usr!=='postgres')throw Error('仅专用课程库所有者可执行。');
  await c.query('LOCK TABLE adc.staff_account,adc_auth.local_identity IN ACCESS EXCLUSIVE MODE');await gate.assertEnvironment(c);
  const datasetId=gate.manifest.datasetId,prior=(await c.query("SELECT 1 FROM adc.business_operation WHERE action_code='course.demo.passwords' AND after_content->>'maintenanceId'=$1",[input.maintenanceId])).rows;
  if(!/^[a-f0-9-]{36}$/.test(input.maintenanceId)||prior.length)throw Error('维护请求无效或已完成，请先检查原结果。');
  const rows:any[]=[];
  // All guards are checked before temporarily suspending the credential immutability trigger.
  for(const a of input.accounts){
   const patient=['alice','bob'].includes(a.loginName);if(a.kind!==(patient?'patient':'staff'))throw Error('账号种类不匹配。');
   const r=(await c.query(patient?'SELECT i.identity_id AS id,i.booking_subject_id AS "subjectId",i.login_name AS "loginName",i.credential_verifier AS verifier,s.verified_identity_key AS key FROM adc_auth.local_identity i JOIN adc.patient_booking_subject s USING(booking_subject_id) WHERE i.login_name=$1':'SELECT account_id AS id,login_name AS "loginName",credential_verifier AS verifier FROM adc.staff_account WHERE login_name=$1',[a.loginName])).rows;
   if(r.length!==1||!await credentialMatches(a.password,r[0].verifier))throw Error('私有账号清单与当前凭据不匹配，未修改任何账号。');
   if(patient&&!await gate.allowsIdentity({...r[0],identityId:r[0].id},c))throw Error('课程患者锚点不匹配。');rows.push({...r[0],patient});
  }
  await c.query('ALTER TABLE adc.staff_account DISABLE TRIGGER staff_identity_fixed');
  const receipts=[];
  for(const r of rows){const verifier=await credentialHash(password);await c.query(r.patient?'UPDATE adc_auth.local_identity SET credential_verifier=$2 WHERE identity_id=$1':'UPDATE adc.staff_account SET credential_verifier=$2 WHERE account_id=$1',[r.id,verifier]);
   const fromVerifierSha256=demoDigest(r.verifier),toVerifierSha256=demoDigest(verifier);receipts.push({loginName:r.loginName,kind:r.patient?'patient':'staff',id:r.id,fromVerifierSha256,toVerifierSha256});
   if(r.patient){const credentialVersion=(await c.query("SELECT count(*)::int n FROM adc.business_operation WHERE action_code='course.patient.password' AND subject_kind='course_patient_identity' AND subject_key=$1 AND patient_actor_id=$2",[r.id,r.subjectId])).rows[0].n+1;if(credentialVersion>500)throw Error('课程患者凭据变更上限。');
    await c.query("INSERT INTO adc.business_operation(operation_id,patient_actor_id,occurred_at,action_code,subject_kind,subject_key,after_content,reason) VALUES($1,$2,clock_timestamp(),'course.patient.password','course_patient_identity',$3,$4,'课程环境所有者依用户要求简化预置演示口令')",[randomUUID(),r.subjectId,r.id,JSON.stringify({schemaVersion:1,syntheticOnly:true,datasetId,identityId:r.id,subjectId:r.subjectId,loginName:r.loginName,credentialVersion,fromVerifierSha256,toVerifierSha256})]);
   }
   await c.query(r.patient?'DELETE FROM adc_auth.session WHERE identity_id=$1':'DELETE FROM adc_auth.session WHERE account_id=$1',[r.id]);
  }
  await c.query('SET CONSTRAINTS ALL IMMEDIATE');
  await c.query('ALTER TABLE adc.staff_account ENABLE TRIGGER staff_identity_fixed');
  const actor=(await c.query("SELECT actor_id FROM adc.business_operation WHERE operation_id=$1 AND action_code='course.demo.initialize'",[datasetId])).rows[0].actor_id;
  await c.query("INSERT INTO adc.business_operation(operation_id,actor_id,occurred_at,action_code,subject_kind,subject_key,after_content,reason) VALUES($1,$2,clock_timestamp(),'course.demo.passwords','course_environment',$3,$4,'用户明确要求简化20个预分配演示账号；不改自注册患者、授权或业务数据')",[input.maintenanceId,actor,datasetId,JSON.stringify({schemaVersion:1,syntheticOnly:true,datasetId,maintenanceId:input.maintenanceId,accounts:receipts})]);
  await c.query('COMMIT');return{changed:20,patients:2,staff:18,selfRegisteredUnchanged:true};
 }catch(e){if(c)await c.query('ROLLBACK').catch(()=>{});throw e;}finally{c?.release();}
}
async function main(){if(process.argv.slice(2).join(' ')!=='--apply')throw Error('需要显式维护参数。');const password=(await readFile('/run/secrets/db_owner_password','utf8')).trim(),input=JSON.parse(await readFile('/run/secrets/password_request','utf8'));const pool=new pg.Pool({host:'postgres',port:5432,user:'postgres',database:'adc_course_demo',password});try{const gate=new CourseDemoGate(pool);console.log(JSON.stringify(await simplifyDemoPasswords(pool,gate,input)));}finally{await pool.end();}}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(()=>{console.error('演示口令维护未完成；事务失败会整体回滚，请检查私有输入及课程环境。');process.exitCode=1;});
