import { NextRequest, NextResponse } from "next/server";
import { buildCspHeader, CSP_REPORT_PATH, generateNonce } from "@/lib/security/csp";
import { checkCsrf } from "@/lib/security/csrf";
import { applySecurityHeaders } from "@/lib/security/headers";
import { isDecoyAdminPath } from "@/lib/security/decoys";
import {
  applyCachePolicy,
  REQUEST_PATH_HEADER,
  stripUnsafeInboundHeaders,
} from "@/lib/security/cache-control";

/**
 * Filtre de bordure.
 *
 * Ce middleware pose les en-têtes et refuse les requêtes manifestement
 * illégitimes. Il ne porte **aucune** décision d'autorisation : CVE-2025-29927
 * permet de neutraliser l'exécution du middleware Next.js via un en-tête
 * forgé. Les contrôles d'accès vivent dans les layouts et les handlers
 * (`lib/security/guards.ts`), où ils ne peuvent pas être court-circuités.
 */

export function middleware(request: NextRequest) {
  const nonce = generateNonce();
  const isProduction = process.env.NODE_ENV === "production";
  const csp = buildCspHeader(nonce, isProduction);
  const pathname = request.nextUrl.pathname;

  // 1. Routes leurres d'administration : aucune raison légitime de les
  //    atteindre. On répond comme pour une page absente afin de ne pas
  //    confirmer au scanner qu'il a touché un piège.
  if (isDecoyAdminPath(pathname)) {
    const decoy = new NextResponse(null, { status: 404 });
    decoy.headers.set("x-zb-trap", "1");
    applySecurityHeaders(decoy, csp, isProduction);
    return applyCachePolicy(request, decoy);
  }

  // 2. Contrôle d'origine sur toute mutation d'API.
  //    Le collecteur CSP est exempté : les rapports de violation sont émis par
  //    le navigateur lui-même, sans en-tête d'origine exploitable. Ce point de
  //    terminaison n'écrit rien et se contente de journaliser.
  if (pathname.startsWith("/api/") && pathname !== CSP_REPORT_PATH) {
    const verdict = checkCsrf(request);
    if (!verdict.allowed) {
      const denied = NextResponse.json(
        { success: false, error: "Requête bloquée : origine non vérifiée." },
        { status: 403 }
      );
      denied.headers.set("x-zb-csrf-reason", verdict.reason);
      applySecurityHeaders(denied, csp, isProduction);
      return applyCachePolicy(request, denied);
    }
  }

  // 3. Neutralisation des en-têtes d'empoisonnement de cache et d'identité.
  //    Retirés de la requête elle-même : aucun code applicatif, présent ou
  //    futur, ne peut donc s'y fier par inadvertance.
  const requestHeaders = new Headers(request.headers);
  const stripped = stripUnsafeInboundHeaders(requestHeaders);
  requestHeaders.set(
    REQUEST_PATH_HEADER,
    `${request.nextUrl.pathname}${request.nextUrl.search}`
  );

  // 4. Propagation du nonce à l'application. Next.js lit l'en-tête de requête
  //    `Content-Security-Policy` pour appliquer le nonce à ses propres scripts.
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  if (stripped.length > 0) {
    response.headers.set("x-zb-stripped", String(stripped.length));
  }

  applySecurityHeaders(response, csp, isProduction);
  return applyCachePolicy(request, response);
}

export const config = {
  matcher: [
    // Les ressources statiques immuables n'ont pas besoin d'un nonce, et les
    // exclure évite de rendre chaque réponse unique donc non cachable.
    "/((?!_next/static|_next/image|favicon.ico|images/).*)",
  ],
};
