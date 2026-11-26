import pg from 'pg';
import { createHash } from 'node:crypto';
import { config, pgOptions } from './config.mjs';
export function fixtureId(value) { const hash = createHash('sha256').update(value).digest('hex'); return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`; }
export async function seed() {
  const env = await config(); const client = new pg.Client(pgOptions(env)); await client.connect();
  const doctors = [
    { key: 'lin', clinic: 'ADC · 东城诊所（示例）', name: '林医生', specialty: '综合牙科', service: '初诊咨询（演示配置）', duration: 30 },
    { key: 'zhou', clinic: 'ADC · 东城诊所（示例）', name: '周医生', specialty: '口腔修复', service: '复诊评估（演示配置）', duration: 60 },
    { key: 'chen', clinic: 'ADC · 滨江诊所（示例）', name: '陈医生', specialty: '牙周诊疗', service: '初诊咨询（演示配置）', duration: 30 }
  ];
  try {
    await client.query('BEGIN');
    for (const doctor of doctors) {
      await client.query('INSERT INTO tech_probe.doctor VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO NOTHING',
        [fixtureId(doctor.key), doctor.clinic, doctor.name, doctor.specialty, doctor.service, doctor.duration]);
      for (let day = 0; day < 7; day++) {
        const date = new Date(`${env.DEMO_DATE}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + day);
        const d = date.toISOString().slice(0, 10);
        for (const [a,z] of [['09:00','12:00'],['14:00','17:00']]) {
          const paused = doctor.key === 'zhou' && a === '14:00' && day === 0;
          await client.query('INSERT INTO tech_probe.schedule VALUES($1,$2,$3,$4,$5,$6,$7,1) ON CONFLICT(id) DO NOTHING',
            [fixtureId(`${doctor.key}-${d}-${a}`), fixtureId(doctor.key), `${d}T${a}:00+08:00`, `${d}T${z}:00+08:00`, paused ? 'paused' : 'open', true, '合成技术验证数据；不是实际诊所排班。']);
        }
      }
    }
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { await client.end(); }
  console.log(`Synthetic seed ready for ${env.DEMO_DATE}; existing changes preserved.`);
}
if (process.argv[1]?.endsWith('seed.mjs')) seed().catch(error => { console.error(error.message); process.exitCode = 1; });
