import bcrypt from "bcryptjs";
import postgres from "postgres";

const ADMIN_EMAIL = "admin.e2e@example.test";
const CLIENT_EMAIL = "client.e2e@example.test";
const OTHER_CLIENT_EMAIL = "other.e2e@example.test";
const ADMIN_PASSWORD = "Admin-E2E-Password-2026!";
const CLIENT_PASSWORD = "Client-E2E-Password-2026!";
const OTHER_CLIENT_PASSWORD = "Other-E2E-Password-2026!";
const ADMIN_TOTP_SECRET = "JBSWY3DPEHPK3PXP";

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
    await sql`
      insert into users (
        email, password_hash, role, email_verified_at, totp_secret, totp_enabled
      ) values (
        ${ADMIN_EMAIL}, ${adminHash}, 'admin', now(), ${ADMIN_TOTP_SECRET}, 1
      ), (
        ${CLIENT_EMAIL}, ${clientHash}, 'client', now(), null, 0
      ), (
        ${OTHER_CLIENT_EMAIL}, ${otherClientHash}, 'client', now(), null, 0
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
