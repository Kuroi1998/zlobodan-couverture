import { describe, expect, test } from "vitest";
import { can, type AuthUser } from "@/lib/auth/permissions";

/**
 * Contrôle d'accès horizontal et vertical.
 *
 * La suite précédente réimplémentait `can()` en une ligne dans le fichier de
 * test au lieu de l'importer : elle validait une fonction fictive et serait
 * restée verte même si le moteur de production avait été supprimé (audit F2).
 * Tout ici porte sur la fonction réellement utilisée par l'application.
 */

const clientA: AuthUser = { id: "usr-1111", email: "a@client.be", role: "client" };
const clientB: AuthUser = { id: "usr-2222", email: "b@client.be", role: "client" };
const staff: AuthUser = { id: "usr-3333", email: "staff@zlobodan.be", role: "staff" };
const admin: AuthUser = { id: "usr-0000", email: "admin@zlobodan.be", role: "admin" };

const RESOURCES_OF_A = [
  { label: "devis", type: "quote" as const, owner: { userId: clientA.id } },
  { label: "facture", type: "invoice" as const, owner: { userId: clientA.id } },
  { label: "chantier", type: "project" as const, owner: { ownerId: clientA.id } },
  { label: "document", type: "document" as const, owner: { ownerId: clientA.id } },
  { label: "message", type: "message" as const, owner: { ownerId: clientA.id } },
];

describe("Contrôle horizontal — cloisonnement entre clients", () => {
  test("un client accède à ses propres ressources", () => {
    for (const r of RESOURCES_OF_A) {
      expect(can(clientA, "read", r.type, r.owner)).toBe(true);
    }
  });

  test("un client n'atteint aucune ressource d'un autre client", () => {
    for (const r of RESOURCES_OF_A) {
      expect(can(clientB, "read", r.type, r.owner)).toBe(false);
      expect(can(clientB, "download", r.type, r.owner)).toBe(false);
      expect(can(clientB, "update", r.type, r.owner)).toBe(false);
      expect(can(clientB, "delete", r.type, r.owner)).toBe(false);
    }
  });

  test("un client ne peut ni accepter ni refuser le devis d'un autre", () => {
    const quoteOfA = { userId: clientA.id };
    expect(can(clientA, "accept", "quote", quoteOfA)).toBe(true);
    expect(can(clientB, "accept", "quote", quoteOfA)).toBe(false);
    expect(can(clientB, "refuse", "quote", quoteOfA)).toBe(false);
  });

  /**
   * Non-régression sur le défaut « fail-open » de l'audit : la version
   * précédente n'appliquait le test d'appartenance que si un propriétaire
   * était trouvé, donc accordait l'accès aux ressources orphelines.
   */
  test("une ressource sans propriétaire identifiable est refusée, pas accordée", () => {
    expect(can(clientB, "read", "invoice", {})).toBe(false);
    expect(can(clientB, "read", "invoice", { ownerId: null })).toBe(false);
    expect(can(clientB, "read", "invoice", { ownerId: null, userId: null })).toBe(false);
    expect(can(clientA, "download", "document", { ownerId: undefined })).toBe(false);
  });
});

describe("Contrôle vertical — élévation de privilège", () => {
  test("un client n'accède jamais au journal d'audit", () => {
    for (const action of ["read", "manage", "delete", "download"] as const) {
      expect(can(clientA, action, "audit_log")).toBe(false);
    }
  });

  test("un client ne gère pas les comptes utilisateurs", () => {
    expect(can(clientA, "manage", "users")).toBe(false);
    expect(can(clientA, "delete", "users")).toBe(false);
    expect(can(clientA, "update", "users", { ownerId: clientB.id })).toBe(false);
  });

  test("le staff ne peut ni supprimer un compte ni altérer l'audit", () => {
    expect(can(staff, "delete", "users")).toBe(false);
    expect(can(staff, "delete", "audit_log")).toBe(false);
    // En revanche il consulte l'audit, c'est son travail.
    expect(can(staff, "read", "audit_log")).toBe(true);
  });

  test("l'administrateur conserve la supervision complète", () => {
    expect(can(admin, "read", "quote", { userId: clientA.id })).toBe(true);
    expect(can(admin, "delete", "users")).toBe(true);
  });

  test("une absence d'utilisateur est toujours un refus", () => {
    expect(can(null, "read", "quote", { userId: clientA.id })).toBe(false);
    expect(can(undefined, "read", "invoice", { ownerId: clientA.id })).toBe(false);
  });
});
