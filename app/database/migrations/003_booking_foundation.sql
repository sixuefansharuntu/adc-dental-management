CREATE SCHEMA adc_auth;
CREATE TABLE adc_auth.local_identity (
 identity_id uuid PRIMARY KEY,login_name text UNIQUE NOT NULL,
 booking_subject_id uuid UNIQUE NOT NULL REFERENCES adc.patient_booking_subject(booking_subject_id),
 credential_verifier text NOT NULL,display_name text NOT NULL,enabled boolean NOT NULL DEFAULT true
);
CREATE TABLE adc_auth.session (
 token_hash text PRIMARY KEY,account_id uuid REFERENCES adc.staff_account(account_id),
 identity_id uuid REFERENCES adc_auth.local_identity(identity_id),expires_at timestamptz NOT NULL,
 CHECK(num_nonnulls(account_id,identity_id)=1)
);
ALTER TABLE adc.doctor_schedule ADD CHECK(ends_at>starts_at AND capacity_limit>0 AND row_version>0 AND public_status IN ('open','paused','not_open'));
ALTER TABLE adc.schedule_revision ADD CHECK(ends_at>starts_at AND capacity_limit>0 AND public_status IN ('open','paused','not_open'));
ALTER TABLE adc.clinic_booking_rule_version ADD CHECK(self_cancel_lead_minutes>=0 AND self_reschedule_lead_minutes>=0);
ALTER TABLE adc.booking_service_version ADD CHECK(duration_minutes>0 AND duration_minutes<=480);
ALTER TABLE adc.patient_booking_subject ADD CHECK((verification_kind='online' AND verified_identity_key IS NOT NULL) OR (verification_kind='front_desk' AND verified_by IS NOT NULL));
ALTER TABLE adc.appointment ADD CHECK(scheduled_end_at>scheduled_at AND disposition IN ('active','cancelled','arrived','no_show') AND num_nonnulls(patient_id,booking_subject_id)>=1 AND row_version>0);
ALTER TABLE adc.appointment ADD CHECK((disposition='cancelled' AND cancelled_at IS NOT NULL AND cancel_reason IS NOT NULL AND cancel_channel IS NOT NULL) OR (disposition<>'cancelled' AND cancelled_at IS NULL AND cancel_reason IS NULL AND cancel_channel IS NULL));
ALTER TABLE adc.business_operation ADD CHECK(num_nonnulls(actor_id,patient_actor_id)=1);
ALTER TABLE adc.command_dedup ADD CHECK(num_nonnulls(actor_id,patient_actor_id)=1);
CREATE INDEX booking_doctor_interval ON adc.appointment(doctor_id,scheduled_at,scheduled_end_at) WHERE disposition IN ('active','arrived');
CREATE INDEX booking_subject_interval ON adc.appointment(booking_subject_id,scheduled_at) WHERE disposition IN ('active','arrived');
CREATE INDEX schedule_doctor_interval ON adc.doctor_schedule(doctor_id,starts_at,ends_at);
CREATE INDEX booking_rule_current ON adc.clinic_booking_rule_version(clinic_id,effective_from DESC);
CREATE INDEX booking_service_current ON adc.booking_service_version(clinic_id,doctor_id,service_code,effective_from DESC);
CREATE FUNCTION adc_auth.reject_history_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'immutable adopted history'; END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['schedule_revision','appointment_revision','business_operation','clinic_booking_rule_version','booking_service_version','command_dedup'] LOOP
  EXECUTE format('CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON adc.%I FOR EACH ROW EXECUTE FUNCTION adc_auth.reject_history_change()',t);
 END LOOP;
END $$;
