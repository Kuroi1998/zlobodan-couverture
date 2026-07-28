import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { assertSafeOutboundUrl } from "@/lib/security/ssrf";

const BCRYPT_ROUNDS = 12;

/**
 * bcrypt tronque **silencieusement** au-delà de 72 octets : « motdepasse…72o »
 * et « motdepasse…72o + suite » produisent la même empreinte. On refuse donc
 * au-delà plutôt que de laisser croire à l'utilisateur que sa phrase de passe
 * de 200 caractères est intégralement prise en compte.
 *
 * Limite exprimée en **octets** et non en caractères : un accent occupe deux
 * octets en UTF-8, un emoji jusqu'à quatre.
 */
const BCRYPT_MAX_BYTES = 72;

/** Plafond d'entrée, avant même le hachage : borne le coût d'une requête. */
export const PASSWORD_MAX_LENGTH = 128;
export const PASSWORD_MIN_LENGTH = 12;

/**
 * Empreinte factice, de coût identique à une vraie.
 *
 * Sert à égaliser le temps de réponse quand le compte n'existe pas : sans
 * elle, le code saute la comparaison bcrypt et répond bien plus vite, ce qui
 * permet d'énumérer les comptes à la milliseconde.
 *
 * Calculée une fois au chargement du module, sur une valeur sans rapport avec
 * un mot de passe réel.
 */
const DUMMY_HASH = bcrypt.hashSync("zlobodan-timing-equalizer-not-a-password", BCRYPT_ROUNDS);

export function passwordByteLength(password: string): number {
  return Buffer.byteLength(password, "utf8");
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function needsPasswordRehash(storedHash: string): boolean {
  const match = /^\$2[aby]\$(\d{2})\$/.exec(storedHash);
  if (!match) return true;
  return Number(match[1]) !== BCRYPT_ROUNDS;
}

/**
 * Comparaison factice, à appeler lorsque aucun compte ne correspond.
 *
 * Le résultat est ignoré ; seul compte le temps consommé, qui doit être du
 * même ordre que celui d'une vérification réelle.
 */
export async function consumeDummyVerification(password: string): Promise<void> {
  await bcrypt.compare(password, DUMMY_HASH);
}

export function validatePasswordPolicy(password: string): { isValid: boolean; error?: string } {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      isValid: false,
      error: `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`,
    };
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return {
      isValid: false,
      error: `Le mot de passe ne peut pas dépasser ${PASSWORD_MAX_LENGTH} caractères.`,
    };
  }
  if (passwordByteLength(password) > BCRYPT_MAX_BYTES) {
    return {
      isValid: false,
      error:
        "Ce mot de passe est trop long pour être traité intégralement (72 octets maximum). " +
        "Raccourcissez-le : au-delà, les caractères supplémentaires seraient ignorés.",
    };
  }
  return { isValid: true };
}

/**
 * Vérification HaveIBeenPwned par k-anonymité : seuls les cinq premiers
 * caractères de l'empreinte SHA-1 quittent le serveur.
 */
export async function isPasswordPwned(password: string): Promise<boolean> {
  try {
    const sha1 = crypto.createHash("sha1").update(password).digest("hex").toUpperCase();
    const prefix = sha1.substring(0, 5);
    const suffix = sha1.substring(5);

    // L'URL est constante, mais elle passe par la garde SSRF : si quelqu'un la
    // rend un jour configurable, le contrôle est déjà en place.
    const verdict = assertSafeOutboundUrl(`https://api.pwnedpasswords.com/range/${prefix}`);
    if (!verdict.allowed) return false;

    const response = await fetch(verdict.url, {
      headers: { "User-Agent": "Zlobodan-Security-Checker" },
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });

    if (!response.ok) return false;

    const text = await response.text();
    return text.split("\n").some((line) => {
      const [hashSuffix] = line.split(":");
      return hashSuffix.trim() === suffix;
    });
  } catch {
    // Repli permissif assumé : l'indisponibilité d'un service tiers ne doit pas
    // empêcher un utilisateur de créer un compte. Documenté dans SECURITY.md.
    return false;
  }
}

export const PASSWORD_LIMITS = {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  BCRYPT_MAX_BYTES,
  BCRYPT_ROUNDS,
};
