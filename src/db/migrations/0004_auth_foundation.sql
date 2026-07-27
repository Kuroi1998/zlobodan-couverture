ALTER TABLE "users" ADD COLUMN "public_id" uuid DEFAULT gen_random_uuid() NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "normalized_email" varchar(255);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "first_name" varchar(100);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_name" varchar(100);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "status" varchar(30) DEFAULT 'pending_verification' NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_changed_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "disabled_at" timestamp with time zone;
--> statement-breakpoint
UPDATE "users"
SET
  "email" = lower(btrim("email")),
  "normalized_email" = lower(btrim("email")),
  "status" = CASE
    WHEN "deleted_at" IS NOT NULL THEN 'deleted'
    WHEN "locked_until" IS NOT NULL AND "locked_until" > now() THEN 'locked'
    WHEN "email_verified_at" IS NOT NULL THEN 'active'
    ELSE 'pending_verification'
  END;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "normalized_email" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_public_id_unique" UNIQUE("public_id");
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_normalized_email_unique" UNIQUE("normalized_email");
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_status_check" CHECK ("users"."status" in ('pending_verification','active','locked','disabled','deleted'));
--> statement-breakpoint
DROP INDEX IF EXISTS "idx_users_email";
--> statement-breakpoint
CREATE INDEX "idx_users_normalized_email" ON "users" USING btree ("normalized_email");
--> statement-breakpoint
CREATE INDEX "idx_users_status" ON "users" USING btree ("status");
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "device_name" varchar(160);
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "authenticated_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "last_verified_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE INDEX "idx_sessions_active" ON "sessions" USING btree ("user_id","revoked_at","expires_at");
--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD COLUMN "requested_ip_hash" varchar(64);
--> statement-breakpoint
ALTER TABLE "notification_outbox" ADD COLUMN "encrypted_payload" text;
--> statement-breakpoint
CREATE TABLE "email_change_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "new_email" varchar(255) NOT NULL,
  "normalized_new_email" varchar(255) NOT NULL,
  "token_hash" varchar(64) NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "confirmed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "email_change_requests_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "user_two_factor" (
  "user_id" uuid PRIMARY KEY NOT NULL,
  "enabled" integer DEFAULT 0 NOT NULL,
  "encrypted_secret" text NOT NULL,
  "confirmed_at" timestamp with time zone,
  "pending_expires_at" timestamp with time zone,
  "last_used_time_step" bigint,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "user_two_factor_enabled_check" CHECK ("user_two_factor"."enabled" in (0, 1))
);
--> statement-breakpoint
CREATE TABLE "two_factor_recovery_codes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "code_hash" varchar(64) NOT NULL,
  "used_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "two_factor_recovery_codes_code_hash_unique" UNIQUE("code_hash")
);
--> statement-breakpoint
CREATE TABLE "auth_challenges" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "token_hash" varchar(64) NOT NULL,
  "purpose" varchar(30) NOT NULL,
  "requested_path" varchar(512),
  "attempts" integer DEFAULT 0 NOT NULL,
  "max_attempts" integer DEFAULT 5 NOT NULL,
  "ip_hash" varchar(64),
  "user_agent" text,
  "expires_at" timestamp with time zone NOT NULL,
  "consumed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "auth_challenges_token_hash_unique" UNIQUE("token_hash"),
  CONSTRAINT "auth_challenges_purpose_check" CHECK ("auth_challenges"."purpose" in ('login','reauthentication')),
  CONSTRAINT "auth_challenges_attempts_check" CHECK ("auth_challenges"."attempts" >= 0 and "auth_challenges"."max_attempts" between 1 and 10)
);
--> statement-breakpoint
CREATE TABLE "security_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid,
  "session_id" uuid,
  "event_type" varchar(100) NOT NULL,
  "severity" varchar(20) NOT NULL,
  "route" varchar(255),
  "ip_hash" varchar(64),
  "user_agent" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_change_requests" ADD CONSTRAINT "email_change_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_two_factor" ADD CONSTRAINT "user_two_factor_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "two_factor_recovery_codes" ADD CONSTRAINT "two_factor_recovery_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "auth_challenges" ADD CONSTRAINT "auth_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_email_change_user" ON "email_change_requests" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "idx_email_change_token" ON "email_change_requests" USING btree ("token_hash");
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_pending_email_change" ON "email_change_requests" USING btree ("normalized_new_email") WHERE "confirmed_at" is null;
--> statement-breakpoint
CREATE INDEX "idx_recovery_codes_user" ON "two_factor_recovery_codes" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "idx_recovery_codes_hash" ON "two_factor_recovery_codes" USING btree ("code_hash");
--> statement-breakpoint
CREATE INDEX "idx_auth_challenges_token" ON "auth_challenges" USING btree ("token_hash");
--> statement-breakpoint
CREATE INDEX "idx_auth_challenges_user" ON "auth_challenges" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "idx_security_events_user" ON "security_events" USING btree ("user_id","created_at");
--> statement-breakpoint
CREATE INDEX "idx_security_events_type" ON "security_events" USING btree ("event_type","created_at");
--> statement-breakpoint
CREATE INDEX "idx_security_events_created" ON "security_events" USING btree ("created_at");
--> statement-breakpoint
INSERT INTO "user_two_factor" (
  "user_id",
  "enabled",
  "encrypted_secret",
  "confirmed_at",
  "pending_expires_at",
  "last_used_time_step"
)
SELECT
  "user_id",
  CASE WHEN "enabled" THEN 1 ELSE 0 END,
  "encrypted_secret",
  CASE WHEN "enabled" THEN now() ELSE NULL END,
  NULL,
  NULL
FROM "auth_totp_migration_buffer"
ON CONFLICT ("user_id") DO NOTHING;
--> statement-breakpoint
DROP TABLE "auth_totp_migration_buffer";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "totp_secret";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "totp_enabled";
