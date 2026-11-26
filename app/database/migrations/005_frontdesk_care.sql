ALTER TABLE adc.visit ADD CONSTRAINT visit_time_order CHECK (
 row_version>0 AND (started_at IS NULL OR started_at>=arrived_at)
 AND (ended_at IS NULL OR (started_at IS NOT NULL AND ended_at>=started_at))
 AND (left_at IS NULL OR (left_at>=arrived_at AND (started_at IS NULL OR left_at>=started_at) AND (ended_at IS NULL OR left_at>=ended_at)))
);
CREATE INDEX visit_clinic_day ON adc.visit(clinic_id,arrived_at);
CREATE INDEX contact_appointment_time ON adc.appointment_contact(appointment_id,contacted_at DESC);
CREATE FUNCTION adc_auth.require_visit_nurse() RETURNS trigger LANGUAGE plpgsql AS $$
 DECLARE target uuid;
 BEGIN
  IF TG_TABLE_NAME='visit' THEN target=NEW.visit_id; ELSE target=COALESCE(NEW.visit_id,OLD.visit_id); END IF;
  IF EXISTS(SELECT 1 FROM adc.visit WHERE visit_id=target) AND NOT EXISTS(SELECT 1 FROM adc.visit_nurse WHERE visit_id=target) THEN
   RAISE EXCEPTION 'visit requires at least one nurse';
  END IF;
  RETURN NULL;
 END $$;
CREATE CONSTRAINT TRIGGER visit_has_nurse AFTER INSERT OR UPDATE ON adc.visit DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION adc_auth.require_visit_nurse();
CREATE CONSTRAINT TRIGGER visit_keeps_nurse AFTER DELETE OR UPDATE ON adc.visit_nurse DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION adc_auth.require_visit_nurse();
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['patient_revision','patient_revision_allergy','patient_revision_tag','patient_revision_channel','visit_revision','visit_revision_nurse','appointment_contact'] LOOP
  EXECUTE format('CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON adc.%I FOR EACH ROW EXECUTE FUNCTION adc_auth.reject_history_change()',t);
 END LOOP;
END $$;
