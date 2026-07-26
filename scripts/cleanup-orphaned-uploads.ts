import { lt } from "drizzle-orm";
import { client, db } from "@/db/client";
import { quoteAttachments } from "@/db/schema";
import {
  deletePrivateObject,
  listPrivateObjects,
} from "@/lib/storage/private-object-store";

const GRACE_PERIOD_MS = 24 * 60 * 60 * 1_000;
const APPLY_FLAG = "--apply";

async function main(): Promise<void> {
  const apply = process.argv.includes(APPLY_FLAG);
  const cutoff = new Date(Date.now() - GRACE_PERIOD_MS);
  const metadata = await db
    .select({ storageKey: quoteAttachments.storageKey })
    .from(quoteAttachments)
    .where(lt(quoteAttachments.createdAt, new Date()));
  const referencedKeys = new Set(metadata.map((item) => item.storageKey));
  const storedObjects = await listPrivateObjects("quote-attachments");
  const orphans = storedObjects.filter(
    (object) =>
      object.lastModified < cutoff && !referencedKeys.has(object.storageKey)
  );

  process.stdout.write(
    `${orphans.length} objet(s) orphelin(s) de plus de 24 h détecté(s).` +
      (apply ? "\n" : ` Relancer avec ${APPLY_FLAG} pour les supprimer.\n`)
  );

  if (apply) {
    for (const orphan of orphans) {
      await deletePrivateObject(orphan.storageKey);
      process.stdout.write(`Supprimé : ${orphan.storageKey}\n`);
    }
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
