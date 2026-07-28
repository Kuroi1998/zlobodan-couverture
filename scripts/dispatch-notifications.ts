import { dispatchNotificationOutbox } from "../src/lib/services/notification-outbox-service";
import { client } from "../src/db/client";

async function main(): Promise<void> {
  const result = await dispatchNotificationOutbox();
  process.stdout.write(
    `Notifications : ${result.sent} envoyée(s), ${result.failed} échouée(s), ${result.skipped} lot ignoré.\n`
  );
  await client.end();
}

main().catch(async (error: unknown) => {
  process.stderr.write(
    `Traitement des notifications impossible : ${error instanceof Error ? error.message : "erreur inconnue"}\n`
  );
  await client.end().catch(() => undefined);
  process.exit(1);
});
