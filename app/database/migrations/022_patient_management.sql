-- UC03 complete branch revisions; no new table or column.
CREATE FUNCTION adc_auth.patient_current_data(pid uuid) RETURNS jsonb LANGUAGE sql STABLE AS $$
 SELECT jsonb_build_object('root',to_jsonb(p),'allergies',coalesce((SELECT jsonb_agg(jsonb_build_object('id',item_key,'allergen',allergen,'description',description) ORDER BY item_key) FROM adc.patient_allergy WHERE patient_id=pid),'[]'::jsonb),'tags',coalesce((SELECT jsonb_agg(tag_text ORDER BY tag_text) FROM adc.patient_tag WHERE patient_id=pid),'[]'::jsonb),'channels',coalesce((SELECT jsonb_agg(jsonb_build_object('id',channel_id,'name',channel_name,'note',association_note) ORDER BY channel_id) FROM adc.patient_channel WHERE patient_id=pid),'[]'::jsonb)) FROM adc.patient p WHERE patient_id=pid
$$;
CREATE FUNCTION adc_auth.patient_original_data(rid uuid) RETURNS jsonb LANGUAGE sql STABLE AS $$
 SELECT jsonb_build_object('root',(to_jsonb(r)-'patient_revision_id'-'operation_id'-'version_no')||jsonb_build_object('row_version',r.version_no),'allergies',coalesce((SELECT jsonb_agg(jsonb_build_object('id',item_key,'allergen',allergen,'description',description) ORDER BY item_key) FROM adc.patient_revision_allergy WHERE patient_revision_id=rid),'[]'::jsonb),'tags',coalesce((SELECT jsonb_agg(tag_text ORDER BY tag_text) FROM adc.patient_revision_tag WHERE patient_revision_id=rid),'[]'::jsonb),'channels',coalesce((SELECT jsonb_agg(jsonb_build_object('id',channel_id,'name',channel_name,'note',association_note) ORDER BY channel_id) FROM adc.patient_revision_channel WHERE patient_revision_id=rid),'[]'::jsonb)) FROM adc.patient_revision r WHERE patient_revision_id=rid
$$;
CREATE FUNCTION adc_auth.protect_patient_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'patient identity cannot be deleted'; END IF;
 IF ROW(NEW.patient_id,NEW.created_clinic_id) IS DISTINCT FROM ROW(OLD.patient_id,OLD.created_clinic_id) OR NEW.row_version<>OLD.row_version+1 THEN RAISE EXCEPTION 'patient identity and original creation clinic fixed; next version required'; END IF;RETURN NEW;
END $$;
CREATE TRIGGER patient_identity_fixed BEFORE UPDATE OR DELETE ON adc.patient FOR EACH ROW EXECUTE FUNCTION adc_auth.protect_patient_identity();
CREATE FUNCTION adc_auth.check_patient_adoption() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r adc.patient_revision%ROWTYPE; expected jsonb; actual jsonb; n integer;
BEGIN
 IF NEW.action_code NOT IN ('patient.save','patient.baseline.capture') THEN RETURN NULL; END IF;
 SELECT * INTO STRICT r FROM adc.patient_revision WHERE operation_id=NEW.operation_id;
 expected:=jsonb_build_object('root',NEW.after_content->'root','allergies',NEW.after_content->'allergies','tags',NEW.after_content->'tags','channels',NEW.after_content->'channels');actual:=adc_auth.patient_original_data(r.patient_revision_id);
 IF r.patient_id::text<>NEW.subject_key OR NEW.subject_kind<>'patient' OR expected IS DISTINCT FROM actual THEN RAISE EXCEPTION 'complete patient original collections must match actual management audit'; END IF;
 IF NEW.action_code='patient.save' THEN
  IF NEW.before_content->'root'->>'patient_id' IS DISTINCT FROM NEW.subject_key OR (NEW.before_content->'root'->>'row_version')::bigint IS DISTINCT FROM r.version_no-1 OR NOT EXISTS(SELECT 1 FROM adc.patient_revision WHERE patient_id=r.patient_id AND version_no=r.version_no-1) THEN RAISE EXCEPTION 'patient management requires adjacent previous complete original'; END IF;
 END IF;
 SELECT jsonb_array_length(expected->'allergies') INTO n;
 IF (expected->'root'->>'allergy_knowledge'='reported' AND n=0) OR (expected->'root'->>'allergy_knowledge' IN ('unknown','none_reported') AND n<>0) OR coalesce(expected->'root'->>'allergy_knowledge','unknown') NOT IN ('unknown','none_reported','reported') THEN RAISE EXCEPTION 'patient allergy knowledge and complete item collection inconsistent'; END IF;
 IF n>50 OR jsonb_array_length(expected->'tags')>50 OR jsonb_array_length(expected->'channels')>50 THEN RAISE EXCEPTION 'patient collections exceed complete management range'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER patient_adoption_complete AFTER INSERT ON adc.business_operation DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION adc_auth.check_patient_adoption();
CREATE FUNCTION adc_auth.check_patient_current() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE pid uuid; current_data jsonb; original jsonb;
BEGIN
 IF TG_OP='DELETE' THEN pid:=OLD.patient_id; ELSE pid:=NEW.patient_id; END IF;
 IF NOT EXISTS(SELECT 1 FROM adc.business_operation WHERE subject_key=pid::text AND action_code='patient.save') THEN RETURN NULL; END IF;
 current_data:=adc_auth.patient_current_data(pid);SELECT adc_auth.patient_original_data(r.patient_revision_id) INTO original FROM adc.patient_revision r JOIN adc.patient p ON p.patient_id=r.patient_id AND p.row_version=r.version_no WHERE p.patient_id=pid;
 IF current_data IS NULL OR original IS DISTINCT FROM current_data THEN RAISE EXCEPTION 'managed patient current root and all collections require complete original version'; END IF;RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER patient_current_complete AFTER UPDATE ON adc.patient DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION adc_auth.check_patient_current();
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['patient_allergy','patient_tag','patient_channel'] LOOP
 EXECUTE format('CREATE CONSTRAINT TRIGGER patient_collection_complete AFTER INSERT OR UPDATE OR DELETE ON adc.%I DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION adc_auth.check_patient_current()',t);
END LOOP;END $$;
CREATE FUNCTION adc_auth.check_patient_original_append() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r adc.patient_revision%ROWTYPE; op adc.business_operation%ROWTYPE; expected jsonb;
BEGIN
 SELECT * INTO STRICT r FROM adc.patient_revision WHERE patient_revision_id=NEW.patient_revision_id;SELECT * INTO STRICT op FROM adc.business_operation WHERE operation_id=r.operation_id;
 IF op.action_code NOT IN ('patient.save','patient.baseline.capture') THEN RETURN NULL; END IF;
 expected:=jsonb_build_object('root',op.after_content->'root','allergies',op.after_content->'allergies','tags',op.after_content->'tags','channels',op.after_content->'channels');IF expected IS DISTINCT FROM adc_auth.patient_original_data(r.patient_revision_id) THEN RAISE EXCEPTION 'patient original collection cannot be appended beyond adopted version'; END IF;RETURN NULL;
END $$;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['patient_revision_allergy','patient_revision_tag','patient_revision_channel'] LOOP
 EXECUTE format('CREATE CONSTRAINT TRIGGER patient_original_complete AFTER INSERT ON adc.%I DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION adc_auth.check_patient_original_append()',t);
END LOOP;END $$;
