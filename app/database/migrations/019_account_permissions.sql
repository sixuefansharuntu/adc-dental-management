-- UC30 existing-account management only. No table or column added.
CREATE FUNCTION adc_auth.is_managed_grant(gid uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM adc.business_operation o WHERE o.action_code IN ('security.grant.save','security.bootstrap') AND o.after_content->'grant'->>'id'=gid::text)
$$;
CREATE FUNCTION adc_auth.protect_managed_authorization() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE gid uuid; rid uuid; protected boolean:=false; data jsonb;
BEGIN
 data:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
 IF TG_TABLE_NAME='access_grant' THEN
  IF TG_OP='INSERT' THEN RETURN NEW; END IF;
  gid:=OLD.grant_id; protected:=adc_auth.is_managed_grant(gid);
 ELSIF TG_TABLE_NAME IN ('grant_role','grant_clinic','grant_field') THEN
  gid:=(data->>'grant_id')::uuid;
  protected:=adc_auth.is_managed_grant(gid);
  IF TG_OP='UPDATE' THEN protected:=protected OR adc_auth.is_managed_grant(OLD.grant_id); END IF;
 ELSE
  IF TG_TABLE_NAME='security_role' THEN rid:=(data->>'role_id')::uuid;
   SELECT EXISTS(SELECT 1 FROM adc.grant_role gr JOIN adc.role_version rv USING(role_version_id) WHERE rv.role_id=rid AND adc_auth.is_managed_grant(gr.grant_id)) INTO protected;
  ELSE rid:=(data->>'role_version_id')::uuid;
   SELECT EXISTS(SELECT 1 FROM adc.grant_role gr WHERE gr.role_version_id=rid AND adc_auth.is_managed_grant(gr.grant_id)) INTO protected;
  END IF;
 END IF;
 IF TG_OP='UPDATE' AND TG_TABLE_NAME IN ('role_function','role_version') THEN
  SELECT protected OR EXISTS(SELECT 1 FROM adc.grant_role gr WHERE gr.role_version_id=OLD.role_version_id AND adc_auth.is_managed_grant(gr.grant_id)) INTO protected;
 END IF;
 IF protected THEN RAISE EXCEPTION 'managed authorization history is immutable; append a new complete grant'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['access_grant','grant_role','grant_clinic','grant_field','role_version','role_function','security_role'] LOOP
 EXECUTE format('CREATE TRIGGER managed_authorization_immutable BEFORE INSERT OR UPDATE OR DELETE ON adc.%I FOR EACH ROW EXECUTE FUNCTION adc_auth.protect_managed_authorization()',t);
END LOOP; END $$;
CREATE FUNCTION adc_auth.protect_staff_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'staff identity and original operation references must be preserved'; END IF;
 IF ROW(NEW.account_id,NEW.employee_id,NEW.login_name,NEW.opened_at,NEW.credential_verifier,NEW.account_scope) IS DISTINCT FROM ROW(OLD.account_id,OLD.employee_id,OLD.login_name,OLD.opened_at,OLD.credential_verifier,OLD.account_scope) THEN RAISE EXCEPTION 'existing account identity, credential and special scope cannot be reassigned by this feature'; END IF;
 IF EXISTS(SELECT 1 FROM adc.business_operation o WHERE o.subject_key=OLD.account_id::text AND o.action_code IN ('security.status.save','security.grant.save')) AND NEW.row_version<>OLD.row_version+1 THEN RAISE EXCEPTION 'managed account version must advance once'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER staff_identity_fixed BEFORE UPDATE OR DELETE ON adc.staff_account FOR EACH ROW EXECUTE FUNCTION adc_auth.protect_staff_identity();
