import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { quoteRequests } from "./quotes";

/**
 * Documents émis par l'entreprise, et leurs versions successives.
 *
 * La table précédente portait le même nom mais ne servait à rien : aucune ligne
 * du dépôt ne l'écrivait ni ne la lisait. Elle décrivait un fichier unique —
 * `storage_path`, `checksum`, `size` en colonnes directes — ce qui interdit par
 * construction de conserver l'historique d'un document qui évolue.
 *
 * D'où la séparation en deux tables :
 *
 *  - `documents` porte l'**identité** du document : à qui il appartient, à
 *    quelle demande il se rattache, son type, son statut, qui peut le voir.
 *    Cette identité est stable dans le temps.
 *  - `document_versions` porte les **fichiers** : un par génération, chacun avec
 *    sa clé de stockage, sa taille et son empreinte. Rien n'est jamais écrasé.
 *
 * Un devis corrigé après envoi ne remplace donc pas le fichier que le client a
 * déjà reçu : il ajoute une version, et l'ancienne reste consultable et
 * vérifiable par son empreinte.
 */

/**
 * Types de documents réellement implémentés.
 *
 * La contrainte n'énumère que ce que l'application sait produire aujourd'hui.
 * Y inscrire `invoice` ou `contract` « pour plus tard » donnerait une base qui
 * promet des documents qui n'existent pas ; ajouter un type le jour venu est
 * une migration d'une ligne.
 */
export const DOCUMENT_TYPES = ["quote_request_summary"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

/**
 * Cycle de vie du document.
 *
 * `sent` et `archived` sont **figés** : le fichier associé a quitté
 * l'entreprise ou a valeur d'archive, et ne peut plus être remplacé
 * silencieusement. Une correction passe par une nouvelle version.
 */
export const DOCUMENT_STATUSES = [
  "generated",
  "sent",
  "archived",
  "cancelled",
] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

/**
 * Portée de diffusion.
 *
 * La visibilité **ne remplace pas** le contrôle de permission : elle exprime
 * l'intention métier (« ce document est destiné au client »), que
 * `authorizeDocumentAccess` combine ensuite au rôle, à la propriété et à
 * l'affectation.
 */
export const DOCUMENT_VISIBILITIES = [
  "private_admin",
  "assigned_staff",
  "client",
  "client_and_staff",
] as const;
export type DocumentVisibility = (typeof DOCUMENT_VISIBILITIES)[number];

/**
 * État de fabrication d'une version.
 *
 * Distinct du statut du document, et porté par la version parce que c'est le
 * fichier que l'on fabrique, pas l'identité. Une version reste `pending` tant
 * que l'octet n'est pas écrit dans le stockage : rien ne doit apparaître comme
 * disponible avant que le fichier existe réellement.
 */
export const DOCUMENT_VERSION_STATES = ["pending", "ready", "failed"] as const;
export type DocumentVersionState = (typeof DOCUMENT_VERSION_STATES)[number];

/**
 * Les listes ci-dessus et les contraintes `CHECK` plus bas énoncent deux fois
 * les mêmes valeurs. C'est délibéré : `sql.raw` est interdit hors de
 * `lib/db/raw-queries.ts`, seul point d'exception au SQL brut du dépôt, et
 * dériver la contrainte des constantes TypeScript imposerait de l'employer.
 * Les deux déclarations restent donc côte à côte, et un test vérifie qu'elles
 * ne divergent pas.
 */

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /**
     * Identifiant exposé dans les URL.
     *
     * Distinct de la clé primaire : un identifiant technique qui circule finit
     * par se retrouver dans un journal, un ticket ou une capture d'écran. Il
     * est aléatoire, donc non énumérable — ce qui reste une commodité, pas une
     * protection : l'autorisation est vérifiée dans tous les cas.
     */
    publicId: uuid("public_id").notNull().defaultRandom(),
    /** Référence lisible et unique, du type REC-2026-000001. */
    reference: varchar("reference", { length: 32 }).notNull(),

    /** Client auquel le document appartient. Jamais déduit du navigateur. */
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Opérateur à l'origine de la création ; conservé même s'il quitte l'entreprise. */
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    /** Entité métier d'origine. */
    quoteRequestId: uuid("quote_request_id").references(() => quoteRequests.id, {
      onDelete: "cascade",
    }),

    documentType: varchar("document_type", { length: 40 })
      .$type<DocumentType>()
      .notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    status: varchar("status", { length: 20 })
      .$type<DocumentStatus>()
      .notNull()
      .default("generated"),
    visibility: varchar("visibility", { length: 30 })
      .$type<DocumentVisibility>()
      .notNull()
      .default("private_admin"),

    /**
     * Version servie par défaut.
     *
     * La clé étrangère vers `document_versions` est posée dans la migration et
     * non ici : les deux tables se référencent mutuellement, et Drizzle ne sait
     * pas exprimer ce cycle sans annotation de type circulaire. La contrainte
     * existe donc bien en base, elle est simplement déclarée en SQL.
     */
    currentVersionId: uuid("current_version_id"),

    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    archivedAt: timestamp("archived_at", { mode: "date", withTimezone: true }),
    /** Suppression logique : les relations et le journal doivent survivre. */
    deletedAt: timestamp("deleted_at", { mode: "date", withTimezone: true }),
  },
  (table) => [
    uniqueIndex("uq_documents_public_id").on(table.publicId),
    uniqueIndex("uq_documents_reference").on(table.reference),
    index("idx_documents_owner").on(table.ownerUserId),
    index("idx_documents_quote_request").on(table.quoteRequestId),
    index("idx_documents_type").on(table.documentType),
    // Requête de l'espace client : « mes documents, les plus récents d'abord ».
    index("idx_documents_owner_created").on(table.ownerUserId, table.createdAt),
    check("documents_type_check", sql`${table.documentType} in ('quote_request_summary')`),
    check(
      "documents_status_check",
      sql`${table.status} in ('generated','sent','archived','cancelled')`
    ),
    check(
      "documents_visibility_check",
      sql`${table.visibility} in ('private_admin','assigned_staff','client','client_and_staff')`
    ),
  ]
);

