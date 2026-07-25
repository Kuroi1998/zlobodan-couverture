import { NextResponse } from "next/server";

/**
 * RFC 9116 — point de contact pour le signalement de vulnérabilités.
 *
 * Servi par un handler plutôt que déposé dans `public/` pour garantir le type
 * MIME `text/plain` et pour recalculer la date d'expiration : un
 * `security.txt` expiré est considéré comme invalide par les outils qui le
 * consomment, et par une partie des chercheurs.
 */

export const dynamic = "force-dynamic";

const CONTACT_EMAIL = "security@zlobodan-couverture.be";
const CANONICAL = "https://zlobodan-couverture.be/.well-known/security.txt";

/** Toujours douze mois devant, conformément à la recommandation de la RFC. */
function expiresAt(): string {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() + 1);
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

export async function GET() {
  const body = [
    `Contact: mailto:${CONTACT_EMAIL}`,
    `Expires: ${expiresAt()}`,
    "Preferred-Languages: fr, nl, en",
    `Canonical: ${CANONICAL}`,
    "Policy: https://zlobodan-couverture.be/mentions-legales",
    "",
    "# Nous accusons reception sous 72 heures ouvrees.",
    "# Merci de ne pas executer de test de deni de service, de ne pas acceder",
    "# a des donnees clientes reelles, et de nous laisser un delai raisonnable",
    "# avant toute publication.",
    "",
  ].join("\n");

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
