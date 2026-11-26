import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import dotenv from 'dotenv';
import {AsyncLocalStorage} from 'node:async_hooks';
const seedContext=new AsyncLocalStorage();
export async function withCourseSeedConfig(env,work){
 if(!/^adc_course_seed_test_\d+$/.test(env.PGDATABASE||'')||!['127.0.0.1','postgres'].includes(env.PGHOST)||!/^\d+$/.test(String(env.PGPORT)))throw Error('课程初始化仅支持新具名暂存库。');
 return seedContext.run(Object.freeze({...env}),work);
}

export const root = fileURLToPath(new URL('../', import.meta.url));
export async function loadConfig(directory, { initialize = false, overrides = process.env } = {}) {
  const envPath = join(directory, '.env');
  if (!existsSync(envPath)) {
    if (!initialize) throw new Error('未找到本机 .env；首次使用请运行 npm run db:init。日常启动不会生成凭据。');
    await mkdir(join(directory, '.runtime'), { recursive: true });
    const example = await readFile(join(directory, '.env.example'), 'utf8');
    await writeFile(envPath, example.replaceAll('generated-by-local-launcher', () => randomBytes(18).toString('base64url')), { flag: 'wx' });
  }
  const env = dotenv.parse(await readFile(envPath));
  const additions={ADC_LOCAL_IDENTITY_ENABLED:'true',BOOKING_DEMO_DATE:new Date(Date.now()+86400000).toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'}),
    ADC_STAFF_EAST_PASSWORD:randomBytes(18).toString('base64url'),ADC_STAFF_RIVER_PASSWORD:randomBytes(18).toString('base64url'),ADC_STAFF_NONE_PASSWORD:randomBytes(18).toString('base64url'),
    ADC_PATIENT_A_PASSWORD:randomBytes(18).toString('base64url'),ADC_PATIENT_B_PASSWORD:randomBytes(18).toString('base64url'),
    ADC_DOCTOR_LIN_PASSWORD:randomBytes(18).toString('base64url'),ADC_DOCTOR_ZHOU_PASSWORD:randomBytes(18).toString('base64url'),ADC_DOCTOR_RIVER_PASSWORD:randomBytes(18).toString('base64url'),ADC_NURSE_EAST_PASSWORD:randomBytes(18).toString('base64url'),ADC_IMAGING_EAST_PASSWORD:randomBytes(18).toString('base64url')};
  additions.ADC_MANAGER_EAST_PASSWORD=randomBytes(18).toString('base64url');additions.ADC_FOLLOWUP_ASSIST_PASSWORD=randomBytes(18).toString('base64url');
  additions.ADC_STOCK_EAST_PASSWORD=randomBytes(18).toString('base64url');additions.ADC_STOCK_RIVER_PASSWORD=randomBytes(18).toString('base64url');
  additions.ADC_SALES_EAST_PASSWORD=randomBytes(18).toString('base64url');
  additions.ADC_FINANCE_PASSWORD=randomBytes(18).toString('base64url');additions.ADC_REVIEW_PASSWORD=randomBytes(18).toString('base64url');additions.ADC_MANAGER_RIVER_PASSWORD=randomBytes(18).toString('base64url');
  additions.ADC_QUALITY_PASSWORD=randomBytes(18).toString('base64url');
  const missing=Object.entries(additions).filter(([k])=>!(k in env));
  if(initialize && missing.length){await writeFile(envPath,(await readFile(envPath,'utf8')).trimEnd()+'\n'+missing.map(([k,v])=>`${k}=${v}`).join('\n')+'\n');Object.assign(env,Object.fromEntries(missing));}
  return { ...env, ...Object.fromEntries(Object.entries(overrides).filter(([k]) => k in env)) };
}
// Reads never create or append secrets. Only the explicit first-use command opts in.
export async function config(options) { const supplied=seedContext.getStore();return supplied?{...supplied}:loadConfig(root, options); }
export function pgOptions(env, database = env.PGDATABASE) {
  return { host: env.PGHOST, port: Number(env.PGPORT), user: env.PGUSER, password: env.PGPASSWORD, database, connectionTimeoutMillis: 5000 };
}
// Isolated checks must not rewrite the developer's private account notes.
export function seedReportPath(env, isolated = !!seedContext.getStore() || process.env.ADC_ISOLATED_SEED_REPORTS === 'true') {
  if (isolated && !/^adc_[a-z_]+_test_\d+$/.test(env.PGDATABASE || '')) throw Error('隔离凭据说明只支持本次具名测试库。');
  return join(root, '.runtime', ...(isolated ? [env.PGDATABASE] : []));
}
export async function seedReportDirectory(env) {
  const directory = seedReportPath(env);
  await mkdir(directory, {recursive:true});
  return directory;
}