export const documentVersions = pgTable(
  "document_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    /** Numéro affiché à l'utilisateur : 1, 2, 3… par document. */
    versionNumber: integer("version_number").notNull(),
    state: varchar("state", { length: 16 })
      .$type<DocumentVersionState>()
      .notNull()
      .default("pending"),

    /**
     * Clé interne du stockage privé — jamais une URL, jamais exposée.
     *
     * Nulle tant que la version n'est pas `ready` : la ligne est créée avant
     * l'écriture du fichier pour que l'échec laisse une trace au lieu de
     * disparaître.
     */
    storageKey: text("storage_key"),
    /** Nom proposé au téléchargement, construit côté serveur. */
    fileName: varchar("file_name", { length: 255 }),
    mimeType: varchar("mime_type", { length: 100 }),
    sizeBytes: integer("size_bytes"),

    checksumAlgorithm: varchar("checksum_algorithm", { length: 20 }),
    checksumValue: varchar("checksum_value", { length: 128 }),

    /**
     * Empreinte des données sources ayant servi à la génération.
     *
     * Sert l'idempotence : régénérer un document dont la demande n'a pas bougé
     * renvoie la version existante au lieu d'en empiler une identique. Ce n'est
     * pas un mécanisme d'autorisation.
     */
    sourceFingerprint: varchar("source_fingerprint", { length: 64 }),

    generatedByUserId: uuid("generated_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    /** Renseigné si la fabrication a échoué ; jamais le contenu du document. */
    failureReason: varchar("failure_reason", { length: 200 }),

    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Horodatage du remplacement par une version plus récente. */
    supersededAt: timestamp("superseded_at", { mode: "date", withTimezone: true }),
  },
  (table) => [
    uniqueIndex("uq_document_versions_number").on(
      table.documentId,
      table.versionNumber
    ),
    index("idx_document_versions_document").on(table.documentId),
    index("idx_document_versions_state").on(table.state),
    check(
      "document_versions_state_check",
      sql`${table.state} in ('pending','ready','failed')`
    ),
    check("document_versions_number_check", sql`${table.versionNumber} >= 1`),
    // Une version « prête » sans fichier serait un document fantôme : annoncé
    // comme disponible dans les listes, introuvable au téléchargement. La base
    // refuse cet état plutôt que de compter sur la discipline de l'appelant.
    check(
      "document_versions_ready_check",
      sql`${table.state} <> 'ready' or (${table.storageKey} is not null and ${table.checksumValue} is not null and ${table.sizeBytes} is not null and ${table.sizeBytes} > 0)`
    ),
  ]
);

export type DocumentRow = typeof documents.$inferSelect;
export type DocumentVersionRow = typeof documentVersions.$inferSelect;
