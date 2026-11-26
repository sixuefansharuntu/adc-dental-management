ALTER TABLE adc.operating_expense ADD CHECK(amount>=0 AND row_version>0 AND length(trim(category))>0);
ALTER TABLE adc.expense_revision ADD CHECK(amount>=0 AND version_no>0);
ALTER TABLE adc.quarter_run ADD CHECK(row_version>0 AND quarter_start_at<quarter_end_at AND ((first_full_confirmed_at IS NULL)=(first_confirmed_result_id IS NULL)));
ALTER TABLE adc.quarter_submission ADD CHECK(version_no>0);
ALTER TABLE adc.quarter_result_version ADD CHECK(version_no>0 AND review_state IN ('pending_review','returned','confirmed') AND ((confirmed_by IS NULL)=(confirmed_at IS NULL)) AND ((review_state='confirmed')=(confirmed_at IS NOT NULL)) AND (previous_result_id IS NULL OR (previous_result_id<>result_id AND length(trim(COALESCE(change_reason,'')))>0)));
ALTER TABLE adc.result_review ADD CHECK(decision IN ('return','confirm') AND length(trim(conclusion))>0);
ALTER TABLE adc.quarter_result_line ADD CHECK(received_income>=0 AND material_cost>=0);
ALTER TABLE adc.result_income_source ADD CHECK(adopted_amount>=0 AND length(trim(basis))>0);
ALTER TABLE adc.result_material_source ADD CHECK(adopted_cost>=0 AND length(trim(basis))>0);
ALTER TABLE adc.expense_allocation_line ADD CHECK(adopted_amount>=0 AND length(trim(basis))>0);
ALTER TABLE adc.result_unassigned_sale ADD CHECK(unassigned_amount>=0);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['expense_revision','calculation_policy_version','quarter_submission','submission_receipt','submission_issue','submission_expense','submission_problem','quarter_result_line','result_submission','result_income_source','result_material_source','expense_allocation_line','result_unassigned_sale','result_review'] LOOP
  EXECUTE format('CREATE TRIGGER immutable_quarter_history BEFORE UPDATE OR DELETE ON adc.%I FOR EACH ROW EXECUTE FUNCTION adc_auth.reject_history_change()',t);
 END LOOP;
END $$;
CREATE FUNCTION adc_auth.fixed_quarter() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'quarter scope cannot be deleted'; END IF;
 IF TG_TABLE_NAME='quarter_run' THEN
  IF (to_jsonb(NEW)-'row_version'-'first_full_confirmed_at'-'first_confirmed_result_id') IS DISTINCT FROM (to_jsonb(OLD)-'row_version'-'first_full_confirmed_at'-'first_confirmed_result_id') THEN RAISE EXCEPTION 'quarter period is immutable'; END IF;
  IF OLD.first_full_confirmed_at IS NOT NULL AND (NEW.first_full_confirmed_at,NEW.first_confirmed_result_id) IS DISTINCT FROM (OLD.first_full_confirmed_at,OLD.first_confirmed_result_id) THEN RAISE EXCEPTION 'first full confirmation is immutable'; END IF;
 ELSIF TG_TABLE_NAME='quarter_result_version' THEN
  IF OLD.review_state<>'pending_review' OR NEW.review_state NOT IN ('returned','confirmed') OR (to_jsonb(NEW)-'review_state'-'confirmed_by'-'confirmed_at') IS DISTINCT FROM (to_jsonb(OLD)-'review_state'-'confirmed_by'-'confirmed_at') THEN RAISE EXCEPTION 'result facts and terminal state are immutable'; END IF;
 ELSE
  IF TG_OP='UPDATE' OR EXISTS(SELECT 1 FROM adc.business_operation WHERE action_code='quarter.create' AND subject_key=NEW.quarter_id::text) THEN RAISE EXCEPTION 'original quarter scope is immutable'; END IF;
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER fixed_quarter BEFORE UPDATE OR DELETE ON adc.quarter_run FOR EACH ROW EXECUTE FUNCTION adc_auth.fixed_quarter();
CREATE TRIGGER fixed_result BEFORE UPDATE OR DELETE ON adc.quarter_result_version FOR EACH ROW EXECUTE FUNCTION adc_auth.fixed_quarter();
CREATE TRIGGER fixed_quarter_clinic BEFORE INSERT OR UPDATE OR DELETE ON adc.quarter_scope FOR EACH ROW EXECUTE FUNCTION adc_auth.fixed_quarter();
CREATE TRIGGER fixed_quarter_doctor BEFORE INSERT OR UPDATE OR DELETE ON adc.quarter_doctor_scope FOR EACH ROW EXECUTE FUNCTION adc_auth.fixed_quarter();
CREATE FUNCTION adc_auth.quarter_append_guard() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE rid uuid; state text; BEGIN
 IF TG_TABLE_NAME IN ('result_income_source','result_material_source','expense_allocation_line') THEN SELECT result_id INTO rid FROM adc.quarter_result_line WHERE result_line_id=NEW.result_line_id; ELSE rid=NEW.result_id; END IF;
 SELECT review_state INTO state FROM adc.quarter_result_version WHERE result_id=rid;
 IF state<>'pending_review' THEN RAISE EXCEPTION 'cannot append to terminal result'; END IF;RETURN NEW;
END $$;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['quarter_result_line','result_submission','result_income_source','result_material_source','expense_allocation_line','result_unassigned_sale'] LOOP
 EXECUTE format('CREATE TRIGGER append_pending_result BEFORE INSERT ON adc.%I FOR EACH ROW EXECUTE FUNCTION adc_auth.quarter_append_guard()',t);
END LOOP;END $$;
