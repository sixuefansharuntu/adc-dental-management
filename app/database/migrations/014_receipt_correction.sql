-- Corrected actual time is bounded by its new recording operation.
DO $$ DECLARE n text; BEGIN
 SELECT conname INTO STRICT n FROM pg_constraint WHERE conrelid='adc.receipt'::regclass AND contype='c' AND pg_get_constraintdef(oid) LIKE '%received_at <= registered_at%';
 EXECUTE format('ALTER TABLE adc.receipt DROP CONSTRAINT %I',n);
END $$;
ALTER TABLE adc.receipt ADD CONSTRAINT receipt_identity_check CHECK(num_nonnulls(bill_id,sale_id)=1 AND amount>=0 AND row_version>0);
CREATE FUNCTION adc_auth.protect_receipt_identity() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'receipt financial identity immutable'; END IF;
 IF ROW(NEW.receipt_id,NEW.bill_id,NEW.sale_id,NEW.collector_id,NEW.amount,NEW.registered_at) IS DISTINCT FROM ROW(OLD.receipt_id,OLD.bill_id,OLD.sale_id,OLD.collector_id,OLD.amount,OLD.registered_at) THEN RAISE EXCEPTION 'receipt financial identity immutable; full adopted total must remain fixed'; END IF;
 IF NEW.row_version<>OLD.row_version+1 THEN RAISE EXCEPTION 'receipt version must be adjacent'; END IF;RETURN NEW;
END $$;
CREATE TRIGGER receipt_identity_fixed BEFORE UPDATE OR DELETE ON adc.receipt FOR EACH ROW EXECUTE FUNCTION adc_auth.protect_receipt_identity();
CREATE FUNCTION adc_auth.check_receipt_revision_chain() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE prev adc.receipt_revision%ROWTYPE; op adc.business_operation%ROWTYPE; BEGIN
 SELECT * INTO STRICT op FROM adc.business_operation WHERE operation_id=NEW.operation_id;
 IF NEW.version_no<1 OR NEW.received_at>op.occurred_at OR NEW.registered_at>op.occurred_at THEN RAISE EXCEPTION 'receipt actual time exceeds recording operation'; END IF;
 IF NEW.version_no=1 THEN
  IF NEW.received_at>NEW.registered_at THEN RAISE EXCEPTION 'initial receipt actual time exceeds first registration'; END IF;
 ELSE
  SELECT * INTO STRICT prev FROM adc.receipt_revision WHERE receipt_id=NEW.receipt_id AND version_no=NEW.version_no-1;
  IF ROW(NEW.bill_id,NEW.sale_id,NEW.collector_id,NEW.amount,NEW.registered_at,NEW.bill_revision_id,NEW.sale_revision_id) IS DISTINCT FROM ROW(prev.bill_id,prev.sale_id,prev.collector_id,prev.amount,prev.registered_at,prev.bill_revision_id,prev.sale_revision_id) THEN RAISE EXCEPTION 'receipt adopted document and financial identity immutable'; END IF;
  IF op.action_code<>'receipt.correct' OR length(trim(COALESCE(op.reason,'')))=0 THEN RAISE EXCEPTION 'receipt correction requires an explicit audited reason'; END IF;
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER receipt_revision_chain BEFORE INSERT ON adc.receipt_revision FOR EACH ROW EXECUTE FUNCTION adc_auth.check_receipt_revision_chain();
CREATE FUNCTION adc_auth.check_current_receipt_revision() RETURNS trigger LANGUAGE plpgsql AS $$ DECLARE curr adc.receipt%ROWTYPE; rev adc.receipt_revision%ROWTYPE; BEGIN
 SELECT * INTO STRICT curr FROM adc.receipt WHERE receipt_id=NEW.receipt_id;
 IF EXISTS(SELECT 1 FROM adc.receipt_revision WHERE receipt_id=curr.receipt_id AND version_no>curr.row_version) THEN RAISE EXCEPTION 'receipt revision cannot run ahead of current version'; END IF;
 SELECT * INTO STRICT rev FROM adc.receipt_revision WHERE receipt_id=curr.receipt_id AND version_no=curr.row_version;
 IF ROW(curr.bill_id,curr.sale_id,curr.collector_id,curr.amount,curr.payment_method,curr.received_at,curr.registered_at,curr.recording_reason) IS DISTINCT FROM ROW(rev.bill_id,rev.sale_id,rev.collector_id,rev.amount,rev.payment_method,rev.received_at,rev.registered_at,rev.recording_reason) THEN RAISE EXCEPTION 'receipt current and adopted revision must match'; END IF;RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER receipt_current_revision AFTER INSERT OR UPDATE ON adc.receipt DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION adc_auth.check_current_receipt_revision();
CREATE CONSTRAINT TRIGGER receipt_revision_current AFTER INSERT ON adc.receipt_revision DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION adc_auth.check_current_receipt_revision();
