import {readFile,readdir,mkdir,writeFile,unlink} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import pg from 'pg';
import {isIPv4} from 'node:net';

// IP access is opt-in through the dedicated synthetic course environment only.
export function deploymentHost(env){
 const host=env.PUBLIC_HOST;
 const course=env.ADC_COURSE_DEMO_ENABLED==='true'&&env.ADC_DEPLOYMENT_PURPOSE==='teacher-demo';
 if(course&&typeof host==='string'&&isIPv4(host)){
  const [a,b,c]=host.split('.').map(Number);
  const excluded=a===0||a===10||a===127||a>=224||a===100&&b>=64&&b<=127||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&(b===168||b===0||b===2||b===88&&c===99)||a===198&&(b===18||b===19||b===51&&c===100)||a===203&&b===0&&c===113;
  if(!excluded)return host;
 }
 if(typeof host!=='string'||host!==host.trim()||!host.match(/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/)||host==='example.com'||host.endsWith('.example.com'))throw Error('请配置实际域名；专用课程演示也可配置规范公网IPv4。');
 return host;
}

export async function deployConfig(env,mode='runtime',read=readFile){
 if(env.NODE_ENV!=='production'||env.ADC_LOCAL_IDENTITY_ENABLED!=='false'||env.ADC_MINIPROGRAM_LOCAL_ENABLED!=='false')throw Error('部署必须使用production并关闭本机身份入口。');
 const host=deploymentHost(env);
 if(env.ADMIN_ORIGIN!=='https://'+host)throw Error('ADMIN_ORIGIN必须等于实际HTTPS地址。');
 if(mode==='runtime'&&env.ADC_TRUSTED_PROXY_IP!=='172.30.44.2')throw Error('部署必须明确仅信任本编排的网页代理172.30.44.2。');
 const course=env.ADC_COURSE_DEMO_ENABLED==='true',database=course?'adc_course_demo':'adc_server';
 if(env.ADC_COURSE_REGISTRATION_ENABLED!==undefined&&!['true','false'].includes(env.ADC_COURSE_REGISTRATION_ENABLED)||env.ADC_COURSE_REGISTRATION_ENABLED==='true'&&!course)throw Error('患者演示注册仅支持明确的专用课程环境。');
 if(course&&env.ADC_DEPLOYMENT_PURPOSE!=='teacher-demo'||!course&&env.ADC_DEPLOYMENT_PURPOSE==='teacher-demo'||env.ADC_COURSE_DEMO_ENABLED!==undefined&&!['false','true'].includes(env.ADC_COURSE_DEMO_ENABLED))throw Error('课程演示用途和开关不符。');
 if(course&&mode==='runtime'&&env.ADC_COURSE_DEMO_MANIFEST_FILE!=='/run/secrets/course_demo_manifest')throw Error('课程演示须挂载专用环境清单。');
 if(env.PGHOST!=='postgres'||env.PGPORT!=='5432'||env.PGDATABASE!==database)throw Error('部署只允许内部专用数据库，拒绝本机开发库。');
 const user=mode==='migration'?'postgres':'adc_runtime';
 if(env.PGUSER!==user)throw Error('数据库岗位配置不符。');
 if(env.PGPASSWORD)throw Error('部署口令请使用独立secret文件，不接受PGPASSWORD。');
 const expected=mode==='migration'?'/run/secrets/db_owner_password':'/run/secrets/db_runtime_password';
 if(env.PGPASSWORD_FILE!==expected)throw Error('数据库secret文件路径不符。');
 let password;try{password=(await read(expected,'utf8')).trim();}catch{throw Error('无法读取数据库secret文件。');}
 if(!/^[A-Za-z0-9_-]{32,200}$/.test(password))throw Error('数据库口令须为32—200位独立随机字母数字、横线或下划线。');
 return {host:'postgres',port:5432,user,password,database,connectionTimeoutMillis:5000};
}
export async function checkSchema(client){
 const files=(await readdir(new URL('../database/migrations/',import.meta.url))).filter(n=>/^\d+.*\.sql$/.test(n)).sort();
 const rows=(await client.query('SELECT name,sha256 FROM adc_meta.migration ORDER BY name')).rows;
 if(rows.length!==files.length)throw Error('服务器迁移数量不符，请先执行显式迁移。');
 for(let i=0;i<files.length;i++)if(rows[i].name!==files[i]||rows[i].sha256!==createHash('sha256').update(await readFile(new URL('../database/migrations/'+files[i],import.meta.url))).digest('hex'))throw Error('服务器迁移摘要不符。');
 return files.length;
}
export async function deploymentReady(options,fileRoot){
 const c=new pg.Client(options);await c.connect();
 try{await c.query('BEGIN READ ONLY');const migrations=await checkSchema(c);const role=(await c.query('SELECT rolsuper,rolcreatedb,rolcreaterole,rolcanlogin,rolreplication,rolbypassrls FROM pg_roles WHERE rolname=current_user')).rows[0];
  if(!role?.rolcanlogin||role.rolsuper||role.rolcreatedb||role.rolcreaterole||role.rolreplication||role.rolbypassrls||(await c.query('SELECT 1 FROM pg_auth_members WHERE member=(SELECT oid FROM pg_roles WHERE rolname=current_user) LIMIT 1')).rows.length)throw Error('运行账号不能具有额外角色、高权限或不可登录状态。');
  const missingSchema=(await c.query("SELECT 1 FROM unnest(ARRAY['adc','adc_auth']) s(name) WHERE NOT has_schema_privilege(current_user,s.name,'USAGE') LIMIT 1")).rows.length;
  const missingTable=(await c.query("SELECT 1 FROM pg_class t JOIN pg_namespace n ON n.oid=t.relnamespace CROSS JOIN (VALUES('SELECT'),('INSERT'),('UPDATE'),('DELETE')) p(privilege) WHERE n.nspname IN ('adc','adc_auth') AND t.relkind IN ('r','p') AND NOT has_table_privilege(current_user,t.oid,p.privilege) LIMIT 1")).rows.length;
  if(missingSchema||missingTable)throw Error('运行账号的业务数据权限不完整，请核对显式迁移授权。');await c.query('COMMIT');
  await mkdir(fileRoot,{recursive:true});const probe=fileRoot+'/.startup-'+randomUUID();await writeFile(probe,'volume-check',{flag:'wx',mode:0o600});await unlink(probe);return migrations;
 }finally{await c.end();}
}
