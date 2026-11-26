ALTER TABLE adc.material ADD CHECK(row_version>0 AND length(trim(name))>0 AND length(trim(unit))>0 AND activation_arrangement IN ('enabled','disabled'));
ALTER TABLE adc.supplier ADD CHECK(row_version>0 AND length(trim(name))>0 AND activation_arrangement IN ('enabled','disabled'));
ALTER TABLE adc.stock_balance ADD CHECK(quantity>=0 AND row_version>0);
ALTER TABLE adc.stock_receipt ADD CHECK(quantity>0 AND (unit_price IS NULL OR unit_price>=0) AND row_version>0 AND received_at<=registered_at);
ALTER TABLE adc.material_issue ADD CHECK(quantity>0 AND (cost_unit_price IS NULL OR cost_unit_price>=0) AND row_version>0);
ALTER TABLE adc.issue_revision ADD CHECK(quantity>0 AND (cost_unit_price IS NULL OR cost_unit_price>=0) AND version_no>0);
ALTER TABLE adc.stock_movement ADD CHECK(num_nonnulls(receipt_id,issue_revision_id,delivery_line_id,stocktake_line_id)=1 AND quantity_delta<>0 AND stock_version_before>0 AND stock_version_after=stock_version_before+1);
ALTER TABLE adc.stock_movement ADD UNIQUE(stock_id,stock_version_after);
ALTER TABLE adc.stocktake ADD CHECK(row_version>0 AND ((processed_at IS NULL)=(processed_by IS NULL)));
ALTER TABLE adc.stocktake_line ADD CHECK(baseline_quantity>=0 AND baseline_stock_version>0 AND (counted_quantity IS NULL OR counted_quantity>=0) AND ((counted_at IS NULL)=(counted_quantity IS NULL)) AND ((counted_at IS NULL)=(counted_by IS NULL)));
CREATE TRIGGER immutable_stock_movement BEFORE UPDATE OR DELETE ON adc.stock_movement FOR EACH ROW EXECUTE FUNCTION adc_auth.reject_history_change();
CREATE TRIGGER immutable_issue_revision BEFORE UPDATE OR DELETE ON adc.issue_revision FOR EACH ROW EXECUTE FUNCTION adc_auth.reject_history_change();
CREATE FUNCTION adc_auth.fixed_inventory_identity() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'inventory source cannot be deleted'; END IF;
 IF TG_TABLE_NAME='stock_balance' THEN
  IF (NEW.clinic_id,NEW.material_id,NEW.batch_reference,NEW.expires_on,NEW.unit) IS DISTINCT FROM (OLD.clinic_id,OLD.material_id,OLD.batch_reference,OLD.expires_on,OLD.unit) THEN RAISE EXCEPTION 'stock identity is immutable'; END IF;
 ELSIF TG_TABLE_NAME='stock_receipt' THEN
  IF (to_jsonb(NEW)-'unit_price'-'pending_note'-'row_version') IS DISTINCT FROM (to_jsonb(OLD)-'unit_price'-'pending_note'-'row_version') THEN RAISE EXCEPTION 'receipt quantity identity is immutable; supplement price only'; END IF;
 ELSIF TG_TABLE_NAME='stocktake_line' THEN
  IF (NEW.stocktake_id,NEW.stock_id,NEW.unit,NEW.baseline_quantity,NEW.baseline_stock_version) IS DISTINCT FROM (OLD.stocktake_id,OLD.stock_id,OLD.unit,OLD.baseline_quantity,OLD.baseline_stock_version) THEN RAISE EXCEPTION 'count baseline is immutable'; END IF;
 ELSIF TG_TABLE_NAME='stocktake' THEN
  IF (NEW.clinic_id,NEW.initiator_id,NEW.scope_note,NEW.baseline_at) IS DISTINCT FROM (OLD.clinic_id,OLD.initiator_id,OLD.scope_note,OLD.baseline_at) THEN RAISE EXCEPTION 'count scope is immutable'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER fixed_stock BEFORE UPDATE OR DELETE ON adc.stock_balance FOR EACH ROW EXECUTE FUNCTION adc_auth.fixed_inventory_identity();
CREATE TRIGGER fixed_receipt BEFORE UPDATE OR DELETE ON adc.stock_receipt FOR EACH ROW EXECUTE FUNCTION adc_auth.fixed_inventory_identity();
CREATE TRIGGER fixed_count_line BEFORE UPDATE OR DELETE ON adc.stocktake_line FOR EACH ROW EXECUTE FUNCTION adc_auth.fixed_inventory_identity();
CREATE TRIGGER fixed_count BEFORE UPDATE OR DELETE ON adc.stocktake FOR EACH ROW EXECUTE FUNCTION adc_auth.fixed_inventory_identity();
CREATE FUNCTION adc_auth.check_stock_ledger() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE sid uuid; q numeric; ver bigint; net numeric; maxv bigint; n bigint; BEGIN
 sid=NEW.stock_id;SELECT quantity,row_version INTO q,ver FROM adc.stock_balance WHERE stock_id=sid;
 SELECT COALESCE(sum(quantity_delta),0),COALESCE(max(stock_version_after),1),count(*) INTO net,maxv,n FROM adc.stock_movement WHERE stock_id=sid;
 IF q IS DISTINCT FROM net OR ver IS DISTINCT FROM maxv OR maxv<>n+1 THEN RAISE EXCEPTION 'stock ledger quantity/version is not conserved'; END IF;
 IF EXISTS(SELECT 1 FROM adc.stock_receipt r WHERE r.stock_id=sid AND (SELECT COALESCE(sum(m.quantity_delta),0) FROM adc.stock_movement m WHERE m.receipt_id=r.stock_receipt_id AND m.stock_id=sid)<>r.quantity) THEN RAISE EXCEPTION 'receipt source quantity is not conserved'; END IF;
 IF EXISTS(SELECT 1 FROM adc.material_issue i WHERE i.stock_id=sid AND (SELECT COALESCE(sum(m.quantity_delta),0) FROM adc.stock_movement m JOIN adc.issue_revision r ON r.issue_revision_id=m.issue_revision_id WHERE r.issue_id=i.issue_id AND m.stock_id=sid)<>-i.quantity) THEN RAISE EXCEPTION 'issue source quantity is not conserved'; END IF;
 IF EXISTS(SELECT 1 FROM adc.stocktake_line l WHERE l.stock_id=sid AND COALESCE(l.actual_adjustment,0)<>(SELECT COALESCE(sum(m.quantity_delta),0) FROM adc.stock_movement m WHERE m.stocktake_line_id=l.stocktake_line_id AND m.stock_id=sid)) THEN RAISE EXCEPTION 'count adjustment is not conserved'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER ledger_balance AFTER INSERT OR UPDATE ON adc.stock_balance DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION adc_auth.check_stock_ledger();
CREATE CONSTRAINT TRIGGER ledger_movement AFTER INSERT ON adc.stock_movement DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION adc_auth.check_stock_ledger();
CREATE CONSTRAINT TRIGGER ledger_receipt AFTER INSERT OR UPDATE ON adc.stock_receipt DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION adc_auth.check_stock_ledger();
CREATE CONSTRAINT TRIGGER ledger_issue AFTER INSERT OR UPDATE ON adc.material_issue DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION adc_auth.check_stock_ledger();
CREATE CONSTRAINT TRIGGER ledger_count AFTER INSERT OR UPDATE ON adc.stocktake_line DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION adc_auth.check_stock_ledger();
