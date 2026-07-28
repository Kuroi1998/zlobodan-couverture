import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, client } from "@/db/client";
import { quoteRequests, quoteStatusHistory } from "@/db/schema/quotes";
import { auditLog } from "@/db/schema/audit";
import {
  cancelQuoteRequest,
  getClientDashboard,
  getClientRequestByReference,
  listClientRequests,
} from "@/lib/services/client-portal-service";
import {
  getClientProfile,
  updateClientProfile,
} from "@/lib/services/client-profile-service";
import { createInternalNote } from "@/lib/services/internal-note-service";
import { listClientExchanges } from "@/lib/db/repositories/client-content-repository";
import {
  addContactMessage,
  addQuoteRequest,
  cleanupScenario,
  createScenario,
  type Scenario,
} from "./support/portal-fixtures";

/**
 * Espace client, sur PostgreSQL réel.
 *
 * L'axe est l'**isolation horizontale** : à chaque lecture et à chaque
 * écriture, on vérifie non seulement que le propriétaire obtient sa ressource,
 * mais qu'un autre compte n'obtient rien — et que le refus est indiscernable
 * d'une ressource inexistante.
 */

const REFERENCE_A = "DEM-2026-990101";
const REFERENCE_B = "DEM-2026-990102";

let scenario: Scenario;
let requestIdA = "";

beforeAll(async () => {
  scenario = await createScenario("portal-int");
  requestIdA = await addQuoteRequest(scenario, {
    ownerId: scenario.clientA.id,
    reference: REFERENCE_A,
    key: "portal-int-a",
    status: "submitted",
  });
  await addQuoteRequest(scenario, {
    ownerId: scenario.clientB.id,
    reference: REFERENCE_B,
    key: "portal-int-b",
    status: "submitted",
  });
  await addContactMessage(scenario, {
    ownerId: scenario.clientA.id,
    reference: "CNT-2026-990101",
    key: "portal-int-contact-a",
    message: "Message d'intégration du client A.",
  });
});

afterAll(async () => {
  await cleanupScenario(scenario);
  await client.end();
});

describe("isolation horizontale de l'espace client", () => {
  it("ne rend au client que ses propres demandes", async () => {
    const listA = await listClientRequests({
      ownerId: scenario.clientA.id,
      page: 1,
      pageSize: 20,
    });
    const references = listA.items.map((item) => item.reference);
    expect(references).toContain(REFERENCE_A);
    expect(references).not.toContain(REFERENCE_B);
  });

  it("refuse le détail d'une demande appartenant à un autre client", async () => {
    // Le client B connaît la référence de A : ce n'est pas un secret, elle
    // figure dans les courriels. Elle ne doit pourtant rien lui donner.
    await expect(
      getClientRequestByReference({ ownerId: scenario.clientB.id, reference: REFERENCE_A })
    ).resolves.toBeNull();

    // Et la référence inexistante produit exactement le même résultat.
    await expect(
      getClientRequestByReference({
        ownerId: scenario.clientB.id,
        reference: "DEM-2026-000000",
      })
    ).resolves.toBeNull();

    const own = await getClientRequestByReference({
      ownerId: scenario.clientA.id,
      reference: REFERENCE_A,
    });
    expect(own?.reference).toBe(REFERENCE_A);
  });

  it("n'expose ni note interne ni responsable dans la projection client", async () => {
    await createInternalNote({
      actor: scenario.operator,
      entityType: "quote_request",
      entityId: requestIdA,
      content: "SECRET_INTERNE_A_NE_PAS_FUITER",
    });

    const detail = await getClientRequestByReference({
      ownerId: scenario.clientA.id,
      reference: REFERENCE_A,
    });
    expect(detail).not.toBeNull();
    expect(JSON.stringify(detail)).not.toContain("SECRET_INTERNE");
    expect(detail).not.toHaveProperty("internalNotes");
    expect(detail).not.toHaveProperty("assignedToUserId");
    // Le motif de transition est rédigé pour l'interne : il ne sort pas.
    expect(detail?.history.every((entry) => !("reason" in entry))).toBe(true);
  });

  it("ne compte que les échanges du compte connecté", async () => {
    const exchangesA = await listClientExchanges({
      ownerId: scenario.clientA.id,
      page: 1,
      pageSize: 10,
    });
    const exchangesB = await listClientExchanges({
      ownerId: scenario.clientB.id,
      page: 1,
      pageSize: 10,
    });
    expect(exchangesA.total).toBe(1);
    expect(exchangesB.total).toBe(0);
  });
});

