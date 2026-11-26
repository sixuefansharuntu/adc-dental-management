ALTER TABLE adc.clinic ADD CHECK(row_version>0 AND COALESCE((area_value IS NULL AND area_unit IS NULL OR area_value>0 AND area_unit IS NOT NULL),false));
ALTER TABLE adc.clinic_revision ADD CHECK(version_no>0 AND COALESCE((area_value IS NULL AND area_unit IS NULL OR area_value>0 AND area_unit IS NOT NULL),false));
CREATE TRIGGER immutable_clinic_revision BEFORE UPDATE OR DELETE ON adc.clinic_revision FOR EACH ROW EXECUTE FUNCTION adc_auth.reject_history_change();
CREATE FUNCTION adc_auth.clinic_identity_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.clinic_id IS DISTINCT FROM OLD.clinic_id OR NEW.created_at IS DISTINCT FROM OLD.created_at OR NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.row_version<>OLD.row_version+1 THEN RAISE EXCEPTION 'clinic identity and adjacent version must remain stable'; END IF;RETURN NEW;END $$;
CREATE TRIGGER clinic_identity_guard BEFORE UPDATE ON adc.clinic FOR EACH ROW EXECUTE FUNCTION adc_auth.clinic_identity_guard();
CREATE FUNCTION adc_auth.clinic_revision_complete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM adc.clinic c JOIN adc.clinic_revision r ON r.clinic_id=c.clinic_id AND r.version_no=c.row_version WHERE c.clinic_id=NEW.clinic_id AND ROW(r.name,r.address,r.contact_info,r.manager_id,r.area_value,r.area_unit,r.created_by,r.created_at,r.updated_by,r.updated_at) IS NOT DISTINCT FROM ROW(c.name,c.address,c.contact_info,c.manager_id,c.area_value,c.area_unit,c.created_by,c.created_at,c.updated_by,c.updated_at)) THEN RAISE EXCEPTION 'clinic current revision required'; END IF;RETURN NULL;END $$;
CREATE CONSTRAINT TRIGGER clinic_revision_complete AFTER UPDATE ON adc.clinic DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION adc_auth.clinic_revision_complete();
ALTER TABLE adc.clinic_booking_rule_version ADD CHECK(version_no>0 AND self_cancel_lead_minutes<=525600 AND self_reschedule_lead_minutes<=525600);
