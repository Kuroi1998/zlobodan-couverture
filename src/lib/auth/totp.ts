import crypto from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const ISSUER = "Zlobodan Couverture SRL";
const PERIOD_SECONDS = 30;
const CODE_DIGITS = 6;

function encodeBase32(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (let index = 0; index < bytes.length; index += 1) {
    const byte = bytes[index];
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

function decodeBase32(value: string): Buffer | null {
  const normalized = value.toUpperCase().replace(/=+$/, "").replace(/\s/g, "");
  if (!normalized || /[^A-Z2-7]/.test(normalized)) return null;
  let bits = 0;
  let accumulator = 0;
  const bytes: number[] = [];
  for (const character of normalized) {
    accumulator = (accumulator << 5) | BASE32_ALPHABET.indexOf(character);
    bits += 5;
    if (bits >= 8) {
      bytes.push((accumulator >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateTotpToken(
  secretBase32: string,
  now = Date.now()
): string | null {
  const secret = decodeBase32(secretBase32);
  if (!secret) return null;
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 1_000 / PERIOD_SECONDS)));
  const digest = crypto.createHmac("sha1", secret).update(counter).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(binary % 10 ** CODE_DIGITS).padStart(CODE_DIGITS, "0");
}

export function generateTotpSecret(userEmail: string) {
  const bytes = crypto.randomBytes(20);
  const base32 = encodeBase32(bytes);
  const label = `${ISSUER}:${userEmail}`;
  const otpauthUrl =
    `otpauth://totp/${encodeURIComponent(label)}` +
    `?secret=${base32}&issuer=${encodeURIComponent(ISSUER)}` +
    `&algorithm=SHA1&digits=${CODE_DIGITS}&period=${PERIOD_SECONDS}`;
  return {
    ascii: bytes.toString("base64"),
    hex: bytes.toString("hex"),
    base32,
    otpauth_url: otpauthUrl,
  };
}

export function verifyTotpToken(secretBase32: string, token: string): boolean {
  const normalizedToken = token.trim();
  if (!/^\d{6}$/.test(normalizedToken)) return false;
  for (const drift of [-1, 0, 1]) {
    const expected = generateTotpToken(
      secretBase32,
      Date.now() + drift * PERIOD_SECONDS * 1_000
    );
    if (
      expected &&
      crypto.timingSafeEqual(
        Buffer.from(expected, "ascii"),
        Buffer.from(normalizedToken, "ascii")
      )
    ) {
      return true;
    }
  }
  return false;
}
