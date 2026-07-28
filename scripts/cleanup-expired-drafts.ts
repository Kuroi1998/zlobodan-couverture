import { and, eq, lt } from "drizzle-orm";
import { client, db } from "@/db/client";
import { quoteRequests } from "@/db/schema";
import { QUOTE_DRAFT_RETENTION_DAYS } from "@/domain/request-workflow";

const APPLY_FLAG = "--apply";
const RETENTION_MS = QUOTE_DRAFT_RETENTION_DAYS * 24 * 60 * 60 * 1_000;

async function main(): Promise<void> {
  const apply = process.argv.includes(APPLY_FLAG);
  const cutoff = new Date(Date.now() - RETENTION_MS);
  const condition = and(
    eq(quoteRequests.status, "draft"),
    lt(quoteRequests.updatedAt, cutoff)
  );

  const expired = apply
    ? await db
        .delete(quoteRequests)
        .where(condition)
        .returning({ reference: quoteRequests.reference })
    : await db
        .select({ reference: quoteRequests.reference })
        .from(quoteRequests)
        .where(condition);

  process.stdout.write(
    `${expired.length} brouillon(s) expiré(s) depuis plus de ` +
      `${QUOTE_DRAFT_RETENTION_DAYS} jours ${apply ? "supprimé(s)" : "détecté(s)"}.\n`
  );
  if (!apply && expired.length > 0) {
    process.stdout.write(`Relancer avec ${APPLY_FLAG} pour les supprimer.\n`);
  }
}

main()
  .catch((error) => {
    process.stderr.write(
      `Nettoyage impossible : ${
        error instanceof Error ? error.message : "erreur inconnue"
      }\n`
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end().catch(() => undefined);
  });
