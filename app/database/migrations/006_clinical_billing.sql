ALTER TABLE adc.clinical_record ADD CHECK(row_version>0 AND ((completeness='complete' AND length(trim(COALESCE(body,'')))>0) OR (completeness='pending' AND length(trim(COALESCE(pending_note,'')))>0)));
ALTER TABLE adc.treatment_bill_line ADD CHECK(quantity>0 AND adopted_unit_price>=0);
ALTER TABLE adc.bill_revision_line ADD CHECK(quantity>0 AND adopted_unit_price>=0);
ALTER TABLE adc.item_price_version ADD CHECK(amount>=0 AND (effective_to IS NULL OR effective_to>effective_from));
ALTER TABLE adc.receipt ADD CHECK(num_nonnulls(bill_id,sale_id)=1 AND amount>=0 AND received_at<=registered_at AND row_version>0);
ALTER TABLE adc.receipt_revision ADD CHECK(num_nonnulls(bill_id,sale_id)=1 AND num_nonnulls(bill_revision_id,sale_revision_id)=1 AND ((bill_id IS NULL)=(bill_revision_id IS NULL)) AND ((sale_id IS NULL)=(sale_revision_id IS NULL)));
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['clinical_record_revision','record_revision_writer','treatment_revision','treatment_revision_tooth','bill_revision','bill_revision_line','bill_revision_staff','receipt_revision'] LOOP
  EXECUTE format('CREATE TRIGGER immutable_history BEFORE UPDATE OR DELETE ON adc.%I FOR EACH ROW EXECUTE FUNCTION adc_auth.reject_history_change()',t);
 END LOOP;
END $$;
CREATE FUNCTION adc_auth.protect_paid_bill() RETURNS trigger LANGUAGE plpgsql AS $$
 DECLARE bid uuid; BEGIN
  IF TG_TABLE_NAME='treatment_bill' THEN bid=COALESCE(NEW.bill_id,OLD.bill_id); ELSE bid=COALESCE(NEW.bill_id,OLD.bill_id); END IF;
  IF EXISTS(SELECT 1 FROM adc.receipt WHERE bill_id=bid) THEN RAISE EXCEPTION 'paid bill cannot be overwritten'; END IF;
  RETURN COALESCE(NEW,OLD);
 END $$;
CREATE TRIGGER paid_bill_root BEFORE UPDATE OR DELETE ON adc.treatment_bill FOR EACH ROW EXECUTE FUNCTION adc_auth.protect_paid_bill();
CREATE TRIGGER paid_bill_lines BEFORE INSERT OR UPDATE OR DELETE ON adc.treatment_bill_line FOR EACH ROW EXECUTE FUNCTION adc_auth.protect_paid_bill();
CREATE TRIGGER paid_bill_staff BEFORE INSERT OR UPDATE OR DELETE ON adc.bill_staff FOR EACH ROW EXECUTE FUNCTION adc_auth.protect_paid_bill();
CREATE FUNCTION adc_auth.protect_price() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' OR (to_jsonb(NEW)-'effective_to') IS DISTINCT FROM (to_jsonb(OLD)-'effective_to')
 OR NEW.effective_to IS NULL OR NEW.effective_to<=OLD.effective_from OR NEW.effective_to<transaction_timestamp()
 OR (OLD.effective_to IS NOT NULL AND NEW.effective_to>OLD.effective_to) THEN RAISE EXCEPTION 'price values immutable; only audited future tail closure allowed'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER price_values_fixed BEFORE UPDATE OR DELETE ON adc.item_price_version FOR EACH ROW EXECUTE FUNCTION adc_auth.protect_price();
