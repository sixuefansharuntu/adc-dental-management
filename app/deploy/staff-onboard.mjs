import pg from 'pg';import {readFile}from'node:fs/promises';import{randomUUID,randomBytes,scrypt as derive,timingSafeEqual}from'node:crypto';import{promisify}from'node:util';import{resolve}from'node:path';import{fileURLToPath}from'node:url';
import{deployConfig,checkSchema}from'./runtime.mjs';import{staffProfiles}from'./staff-profiles.mjs';
const scrypt=promisify(derive),uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
function keys(v,k){if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).sort().join()!==k.sort().join())throw Error('开户配置字段不符。');}
function text(v,max){if(typeof v!=='string'||!v.trim()||v!==v.trim()||v.length>max||/[\x00-\x1f\x7f]/.test(v)||v.startsWith('请填写'))throw Error('开户文字字段无效。');return v;}
function id(v){if(typeof v!=='string'||!uuid.test(v))throw Error('开户标识无效。');return v;}
function date(v){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw Error('任职日期无效。');return v;}
const distinct=v=>new Set(v).size===v.length;
export function onboardInput(v,passwords){
 keys(v,['schemaVersion','catalogVersion','requestId','administratorAccountId','administratorGrantId','reason','employees']);
 if(v.schemaVersion!==1||v.catalogVersion!==1||!Array.isArray(v.employees)||!v.employees.length||v.employees.length>20)throw Error('开户版本或批量数量无效。');
 const employees=v.employees.map(e=>{keys(e,['name','loginName','profile','clinicIds','from','to']);const loginName=text(e.loginName,100);
  if(!/^[a-z][a-z0-9._-]{2,99}$/.test(loginName)||['admin.local','admin.backup','postgres','adc_runtime'].includes(loginName))throw Error('员工登录名无效。');
  if(!Object.hasOwn(staffProfiles,e.profile))throw Error('未定义的岗位配置。');
  if(!Array.isArray(e.clinicIds)||!e.clinicIds.length||e.clinicIds.length>20||!distinct(e.clinicIds))throw Error('员工诊所范围无效。');
  const from=date(e.from),to=e.to===null?null:date(e.to);if(to&&to<from)throw Error('任职结束早于开始。');
  return {name:text(e.name,100),loginName,profile:e.profile,clinicIds:e.clinicIds.map(id).sort(),from,to};
 });
 if(!distinct(employees.map(e=>e.loginName)))throw Error('同批登录名重复。');
 keys(passwords,employees.map(e=>e.loginName));const secrets=employees.map(e=>passwords[e.loginName]);
 if(secrets.some(p=>typeof p!=='string'||!/^[A-Za-z0-9_-]{32,200}$/.test(p))||!distinct(secrets))throw Error('员工口令须独立且为32—200位随机字符。');
 return {schemaVersion:1,catalogVersion:1,requestId:id(v.requestId),administratorAccountId:id(v.administratorAccountId),administratorGrantId:id(v.administratorGrantId),reason:text(v.reason,1000),employees};
}
function boundedPolicy(raw){
 const p=JSON.parse(raw);keys(p,['schemaVersion','kind','targets']);if(p.schemaVersion!==1||p.kind!=='bounded-account-management'||!Array.isArray(p.targets)||!p.targets.length||p.targets.length>100)throw Error('原管理范围无效。');
 for(const t of p.targets){keys(t,['accountId','employeeId','clinicIds','functions','fields','grantEditable']);id(t.accountId);id(t.employeeId);if(typeof t.grantEditable!=='boolean'||!Array.isArray(t.clinicIds)||t.clinicIds.length>20||!distinct(t.clinicIds)||!Array.isArray(t.functions)||t.functions.length>150||!distinct(t.functions)||!Array.isArray(t.fields)||t.fields.length>200)throw Error('原管理目标无效。');t.clinicIds.forEach(id);const code=x=>typeof x==='string'&&/^[a-z][a-z0-9_.]{0,99}$/.test(x);if(t.functions.some(x=>!code(x)))throw Error('原功能无效。');for(const f of t.fields){keys(f,['resource','field','action']);if(!code(f.resource)||!code(f.field)||f.action!=='maintain')throw Error('原字段无效。');}if(!distinct(t.fields.map(f=>f.resource+':'+f.field)))throw Error('原字段重复。');}
 if(!distinct(p.targets.map(t=>t.accountId)))throw Error('原管理目标重复。');return p;
}
async function matches(password,stored){const[k,s,h]=stored.split(':');if(k!=='scrypt'||!/^[a-f0-9]{128}$/.test(h||''))throw Error('原管理员凭据格式无效。');return timingSafeEqual(await scrypt(password,s,64),Buffer.from(h,'hex'));}
export async function inspectStaffSetup(c){
 await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');try{await checkSchema(c);
  const accounts=(await c.query("SELECT a.account_id AS \"accountId\",a.login_name AS \"loginName\",g.grant_id AS \"grantId\",g.object_scope AS policy FROM adc.staff_account a JOIN LATERAL(SELECT * FROM adc.access_grant WHERE account_id=a.account_id AND effective_from<=clock_timestamp() ORDER BY effective_from DESC,version_no DESC LIMIT 1)g ON true WHERE a.activation_arrangement='enabled' AND a.disabled_at IS NULL AND (g.effective_to IS NULL OR g.effective_to>clock_timestamp()) AND EXISTS(SELECT 1 FROM adc.grant_role r JOIN adc.role_function f USING(role_version_id) WHERE r.grant_id=g.grant_id AND f.function_code='security.manage') ORDER BY a.account_id LIMIT 101")).rows;
  const clinics=(await c.query('SELECT clinic_id AS id,name FROM adc.clinic ORDER BY clinic_id LIMIT 1001')).rows;if(accounts.length>100||clinics.length>1000)throw Error('配置目录超出完整核对范围。');
  const administrators=accounts.map(({policy,...a})=>({...a,targetCount:boundedPolicy(policy).targets.length}));await c.query('COMMIT');return {administrators,clinics,catalogVersion:1,profiles:Object.entries(staffProfiles).map(([code,p])=>({code,...p}))};
 }catch(e){await c.query('ROLLBACK');throw e;}
}
export async function onboardDatabase(c,input,passwords,{apply=false,afterWrite}={}){
 const b=onboardInput(input,passwords);await c.query('BEGIN');
 try{
  await c.query("SET LOCAL lock_timeout='5s'");await c.query("SELECT pg_advisory_xact_lock(hashtextextended('security-management',0))");await checkSchema(c);
  const a=(await c.query("SELECT * FROM adc.staff_account WHERE account_id=$1 AND activation_arrangement='enabled' AND disabled_at IS NULL FOR UPDATE",[b.administratorAccountId])).rows[0];if(!a||a.account_scope!==null)throw Error('指定管理员不可用或存在特殊账号范围。');
  const g=(await c.query('SELECT * FROM adc.access_grant WHERE account_id=$1 AND effective_from<=clock_timestamp() ORDER BY effective_from DESC,version_no DESC LIMIT 1',[a.account_id])).rows[0];
  if(!g||g.grant_id!==b.administratorGrantId||g.effective_to&&+g.effective_to<=Date.now()||(await c.query('SELECT 1 FROM adc.access_grant WHERE account_id=$1 AND effective_from>clock_timestamp()',[a.account_id])).rows.length)throw Error('管理员授权版本已变化或存在未来授权。');
  const functions=(await c.query('SELECT DISTINCT function_code FROM adc.grant_role JOIN adc.role_function USING(role_version_id) WHERE grant_id=$1',[g.grant_id])).rows.map(r=>r.function_code);
  const fields=(await c.query('SELECT resource_code,field_code,action_code FROM adc.grant_field WHERE grant_id=$1',[g.grant_id])).rows;
  if(!['security.read','security.manage'].every(f=>functions.includes(f))||!['status','grant'].every(f=>fields.some(x=>x.resource_code==='security'&&x.field_code===f&&x.action_code==='maintain')))throw Error('须指定有效有界账号管理员。');
  const scopes=(await c.query('SELECT clinic_id FROM adc.grant_clinic WHERE grant_id=$1',[g.grant_id])).rows.map(r=>r.clinic_id),policy=boundedPolicy(g.object_scope);
  if(policy.targets.length+b.employees.length>100||policy.targets.some(t=>t.clinicIds.some(x=>!scopes.includes(x)))||b.employees.some(e=>e.clinicIds.some(x=>!scopes.includes(x))))throw Error('开户超出管理员原诊所范围或目标数量上限。');
  for(const e of b.employees){if((await c.query('SELECT 1 FROM adc.staff_account WHERE login_name=$1',[e.loginName])).rows.length)throw Error('登录名已有账号，未修改。');if(await matches(passwords[e.loginName],a.credential_verifier))throw Error('员工不能复用管理员口令。');for(const clinic of e.clinicIds)if(!(await c.query('SELECT 1 FROM adc.clinic WHERE clinic_id=$1 FOR SHARE',[clinic])).rows.length)throw Error('目标诊所不存在。');}
  if((await c.query('SELECT 1 FROM adc.business_operation WHERE operation_id=$1',[b.requestId])).rows.length)throw Error('该开户批次已有记录，未重复执行。');
  if(!apply){await c.query('ROLLBACK');return {ready:true,applied:false,count:b.employees.length};}
  const now=(await c.query('SELECT clock_timestamp() now')).rows[0].now,newAccounts=[];
  async function put(t,data){const cols=Object.keys(data);await c.query('INSERT INTO adc.'+t+'('+cols.join(',')+') VALUES('+cols.map((_,i)=>'$'+(i+1)).join(',')+')',Object.values(data));}
  for(const e of b.employees){
   const employee=randomUUID(),account=randomUUID(),grant=randomUUID(),role=randomUUID(),rv=randomUUID(),op=randomUUID(),profile=staffProfiles[e.profile];
   const employment=JSON.stringify({assignments:e.clinicIds.map(clinicId=>({clinicId,role:e.profile==='clinic_manager'?'manager':e.profile,from:e.from,to:e.to}))});
   const data={employee_id:employee,name:e.name,employment_arrangement:employment,public_enabled:false,row_version:1};await put('employee',data);
   const salt=randomBytes(16).toString('hex'),hash=(await scrypt(passwords[e.loginName],salt,64)).toString('hex');
   await put('staff_account',{account_id:account,employee_id:employee,login_name:e.loginName,credential_verifier:`scrypt:${salt}:${hash}`,activation_arrangement:'enabled',opened_at:now,maintained_by:a.employee_id,maintained_at:now,row_version:1});
   await put('security_role',{role_id:role,name:profile.name+' · 开户目录v1',responsibility:'仅配置所列诊所及岗位权限，无账号管理权',row_version:1});await put('role_version',{role_version_id:rv,role_id:role,version_no:1,name:profile.name+' · 开户目录v1',configured_by:a.employee_id,configured_at:now});for(const f of profile.functions)await put('role_function',{role_version_id:rv,function_code:f});
   await put('access_grant',{grant_id:grant,account_id:account,version_no:1,effective_from:now,configured_by:a.employee_id,configured_at:now});await put('grant_role',{grant_id:grant,role_version_id:rv});for(const clinic of e.clinicIds)await put('grant_clinic',{grant_id:grant,clinic_id:clinic});for(const f of profile.fields)await put('grant_field',{grant_field_id:randomUUID(),grant_id:grant,resource_code:f.resource,field_code:f.field,action_code:f.action});
   const target={accountId:account,employeeId:employee,clinicIds:e.clinicIds,functions:[...profile.functions],fields:profile.fields.map(f=>({...f})),grantEditable:true};policy.targets.push(target);newAccounts.push({accountId:account,employeeId:employee,loginName:e.loginName,profile:e.profile});
   await put('business_operation',{operation_id:op,actor_id:a.employee_id,occurred_at:now,action_code:'security.bootstrap',subject_kind:'staff_account',subject_key:account,after_content:JSON.stringify({schemaVersion:1,source:'explicit-server-staff-onboard',batchId:b.requestId,grant:{id:grant},target,catalogVersion:1}),reason:b.reason});for(const clinic of e.clinicIds)await put('operation_clinic',{operation_id:op,clinic_id:clinic});
   const {row_version,...emp}=data;await put('employee_revision',{employee_revision_id:randomUUID(),...emp,version_no:row_version,operation_id:op});
   if(e.profile==='doctor')for(const clinic of e.clinicIds){const practice={practice_id:randomUUID(),employee_id:employee,clinic_id:clinic,valid_from:e.from,valid_to:e.to,practice_arrangement:'enabled',updated_by:a.employee_id,updated_at:now,row_version:1};await put('practice_assignment',practice);const{row_version:version_no,...p}=practice;await put('practice_revision',{practice_revision_id:randomUUID(),...p,version_no,operation_id:op});}
  }
  // Preserve all old administrator roles/fields/scopes and append only the new explicit target ceilings.
  const next=randomUUID(),version=Number(g.version_no)+1;await put('access_grant',{grant_id:next,account_id:a.account_id,version_no:version,effective_from:now,object_scope:JSON.stringify(policy),configured_by:a.employee_id,configured_at:now});
  await c.query('INSERT INTO adc.grant_role SELECT $1,role_version_id FROM adc.grant_role WHERE grant_id=$2',[next,g.grant_id]);for(const clinic of scopes)await put('grant_clinic',{grant_id:next,clinic_id:clinic});for(const f of fields)await put('grant_field',{grant_field_id:randomUUID(),grant_id:next,...f});
  await put('business_operation',{operation_id:b.requestId,actor_id:a.employee_id,occurred_at:now,action_code:'security.bootstrap',subject_kind:'staff_account',subject_key:a.account_id,before_content:JSON.stringify({grantId:g.grant_id,policy:boundedPolicy(g.object_scope)}),after_content:JSON.stringify({schemaVersion:1,source:'explicit-server-staff-policy',grant:{id:next},previousGrantId:g.grant_id,policy,newAccounts,catalogVersion:1}),reason:b.reason});for(const clinic of scopes)await put('operation_clinic',{operation_id:b.requestId,clinic_id:clinic});
  if(afterWrite)await afterWrite();await c.query('COMMIT');return {ready:true,applied:true,count:newAccounts.length,administratorGrantId:next,accounts:newAccounts};
 }catch(e){await c.query('ROLLBACK');throw e;}
}
async function main(){const mode=process.argv.slice(2).join(' ');if(!['--inspect','--check','--apply'].includes(mode))throw Error('须明确选择--inspect、--check或--apply。');const options=await deployConfig(process.env,'migration');
 if(mode==='--inspect'){const c=new pg.Client(options);await c.connect();try{console.log(JSON.stringify(await inspectStaffSetup(c),null,2));}finally{await c.end();}return;}
 const raw=await readFile('/run/secrets/staff_manifest','utf8'),secrets=await readFile('/run/secrets/staff_passwords','utf8');if(Buffer.byteLength(raw)>65536||Buffer.byteLength(secrets)>16384)throw Error('配置过大。');const input=JSON.parse(raw),passwords=JSON.parse(secrets),runtime=(await readFile('/run/secrets/db_runtime_password','utf8')).trim();onboardInput(input,passwords);if(Object.values(passwords).some(p=>p===options.password||p===runtime))throw Error('不得复用数据库口令。');const c=new pg.Client(options);await c.connect();try{const result=await onboardDatabase(c,input,passwords,{apply:mode==='--apply'});console.log(result.applied?'员工开户完成，原账号和口令未重置。':'员工开户预检通过，未写业务资料。');}finally{await c.end();}}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(()=>{console.error('员工开户未完成：请核对私有配置、管理员当前版本及诊所范围；未重置已有资料。');process.exitCode=1;});
