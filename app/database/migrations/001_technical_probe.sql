-- Infrastructure probe only. NOT the production schema from full baseline166.
CREATE SCHEMA IF NOT EXISTS tech_probe;
CREATE TABLE IF NOT EXISTS tech_probe.migration (
  version integer PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS tech_probe.doctor (
  id uuid PRIMARY KEY,
  clinic_name text NOT NULL,
  public_name text NOT NULL,
  specialty text NOT NULL,
  service_name text NOT NULL,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0 AND duration_minutes <= 240)
);
CREATE TABLE IF NOT EXISTS tech_probe.schedule (
  id uuid PRIMARY KEY,
  doctor_id uuid NOT NULL REFERENCES tech_probe.doctor(id) ON DELETE RESTRICT,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  public_status text NOT NULL CHECK (public_status IN ('open', 'paused', 'not_open')),
  can_receive boolean NOT NULL,
  internal_note text,
  row_version integer NOT NULL DEFAULT 1 CHECK (row_version > 0),
  CHECK (ends_at > starts_at),
  UNIQUE(doctor_id, starts_at, ends_at)
);
CREATE INDEX IF NOT EXISTS schedule_time_idx ON tech_probe.schedule(starts_at, doctor_id);
CREATE TABLE IF NOT EXISTS tech_probe.schedule_change (
  request_id uuid PRIMARY KEY,
  schedule_id uuid NOT NULL REFERENCES tech_probe.schedule(id) ON DELETE RESTRICT,
  fingerprint text NOT NULL,
  result jsonb NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO tech_probe.migration(version) VALUES(1) ON CONFLICT DO NOTHING;
