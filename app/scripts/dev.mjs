import { spawn } from 'node:child_process';
import { config, root } from './config.mjs';
import { startDatabase } from './database.mjs';
import { prepareDevelopment } from './startup.mjs';
import {startupMessage} from './postgres-process.mjs';

async function main() {
  const checkOnly = process.argv.includes('--check');
  if (process.argv.slice(2).some(x => x !== '--check')) throw Error('仅支持 npm run dev 或 npm run dev:check。');
  const env = await config();
  Object.assign(process.env, env);
  const result = await prepareDevelopment(env, { checkPorts: !checkOnly, startDatabase: checkOnly ? undefined : startDatabase });
  console.log(`本机环境核对通过：${result.migrations}项迁移，${result.clinics}家诊所。没有执行迁移、示例写入或授权。`);
  if (checkOnly) return;
  const children = [
    spawn(process.execPath, ['node_modules/tsx/dist/cli.mjs','watch','apps/api/src/main.ts'], { cwd: root, env: process.env, stdio: 'inherit', windowsHide: true }),
    spawn(process.execPath, ['node_modules/vite/bin/vite.js','--host','127.0.0.1','--config','apps/admin/vite.config.ts','apps/admin'], { cwd: root, env: process.env, stdio: 'inherit', windowsHide: true })
  ];
  let stopping = false;
  function stop() { if (stopping) return; stopping = true; for (const child of children) child.kill('SIGTERM'); }
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
  for (const child of children) {
    child.on('error', () => { console.error('服务进程未能启动，请检查本机依赖和端口。'); process.exitCode = 1; stop(); });
    child.on('exit', code => { if (!stopping) { console.error('服务退出，已停止本次配套服务。', code); process.exitCode = code || 1; stop(); } });
  }
  console.log('工作台：http://127.0.0.1:5173/；口令沿用.runtime内原文件。Ctrl+C停止本次开发服务，数据库保留。');
}
main().catch(error => { console.error(startupMessage(error)); process.exitCode = 1; });
