import { eq } from "drizzle-orm";
import { getServerEnv } from "@/config/env";
import { db } from "./client";
import { closeDatabase } from "./diagnostics";
import { users } from "./schema/users";
import { userTwoFactor } from "./schema/accounts";
import { contactMessages, contactStatusHistory } from "./schema/contacts";
import { quoteRequests, quoteStatusHistory } from "./schema/quotes";
import { internalNotes } from "./schema/notes";
import { hashPassword } from "@/lib/auth/password";
import { generateTotpSecret } from "@/lib/auth/totp";
import { formatPublicReference } from "@/lib/db/public-references";
import { PRIVACY_POLICY_VERSION } from "@/domain/privacy";
import { encryptSecret } from "@/lib/security/secret-box";

/**
 * Jeu de données de recette — `npm run db:seed`.
 *
 * Trois garanties :
 *
 *  - **refus en production**, avant toute écriture ;
 *  - **idempotent** : relancer le script ne duplique rien. Les comptes sont
 *    résolus par adresse, les dossiers par référence, et rien n'est réécrit si
 *    la référence existe déjà ;
 *  - **aucun mot de passe par défaut** : il est lu dans `SEED_PASSWORD`, et le
 *    script refuse de s'exécuter sans lui. Un mot de passe codé en dur finit
 *    toujours par se retrouver sur un environnement accessible.
 *
 * Ces données ne sont **jamais** insérées par l'application : elles n'existent
 * que par ce script, lancé à la main en développement ou par la CI avant les
 * tests d'intégration.
 */

const CLIENT_EMAIL = "client.demo@zlobodan.test";
const OTHER_CLIENT_EMAIL = "autre.client.demo@zlobodan.test";
const STAFF_EMAIL = "operateur.demo@zlobodan.test";
const ADMIN_EMAIL = "admin.demo@zlobodan.test";

/** Plage de références réservée au seed, hors de portée des séquences réelles. */
const SEED_REFERENCE_BASE = 900_000;

interface SeededUser {
  id: string;
  email: string;
}

async function upsertUser(params: {
  email: string;
  passwordHash: string;
  role: "client" | "staff" | "admin";
  phone: string | null;
  withTotp: boolean;
}): Promise<SeededUser> {
  const existing = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, params.email))
    .limit(1);
  if (existing[0]) return existing[0];

  // Les rôles privilégiés exigent un secret TOTP enrôlé, sinon la connexion
  // est refusée sans mode dégradé. Le seed le pose pour que le back-office
  // soit atteignable en recette ; le secret est imprimé une seule fois.
  const totp = params.withTotp ? generateTotpSecret(params.email) : null;

  const inserted = await db
    .insert(users)
    .values({
      email: params.email,
      normalizedEmail: params.email,
      passwordHash: params.passwordHash,
      role: params.role,
      status: "active",
      phone: params.phone,
      emailVerifiedAt: new Date(),
    })
    .returning({ id: users.id, email: users.email });

  const created = inserted[0];
  if (!created) throw new Error(`Création du compte ${params.email} non confirmée.`);

  if (totp) {
    await db.insert(userTwoFactor).values({
      userId: created.id,
      enabled: 1,
      encryptedSecret: encryptSecret(totp.base32, `two-factor:${created.id}`),
      confirmedAt: new Date(),
    });
    process.stdout.write(`  secret TOTP ${params.email} : ${totp.base32}\n`);
  }

  return created;
}

