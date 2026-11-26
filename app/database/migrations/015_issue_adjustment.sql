CREATE FUNCTION adc_auth.protect_issue_identity() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'issue source cannot be deleted'; END IF;
 IF ROW(NEW.issue_id,NEW.stock_id,NEW.registrar_id,NEW.unit,NEW.issued_at) IS DISTINCT FROM ROW(OLD.issue_id,OLD.stock_id,OLD.registrar_id,OLD.unit,OLD.issued_at) THEN RAISE EXCEPTION 'issue stock/unit/actual time/original registrar immutable'; END IF;
 IF NEW.row_version<>OLD.row_version+1 THEN RAISE EXCEPTION 'issue version must be adjacent'; END IF;RETURN NEW;
END $$;
CREATE TRIGGER issue_identity_fixed BEFORE UPDATE OR DELETE ON adc.material_issue FOR EACH ROW EXECUTE FUNCTION adc_auth.protect_issue_identity();
CREATE FUNCTION adc_auth.check_issue_revision_chain() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE prev adc.issue_revision%ROWTYPE; op adc.business_operation%ROWTYPE; BEGIN
 SELECT * INTO STRICT op FROM adc.business_operation WHERE operation_id=NEW.operation_id;
 IF NEW.issued_at>op.occurred_at OR op.action_code<>'stock.issue' THEN RAISE EXCEPTION 'issue revision requires actual source operation'; END IF;
 IF NEW.version_no>1 THEN
  SELECT * INTO STRICT prev FROM adc.issue_revision WHERE issue_id=NEW.issue_id AND version_no=NEW.version_no-1;
  IF ROW(NEW.stock_id,NEW.registrar_id,NEW.unit,NEW.issued_at) IS DISTINCT FROM ROW(prev.stock_id,prev.registrar_id,prev.unit,prev.issued_at) THEN RAISE EXCEPTION 'issue revision financial identity immutable'; END IF;
  IF length(trim(COALESCE(op.reason,'')))=0 THEN RAISE EXCEPTION 'issue correction requires audited reason'; END IF;
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER issue_revision_chain BEFORE INSERT ON adc.issue_revision FOR EACH ROW EXECUTE FUNCTION adc_auth.check_issue_revision_chain();
CREATE FUNCTION adc_auth.check_issue_current_revision() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE curr adc.material_issue%ROWTYPE; rev adc.issue_revision%ROWTYPE; BEGIN
 SELECT * INTO STRICT curr FROM adc.material_issue WHERE issue_id=NEW.issue_id;
 IF EXISTS(SELECT 1 FROM adc.issue_revision WHERE issue_id=curr.issue_id AND version_no>curr.row_version) THEN RAISE EXCEPTION 'issue revision cannot run ahead of current'; END IF;
 SELECT * INTO STRICT rev FROM adc.issue_revision WHERE issue_id=curr.issue_id AND version_no=curr.row_version;
 IF ROW(curr.stock_id,curr.recipient_id,curr.registrar_id,curr.quantity,curr.unit,curr.issued_at,curr.cost_unit_price,curr.pending_note) IS DISTINCT FROM ROW(rev.stock_id,rev.recipient_id,rev.registrar_id,rev.quantity,rev.unit,rev.issued_at,rev.cost_unit_price,rev.pending_note) THEN RAISE EXCEPTION 'issue current and complete revision must match'; END IF;RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER issue_current_revision AFTER INSERT OR UPDATE ON adc.material_issue DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION adc_auth.check_issue_current_revision();
CREATE CONSTRAINT TRIGGER issue_revision_current AFTER INSERT ON adc.issue_revision DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION adc_auth.check_issue_current_revision();
CREATE FUNCTION adc_auth.check_issue_revision_movement() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE expected numeric; actual numeric; n bigint; BEGIN
 SELECT COALESCE((SELECT quantity FROM adc.issue_revision WHERE issue_id=NEW.issue_id AND version_no=NEW.version_no-1),0)-NEW.quantity INTO expected;
 SELECT COALESCE(sum(quantity_delta),0),count(*) INTO actual,n FROM adc.stock_movement WHERE issue_revision_id=NEW.issue_revision_id;
 IF actual<>expected OR n<>(CASE WHEN expected=0 THEN 0 ELSE 1 END) THEN RAISE EXCEPTION 'issue revision movement delta is not conserved'; END IF;
 IF EXISTS(SELECT 1 FROM adc.stock_movement m WHERE m.issue_revision_id=NEW.issue_revision_id AND ROW(m.stock_id,m.occurred_at,m.operation_id) IS DISTINCT FROM ROW(NEW.stock_id,NEW.issued_at,NEW.operation_id)) THEN RAISE EXCEPTION 'issue revision movement source/time mismatch'; END IF;RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER issue_revision_delta AFTER INSERT ON adc.issue_revision DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION adc_auth.check_issue_revision_movement();
