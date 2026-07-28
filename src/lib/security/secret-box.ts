import "server-only";
import crypto from "node:crypto";
import { requireTwoFactorEncryptionKey } from "@/config/env";

const VERSION = "v1";
const IV_BYTES = 12;
const TAG_BYTES = 16;

function encryptionKey(): Buffer {
  return crypto
    .createHash("sha256")
    .update(requireTwoFactorEncryptionKey(), "utf8")
    .digest();
}

export function encryptSecret(plaintext: string, context: string): string {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv, {
    authTagLength: TAG_BYTES,
  });
  cipher.setAAD(Buffer.from(context, "utf8"));
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(
    "."
  );
}

export function decryptSecret(ciphertext: string, context: string): string {
  const [version, ivValue, tagValue, encryptedValue, extra] = ciphertext.split(".");
  if (
    version !== VERSION ||
    !ivValue ||
    !tagValue ||
    !encryptedValue ||
    extra !== undefined
  ) {
    throw new Error("Format de secret chiffré invalide.");
  }

  const iv = Buffer.from(ivValue, "base64url");
  const tag = Buffer.from(tagValue, "base64url");
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
    throw new Error("Paramètres de secret chiffré invalides.");
  }

  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), iv, {
    authTagLength: TAG_BYTES,
  });
  decipher.setAAD(Buffer.from(context, "utf8"));
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function isEncryptedSecret(value: string): boolean {
  return value.startsWith(`${VERSION}.`);
}
