CREATE TABLE "admission_transfers" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"admission_id" integer NOT NULL,
	"from_ward_id" integer,
	"from_bed_id" integer,
	"to_ward_id" integer NOT NULL,
	"to_bed_id" integer NOT NULL,
	"reason" text,
	"transferred_by" integer NOT NULL,
	"transferred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"appointment_id" integer,
	"ward_id" integer,
	"bed_id" integer,
	"admitting_doctor_id" integer NOT NULL,
	"admission_type" text DEFAULT 'elective' NOT NULL,
	"admission_reason" text NOT NULL,
	"severity" text DEFAULT 'routine' NOT NULL,
	"status" text DEFAULT 'admitted' NOT NULL,
	"requested_by" integer,
	"requested_at" timestamp with time zone,
	"admitted_at" timestamp with time zone,
	"discharged_at" timestamp with time zone,
	"discharge_summary" text,
	"discharged_by" integer,
	"discharge_balance" integer,
	"discharge_balance_note" text,
	"decline_reason" text,
	"declined_by" integer,
	"declined_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"doctor_id" integer NOT NULL,
	"appointment_date" text NOT NULL,
	"appointment_time" text NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"visit_type" text DEFAULT 'new visit' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer,
	"user_id" integer,
	"user_email" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"details" json,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beds" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"ward_id" integer NOT NULL,
	"bed_number" text NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "billing_plan_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"billing_plan_id" integer NOT NULL,
	"item_type" text NOT NULL,
	"item_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"amount" integer NOT NULL,
	"billing_interval" text DEFAULT 'monthly' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "cashier_shifts" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"opening_float" integer DEFAULT 0 NOT NULL,
	"closed_at" timestamp with time zone,
	"expected_cash" integer,
	"expected_pos" integer,
	"expected_transfer" integer,
	"counted_cash" integer,
	"counted_pos" integer,
	"counted_transfer" integer,
	"variance" integer,
	"close_note" text,
	"reviewed_by" integer,
	"reviewed_at" timestamp with time zone,
	"review_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cds_alert_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"prescription_id" integer,
	"generic_id" integer,
	"rule" text NOT NULL,
	"severity" text NOT NULL,
	"message" text NOT NULL,
	"allergy_id" integer,
	"action" text DEFAULT 'overridden' NOT NULL,
	"override_reason" text,
	"override_note" text,
	"user_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claim_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"hmo_id" integer NOT NULL,
	"period_month" text NOT NULL,
	"reference" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"submitted_at" timestamp with time zone,
	"submitted_by" integer,
	"submission_channel" text,
	"hmo_reference" text,
	"total_claimed" integer,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "critical_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"request_id" integer NOT NULL,
	"result_value_id" integer NOT NULL,
	"parameter_name" text NOT NULL,
	"value" text NOT NULL,
	"flag" text NOT NULL,
	"notify_user_id" integer,
	"raised_by" integer,
	"raised_at" timestamp with time zone DEFAULT now() NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"acknowledged_by" integer,
	"action_note" text,
	"escalated_at" timestamp with time zone,
	"escalation_note" text
);
--> statement-breakpoint
CREATE TABLE "data_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"requested_by_user_id" integer,
	"type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"details" text NOT NULL,
	"resolution_note" text,
	"resolved_by" integer,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "drug_classes" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"members" json NOT NULL,
	"cross_reacts_with" json,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "drug_generics" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"name" text NOT NULL,
	"strength" text NOT NULL,
	"form" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "eligibility_checks" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"coverage_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"channel" text NOT NULL,
	"result" text NOT NULL,
	"reference" text,
	"notes" text,
	"checked_by" integer,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hmo_authorization_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"authorization_id" integer NOT NULL,
	"item_type" text NOT NULL,
	"item_id" integer NOT NULL,
	"description" text,
	"tariff_price" integer
);
--> statement-breakpoint
CREATE TABLE "hmo_authorizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"coverage_id" integer NOT NULL,
	"hmo_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"channel" text,
	"is_emergency" boolean DEFAULT false NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"requested_by" integer,
	"sent_at" timestamp with time zone,
	"sent_by" integer,
	"code" text,
	"valid_until" text,
	"denial_reason" text,
	"responded_at" timestamp with time zone,
	"responded_by" integer,
	"escalated_at" timestamp with time zone,
	"escalation_note" text,
	"escalated_by" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hmo_charges" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"hmo_id" integer NOT NULL,
	"price_list_id" integer NOT NULL,
	"coverage_id" integer,
	"item_type" text NOT NULL,
	"item_id" integer NOT NULL,
	"description" text,
	"policy_number" text,
	"tariff_price" integer NOT NULL,
	"hmo_amount" integer NOT NULL,
	"patient_amount" integer NOT NULL,
	"requires_authorization" boolean DEFAULT false NOT NULL,
	"authorization_id" integer,
	"authorization_code" text,
	"status" text DEFAULT 'unclaimed' NOT NULL,
	"status_note" text,
	"claim_batch_id" integer,
	"paid_amount" integer,
	"paid_at" timestamp with time zone,
	"service_date" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hmos" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"payer_type" text DEFAULT 'hmo' NOT NULL,
	"code" text,
	"contact_person" text,
	"phone" text,
	"email" text,
	"claim_submission_days" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "icd11_codes" (
	"code" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"chapter" text,
	"is_leaf" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"unit" text NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"reorder_level" integer DEFAULT 10 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "lab_result_values" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"request_id" integer NOT NULL,
	"parameter_id" integer NOT NULL,
	"name" text NOT NULL,
	"value_numeric" real,
	"value_text" text,
	"unit" text,
	"ref_low" real,
	"ref_high" real,
	"flag" text DEFAULT 'normal' NOT NULL,
	"comment" text,
	"entered_by" integer,
	"entered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"amended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "lab_test_parameters" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"test_id" integer NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"unit" text,
	"value_type" text DEFAULT 'numeric' NOT NULL,
	"choices" json,
	"abnormal_choices" json,
	"ref_low" real,
	"ref_high" real,
	"ref_ranges" json,
	"critical_low" real,
	"critical_high" real,
	"decimals" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "lab_tests" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"name" text NOT NULL,
	"price" integer NOT NULL,
	"tax_code" text DEFAULT 'zero_rated' NOT NULL,
	"department_id" integer NOT NULL,
	"ref_discount_type" text,
	"ref_discount_value" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "medication_administrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"prescription_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"admission_id" integer,
	"scheduled_at" timestamp with time zone,
	"status" text NOT NULL,
	"given_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dose_given" text,
	"route" text,
	"reason" text,
	"prn_indication" text,
	"prn_effect" text,
	"prn_effect_at" timestamp with time zone,
	"administered_by" integer,
	"witnessed_by" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "message_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"kind" text NOT NULL,
	"body" text NOT NULL,
	"updated_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"request_id" integer NOT NULL,
	"patient_firstname" text,
	"patient_lastname" text,
	"department_name" text,
	"message" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organisations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"facility_registry_id" text,
	"facility_type" text,
	"ownership" text,
	"state" text,
	"lga" text,
	"latitude" text,
	"longitude" text,
	"operational_status" text DEFAULT 'operational' NOT NULL,
	"eligibility_recheck_days" integer DEFAULT 30 NOT NULL,
	"sms_enabled" boolean DEFAULT false NOT NULL,
	"sms_sender_id" text,
	"sms_settings" json,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organisations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "outbound_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"patient_id" integer,
	"kind" text NOT NULL,
	"channel" text DEFAULT 'sms' NOT NULL,
	"to_phone" text,
	"body" text NOT NULL,
	"status" text NOT NULL,
	"skip_reason" text,
	"provider" text,
	"provider_ref" text,
	"error" text,
	"dedupe_key" text,
	"related_type" text,
	"related_id" integer,
	"sent_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_allergies" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"category" text NOT NULL,
	"generic_id" integer,
	"drug_class_id" integer,
	"substance" text NOT NULL,
	"type" text DEFAULT 'allergy' NOT NULL,
	"reaction" text,
	"severity" text DEFAULT 'moderate' NOT NULL,
	"verification" text DEFAULT 'unconfirmed' NOT NULL,
	"onset_date" text,
	"notes" text,
	"recorded_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "patient_charges" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"admission_id" integer,
	"appointment_id" integer,
	"source_type" text NOT NULL,
	"service_item_id" integer,
	"ward_id" integer,
	"charge_date" text NOT NULL,
	"description" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" integer NOT NULL,
	"tax_code" text DEFAULT 'zero_rated' NOT NULL,
	"payment_status" text DEFAULT 'not_paid' NOT NULL,
	"waived_reason" text,
	"waived_by" integer,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"void_reason" text
);
--> statement-breakpoint
CREATE TABLE "patient_consents" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"purpose" text NOT NULL,
	"information_types" json,
	"status" text DEFAULT 'granted' NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"withdrawn_at" timestamp with time zone,
	"recorded_by" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_coverages" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"hmo_id" integer NOT NULL,
	"plan_name" text,
	"membership_number" text,
	"relationship" text DEFAULT 'principal' NOT NULL,
	"principal_name" text,
	"principal_membership_number" text,
	"primary_provider" text,
	"valid_from" text,
	"valid_to" text,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "patient_duplicate_dismissals" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"low_id" integer NOT NULL,
	"high_id" integer NOT NULL,
	"note" text,
	"dismissed_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_identifiers" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"system" text NOT NULL,
	"value" text NOT NULL,
	"assigner" text,
	"notes" text,
	"source_merge_id" integer,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "patient_measurements" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"weight_kg" real,
	"height_cm" real,
	"source" text DEFAULT 'measured' NOT NULL,
	"measured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text,
	"recorded_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "patient_merges" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"survivor_id" integer NOT NULL,
	"merged_id" integer NOT NULL,
	"reason" text,
	"match_score" integer,
	"repointed" json NOT NULL,
	"snapshot" json NOT NULL,
	"wallet_transfer" integer,
	"merged_by" integer,
	"merged_at" timestamp with time zone DEFAULT now() NOT NULL,
	"undone_at" timestamp with time zone,
	"undone_by" integer,
	"undo_reason" text
);
--> statement-breakpoint
CREATE TABLE "patient_problems" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"icd_code" text,
	"icd_title" text,
	"clinical_text" text,
	"status" text DEFAULT 'active' NOT NULL,
	"onset_date" text,
	"resolved_date" text,
	"notes" text,
	"source_visit_id" integer,
	"recorded_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "patient_referrals" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"referrer_id" integer NOT NULL,
	"test_id" integer NOT NULL,
	"department_id" integer NOT NULL,
	"request_id" integer,
	"test_name" text NOT NULL,
	"amount" integer NOT NULL,
	"discount_type" text,
	"discount_value" real,
	"discount_amount" integer DEFAULT 0 NOT NULL,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "patient_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"billing_plan_id" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"start_date" timestamp with time zone DEFAULT now() NOT NULL,
	"next_charge_date" timestamp with time zone NOT NULL,
	"last_charged_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"nin" text,
	"mrn" text,
	"client_registry_id" text,
	"firstname" text NOT NULL,
	"lastname" text NOT NULL,
	"gender" text NOT NULL,
	"dob" text NOT NULL,
	"maiden_name" text,
	"email" text,
	"country_code" text NOT NULL,
	"phone" text NOT NULL,
	"insurance_type" text NOT NULL,
	"hmo_id" integer,
	"policy_number" text,
	"next_of_kin_firstname" text,
	"next_of_kin_lastname" text,
	"next_of_kin_relationship" text,
	"next_of_kin_address" text,
	"next_of_kin_phone" text,
	"next_of_kin_email" text,
	"allergy_status" text DEFAULT 'not_assessed' NOT NULL,
	"allergy_status_updated_at" timestamp with time zone,
	"allergy_status_updated_by" integer,
	"messaging_opt_out" boolean DEFAULT false NOT NULL,
	"messaging_opt_out_at" timestamp with time zone,
	"merged_into_id" integer,
	"merged_at" timestamp with time zone,
	"referrer_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "payment_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"payment_id" integer NOT NULL,
	"item_type" text NOT NULL,
	"item_id" integer NOT NULL,
	"amount" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"method" text DEFAULT 'gateway' NOT NULL,
	"purpose" text DEFAULT 'bill' NOT NULL,
	"gateway_provider" text,
	"gateway_reference" text,
	"initiated_by" text DEFAULT 'patient' NOT NULL,
	"confirmed_by" integer,
	"shift_id" integer,
	"channel" text,
	"pos_reference" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_gateway_reference_unique" UNIQUE("gateway_reference")
);
--> statement-breakpoint
CREATE TABLE "prescriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"appointment_id" integer,
	"patient_id" integer NOT NULL,
	"requested_by" integer NOT NULL,
	"generic_id" integer,
	"product_id" integer,
	"dispensed_product_id" integer,
	"batch_number" text,
	"dosage" text NOT NULL,
	"payment_status" text DEFAULT 'not_paid' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"cancellation_reason" text,
	"dose_amount" text,
	"route" text,
	"frequency" text,
	"duration_days" integer,
	"start_at" timestamp with time zone,
	"is_prn" boolean DEFAULT false NOT NULL,
	"prn_indication" text,
	"prn_max_per_24h" integer,
	"prn_min_interval_hours" real,
	"admission_id" integer,
	"stopped_at" timestamp with time zone,
	"stopped_by" integer,
	"stop_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_list_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"price_list_id" integer NOT NULL,
	"item_type" text NOT NULL,
	"item_id" integer NOT NULL,
	"price" integer NOT NULL,
	"coverage" text DEFAULT 'covered' NOT NULL,
	"copay_percent" integer DEFAULT 0 NOT NULL,
	"requires_authorization" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_lists" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"name" text NOT NULL,
	"payer_type" text DEFAULT 'hmo' NOT NULL,
	"hmo_id" integer NOT NULL,
	"effective_from" text NOT NULL,
	"effective_to" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"generic_id" integer,
	"manufacturer" text,
	"nafdac_reg_number" text,
	"cases_in_stock" integer DEFAULT 0 NOT NULL,
	"units_per_case" integer DEFAULT 1 NOT NULL,
	"loose_units_in_stock" integer DEFAULT 0 NOT NULL,
	"reorder_level" integer DEFAULT 20 NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"tax_code" text DEFAULT 'zero_rated' NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"is_prescribable" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "referrers" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"code" text,
	"name" text NOT NULL,
	"account_name" text NOT NULL,
	"account_number" text NOT NULL,
	"bank" text NOT NULL,
	"whatsapp_number" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "request_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"file_name" text NOT NULL,
	"file_path" text NOT NULL,
	"file_type" text NOT NULL,
	"message" text,
	"uploaded_by" integer NOT NULL,
	"viewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"department_id" integer NOT NULL,
	"test_id" integer NOT NULL,
	"requested_by" integer NOT NULL,
	"appointment_id" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_status" text DEFAULT 'not_paid' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"permissions" json,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "service_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'other' NOT NULL,
	"price" integer NOT NULL,
	"tax_code" text DEFAULT 'zero_rated' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "subscription_charges" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"patient_subscription_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"status" text NOT NULL,
	"failure_reason" text,
	"wallet_transaction_id" integer,
	"charged_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supply_order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"inventory_item_id" integer,
	"product_id" integer,
	"quantity_requested" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supply_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"department_order_id" integer,
	"department_id" integer NOT NULL,
	"requested_by" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"department_status" text DEFAULT 'pending' NOT NULL,
	"supply_status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"cancellation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"firstname" text NOT NULL,
	"lastname" text NOT NULL,
	"gender" text,
	"password" text NOT NULL,
	"role_id" integer,
	"department_id" integer,
	"patient_id" integer,
	"is_platform_admin" boolean DEFAULT false NOT NULL,
	"license_number" text,
	"license_council" text,
	"worker_registry_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "vaccination_courses" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"vaccine_id" integer NOT NULL,
	"start_date" text NOT NULL,
	"dose_count" integer NOT NULL,
	"interval_value" integer NOT NULL,
	"interval_unit" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vaccination_doses" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"course_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"dose_number" integer NOT NULL,
	"scheduled_date" text NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"charge_id" integer,
	"given_at" timestamp with time zone,
	"given_by" integer,
	"batch_number" text,
	"site" text,
	"notes" text,
	"cancel_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vaccines" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"dose_count" integer DEFAULT 1 NOT NULL,
	"interval_value" integer DEFAULT 0 NOT NULL,
	"interval_unit" text DEFAULT 'month' NOT NULL,
	"price" integer NOT NULL,
	"tax_code" text DEFAULT 'zero_rated' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "visit_diagnoses" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"visit_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"icd_code" text,
	"icd_title" text,
	"clinical_text" text,
	"diagnosis_type" text DEFAULT 'primary' NOT NULL,
	"recorded_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visits" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"appointment_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"doctor_id" integer NOT NULL,
	"doctor_notes" text,
	"duration_minutes" integer NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vital_signs" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"admission_id" integer,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recorded_by" integer,
	"temperature_c" real,
	"heart_rate" integer,
	"respiratory_rate" integer,
	"systolic_bp" integer,
	"diastolic_bp" integer,
	"spo2" integer,
	"on_oxygen" boolean DEFAULT false NOT NULL,
	"oxygen_lpm" real,
	"spo2_scale2" boolean DEFAULT false NOT NULL,
	"consciousness" text,
	"pain_score" integer,
	"blood_glucose" real,
	"score_type" text,
	"score" integer,
	"band" text,
	"triggers" json,
	"next_due_at" timestamp with time zone,
	"escalated_to" text,
	"escalation_note" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "wallet_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"wallet_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"type" text NOT NULL,
	"amount" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"source" text NOT NULL,
	"reference_type" text,
	"reference_id" integer,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wards" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation_id" integer NOT NULL,
	"name" text NOT NULL,
	"department_id" integer,
	"daily_rate" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "admission_transfers" ADD CONSTRAINT "admission_transfers_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_transfers" ADD CONSTRAINT "admission_transfers_admission_id_admissions_id_fk" FOREIGN KEY ("admission_id") REFERENCES "public"."admissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_transfers" ADD CONSTRAINT "admission_transfers_from_ward_id_wards_id_fk" FOREIGN KEY ("from_ward_id") REFERENCES "public"."wards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_transfers" ADD CONSTRAINT "admission_transfers_from_bed_id_beds_id_fk" FOREIGN KEY ("from_bed_id") REFERENCES "public"."beds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_transfers" ADD CONSTRAINT "admission_transfers_to_ward_id_wards_id_fk" FOREIGN KEY ("to_ward_id") REFERENCES "public"."wards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_transfers" ADD CONSTRAINT "admission_transfers_to_bed_id_beds_id_fk" FOREIGN KEY ("to_bed_id") REFERENCES "public"."beds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_transfers" ADD CONSTRAINT "admission_transfers_transferred_by_users_id_fk" FOREIGN KEY ("transferred_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_ward_id_wards_id_fk" FOREIGN KEY ("ward_id") REFERENCES "public"."wards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_bed_id_beds_id_fk" FOREIGN KEY ("bed_id") REFERENCES "public"."beds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_admitting_doctor_id_users_id_fk" FOREIGN KEY ("admitting_doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_discharged_by_users_id_fk" FOREIGN KEY ("discharged_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_declined_by_users_id_fk" FOREIGN KEY ("declined_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beds" ADD CONSTRAINT "beds_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beds" ADD CONSTRAINT "beds_ward_id_wards_id_fk" FOREIGN KEY ("ward_id") REFERENCES "public"."wards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_plan_items" ADD CONSTRAINT "billing_plan_items_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_plan_items" ADD CONSTRAINT "billing_plan_items_billing_plan_id_billing_plans_id_fk" FOREIGN KEY ("billing_plan_id") REFERENCES "public"."billing_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_plans" ADD CONSTRAINT "billing_plans_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cashier_shifts" ADD CONSTRAINT "cashier_shifts_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cashier_shifts" ADD CONSTRAINT "cashier_shifts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cashier_shifts" ADD CONSTRAINT "cashier_shifts_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cds_alert_events" ADD CONSTRAINT "cds_alert_events_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cds_alert_events" ADD CONSTRAINT "cds_alert_events_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cds_alert_events" ADD CONSTRAINT "cds_alert_events_prescription_id_prescriptions_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cds_alert_events" ADD CONSTRAINT "cds_alert_events_generic_id_drug_generics_id_fk" FOREIGN KEY ("generic_id") REFERENCES "public"."drug_generics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cds_alert_events" ADD CONSTRAINT "cds_alert_events_allergy_id_patient_allergies_id_fk" FOREIGN KEY ("allergy_id") REFERENCES "public"."patient_allergies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cds_alert_events" ADD CONSTRAINT "cds_alert_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_batches" ADD CONSTRAINT "claim_batches_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_batches" ADD CONSTRAINT "claim_batches_hmo_id_hmos_id_fk" FOREIGN KEY ("hmo_id") REFERENCES "public"."hmos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_batches" ADD CONSTRAINT "claim_batches_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_batches" ADD CONSTRAINT "claim_batches_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "critical_alerts" ADD CONSTRAINT "critical_alerts_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "critical_alerts" ADD CONSTRAINT "critical_alerts_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "critical_alerts" ADD CONSTRAINT "critical_alerts_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "critical_alerts" ADD CONSTRAINT "critical_alerts_result_value_id_lab_result_values_id_fk" FOREIGN KEY ("result_value_id") REFERENCES "public"."lab_result_values"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "critical_alerts" ADD CONSTRAINT "critical_alerts_notify_user_id_users_id_fk" FOREIGN KEY ("notify_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "critical_alerts" ADD CONSTRAINT "critical_alerts_raised_by_users_id_fk" FOREIGN KEY ("raised_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "critical_alerts" ADD CONSTRAINT "critical_alerts_acknowledged_by_users_id_fk" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_requests" ADD CONSTRAINT "data_requests_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_requests" ADD CONSTRAINT "data_requests_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_requests" ADD CONSTRAINT "data_requests_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_requests" ADD CONSTRAINT "data_requests_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drug_classes" ADD CONSTRAINT "drug_classes_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drug_generics" ADD CONSTRAINT "drug_generics_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eligibility_checks" ADD CONSTRAINT "eligibility_checks_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eligibility_checks" ADD CONSTRAINT "eligibility_checks_coverage_id_patient_coverages_id_fk" FOREIGN KEY ("coverage_id") REFERENCES "public"."patient_coverages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eligibility_checks" ADD CONSTRAINT "eligibility_checks_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eligibility_checks" ADD CONSTRAINT "eligibility_checks_checked_by_users_id_fk" FOREIGN KEY ("checked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hmo_authorization_items" ADD CONSTRAINT "hmo_authorization_items_authorization_id_hmo_authorizations_id_fk" FOREIGN KEY ("authorization_id") REFERENCES "public"."hmo_authorizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hmo_authorizations" ADD CONSTRAINT "hmo_authorizations_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hmo_authorizations" ADD CONSTRAINT "hmo_authorizations_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hmo_authorizations" ADD CONSTRAINT "hmo_authorizations_coverage_id_patient_coverages_id_fk" FOREIGN KEY ("coverage_id") REFERENCES "public"."patient_coverages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hmo_authorizations" ADD CONSTRAINT "hmo_authorizations_hmo_id_hmos_id_fk" FOREIGN KEY ("hmo_id") REFERENCES "public"."hmos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hmo_authorizations" ADD CONSTRAINT "hmo_authorizations_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hmo_authorizations" ADD CONSTRAINT "hmo_authorizations_sent_by_users_id_fk" FOREIGN KEY ("sent_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hmo_authorizations" ADD CONSTRAINT "hmo_authorizations_responded_by_users_id_fk" FOREIGN KEY ("responded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hmo_authorizations" ADD CONSTRAINT "hmo_authorizations_escalated_by_users_id_fk" FOREIGN KEY ("escalated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hmo_charges" ADD CONSTRAINT "hmo_charges_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hmo_charges" ADD CONSTRAINT "hmo_charges_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hmo_charges" ADD CONSTRAINT "hmo_charges_hmo_id_hmos_id_fk" FOREIGN KEY ("hmo_id") REFERENCES "public"."hmos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hmo_charges" ADD CONSTRAINT "hmo_charges_price_list_id_price_lists_id_fk" FOREIGN KEY ("price_list_id") REFERENCES "public"."price_lists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hmo_charges" ADD CONSTRAINT "hmo_charges_coverage_id_patient_coverages_id_fk" FOREIGN KEY ("coverage_id") REFERENCES "public"."patient_coverages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hmo_charges" ADD CONSTRAINT "hmo_charges_authorization_id_hmo_authorizations_id_fk" FOREIGN KEY ("authorization_id") REFERENCES "public"."hmo_authorizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hmo_charges" ADD CONSTRAINT "hmo_charges_claim_batch_id_claim_batches_id_fk" FOREIGN KEY ("claim_batch_id") REFERENCES "public"."claim_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hmos" ADD CONSTRAINT "hmos_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_result_values" ADD CONSTRAINT "lab_result_values_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_result_values" ADD CONSTRAINT "lab_result_values_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_result_values" ADD CONSTRAINT "lab_result_values_parameter_id_lab_test_parameters_id_fk" FOREIGN KEY ("parameter_id") REFERENCES "public"."lab_test_parameters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_result_values" ADD CONSTRAINT "lab_result_values_entered_by_users_id_fk" FOREIGN KEY ("entered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_test_parameters" ADD CONSTRAINT "lab_test_parameters_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_test_parameters" ADD CONSTRAINT "lab_test_parameters_test_id_lab_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."lab_tests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_tests" ADD CONSTRAINT "lab_tests_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_tests" ADD CONSTRAINT "lab_tests_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_prescription_id_prescriptions_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_admission_id_admissions_id_fk" FOREIGN KEY ("admission_id") REFERENCES "public"."admissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_administered_by_users_id_fk" FOREIGN KEY ("administered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_witnessed_by_users_id_fk" FOREIGN KEY ("witnessed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound_messages" ADD CONSTRAINT "outbound_messages_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound_messages" ADD CONSTRAINT "outbound_messages_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound_messages" ADD CONSTRAINT "outbound_messages_sent_by_users_id_fk" FOREIGN KEY ("sent_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_allergies" ADD CONSTRAINT "patient_allergies_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_allergies" ADD CONSTRAINT "patient_allergies_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_allergies" ADD CONSTRAINT "patient_allergies_generic_id_drug_generics_id_fk" FOREIGN KEY ("generic_id") REFERENCES "public"."drug_generics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_allergies" ADD CONSTRAINT "patient_allergies_drug_class_id_drug_classes_id_fk" FOREIGN KEY ("drug_class_id") REFERENCES "public"."drug_classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_allergies" ADD CONSTRAINT "patient_allergies_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_charges" ADD CONSTRAINT "patient_charges_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_charges" ADD CONSTRAINT "patient_charges_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_charges" ADD CONSTRAINT "patient_charges_admission_id_admissions_id_fk" FOREIGN KEY ("admission_id") REFERENCES "public"."admissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_charges" ADD CONSTRAINT "patient_charges_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_charges" ADD CONSTRAINT "patient_charges_service_item_id_service_items_id_fk" FOREIGN KEY ("service_item_id") REFERENCES "public"."service_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_charges" ADD CONSTRAINT "patient_charges_ward_id_wards_id_fk" FOREIGN KEY ("ward_id") REFERENCES "public"."wards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_charges" ADD CONSTRAINT "patient_charges_waived_by_users_id_fk" FOREIGN KEY ("waived_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_charges" ADD CONSTRAINT "patient_charges_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_consents" ADD CONSTRAINT "patient_consents_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_consents" ADD CONSTRAINT "patient_consents_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_consents" ADD CONSTRAINT "patient_consents_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_coverages" ADD CONSTRAINT "patient_coverages_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_coverages" ADD CONSTRAINT "patient_coverages_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_coverages" ADD CONSTRAINT "patient_coverages_hmo_id_hmos_id_fk" FOREIGN KEY ("hmo_id") REFERENCES "public"."hmos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_coverages" ADD CONSTRAINT "patient_coverages_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_duplicate_dismissals" ADD CONSTRAINT "patient_duplicate_dismissals_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_duplicate_dismissals" ADD CONSTRAINT "patient_duplicate_dismissals_low_id_patients_id_fk" FOREIGN KEY ("low_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_duplicate_dismissals" ADD CONSTRAINT "patient_duplicate_dismissals_high_id_patients_id_fk" FOREIGN KEY ("high_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_duplicate_dismissals" ADD CONSTRAINT "patient_duplicate_dismissals_dismissed_by_users_id_fk" FOREIGN KEY ("dismissed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_identifiers" ADD CONSTRAINT "patient_identifiers_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_identifiers" ADD CONSTRAINT "patient_identifiers_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_identifiers" ADD CONSTRAINT "patient_identifiers_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_measurements" ADD CONSTRAINT "patient_measurements_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_measurements" ADD CONSTRAINT "patient_measurements_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_measurements" ADD CONSTRAINT "patient_measurements_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_merges" ADD CONSTRAINT "patient_merges_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_merges" ADD CONSTRAINT "patient_merges_survivor_id_patients_id_fk" FOREIGN KEY ("survivor_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_merges" ADD CONSTRAINT "patient_merges_merged_id_patients_id_fk" FOREIGN KEY ("merged_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_merges" ADD CONSTRAINT "patient_merges_merged_by_users_id_fk" FOREIGN KEY ("merged_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_merges" ADD CONSTRAINT "patient_merges_undone_by_users_id_fk" FOREIGN KEY ("undone_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_problems" ADD CONSTRAINT "patient_problems_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_problems" ADD CONSTRAINT "patient_problems_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_problems" ADD CONSTRAINT "patient_problems_icd_code_icd11_codes_code_fk" FOREIGN KEY ("icd_code") REFERENCES "public"."icd11_codes"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_problems" ADD CONSTRAINT "patient_problems_source_visit_id_visits_id_fk" FOREIGN KEY ("source_visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_problems" ADD CONSTRAINT "patient_problems_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_referrals" ADD CONSTRAINT "patient_referrals_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_referrals" ADD CONSTRAINT "patient_referrals_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_referrals" ADD CONSTRAINT "patient_referrals_referrer_id_referrers_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."referrers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_referrals" ADD CONSTRAINT "patient_referrals_test_id_lab_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."lab_tests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_referrals" ADD CONSTRAINT "patient_referrals_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_referrals" ADD CONSTRAINT "patient_referrals_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_referrals" ADD CONSTRAINT "patient_referrals_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_subscriptions" ADD CONSTRAINT "patient_subscriptions_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_subscriptions" ADD CONSTRAINT "patient_subscriptions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_subscriptions" ADD CONSTRAINT "patient_subscriptions_billing_plan_id_billing_plans_id_fk" FOREIGN KEY ("billing_plan_id") REFERENCES "public"."billing_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_hmo_id_hmos_id_fk" FOREIGN KEY ("hmo_id") REFERENCES "public"."hmos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_referrer_id_referrers_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."referrers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_items" ADD CONSTRAINT "payment_items_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_confirmed_by_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_shift_id_cashier_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."cashier_shifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_generic_id_drug_generics_id_fk" FOREIGN KEY ("generic_id") REFERENCES "public"."drug_generics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_dispensed_product_id_products_id_fk" FOREIGN KEY ("dispensed_product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_admission_id_admissions_id_fk" FOREIGN KEY ("admission_id") REFERENCES "public"."admissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_stopped_by_users_id_fk" FOREIGN KEY ("stopped_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_price_list_id_price_lists_id_fk" FOREIGN KEY ("price_list_id") REFERENCES "public"."price_lists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_lists" ADD CONSTRAINT "price_lists_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_lists" ADD CONSTRAINT "price_lists_hmo_id_hmos_id_fk" FOREIGN KEY ("hmo_id") REFERENCES "public"."hmos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_lists" ADD CONSTRAINT "price_lists_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_generic_id_drug_generics_id_fk" FOREIGN KEY ("generic_id") REFERENCES "public"."drug_generics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrers" ADD CONSTRAINT "referrers_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_results" ADD CONSTRAINT "request_results_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_results" ADD CONSTRAINT "request_results_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_test_id_lab_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."lab_tests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_items" ADD CONSTRAINT "service_items_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_charges" ADD CONSTRAINT "subscription_charges_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_charges" ADD CONSTRAINT "subscription_charges_patient_subscription_id_patient_subscriptions_id_fk" FOREIGN KEY ("patient_subscription_id") REFERENCES "public"."patient_subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_charges" ADD CONSTRAINT "subscription_charges_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_charges" ADD CONSTRAINT "subscription_charges_wallet_transaction_id_wallet_transactions_id_fk" FOREIGN KEY ("wallet_transaction_id") REFERENCES "public"."wallet_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supply_order_items" ADD CONSTRAINT "supply_order_items_order_id_supply_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."supply_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supply_order_items" ADD CONSTRAINT "supply_order_items_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supply_order_items" ADD CONSTRAINT "supply_order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supply_orders" ADD CONSTRAINT "supply_orders_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supply_orders" ADD CONSTRAINT "supply_orders_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supply_orders" ADD CONSTRAINT "supply_orders_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaccination_courses" ADD CONSTRAINT "vaccination_courses_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaccination_courses" ADD CONSTRAINT "vaccination_courses_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaccination_courses" ADD CONSTRAINT "vaccination_courses_vaccine_id_vaccines_id_fk" FOREIGN KEY ("vaccine_id") REFERENCES "public"."vaccines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaccination_courses" ADD CONSTRAINT "vaccination_courses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaccination_doses" ADD CONSTRAINT "vaccination_doses_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaccination_doses" ADD CONSTRAINT "vaccination_doses_course_id_vaccination_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."vaccination_courses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaccination_doses" ADD CONSTRAINT "vaccination_doses_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaccination_doses" ADD CONSTRAINT "vaccination_doses_charge_id_patient_charges_id_fk" FOREIGN KEY ("charge_id") REFERENCES "public"."patient_charges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaccination_doses" ADD CONSTRAINT "vaccination_doses_given_by_users_id_fk" FOREIGN KEY ("given_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaccines" ADD CONSTRAINT "vaccines_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_diagnoses" ADD CONSTRAINT "visit_diagnoses_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_diagnoses" ADD CONSTRAINT "visit_diagnoses_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_diagnoses" ADD CONSTRAINT "visit_diagnoses_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_diagnoses" ADD CONSTRAINT "visit_diagnoses_icd_code_icd11_codes_code_fk" FOREIGN KEY ("icd_code") REFERENCES "public"."icd11_codes"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_diagnoses" ADD CONSTRAINT "visit_diagnoses_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_admission_id_admissions_id_fk" FOREIGN KEY ("admission_id") REFERENCES "public"."admissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wards" ADD CONSTRAINT "wards_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wards" ADD CONSTRAINT "wards_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admissions_org_status_idx" ON "admissions" USING btree ("organisation_id","status");--> statement-breakpoint
CREATE INDEX "admissions_patient_idx" ON "admissions" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "appointments_patient_idx" ON "appointments" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "appointments_org_date_idx" ON "appointments" USING btree ("organisation_id","appointment_date");--> statement-breakpoint
CREATE INDEX "appointments_doctor_date_idx" ON "appointments" USING btree ("doctor_id","appointment_date");--> statement-breakpoint
CREATE INDEX "audit_logs_org_created_idx" ON "audit_logs" USING btree ("organisation_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_login_attempts_idx" ON "audit_logs" USING btree ("user_email","action","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "beds_number_ward_idx" ON "beds" USING btree ("bed_number","ward_id");--> statement-breakpoint
CREATE INDEX "beds_ward_status_idx" ON "beds" USING btree ("ward_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_plan_items_unique_idx" ON "billing_plan_items" USING btree ("billing_plan_id","item_type","item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cashier_shifts_one_open_idx" ON "cashier_shifts" USING btree ("organisation_id","user_id") WHERE status = 'open';--> statement-breakpoint
CREATE INDEX "cds_alert_events_org_rule_idx" ON "cds_alert_events" USING btree ("organisation_id","rule","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "claim_batches_org_reference_idx" ON "claim_batches" USING btree ("organisation_id","reference");--> statement-breakpoint
CREATE INDEX "claim_batches_org_hmo_idx" ON "claim_batches" USING btree ("organisation_id","hmo_id","period_month");--> statement-breakpoint
CREATE INDEX "critical_alerts_org_open_idx" ON "critical_alerts" USING btree ("organisation_id","acknowledged_at");--> statement-breakpoint
CREATE UNIQUE INDEX "critical_alerts_result_idx" ON "critical_alerts" USING btree ("result_value_id");--> statement-breakpoint
CREATE INDEX "data_requests_org_created_idx" ON "data_requests" USING btree ("organisation_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "departments_name_org_idx" ON "departments" USING btree ("name","organisation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "drug_classes_builtin_key_idx" ON "drug_classes" USING btree ("key") WHERE organisation_id IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "drug_classes_org_key_idx" ON "drug_classes" USING btree ("organisation_id","key") WHERE organisation_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "drug_generics_org_name_idx" ON "drug_generics" USING btree ("organisation_id","name");--> statement-breakpoint
CREATE INDEX "eligibility_checks_coverage_idx" ON "eligibility_checks" USING btree ("coverage_id","checked_at");--> statement-breakpoint
CREATE INDEX "hmo_authorization_items_item_idx" ON "hmo_authorization_items" USING btree ("item_type","item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hmo_authorization_items_unique_idx" ON "hmo_authorization_items" USING btree ("authorization_id","item_type","item_id");--> statement-breakpoint
CREATE INDEX "hmo_authorizations_org_status_idx" ON "hmo_authorizations" USING btree ("organisation_id","status","requested_at");--> statement-breakpoint
CREATE INDEX "hmo_authorizations_patient_idx" ON "hmo_authorizations" USING btree ("patient_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hmo_charges_item_idx" ON "hmo_charges" USING btree ("item_type","item_id");--> statement-breakpoint
CREATE INDEX "hmo_charges_org_hmo_status_idx" ON "hmo_charges" USING btree ("organisation_id","hmo_id","status");--> statement-breakpoint
CREATE INDEX "hmo_charges_claim_batch_idx" ON "hmo_charges" USING btree ("claim_batch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hmos_org_name_idx" ON "hmos" USING btree ("organisation_id",lower("name")) WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "inventory_items_org_idx" ON "inventory_items" USING btree ("organisation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lab_result_values_request_param_idx" ON "lab_result_values" USING btree ("request_id","parameter_id");--> statement-breakpoint
CREATE INDEX "lab_test_parameters_test_idx" ON "lab_test_parameters" USING btree ("test_id");--> statement-breakpoint
CREATE INDEX "medication_administrations_rx_idx" ON "medication_administrations" USING btree ("prescription_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "medication_administrations_adm_idx" ON "medication_administrations" USING btree ("admission_id","given_at");--> statement-breakpoint
CREATE UNIQUE INDEX "medication_administrations_slot_idx" ON "medication_administrations" USING btree ("prescription_id","scheduled_at") WHERE scheduled_at IS NOT NULL AND deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "message_templates_org_kind_idx" ON "message_templates" USING btree ("organisation_id","kind");--> statement-breakpoint
CREATE INDEX "notifications_user_read_idx" ON "notifications" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE INDEX "outbound_messages_org_created_idx" ON "outbound_messages" USING btree ("organisation_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "outbound_messages_dedupe_idx" ON "outbound_messages" USING btree ("organisation_id","dedupe_key") WHERE dedupe_key IS NOT NULL;--> statement-breakpoint
CREATE INDEX "outbound_messages_patient_idx" ON "outbound_messages" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "patient_allergies_patient_idx" ON "patient_allergies" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "patient_charges_admission_idx" ON "patient_charges" USING btree ("admission_id");--> statement-breakpoint
CREATE INDEX "patient_charges_patient_idx" ON "patient_charges" USING btree ("patient_id");--> statement-breakpoint
CREATE UNIQUE INDEX "patient_charges_bed_day_idx" ON "patient_charges" USING btree ("admission_id","charge_date") WHERE source_type = 'bed_day';--> statement-breakpoint
CREATE INDEX "patient_charges_org_created_idx" ON "patient_charges" USING btree ("organisation_id","created_at");--> statement-breakpoint
CREATE INDEX "patient_consents_patient_idx" ON "patient_consents" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "patient_coverages_patient_idx" ON "patient_coverages" USING btree ("patient_id");--> statement-breakpoint
CREATE UNIQUE INDEX "patient_duplicate_dismissals_pair_idx" ON "patient_duplicate_dismissals" USING btree ("low_id","high_id");--> statement-breakpoint
CREATE INDEX "patient_identifiers_patient_idx" ON "patient_identifiers" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "patient_identifiers_org_value_idx" ON "patient_identifiers" USING btree ("organisation_id","value");--> statement-breakpoint
CREATE INDEX "patient_measurements_patient_idx" ON "patient_measurements" USING btree ("patient_id","measured_at");--> statement-breakpoint
CREATE INDEX "patient_merges_org_idx" ON "patient_merges" USING btree ("organisation_id","merged_at");--> statement-breakpoint
CREATE INDEX "patient_problems_patient_idx" ON "patient_problems" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "patient_referrals_referrer_idx" ON "patient_referrals" USING btree ("referrer_id");--> statement-breakpoint
CREATE INDEX "patient_referrals_patient_idx" ON "patient_referrals" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "patient_subscriptions_status_charge_idx" ON "patient_subscriptions" USING btree ("status","next_charge_date");--> statement-breakpoint
CREATE INDEX "patients_org_created_idx" ON "patients" USING btree ("organisation_id","created_at");--> statement-breakpoint
CREATE INDEX "payments_org_created_idx" ON "payments" USING btree ("organisation_id","created_at");--> statement-breakpoint
CREATE INDEX "payments_patient_idx" ON "payments" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "prescriptions_generic_idx" ON "prescriptions" USING btree ("generic_id");--> statement-breakpoint
CREATE INDEX "prescriptions_admission_idx" ON "prescriptions" USING btree ("admission_id");--> statement-breakpoint
CREATE INDEX "prescriptions_org_created_idx" ON "prescriptions" USING btree ("organisation_id","created_at");--> statement-breakpoint
CREATE INDEX "prescriptions_patient_idx" ON "prescriptions" USING btree ("patient_id");--> statement-breakpoint
CREATE UNIQUE INDEX "price_list_items_unique_idx" ON "price_list_items" USING btree ("price_list_id","item_type","item_id");--> statement-breakpoint
CREATE INDEX "price_lists_org_hmo_idx" ON "price_lists" USING btree ("organisation_id","hmo_id");--> statement-breakpoint
CREATE INDEX "products_generic_idx" ON "products" USING btree ("generic_id");--> statement-breakpoint
CREATE INDEX "referrers_org_idx" ON "referrers" USING btree ("organisation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "referrers_code_idx" ON "referrers" USING btree ("code");--> statement-breakpoint
CREATE INDEX "request_results_request_idx" ON "request_results" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "requests_org_created_idx" ON "requests" USING btree ("organisation_id","created_at");--> statement-breakpoint
CREATE INDEX "requests_patient_idx" ON "requests" USING btree ("patient_id");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_name_org_idx" ON "roles" USING btree ("name","organisation_id");--> statement-breakpoint
CREATE INDEX "service_items_org_idx" ON "service_items" USING btree ("organisation_id");--> statement-breakpoint
CREATE INDEX "supply_orders_org_created_idx" ON "supply_orders" USING btree ("organisation_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_org_idx" ON "users" USING btree ("email","organisation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_org_idx" ON "users" USING btree ("username","organisation_id");--> statement-breakpoint
CREATE INDEX "vaccination_courses_patient_idx" ON "vaccination_courses" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "vaccination_doses_course_idx" ON "vaccination_doses" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "vaccination_doses_patient_idx" ON "vaccination_doses" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "vaccination_doses_org_date_idx" ON "vaccination_doses" USING btree ("organisation_id","scheduled_date");--> statement-breakpoint
CREATE INDEX "vaccination_doses_charge_idx" ON "vaccination_doses" USING btree ("charge_id");--> statement-breakpoint
CREATE INDEX "vaccines_org_idx" ON "vaccines" USING btree ("organisation_id");--> statement-breakpoint
CREATE INDEX "visit_diagnoses_patient_idx" ON "visit_diagnoses" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "visits_org_created_idx" ON "visits" USING btree ("organisation_id","created_at");--> statement-breakpoint
CREATE INDEX "visits_patient_idx" ON "visits" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "vital_signs_patient_idx" ON "vital_signs" USING btree ("patient_id","recorded_at");--> statement-breakpoint
CREATE INDEX "vital_signs_admission_idx" ON "vital_signs" USING btree ("admission_id","recorded_at");--> statement-breakpoint
CREATE INDEX "wallet_transactions_wallet_idx" ON "wallet_transactions" USING btree ("wallet_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wallets_patient_idx" ON "wallets" USING btree ("patient_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wards_org_name_idx" ON "wards" USING btree ("organisation_id","name");--> statement-breakpoint
-- Production also has these, added over time by one-off lib/db/add-*.ts scripts
-- rather than declared in schema.ts, so a database built from this baseline
-- matches production.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
--> statement-breakpoint
ALTER TABLE users ADD CONSTRAINT users_username_unique UNIQUE (username);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS admission_transfers_admission_idx ON admission_transfers USING btree (admission_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS admissions_bed_idx ON admissions USING btree (bed_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS admissions_org_status_requested_idx ON admissions USING btree (organisation_id, status, requested_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS beds_ward_idx ON beds USING btree (ward_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS billing_plans_org_idx ON billing_plans USING btree (organisation_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS cashier_shifts_org_opened_idx ON cashier_shifts USING btree (organisation_id, opened_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS data_requests_org_status_idx ON data_requests USING btree (organisation_id, status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS data_requests_patient_idx ON data_requests USING btree (patient_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS icd11_codes_code_prefix_idx ON icd11_codes USING btree (code text_pattern_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS icd11_codes_title_trgm_idx ON icd11_codes USING gin (title gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS patient_subscriptions_patient_idx ON patient_subscriptions USING btree (patient_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS patients_firstname_trgm_idx ON patients USING gin (lower(firstname) gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS patients_lastname_trgm_idx ON patients USING gin (lower(lastname) gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS patients_nin_idx ON patients USING btree (nin);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS payment_items_item_idx ON payment_items USING btree (item_type, item_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS payment_items_payment_idx ON payment_items USING btree (payment_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS payments_org_status_idx ON payments USING btree (organisation_id, status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS payments_shift_idx ON payments USING btree (shift_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS subscription_charges_subscription_idx ON subscription_charges USING btree (patient_subscription_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS visit_diagnoses_code_idx ON visit_diagnoses USING btree (icd_code);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS visit_diagnoses_visit_idx ON visit_diagnoses USING btree (visit_id);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS patients_mrn_org_idx ON patients USING btree (organisation_id, mrn);
