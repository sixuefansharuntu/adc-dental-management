ALTER TABLE adc.followup_plan ADD CHECK(row_version>0);
ALTER TABLE adc.followup_plan_version ADD CHECK(version_no>0 AND (effective_to IS NULL OR effective_to>effective_from));
ALTER TABLE adc.followup_plan_node ADD CHECK(length(trim(time_arrangement))>0 AND length(trim(contact_content))>0 AND length(trim(clinical_purpose))>0);
ALTER TABLE adc.followup_task ADD CHECK(row_version>0 AND length(trim(planned_content))>0 AND ((plan_version_id IS NULL)=(node_id IS NULL)) AND (plan_version_id IS NOT NULL OR (length(trim(COALESCE(doctor_instruction,'')))>0 AND instruction_doctor_id IS NOT NULL)));
ALTER TABLE adc.followup_contact ADD CHECK(channel IN ('phone','message','onsite','other') AND length(trim(result_feedback))>0);
ALTER TABLE adc.followup_issue ADD CHECK(length(trim(problem))>0 AND (resolved_at IS NULL OR (doctor_id IS NOT NULL AND length(trim(COALESCE(progress_conclusion,'')))>0 AND length(trim(COALESCE(clinical_basis,'')))>0 AND recorded_by IS NOT NULL AND recorded_at IS NOT NULL AND resolved_at<=recorded_at)));
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['followup_plan_clinic','followup_plan_node','followup_contact'] LOOP
  EXECUTE format('CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON adc.%I FOR EACH ROW EXECUTE FUNCTION adc_auth.reject_history_change()',t);
 END LOOP;
END $$;
CREATE TRIGGER followup_version_fixed BEFORE UPDATE OR DELETE ON adc.followup_plan_version FOR EACH ROW EXECUTE FUNCTION adc_auth.protect_price();
CREATE FUNCTION adc_auth.check_followup_issue() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' OR (TG_OP='UPDATE' AND OLD.resolved_at IS NOT NULL) THEN RAISE EXCEPTION 'resolved followup issue/history is immutable'; END IF;
 IF NEW.source_contact_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM adc.followup_contact WHERE followup_contact_id=NEW.source_contact_id AND followup_id=NEW.followup_id) THEN RAISE EXCEPTION 'followup issue contact belongs to another task'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER followup_issue_guard BEFORE INSERT OR UPDATE OR DELETE ON adc.followup_issue FOR EACH ROW EXECUTE FUNCTION adc_auth.check_followup_issue();
