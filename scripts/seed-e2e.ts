import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import postgres from "postgres";

const ADMIN_EMAIL = "admin.e2e@example.test";
const CLIENT_EMAIL = "client.e2e@example.test";
const OTHER_CLIENT_EMAIL = "other.e2e@example.test";
const ADMIN_PASSWORD = "Admin-E2E-Password-2026!";
const CLIENT_PASSWORD = "Client-E2E-Password-2026!";
const OTHER_CLIENT_PASSWORD = "Other-E2E-Password-2026!";
const ADMIN_TOTP_SECRET = "JBSWY3DPEHPK3PXP";

function encryptSecret(plaintext: string, userId: string): string {
  const material =
    process.env.TWO_FACTOR_ENCRYPTION_KEY ??
    "dev-only-two-factor-encryption-key-not-for-production";
  const key = crypto.createHash("sha256").update(material, "utf8").digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv, {
    authTagLength: 16,
  });
  cipher.setAAD(Buffer.from(`two-factor:${userId}`, "utf8"));
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || !databaseUrl.includes("_test")) {
    throw new Error("Le seed E2E exige une base dont le nom se termine par _test.");
  }
  const sql = postgres(databaseUrl, { max: 1 });
  try {
    const [adminHash, clientHash, otherClientHash] = await Promise.all([
      bcrypt.hash(ADMIN_PASSWORD, 8),
      bcrypt.hash(CLIENT_PASSWORD, 8),
      bcrypt.hash(OTHER_CLIENT_PASSWORD, 8),
    ]);
    const inserted = await sql<{ id: string; email: string }[]>`
      insert into users (
        email, normalized_email, password_hash, role, status, email_verified_at
      ) values (
        ${ADMIN_EMAIL}, ${ADMIN_EMAIL}, ${adminHash}, 'admin', 'active', now()
      ), (
        ${CLIENT_EMAIL}, ${CLIENT_EMAIL}, ${clientHash}, 'client', 'active', now()
      ), (
        ${OTHER_CLIENT_EMAIL}, ${OTHER_CLIENT_EMAIL}, ${otherClientHash}, 'client', 'active', now()
      )
      returning id, email
    `;
    const admin = inserted.find((account) => account.email === ADMIN_EMAIL);
    if (!admin) throw new Error("Compte administrateur E2E introuvable.");
    await sql`
      insert into user_two_factor (
        user_id, enabled, encrypted_secret, confirmed_at
      ) values (
        ${admin.id}, 1, ${encryptSecret(ADMIN_TOTP_SECRET, admin.id)}, now()
      )
    `;
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  process.stderr.write(
    `Seed E2E impossible : ${error instanceof Error ? error.message : "erreur inconnue"}\n`
  );
  process.exit(1);
});
