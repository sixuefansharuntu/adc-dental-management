ALTER TABLE adc.product_sale ADD CHECK(row_version>0);
ALTER TABLE adc.product_sale_line ADD CHECK(quantity>0 AND adopted_unit_price>=0);
ALTER TABLE adc.sale_revision ADD CHECK(version_no>0);
ALTER TABLE adc.sale_revision_line ADD CHECK(quantity>0 AND adopted_unit_price>=0);
ALTER TABLE adc.product_delivery_line ADD CHECK(delivered_quantity>0);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['sale_revision','sale_revision_line','product_delivery_line'] LOOP
  EXECUTE format('CREATE TRIGGER immutable_sales_history BEFORE UPDATE OR DELETE ON adc.%I FOR EACH ROW EXECUTE FUNCTION adc_auth.reject_history_change()',t);
 END LOOP;
END $$;
CREATE TRIGGER immutable_sale_lines BEFORE UPDATE OR DELETE ON adc.product_sale_line FOR EACH ROW EXECUTE FUNCTION adc_auth.reject_history_change();
CREATE FUNCTION adc_auth.fixed_sale() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'sale cannot be deleted'; END IF;
 IF TG_TABLE_NAME='product_sale' THEN
  IF (to_jsonb(NEW)-'row_version') IS DISTINCT FROM (to_jsonb(OLD)-'row_version') OR NEW.row_version<>OLD.row_version+1 THEN RAISE EXCEPTION 'sale facts are immutable in this release'; END IF;
 ELSE
  IF EXISTS(SELECT 1 FROM adc.sale_revision WHERE sale_id=NEW.sale_id) THEN RAISE EXCEPTION 'saved sale lines cannot be appended'; END IF;
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER fixed_sale_root BEFORE UPDATE OR DELETE ON adc.product_sale FOR EACH ROW EXECUTE FUNCTION adc_auth.fixed_sale();
CREATE TRIGGER fixed_sale_line_insert BEFORE INSERT ON adc.product_sale_line FOR EACH ROW EXECUTE FUNCTION adc_auth.fixed_sale();
CREATE FUNCTION adc_auth.check_sales_complete() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE sid uuid; rev uuid; BEGIN
 IF TG_TABLE_NAME='product_delivery_line' THEN SELECT sale_id INTO sid FROM adc.product_sale_line WHERE sale_line_id=NEW.sale_line_id; ELSE sid=NEW.sale_id; END IF;
 SELECT r.sale_revision_id INTO rev FROM adc.product_sale s JOIN adc.sale_revision r ON r.sale_id=s.sale_id AND r.version_no=s.row_version WHERE s.sale_id=sid;
 IF rev IS NULL OR NOT EXISTS(SELECT 1 FROM adc.product_sale_line WHERE sale_id=sid) THEN RAISE EXCEPTION 'sale requires complete current revision and lines'; END IF;
 IF (SELECT count(*) FROM adc.sale_revision_line WHERE sale_revision_id=rev)<>(SELECT count(*) FROM adc.product_sale_line WHERE sale_id=sid)
 OR EXISTS(SELECT 1 FROM adc.product_sale_line l LEFT JOIN adc.sale_revision_line r ON r.sale_revision_id=rev AND r.sale_line_id=l.sale_line_id WHERE l.sale_id=sid AND (r.sale_revision_line_id IS NULL OR (r.material_id,r.quantity,r.adopted_unit_price) IS DISTINCT FROM (l.material_id,l.quantity,l.adopted_unit_price))) THEN RAISE EXCEPTION 'sale revision lines do not match source'; END IF;
 IF EXISTS(SELECT 1 FROM adc.product_delivery_line d JOIN adc.product_sale_line l ON l.sale_line_id=d.sale_line_id WHERE l.sale_id=sid) THEN
  IF EXISTS(SELECT 1 FROM adc.product_sale_line l WHERE l.sale_id=sid AND l.quantity<>(SELECT COALESCE(sum(d.delivered_quantity),0) FROM adc.product_delivery_line d WHERE d.sale_line_id=l.sale_line_id)) THEN RAISE EXCEPTION 'delivery must cover complete sale, no partial delivery'; END IF;
  IF (SELECT count(DISTINCT (d.operation_id,d.delivered_at,d.delivered_by)) FROM adc.product_delivery_line d JOIN adc.product_sale_line l ON l.sale_line_id=d.sale_line_id WHERE l.sale_id=sid)<>1 THEN RAISE EXCEPTION 'sale delivery must be one real event'; END IF;
  IF EXISTS(SELECT 1 FROM adc.product_delivery_line d JOIN adc.product_sale_line l ON l.sale_line_id=d.sale_line_id JOIN adc.product_sale s ON s.sale_id=l.sale_id JOIN adc.stock_balance b ON b.stock_id=d.stock_id JOIN adc.sale_revision_line r ON r.sale_line_id=l.sale_line_id AND r.sale_revision_id=rev WHERE l.sale_id=sid AND (b.clinic_id<>s.clinic_id OR b.material_id<>l.material_id OR b.unit<>r.unit OR NOT EXISTS(SELECT 1 FROM adc.stock_movement m WHERE m.delivery_line_id=d.delivery_line_id AND m.stock_id=d.stock_id AND m.quantity_delta=-d.delivered_quantity AND m.operation_id=d.operation_id AND m.occurred_at=d.delivered_at))) THEN RAISE EXCEPTION 'delivery stock identity or movement does not match source'; END IF;
 END IF;RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER complete_sale_root AFTER INSERT OR UPDATE ON adc.product_sale DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION adc_auth.check_sales_complete();
CREATE CONSTRAINT TRIGGER complete_sale_line AFTER INSERT ON adc.product_sale_line DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION adc_auth.check_sales_complete();
CREATE CONSTRAINT TRIGGER complete_delivery AFTER INSERT ON adc.product_delivery_line DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION adc_auth.check_sales_complete();
CREATE FUNCTION adc_auth.check_sales_movement() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.delivery_line_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM adc.product_delivery_line d WHERE d.delivery_line_id=NEW.delivery_line_id AND d.stock_id=NEW.stock_id AND -d.delivered_quantity=NEW.quantity_delta AND d.operation_id=NEW.operation_id AND d.delivered_at=NEW.occurred_at) THEN RAISE EXCEPTION 'delivery movement is not conserved'; END IF;RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER delivery_movement AFTER INSERT ON adc.stock_movement DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION adc_auth.check_sales_movement();
CREATE FUNCTION adc_auth.check_sales_receipt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.sale_id IS NOT NULL AND NEW.amount IS DISTINCT FROM (SELECT sum(round(l.quantity*l.adopted_unit_price,2)) FROM adc.product_sale_line l WHERE l.sale_id=NEW.sale_id) THEN RAISE EXCEPTION 'sale receipt must be full adopted total'; END IF;RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER sales_receipt_total AFTER INSERT OR UPDATE ON adc.receipt DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION adc_auth.check_sales_receipt();
