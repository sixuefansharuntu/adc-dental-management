-- Preserve baseline166 NULLS_EQUAL semantics for inventory identity, including
-- unknown batch/expiry. No inventory workflow is claimed implemented by this DDL.
DO $$ DECLARE old_name text; BEGIN
 SELECT c.conname INTO old_name FROM pg_constraint c
 WHERE c.conrelid='adc.stock_balance'::regclass AND c.contype='u'
 AND (SELECT array_agg(a.attname::text ORDER BY x.ord) FROM unnest(c.conkey) WITH ORDINALITY x(attnum,ord)
 JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=x.attnum)
 = ARRAY['clinic_id','material_id','batch_reference','expires_on'];
 IF old_name IS NULL THEN RAISE EXCEPTION 'Expected stock identity unique key missing'; END IF;
 EXECUTE format('ALTER TABLE adc.stock_balance DROP CONSTRAINT %I',old_name);
 ALTER TABLE adc.stock_balance ADD CONSTRAINT stock_identity_nulls_equal UNIQUE NULLS NOT DISTINCT(clinic_id,material_id,batch_reference,expires_on);
END $$;
