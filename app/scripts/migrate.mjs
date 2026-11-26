import pg from 'pg';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import { config, pgOptions } from './config.mjs';
export async function migrate(providedEnv) {
  const env = providedEnv || await config(); const client = new pg.Client(pgOptions(env));
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(169001)');
    await client.query('CREATE SCHEMA IF NOT EXISTS adc_meta; CREATE TABLE IF NOT EXISTS adc_meta.migration(name text PRIMARY KEY,sha256 text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())');
    const directory=new URL('../database/migrations/',import.meta.url);
    for(const name of (await readdir(directory)).filter(n=>/^\d+.*\.sql$/.test(n)).sort()){
      const sql=await readFile(new URL(name,directory),'utf8');const hash=createHash('sha256').update(sql).digest('hex');
      const prior=await client.query('SELECT sha256 FROM adc_meta.migration WHERE name=$1',[name]);
      if(prior.rowCount){if(prior.rows[0].sha256!==hash)throw Error('Applied migration changed: '+name);continue;}
      await client.query(sql);await client.query('INSERT INTO adc_meta.migration VALUES($1,$2,now())',[name,hash]);
    }
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { await client.end(); }
  console.log('Versioned migrations applied; structure is not proof of completed business use cases.');
}
if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) migrate().catch(error => { console.error(error.message); process.exitCode = 1; });
