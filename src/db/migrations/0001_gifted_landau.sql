CREATE SEQUENCE IF NOT EXISTS "seq_contact_reference" AS BIGINT START WITH 1 INCREMENT BY 1 NO CYCLE;
--> statement-breakpoint
CREATE SEQUENCE IF NOT EXISTS "seq_quote_request_reference" AS BIGINT START WITH 1 INCREMENT BY 1 NO CYCLE;
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" varchar(32) NOT NULL,
	"submission_key" varchar(128) NOT NULL,
	"full_name" varchar(120) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(30),
	"subject" varchar(50) NOT NULL,
	"message" text NOT NULL,
	"status" varchar(30) DEFAULT 'new' NOT NULL,
	"source" varchar(30) DEFAULT 'website' NOT NULL,
	"user_id" uuid,
	"assigned_to_user_id" uuid,
	"internal_notes" text,
	"consent_privacy" boolean NOT NULL,
	"consent_at" timestamp with time zone NOT NULL,
	"privacy_policy_version" varchar(30) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone,
	"replied_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	CONSTRAINT "contact_messages_status_check" CHECK ("contact_messages"."status" in ('new','read','in_progress','replied','closed','archived','spam')),
	CONSTRAINT "contact_messages_consent_check" CHECK ("contact_messages"."consent_privacy" = true)
);
--> statement-breakpoint
CREATE TABLE "contact_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_message_id" uuid NOT NULL,
	"previous_status" varchar(30),
	"new_status" varchar(30) NOT NULL,
	"changed_by_user_id" uuid,
	"reason" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_request_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"stored_name" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size_bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	"checksum" varchar(64) NOT NULL,
	"uploaded_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "quote_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_request_id" uuid NOT NULL,
	"previous_status" varchar(30),
	"new_status" varchar(30) NOT NULL,
	"changed_by_user_id" uuid,
	"reason" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" varchar(80) NOT NULL,
	"entity_type" varchar(40) NOT NULL,
	"entity_id" uuid NOT NULL,
	"recipient" varchar(255) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"last_error" text,
	CONSTRAINT "notification_outbox_status_check" CHECK ("notification_outbox"."status" in ('pending','processing','sent','failed'))
);
--> statement-breakpoint
ALTER TABLE "quote_requests" ALTER COLUMN "status" SET DEFAULT 'submitted';--> statement-breakpoint
ALTER TABLE "quote_requests" ADD COLUMN "reference" varchar(32);--> statement-breakpoint
ALTER TABLE "quote_requests" ADD COLUMN "submission_key" varchar(128);--> statement-breakpoint
ALTER TABLE "quote_requests" ADD COLUMN "assigned_to_user_id" uuid;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD COLUMN "internal_notes" text;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD COLUMN "consent_privacy" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD COLUMN "consent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD COLUMN "privacy_policy_version" varchar(30);--> statement-breakpoint
ALTER TABLE "quote_requests" ADD COLUMN "submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE "quote_requests"
SET
	"reference" = 'DEV-' || EXTRACT(YEAR FROM "created_at")::integer::text || '-' || LPAD(nextval('seq_quote_request_reference')::text, 6, '0'),
	"submission_key" = 'legacy-' || "id"::text,
	"status" = CASE
		WHEN "status" = 'pending' THEN 'submitted'
		WHEN "status" = 'reviewed' THEN 'under_review'
		WHEN "status" = 'converted' THEN 'estimate_in_preparation'
		ELSE "status"
	END,
	"submitted_at" = "created_at"
WHERE "reference" IS NULL;--> statement-breakpoint
ALTER TABLE "quote_requests" ALTER COLUMN "reference" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "quote_requests" ALTER COLUMN "submission_key" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "quote_requests" ALTER COLUMN "consent_privacy" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_status_history" ADD CONSTRAINT "contact_status_history_contact_message_id_contact_messages_id_fk" FOREIGN KEY ("contact_message_id") REFERENCES "public"."contact_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_status_history" ADD CONSTRAINT "contact_status_history_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_attachments" ADD CONSTRAINT "quote_attachments_quote_request_id_quote_requests_id_fk" FOREIGN KEY ("quote_request_id") REFERENCES "public"."quote_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_attachments" ADD CONSTRAINT "quote_attachments_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_status_history" ADD CONSTRAINT "quote_status_history_quote_request_id_quote_requests_id_fk" FOREIGN KEY ("quote_request_id") REFERENCES "public"."quote_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_status_history" ADD CONSTRAINT "quote_status_history_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_contact_messages_reference" ON "contact_messages" USING btree ("reference");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_contact_messages_submission_key" ON "contact_messages" USING btree ("submission_key");--> statement-breakpoint
CREATE INDEX "idx_contact_messages_status" ON "contact_messages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_contact_messages_created_at" ON "contact_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_contact_messages_email" ON "contact_messages" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_contact_messages_user_id" ON "contact_messages" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_contact_status_history_message" ON "contact_status_history" USING btree ("contact_message_id");--> statement-breakpoint
CREATE INDEX "idx_contact_status_history_created_at" ON "contact_status_history" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_quote_attachments_storage_key" ON "quote_attachments" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "idx_quote_attachments_request" ON "quote_attachments" USING btree ("quote_request_id");--> statement-breakpoint
CREATE INDEX "idx_quote_attachments_checksum" ON "quote_attachments" USING btree ("checksum");--> statement-breakpoint
CREATE INDEX "idx_quote_status_history_request" ON "quote_status_history" USING btree ("quote_request_id");--> statement-breakpoint
CREATE INDEX "idx_quote_status_history_created_at" ON "quote_status_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_notification_outbox_dispatch" ON "notification_outbox" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "idx_notification_outbox_entity" ON "notification_outbox" USING btree ("entity_type","entity_id");--> statement-breakpoint
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_quote_requests_reference" ON "quote_requests" USING btree ("reference");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_quote_requests_submission_key" ON "quote_requests" USING btree ("submission_key");--> statement-breakpoint
CREATE INDEX "idx_quote_req_status" ON "quote_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_quote_req_created_at" ON "quote_requests" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_status_check" CHECK ("quote_requests"."status" in ('draft','submitted','under_review','contacted','visit_scheduled','estimate_in_preparation','estimate_sent','accepted','rejected','cancelled','archived'));
