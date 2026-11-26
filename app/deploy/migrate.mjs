import pg from 'pg';
import {readFile} from 'node:fs/promises';
import {deployConfig,checkSchema} from './runtime.mjs';
import {migrate} from '../scripts/migrate.mjs';
export async function provisionRuntime(c,password){
 if(!/^[A-Za-z0-9_-]{32,200}$/.test(password))throw Error('运行口令格式不符。');
 const prior=(await c.query("SELECT rolsuper,rolcreatedb,rolcreaterole,rolcanlogin,rolreplication,rolbypassrls FROM pg_roles WHERE rolname='adc_runtime'")).rows[0];
 if(prior&&(prior.rolsuper||prior.rolcreatedb||prior.rolcreaterole||prior.rolreplication||prior.rolbypassrls||!prior.rolcanlogin))throw Error('既有运行角色状态不符，未修改。');
 if(prior&&(await c.query("SELECT 1 FROM pg_auth_members WHERE member=(SELECT oid FROM pg_roles WHERE rolname='adc_runtime')")).rows.length)throw Error('运行角色不能继承其他数据库角色。');
 if(!prior)await c.query('CREATE ROLE adc_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '+c.escapeLiteral(password));
 // Existing passwords are never reset by migration. Runtime preflight verifies access.
 await c.query('GRANT CONNECT ON DATABASE '+c.escapeIdentifier(c.database)+' TO adc_runtime');
 for(const schema of ['adc','adc_auth','adc_meta']){
  await c.query('GRANT USAGE ON SCHEMA '+schema+' TO adc_runtime');
  if(schema==='adc_meta')await c.query('GRANT SELECT ON ALL TABLES IN SCHEMA adc_meta TO adc_runtime');
  else{await c.query('GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA '+schema+' TO adc_runtime');await c.query('GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA '+schema+' TO adc_runtime');}
 }
}
async function main(){
 if(process.argv.slice(2).join(' ')!=='--apply')throw Error('迁移必须明确使用--apply，不随API重启执行。');
 const opts=await deployConfig(process.env,'migration');const runtime=(await readFile('/run/secrets/db_runtime_password','utf8')).trim();
 if(!/^[A-Za-z0-9_-]{32,200}$/.test(runtime)||runtime===opts.password)throw Error('数据库管理员和运行口令必须独立。');
 await migrate({PGHOST:opts.host,PGPORT:String(opts.port),PGUSER:opts.user,PGPASSWORD:opts.password,PGDATABASE:opts.database});
 const c=new pg.Client(opts);await c.connect();try{await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(301001)');await checkSchema(c);await provisionRuntime(c,runtime);await c.query('COMMIT');}catch(e){await c.query('ROLLBACK');throw e;}finally{await c.end();}
 console.log('版本迁移和非超级用户运行角色配置完成；未创建业务管理员或合成演示数据。');
}
if(process.argv[1]?.endsWith('/deploy/migrate.mjs')||process.argv[1]?.endsWith('\\deploy\\migrate.mjs'))main().catch(()=>{console.error('显式部署迁移失败：请检查独立secret、目标库和迁移版本；已有资料未重置。');process.exitCode=1;});
