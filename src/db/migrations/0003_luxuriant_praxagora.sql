CREATE TABLE "internal_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar(40) NOT NULL,
	"entity_id" uuid NOT NULL,
	"content" text NOT NULL,
	"author_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "internal_notes_entity_type_check" CHECK ("internal_notes"."entity_type" in ('contact_message','quote_request')),
	CONSTRAINT "internal_notes_content_check" CHECK (length("internal_notes"."content") between 1 and 5000)
);
--> statement-breakpoint
ALTER TABLE "internal_notes" ADD CONSTRAINT "internal_notes_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_internal_notes_entity" ON "internal_notes" USING btree ("entity_type","entity_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_internal_notes_author" ON "internal_notes" USING btree ("author_user_id");--> statement-breakpoint
CREATE INDEX "idx_quote_req_user_created" ON "quote_requests" USING btree ("user_id","created_at");--> statement-breakpoint
--
-- Reprise des notes existantes, AVANT la suppression des colonnes.
--
-- Ces colonnes étaient écrasées à chaque enregistrement : elles ne
-- contiennent qu'une note, sans auteur ni date propre. On la conserve telle
-- quelle, datée de la dernière modification du dossier, avec un auteur
-- inconnu — inventer un auteur serait pire que de l'admettre. Le contenu est
-- borné à la limite du CHECK, les valeurs vides sont ignorées.
--
INSERT INTO "internal_notes" ("entity_type", "entity_id", "content", "author_user_id", "created_at", "updated_at")
SELECT 'quote_request', "id", left(btrim("internal_notes"), 5000), NULL, "updated_at", "updated_at"
FROM "quote_requests"
WHERE "internal_notes" IS NOT NULL AND btrim("internal_notes") <> '';--> statement-breakpoint
INSERT INTO "internal_notes" ("entity_type", "entity_id", "content", "author_user_id", "created_at", "updated_at")
SELECT 'contact_message', "id", left(btrim("internal_notes"), 5000), NULL, "updated_at", "updated_at"
FROM "contact_messages"
WHERE "internal_notes" IS NOT NULL AND btrim("internal_notes") <> '';--> statement-breakpoint
--
-- Les colonnes d'origine disparaissent dans la même transaction : les laisser
-- créerait une seconde source de vérité, écrite par personne et lue par
-- personne, donc silencieusement périmée.
--
ALTER TABLE "contact_messages" DROP COLUMN "internal_notes";--> statement-breakpoint
ALTER TABLE "quote_requests" DROP COLUMN "internal_notes";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_check" CHECK ("users"."role" in ('client','staff','admin'));