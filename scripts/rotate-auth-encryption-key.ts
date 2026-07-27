import crypto from "node:crypto";
import postgres from "postgres";

const VERSION = "v1";
const IV_BYTES = 12;

function keyFrom(value: string, name: string): Buffer {
  if (value.length < 32) {
    throw new Error(`${name} doit contenir au moins 32 caractères.`);
  }
  return crypto.createHash("sha256").update(value, "utf8").digest();
}

function decrypt(
  value: string,
  context: string,
  key: Buffer
): string {
  const [version, ivValue, tagValue, encryptedValue, extra] = value.split(".");
  if (
    version !== VERSION ||
    !ivValue ||
    !tagValue ||
    !encryptedValue ||
    extra !== undefined
  ) {
    throw new Error("Format chiffré inattendu.");
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivValue, "base64url")
  );
  decipher.setAAD(Buffer.from(context, "utf8"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function encrypt(
  value: string,
  context: string,
  key: Buffer
): string {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(context, "utf8"));
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return [
    VERSION,
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

async function main(): Promise<void> {
  const databaseUrl =
    process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
  const oldValue = process.env.OLD_TWO_FACTOR_ENCRYPTION_KEY ?? "";
  const newValue = process.env.TWO_FACTOR_ENCRYPTION_KEY ?? "";
  if (!databaseUrl) throw new Error("DATABASE_URL est requise.");
  if (oldValue === newValue) {
    throw new Error("L'ancienne et la nouvelle clé doivent être distinctes.");
  }
  const oldKey = keyFrom(oldValue, "OLD_TWO_FACTOR_ENCRYPTION_KEY");
  const newKey = keyFrom(newValue, "TWO_FACTOR_ENCRYPTION_KEY");
  const apply = process.argv.includes("--apply");
  const sql = postgres(databaseUrl, { max: 1 });

  try {
    const factors = await sql<
      { user_id: string; encrypted_secret: string }[]
    >`
      select user_id, encrypted_secret
      from user_two_factor
    `;
    const outbox = await sql<
      {
        id: string;
        event_type: string;
        entity_id: string;
        encrypted_payload: string;
      }[]
    >`
      select id, event_type, entity_id, encrypted_payload
      from notification_outbox
      where encrypted_payload is not null
    `;

    const rotatedFactors = factors.map((row) => {
      const context = `two-factor:${row.user_id}`;
      return {
        id: row.user_id,
        value: encrypt(
          decrypt(row.encrypted_secret, context, oldKey),
          context,
          newKey
        ),
      };
    });
    const rotatedOutbox = outbox.map((row) => {
      const context =
        `notification-outbox:${row.event_type}:${row.entity_id}`;
      return {
        id: row.id,
        value: encrypt(
          decrypt(row.encrypted_payload, context, oldKey),
          context,
          newKey
        ),
      };
    });

    if (apply) {
      await sql.begin(async (transaction) => {
        for (const row of rotatedFactors) {
          await transaction`
            update user_two_factor
            set encrypted_secret = ${row.value}, updated_at = now()
            where user_id = ${row.id}
          `;
        }
        for (const row of rotatedOutbox) {
          await transaction`
            update notification_outbox
            set encrypted_payload = ${row.value}
            where id = ${row.id}
          `;
        }
      });
    }
    process.stdout.write(
      `${apply ? "Rotation appliquée" : "Simulation valide"} : ` +
        `${rotatedFactors.length} secret(s) 2FA et ` +
        `${rotatedOutbox.length} charge(s) d'outbox.\n`
    );
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  process.stderr.write(
    `Rotation impossible : ${error instanceof Error ? error.message : "erreur inconnue"}\n`
  );
  process.exit(1);
});
