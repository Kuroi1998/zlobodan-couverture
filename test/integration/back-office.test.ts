import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, client } from "@/db/client";
import { internalNotes } from "@/db/schema/notes";
import { notificationOutbox } from "@/db/schema/notifications";
import {
  createInternalNote,
  listInternalNotes,
} from "@/lib/services/internal-note-service";
import { changeQuoteRequestStatus } from "@/lib/services/quote-request-service";
import { getAdminDashboard } from "@/lib/services/admin-dashboard-service";
import {
  addContactMessage,
  addQuoteRequest,
  cleanupScenario,
  createScenario,
  type Scenario,
} from "./support/portal-fixtures";

/**
 * Back-office, sur PostgreSQL réel.
 *
 * Deux garanties structurantes y sont vérifiées : les notes internes sont
 * inaccessibles au rôle client et ne s'écrasent jamais, et le changement de
 * statut émet sa notification **dans la transaction** de la transition.
 */

let scenario: Scenario;
let requestId = "";
let contactId = "";

beforeAll(async () => {
  scenario = await createScenario("backoffice-int");
  requestId = await addQuoteRequest(scenario, {
    ownerId: scenario.clientA.id,
    reference: "DEM-2026-990201",
    key: "backoffice-int-a",
    status: "submitted",
  });
  contactId = await addContactMessage(scenario, {
    ownerId: scenario.clientA.id,
    reference: "CNT-2026-990201",
    key: "backoffice-int-contact",
    message: "Message rattaché au dossier de back-office.",
  });
});

afterAll(async () => {
  await cleanupScenario(scenario);
  await client.end();
});

describe("notes internes", () => {
  it("refuse lecture et écriture à un client", async () => {
    await expect(
      listInternalNotes({
        actor: scenario.clientA,
        entityType: "quote_request",
        entityId: requestId,
      })
    ).resolves.toStrictEqual({ outcome: "forbidden" });

    await expect(
      createInternalNote({
        actor: scenario.clientA,
        entityType: "quote_request",
        entityId: requestId,
        content: "tentative",
      })
    ).resolves.toStrictEqual({ outcome: "forbidden" });
  });

  it("conserve auteur, contenu et horodatage pour un opérateur", async () => {
    const created = await createInternalNote({
      actor: scenario.operator,
      entityType: "contact_message",
      entityId: contactId,
      content: "Relance téléphonique effectuée.",
    });
    expect(created.outcome).toBe("created");

    const listed = await listInternalNotes({
      actor: scenario.operator,
      entityType: "contact_message",
      entityId: contactId,
    });
    expect(listed.outcome).toBe("ok");
    if (listed.outcome !== "ok") return;
    expect(listed.notes[0]?.content).toBe("Relance téléphonique effectuée.");
    expect(listed.notes[0]?.authorEmail).toBe(scenario.operator.email);
    expect(listed.notes[0]?.createdAt).toBeInstanceOf(Date);
  });

  it("n'accroche pas une note à une entité inexistante", async () => {
    // `entity_id` est polymorphe, donc sans clé étrangère : rien au niveau du
    // moteur n'empêcherait l'insertion. C'est le service qui tranche.
    await expect(
      createInternalNote({
        actor: scenario.operator,
        entityType: "quote_request",
        entityId: "3f4c1b2e-0000-4000-8000-000000000000",
        content: "orpheline",
      })
    ).resolves.toStrictEqual({ outcome: "entity-not-found" });
  });

  it("n'écrase jamais une note précédente", async () => {
    await createInternalNote({
      actor: scenario.operator,
      entityType: "contact_message",
      entityId: contactId,
      content: "Seconde observation.",
    });
    const rows = await db
      .select({ id: internalNotes.id })
      .from(internalNotes)
      .where(eq(internalNotes.entityId, contactId));
    expect(rows).toHaveLength(2);
  });
});

describe("changement de statut", () => {
  it("émet une notification client dans la même transaction", async () => {
    await changeQuoteRequestStatus({
      quoteRequestId: requestId,
      newStatus: "contacted",
      changedByUserId: scenario.operator.id,
      reason: "Client joint par téléphone.",
    });

    const queued = await db
      .select({
        eventType: notificationOutbox.eventType,
        payload: notificationOutbox.payload,
      })
      .from(notificationOutbox)
      .where(eq(notificationOutbox.entityId, requestId));
    const statusEvent = queued.find(
      (item) => item.eventType === "quote_request.status_changed"
    );
    expect(statusEvent?.payload.status).toBe("contacted");
  });

  it("ne notifie pas sur une transition purement interne", async () => {
    const silentId = await addQuoteRequest(scenario, {
      ownerId: scenario.clientB.id,
      reference: "DEM-2026-990202",
      key: "backoffice-int-silent",
      status: "submitted",
    });

    await changeQuoteRequestStatus({
      quoteRequestId: silentId,
      newStatus: "under_review",
      changedByUserId: scenario.operator.id,
    });

    const queued = await db
      .select({ eventType: notificationOutbox.eventType })
      .from(notificationOutbox)
      .where(eq(notificationOutbox.entityId, silentId));
    expect(queued.some((item) => item.eventType === "quote_request.status_changed")).toBe(
      false
    );
  });

  it("refuse une transition non déclarée sans rien écrire", async () => {
    const before = await db
      .select({ eventType: notificationOutbox.eventType })
      .from(notificationOutbox)
      .where(eq(notificationOutbox.entityId, requestId));

    await expect(
      changeQuoteRequestStatus({
        quoteRequestId: requestId,
        // `contacted → accepted` n'est pas déclarée.
        newStatus: "accepted",
        changedByUserId: scenario.operator.id,
      })
    ).rejects.toThrow("QUOTE_REQUEST_TRANSITION_FORBIDDEN");

    const after = await db
      .select({ eventType: notificationOutbox.eventType })
      .from(notificationOutbox)
      .where(eq(notificationOutbox.entityId, requestId));
    expect(after).toHaveLength(before.length);
  });
});

describe("tableau de bord administrateur", () => {
  it("n'expose que des indicateurs réellement alimentés", async () => {
    const dashboard = await getAdminDashboard();
    expect(dashboard.requests.total).toBeGreaterThan(0);
    expect(Object.keys(dashboard)).toStrictEqual([
      "requests",
      "contacts",
      "latest",
      "oldestUnread",
    ]);
    // Aucune tuile ne porte sur devis commerciaux, factures ou chantiers :
    // ces tables n'ont aucun chemin d'écriture en V1.
    expect(JSON.stringify(dashboard)).not.toMatch(/invoice|amountTtc|project/i);
  });
});
