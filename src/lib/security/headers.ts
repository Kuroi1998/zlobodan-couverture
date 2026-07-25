import type { NextResponse } from "next/server";
import { buildReportToHeader } from "./csp";

/**
 * En-têtes de sécurité appliqués à *toutes* les réponses, y compris les
 * réponses d'erreur et de refus — une page 403 sans en-têtes reste une page
 * exploitable.
 */
export function applySecurityHeaders(response: NextResponse, csp: string): NextResponse {
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Report-To", buildReportToHeader());

  // Deux ans, sous-domaines inclus, éligible à la liste de préchargement.
  // La soumission à hstspreload.org est une action manuelle : voir le runbook.
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );

  // `frame-ancestors 'none'` de la CSP fait autorité ; cet en-tête reste pour
  // les navigateurs qui ne l'implémentent pas.
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()"
  );

  // Isolation d'origine : permet le chargement des polices et ressources autorisées par la CSP.
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "cross-origin");

  // Divulgation de pile : retiré ici en plus de `poweredByHeader: false`,
  // pour couvrir les réponses fabriquées directement dans le middleware.
  response.headers.delete("X-Powered-By");
  response.headers.delete("Server");

  return response;
}