async function seedQuoteRequest(params: {
  index: number;
  ownerId: string | null;
  fullName: string;
  email: string;
  status: "submitted" | "under_review" | "contacted";
  interventionType: string;
  roofType: string;
  surface: string;
  isUrgent: boolean;
  city: string;
  postalCode: string;
  description: string;
}): Promise<string | null> {
  const reference = formatPublicReference(
    "quote_request",
    2026,
    SEED_REFERENCE_BASE + params.index
  );
  const existing = await db
    .select({ id: quoteRequests.id })
    .from(quoteRequests)
    .where(eq(quoteRequests.reference, reference))
    .limit(1);
  if (existing[0]) return null;

  const now = new Date();
  return db.transaction(async (transaction) => {
    const inserted = await transaction
      .insert(quoteRequests)
      .values({
        reference,
        submissionKey: `seed-quote-${params.index}`,
        userId: params.ownerId,
        fullName: params.fullName,
        email: params.email,
        phone: "+32470000000",
        city: params.city,
        postalCode: params.postalCode,
        interventionType: params.interventionType,
        roofType: params.roofType,
        surface: params.surface,
        isUrgent: params.isUrgent,
        description: params.description,
        status: params.status,
        consentPrivacy: true,
        consentAt: now,
        privacyPolicyVersion: PRIVACY_POLICY_VERSION,
        submittedAt: now,
      })
      .returning({ id: quoteRequests.id });

    const request = inserted[0];
    if (!request) throw new Error("Insertion de la demande de recette non confirmée.");

    await transaction.insert(quoteStatusHistory).values({
      quoteRequestId: request.id,
      previousStatus: null,
      newStatus: "submitted",
      reason: "Jeu de recette",
    });
    if (params.status !== "submitted") {
      await transaction.insert(quoteStatusHistory).values({
        quoteRequestId: request.id,
        previousStatus: "submitted",
        newStatus: params.status,
        reason: "Jeu de recette",
      });
    }
    return request.id;
  });
}

async function seedContact(params: {
  index: number;
  ownerId: string | null;
  fullName: string;
  email: string;
  subject: "general" | "emergency" | "follow_up" | "complaint" | "other";
  message: string;
  status: "new" | "read";
}): Promise<string | null> {
  const reference = formatPublicReference("contact", 2026, SEED_REFERENCE_BASE + params.index);
  const existing = await db
    .select({ id: contactMessages.id })
    .from(contactMessages)
    .where(eq(contactMessages.reference, reference))
    .limit(1);
  if (existing[0]) return null;

  const now = new Date();
  return db.transaction(async (transaction) => {
    const inserted = await transaction
      .insert(contactMessages)
      .values({
        reference,
        submissionKey: `seed-contact-${params.index}`,
        fullName: params.fullName,
        email: params.email,
        phone: "+32470000000",
        subject: params.subject,
        message: params.message,
        status: params.status,
        userId: params.ownerId,
        consentPrivacy: true,
        consentAt: now,
        privacyPolicyVersion: PRIVACY_POLICY_VERSION,
      })
      .returning({ id: contactMessages.id });

    const contact = inserted[0];
    if (!contact) throw new Error("Insertion du contact de recette non confirmée.");

    await transaction.insert(contactStatusHistory).values({
      contactMessageId: contact.id,
      previousStatus: null,
      newStatus: params.status,
      reason: "Jeu de recette",
    });
    return contact.id;
  });
}

