import { inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema/users";
import { contactMessages } from "@/db/schema/contacts";
import { quoteRequests, quoteStatusHistory } from "@/db/schema/quotes";
import { internalNotes } from "@/db/schema/notes";
import { notificationOutbox } from "@/db/schema/notifications";
import { auditLog } from "@/db/schema/audit";
import type { AuthUser } from "@/lib/auth/permissions";
import { PRIVACY_POLICY_VERSION } from "@/domain/privacy";

/**
 * Décor partagé des suites d'intégration du portail.
 *
 * Les fichiers d'intégration s'exécutent sur **la même base**. Une suite qui
 * laisse ses lignes derrière elle fait échouer les assertions de comptage
 * absolu des autres — c'est pourquoi `cleanupScenario` est aussi important que
 * `createScenario`, et pourquoi chaque identifiant créé est mémorisé.
 *
 * Le préfixe passé à `createScenario` isole les suites entre elles : deux
 * fichiers ne se disputent ni les adresses e-mail ni les références, qui sont
 * toutes deux uniques en base.
 */

export interface Scenario {
  prefix: string;
  clientA: AuthUser;
  clientB: AuthUser;
  operator: AuthUser;
  requestIds: string[];
  contactIds: string[];
}

async function makeUser(
  email: string,
  role: "client" | "staff" | "admin"
): Promise<AuthUser> {
  const rows = await db
    .insert(users)
    .values({
      email,
      normalizedEmail: email,
      passwordHash: "not-used-in-integration-tests",
      role,
      status: "active",
      emailVerifiedAt: new Date(),
    })
    .returning({ id: users.id, email: users.email, role: users.role });
  const created = rows[0];
  if (!created) throw new Error(`Compte ${email} non créé.`);
  return { id: created.id, email: created.email, role: created.role };
}

export async function createScenario(prefix: string): Promise<Scenario> {
  return {
    prefix,
    clientA: await makeUser(`a.${prefix}@example.test`, "client"),
    clientB: await makeUser(`b.${prefix}@example.test`, "client"),
    operator: await makeUser(`ops.${prefix}@example.test`, "staff"),
    requestIds: [],
    contactIds: [],
  };
}

export async function addQuoteRequest(
  scenario: Scenario,
  params: {
    ownerId: string | null;
    reference: string;
    key: string;
    status: "submitted" | "accepted";
  }
): Promise<string> {
  const now = new Date();
  const rows = await db
    .insert(quoteRequests)
    .values({
      reference: params.reference,
      submissionKey: params.key,
      userId: params.ownerId,
      fullName: "Titulaire Test",
      email: "titulaire@example.test",
      phone: "+32470000000",
      city: "Bruxelles",
      postalCode: "1000",
      interventionType: "fuite",
      roofType: "ardoise",
      surface: "less_50",
      isUrgent: false,
      description: "Demande d'intégration.",
      status: params.status,
      consentPrivacy: true,
      consentAt: now,
      privacyPolicyVersion: PRIVACY_POLICY_VERSION,
      submittedAt: now,
    })
    .returning({ id: quoteRequests.id });

  const created = rows[0];
  if (!created) throw new Error("Demande non créée.");
  scenario.requestIds.push(created.id);
  return created.id;
}

export async function addContactMessage(
  scenario: Scenario,
  params: { ownerId: string; reference: string; key: string; message: string }
): Promise<string> {
  const rows = await db
    .insert(contactMessages)
    .values({
      reference: params.reference,
      submissionKey: params.key,
      fullName: "Client Intégration",
      email: `a.${scenario.prefix}@example.test`,
      subject: "general",
      message: params.message,
      status: "new",
      userId: params.ownerId,
      consentPrivacy: true,
      consentAt: new Date(),
      privacyPolicyVersion: PRIVACY_POLICY_VERSION,
    })
    .returning({ id: contactMessages.id });

  const created = rows[0];
  if (!created) throw new Error("Contact non créé.");
  scenario.contactIds.push(created.id);
  return created.id;
}

/** Suppression dans l'ordre inverse des dépendances. */
export async function cleanupScenario(scenario: Scenario): Promise<void> {
  const ownerIds = [scenario.clientA.id, scenario.clientB.id, scenario.operator.id];
  const entityIds = [...scenario.requestIds, ...scenario.contactIds];

  if (entityIds.length > 0) {
    await db.delete(internalNotes).where(inArray(internalNotes.entityId, entityIds));
    await db
      .delete(notificationOutbox)
      .where(inArray(notificationOutbox.entityId, entityIds));
  }
  if (scenario.requestIds.length > 0) {
    await db
      .delete(quoteStatusHistory)
      .where(inArray(quoteStatusHistory.quoteRequestId, scenario.requestIds));
    await db.delete(quoteRequests).where(inArray(quoteRequests.id, scenario.requestIds));
  }
  if (scenario.contactIds.length > 0) {
    await db.delete(contactMessages).where(inArray(contactMessages.id, scenario.contactIds));
  }
  await db.delete(auditLog).where(inArray(auditLog.userId, ownerIds));
  await db.delete(users).where(inArray(users.id, ownerIds));
}
