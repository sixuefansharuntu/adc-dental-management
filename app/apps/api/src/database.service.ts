import { Injectable, OnModuleDestroy, ConflictException, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { createHash } from 'node:crypto';
import { slotsFor, type PublicStatus } from './domain';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly pool = new Pool({ host: process.env.PGHOST, port: Number(process.env.PGPORT || 54329),
    user: process.env.PGUSER, password: process.env.PGPASSWORD, database: process.env.PGDATABASE,
    max: 6, connectionTimeoutMillis: 4000, idleTimeoutMillis: 10_000, options: '-c timezone=UTC -c statement_timeout=8000' });
  constructor() { this.pool.on('error', () => console.error('Database idle connection error')); }
  async onModuleDestroy() { await this.pool.end(); }
  async health() {
    const { rows } = await this.pool.query('SELECT current_database() AS name, current_setting(\'server_version\') AS version');
    return { connected: true, engine: 'PostgreSQL', version: rows[0].version, schema: 'tech_probe' };
  }
  async doctors() {
    const { rows } = await this.pool.query('SELECT id, clinic_name AS "clinicName", public_name AS "publicName", specialty, service_name AS "serviceName", duration_minutes AS "durationMinutes" FROM tech_probe.doctor ORDER BY clinic_name, public_name');
    return rows;
  }
  async schedules(date: string, doctorId: string | undefined, admin: boolean) {
    const params: unknown[] = [date];
    let where = `(s.starts_at AT TIME ZONE 'Asia/Shanghai')::date = $1::date`;
    if (doctorId) { params.push(doctorId); where += ' AND s.doctor_id=$2'; }
    if (!admin) where += ` AND s.public_status <> 'not_open'`;
    const { rows } = await this.pool.query(`SELECT s.id, s.doctor_id AS "doctorId", d.clinic_name AS "clinicName", d.public_name AS "doctorName", d.specialty,
      d.service_name AS "serviceName", d.duration_minutes AS "durationMinutes", s.starts_at AS "startsAt", s.ends_at AS "endsAt",
      s.public_status AS "publicStatus", s.can_receive AS "canReceive", s.row_version AS version ${admin ? ', s.internal_note AS "internalNote"' : ''}
      FROM tech_probe.schedule s JOIN tech_probe.doctor d ON d.id=s.doctor_id WHERE ${where} ORDER BY d.public_name,s.starts_at`, params);
    return rows.map(row => ({ ...row, slots: slotsFor(row.startsAt, row.endsAt, row.durationMinutes, row.publicStatus === 'open' && row.canReceive), bookingEnabled: false }));
  }
  async change(id: string, input: { publicStatus: PublicStatus; version: number; requestId: string }, afterUpdate?: () => Promise<void>) {
    const fingerprint = createHash('sha256').update(JSON.stringify({ id, status: input.publicStatus, version: input.version })).digest('hex');
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [input.requestId]);
      const prior = await client.query('SELECT fingerprint,result FROM tech_probe.schedule_change WHERE request_id=$1', [input.requestId]);
      if (prior.rowCount) {
        if (prior.rows[0].fingerprint !== fingerprint) throw new ConflictException('同一请求标识不能用于不同内容。');
        await client.query('COMMIT'); return { ...prior.rows[0].result, repeated: true };
      }
      const result = await client.query('UPDATE tech_probe.schedule SET public_status=$1,row_version=row_version+1 WHERE id=$2 AND row_version=$3 RETURNING id,public_status AS "publicStatus",row_version AS version', [input.publicStatus, id, input.version]);
      if (!result.rowCount) {
        const exists = await client.query('SELECT 1 FROM tech_probe.schedule WHERE id=$1', [id]);
        if (!exists.rowCount) throw new NotFoundException('未找到排班。');
        throw new ConflictException('排班已被其他操作更新，请刷新后重新核对。');
      }
      if (afterUpdate) await afterUpdate();
      await client.query('INSERT INTO tech_probe.schedule_change(request_id,schedule_id,fingerprint,result) VALUES($1,$2,$3,$4)', [input.requestId, id, fingerprint, JSON.stringify(result.rows[0])]);
      await client.query('COMMIT'); return { ...result.rows[0], repeated: false };
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
}