async function main(): Promise<void> {
  const { nodeEnv } = getServerEnv();
  if (nodeEnv === "production") {
    throw new Error("Le seed est désactivé en production.");
  }

  const password = process.env.SEED_PASSWORD;
  if (!password || password.length < 12) {
    throw new Error(
      "SEED_PASSWORD est requise (12 caractères minimum). " +
        "Aucun mot de passe par défaut n'est fourni, volontairement."
    );
  }

  process.stdout.write(`Seed — environnement ${nodeEnv}\n`);
  const passwordHash = await hashPassword(password);

  const client = await upsertUser({
    email: CLIENT_EMAIL,
    passwordHash,
    role: "client",
    phone: "+32470111111",
    withTotp: false,
  });
  const otherClient = await upsertUser({
    email: OTHER_CLIENT_EMAIL,
    passwordHash,
    role: "client",
    phone: null,
    withTotp: false,
  });
  await upsertUser({
    email: STAFF_EMAIL,
    passwordHash,
    role: "staff",
    phone: null,
    withTotp: true,
  });
  const admin = await upsertUser({
    email: ADMIN_EMAIL,
    passwordHash,
    role: "admin",
    phone: null,
    withTotp: true,
  });

  const requestIds: (string | null)[] = [];
  requestIds.push(
    await seedQuoteRequest({
      index: 1,
      ownerId: client.id,
      fullName: "Client Démonstration",
      email: CLIENT_EMAIL,
      status: "submitted",
      interventionType: "fuite",
      roofType: "ardoise",
      surface: "less_50",
      isUrgent: true,
      city: "Bruxelles",
      postalCode: "1000",
      description: "Infiltration visible au plafond de la chambre après la pluie.",
    })
  );
  requestIds.push(
    await seedQuoteRequest({
      index: 2,
      ownerId: client.id,
      fullName: "Client Démonstration",
      email: CLIENT_EMAIL,
      status: "under_review",
      interventionType: "demoussage",
      roofType: "tuile_terre_cuite",
      surface: "50-100",
      isUrgent: false,
      city: "Waterloo",
      postalCode: "1410",
      description: "Mousse importante sur le versant nord.",
    })
  );
  requestIds.push(
    await seedQuoteRequest({
      index: 3,
      ownerId: otherClient.id,
      fullName: "Autre Client",
      email: OTHER_CLIENT_EMAIL,
      status: "contacted",
      interventionType: "gouttieres",
      roofType: "zinc",
      surface: "unknown",
      isUrgent: false,
      city: "Uccle",
      postalCode: "1180",
      description: "Gouttière descellée côté rue.",
    })
  );
  requestIds.push(
    await seedQuoteRequest({
      index: 4,
      ownerId: null,
      fullName: "Visiteur Anonyme",
      email: "visiteur.demo@zlobodan.test",
      status: "submitted",
      interventionType: "refection",
      roofType: "je_ne_sais_pas",
      surface: "more_150",
      isUrgent: false,
      city: "Wavre",
      postalCode: "1300",
      description: "Toiture d'origine, jamais rénovée.",
    })
  );

  const contactIds: (string | null)[] = [];
  contactIds.push(
    await seedContact({
      index: 1,
      ownerId: client.id,
      fullName: "Client Démonstration",
      email: CLIENT_EMAIL,
      subject: "follow_up",
      message: "Bonjour, avez-vous pu regarder ma demande d'intervention ?",
      status: "new",
    })
  );
  contactIds.push(
    await seedContact({
      index: 2,
      ownerId: null,
      fullName: "Prospect Démonstration",
      email: "prospect.demo@zlobodan.test",
      subject: "emergency",
      message: "Tuiles arrachées par le vent cette nuit, la pluie entre.",
      status: "new",
    })
  );
  contactIds.push(
    await seedContact({
      index: 3,
      ownerId: null,
      fullName: "Curieux Démonstration",
      email: "curieux.demo@zlobodan.test",
      subject: "general",
      message: "Intervenez-vous en province de Namur ?",
      status: "read",
    })
  );

  const firstRequest = requestIds.find((id): id is string => Boolean(id));
  const firstContact = contactIds.find((id): id is string => Boolean(id));
  if (firstRequest) {
    await db.insert(internalNotes).values({
      entityType: "quote_request",
      entityId: firstRequest,
      content: "Client rappelé, visite à caler en fin de semaine.",
      authorUserId: admin.id,
    });
  }
  if (firstContact) {
    await db.insert(internalNotes).values({
      entityType: "contact_message",
      entityId: firstContact,
      content: "Relance à prévoir sous 48 h si pas de retour.",
      authorUserId: admin.id,
    });
  }

  process.stdout.write(
    `  comptes : ${CLIENT_EMAIL}, ${OTHER_CLIENT_EMAIL}, ${STAFF_EMAIL}, ${ADMIN_EMAIL}\n` +
      `  demandes créées : ${requestIds.filter(Boolean).length} · ` +
      `contacts créés : ${contactIds.filter(Boolean).length}\n` +
      "  (les dossiers déjà présents ne sont pas recréés)\n"
  );

  await closeDatabase();
  process.stdout.write("✓ Terminé.\n");
}

main().catch(async (error) => {
  process.stderr.write(`✗ Seed échoué : ${error instanceof Error ? error.message : "erreur"}\n`);
  await closeDatabase().catch(() => undefined);
  process.exit(1);
});
