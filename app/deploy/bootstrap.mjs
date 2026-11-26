import pg from 'pg';
import {readFile} from 'node:fs/promises';
import {randomUUID,randomBytes,scrypt as derive} from 'node:crypto';
import {promisify} from 'node:util';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {deployConfig,checkSchema} from './runtime.mjs';
const scrypt=promisify(derive);
function keys(v,expected){if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).sort().join()!==expected.sort().join())throw Error('初始化配置字段不符。');}
function text(v,max){if(typeof v!=='string'||!v.trim()||v!==v.trim()||v.length>max||/[\x00-\x1f\x7f]/.test(v)||v.startsWith('请填写'))throw Error('初始化文字字段无效。');return v;}
export function bootstrapInput(v,password){
 keys(v,['schemaVersion','clinic','administrator']);keys(v.clinic,['name','address']);keys(v.administrator,['name','loginName']);
 if(v.schemaVersion!==1)throw Error('初始化版本无效。');
 const loginName=text(v.administrator.loginName,100);
 if(!/^[a-z][a-z0-9._-]{2,99}$/.test(loginName)||['admin.local','admin.backup','postgres','adc_runtime'].includes(loginName))throw Error('请指定独立正式业务登录名。');
 if(typeof password!=='string'||!/^[A-Za-z0-9_-]{32,200}$/.test(password))throw Error('管理员口令须为32—200位独立随机字符。');
 return {schemaVersion:1,clinic:{name:text(v.clinic.name,150),address:text(v.clinic.address,1000)},administrator:{name:text(v.administrator.name,100),loginName}};
}
// CLI supplies validated server options. Tests supply only a newly created isolated database client.
export async function bootstrapDatabase(c,input,password,{apply=false,afterWrite}={}){
 const b=bootstrapInput(input,password);await c.query('BEGIN');
 try{
  await c.query("SET LOCAL lock_timeout='5s'");await c.query("SELECT pg_advisory_xact_lock(hashtextextended('security-management',0))");
  await checkSchema(c);
  // tech_probe.migration is fixed metadata inserted by migration 001, not a business record.
  const tables=(await c.query("SELECT schemaname,tablename FROM pg_tables WHERE schemaname IN ('adc','adc_auth','tech_probe') AND NOT(schemaname='tech_probe' AND tablename='migration') ORDER BY schemaname,tablename")).rows;
  // Hold all application tables through commit so a competing initializer or API cannot race the emptiness check.
  for(const t of tables)await c.query('LOCK TABLE '+c.escapeIdentifier(t.schemaname)+'.'+c.escapeIdentifier(t.tablename)+' IN ACCESS EXCLUSIVE MODE');
  for(const t of tables)if((await c.query('SELECT 1 FROM '+c.escapeIdentifier(t.schemaname)+'.'+c.escapeIdentifier(t.tablename)+' LIMIT 1')).rows.length)throw Error('仅允许完整空业务库首次初始化；已有资料不重置。');
  if(!apply){await c.query('ROLLBACK');return {ready:true,applied:false};}
  const employee=randomUUID(),clinic=randomUUID(),account=randomUUID(),role=randomUUID(),rv=randomUUID(),grant=randomUUID(),op=randomUUID();
  const now=(await c.query('SELECT clock_timestamp() AS now')).rows[0].now;
  async function put(table,data){const cols=Object.keys(data);await c.query('INSERT INTO adc.'+table+'('+cols.join(',')+') VALUES('+cols.map((_,i)=>'$'+(i+1)).join(',')+')',Object.values(data));}
  const functions=['security.read','security.manage'],fields=['status','grant'].map(field=>({resource:'security',field,action:'maintain'}));
  const policy={schemaVersion:1,kind:'bounded-account-management',targets:[{accountId:account,employeeId:employee,clinicIds:[clinic],functions,fields,grantEditable:false}]};
  const e={employee_id:employee,name:b.administrator.name,public_enabled:false,row_version:1};await put('employee',e);
  const cl={clinic_id:clinic,name:b.clinic.name,address:b.clinic.address,created_by:employee,created_at:now,updated_by:employee,updated_at:now,row_version:1};await put('clinic',cl);
  const salt=randomBytes(16).toString('hex'),hash=(await scrypt(password,salt,64)).toString('hex');
  await put('staff_account',{account_id:account,employee_id:employee,login_name:b.administrator.loginName,credential_verifier:`scrypt:${salt}:${hash}`,activation_arrangement:'enabled',opened_at:now,maintained_by:employee,maintained_at:now,row_version:1});
  await put('security_role',{role_id:role,name:'首次有界账号管理员',responsibility:'仅初始管理员自身账号管理，无患者、临床、交易访问；新增员工另经明确开户配置',row_version:1});
  await put('role_version',{role_version_id:rv,role_id:role,version_no:1,name:'首次有界账号管理员',configured_by:employee,configured_at:now});
  for(const f of functions)await put('role_function',{role_version_id:rv,function_code:f});
  await put('access_grant',{grant_id:grant,account_id:account,version_no:1,effective_from:now,object_scope:JSON.stringify(policy),configured_by:employee,configured_at:now});
  await put('grant_role',{grant_id:grant,role_version_id:rv});await put('grant_clinic',{grant_id:grant,clinic_id:clinic});
  for(const f of fields)await put('grant_field',{grant_field_id:randomUUID(),grant_id:grant,resource_code:f.resource,field_code:f.field,action_code:f.action});
  await put('business_operation',{operation_id:op,actor_id:employee,occurred_at:now,action_code:'security.bootstrap',subject_kind:'staff_account',subject_key:account,after_content:JSON.stringify({schemaVersion:1,grant:{id:grant},policy,accountId:account,source:'explicit-empty-server-bootstrap'}),reason:'空业务库首次显式初始化；未创建其他账号或业务数据'});
  await put('operation_clinic',{operation_id:op,clinic_id:clinic});
  const {row_version:ev,...emp}=e;await put('employee_revision',{employee_revision_id:randomUUID(),...emp,version_no:ev,operation_id:op});
  const {row_version:cv,...clin}=cl;await put('clinic_revision',{clinic_revision_id:randomUUID(),...clin,version_no:cv,operation_id:op});
  if(afterWrite)await afterWrite();await c.query('COMMIT');return {ready:true,applied:true,accountId:account,clinicId:clinic};
 }catch(e){await c.query('ROLLBACK');throw e;}
}
async function main(){
 const mode=process.argv.slice(2).join(' ');if(!['--check','--apply'].includes(mode))throw Error('必须明确选择--check或--apply。');
 const options=await deployConfig(process.env,'migration');
 const password=(await readFile('/run/secrets/bootstrap_admin_password','utf8')).trim();
 const runtime=(await readFile('/run/secrets/db_runtime_password','utf8')).trim();
 if(password===options.password||password===runtime)throw Error('业务管理员与两个数据库口令须各自独立。');
 const raw=await readFile('/run/secrets/bootstrap_manifest','utf8');if(Buffer.byteLength(raw)>8192)throw Error('配置过大。');
 const input=bootstrapInput(JSON.parse(raw),password),c=new pg.Client(options);await c.connect();
 try{await bootstrapDatabase(c,input,password,{apply:mode==='--apply'});console.log(mode==='--apply'?'首次初始化完成；请使用私有配置中的账号登录。':'空库初始化检查通过；未写入资料。');}finally{await c.end();}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(()=>{console.error('首次初始化未完成：请核对私有配置、独立口令、迁移及空库条件；未重置已有资料。');process.exitCode=1;});
