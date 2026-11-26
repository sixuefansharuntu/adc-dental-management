CREATE FUNCTION adc_auth.result_predecessor() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE prev adc.quarter_result_version%ROWTYPE; BEGIN
 IF NEW.previous_result_id IS NULL THEN
  IF NEW.version_no<>1 THEN RAISE EXCEPTION 'result version requires its predecessor'; END IF;
 ELSE
  SELECT * INTO prev FROM adc.quarter_result_version WHERE result_id=NEW.previous_result_id;
  IF prev.quarter_id IS DISTINCT FROM NEW.quarter_id OR prev.version_no+1<>NEW.version_no OR prev.review_state NOT IN ('returned','confirmed') THEN RAISE EXCEPTION 'result predecessor must be same quarter previous terminal version'; END IF;
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER result_predecessor BEFORE INSERT ON adc.quarter_result_version FOR EACH ROW EXECUTE FUNCTION adc_auth.result_predecessor();
