-- Infrastructure documentaire : documents émis et versions successives.
--
-- La table `documents` créée en 0000 est supprimée puis recréée plutôt
-- qu'altérée. Elle n'a jamais été ni lue ni écrite : aucun `insert`, aucun
-- `select` du dépôt ne la mentionnait, et son unique consommateur potentiel —
-- l'espace client — listait en réalité les pièces jointes. Elle est donc vide
-- par construction, et l'altérer colonne par colonne pour arriver à un modèle
-- très différent aurait produit une migration illisible.
--
-- Elle décrivait par ailleurs un fichier unique par ligne, ce qui interdit de
-- conserver l'historique d'un document qui évolue — la raison même de cette
-- migration.
DROP TABLE IF EXISTS "documents" CASCADE;
--> statement-breakpoint

-- Référence publique des documents : REC-2026-000001.
-- Séquence PostgreSQL, seul mécanisme dont l'incrément est atomique sans
-- verrou explicite. Un `count(*) + 1` produit des doublons dès deux
-- générations simultanées.
CREATE SEQUENCE IF NOT EXISTS "seq_document_reference" AS BIGINT START WITH 1 INCREMENT BY 1 NO CYCLE;
--> statement-breakpoint

CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"reference" varchar(32) NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"created_by_user_id" uuid,
	"quote_request_id" uuid,
	"document_type" varchar(40) NOT NULL,
	"title" varchar(200) NOT NULL,
	"status" varchar(20) DEFAULT 'generated' NOT NULL,
	"visibility" varchar(30) DEFAULT 'private_admin' NOT NULL,
	"current_version_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint

CREATE TABLE "document_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"state" varchar(16) DEFAULT 'pending' NOT NULL,
	"storage_key" text,
	"file_name" varchar(255),
	"mime_type" varchar(100),
	"size_bytes" integer,
	"checksum_algorithm" varchar(20),
	"checksum_value" varchar(128),
	"source_fingerprint" varchar(64),
	"generated_by_user_id" uuid,
	"failure_reason" varchar(200),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"superseded_at" timestamp with time zone
);
--> statement-breakpoint

ALTER TABLE "documents" ADD CONSTRAINT "documents_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_quote_request_id_fk" FOREIGN KEY ("quote_request_id") REFERENCES "public"."quote_requests"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_generated_by_user_id_fk" FOREIGN KEY ("generated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

-- Référence croisée : le document désigne sa version courante, la version
-- désigne son document. Le cycle impose de poser cette contrainte après la
-- création des deux tables. `ON DELETE SET NULL` évite qu'une suppression de
-- version laisse un pointeur mort.
ALTER TABLE "documents" ADD CONSTRAINT "documents_current_version_id_fk" FOREIGN KEY ("current_version_id") REFERENCES "public"."document_versions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

CREATE UNIQUE INDEX "uq_documents_public_id" ON "documents" USING btree ("public_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_documents_reference" ON "documents" USING btree ("reference");
--> statement-breakpoint
CREATE INDEX "idx_documents_owner" ON "documents" USING btree ("owner_user_id");
--> statement-breakpoint
CREATE INDEX "idx_documents_quote_request" ON "documents" USING btree ("quote_request_id");
--> statement-breakpoint
CREATE INDEX "idx_documents_type" ON "documents" USING btree ("document_type");
--> statement-breakpoint
CREATE INDEX "idx_documents_owner_created" ON "documents" USING btree ("owner_user_id","created_at");
--> statement-breakpoint

CREATE UNIQUE INDEX "uq_document_versions_number" ON "document_versions" USING btree ("document_id","version_number");
--> statement-breakpoint
CREATE INDEX "idx_document_versions_document" ON "document_versions" USING btree ("document_id");
--> statement-breakpoint
CREATE INDEX "idx_document_versions_state" ON "document_versions" USING btree ("state");
--> statement-breakpoint

-- Une même clé de stockage ne peut servir deux versions : sans cette
-- contrainte, une régénération qui réutiliserait la clé écraserait le fichier
-- d'une version déjà remise au client. L'index est partiel car la clé reste
-- nulle tant que la version n'est pas écrite.
CREATE UNIQUE INDEX "uq_document_versions_storage_key" ON "document_versions" USING btree ("storage_key") WHERE "storage_key" IS NOT NULL;
--> statement-breakpoint

ALTER TABLE "documents" ADD CONSTRAINT "documents_type_check" CHECK ("documents"."document_type" in ('quote_request_summary'));
--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_status_check" CHECK ("documents"."status" in ('generated','sent','archived','cancelled'));
--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_visibility_check" CHECK ("documents"."visibility" in ('private_admin','assigned_staff','client','client_and_staff'));
--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_state_check" CHECK ("document_versions"."state" in ('pending','ready','failed'));
--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_number_check" CHECK ("document_versions"."version_number" >= 1);
--> statement-breakpoint

-- Une version « prête » sans fichier, sans empreinte ou de taille nulle serait
-- un document fantôme : annoncé disponible dans les listes, introuvable au
-- téléchargement. La base refuse cet état plutôt que de compter sur la
-- discipline de l'appelant.
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_ready_check" CHECK ("document_versions"."state" <> 'ready' OR ("document_versions"."storage_key" IS NOT NULL AND "document_versions"."checksum_value" IS NOT NULL AND "document_versions"."size_bytes" IS NOT NULL AND "document_versions"."size_bytes" > 0));
