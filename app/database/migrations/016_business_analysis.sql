ALTER TABLE adc.analysis_run ADD CHECK(period_to>period_from AND business_timezone='Asia/Shanghai' AND analysis_type IN('daily','staff','income'));
ALTER TABLE adc.analysis_run ADD CHECK(COALESCE(source_version_manifest->>'schemaVersion'='1' AND result_snapshot->>'schemaVersion'='1' AND jsonb_typeof(source_version_manifest->'sources')='array' AND jsonb_typeof(result_snapshot->'filters'->'clinicIds')='array' AND jsonb_typeof(result_snapshot->'report')='object' AND result_snapshot->'filters'->>'dimension'=analysis_type,false));
CREATE UNIQUE INDEX business_query_once ON adc.business_operation(analysis_id) WHERE action_code='business.query';
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['analysis_run','analysis_scope','analysis_staff_scope'] LOOP EXECUTE format('CREATE TRIGGER immutable_analysis BEFORE UPDATE OR DELETE ON adc.%I FOR EACH ROW EXECUTE FUNCTION adc_auth.reject_history_change()',t); END LOOP;END $$;
CREATE FUNCTION adc_auth.check_analysis_complete() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE a adc.analysis_run%ROWTYPE; actual jsonb; selected jsonb; n bigint;
BEGIN
 SELECT * INTO STRICT a FROM adc.analysis_run WHERE analysis_id=NEW.analysis_id;
 SELECT jsonb_agg(clinic_id::text ORDER BY clinic_id::text) INTO actual FROM adc.analysis_scope WHERE analysis_id=a.analysis_id;
 SELECT jsonb_agg(value ORDER BY value) INTO selected FROM jsonb_array_elements_text(a.result_snapshot->'filters'->'clinicIds');
 IF actual IS NULL OR actual IS DISTINCT FROM selected THEN RAISE EXCEPTION 'analysis requires exact nonempty original clinic scope'; END IF;
 SELECT count(*) INTO n FROM adc.analysis_staff_scope WHERE analysis_id=a.analysis_id;
 IF n<>1 OR NOT EXISTS(SELECT 1 FROM adc.analysis_staff_scope s WHERE s.analysis_id=a.analysis_id AND s.employee_id IS NOT DISTINCT FROM NULLIF(a.result_snapshot->'filters'->>'employeeId','')::uuid AND s.dimension_definition::jsonb->>'dimension'=a.analysis_type AND COALESCE(s.dimension_definition::jsonb->>'itemKey','')=COALESCE(a.result_snapshot->'filters'->>'itemKey','')) THEN RAISE EXCEPTION 'analysis requires one matching explicit dimension scope'; END IF;
 IF (SELECT count(*) FROM adc.business_operation WHERE analysis_id=a.analysis_id AND action_code='business.query' AND subject_key=a.analysis_id::text AND after_content->>'schemaVersion'='1')<>1 THEN RAISE EXCEPTION 'analysis requires fixed query audit'; END IF;RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER analysis_complete_root AFTER INSERT ON adc.analysis_run DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION adc_auth.check_analysis_complete();
CREATE CONSTRAINT TRIGGER analysis_complete_scope AFTER INSERT ON adc.analysis_scope DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION adc_auth.check_analysis_complete();
CREATE CONSTRAINT TRIGGER analysis_complete_staff AFTER INSERT ON adc.analysis_staff_scope DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION adc_auth.check_analysis_complete();
