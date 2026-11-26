-- Baseline166 SHA256 803d577c904ed023581e41d84a7aa992e67c36e0ed38322284214f0b003f0f71
-- Structural projection only; full business CK/BR implementation remains tracked separately.
CREATE SCHEMA adc;
CREATE TABLE adc."patient" (
  "patient_id" uuid NOT NULL,
  "name" varchar(100) NOT NULL,
  "birth_date" date,
  "phone" varchar(40),
  "contact_address" text,
  "billing_address" text,
  "email" varchar(254),
  "source_note" text,
  "introducer_note" text,
  "allergy_knowledge" text,
  "allergy_note" text,
  "contact_preference" text,
  "row_version" bigint NOT NULL DEFAULT 1,
  "created_clinic_id" uuid,
  PRIMARY KEY ("patient_id")
);
CREATE TABLE adc."patient_allergy" (
  "patient_id" uuid NOT NULL,
  "item_key" uuid NOT NULL,
  "allergen" varchar(200) NOT NULL,
  "description" text,
  PRIMARY KEY ("patient_id","item_key")
);
CREATE TABLE adc."patient_tag" (
  "patient_id" uuid NOT NULL,
  "tag_text" varchar(100) NOT NULL,
  PRIMARY KEY ("patient_id","tag_text")
);
CREATE TABLE adc."patient_channel" (
  "channel_id" uuid NOT NULL,
  "patient_id" uuid NOT NULL,
  "channel_name" text NOT NULL,
  "association_note" text,
  PRIMARY KEY ("channel_id")
);
CREATE TABLE adc."patient_revision" (
  "patient_revision_id" uuid NOT NULL,
  "patient_id" uuid NOT NULL,
  "version_no" bigint NOT NULL,
  "name" varchar(100) NOT NULL,
  "birth_date" date,
  "phone" varchar(40),
  "contact_address" text,
  "billing_address" text,
  "email" varchar(254),
  "source_note" text,
  "introducer_note" text,
  "allergy_knowledge" text,
  "allergy_note" text,
  "contact_preference" text,
  "operation_id" uuid NOT NULL,
  "created_clinic_id" uuid,
  PRIMARY KEY ("patient_revision_id"),
  UNIQUE ("patient_id","version_no")
);
CREATE TABLE adc."patient_revision_allergy" (
  "patient_revision_id" uuid NOT NULL,
  "item_key" uuid NOT NULL,
  "allergen" varchar(200) NOT NULL,
  "description" text,
  PRIMARY KEY ("patient_revision_id","item_key")
);
CREATE TABLE adc."patient_revision_tag" (
  "patient_revision_id" uuid NOT NULL,
  "tag_text" varchar(100) NOT NULL,
  PRIMARY KEY ("patient_revision_id","tag_text")
);
CREATE TABLE adc."patient_revision_channel" (
  "patient_revision_id" uuid NOT NULL,
  "channel_id" uuid NOT NULL,
  "channel_name" text NOT NULL,
  "association_note" text,
  PRIMARY KEY ("patient_revision_id","channel_id")
);
CREATE TABLE adc."employee" (
  "employee_id" uuid NOT NULL,
  "name" varchar(100) NOT NULL,
  "contact_info" text,
  "personal_profile" text,
  "employment_arrangement" text,
  "professional_editor_id" uuid,
  "professional_edited_at" timestamptz,
  "row_version" bigint NOT NULL DEFAULT 1,
  "public_name" varchar(100),
  "public_specialty" text,
  "public_intro" text,
  "public_enabled" boolean NOT NULL,
  PRIMARY KEY ("employee_id")
);
CREATE TABLE adc."employee_skill" (
  "employee_id" uuid NOT NULL,
  "skill_name" varchar(120) NOT NULL,
  PRIMARY KEY ("employee_id","skill_name")
);
CREATE TABLE adc."employee_revision" (
  "employee_revision_id" uuid NOT NULL,
  "employee_id" uuid NOT NULL,
  "version_no" bigint NOT NULL,
  "name" varchar(100) NOT NULL,
  "contact_info" text,
  "personal_profile" text,
  "employment_arrangement" text,
  "professional_editor_id" uuid,
  "professional_edited_at" timestamptz,
  "operation_id" uuid NOT NULL,
  "public_name" varchar(100),
  "public_specialty" text,
  "public_intro" text,
  "public_enabled" boolean NOT NULL,
  PRIMARY KEY ("employee_revision_id"),
  UNIQUE ("employee_id","version_no")
);
CREATE TABLE adc."employee_revision_skill" (
  "employee_revision_id" uuid NOT NULL,
  "skill_name" varchar(120) NOT NULL,
  PRIMARY KEY ("employee_revision_id","skill_name")
);
CREATE TABLE adc."clinic" (
  "clinic_id" uuid NOT NULL,
  "name" varchar(150) NOT NULL,
  "address" text,
  "contact_info" text,
  "manager_id" uuid,
  "area_value" numeric(18,2),
  "area_unit" text,
  "created_by" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_by" uuid NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "row_version" bigint NOT NULL DEFAULT 1,
  PRIMARY KEY ("clinic_id")
);
CREATE TABLE adc."clinic_revision" (
  "clinic_revision_id" uuid NOT NULL,
  "clinic_id" uuid NOT NULL,
  "version_no" bigint NOT NULL,
  "name" varchar(150) NOT NULL,
  "address" text,
  "contact_info" text,
  "manager_id" uuid,
  "area_value" numeric(18,2),
  "area_unit" text,
  "created_by" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  "updated_by" uuid NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "operation_id" uuid NOT NULL,
  PRIMARY KEY ("clinic_revision_id"),
  UNIQUE ("clinic_id","version_no")
);
CREATE TABLE adc."clinic_availability_plan" (
  "availability_id" uuid NOT NULL,
  "clinic_id" uuid NOT NULL,
  "effective_from" timestamptz NOT NULL,
  "effective_to" timestamptz,
  "business_enabled" boolean NOT NULL,
  "reason" text,
  PRIMARY KEY ("availability_id")
);
CREATE TABLE adc."practice_assignment" (
  "practice_id" uuid NOT NULL,
  "employee_id" uuid NOT NULL,
  "clinic_id" uuid NOT NULL,
  "valid_from" date NOT NULL,
  "valid_to" date,
  "practice_arrangement" text NOT NULL,
  "affected_arrangements" text,
  "updated_by" uuid NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "row_version" bigint NOT NULL DEFAULT 1,
  PRIMARY KEY ("practice_id")
);
CREATE TABLE adc."doctor_schedule" (
  "schedule_id" uuid NOT NULL,
  "doctor_id" uuid NOT NULL,
  "clinic_id" uuid NOT NULL,
  "starts_at" timestamptz NOT NULL,
  "ends_at" timestamptz NOT NULL,
  "can_receive" boolean NOT NULL,
  "change_reason" text,
  "row_version" bigint NOT NULL DEFAULT 1,
  "public_status" varchar(20) NOT NULL,
  "capacity_limit" integer NOT NULL,
  PRIMARY KEY ("schedule_id"),
  UNIQUE ("schedule_id","clinic_id","doctor_id")
);
CREATE TABLE adc."schedule_revision" (
  "schedule_revision_id" uuid NOT NULL,
  "schedule_id" uuid NOT NULL,
  "version_no" bigint NOT NULL,
  "doctor_id" uuid NOT NULL,
  "clinic_id" uuid NOT NULL,
  "starts_at" timestamptz NOT NULL,
  "ends_at" timestamptz NOT NULL,
  "can_receive" boolean NOT NULL,
  "change_reason" text,
  "operation_id" uuid NOT NULL,
  "public_status" varchar(20) NOT NULL,
  "capacity_limit" integer NOT NULL,
  PRIMARY KEY ("schedule_revision_id"),
  UNIQUE ("schedule_id","version_no")
);
CREATE TABLE adc."appointment" (
  "appointment_id" uuid NOT NULL,
  "patient_id" uuid,
  "clinic_id" uuid NOT NULL,
  "doctor_id" uuid NOT NULL,
  "scheduled_at" timestamptz NOT NULL,
  "cancelled_at" timestamptz,
  "confirmation_note" text,
  "row_version" bigint NOT NULL DEFAULT 1,
  "booking_subject_id" uuid,
  "booked_name" varchar(100) NOT NULL,
  "booked_contact" varchar(200) NOT NULL,
  "schedule_id" uuid NOT NULL,
  "schedule_row_version" bigint NOT NULL,
  "service_version_id" uuid NOT NULL,
  "scheduled_end_at" timestamptz NOT NULL,
  "rule_version_id" uuid NOT NULL,
  "cancel_cutoff_at" timestamptz NOT NULL,
  "reschedule_cutoff_at" timestamptz NOT NULL,
  "disposition" varchar(20) NOT NULL,
  "cancel_channel" varchar(30),
  "cancel_reason" text,
  "no_show_verified_at" timestamptz,
  "no_show_verified_by" uuid,
  "no_show_basis" text,
  PRIMARY KEY ("appointment_id")
);
CREATE TABLE adc."appointment_revision" (
  "appointment_revision_id" uuid NOT NULL,
  "appointment_id" uuid NOT NULL,
  "version_no" bigint NOT NULL,
  "patient_id" uuid,
  "clinic_id" uuid NOT NULL,
  "doctor_id" uuid NOT NULL,
  "scheduled_at" timestamptz NOT NULL,
  "cancelled_at" timestamptz,
  "confirmation_note" text,
  "operation_id" uuid NOT NULL,
  "booking_subject_id" uuid,
  "booked_name" varchar(100) NOT NULL,
  "booked_contact" varchar(200) NOT NULL,
  "schedule_id" uuid NOT NULL,
  "schedule_row_version" bigint NOT NULL,
  "service_version_id" uuid NOT NULL,
  "scheduled_end_at" timestamptz NOT NULL,
  "rule_version_id" uuid NOT NULL,
  "cancel_cutoff_at" timestamptz NOT NULL,
  "reschedule_cutoff_at" timestamptz NOT NULL,
  "disposition" varchar(20) NOT NULL,
  "cancel_channel" varchar(30),
  "cancel_reason" text,
  "no_show_verified_at" timestamptz,
  "no_show_verified_by" uuid,
  "no_show_basis" text,
  PRIMARY KEY ("appointment_revision_id"),
  UNIQUE ("appointment_id","version_no"),
  UNIQUE ("appointment_revision_id","appointment_id")
);
CREATE TABLE adc."appointment_contact" (
  "contact_id" uuid NOT NULL,
  "appointment_id" uuid NOT NULL,
  "contacted_at" timestamptz NOT NULL,
  "employee_id" uuid NOT NULL,
  "result_note" text NOT NULL,
  "next_action" text,
  "reached_patient" boolean NOT NULL,
  PRIMARY KEY ("contact_id")
);
CREATE TABLE adc."visit" (
  "visit_id" uuid NOT NULL,
  "patient_id" uuid NOT NULL,
  "clinic_id" uuid NOT NULL,
  "appointment_id" uuid UNIQUE,
  "registrar_id" uuid NOT NULL,
  "doctor_id" uuid NOT NULL,
  "arrived_at" timestamptz NOT NULL,
  "started_at" timestamptz,
  "ended_at" timestamptz,
  "left_at" timestamptz,
  "row_version" bigint NOT NULL DEFAULT 1,
  "appointment_revision_id" uuid,
  "progress_basis" text NOT NULL,
  PRIMARY KEY ("visit_id")
);
CREATE TABLE adc."visit_revision" (
  "visit_revision_id" uuid NOT NULL,
  "visit_id" uuid NOT NULL,
  "version_no" bigint NOT NULL,
  "patient_id" uuid NOT NULL,
  "clinic_id" uuid NOT NULL,
  "appointment_id" uuid,
  "registrar_id" uuid NOT NULL,
  "doctor_id" uuid NOT NULL,
  "arrived_at" timestamptz NOT NULL,
  "started_at" timestamptz,
  "ended_at" timestamptz,
  "left_at" timestamptz,
  "operation_id" uuid NOT NULL,
  "appointment_revision_id" uuid,
  "progress_basis" text NOT NULL,
  PRIMARY KEY ("visit_revision_id"),
  UNIQUE ("visit_id","version_no"),
  UNIQUE ("visit_revision_id","visit_id")
);
CREATE TABLE adc."visit_nurse" (
  "visit_id" uuid NOT NULL,
  "nurse_id" uuid NOT NULL,
  PRIMARY KEY ("visit_id","nurse_id")
);
CREATE TABLE adc."visit_revision_nurse" (
  "visit_revision_id" uuid NOT NULL,
  "nurse_id" uuid NOT NULL,
  PRIMARY KEY ("visit_revision_id","nurse_id")
);
CREATE TABLE adc."business_operation" (
  "operation_id" uuid NOT NULL,
  "actor_id" uuid,
  "analysis_id" uuid,
  "occurred_at" timestamptz NOT NULL,
  "action_code" text NOT NULL,
  "subject_kind" text NOT NULL,
  "subject_key" text NOT NULL,
  "before_content" jsonb,
  "after_content" jsonb,
  "reason" text,
  "access_scope" jsonb,
  "patient_actor_id" uuid,
  PRIMARY KEY ("operation_id")
);
CREATE TABLE adc."operation_clinic" (
  "operation_id" uuid NOT NULL,
  "clinic_id" uuid NOT NULL,
  PRIMARY KEY ("operation_id","clinic_id")
);
CREATE TABLE adc."command_dedup" (
  "request_key" varchar(64) NOT NULL,
  "actor_id" uuid,
  "command_code" text NOT NULL,
  "payload_fingerprint" text NOT NULL,
  "operation_id" uuid NOT NULL UNIQUE,
  "result_kind" text NOT NULL,
  "result_key" text NOT NULL,
  "patient_actor_id" uuid,
  PRIMARY KEY ("request_key")
);
CREATE TABLE adc."patient_booking_subject" (
  "booking_subject_id" uuid NOT NULL,
  "verified_identity_key" varchar(200) UNIQUE,
  "verification_kind" varchar(20) NOT NULL,
  "verified_by" uuid,
  "verified_at" timestamptz NOT NULL,
  "contact_value" varchar(200) NOT NULL,
  "patient_id" uuid,
  "row_version" bigint NOT NULL,
  PRIMARY KEY ("booking_subject_id")
);
CREATE TABLE adc."clinic_booking_rule_version" (
  "rule_version_id" uuid NOT NULL,
  "clinic_id" uuid NOT NULL,
  "version_no" bigint NOT NULL,
  "effective_from" timestamptz NOT NULL,
  "self_cancel_lead_minutes" integer NOT NULL,
  "self_reschedule_lead_minutes" integer NOT NULL,
  "self_service_enabled" boolean NOT NULL,
  "created_by" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  PRIMARY KEY ("rule_version_id"),
  UNIQUE ("clinic_id","version_no"),
  UNIQUE ("clinic_id","effective_from"),
  UNIQUE ("rule_version_id","clinic_id")
);
CREATE TABLE adc."booking_service_version" (
  "service_version_id" uuid NOT NULL,
  "clinic_id" uuid NOT NULL,
  "doctor_id" uuid NOT NULL,
  "service_code" varchar(80) NOT NULL,
  "version_no" bigint NOT NULL,
  "service_name" varchar(120) NOT NULL,
  "duration_minutes" integer NOT NULL,
  "effective_from" timestamptz NOT NULL,
  "enabled" boolean NOT NULL,
  "created_by" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  PRIMARY KEY ("service_version_id"),
  UNIQUE ("clinic_id","doctor_id","service_code","version_no"),
  UNIQUE ("clinic_id","doctor_id","service_code","effective_from"),
  UNIQUE ("service_version_id","clinic_id","doctor_id")
);
CREATE TABLE adc."clinical_record" (
  "record_id" uuid NOT NULL,
  "visit_id" uuid NOT NULL UNIQUE,
  "clinical_at" timestamptz NOT NULL,
  "body" text,
  "pending_note" text,
  "row_version" bigint NOT NULL DEFAULT 1,
  "completeness" varchar(20) NOT NULL,
  PRIMARY KEY ("record_id")
);
CREATE TABLE adc."clinical_record_writer" (
  "record_id" uuid NOT NULL,
  "doctor_id" uuid NOT NULL,
  PRIMARY KEY ("record_id","doctor_id")
);
CREATE TABLE adc."clinical_record_revision" (
  "record_revision_id" uuid NOT NULL,
  "record_id" uuid NOT NULL,
  "version_no" bigint NOT NULL,
  "visit_id" uuid NOT NULL,
  "clinical_at" timestamptz NOT NULL,
  "body" text,
  "pending_note" text,
  "operation_id" uuid NOT NULL,
  "completeness" varchar(20) NOT NULL,
  PRIMARY KEY ("record_revision_id"),
  UNIQUE ("record_id","version_no")
);
CREATE TABLE adc."record_revision_writer" (
  "record_revision_id" uuid NOT NULL,
  "doctor_id" uuid NOT NULL,
  PRIMARY KEY ("record_revision_id","doctor_id")
);
CREATE TABLE adc."treatment" (
  "treatment_id" uuid NOT NULL,
  "visit_id" uuid NOT NULL,
  "item_id" uuid NOT NULL,
  "confirming_doctor_id" uuid NOT NULL,
  "performed_at" timestamptz NOT NULL,
  "row_version" bigint NOT NULL DEFAULT 1,
  "confirmed_at" timestamptz NOT NULL,
  PRIMARY KEY ("treatment_id")
);
CREATE TABLE adc."treatment_tooth" (
  "treatment_id" uuid NOT NULL,
  "tooth_code" varchar(40) NOT NULL,
  PRIMARY KEY ("treatment_id","tooth_code")
);
CREATE TABLE adc."treatment_revision" (
  "treatment_revision_id" uuid NOT NULL,
  "treatment_id" uuid NOT NULL,
  "version_no" bigint NOT NULL,
  "visit_id" uuid NOT NULL,
  "item_id" uuid NOT NULL,
  "confirming_doctor_id" uuid NOT NULL,
  "performed_at" timestamptz NOT NULL,
  "operation_id" uuid NOT NULL,
  "confirmed_at" timestamptz NOT NULL,
  PRIMARY KEY ("treatment_revision_id"),
  UNIQUE ("treatment_id","version_no"),
  UNIQUE ("treatment_revision_id","treatment_id")
);
CREATE TABLE adc."treatment_revision_tooth" (
  "treatment_revision_id" uuid NOT NULL,
  "tooth_code" varchar(40) NOT NULL,
  PRIMARY KEY ("treatment_revision_id","tooth_code")
);
CREATE TABLE adc."clinical_image" (
  "image_id" uuid NOT NULL,
  "visit_id" uuid NOT NULL,
  "file_id" uuid NOT NULL,
  "archived_by" uuid NOT NULL,
  "image_type" text NOT NULL,
  "formed_at" timestamptz NOT NULL,
  "description" text,
  "row_version" bigint NOT NULL DEFAULT 1,
  PRIMARY KEY ("image_id")
);
CREATE TABLE adc."clinical_image_revision" (
  "image_revision_id" uuid NOT NULL,
  "image_id" uuid NOT NULL,
  "version_no" bigint NOT NULL,
  "visit_id" uuid NOT NULL,
  "file_id" uuid NOT NULL,
  "archived_by" uuid NOT NULL,
  "image_type" text NOT NULL,
  "formed_at" timestamptz NOT NULL,
  "description" text,
  "operation_id" uuid NOT NULL,
  PRIMARY KEY ("image_revision_id"),
  UNIQUE ("image_id","version_no")
);
CREATE TABLE adc."file_asset" (
  "file_id" uuid NOT NULL,
  "storage_key" text NOT NULL,
  "media_type" text NOT NULL,
  "byte_size" bigint NOT NULL,
  "content_digest" text NOT NULL,
  "availability_note" text,
  "created_by" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  "lifecycle_state" varchar(20) NOT NULL,
  PRIMARY KEY ("file_id")
);
CREATE TABLE adc."lab_order" (
  "lab_order_id" uuid NOT NULL,
  "treatment_id" uuid NOT NULL,
  "request_doctor_id" uuid NOT NULL,
  "lab_party" text NOT NULL,
  "progress_pending_note" text,
  "updated_by" uuid NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "row_version" bigint NOT NULL DEFAULT 1,
  "current_received_handover_id" uuid,
  "current_review_id" uuid,
  "has_open_usability_issue" boolean NOT NULL DEFAULT false,
  "current_expected_return_at" timestamptz,
  PRIMARY KEY ("lab_order_id")
);
CREATE TABLE adc."lab_requirement_version" (
  "requirement_id" uuid NOT NULL,
  "lab_order_id" uuid NOT NULL,
  "version_no" bigint NOT NULL,
  "requirement_text" text NOT NULL,
  "expected_return_at" timestamptz,
  "doctor_id" uuid NOT NULL,
  "recorded_at" timestamptz NOT NULL,
  "operation_id" uuid NOT NULL,
  PRIMARY KEY ("requirement_id"),
  UNIQUE ("lab_order_id","version_no"),
  UNIQUE ("requirement_id","lab_order_id")
);
CREATE TABLE adc."lab_handover" (
  "handover_id" uuid NOT NULL,
  "lab_order_id" uuid NOT NULL,
  "requirement_id" uuid NOT NULL,
  "employee_id" uuid NOT NULL,
  "direction" text NOT NULL,
  "occurred_at" timestamptz NOT NULL,
  "handover_content" text NOT NULL,
  "matches_requirement" boolean,
  "operation_id" uuid NOT NULL,
  PRIMARY KEY ("handover_id"),
  UNIQUE ("handover_id","requirement_id"),
  UNIQUE ("handover_id","lab_order_id")
);
CREATE TABLE adc."lab_review" (
  "review_id" uuid NOT NULL,
  "requirement_id" uuid NOT NULL,
  "received_handover_id" uuid NOT NULL,
  "doctor_id" uuid NOT NULL,
  "conclusion" text NOT NULL,
  "reviewed_at" timestamptz NOT NULL,
  "is_usable" boolean NOT NULL,
  "operation_id" uuid NOT NULL,
  PRIMARY KEY ("review_id"),
  UNIQUE ("review_id","received_handover_id")
);
CREATE TABLE adc."treatment_item" (
  "item_id" uuid NOT NULL,
  "name" text NOT NULL,
  "charge_unit" text NOT NULL,
  "activation_arrangement" text NOT NULL,
  "row_version" bigint NOT NULL DEFAULT 1,
  PRIMARY KEY ("item_id")
);
CREATE TABLE adc."item_price_version" (
  "price_version_id" uuid NOT NULL,
  "item_id" uuid NOT NULL,
  "amount" numeric(18,4) NOT NULL,
  "effective_from" timestamptz NOT NULL,
  "effective_to" timestamptz,
  "version_no" bigint NOT NULL,
  "created_by" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  "operation_id" uuid NOT NULL,
  PRIMARY KEY ("price_version_id"),
  UNIQUE ("item_id","version_no")
);
CREATE TABLE adc."item_price_clinic" (
  "price_version_id" uuid NOT NULL,
  "clinic_id" uuid NOT NULL,
  PRIMARY KEY ("price_version_id","clinic_id")
);
CREATE TABLE adc."treatment_bill" (
  "bill_id" uuid NOT NULL,
  "visit_id" uuid NOT NULL UNIQUE,
  "creator_id" uuid NOT NULL,
  "opened_at" timestamptz NOT NULL,
  "row_version" bigint NOT NULL DEFAULT 1,
  PRIMARY KEY ("bill_id")
);
CREATE TABLE adc."bill_staff" (
  "bill_id" uuid NOT NULL,
  "employee_id" uuid NOT NULL,
  PRIMARY KEY ("bill_id","employee_id")
);
CREATE TABLE adc."treatment_bill_line" (
  "bill_line_id" uuid NOT NULL,
  "bill_id" uuid NOT NULL,
  "treatment_id" uuid NOT NULL UNIQUE,
  "price_version_id" uuid NOT NULL,
  "quantity" numeric(18,4) NOT NULL,
  "adopted_unit_price" numeric(18,4) NOT NULL,
  PRIMARY KEY ("bill_line_id")
);
CREATE TABLE adc."bill_revision" (
  "bill_revision_id" uuid NOT NULL,
  "bill_id" uuid NOT NULL,
  "version_no" bigint NOT NULL,
  "visit_id" uuid NOT NULL,
  "creator_id" uuid NOT NULL,
  "opened_at" timestamptz NOT NULL,
  "operation_id" uuid NOT NULL,
  "visit_revision_id" uuid NOT NULL,
  PRIMARY KEY ("bill_revision_id"),
  UNIQUE ("bill_id","version_no"),
  UNIQUE ("bill_revision_id","bill_id")
);
CREATE TABLE adc."bill_revision_staff" (
  "bill_revision_id" uuid NOT NULL,
  "employee_id" uuid NOT NULL,
  PRIMARY KEY ("bill_revision_id","employee_id")
);
CREATE TABLE adc."bill_revision_line" (
  "revision_line_id" uuid NOT NULL,
  "bill_revision_id" uuid NOT NULL,
  "bill_line_id" uuid NOT NULL,
  "treatment_id" uuid NOT NULL,
  "price_version_id" uuid NOT NULL,
  "quantity" numeric(18,4) NOT NULL,
  "adopted_unit_price" numeric(18,4) NOT NULL,
  "treatment_revision_id" uuid NOT NULL,
  "item_name" text NOT NULL,
  "charge_unit" text NOT NULL,
  PRIMARY KEY ("revision_line_id"),
  UNIQUE ("bill_revision_id","bill_line_id")
);
CREATE TABLE adc."receipt" (
  "receipt_id" uuid NOT NULL,
  "bill_id" uuid UNIQUE,
  "sale_id" uuid UNIQUE,
  "collector_id" uuid NOT NULL,
  "amount" numeric(18,2) NOT NULL,
  "payment_method" text NOT NULL,
  "received_at" timestamptz NOT NULL,
  "row_version" bigint NOT NULL DEFAULT 1,
  "registered_at" timestamptz NOT NULL,
  "recording_reason" text,
  PRIMARY KEY ("receipt_id")
);
CREATE TABLE adc."receipt_revision" (
  "receipt_revision_id" uuid NOT NULL,
  "receipt_id" uuid NOT NULL,
  "version_no" bigint NOT NULL,
  "bill_id" uuid,
  "sale_id" uuid,
  "collector_id" uuid NOT NULL,
  "amount" numeric(18,2) NOT NULL,
  "payment_method" text NOT NULL,
  "received_at" timestamptz NOT NULL,
  "operation_id" uuid NOT NULL,
  "bill_revision_id" uuid,
  "sale_revision_id" uuid,
  "registered_at" timestamptz NOT NULL,
  "recording_reason" text,
  PRIMARY KEY ("receipt_revision_id"),
  UNIQUE ("receipt_id","version_no"),
  UNIQUE ("receipt_revision_id","receipt_id")
);
CREATE TABLE adc."product_sale" (
  "sale_id" uuid NOT NULL,
  "patient_id" uuid NOT NULL,
  "clinic_id" uuid NOT NULL,
  "creator_id" uuid NOT NULL,
  "opened_at" timestamptz NOT NULL,
  "row_version" bigint NOT NULL DEFAULT 1,
  PRIMARY KEY ("sale_id")
);
CREATE TABLE adc."product_sale_line" (
  "sale_line_id" uuid NOT NULL,
  "sale_id" uuid NOT NULL,
  "material_id" uuid NOT NULL,
  "quantity" numeric(18,4) NOT NULL,
  "adopted_unit_price" numeric(18,4) NOT NULL,
  PRIMARY KEY ("sale_line_id")
);
CREATE TABLE adc."product_delivery_line" (
  "delivery_line_id" uuid NOT NULL,
  "sale_line_id" uuid NOT NULL,
  "stock_id" uuid NOT NULL,
  "delivered_quantity" numeric(18,4) NOT NULL,
  "delivered_at" timestamptz NOT NULL,
  "delivered_by" uuid NOT NULL,
  "operation_id" uuid NOT NULL,
  PRIMARY KEY ("delivery_line_id"),
  UNIQUE ("sale_line_id","stock_id")
);
CREATE TABLE adc."sale_revision" (
  "sale_revision_id" uuid NOT NULL,
  "sale_id" uuid NOT NULL,
  "version_no" bigint NOT NULL,
  "patient_id" uuid NOT NULL,
  "clinic_id" uuid NOT NULL,
  "creator_id" uuid NOT NULL,
  "opened_at" timestamptz NOT NULL,
  "operation_id" uuid NOT NULL,
  PRIMARY KEY ("sale_revision_id"),
  UNIQUE ("sale_id","version_no"),
  UNIQUE ("sale_revision_id","sale_id")
);
CREATE TABLE adc."sale_revision_line" (
  "sale_revision_line_id" uuid NOT NULL,
  "sale_revision_id" uuid NOT NULL,
  "sale_line_id" uuid NOT NULL,
  "material_id" uuid NOT NULL,
  "classification" text NOT NULL,
  "unit" text NOT NULL,
  "quantity" numeric(18,4) NOT NULL,
  "adopted_unit_price" numeric(18,4) NOT NULL,
  PRIMARY KEY ("sale_revision_line_id"),
  UNIQUE ("sale_revision_id","sale_line_id")
);
CREATE TABLE adc."material" (
  "material_id" uuid NOT NULL,
  "name" text NOT NULL,
  "classification" text NOT NULL,
  "unit" text NOT NULL,
  "specification" text,
  "activation_arrangement" text NOT NULL,
  "updated_by" uuid NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "row_version" bigint NOT NULL DEFAULT 1,
  PRIMARY KEY ("material_id")
);
CREATE TABLE adc."stock_balance" (
  "stock_id" uuid NOT NULL,
  "clinic_id" uuid NOT NULL,
  "material_id" uuid NOT NULL,
  "batch_reference" text,
  "expires_on" date,
  "unit" text NOT NULL,
  "quantity" numeric(18,4) NOT NULL,
  "row_version" bigint NOT NULL DEFAULT 1,
  PRIMARY KEY ("stock_id"),
  UNIQUE ("clinic_id","material_id","batch_reference","expires_on")
);
CREATE TABLE adc."stock_movement" (
  "movement_id" uuid NOT NULL,
  "stock_id" uuid NOT NULL,
  "occurred_at" timestamptz NOT NULL,
  "quantity_delta" numeric(18,4) NOT NULL,
  "receipt_id" uuid,
  "issue_revision_id" uuid,
  "delivery_line_id" uuid,
  "stocktake_line_id" uuid,
  "operation_id" uuid NOT NULL,
  "stock_version_before" bigint NOT NULL,
  "stock_version_after" bigint NOT NULL,
  PRIMARY KEY ("movement_id"),
  UNIQUE ("operation_id","receipt_id","stock_id"),
  UNIQUE ("operation_id","issue_revision_id","stock_id"),
  UNIQUE ("operation_id","delivery_line_id","stock_id"),
  UNIQUE ("operation_id","stocktake_line_id","stock_id"),
  UNIQUE ("delivery_line_id"),
  UNIQUE ("receipt_id")
);
CREATE TABLE adc."followup_plan" (
  "plan_id" uuid NOT NULL,
  "enabled" boolean NOT NULL,
  "row_version" bigint NOT NULL DEFAULT 1,
  PRIMARY KEY ("plan_id")
);
CREATE TABLE adc."followup_plan_version" (
  "plan_version_id" uuid NOT NULL,
  "plan_id" uuid NOT NULL,
  "item_id" uuid NOT NULL,
  "version_no" bigint NOT NULL,
  "configured_by" uuid NOT NULL,
  "configured_at" timestamptz NOT NULL,
  "effective_from" timestamptz NOT NULL,
  "effective_to" timestamptz,
  "operation_id" uuid NOT NULL,
  PRIMARY KEY ("plan_version_id"),
  UNIQUE ("plan_id","version_no")
);
CREATE TABLE adc."followup_plan_clinic" (
  "plan_version_id" uuid NOT NULL,
  "clinic_id" uuid NOT NULL,
  PRIMARY KEY ("plan_version_id","clinic_id")
);
CREATE TABLE adc."followup_plan_node" (
  "node_id" uuid NOT NULL,
  "plan_version_id" uuid NOT NULL,
  "time_arrangement" text NOT NULL,
  "contact_content" text NOT NULL,
  "clinical_purpose" text NOT NULL,
  PRIMARY KEY ("node_id"),
  UNIQUE ("node_id","plan_version_id")
);
CREATE TABLE adc."followup_task" (
  "followup_id" uuid NOT NULL,
  "treatment_id" uuid NOT NULL,
  "plan_version_id" uuid,
  "node_id" uuid,
  "doctor_instruction" text,
  "instruction_doctor_id" uuid,
  "planned_at" timestamptz NOT NULL,
  "planned_content" text NOT NULL,
  "responsible_id" uuid NOT NULL,
  "next_action" text,
  "updated_by" uuid NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "row_version" bigint NOT NULL DEFAULT 1,
  PRIMARY KEY ("followup_id")
);
CREATE TABLE adc."followup_contact" (
  "followup_contact_id" uuid NOT NULL,
  "followup_id" uuid NOT NULL,
  "employee_id" uuid NOT NULL,
  "contacted_at" timestamptz NOT NULL,
  "channel" text NOT NULL,
  "result_feedback" text NOT NULL,
  "next_action" text,
  "reached_patient" boolean NOT NULL,
  "operation_id" uuid NOT NULL,
  PRIMARY KEY ("followup_contact_id")
);
CREATE TABLE adc."followup_issue" (
  "followup_issue_id" uuid NOT NULL,
  "followup_id" uuid NOT NULL,
  "problem" text NOT NULL,
  "doctor_id" uuid,
  "progress_conclusion" text,
  "resolved_at" timestamptz,
  "source_contact_id" uuid,
  "clinical_record_id" uuid,
  "clinical_basis" text,
  "recorded_by" uuid,
  "recorded_at" timestamptz,
  PRIMARY KEY ("followup_issue_id")
);
CREATE TABLE adc."supplier" (
  "supplier_id" uuid NOT NULL,
  "name" text NOT NULL,
  "contact_info" text,
  "cooperation_info" text,
  "activation_arrangement" text NOT NULL,
  "pending_note" text,
  "updated_by" uuid NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "row_version" bigint NOT NULL DEFAULT 1,
  PRIMARY KEY ("supplier_id")
);
CREATE TABLE adc."supplier_file" (
  "supplier_file_id" uuid NOT NULL,
  "supplier_id" uuid NOT NULL,
  "file_id" uuid NOT NULL,
  "file_purpose" text NOT NULL,
  PRIMARY KEY ("supplier_file_id")
);
CREATE TABLE adc."stock_receipt" (
  "stock_receipt_id" uuid NOT NULL,
  "stock_id" uuid NOT NULL,
  "supplier_id" uuid NOT NULL,
  "registrar_id" uuid NOT NULL,
  "quantity" numeric(18,4) NOT NULL,
  "unit" text NOT NULL,
  "received_at" timestamptz NOT NULL,
  "unit_price" numeric(18,4),
  "batch_expiry_note" text,
  "pending_note" text,
  "row_version" bigint NOT NULL DEFAULT 1,
  "source_reference" text NOT NULL,
  "file_id" uuid,
  "registered_at" timestamptz NOT NULL,
  "operation_id" uuid NOT NULL,
  PRIMARY KEY ("stock_receipt_id")
);
CREATE TABLE adc."material_issue" (
  "issue_id" uuid NOT NULL,
  "stock_id" uuid NOT NULL,
  "recipient_id" uuid NOT NULL,
  "registrar_id" uuid NOT NULL,
  "quantity" numeric(18,4) NOT NULL,
  "unit" text NOT NULL,
  "issued_at" timestamptz NOT NULL,
  "cost_unit_price" numeric(18,4),
  "pending_note" text,
  "row_version" bigint NOT NULL DEFAULT 1,
  PRIMARY KEY ("issue_id")
);
CREATE TABLE adc."issue_revision" (
  "issue_revision_id" uuid NOT NULL,
  "issue_id" uuid NOT NULL,
  "version_no" bigint NOT NULL,
  "stock_id" uuid NOT NULL,
  "recipient_id" uuid NOT NULL,
  "registrar_id" uuid NOT NULL,
  "quantity" numeric(18,4) NOT NULL,
  "unit" text NOT NULL,
  "issued_at" timestamptz NOT NULL,
  "cost_unit_price" numeric(18,4),
  "pending_note" text,
  "operation_id" uuid NOT NULL,
  PRIMARY KEY ("issue_revision_id"),
  UNIQUE ("issue_id","version_no"),
  UNIQUE ("issue_revision_id","issue_id")
);
CREATE TABLE adc."stocktake" (
  "stocktake_id" uuid NOT NULL,
  "clinic_id" uuid NOT NULL,
  "initiator_id" uuid NOT NULL,
  "scope_note" text NOT NULL,
  "baseline_at" timestamptz NOT NULL,
  "row_version" bigint NOT NULL DEFAULT 1,
  "processed_at" timestamptz,
  "processed_by" uuid,
  PRIMARY KEY ("stocktake_id")
);
CREATE TABLE adc."stocktake_line" (
  "stocktake_line_id" uuid NOT NULL,
  "stocktake_id" uuid NOT NULL,
  "stock_id" uuid NOT NULL,
  "unit" text NOT NULL,
  "baseline_quantity" numeric(18,4) NOT NULL,
  "counted_at" timestamptz,
  "counted_quantity" numeric(18,4),
  "period_net_movement" numeric(18,4),
  "reason_pending_note" text,
  "actual_adjustment" numeric(18,4),
  "baseline_stock_version" bigint NOT NULL,
  "counted_by" uuid,
  PRIMARY KEY ("stocktake_line_id"),
  UNIQUE ("stocktake_id","stock_id")
);
CREATE TABLE adc."qualification_version" (
  "qualification_version_id" uuid NOT NULL,
  "qualification_id" uuid NOT NULL,
  "certificate_name" text NOT NULL,
  "certificate_number" text,
  "source_validity" text,
  "pending_note" text,
  "review_conclusion" text,
  "version_no" bigint NOT NULL,
  "updated_by" uuid NOT NULL,
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("qualification_version_id"),
  UNIQUE ("qualification_id","version_no")
);
CREATE TABLE adc."staff_account" (
  "account_id" uuid NOT NULL,
  "employee_id" uuid NOT NULL UNIQUE,
  "login_name" varchar(100) NOT NULL UNIQUE,
  "credential_verifier" text NOT NULL,
  "account_scope" text,
  "activation_arrangement" text NOT NULL,
  "opened_at" timestamptz NOT NULL,
  "disabled_at" timestamptz,
  "maintained_by" uuid NOT NULL,
  "maintained_at" timestamptz NOT NULL,
  "row_version" bigint NOT NULL DEFAULT 1,
  PRIMARY KEY ("account_id")
);
CREATE TABLE adc."security_role" (
  "role_id" uuid NOT NULL,
  "name" varchar(100) NOT NULL,
  "responsibility" text,
  "row_version" bigint NOT NULL DEFAULT 1,
  PRIMARY KEY ("role_id")
);
CREATE TABLE adc."role_function" (
  "role_version_id" uuid NOT NULL,
  "function_code" varchar(80) NOT NULL,
  PRIMARY KEY ("role_version_id","function_code")
);
CREATE TABLE adc."access_grant" (
  "grant_id" uuid NOT NULL,
  "account_id" uuid NOT NULL,
  "version_no" bigint NOT NULL,
  "effective_from" timestamptz NOT NULL,
  "effective_to" timestamptz,
  "object_scope" text,
  "configured_by" uuid NOT NULL,
  "configured_at" timestamptz NOT NULL,
  PRIMARY KEY ("grant_id"),
  UNIQUE ("account_id","version_no")
);
CREATE TABLE adc."grant_role" (
  "grant_id" uuid NOT NULL,
  "role_version_id" uuid NOT NULL,
  PRIMARY KEY ("grant_id","role_version_id")
);
CREATE TABLE adc."grant_clinic" (
  "grant_id" uuid NOT NULL,
  "clinic_id" uuid NOT NULL,
  PRIMARY KEY ("grant_id","clinic_id")
);
CREATE TABLE adc."grant_field" (
  "grant_field_id" uuid NOT NULL,
  "grant_id" uuid NOT NULL,
  "resource_code" varchar(80) NOT NULL,
  "field_code" varchar(100) NOT NULL,
  "action_code" varchar(40) NOT NULL,
  PRIMARY KEY ("grant_field_id"),
  UNIQUE ("grant_id","resource_code","field_code","action_code")
);
CREATE TABLE adc."operating_expense" (
  "expense_id" uuid NOT NULL,
  "clinic_id" uuid NOT NULL,
  "creator_id" uuid NOT NULL,
  "category" text NOT NULL,
  "amount" numeric(18,2) NOT NULL,
  "occurred_on" date NOT NULL,
  "pending_note" text,
  "row_version" bigint NOT NULL DEFAULT 1,
  "voucher_reference" text,
  "voucher_note" text,
  PRIMARY KEY ("expense_id")
);
CREATE TABLE adc."quarter_run" (
  "quarter_id" uuid NOT NULL,
  "quarter_label" text NOT NULL,
  "business_timezone" text NOT NULL,
  "quarter_end_at" timestamptz NOT NULL,
  "first_full_confirmed_at" timestamptz,
  "row_version" bigint NOT NULL DEFAULT 1,
  "quarter_start_at" timestamptz NOT NULL,
  "first_confirmed_result_id" uuid,
  PRIMARY KEY ("quarter_id"),
  UNIQUE ("business_timezone","quarter_start_at","quarter_end_at")
);
CREATE TABLE adc."quarter_scope" (
  "quarter_id" uuid NOT NULL,
  "clinic_id" uuid NOT NULL,
  PRIMARY KEY ("quarter_id","clinic_id")
);
CREATE TABLE adc."quarter_doctor_scope" (
  "quarter_id" uuid NOT NULL,
  "clinic_id" uuid NOT NULL,
  "doctor_id" uuid NOT NULL,
  PRIMARY KEY ("quarter_id","clinic_id","doctor_id")
);
CREATE TABLE adc."quarter_submission" (
  "submission_id" uuid NOT NULL,
  "quarter_id" uuid NOT NULL,
  "clinic_id" uuid NOT NULL,
  "version_no" bigint NOT NULL,
  "submitted_by" uuid NOT NULL,
  "submitted_at" timestamptz NOT NULL,
  "unresolved_note" text,
  "operation_id" uuid NOT NULL,
  PRIMARY KEY ("submission_id"),
  UNIQUE ("quarter_id","clinic_id","version_no"),
  UNIQUE ("submission_id","quarter_id","clinic_id")
);
CREATE TABLE adc."calculation_policy_version" (
  "policy_version_id" uuid NOT NULL,
  "version_no" bigint NOT NULL,
  "business_timezone" text NOT NULL,
  "income_rule" text NOT NULL,
  "cost_rule" text NOT NULL,
  "expense_rule" text NOT NULL,
  PRIMARY KEY ("policy_version_id")
);
CREATE TABLE adc."quarter_result_version" (
  "result_id" uuid NOT NULL,
  "quarter_id" uuid NOT NULL,
  "policy_version_id" uuid NOT NULL,
  "version_no" bigint NOT NULL,
  "confirmed_by" uuid,
  "confirmed_at" timestamptz,
  "review_state" varchar(20) NOT NULL,
  "calculated_by" uuid NOT NULL,
  "calculated_at" timestamptz NOT NULL,
  "operation_id" uuid NOT NULL,
  "previous_result_id" uuid,
  "change_reason" text,
  PRIMARY KEY ("result_id"),
  UNIQUE ("quarter_id","version_no"),
  UNIQUE ("result_id","quarter_id")
);
CREATE TABLE adc."result_submission" (
  "result_id" uuid NOT NULL,
  "clinic_id" uuid NOT NULL,
  "submission_id" uuid NOT NULL,
  "quarter_id" uuid NOT NULL,
  PRIMARY KEY ("result_id","clinic_id")
);
CREATE TABLE adc."result_review" (
  "review_id" uuid NOT NULL,
  "result_id" uuid NOT NULL,
  "employee_id" uuid NOT NULL,
  "conclusion" text NOT NULL,
  "reviewed_at" timestamptz NOT NULL,
  "decision" varchar(20) NOT NULL,
  "operation_id" uuid NOT NULL,
  PRIMARY KEY ("review_id")
);
CREATE TABLE adc."quarter_result_line" (
  "result_line_id" uuid NOT NULL,
  "result_id" uuid NOT NULL,
  "doctor_id" uuid NOT NULL,
  "clinic_id" uuid NOT NULL,
  "received_income" numeric(18,2) NOT NULL,
  "material_cost" numeric(18,2) NOT NULL,
  "quarter_id" uuid NOT NULL,
  PRIMARY KEY ("result_line_id"),
  UNIQUE ("result_id","doctor_id","clinic_id")
);
CREATE TABLE adc."expense_allocation_line" (
  "allocation_id" uuid NOT NULL,
  "result_line_id" uuid NOT NULL,
  "expense_revision_id" uuid NOT NULL,
  "adopted_amount" numeric(18,2) NOT NULL,
  "basis" text NOT NULL,
  PRIMARY KEY ("allocation_id"),
  UNIQUE ("result_line_id","expense_revision_id")
);
CREATE TABLE adc."submission_receipt" (
  "submission_id" uuid NOT NULL,
  "receipt_revision_id" uuid NOT NULL,
  "receipt_id" uuid NOT NULL,
  PRIMARY KEY ("submission_id","receipt_revision_id"),
  UNIQUE ("submission_id","receipt_id")
);
CREATE TABLE adc."submission_issue" (
  "submission_id" uuid NOT NULL,
  "issue_revision_id" uuid NOT NULL,
  "issue_id" uuid NOT NULL,
  PRIMARY KEY ("submission_id","issue_revision_id"),
  UNIQUE ("submission_id","issue_id")
);
CREATE TABLE adc."submission_expense" (
  "submission_id" uuid NOT NULL,
  "expense_revision_id" uuid NOT NULL,
  "expense_id" uuid NOT NULL,
  PRIMARY KEY ("submission_id","expense_revision_id"),
  UNIQUE ("submission_id","expense_id")
);
CREATE TABLE adc."result_income_source" (
  "income_source_id" uuid NOT NULL,
  "result_line_id" uuid NOT NULL,
  "receipt_revision_id" uuid NOT NULL,
  "adopted_amount" numeric(18,2) NOT NULL,
  "basis" text NOT NULL,
  PRIMARY KEY ("income_source_id"),
  UNIQUE ("result_line_id","receipt_revision_id")
);
CREATE TABLE adc."result_material_source" (
  "material_source_id" uuid NOT NULL,
  "result_line_id" uuid NOT NULL,
  "issue_revision_id" uuid NOT NULL,
  "adopted_cost" numeric(18,2) NOT NULL,
  "basis" text NOT NULL,
  PRIMARY KEY ("material_source_id"),
  UNIQUE ("result_line_id","issue_revision_id")
);
CREATE TABLE adc."result_unassigned_sale" (
  "unassigned_id" uuid NOT NULL,
  "result_id" uuid NOT NULL,
  "clinic_id" uuid NOT NULL,
  "receipt_revision_id" uuid NOT NULL,
  "unassigned_amount" numeric(18,2) NOT NULL,
  PRIMARY KEY ("unassigned_id"),
  UNIQUE ("result_id","receipt_revision_id")
);
CREATE TABLE adc."data_issue" (
  "issue_id" uuid NOT NULL,
  "clinic_id" uuid NOT NULL,
  "period_note" text,
  "source_locator" text NOT NULL,
  "category" text NOT NULL,
  "severity" text NOT NULL,
  "responsible_role" text NOT NULL,
  "handling_note" text,
  "notification_note" text,
  "recheck_conclusion" text,
  "reasonable_blank" text,
  "row_version" bigint NOT NULL DEFAULT 1,
  "resolution_state" varchar(20) NOT NULL,
  "rechecked_by" uuid,
  "rechecked_at" timestamptz,
  PRIMARY KEY ("issue_id")
);
CREATE TABLE adc."issue_action" (
  "issue_action_id" uuid NOT NULL,
  "issue_id" uuid NOT NULL,
  "employee_id" uuid NOT NULL,
  "occurred_at" timestamptz NOT NULL,
  "action_conclusion" text NOT NULL,
  "action_kind" varchar(20) NOT NULL,
  "source_basis" text,
  "operation_id" uuid NOT NULL,
  PRIMARY KEY ("issue_action_id")
);
CREATE TABLE adc."submission_problem" (
  "submission_id" uuid NOT NULL,
  "issue_id" uuid NOT NULL,
  "adopted_conclusion" text NOT NULL,
  PRIMARY KEY ("submission_id","issue_id")
);
CREATE TABLE adc."quarter_problem" (
  "quarter_id" uuid NOT NULL,
  "issue_id" uuid NOT NULL,
  PRIMARY KEY ("quarter_id","issue_id")
);
CREATE TABLE adc."practice_revision" (
  "practice_revision_id" uuid NOT NULL,
  "practice_id" uuid NOT NULL,
  "version_no" bigint NOT NULL,
  "employee_id" uuid NOT NULL,
  "clinic_id" uuid NOT NULL,
  "valid_from" date NOT NULL,
  "valid_to" date,
  "practice_arrangement" text NOT NULL,
  "affected_arrangements" text,
  "updated_by" uuid NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "operation_id" uuid NOT NULL,
  PRIMARY KEY ("practice_revision_id"),
  UNIQUE ("practice_id","version_no")
);
CREATE TABLE adc."expense_revision" (
  "expense_revision_id" uuid NOT NULL,
  "expense_id" uuid NOT NULL,
  "version_no" bigint NOT NULL,
  "clinic_id" uuid NOT NULL,
  "creator_id" uuid NOT NULL,
  "category" text NOT NULL,
  "amount" numeric(18,2) NOT NULL,
  "occurred_on" date NOT NULL,
  "pending_note" text,
  "operation_id" uuid NOT NULL,
  "voucher_reference" text,
  "voucher_note" text,
  PRIMARY KEY ("expense_revision_id"),
  UNIQUE ("expense_id","version_no"),
  UNIQUE ("expense_revision_id","expense_id")
);
CREATE TABLE adc."qualification" (
  "qualification_id" uuid NOT NULL,
  "employee_id" uuid NOT NULL,
  "row_version" bigint NOT NULL DEFAULT 1,
  PRIMARY KEY ("qualification_id")
);
CREATE TABLE adc."role_version" (
  "role_version_id" uuid NOT NULL,
  "role_id" uuid NOT NULL,
  "version_no" bigint NOT NULL,
  "name" text NOT NULL,
  "responsibility" text,
  "configured_by" uuid NOT NULL,
  "configured_at" timestamptz NOT NULL,
  PRIMARY KEY ("role_version_id"),
  UNIQUE ("role_id","version_no")
);
CREATE TABLE adc."qualification_file" (
  "qualification_version_id" uuid NOT NULL,
  "file_id" uuid NOT NULL,
  PRIMARY KEY ("qualification_version_id","file_id")
);
CREATE TABLE adc."analysis_run" (
  "analysis_id" uuid NOT NULL,
  "employee_id" uuid NOT NULL,
  "analysis_type" text NOT NULL,
  "period_from" timestamptz NOT NULL,
  "period_to" timestamptz NOT NULL,
  "business_timezone" text NOT NULL,
  "data_as_of" timestamptz NOT NULL,
  "statistical_rule" text NOT NULL,
  "completeness_note" text NOT NULL,
  "queried_at" timestamptz NOT NULL,
  "source_version_manifest" jsonb NOT NULL,
  "result_snapshot" jsonb NOT NULL,
  PRIMARY KEY ("analysis_id")
);
CREATE TABLE adc."analysis_scope" (
  "analysis_id" uuid NOT NULL,
  "clinic_id" uuid NOT NULL,
  PRIMARY KEY ("analysis_id","clinic_id")
);
CREATE TABLE adc."analysis_staff_scope" (
  "analysis_staff_scope_id" uuid NOT NULL,
  "analysis_id" uuid NOT NULL,
  "employee_id" uuid,
  "dimension_definition" text NOT NULL,
  PRIMARY KEY ("analysis_staff_scope_id")
);
ALTER TABLE adc."patient" ADD CONSTRAINT fk_1 FOREIGN KEY ("created_clinic_id") REFERENCES adc."clinic" ("clinic_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."patient_allergy" ADD CONSTRAINT fk_2 FOREIGN KEY ("patient_id") REFERENCES adc."patient" ("patient_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."patient_tag" ADD CONSTRAINT fk_3 FOREIGN KEY ("patient_id") REFERENCES adc."patient" ("patient_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."patient_channel" ADD CONSTRAINT fk_4 FOREIGN KEY ("patient_id") REFERENCES adc."patient" ("patient_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."patient_revision" ADD CONSTRAINT fk_5 FOREIGN KEY ("patient_id") REFERENCES adc."patient" ("patient_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."patient_revision" ADD CONSTRAINT fk_6 FOREIGN KEY ("operation_id") REFERENCES adc."business_operation" ("operation_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."patient_revision" ADD CONSTRAINT fk_7 FOREIGN KEY ("created_clinic_id") REFERENCES adc."clinic" ("clinic_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."patient_revision_allergy" ADD CONSTRAINT fk_8 FOREIGN KEY ("patient_revision_id") REFERENCES adc."patient_revision" ("patient_revision_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."patient_revision_tag" ADD CONSTRAINT fk_9 FOREIGN KEY ("patient_revision_id") REFERENCES adc."patient_revision" ("patient_revision_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."patient_revision_channel" ADD CONSTRAINT fk_10 FOREIGN KEY ("patient_revision_id") REFERENCES adc."patient_revision" ("patient_revision_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."patient_revision_channel" ADD CONSTRAINT fk_11 FOREIGN KEY ("channel_id") REFERENCES adc."patient_channel" ("channel_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."employee" ADD CONSTRAINT fk_12 FOREIGN KEY ("professional_editor_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."employee_skill" ADD CONSTRAINT fk_13 FOREIGN KEY ("employee_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."employee_revision" ADD CONSTRAINT fk_14 FOREIGN KEY ("employee_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."employee_revision" ADD CONSTRAINT fk_15 FOREIGN KEY ("professional_editor_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."employee_revision" ADD CONSTRAINT fk_16 FOREIGN KEY ("operation_id") REFERENCES adc."business_operation" ("operation_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."employee_revision_skill" ADD CONSTRAINT fk_17 FOREIGN KEY ("employee_revision_id") REFERENCES adc."employee_revision" ("employee_revision_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."clinic" ADD CONSTRAINT fk_18 FOREIGN KEY ("manager_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."clinic" ADD CONSTRAINT fk_19 FOREIGN KEY ("created_by") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."clinic" ADD CONSTRAINT fk_20 FOREIGN KEY ("updated_by") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."clinic_revision" ADD CONSTRAINT fk_21 FOREIGN KEY ("clinic_id") REFERENCES adc."clinic" ("clinic_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."clinic_revision" ADD CONSTRAINT fk_22 FOREIGN KEY ("manager_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."clinic_revision" ADD CONSTRAINT fk_23 FOREIGN KEY ("created_by") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."clinic_revision" ADD CONSTRAINT fk_24 FOREIGN KEY ("updated_by") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."clinic_revision" ADD CONSTRAINT fk_25 FOREIGN KEY ("operation_id") REFERENCES adc."business_operation" ("operation_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."clinic_availability_plan" ADD CONSTRAINT fk_26 FOREIGN KEY ("clinic_id") REFERENCES adc."clinic" ("clinic_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."practice_assignment" ADD CONSTRAINT fk_27 FOREIGN KEY ("employee_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."practice_assignment" ADD CONSTRAINT fk_28 FOREIGN KEY ("clinic_id") REFERENCES adc."clinic" ("clinic_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."practice_assignment" ADD CONSTRAINT fk_29 FOREIGN KEY ("updated_by") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."doctor_schedule" ADD CONSTRAINT fk_30 FOREIGN KEY ("doctor_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."doctor_schedule" ADD CONSTRAINT fk_31 FOREIGN KEY ("clinic_id") REFERENCES adc."clinic" ("clinic_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."schedule_revision" ADD CONSTRAINT fk_32 FOREIGN KEY ("schedule_id") REFERENCES adc."doctor_schedule" ("schedule_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."schedule_revision" ADD CONSTRAINT fk_33 FOREIGN KEY ("doctor_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."schedule_revision" ADD CONSTRAINT fk_34 FOREIGN KEY ("clinic_id") REFERENCES adc."clinic" ("clinic_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."schedule_revision" ADD CONSTRAINT fk_35 FOREIGN KEY ("operation_id") REFERENCES adc."business_operation" ("operation_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."appointment" ADD CONSTRAINT fk_36 FOREIGN KEY ("patient_id") REFERENCES adc."patient" ("patient_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."appointment" ADD CONSTRAINT fk_37 FOREIGN KEY ("clinic_id") REFERENCES adc."clinic" ("clinic_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."appointment" ADD CONSTRAINT fk_38 FOREIGN KEY ("doctor_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."appointment" ADD CONSTRAINT fk_39 FOREIGN KEY ("booking_subject_id") REFERENCES adc."patient_booking_subject" ("booking_subject_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."appointment" ADD CONSTRAINT fk_40 FOREIGN KEY ("schedule_id") REFERENCES adc."doctor_schedule" ("schedule_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."appointment" ADD CONSTRAINT fk_41 FOREIGN KEY ("service_version_id") REFERENCES adc."booking_service_version" ("service_version_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."appointment" ADD CONSTRAINT fk_42 FOREIGN KEY ("rule_version_id") REFERENCES adc."clinic_booking_rule_version" ("rule_version_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."appointment" ADD CONSTRAINT fk_43 FOREIGN KEY ("no_show_verified_by") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."appointment_revision" ADD CONSTRAINT fk_44 FOREIGN KEY ("appointment_id") REFERENCES adc."appointment" ("appointment_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."appointment_revision" ADD CONSTRAINT fk_45 FOREIGN KEY ("patient_id") REFERENCES adc."patient" ("patient_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."appointment_revision" ADD CONSTRAINT fk_46 FOREIGN KEY ("clinic_id") REFERENCES adc."clinic" ("clinic_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."appointment_revision" ADD CONSTRAINT fk_47 FOREIGN KEY ("doctor_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."appointment_revision" ADD CONSTRAINT fk_48 FOREIGN KEY ("operation_id") REFERENCES adc."business_operation" ("operation_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."appointment_revision" ADD CONSTRAINT fk_49 FOREIGN KEY ("booking_subject_id") REFERENCES adc."patient_booking_subject" ("booking_subject_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."appointment_revision" ADD CONSTRAINT fk_50 FOREIGN KEY ("schedule_id") REFERENCES adc."doctor_schedule" ("schedule_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."appointment_revision" ADD CONSTRAINT fk_51 FOREIGN KEY ("service_version_id") REFERENCES adc."booking_service_version" ("service_version_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."appointment_revision" ADD CONSTRAINT fk_52 FOREIGN KEY ("rule_version_id") REFERENCES adc."clinic_booking_rule_version" ("rule_version_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."appointment_revision" ADD CONSTRAINT fk_53 FOREIGN KEY ("no_show_verified_by") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."appointment_contact" ADD CONSTRAINT fk_54 FOREIGN KEY ("appointment_id") REFERENCES adc."appointment" ("appointment_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."appointment_contact" ADD CONSTRAINT fk_55 FOREIGN KEY ("employee_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."visit" ADD CONSTRAINT fk_56 FOREIGN KEY ("patient_id") REFERENCES adc."patient" ("patient_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."visit" ADD CONSTRAINT fk_57 FOREIGN KEY ("clinic_id") REFERENCES adc."clinic" ("clinic_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."visit" ADD CONSTRAINT fk_58 FOREIGN KEY ("appointment_id") REFERENCES adc."appointment" ("appointment_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."visit" ADD CONSTRAINT fk_59 FOREIGN KEY ("registrar_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."visit" ADD CONSTRAINT fk_60 FOREIGN KEY ("doctor_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."visit" ADD CONSTRAINT fk_61 FOREIGN KEY ("appointment_revision_id") REFERENCES adc."appointment_revision" ("appointment_revision_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."visit_revision" ADD CONSTRAINT fk_62 FOREIGN KEY ("visit_id") REFERENCES adc."visit" ("visit_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."visit_revision" ADD CONSTRAINT fk_63 FOREIGN KEY ("patient_id") REFERENCES adc."patient" ("patient_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."visit_revision" ADD CONSTRAINT fk_64 FOREIGN KEY ("clinic_id") REFERENCES adc."clinic" ("clinic_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."visit_revision" ADD CONSTRAINT fk_65 FOREIGN KEY ("appointment_id") REFERENCES adc."appointment" ("appointment_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."visit_revision" ADD CONSTRAINT fk_66 FOREIGN KEY ("registrar_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."visit_revision" ADD CONSTRAINT fk_67 FOREIGN KEY ("doctor_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."visit_revision" ADD CONSTRAINT fk_68 FOREIGN KEY ("operation_id") REFERENCES adc."business_operation" ("operation_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."visit_revision" ADD CONSTRAINT fk_69 FOREIGN KEY ("appointment_revision_id") REFERENCES adc."appointment_revision" ("appointment_revision_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."visit_nurse" ADD CONSTRAINT fk_70 FOREIGN KEY ("visit_id") REFERENCES adc."visit" ("visit_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."visit_nurse" ADD CONSTRAINT fk_71 FOREIGN KEY ("nurse_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."visit_revision_nurse" ADD CONSTRAINT fk_72 FOREIGN KEY ("visit_revision_id") REFERENCES adc."visit_revision" ("visit_revision_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."visit_revision_nurse" ADD CONSTRAINT fk_73 FOREIGN KEY ("nurse_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."business_operation" ADD CONSTRAINT fk_74 FOREIGN KEY ("actor_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."business_operation" ADD CONSTRAINT fk_75 FOREIGN KEY ("analysis_id") REFERENCES adc."analysis_run" ("analysis_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."business_operation" ADD CONSTRAINT fk_76 FOREIGN KEY ("patient_actor_id") REFERENCES adc."patient_booking_subject" ("booking_subject_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."operation_clinic" ADD CONSTRAINT fk_77 FOREIGN KEY ("operation_id") REFERENCES adc."business_operation" ("operation_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."operation_clinic" ADD CONSTRAINT fk_78 FOREIGN KEY ("clinic_id") REFERENCES adc."clinic" ("clinic_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."command_dedup" ADD CONSTRAINT fk_79 FOREIGN KEY ("actor_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."command_dedup" ADD CONSTRAINT fk_80 FOREIGN KEY ("operation_id") REFERENCES adc."business_operation" ("operation_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."command_dedup" ADD CONSTRAINT fk_81 FOREIGN KEY ("patient_actor_id") REFERENCES adc."patient_booking_subject" ("booking_subject_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."patient_booking_subject" ADD CONSTRAINT fk_82 FOREIGN KEY ("verified_by") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."patient_booking_subject" ADD CONSTRAINT fk_83 FOREIGN KEY ("patient_id") REFERENCES adc."patient" ("patient_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."clinic_booking_rule_version" ADD CONSTRAINT fk_84 FOREIGN KEY ("clinic_id") REFERENCES adc."clinic" ("clinic_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."clinic_booking_rule_version" ADD CONSTRAINT fk_85 FOREIGN KEY ("created_by") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."booking_service_version" ADD CONSTRAINT fk_86 FOREIGN KEY ("clinic_id") REFERENCES adc."clinic" ("clinic_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."booking_service_version" ADD CONSTRAINT fk_87 FOREIGN KEY ("doctor_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."booking_service_version" ADD CONSTRAINT fk_88 FOREIGN KEY ("created_by") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."clinical_record" ADD CONSTRAINT fk_89 FOREIGN KEY ("visit_id") REFERENCES adc."visit" ("visit_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."clinical_record_writer" ADD CONSTRAINT fk_90 FOREIGN KEY ("record_id") REFERENCES adc."clinical_record" ("record_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."clinical_record_writer" ADD CONSTRAINT fk_91 FOREIGN KEY ("doctor_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."clinical_record_revision" ADD CONSTRAINT fk_92 FOREIGN KEY ("record_id") REFERENCES adc."clinical_record" ("record_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."clinical_record_revision" ADD CONSTRAINT fk_93 FOREIGN KEY ("visit_id") REFERENCES adc."visit" ("visit_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."clinical_record_revision" ADD CONSTRAINT fk_94 FOREIGN KEY ("operation_id") REFERENCES adc."business_operation" ("operation_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."record_revision_writer" ADD CONSTRAINT fk_95 FOREIGN KEY ("record_revision_id") REFERENCES adc."clinical_record_revision" ("record_revision_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."record_revision_writer" ADD CONSTRAINT fk_96 FOREIGN KEY ("doctor_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."treatment" ADD CONSTRAINT fk_97 FOREIGN KEY ("visit_id") REFERENCES adc."visit" ("visit_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."treatment" ADD CONSTRAINT fk_98 FOREIGN KEY ("item_id") REFERENCES adc."treatment_item" ("item_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."treatment" ADD CONSTRAINT fk_99 FOREIGN KEY ("confirming_doctor_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."treatment_tooth" ADD CONSTRAINT fk_100 FOREIGN KEY ("treatment_id") REFERENCES adc."treatment" ("treatment_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."treatment_revision" ADD CONSTRAINT fk_101 FOREIGN KEY ("treatment_id") REFERENCES adc."treatment" ("treatment_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."treatment_revision" ADD CONSTRAINT fk_102 FOREIGN KEY ("visit_id") REFERENCES adc."visit" ("visit_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."treatment_revision" ADD CONSTRAINT fk_103 FOREIGN KEY ("item_id") REFERENCES adc."treatment_item" ("item_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."treatment_revision" ADD CONSTRAINT fk_104 FOREIGN KEY ("confirming_doctor_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."treatment_revision" ADD CONSTRAINT fk_105 FOREIGN KEY ("operation_id") REFERENCES adc."business_operation" ("operation_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."treatment_revision_tooth" ADD CONSTRAINT fk_106 FOREIGN KEY ("treatment_revision_id") REFERENCES adc."treatment_revision" ("treatment_revision_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."clinical_image" ADD CONSTRAINT fk_107 FOREIGN KEY ("visit_id") REFERENCES adc."visit" ("visit_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."clinical_image" ADD CONSTRAINT fk_108 FOREIGN KEY ("file_id") REFERENCES adc."file_asset" ("file_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."clinical_image" ADD CONSTRAINT fk_109 FOREIGN KEY ("archived_by") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."clinical_image_revision" ADD CONSTRAINT fk_110 FOREIGN KEY ("image_id") REFERENCES adc."clinical_image" ("image_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."clinical_image_revision" ADD CONSTRAINT fk_111 FOREIGN KEY ("visit_id") REFERENCES adc."visit" ("visit_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."clinical_image_revision" ADD CONSTRAINT fk_112 FOREIGN KEY ("file_id") REFERENCES adc."file_asset" ("file_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."clinical_image_revision" ADD CONSTRAINT fk_113 FOREIGN KEY ("archived_by") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."clinical_image_revision" ADD CONSTRAINT fk_114 FOREIGN KEY ("operation_id") REFERENCES adc."business_operation" ("operation_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."file_asset" ADD CONSTRAINT fk_115 FOREIGN KEY ("created_by") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."lab_order" ADD CONSTRAINT fk_116 FOREIGN KEY ("treatment_id") REFERENCES adc."treatment" ("treatment_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."lab_order" ADD CONSTRAINT fk_117 FOREIGN KEY ("request_doctor_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."lab_order" ADD CONSTRAINT fk_118 FOREIGN KEY ("updated_by") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."lab_order" ADD CONSTRAINT fk_119 FOREIGN KEY ("current_received_handover_id") REFERENCES adc."lab_handover" ("handover_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."lab_order" ADD CONSTRAINT fk_120 FOREIGN KEY ("current_review_id") REFERENCES adc."lab_review" ("review_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."lab_requirement_version" ADD CONSTRAINT fk_121 FOREIGN KEY ("lab_order_id") REFERENCES adc."lab_order" ("lab_order_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."lab_requirement_version" ADD CONSTRAINT fk_122 FOREIGN KEY ("doctor_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."lab_requirement_version" ADD CONSTRAINT fk_123 FOREIGN KEY ("operation_id") REFERENCES adc."business_operation" ("operation_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."lab_handover" ADD CONSTRAINT fk_124 FOREIGN KEY ("lab_order_id") REFERENCES adc."lab_order" ("lab_order_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."lab_handover" ADD CONSTRAINT fk_125 FOREIGN KEY ("requirement_id") REFERENCES adc."lab_requirement_version" ("requirement_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."lab_handover" ADD CONSTRAINT fk_126 FOREIGN KEY ("employee_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."lab_handover" ADD CONSTRAINT fk_127 FOREIGN KEY ("operation_id") REFERENCES adc."business_operation" ("operation_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."lab_review" ADD CONSTRAINT fk_128 FOREIGN KEY ("requirement_id") REFERENCES adc."lab_requirement_version" ("requirement_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."lab_review" ADD CONSTRAINT fk_129 FOREIGN KEY ("received_handover_id") REFERENCES adc."lab_handover" ("handover_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."lab_review" ADD CONSTRAINT fk_130 FOREIGN KEY ("doctor_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."lab_review" ADD CONSTRAINT fk_131 FOREIGN KEY ("operation_id") REFERENCES adc."business_operation" ("operation_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."item_price_version" ADD CONSTRAINT fk_132 FOREIGN KEY ("item_id") REFERENCES adc."treatment_item" ("item_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."item_price_version" ADD CONSTRAINT fk_133 FOREIGN KEY ("created_by") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."item_price_version" ADD CONSTRAINT fk_134 FOREIGN KEY ("operation_id") REFERENCES adc."business_operation" ("operation_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."item_price_clinic" ADD CONSTRAINT fk_135 FOREIGN KEY ("price_version_id") REFERENCES adc."item_price_version" ("price_version_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."item_price_clinic" ADD CONSTRAINT fk_136 FOREIGN KEY ("clinic_id") REFERENCES adc."clinic" ("clinic_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."treatment_bill" ADD CONSTRAINT fk_137 FOREIGN KEY ("visit_id") REFERENCES adc."visit" ("visit_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."treatment_bill" ADD CONSTRAINT fk_138 FOREIGN KEY ("creator_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."bill_staff" ADD CONSTRAINT fk_139 FOREIGN KEY ("bill_id") REFERENCES adc."treatment_bill" ("bill_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."bill_staff" ADD CONSTRAINT fk_140 FOREIGN KEY ("employee_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."treatment_bill_line" ADD CONSTRAINT fk_141 FOREIGN KEY ("bill_id") REFERENCES adc."treatment_bill" ("bill_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."treatment_bill_line" ADD CONSTRAINT fk_142 FOREIGN KEY ("treatment_id") REFERENCES adc."treatment" ("treatment_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."treatment_bill_line" ADD CONSTRAINT fk_143 FOREIGN KEY ("price_version_id") REFERENCES adc."item_price_version" ("price_version_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."bill_revision" ADD CONSTRAINT fk_144 FOREIGN KEY ("bill_id") REFERENCES adc."treatment_bill" ("bill_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."bill_revision" ADD CONSTRAINT fk_145 FOREIGN KEY ("visit_id") REFERENCES adc."visit" ("visit_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."bill_revision" ADD CONSTRAINT fk_146 FOREIGN KEY ("creator_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."bill_revision" ADD CONSTRAINT fk_147 FOREIGN KEY ("operation_id") REFERENCES adc."business_operation" ("operation_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."bill_revision" ADD CONSTRAINT fk_148 FOREIGN KEY ("visit_revision_id") REFERENCES adc."visit_revision" ("visit_revision_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."bill_revision_staff" ADD CONSTRAINT fk_149 FOREIGN KEY ("bill_revision_id") REFERENCES adc."bill_revision" ("bill_revision_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."bill_revision_staff" ADD CONSTRAINT fk_150 FOREIGN KEY ("employee_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."bill_revision_line" ADD CONSTRAINT fk_151 FOREIGN KEY ("bill_revision_id") REFERENCES adc."bill_revision" ("bill_revision_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."bill_revision_line" ADD CONSTRAINT fk_152 FOREIGN KEY ("bill_line_id") REFERENCES adc."treatment_bill_line" ("bill_line_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."bill_revision_line" ADD CONSTRAINT fk_153 FOREIGN KEY ("treatment_id") REFERENCES adc."treatment" ("treatment_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."bill_revision_line" ADD CONSTRAINT fk_154 FOREIGN KEY ("price_version_id") REFERENCES adc."item_price_version" ("price_version_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."bill_revision_line" ADD CONSTRAINT fk_155 FOREIGN KEY ("treatment_revision_id") REFERENCES adc."treatment_revision" ("treatment_revision_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."receipt" ADD CONSTRAINT fk_156 FOREIGN KEY ("bill_id") REFERENCES adc."treatment_bill" ("bill_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."receipt" ADD CONSTRAINT fk_157 FOREIGN KEY ("sale_id") REFERENCES adc."product_sale" ("sale_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."receipt" ADD CONSTRAINT fk_158 FOREIGN KEY ("collector_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."receipt_revision" ADD CONSTRAINT fk_159 FOREIGN KEY ("receipt_id") REFERENCES adc."receipt" ("receipt_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."receipt_revision" ADD CONSTRAINT fk_160 FOREIGN KEY ("bill_id") REFERENCES adc."treatment_bill" ("bill_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."receipt_revision" ADD CONSTRAINT fk_161 FOREIGN KEY ("sale_id") REFERENCES adc."product_sale" ("sale_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."receipt_revision" ADD CONSTRAINT fk_162 FOREIGN KEY ("collector_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."receipt_revision" ADD CONSTRAINT fk_163 FOREIGN KEY ("operation_id") REFERENCES adc."business_operation" ("operation_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."receipt_revision" ADD CONSTRAINT fk_164 FOREIGN KEY ("bill_revision_id") REFERENCES adc."bill_revision" ("bill_revision_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."receipt_revision" ADD CONSTRAINT fk_165 FOREIGN KEY ("sale_revision_id") REFERENCES adc."sale_revision" ("sale_revision_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."product_sale" ADD CONSTRAINT fk_166 FOREIGN KEY ("patient_id") REFERENCES adc."patient" ("patient_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."product_sale" ADD CONSTRAINT fk_167 FOREIGN KEY ("clinic_id") REFERENCES adc."clinic" ("clinic_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."product_sale" ADD CONSTRAINT fk_168 FOREIGN KEY ("creator_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."product_sale_line" ADD CONSTRAINT fk_169 FOREIGN KEY ("sale_id") REFERENCES adc."product_sale" ("sale_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."product_sale_line" ADD CONSTRAINT fk_170 FOREIGN KEY ("material_id") REFERENCES adc."material" ("material_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."product_delivery_line" ADD CONSTRAINT fk_171 FOREIGN KEY ("sale_line_id") REFERENCES adc."product_sale_line" ("sale_line_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."product_delivery_line" ADD CONSTRAINT fk_172 FOREIGN KEY ("stock_id") REFERENCES adc."stock_balance" ("stock_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."product_delivery_line" ADD CONSTRAINT fk_173 FOREIGN KEY ("delivered_by") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."product_delivery_line" ADD CONSTRAINT fk_174 FOREIGN KEY ("operation_id") REFERENCES adc."business_operation" ("operation_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."sale_revision" ADD CONSTRAINT fk_175 FOREIGN KEY ("sale_id") REFERENCES adc."product_sale" ("sale_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."sale_revision" ADD CONSTRAINT fk_176 FOREIGN KEY ("patient_id") REFERENCES adc."patient" ("patient_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."sale_revision" ADD CONSTRAINT fk_177 FOREIGN KEY ("clinic_id") REFERENCES adc."clinic" ("clinic_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."sale_revision" ADD CONSTRAINT fk_178 FOREIGN KEY ("creator_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."sale_revision" ADD CONSTRAINT fk_179 FOREIGN KEY ("operation_id") REFERENCES adc."business_operation" ("operation_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."sale_revision_line" ADD CONSTRAINT fk_180 FOREIGN KEY ("sale_revision_id") REFERENCES adc."sale_revision" ("sale_revision_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."sale_revision_line" ADD CONSTRAINT fk_181 FOREIGN KEY ("sale_line_id") REFERENCES adc."product_sale_line" ("sale_line_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."sale_revision_line" ADD CONSTRAINT fk_182 FOREIGN KEY ("material_id") REFERENCES adc."material" ("material_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."material" ADD CONSTRAINT fk_183 FOREIGN KEY ("updated_by") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."stock_balance" ADD CONSTRAINT fk_184 FOREIGN KEY ("clinic_id") REFERENCES adc."clinic" ("clinic_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."stock_balance" ADD CONSTRAINT fk_185 FOREIGN KEY ("material_id") REFERENCES adc."material" ("material_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."stock_movement" ADD CONSTRAINT fk_186 FOREIGN KEY ("stock_id") REFERENCES adc."stock_balance" ("stock_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."stock_movement" ADD CONSTRAINT fk_187 FOREIGN KEY ("receipt_id") REFERENCES adc."stock_receipt" ("stock_receipt_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."stock_movement" ADD CONSTRAINT fk_188 FOREIGN KEY ("issue_revision_id") REFERENCES adc."issue_revision" ("issue_revision_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."stock_movement" ADD CONSTRAINT fk_189 FOREIGN KEY ("delivery_line_id") REFERENCES adc."product_delivery_line" ("delivery_line_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."stock_movement" ADD CONSTRAINT fk_190 FOREIGN KEY ("stocktake_line_id") REFERENCES adc."stocktake_line" ("stocktake_line_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."stock_movement" ADD CONSTRAINT fk_191 FOREIGN KEY ("operation_id") REFERENCES adc."business_operation" ("operation_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."followup_plan_version" ADD CONSTRAINT fk_192 FOREIGN KEY ("plan_id") REFERENCES adc."followup_plan" ("plan_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."followup_plan_version" ADD CONSTRAINT fk_193 FOREIGN KEY ("item_id") REFERENCES adc."treatment_item" ("item_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."followup_plan_version" ADD CONSTRAINT fk_194 FOREIGN KEY ("configured_by") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."followup_plan_version" ADD CONSTRAINT fk_195 FOREIGN KEY ("operation_id") REFERENCES adc."business_operation" ("operation_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."followup_plan_clinic" ADD CONSTRAINT fk_196 FOREIGN KEY ("plan_version_id") REFERENCES adc."followup_plan_version" ("plan_version_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."followup_plan_clinic" ADD CONSTRAINT fk_197 FOREIGN KEY ("clinic_id") REFERENCES adc."clinic" ("clinic_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."followup_plan_node" ADD CONSTRAINT fk_198 FOREIGN KEY ("plan_version_id") REFERENCES adc."followup_plan_version" ("plan_version_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."followup_task" ADD CONSTRAINT fk_199 FOREIGN KEY ("treatment_id") REFERENCES adc."treatment" ("treatment_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."followup_task" ADD CONSTRAINT fk_200 FOREIGN KEY ("plan_version_id") REFERENCES adc."followup_plan_version" ("plan_version_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."followup_task" ADD CONSTRAINT fk_201 FOREIGN KEY ("node_id") REFERENCES adc."followup_plan_node" ("node_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."followup_task" ADD CONSTRAINT fk_202 FOREIGN KEY ("instruction_doctor_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."followup_task" ADD CONSTRAINT fk_203 FOREIGN KEY ("responsible_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."followup_task" ADD CONSTRAINT fk_204 FOREIGN KEY ("updated_by") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."followup_contact" ADD CONSTRAINT fk_205 FOREIGN KEY ("followup_id") REFERENCES adc."followup_task" ("followup_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."followup_contact" ADD CONSTRAINT fk_206 FOREIGN KEY ("employee_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."followup_contact" ADD CONSTRAINT fk_207 FOREIGN KEY ("operation_id") REFERENCES adc."business_operation" ("operation_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."followup_issue" ADD CONSTRAINT fk_208 FOREIGN KEY ("followup_id") REFERENCES adc."followup_task" ("followup_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."followup_issue" ADD CONSTRAINT fk_209 FOREIGN KEY ("doctor_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."followup_issue" ADD CONSTRAINT fk_210 FOREIGN KEY ("source_contact_id") REFERENCES adc."followup_contact" ("followup_contact_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."followup_issue" ADD CONSTRAINT fk_211 FOREIGN KEY ("clinical_record_id") REFERENCES adc."clinical_record" ("record_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."followup_issue" ADD CONSTRAINT fk_212 FOREIGN KEY ("recorded_by") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."supplier" ADD CONSTRAINT fk_213 FOREIGN KEY ("updated_by") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."supplier_file" ADD CONSTRAINT fk_214 FOREIGN KEY ("supplier_id") REFERENCES adc."supplier" ("supplier_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."supplier_file" ADD CONSTRAINT fk_215 FOREIGN KEY ("file_id") REFERENCES adc."file_asset" ("file_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."stock_receipt" ADD CONSTRAINT fk_216 FOREIGN KEY ("stock_id") REFERENCES adc."stock_balance" ("stock_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."stock_receipt" ADD CONSTRAINT fk_217 FOREIGN KEY ("supplier_id") REFERENCES adc."supplier" ("supplier_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."stock_receipt" ADD CONSTRAINT fk_218 FOREIGN KEY ("registrar_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."stock_receipt" ADD CONSTRAINT fk_219 FOREIGN KEY ("file_id") REFERENCES adc."file_asset" ("file_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."stock_receipt" ADD CONSTRAINT fk_220 FOREIGN KEY ("operation_id") REFERENCES adc."business_operation" ("operation_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."material_issue" ADD CONSTRAINT fk_221 FOREIGN KEY ("stock_id") REFERENCES adc."stock_balance" ("stock_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."material_issue" ADD CONSTRAINT fk_222 FOREIGN KEY ("recipient_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."material_issue" ADD CONSTRAINT fk_223 FOREIGN KEY ("registrar_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."issue_revision" ADD CONSTRAINT fk_224 FOREIGN KEY ("issue_id") REFERENCES adc."material_issue" ("issue_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."issue_revision" ADD CONSTRAINT fk_225 FOREIGN KEY ("stock_id") REFERENCES adc."stock_balance" ("stock_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."issue_revision" ADD CONSTRAINT fk_226 FOREIGN KEY ("recipient_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."issue_revision" ADD CONSTRAINT fk_227 FOREIGN KEY ("registrar_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."issue_revision" ADD CONSTRAINT fk_228 FOREIGN KEY ("operation_id") REFERENCES adc."business_operation" ("operation_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."stocktake" ADD CONSTRAINT fk_229 FOREIGN KEY ("clinic_id") REFERENCES adc."clinic" ("clinic_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."stocktake" ADD CONSTRAINT fk_230 FOREIGN KEY ("initiator_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."stocktake" ADD CONSTRAINT fk_231 FOREIGN KEY ("processed_by") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."stocktake_line" ADD CONSTRAINT fk_232 FOREIGN KEY ("stocktake_id") REFERENCES adc."stocktake" ("stocktake_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."stocktake_line" ADD CONSTRAINT fk_233 FOREIGN KEY ("stock_id") REFERENCES adc."stock_balance" ("stock_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."stocktake_line" ADD CONSTRAINT fk_234 FOREIGN KEY ("counted_by") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."qualification_version" ADD CONSTRAINT fk_235 FOREIGN KEY ("qualification_id") REFERENCES adc."qualification" ("qualification_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."qualification_version" ADD CONSTRAINT fk_236 FOREIGN KEY ("updated_by") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."staff_account" ADD CONSTRAINT fk_237 FOREIGN KEY ("employee_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."staff_account" ADD CONSTRAINT fk_238 FOREIGN KEY ("maintained_by") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."role_function" ADD CONSTRAINT fk_239 FOREIGN KEY ("role_version_id") REFERENCES adc."role_version" ("role_version_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."access_grant" ADD CONSTRAINT fk_240 FOREIGN KEY ("account_id") REFERENCES adc."staff_account" ("account_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."access_grant" ADD CONSTRAINT fk_241 FOREIGN KEY ("configured_by") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."grant_role" ADD CONSTRAINT fk_242 FOREIGN KEY ("grant_id") REFERENCES adc."access_grant" ("grant_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."grant_role" ADD CONSTRAINT fk_243 FOREIGN KEY ("role_version_id") REFERENCES adc."role_version" ("role_version_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."grant_clinic" ADD CONSTRAINT fk_244 FOREIGN KEY ("grant_id") REFERENCES adc."access_grant" ("grant_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."grant_clinic" ADD CONSTRAINT fk_245 FOREIGN KEY ("clinic_id") REFERENCES adc."clinic" ("clinic_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."grant_field" ADD CONSTRAINT fk_246 FOREIGN KEY ("grant_id") REFERENCES adc."access_grant" ("grant_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."operating_expense" ADD CONSTRAINT fk_247 FOREIGN KEY ("clinic_id") REFERENCES adc."clinic" ("clinic_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."operating_expense" ADD CONSTRAINT fk_248 FOREIGN KEY ("creator_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."quarter_run" ADD CONSTRAINT fk_249 FOREIGN KEY ("first_confirmed_result_id") REFERENCES adc."quarter_result_version" ("result_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."quarter_scope" ADD CONSTRAINT fk_250 FOREIGN KEY ("quarter_id") REFERENCES adc."quarter_run" ("quarter_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."quarter_scope" ADD CONSTRAINT fk_251 FOREIGN KEY ("clinic_id") REFERENCES adc."clinic" ("clinic_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."quarter_doctor_scope" ADD CONSTRAINT fk_252 FOREIGN KEY ("quarter_id") REFERENCES adc."quarter_run" ("quarter_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."quarter_doctor_scope" ADD CONSTRAINT fk_253 FOREIGN KEY ("clinic_id") REFERENCES adc."clinic" ("clinic_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."quarter_doctor_scope" ADD CONSTRAINT fk_254 FOREIGN KEY ("doctor_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."quarter_submission" ADD CONSTRAINT fk_255 FOREIGN KEY ("quarter_id") REFERENCES adc."quarter_run" ("quarter_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."quarter_submission" ADD CONSTRAINT fk_256 FOREIGN KEY ("clinic_id") REFERENCES adc."clinic" ("clinic_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."quarter_submission" ADD CONSTRAINT fk_257 FOREIGN KEY ("submitted_by") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."quarter_submission" ADD CONSTRAINT fk_258 FOREIGN KEY ("operation_id") REFERENCES adc."business_operation" ("operation_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."quarter_result_version" ADD CONSTRAINT fk_259 FOREIGN KEY ("quarter_id") REFERENCES adc."quarter_run" ("quarter_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."quarter_result_version" ADD CONSTRAINT fk_260 FOREIGN KEY ("policy_version_id") REFERENCES adc."calculation_policy_version" ("policy_version_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."quarter_result_version" ADD CONSTRAINT fk_261 FOREIGN KEY ("confirmed_by") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."quarter_result_version" ADD CONSTRAINT fk_262 FOREIGN KEY ("calculated_by") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."quarter_result_version" ADD CONSTRAINT fk_263 FOREIGN KEY ("operation_id") REFERENCES adc."business_operation" ("operation_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."quarter_result_version" ADD CONSTRAINT fk_264 FOREIGN KEY ("previous_result_id") REFERENCES adc."quarter_result_version" ("result_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."result_submission" ADD CONSTRAINT fk_265 FOREIGN KEY ("result_id") REFERENCES adc."quarter_result_version" ("result_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."result_submission" ADD CONSTRAINT fk_266 FOREIGN KEY ("clinic_id") REFERENCES adc."clinic" ("clinic_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."result_submission" ADD CONSTRAINT fk_267 FOREIGN KEY ("submission_id") REFERENCES adc."quarter_submission" ("submission_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."result_submission" ADD CONSTRAINT fk_268 FOREIGN KEY ("quarter_id") REFERENCES adc."quarter_run" ("quarter_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."result_review" ADD CONSTRAINT fk_269 FOREIGN KEY ("result_id") REFERENCES adc."quarter_result_version" ("result_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."result_review" ADD CONSTRAINT fk_270 FOREIGN KEY ("employee_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."result_review" ADD CONSTRAINT fk_271 FOREIGN KEY ("operation_id") REFERENCES adc."business_operation" ("operation_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."quarter_result_line" ADD CONSTRAINT fk_272 FOREIGN KEY ("result_id") REFERENCES adc."quarter_result_version" ("result_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."quarter_result_line" ADD CONSTRAINT fk_273 FOREIGN KEY ("doctor_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."quarter_result_line" ADD CONSTRAINT fk_274 FOREIGN KEY ("clinic_id") REFERENCES adc."clinic" ("clinic_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."quarter_result_line" ADD CONSTRAINT fk_275 FOREIGN KEY ("quarter_id") REFERENCES adc."quarter_run" ("quarter_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."expense_allocation_line" ADD CONSTRAINT fk_276 FOREIGN KEY ("result_line_id") REFERENCES adc."quarter_result_line" ("result_line_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."expense_allocation_line" ADD CONSTRAINT fk_277 FOREIGN KEY ("expense_revision_id") REFERENCES adc."expense_revision" ("expense_revision_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."submission_receipt" ADD CONSTRAINT fk_278 FOREIGN KEY ("submission_id") REFERENCES adc."quarter_submission" ("submission_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."submission_receipt" ADD CONSTRAINT fk_279 FOREIGN KEY ("receipt_revision_id") REFERENCES adc."receipt_revision" ("receipt_revision_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."submission_receipt" ADD CONSTRAINT fk_280 FOREIGN KEY ("receipt_id") REFERENCES adc."receipt" ("receipt_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."submission_issue" ADD CONSTRAINT fk_281 FOREIGN KEY ("submission_id") REFERENCES adc."quarter_submission" ("submission_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."submission_issue" ADD CONSTRAINT fk_282 FOREIGN KEY ("issue_revision_id") REFERENCES adc."issue_revision" ("issue_revision_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."submission_issue" ADD CONSTRAINT fk_283 FOREIGN KEY ("issue_id") REFERENCES adc."material_issue" ("issue_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."submission_expense" ADD CONSTRAINT fk_284 FOREIGN KEY ("submission_id") REFERENCES adc."quarter_submission" ("submission_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."submission_expense" ADD CONSTRAINT fk_285 FOREIGN KEY ("expense_revision_id") REFERENCES adc."expense_revision" ("expense_revision_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."submission_expense" ADD CONSTRAINT fk_286 FOREIGN KEY ("expense_id") REFERENCES adc."operating_expense" ("expense_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."result_income_source" ADD CONSTRAINT fk_287 FOREIGN KEY ("result_line_id") REFERENCES adc."quarter_result_line" ("result_line_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."result_income_source" ADD CONSTRAINT fk_288 FOREIGN KEY ("receipt_revision_id") REFERENCES adc."receipt_revision" ("receipt_revision_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."result_material_source" ADD CONSTRAINT fk_289 FOREIGN KEY ("result_line_id") REFERENCES adc."quarter_result_line" ("result_line_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."result_material_source" ADD CONSTRAINT fk_290 FOREIGN KEY ("issue_revision_id") REFERENCES adc."issue_revision" ("issue_revision_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."result_unassigned_sale" ADD CONSTRAINT fk_291 FOREIGN KEY ("result_id") REFERENCES adc."quarter_result_version" ("result_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."result_unassigned_sale" ADD CONSTRAINT fk_292 FOREIGN KEY ("clinic_id") REFERENCES adc."clinic" ("clinic_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."result_unassigned_sale" ADD CONSTRAINT fk_293 FOREIGN KEY ("receipt_revision_id") REFERENCES adc."receipt_revision" ("receipt_revision_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."data_issue" ADD CONSTRAINT fk_294 FOREIGN KEY ("clinic_id") REFERENCES adc."clinic" ("clinic_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."data_issue" ADD CONSTRAINT fk_295 FOREIGN KEY ("rechecked_by") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."issue_action" ADD CONSTRAINT fk_296 FOREIGN KEY ("issue_id") REFERENCES adc."data_issue" ("issue_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."issue_action" ADD CONSTRAINT fk_297 FOREIGN KEY ("employee_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."issue_action" ADD CONSTRAINT fk_298 FOREIGN KEY ("operation_id") REFERENCES adc."business_operation" ("operation_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."submission_problem" ADD CONSTRAINT fk_299 FOREIGN KEY ("submission_id") REFERENCES adc."quarter_submission" ("submission_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."submission_problem" ADD CONSTRAINT fk_300 FOREIGN KEY ("issue_id") REFERENCES adc."data_issue" ("issue_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."quarter_problem" ADD CONSTRAINT fk_301 FOREIGN KEY ("quarter_id") REFERENCES adc."quarter_run" ("quarter_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."quarter_problem" ADD CONSTRAINT fk_302 FOREIGN KEY ("issue_id") REFERENCES adc."data_issue" ("issue_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."practice_revision" ADD CONSTRAINT fk_303 FOREIGN KEY ("practice_id") REFERENCES adc."practice_assignment" ("practice_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."practice_revision" ADD CONSTRAINT fk_304 FOREIGN KEY ("employee_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."practice_revision" ADD CONSTRAINT fk_305 FOREIGN KEY ("clinic_id") REFERENCES adc."clinic" ("clinic_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."practice_revision" ADD CONSTRAINT fk_306 FOREIGN KEY ("updated_by") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."practice_revision" ADD CONSTRAINT fk_307 FOREIGN KEY ("operation_id") REFERENCES adc."business_operation" ("operation_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."expense_revision" ADD CONSTRAINT fk_308 FOREIGN KEY ("expense_id") REFERENCES adc."operating_expense" ("expense_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."expense_revision" ADD CONSTRAINT fk_309 FOREIGN KEY ("clinic_id") REFERENCES adc."clinic" ("clinic_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."expense_revision" ADD CONSTRAINT fk_310 FOREIGN KEY ("creator_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."expense_revision" ADD CONSTRAINT fk_311 FOREIGN KEY ("operation_id") REFERENCES adc."business_operation" ("operation_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."qualification" ADD CONSTRAINT fk_312 FOREIGN KEY ("employee_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."role_version" ADD CONSTRAINT fk_313 FOREIGN KEY ("role_id") REFERENCES adc."security_role" ("role_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."role_version" ADD CONSTRAINT fk_314 FOREIGN KEY ("configured_by") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."qualification_file" ADD CONSTRAINT fk_315 FOREIGN KEY ("qualification_version_id") REFERENCES adc."qualification_version" ("qualification_version_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."qualification_file" ADD CONSTRAINT fk_316 FOREIGN KEY ("file_id") REFERENCES adc."file_asset" ("file_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."analysis_run" ADD CONSTRAINT fk_317 FOREIGN KEY ("employee_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."analysis_scope" ADD CONSTRAINT fk_318 FOREIGN KEY ("analysis_id") REFERENCES adc."analysis_run" ("analysis_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."analysis_scope" ADD CONSTRAINT fk_319 FOREIGN KEY ("clinic_id") REFERENCES adc."clinic" ("clinic_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."analysis_staff_scope" ADD CONSTRAINT fk_320 FOREIGN KEY ("analysis_id") REFERENCES adc."analysis_run" ("analysis_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."analysis_staff_scope" ADD CONSTRAINT fk_321 FOREIGN KEY ("employee_id") REFERENCES adc."employee" ("employee_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."visit" ADD CONSTRAINT "cf01" FOREIGN KEY ("appointment_revision_id","appointment_id") REFERENCES adc."appointment_revision" ("appointment_revision_id","appointment_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."visit_revision" ADD CONSTRAINT "cf02" FOREIGN KEY ("appointment_revision_id","appointment_id") REFERENCES adc."appointment_revision" ("appointment_revision_id","appointment_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."appointment" ADD CONSTRAINT "cf03" FOREIGN KEY ("schedule_id","clinic_id","doctor_id") REFERENCES adc."doctor_schedule" ("schedule_id","clinic_id","doctor_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."appointment" ADD CONSTRAINT "cf04" FOREIGN KEY ("schedule_id","schedule_row_version") REFERENCES adc."schedule_revision" ("schedule_id","version_no") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."appointment" ADD CONSTRAINT "cf05" FOREIGN KEY ("rule_version_id","clinic_id") REFERENCES adc."clinic_booking_rule_version" ("rule_version_id","clinic_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."appointment" ADD CONSTRAINT "cf06" FOREIGN KEY ("service_version_id","clinic_id","doctor_id") REFERENCES adc."booking_service_version" ("service_version_id","clinic_id","doctor_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."appointment_revision" ADD CONSTRAINT "cf07" FOREIGN KEY ("schedule_id","clinic_id","doctor_id") REFERENCES adc."doctor_schedule" ("schedule_id","clinic_id","doctor_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."appointment_revision" ADD CONSTRAINT "cf08" FOREIGN KEY ("schedule_id","schedule_row_version") REFERENCES adc."schedule_revision" ("schedule_id","version_no") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."appointment_revision" ADD CONSTRAINT "cf09" FOREIGN KEY ("rule_version_id","clinic_id") REFERENCES adc."clinic_booking_rule_version" ("rule_version_id","clinic_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."appointment_revision" ADD CONSTRAINT "cf10" FOREIGN KEY ("service_version_id","clinic_id","doctor_id") REFERENCES adc."booking_service_version" ("service_version_id","clinic_id","doctor_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."bill_revision_line" ADD CONSTRAINT "cf11" FOREIGN KEY ("treatment_revision_id","treatment_id") REFERENCES adc."treatment_revision" ("treatment_revision_id","treatment_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."lab_handover" ADD CONSTRAINT "cf12" FOREIGN KEY ("requirement_id","lab_order_id") REFERENCES adc."lab_requirement_version" ("requirement_id","lab_order_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."lab_review" ADD CONSTRAINT "cf13" FOREIGN KEY ("received_handover_id","requirement_id") REFERENCES adc."lab_handover" ("handover_id","requirement_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."receipt_revision" ADD CONSTRAINT "cf14" FOREIGN KEY ("bill_revision_id","bill_id") REFERENCES adc."bill_revision" ("bill_revision_id","bill_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."receipt_revision" ADD CONSTRAINT "cf15" FOREIGN KEY ("sale_revision_id","sale_id") REFERENCES adc."sale_revision" ("sale_revision_id","sale_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."bill_revision" ADD CONSTRAINT "cf16" FOREIGN KEY ("visit_revision_id","visit_id") REFERENCES adc."visit_revision" ("visit_revision_id","visit_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."lab_order" ADD CONSTRAINT "cf17" FOREIGN KEY ("current_received_handover_id","lab_order_id") REFERENCES adc."lab_handover" ("handover_id","lab_order_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."lab_order" ADD CONSTRAINT "cf18" FOREIGN KEY ("current_review_id","current_received_handover_id") REFERENCES adc."lab_review" ("review_id","received_handover_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."followup_task" ADD CONSTRAINT "cf19" FOREIGN KEY ("node_id","plan_version_id") REFERENCES adc."followup_plan_node" ("node_id","plan_version_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."submission_receipt" ADD CONSTRAINT "cf20" FOREIGN KEY ("receipt_revision_id","receipt_id") REFERENCES adc."receipt_revision" ("receipt_revision_id","receipt_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."submission_issue" ADD CONSTRAINT "cf21" FOREIGN KEY ("issue_revision_id","issue_id") REFERENCES adc."issue_revision" ("issue_revision_id","issue_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."submission_expense" ADD CONSTRAINT "cf22" FOREIGN KEY ("expense_revision_id","expense_id") REFERENCES adc."expense_revision" ("expense_revision_id","expense_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."quarter_doctor_scope" ADD CONSTRAINT "cf23" FOREIGN KEY ("quarter_id","clinic_id") REFERENCES adc."quarter_scope" ("quarter_id","clinic_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."quarter_submission" ADD CONSTRAINT "cf24" FOREIGN KEY ("quarter_id","clinic_id") REFERENCES adc."quarter_scope" ("quarter_id","clinic_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."result_submission" ADD CONSTRAINT "cf25" FOREIGN KEY ("result_id","quarter_id") REFERENCES adc."quarter_result_version" ("result_id","quarter_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."result_submission" ADD CONSTRAINT "cf26" FOREIGN KEY ("submission_id","quarter_id","clinic_id") REFERENCES adc."quarter_submission" ("submission_id","quarter_id","clinic_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."quarter_result_line" ADD CONSTRAINT "cf27" FOREIGN KEY ("result_id","quarter_id") REFERENCES adc."quarter_result_version" ("result_id","quarter_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."quarter_result_line" ADD CONSTRAINT "cf28" FOREIGN KEY ("quarter_id","clinic_id","doctor_id") REFERENCES adc."quarter_doctor_scope" ("quarter_id","clinic_id","doctor_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE adc."quarter_result_line" ADD CONSTRAINT "cf29" FOREIGN KEY ("result_id","clinic_id") REFERENCES adc."result_submission" ("result_id","clinic_id") ON DELETE RESTRICT ON UPDATE RESTRICT;
