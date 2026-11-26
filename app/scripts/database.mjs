import pg from 'pg';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { config, pgOptions, root } from './config.mjs';
import {startExistingCluster,stopExistingCluster,localPort,startupMessage} from './postgres-process.mjs';
import{waitForDatabase}from'./database-ready.mjs';

export async function startDatabase({ initialize = false, env: suppliedEnv } = {}) {
  const env = suppliedEnv || await config();
  if (env.PGHOST !== '127.0.0.1') throw new Error('项目内启动器只管理127.0.0.1数据库；外部数据库请单独启动。');
  localPort(env.PGPORT);
  const databaseDir = join(root, '.runtime', 'postgres');
  let cluster;
  const check = new pg.Client(pgOptions(env, 'postgres'));
  let running = false;
  try { await check.connect(); await check.query('select 1'); running = true; } catch {} finally { await check.end().catch(() => {}); }
  if (!running) {
    if (!initialize && !existsSync(join(databaseDir, 'PG_VERSION'))) throw new Error('本机数据库尚未初始化；请先运行 npm run db:init。');
    if (!existsSync(join(databaseDir, 'PG_VERSION'))) {
      if (!initialize) throw new Error('本机数据库尚未初始化；请先运行 npm run db:init。');
      const {default:EmbeddedPostgres}=await import('embedded-postgres');
      const initial=new EmbeddedPostgres({databaseDir,user:env.PGUSER,password:env.PGPASSWORD,port:Number(env.PGPORT),persistent:true,createPostgresUser:false,initdbFlags:['--encoding=UTF8','--locale=C'],onLog:()=>{},onError:()=>{}});
      await initial.initialise();
    }
    cluster=await startExistingCluster(databaseDir,env.PGPORT);
  }
  // Readiness requires an authenticated query, not merely a PID or open socket.
  if(!running)await waitForDatabase(async timeout=>{const probe=new pg.Client({...pgOptions(env,'postgres'),connectionTimeoutMillis:timeout,query_timeout:timeout});try{await probe.connect();await probe.query('SELECT 1');}finally{await probe.end().catch(()=>{});}}).catch(e=>{if(e?.code?.startsWith('28'))throw Error('数据库进程未通过原配置的连接核对；请检查端口及本机凭据，不会重置密码或初始化。');throw e;});
  const admin = new pg.Client(pgOptions(env, 'postgres'));
  try{await admin.connect();}catch{await admin.end().catch(()=>{});throw Error('数据库进程未通过原配置的连接核对；请检查端口及本机凭据，不会重置密码或初始化。');}
  try {
    const result = await admin.query('select 1 from pg_database where datname=$1', [env.PGDATABASE]);
    if (!result.rowCount) {
      if (!initialize) throw new Error('配置的开发数据库不存在；不会自动新建，请先核对 .env 或运行首次初始化。');
      if (!/^[a-z][a-z0-9_]*$/.test(env.PGDATABASE)) throw new Error('Invalid local database name');
      await admin.query(`create database "${env.PGDATABASE}"`);
    }
  } finally { await admin.end(); }
  console.log(`PostgreSQL ready at ${env.PGHOST}:${env.PGPORT}/${env.PGDATABASE}`);
  return cluster;
}
export async function stopDatabase() {
  const env = await config();
  const databaseDir = join(root, '.runtime', 'postgres');
  if (!existsSync(join(databaseDir,'postmaster.pid'))) { console.log('Project PostgreSQL is not running.'); return; }
  await stopExistingCluster(databaseDir);
  console.log('Project PostgreSQL stopped; data preserved.');
}
if (process.argv[1]?.endsWith('database.mjs')) {
  (process.argv[2] === 'stop' ? stopDatabase() : startDatabase()).catch(error => { console.error(startupMessage(error)); process.exitCode = 1; });
}


