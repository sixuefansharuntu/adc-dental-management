import pg from 'pg';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, pgOptions, root } from './config.mjs';
import { startDatabase } from './database.mjs';
import { localRuntime, verifyReady } from './startup.mjs';

export const initializationSteps = ['migrate.mjs','seed.mjs','seed-booking.mts','seed-frontdesk.mts','seed-clinical.mts','seed-care.mts','seed-followup.mts','seed-inventory.mts','seed-sales.mts','seed-quarter.mts','seed-quality.mts'];
export function initializationTarget(env) {
  localRuntime(env);
  if (!/^(adc_dev|adc_initialization_test_\d+)$/.test(env.PGDATABASE)) throw Error('只允许本机具名开发库或本次初始化测试库。');
}
export async function assertEmptyDatabase(client) {
  const { n } = (await client.query("SELECT ((SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname !~ '^pg_toast' AND c.relkind IN ('r','p','v','m','S','f')) + (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname !~ '^pg_') + (SELECT count(*) FROM pg_namespace WHERE nspname NOT IN ('public','pg_catalog','information_schema') AND nspname !~ '^pg_'))::int n")).rows[0];
  if (n) throw Error('数据库已有资料或初始化已部分完成；拒绝重放示例、重设权限或覆盖历史。请使用 npm run dev，初始化失败则先核对日志。');
}
async function step(name, env) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [...(name.endsWith('.mts') ? ['--import','tsx'] : []), join('scripts', name)], {cwd:root, env:{...process.env,...env}, stdio:'inherit', windowsHide:true});
    child.once('error', () => reject(Error(`初始化步骤无法启动：${name}`)));
    child.once('exit', code => code === 0 ? resolve() : reject(Error(`初始化步骤失败：${name}；保留现场，不自动删除或重试。`)));
  });
}
export async function initializeLocal({ env, directory = root, start = true, runStep = step } = {}) {
  env ||= await config({initialize:true});
  initializationTarget(env);
  if (start) await startDatabase({initialize:true,env});
  const client = new pg.Client(pgOptions(env));
  await client.connect();
  let locked = false, journal, claimedJournal = false;
  try {
    locked = (await client.query('SELECT pg_try_advisory_lock(186001) locked')).rows[0].locked;
    if (!locked) throw Error('另一初始化正在进行；本次不会写入。');
    await assertEmptyDatabase(client);
    await mkdir(join(directory,'.runtime'), {recursive:true});
    journal = {database:env.PGDATABASE,host:env.PGHOST,port:Number(env.PGPORT),startedAt:new Date().toISOString(),status:'running',completed:[],step:null};
    const journalPath = join(directory,'.runtime','initialization.json');
    await writeFile(journalPath, JSON.stringify(journal,null,2), {flag:'wx'});
    claimedJournal = true;
    for (const name of initializationSteps) {
      journal.step = name;
      await writeFile(journalPath,JSON.stringify(journal,null,2));
      await runStep(name,env);
      journal.completed.push(name);
    }
    const ready = await verifyReady(env);
    journal.status = 'completed'; journal.completedAt = new Date().toISOString(); journal.step = null; journal.ready = ready;
    await writeFile(journalPath,JSON.stringify(journal,null,2));
    console.log('首次合成环境已初始化。之后使用 npm run dev；不会再自动写入合成排班或授权。');
    return journal;
  } catch(error) {
    if (claimedJournal) {
      journal.status = 'failed'; journal.failedAt = new Date().toISOString();
      // Only controlled step names go into the journal; raw driver errors may contain environment details.
      await writeFile(join(directory,'.runtime','initialization.json'),JSON.stringify(journal,null,2)).catch(() => {});
    }
    throw error;
  } finally {
    if (locked) await client.query('SELECT pg_advisory_unlock(186001)').catch(() => {});
    await client.end();
  }
}
if (process.argv[1] && resolve(fileURLToPath(import.meta.url)).toLowerCase() === resolve(process.argv[1]).toLowerCase()) {
  if (process.argv.slice(2).length !== 1 || process.argv[2] !== '--confirm-synthetic') {
    console.error('首次初始化会建立本机合成诊所、账号和示例排班；明确使用 npm run db:init。已有数据请运行 npm run dev。'); process.exitCode = 1;
  } else initializeLocal().catch(error => { console.error(error.message); process.exitCode = 1; });
}



