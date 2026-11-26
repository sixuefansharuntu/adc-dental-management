ALTER TABLE adc.clinical_image ADD CHECK(row_version>0 AND image_type IN ('photo','scan'));
ALTER TABLE adc.file_asset ADD CHECK(byte_size>0 AND lifecycle_state IN ('prepared','archived') AND content_digest ~ '^[a-f0-9]{64}$');
ALTER TABLE adc.lab_order ADD CHECK(row_version>0 AND (current_review_id IS NULL OR current_received_handover_id IS NOT NULL));
ALTER TABLE adc.lab_requirement_version ADD CHECK(version_no>0 AND length(trim(requirement_text))>0);
ALTER TABLE adc.lab_handover ADD CHECK(direction IN ('sent','received') AND (direction<>'sent' OR matches_requirement IS NULL));
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['clinical_image_revision','lab_requirement_version','lab_handover','lab_review'] LOOP
  EXECUTE format('CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON adc.%I FOR EACH ROW EXECUTE FUNCTION adc_auth.reject_history_change()',t);
 END LOOP;
END $$;
CREATE FUNCTION adc_auth.protect_file_identity() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' OR (to_jsonb(NEW)-'lifecycle_state'-'availability_note') IS DISTINCT FROM (to_jsonb(OLD)-'lifecycle_state'-'availability_note')
 OR (OLD.lifecycle_state='archived' AND NEW.lifecycle_state<>'archived') THEN RAISE EXCEPTION 'file content identity is immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER immutable_file_identity BEFORE UPDATE OR DELETE ON adc.file_asset FOR EACH ROW EXECUTE FUNCTION adc_auth.protect_file_identity();
