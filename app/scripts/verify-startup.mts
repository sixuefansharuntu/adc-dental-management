import pg from 'pg';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile,writeFile,readdir,mkdir,rm} from 'node:fs/promises';
import {join,resolve,sep} from 'node:path';
import {config,pgOptions,root} from './config.mjs';
import {initializeLocal} from './initialize.mjs';
import {verifyReady,prepareDevelopment,expectedMigrations} from './startup.mjs';
import {startDatabase} from './database.mjs';
import {databaseSnapshot,digest} from './snapshot-startup186.mjs';
const migrationCount=(await expectedMigrations()).length;
const env=await config(),stamp=Date.now(),dbNames=[0,1,2].map(n=>'adc_initialization_test_'+(stamp+n)),missing='adc_initialization_test_'+(stamp+3),directories=dbNames.map(n=>resolve(root,'.runtime',n));
for(const p of directories)if(!p.startsWith(resolve(root,'.runtime')+sep))throw Error('Unsafe test directory');
const admin=new pg.Client(pgOptions(env,'postgres'));await admin.connect();
const passed:string[]=[],check=async(n:string,f:()=>Promise<void>)=>{await f();passed.push(n);console.log('PASS',n);};
const runtimeNotes=async()=>{const result:any={};for(const n of(await readdir(join(root,'.runtime'))).filter(n=>n.endsWith('.txt')))result[n]=digest(await readFile(join(root,'.runtime',n)));return result;};
const privateBefore=await runtimeNotes(),envBefore=digest(await readFile(join(root,'.env'))),businessBefore=await databaseSnapshot(env);
const t={...env,PGDATABASE:dbNames[0],BOOKING_DEMO_DATE:new Date(Date.now()+86400000).toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'}),ADC_ISOLATED_SEED_REPORTS:'true'};
async function child(script:string,args:string[],e:any=env){return await new Promise<{code:number|null,text:string}>((res,rej)=>{const p=spawn(process.execPath,[script,...args],{cwd:root,env:{...process.env,...e},windowsHide:true,stdio:['ignore','pipe','pipe']});let text='';p.stdout.on('data',b=>text+=b);p.stderr.on('data',b=>text+=b);p.on('error',rej);p.on('exit',code=>res({code,text}));});}
try{
 for(const n of dbNames)await admin.query(`CREATE DATABASE "${n}"`);
 await check('现有开发库两次只读预检不改变任何用户表',async()=>{const a=await verifyReady(env),b=await verifyReady(env);assert.equal(a.migrations,migrationCount);assert.deepEqual(a,b);assert.deepEqual(await databaseSnapshot(env),businessBefore);});
 await check('对已有开发库明确初始化也被拒绝，不调用示例写入',async()=>{let called=false;await assert.rejects(initializeLocal({env,directory:directories[0],start:false,runStep:async()=>{called=true;}}),/已有资料/);assert.equal(called,false);assert.deepEqual(await databaseSnapshot(env),businessBefore);});
 await check('正常恢复不存在的数据库时拒绝创建',async()=>{await assert.rejects(startDatabase({env:{...env,PGDATABASE:missing}}),/不存在/);assert.equal((await admin.query('SELECT count(*)::int n FROM pg_database WHERE datname=$1',[missing])).rows[0].n,0);});
 await check('空隔离库明确初始化运行当前全部迁移及合成数据，凭据说明隔离',async()=>{process.env.ADC_ISOLATED_SEED_REPORTS='true';const journal=await initializeLocal({env:t,directory:directories[0],start:false});assert.equal(journal.status,'completed');assert.equal(journal.completed.length,11);assert.equal((await verifyReady(t)).migrations,migrationCount);assert.ok((await readdir(directories[0])).includes('预约演示账号.txt'));assert.deepEqual(await runtimeNotes(),privateBefore);});
 const fresh=await databaseSnapshot(t),journalBytes=await readFile(join(directories[0],'.runtime','initialization.json'));
 await check('已初始化库重启准备两次保持排班权限及所有表精确一致',async()=>{for(let i=0;i<2;i++)await prepareDevelopment(t,{checkPorts:false,startDatabase:async o=>{assert.equal(o.initialize,false);}});assert.deepEqual(await databaseSnapshot(t),fresh);});
 await check('重复初始化拒绝且不覆盖原完成日志',async()=>{await assert.rejects(initializeLocal({env:t,directory:directories[0],start:false}),/已有资料/);assert.deepEqual(await readFile(join(directories[0],'.runtime','initialization.json')),journalBytes);assert.deepEqual(await databaseSnapshot(t),fresh);});
 await check('只读检查CLI实际通过且不改已占用端口或数据库',async()=>{const r=await child('scripts/dev.mjs',['--check'],t);assert.equal(r.code,0,r.text);assert.match(r.text,/没有执行迁移/);assert.deepEqual(await databaseSnapshot(t),fresh);});
 const c=new pg.Client(pgOptions(t));await c.connect();
 try{
 const last=(await c.query('SELECT * FROM adc_meta.migration ORDER BY name DESC LIMIT 1')).rows[0];
 await check('真实库缺迁移时拒绝自动补齐',async()=>{await c.query('DELETE FROM adc_meta.migration WHERE name=$1',[last.name]);await assert.rejects(verifyReady(t),/缺少迁移/);assert.equal((await c.query('SELECT count(*)::int n FROM adc_meta.migration')).rows[0].n,migrationCount-1);await c.query('INSERT INTO adc_meta.migration(name,sha256,applied_at) VALUES($1,$2,$3)',[last.name,last.sha256,last.applied_at]);});
 await check('真实库已应用摘要漂移时拒绝启动',async()=>{await c.query('UPDATE adc_meta.migration SET sha256=$1 WHERE name=$2',['0'.repeat(64),last.name]);await assert.rejects(verifyReady(t),/摘要不符/);await c.query('UPDATE adc_meta.migration SET sha256=$1 WHERE name=$2',[last.sha256,last.name]);});
 await check('真实库未知后续迁移阻止自动降级',async()=>{await c.query("INSERT INTO adc_meta.migration(name,sha256) VALUES('999_unknown.sql',$1)",['0'.repeat(64)]);await assert.rejects(verifyReady(t),/未知/);await c.query("DELETE FROM adc_meta.migration WHERE name='999_unknown.sql'");});
 }finally{await c.end();}
 await check('并发初始化锁被占用则立即退出且空库无写入',async()=>{const e={...t,PGDATABASE:dbNames[1]},lock=new pg.Client(pgOptions(e));await lock.connect();try{await lock.query('SELECT pg_advisory_lock(186001)');await assert.rejects(initializeLocal({env:e,directory:directories[1],start:false}),/另一初始化/);assert.deepEqual(await databaseSnapshot(e),{});}finally{await lock.end();}});
 await check('只有自定义函数或schema的库也不冒充空库',async()=>{const e={...t,PGDATABASE:dbNames[1]},c=new pg.Client(pgOptions(e));await c.connect();try{await c.query('CREATE FUNCTION public.fixture_marker() RETURNS integer LANGUAGE sql AS $$SELECT 1$$');await assert.rejects(initializeLocal({env:e,directory:directories[1],start:false}),/已有资料/);await c.query('DROP FUNCTION public.fixture_marker()');await c.query('CREATE SCHEMA fixture_marker');await assert.rejects(initializeLocal({env:e,directory:directories[1],start:false}),/已有资料/);await c.query('DROP SCHEMA fixture_marker');}finally{await c.end();}});
 await check('初始化故障保留步骤及已有迁移，不自动清库或重试',async()=>{const e={...t,PGDATABASE:dbNames[2]};await assert.rejects(initializeLocal({env:e,directory:directories[2],start:false,runStep:async(name,values)=>{if(name==='migrate.mjs'){const r=await child('scripts/migrate.mjs',[],values);assert.equal(r.code,0,r.text);}else throw Error('controlled failure');}}),/controlled failure/);const j=JSON.parse(await readFile(join(directories[2],'.runtime','initialization.json'),'utf8'));assert.equal(j.status,'failed');assert.equal(j.step,'seed.mjs');assert.deepEqual(j.completed,['migrate.mjs']);assert.ok(!JSON.stringify(j).includes(env.PGPASSWORD));const existing=await databaseSnapshot(e);assert.ok(Object.keys(existing).length>116);await assert.rejects(initializeLocal({env:e,directory:directories[2],start:false}),/已有资料/);assert.deepEqual(await databaseSnapshot(e),existing);});
 await check('旧db:seed无明确初始化参数时直接拒绝且开发资料完整保持',async()=>{const r=await child('scripts/initialize.mjs',[]);assert.equal(r.code,1);assert.match(r.text,/明确使用/);assert.deepEqual(await databaseSnapshot(env),businessBefore);assert.equal(digest(await readFile(join(root,'.env'))),envBefore);assert.deepEqual(await runtimeNotes(),privateBefore);});
 await writeFile(join(root,'artifacts/startup-check.json'),JSON.stringify({checks:passed.length,passed,developmentTablesUnchanged:true,privateNotesUnchanged:true,credentialsUnchanged:true,isolatedDatabases:dbNames.length,checkedAt:new Date().toISOString()},null,2));
 console.log(`Startup verified: ${passed.length} checks; no development data or credential changes.`);
}finally{
 delete process.env.ADC_ISOLATED_SEED_REPORTS;
 for(const n of dbNames){await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()',[n]);await admin.query(`DROP DATABASE IF EXISTS "${n}"`);}
 await admin.end();
 for(const p of directories)await rm(p,{recursive:true,force:true});
}


