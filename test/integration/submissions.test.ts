import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, client } from "@/db/client";
import { users } from "@/db/schema/users";
import { contactMessages, contactStatusHistory } from "@/db/schema/contacts";
import {
  quoteAttachments,
  quoteRequests,
  quoteStatusHistory,
} from "@/db/schema/quotes";
import { notificationOutbox } from "@/db/schema/notifications";
import {
  changeContactStatus,
  createContactMessage,
} from "@/lib/services/contact-service";
import {
  changeQuoteRequestStatus,
  submitQuoteRequest,
} from "@/lib/services/quote-request-service";
import {
  deleteQuoteDraft,
  getLatestQuoteDraft,
  saveQuoteDraft,
} from "@/lib/services/quote-draft-service";
import { DuplicateSubmissionError } from "@/lib/services/submission-errors";

let clientUserId = "";
let staffUserId = "";

beforeAll(async () => {
  const rows = await db
    .insert(users)
    .values([
      {
        email: "integration-client@example.test",
        passwordHash: "not-used-in-integration-tests",
        role: "client",
        emailVerifiedAt: new Date(),
      },
      {
        email: "integration-staff@example.test",
        passwordHash: "not-used-in-integration-tests",
        role: "staff",
        emailVerifiedAt: new Date(),
      },
    ])
    .returning({ id: users.id, role: users.role });
  clientUserId = rows.find((row) => row.role === "client")?.id ?? "";
  staffUserId = rows.find((row) => row.role === "staff")?.id ?? "";
});

describe("persistance contact", () => {
  it("écrit le contact, l'historique et l'outbox dans PostgreSQL", async () => {
    const created = await createContactMessage({
      submissionKey: "contact-integration-0001",
      userId: clientUserId,
      input: {
        fullName: "Client Intégration",
        email: "client@example.test",
        phone: "0470123456",
        subject: "general",
        message: "Message persistant de test d'intégration.",
        consentPrivacy: true,
      },
    });
    expect(created.reference).toMatch(/^CNT-\d{4}-\d{6}$/);

    const [contacts, history, notifications] = await Promise.all([
      db.select().from(contactMessages),
      db.select().from(contactStatusHistory),
      db.select().from(notificationOutbox),
    ]);
    expect(contacts).toHaveLength(1);
    expect(history).toHaveLength(1);
    expect(notifications).toHaveLength(2);

    await changeContactStatus({
      contactMessageId: created.id,
      newStatus: "in_progress",
      changedByUserId: staffUserId,
      assignedToUserId: staffUserId,
      reason: "Qualification",
    });
    expect((await db.select().from(contactStatusHistory)).length).toBe(2);
  });

  it("bloque une double soumission durablement", async () => {
    await expect(
      createContactMessage({
        submissionKey: "contact-integration-0001",
        userId: clientUserId,
        input: {
          fullName: "Client Intégration",
          email: "client@example.test",
          phone: "0470123456",
          subject: "general",
          message: "Une répétition ne doit pas créer de ligne.",
          consentPrivacy: true,
        },
      })
    ).rejects.toBeInstanceOf(DuplicateSubmissionError);
    expect(await db.select().from(contactMessages)).toHaveLength(1);
  });
});

