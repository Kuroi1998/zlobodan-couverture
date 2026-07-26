import "server-only";

function isRuntimeProduction(): boolean {
  return process.env.NODE_ENV === "production" &&
    process.env.NEXT_PHASE !== "phase-production-build";
}

function fail(variable: string, reason: string): never {
  throw new Error(`[env] ${variable} : ${reason}.`);
}

export type PrivateStorageConfig =
  | { driver: "local"; directory: string }
  | {
      driver: "s3";
      endpoint: string | undefined;
      region: string;
      bucket: string;
      accessKeyId: string;
      secretAccessKey: string;
      forcePathStyle: boolean;
    };

export function getPrivateStorageConfig(): PrivateStorageConfig {
  const driver = process.env.UPLOAD_STORAGE_DRIVER?.trim().toLowerCase() || "local";
  if (driver === "local") {
    if (isRuntimeProduction()) {
      fail(
        "UPLOAD_STORAGE_DRIVER",
        "le stockage local n'est pas persistant en production ; utiliser s3"
      );
    }
    return {
      driver: "local",
      directory: process.env.LOCAL_UPLOAD_DIRECTORY?.trim() || "storage/uploads",
    };
  }
  if (driver !== "s3") fail("UPLOAD_STORAGE_DRIVER", "valeur attendue : local ou s3");

  const bucket = process.env.S3_BUCKET?.trim();
  const region = process.env.S3_REGION?.trim();
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();
  if (!bucket) fail("S3_BUCKET", "absente");
  if (!region) fail("S3_REGION", "absente");
  if (!accessKeyId) fail("S3_ACCESS_KEY_ID", "absente");
  if (!secretAccessKey) fail("S3_SECRET_ACCESS_KEY", "absente");

  return {
    driver: "s3",
    endpoint: process.env.S3_ENDPOINT?.trim() || undefined,
    region,
    bucket,
    accessKeyId,
    secretAccessKey,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  };
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
}

export function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASS?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!host || !user || !password || !from) return null;

  const port = Number(process.env.SMTP_PORT ?? 587);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    fail("SMTP_PORT", "port invalide");
  }

  return {
    host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    user,
    password,
    from,
  };
}
