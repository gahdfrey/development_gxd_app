CREATE TABLE "hmos" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hmos_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "visits" (
	"id" serial PRIMARY KEY NOT NULL,
	"appointment_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"doctor_id" integer NOT NULL,
	"doctor_notes" text,
	"duration_minutes" integer NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "visit_type" text DEFAULT 'new visit' NOT NULL;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "hmo_id" integer;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "policy_number" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "next_of_kin_firstname" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "next_of_kin_lastname" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "next_of_kin_relationship" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "next_of_kin_address" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "next_of_kin_phone" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "next_of_kin_email" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_hmo_id_hmos_id_fk" FOREIGN KEY ("hmo_id") REFERENCES "public"."hmos"("id") ON DELETE no action ON UPDATE no action;