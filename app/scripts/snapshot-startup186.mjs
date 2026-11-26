import pg from 'pg';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {config,pgOptions,root} from './config.mjs';
import {join} from 'node:path';
export const digest = value => createHash('sha256').update(value).digest('hex');
export async function databaseSnapshot(env) {
  const c = new pg.Client(pgOptions(env)); await c.connect();
  try {
    await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const tables = (await c.query("SELECT table_schema,table_name FROM information_schema.tables WHERE table_type='BASE TABLE' AND table_schema NOT IN ('pg_catalog','information_schema') ORDER BY table_schema,table_name")).rows;
    const result = {};
    for (const t of tables) {
      const identifier = '"'+t.table_schema.replaceAll('"','""')+'"."'+t.table_name.replaceAll('"','""')+'"';
      const rows = (await c.query(`SELECT row_to_json(t)::jsonb::text AS data FROM ${identifier} t ORDER BY row_to_json(t)::jsonb::text`)).rows.map(r=>r.data);
      result[t.table_schema+'.'+t.table_name] = {rows:rows.length,sha256:digest(JSON.stringify(rows))};
    }
    await c.query('COMMIT'); return result;
  } finally {await c.end();}
}
if (process.argv[1]?.endsWith('snapshot-startup186.mjs')) {
 const e = await config();
 await writeFile(join(root,'artifacts/186-before.json'),JSON.stringify({batch:186,phase:'before186-checks-no-development-writes',tables:await databaseSnapshot(e),envHash:digest(await readFile(join(root,'.env'))),previousDeliveryHash:digest(await readFile(join(root,'artifacts/delivery185.json'))),checkedAt:new Date().toISOString()},null,2),{flag:'wx'});
 console.log('Captured all local user tables and credentials hash read-only before startup checks.');
}