describe("pagination réelle", () => {
  it("borne la page et rapporte un total cohérent", async () => {
    const page = await listClientRequests({
      ownerId: scenario.clientA.id,
      page: 1,
      pageSize: 1,
    });
    expect(page.items).toHaveLength(1);
    expect(page.pageSize).toBe(1);
    expect(page.pageCount).toBe(page.total);

    const beyond = await listClientRequests({
      ownerId: scenario.clientA.id,
      page: 999,
      pageSize: 1,
    });
    // Au-delà de la dernière page : liste vide, mais total inchangé.
    expect(beyond.items).toHaveLength(0);
    expect(beyond.total).toBe(page.total);
  });
});

describe("annulation d'une demande", () => {
  it("refuse l'annulation d'une demande d'autrui sans la distinguer d'une inexistante", async () => {
    await expect(
      cancelQuoteRequest({ ownerId: scenario.clientB.id, reference: REFERENCE_A })
    ).resolves.toStrictEqual({ outcome: "not-found" });

    const untouched = await getClientRequestByReference({
      ownerId: scenario.clientA.id,
      reference: REFERENCE_A,
    });
    expect(untouched?.status).toBe("submitted");
  });

  it("annule, historise et audite en une transaction", async () => {
    const result = await cancelQuoteRequest({
      ownerId: scenario.clientA.id,
      reference: REFERENCE_A,
      reason: "Travaux réalisés autrement.",
    });
    expect(result).toStrictEqual({ outcome: "cancelled", reference: REFERENCE_A });

    const [row] = await db
      .select({ status: quoteRequests.status })
      .from(quoteRequests)
      .where(eq(quoteRequests.reference, REFERENCE_A));
    expect(row?.status).toBe("cancelled");

    const history = await db
      .select({ newStatus: quoteStatusHistory.newStatus })
      .from(quoteStatusHistory)
      .where(
        and(
          eq(quoteStatusHistory.quoteRequestId, requestIdA),
          eq(quoteStatusHistory.newStatus, "cancelled")
        )
      );
    expect(history).toHaveLength(1);

    const audit = await db
      .select({ action: auditLog.action })
      .from(auditLog)
      .where(eq(auditLog.action, "quote_request.cancelled_by_client"));
    expect(audit.length).toBeGreaterThan(0);
  });

  it("refuse une seconde annulation, la transition n'étant plus déclarée", async () => {
    const again = await cancelQuoteRequest({
      ownerId: scenario.clientA.id,
      reference: REFERENCE_A,
    });
    expect(again.outcome).toBe("not-cancellable");
  });
});

describe("profil client", () => {
  it("persiste la modification et l'audite sans recopier la donnée", async () => {
    const before = await getClientProfile(scenario.clientA.id);
    expect(before?.phone).toBeNull();

    const updated = await updateClientProfile({
      userId: scenario.clientA.id,
      input: { phone: "0470999888" },
    });
    expect(updated).toStrictEqual({
      outcome: "updated",
      phone: "0470999888",
      firstName: null,
      lastName: null,
    });

    const after = await getClientProfile(scenario.clientA.id);
    expect(after?.phone).toBe("0470999888");

    const entries = await db
      .select({ diff: auditLog.diff })
      .from(auditLog)
      .where(eq(auditLog.action, "profile.updated"));
    expect(entries.length).toBeGreaterThan(0);
    // Une piste d'audit n'a pas à recopier la donnée personnelle qu'elle décrit.
    expect(entries.map((entry) => entry.diff ?? "").join("")).not.toContain("0470999888");
  });

  it("accepte l'effacement du numéro", async () => {
    const cleared = await updateClientProfile({
      userId: scenario.clientA.id,
      input: { phone: "" },
    });
    expect(cleared).toStrictEqual({
      outcome: "updated",
      phone: null,
      firstName: null,
      lastName: null,
    });
  });
});

describe("tableau de bord client", () => {
  it("ne compte que ses propres dossiers", async () => {
    const dashboard = await getClientDashboard(scenario.clientA.id);
    expect(dashboard.requests.total).toBe(1);
    expect(dashboard.exchanges).toBe(1);
    expect(dashboard.latest.every((item) => item.reference === REFERENCE_A)).toBe(true);
  });
});
