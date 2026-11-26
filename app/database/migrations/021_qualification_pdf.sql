-- Extend existing complete-adoption check to bounded private PDF scans. No new tables, columns or grants.
CREATE OR REPLACE FUNCTION adc_auth.check_qualification_adoption() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE q adc.qualification%ROWTYPE; v adc.qualification_version%ROWTYPE; expected adc.qualification_version%ROWTYPE; r jsonb; diff integer; files integer;
BEGIN
 IF NEW.action_code<>'qualification.save' THEN RETURN NULL; END IF;
 SELECT * INTO STRICT q FROM adc.qualification WHERE qualification_id=NEW.subject_key::uuid;
 SELECT * INTO STRICT v FROM adc.qualification_version WHERE qualification_version_id=(NEW.after_content->>'versionId')::uuid;
 expected:=jsonb_populate_record(NULL::adc.qualification_version,NEW.after_content->'certificate');
 IF NEW.subject_kind<>'qualification' OR q.employee_id::text IS DISTINCT FROM NEW.after_content->>'doctorId' OR q.qualification_id<>v.qualification_id OR q.row_version<>v.version_no OR v.updated_by<>NEW.actor_id OR v.updated_at<>NEW.occurred_at OR v IS DISTINCT FROM expected THEN RAISE EXCEPTION 'qualification current root and complete original version must match management audit'; END IF;
 IF v.version_no>1 AND (NEW.before_content->>'version')::bigint IS DISTINCT FROM v.version_no-1 THEN RAISE EXCEPTION 'qualification update must adopt adjacent original version'; END IF;
 SELECT count(*) INTO diff FROM ((SELECT file_id::text id FROM adc.qualification_file WHERE qualification_version_id=v.qualification_version_id EXCEPT SELECT jsonb_array_elements_text(NEW.after_content->'fileIds')) UNION ALL (SELECT jsonb_array_elements_text(NEW.after_content->'fileIds') EXCEPT SELECT file_id::text FROM adc.qualification_file WHERE qualification_version_id=v.qualification_version_id)) x;
 SELECT count(*) INTO files FROM adc.qualification_file WHERE qualification_version_id=v.qualification_version_id;
 IF EXISTS(SELECT 1 FROM adc.qualification_file x JOIN adc.qualification_version y USING(qualification_version_id) WHERE x.file_id IN (SELECT file_id FROM adc.qualification_file WHERE qualification_version_id=v.qualification_version_id) AND y.qualification_id<>q.qualification_id) THEN RAISE EXCEPTION 'qualification attachment cannot be transferred between certificate identities'; END IF;
 IF diff<>0 OR files>5 OR EXISTS(SELECT 1 FROM adc.qualification_file x JOIN adc.file_asset f USING(file_id) WHERE x.qualification_version_id=v.qualification_version_id AND (f.lifecycle_state<>'archived' OR f.media_type NOT IN ('image/png','image/jpeg','application/pdf') OR f.byte_size<=0 OR f.byte_size>10485760)) THEN RAISE EXCEPTION 'complete qualification attachment set must be archived and match adoption'; END IF;
 r:=v.review_conclusion::jsonb;
 IF coalesce(r->>'schemaVersion','')<>'1' OR coalesce(r->>'state','') NOT IN ('pending','checked') OR coalesce(r->>'by','')<>NEW.actor_id::text OR (r->>'at')::timestamptz IS DISTINCT FROM NEW.occurred_at THEN RAISE EXCEPTION 'qualification internal review state requires actual actor and time'; END IF;
 IF r->>'state'='checked' AND (files=0 OR v.pending_note IS NOT NULL OR coalesce(length(trim(r->>'basis')),0)=0) THEN RAISE EXCEPTION 'internally checked qualification needs attachment and basis, no unresolved pending'; END IF;
 IF r->>'state'='pending' AND coalesce(length(trim(v.pending_note)),0)=0 THEN RAISE EXCEPTION 'pending qualification needs explicit note'; END IF;RETURN NULL;
END $$;