describe("persistance demande de devis", () => {
  it("écrit demande, fichier, historique et notifications de façon cohérente", async () => {
    const png = await sharp({
      create: {
        width: 20,
        height: 20,
        channels: 3,
        background: "#c2410c",
      },
    })
      .png()
      .toBuffer();
    const created = await submitQuoteRequest({
      submissionKey: "quote-integration-0001", // gitleaks:allow
      userId: clientUserId,
      files: [{ buffer: png, originalName: "toiture.png" }],
      input: {
        interventionType: "refection",
        roofType: "ardoise",
        surface: "50-100",
        isUrgent: false,
        postalCode: "1000",
        city: "Bruxelles",
        fullName: "Client Intégration",
        phone: "0470123456",
        email: "client@example.test",
        description: "Réfection complète.",
        rgpdConsent: true,
      },
    });
    expect(created.reference).toMatch(/^DEV-\d{4}-\d{6}$/);
    expect(created.attachmentCount).toBe(1);
    expect(await db.select().from(quoteRequests)).toHaveLength(1);
    expect(await db.select().from(quoteAttachments)).toHaveLength(1);
    expect(await db.select().from(quoteStatusHistory)).toHaveLength(1);

    await changeQuoteRequestStatus({
      quoteRequestId: created.id,
      newStatus: "under_review",
      changedByUserId: staffUserId,
      assignedToUserId: staffUserId,
      reason: "Dossier complet",
    });
    expect(await db.select().from(quoteStatusHistory)).toHaveLength(2);
  });

  it("rejette un fichier trompeur sans créer de demande", async () => {
    await expect(
      submitQuoteRequest({
        submissionKey: "quote-integration-invalid-file",
        userId: null,
        files: [{ buffer: Buffer.from("not-an-image"), originalName: "photo.jpg" }],
        input: {
          interventionType: "fuite",
          roofType: "ardoise",
          surface: "unknown",
          isUrgent: true,
          postalCode: "1000",
          city: "Bruxelles",
          fullName: "Visiteur",
          phone: "0470123456",
          email: "visitor@example.test",
          description: "Fuite active.",
          rgpdConsent: true,
        },
      })
    ).rejects.toThrow("Type de fichier non autorisé");
    expect(await db.select().from(quoteRequests)).toHaveLength(1);
  });

  it("crée, reprend, soumet, supprime et expire les brouillons client", async () => {
    const draft = await saveQuoteDraft({
      submissionKey: "quote-draft-integration-0001",
      userId: clientUserId,
      input: { interventionType: "fuite" },
    });
    expect((await getLatestQuoteDraft(clientUserId))?.id).toBe(draft.id);

    const updated = await saveQuoteDraft({
      draftId: draft.id,
      submissionKey: "quote-draft-integration-0001",
      userId: clientUserId,
      input: {
        roofType: "tuile_terre_cuite",
        surface: "less_50",
        postalCode: "1050",
        city: "Ixelles",
      },
    });
    expect(updated.id).toBe(draft.id);

    const submitted = await submitQuoteRequest({
      draftId: draft.id,
      submissionKey: "quote-draft-submit-integration-0001",
      userId: clientUserId,
      files: [],
      input: {
        interventionType: "fuite",
        roofType: "tuile_terre_cuite",
        surface: "less_50",
        isUrgent: true,
        postalCode: "1050",
        city: "Ixelles",
        fullName: "Client Brouillon",
        phone: "0470123456",
        email: "draft@example.test",
        description: "Brouillon devenu demande.",
        rgpdConsent: true,
      },
    });
    expect(submitted.id).toBe(draft.id);
    expect(submitted.reference).toBe(draft.reference);
    expect(await getLatestQuoteDraft(clientUserId)).toBeNull();
    const draftHistory = (await db.select().from(quoteStatusHistory)).filter(
      (entry) => entry.quoteRequestId === draft.id
    );
    expect(draftHistory.map((entry) => entry.newStatus)).toEqual([
      "draft",
      "submitted",
    ]);

    await expect(
      submitQuoteRequest({
        draftId: draft.id,
        submissionKey: "quote-draft-submit-integration-0001",
        userId: clientUserId,
        files: [],
        input: {
          interventionType: "fuite",
          roofType: "tuile_terre_cuite",
          surface: "less_50",
          isUrgent: true,
          postalCode: "1050",
          city: "Ixelles",
          fullName: "Client Brouillon",
          phone: "0470123456",
          email: "draft@example.test",
          description: "",
          rgpdConsent: true,
        },
      })
    ).rejects.toBeInstanceOf(DuplicateSubmissionError);

    const deletable = await saveQuoteDraft({
      submissionKey: "quote-draft-integration-delete",
      userId: clientUserId,
      input: { interventionType: "demoussage" },
    });
    await deleteQuoteDraft(deletable.id, clientUserId);
    expect(await getLatestQuoteDraft(clientUserId)).toBeNull();

    const expired = await saveQuoteDraft({
      submissionKey: "quote-draft-integration-expired",
      userId: clientUserId,
      input: { interventionType: "isolation" },
    });
    await db
      .update(quoteRequests)
      .set({ updatedAt: new Date("2020-01-01T00:00:00Z") })
      .where(eq(quoteRequests.id, expired.id));
    expect(await getLatestQuoteDraft(clientUserId)).toBeNull();
  });
});

afterAll(async () => {
  await client.end();
  const uploadDirectory = path.resolve(
    process.cwd(),
    process.env.LOCAL_UPLOAD_DIRECTORY ?? ".tmp/integration-uploads"
  );
  const tempRoot = path.resolve(process.cwd(), ".tmp");
  if (uploadDirectory.startsWith(`${tempRoot}${path.sep}`)) {
    await fs.promises.rm(uploadDirectory, { recursive: true, force: true });
  }
});
