import pg from 'pg';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { root, pgOptions } from './config.mjs';

export function localRuntime(env) {
  if (env.PGHOST !== '127.0.0.1' || env.API_HOST !== '127.0.0.1' || env.ADMIN_ORIGIN !== 'http://127.0.0.1:5173')
    throw Error('本地启动只支持127.0.0.1及现有工作台来源；不会代为启动外部环境。');
  if (!/^[a-z][a-z0-9_]*$/.test(env.PGDATABASE || '') || !env.PGUSER || !env.PGPASSWORD)
    throw Error('本机数据库配置不完整；请检查 .env（不要发送或提交口令）。');
  const port = Number(env.API_PORT);
  if (port !== 3100 || !Number.isInteger(Number(env.PGPORT)) || Number(env.PGPORT) < 1 || Number(env.PGPORT) > 65535)
    throw Error('当前工作台使用API3100，请核对本机端口配置。');
  return { apiPort: port, webPort: 5173 };
}
export async function portsAvailable(ports) {
  for (const port of ports) await new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', () => reject(Error(`端口${port}已占用。已有本项目时请直接打开工作台；不要重复启动，也不会停止其他进程。`)));
    server.listen({host:'127.0.0.1', port, exclusive:true}, () => server.close(resolve));
  });
}
export async function expectedMigrations(directory = join(root, 'database/migrations')) {
  return Promise.all((await readdir(directory)).filter(n => /^\d+.*\.sql$/.test(n)).sort().map(async name => ({
    name, sha256: createHash('sha256').update(await readFile(join(directory, name))).digest('hex')
  })));
}
export function compareMigrations(actual, expected) {
  const rows = new Map(actual.map(r => [r.name, r.sha256]));
  for (const m of expected) {
    if (!rows.has(m.name)) throw Error(`缺少迁移${m.name}；请先停止开发服务，再明确运行 npm run db:migrate。启动不会自动迁移。`);
    if (rows.get(m.name) !== m.sha256) throw Error(`已应用迁移摘要不符：${m.name}。请恢复原迁移文件，不能覆盖数据库历史。`);
  }
  if (rows.size !== expected.length) throw Error('数据库包含当前代码未知的迁移；请使用匹配版本，不会自动降级。');
}
export async function verifyReady(env, { migrationDirectory } = {}) {
  const client = new pg.Client(pgOptions(env));
  await client.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const has = (await client.query("SELECT to_regclass('adc_meta.migration') AS migrations, to_regclass('adc.clinic') AS clinics, to_regclass('adc.staff_account') AS accounts")).rows[0];
    if (!has.migrations || !has.clinics || !has.accounts) throw Error('此数据库尚未准备好；首次使用请运行 npm run db:init，已有库请核对配置。');
    const migrations = (await client.query('SELECT name,sha256 FROM adc_meta.migration ORDER BY name')).rows;
    compareMigrations(migrations, await expectedMigrations(migrationDirectory));
    const counts = (await client.query('SELECT (SELECT count(*)::int FROM adc.clinic) clinics,(SELECT count(*)::int FROM adc.staff_account) accounts')).rows[0];
    if (!counts.clinics || !counts.accounts) throw Error('数据库缺少诊所或员工基础资料；启动不会补写示例数据，请核对初始化记录。');
    await client.query('COMMIT');
    return { migrations: migrations.length, clinics: counts.clinics, accounts: counts.accounts };
  } catch(error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
  finally { await client.end(); }
}
export async function prepareDevelopment(env, { checkPorts = true, startDatabase, ready = verifyReady } = {}) {
  const ports = localRuntime(env);
  if (checkPorts) await portsAvailable([ports.apiPort, ports.webPort]);
  if (startDatabase) await startDatabase({ initialize:false, env });
  return ready(env);
}