CREATE FUNCTION adc_auth.check_managed_account_audit() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE a adc.staff_account%ROWTYPE; p jsonb; prior jsonb; g adc.access_grant%ROWTYPE; count_diff integer;
BEGIN
 IF NEW.action_code NOT IN ('security.status.save','security.grant.save') THEN RETURN NULL; END IF;
 IF NEW.subject_kind<>'staff_account' OR NEW.patient_actor_id IS NOT NULL THEN RAISE EXCEPTION 'account management requires staff actor'; END IF;
 p:=NEW.after_content->'account'; prior:=NEW.before_content->'account';
 SELECT * INTO STRICT a FROM adc.staff_account WHERE account_id=NEW.subject_key::uuid;
 IF (p->>'version')::bigint<>(prior->>'version')::bigint+1 OR
 ROW(a.account_id,a.employee_id,a.login_name,a.opened_at,a.activation_arrangement,a.disabled_at,a.maintained_by,a.maintained_at,a.row_version) IS DISTINCT FROM
 ROW((p->>'id')::uuid,(p->>'employeeId')::uuid,p->>'loginName',(p->>'openedAt')::timestamptz,p->>'activation',(p->>'disabledAt')::timestamptz,NEW.actor_id,NEW.occurred_at,(p->>'version')::bigint) THEN RAISE EXCEPTION 'account state must match full immutable management audit'; END IF;
 IF (prior->>'id') IS DISTINCT FROM (p->>'id') OR (prior->>'employeeId') IS DISTINCT FROM (p->>'employeeId') OR (prior->>'loginName') IS DISTINCT FROM (p->>'loginName') OR (prior->>'openedAt') IS DISTINCT FROM (p->>'openedAt') THEN RAISE EXCEPTION 'account management cannot change original identity'; END IF;
 IF NEW.action_code='security.grant.save' THEN
  p:=NEW.after_content->'grant'; SELECT * INTO STRICT g FROM adc.access_grant WHERE grant_id=(p->>'id')::uuid;
  IF g.account_id<>a.account_id OR g.version_no<>(p->>'version')::bigint OR g.configured_by<>NEW.actor_id OR g.configured_at<>NEW.occurred_at OR g.effective_from<>NEW.occurred_at OR g.effective_to IS NOT NULL OR g.object_scope IS NOT NULL THEN RAISE EXCEPTION 'complete current grant must match audit identity'; END IF;
  IF EXISTS(SELECT 1 FROM adc.access_grant x WHERE x.account_id=g.account_id AND x.version_no>=g.version_no AND x.grant_id<>g.grant_id) THEN RAISE EXCEPTION 'grant version must be latest'; END IF;
  SELECT count(*) INTO count_diff FROM (
   (SELECT function_code v FROM adc.grant_role gr JOIN adc.role_function f USING(role_version_id) WHERE gr.grant_id=g.grant_id EXCEPT SELECT jsonb_array_elements_text(p->'functions'))
   UNION ALL (SELECT jsonb_array_elements_text(p->'functions') EXCEPT SELECT function_code FROM adc.grant_role gr JOIN adc.role_function f USING(role_version_id) WHERE gr.grant_id=g.grant_id)
  ) d; IF count_diff<>0 THEN RAISE EXCEPTION 'grant functions must match adopted complete snapshot'; END IF;
  SELECT count(*) INTO count_diff FROM (
   (SELECT clinic_id::text v FROM adc.grant_clinic WHERE grant_id=g.grant_id EXCEPT SELECT jsonb_array_elements_text(p->'clinicIds'))
   UNION ALL (SELECT jsonb_array_elements_text(p->'clinicIds') EXCEPT SELECT clinic_id::text FROM adc.grant_clinic WHERE grant_id=g.grant_id)
  ) d; IF count_diff<>0 THEN RAISE EXCEPTION 'grant clinics must match adopted complete snapshot'; END IF;
  SELECT count(*) INTO count_diff FROM (
   (SELECT jsonb_build_object('resource',resource_code,'field',field_code,'action',action_code) v FROM adc.grant_field WHERE grant_id=g.grant_id EXCEPT SELECT value FROM jsonb_array_elements(p->'fields'))
   UNION ALL (SELECT value FROM jsonb_array_elements(p->'fields') EXCEPT SELECT jsonb_build_object('resource',resource_code,'field',field_code,'action',action_code) FROM adc.grant_field WHERE grant_id=g.grant_id)
  ) d; IF count_diff<>0 THEN RAISE EXCEPTION 'grant fields must match adopted complete snapshot'; END IF;
  SELECT count(*) INTO count_diff FROM (
   (SELECT jsonb_build_object('roleId',r.role_id,'versionId',r.role_version_id,'name',r.name) v FROM adc.grant_role gr JOIN adc.role_version r USING(role_version_id) WHERE gr.grant_id=g.grant_id EXCEPT SELECT value FROM jsonb_array_elements(p->'roles'))
   UNION ALL (SELECT value FROM jsonb_array_elements(p->'roles') EXCEPT SELECT jsonb_build_object('roleId',r.role_id,'versionId',r.role_version_id,'name',r.name) FROM adc.grant_role gr JOIN adc.role_version r USING(role_version_id) WHERE gr.grant_id=g.grant_id)
  ) d; IF count_diff<>0 THEN RAISE EXCEPTION 'grant roles must match adopted complete snapshot'; END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER managed_account_audit_complete AFTER INSERT ON adc.business_operation DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION adc_auth.check_managed_account_audit();
CREATE FUNCTION adc_auth.check_managed_account_root() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p jsonb;
BEGIN
 SELECT o.after_content->'account' INTO p FROM adc.business_operation o WHERE o.subject_key=NEW.account_id::text AND o.action_code IN ('security.status.save','security.grant.save') ORDER BY (o.after_content->'account'->>'version')::bigint DESC LIMIT 1;
 IF FOUND AND ROW(NEW.row_version,NEW.activation_arrangement,NEW.disabled_at,NEW.maintained_by,NEW.maintained_at) IS DISTINCT FROM ROW((p->>'version')::bigint,p->>'activation',(p->>'disabledAt')::timestamptz,(p->>'maintainedBy')::uuid,(p->>'maintainedAt')::timestamptz) THEN RAISE EXCEPTION 'managed current account requires corresponding immutable audit'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER managed_account_root_complete AFTER UPDATE ON adc.staff_account DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION adc_auth.check_managed_account_root();
