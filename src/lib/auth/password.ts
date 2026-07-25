import bcrypt from "bcryptjs";
import crypto from "crypto";

const BCRYPT_ROUNDS = 12; // Minimum cost 12 as per security requirement

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function validatePasswordPolicy(password: string): { isValid: boolean; error?: string } {
  if (password.length < 12) {
    return { isValid: false, error: "Le mot de passe doit contenir au moins 12 caractères." };
  }
  return { isValid: true };
}

/**
 * HaveIBeenPwned API check using k-anonymity
 * Sends ONLY the first 5 characters of the SHA-1 hash to the API.
 * The full hash or password NEVER leaves the server.
 */
export async function isPasswordPwned(password: string): Promise<boolean> {
  try {
    const sha1 = crypto.createHash("sha1").update(password).digest("hex").toUpperCase();
    const prefix = sha1.substring(0, 5);
    const suffix = sha1.substring(5);

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "User-Agent": "Zlobodan-Security-Checker" },
    });

    if (!response.ok) return false; // Fail open gracefully if API unreachable

    const text = await response.text();
    const lines = text.split("\n");

    return lines.some((line) => {
      const [hashSuffix] = line.split(":");
      return hashSuffix.trim() === suffix;
    });
  } catch (error) {
    console.error("HIBP check warning:", error);
    return false;
  }
}
