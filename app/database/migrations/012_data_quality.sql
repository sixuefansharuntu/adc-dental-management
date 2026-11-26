ALTER TABLE adc.data_issue ADD CHECK(row_version>0);
CREATE UNIQUE INDEX issue_source_period_category ON adc.data_issue(clinic_id,period_note,source_locator,category);
CREATE TRIGGER immutable_issue_action BEFORE UPDATE OR DELETE ON adc.issue_action FOR EACH ROW EXECUTE FUNCTION adc_auth.reject_history_change();
CREATE OR REPLACE FUNCTION adc_auth.quality_identity() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF OLD.source_locator ~ '^(expense|issue|record):[0-9a-f-]{36}$' THEN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'data issue cannot be deleted'; END IF;
  IF (NEW.clinic_id,NEW.period_note,NEW.source_locator,NEW.category,NEW.severity) IS DISTINCT FROM (OLD.clinic_id,OLD.period_note,OLD.source_locator,OLD.category,OLD.severity) THEN RAISE EXCEPTION 'data issue identity is immutable'; END IF;
  IF NEW.row_version<>OLD.row_version+1 THEN RAISE EXCEPTION 'data issue version must advance once'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER quality_identity BEFORE UPDATE OR DELETE ON adc.data_issue FOR EACH ROW EXECUTE FUNCTION adc_auth.quality_identity();
