import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { recordSecurityEvent } from "@/lib/security/security-events";
import { rateLimitIdentity } from "@/lib/security/request-context";
import { consumeRateLimit } from "@/lib/security/rateLimiter";

/**
 * Collecteur de violations CSP.
 *
 * Une CSP dont personne ne lit les rapports ne signale jamais qu'elle a été
 * contournée. Ce point de terminaison est public par nécessité — c'est le
 * navigateur qui poste — donc il est strictement limité en débit, ne renvoie
 * aucun contenu et n'écrit rien en base hors du journal de sécurité.
 */

export const dynamic = "force-dynamic";

const ROUTE = "/api/security/csp-report";
const MAX_BODY_BYTES = 16 * 1024;

/**
 * `.passthrough()` est délibérément absent : seules les clés listées sont
 * conservées. Cela empêche qu'une charge arbitraire postée sur ce point
 * public se retrouve recopiée dans le journal.
 */
const CspReportSchema = z.object({
  "csp-report": z
    .object({
      "document-uri": z.string().max(500).optional(),
      referrer: z.string().max(500).optional(),
      "violated-directive": z.string().max(200).optional(),
      "effective-directive": z.string().max(200).optional(),
      "blocked-uri": z.string().max(500).optional(),
      "source-file": z.string().max(500).optional(),
      "line-number": z.number().int().optional(),
      "status-code": z.number().int().optional(),
    })
    .strip(),
});

export async function POST(req: NextRequest) {
  const identity = rateLimitIdentity(req);

  const limit = await consumeRateLimit({
    key: `csp-report:${identity}`,
    windowMs: 60_000,
    maxRequests: 30,
  });
  if (!limit.allowed) {
    return new NextResponse(null, { status: 429 });
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return new NextResponse(null, { status: 413 });
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const result = CspReportSchema.safeParse(parsedJson);
  if (!result.success) {
    return new NextResponse(null, { status: 204 });
  }

  await recordSecurityEvent({
    kind: "CSP_VIOLATION",
    // Élevée : une violation signale soit une injection réussie, soit une
    // politique en décalage avec l'application. Les deux méritent un regard.
    severity: "high",
    route: ROUTE,
    detail: result.data["csp-report"],
  });

  // 204 systématique : aucun retour exploitable pour sonder le point.
  return new NextResponse(null, { status: 204 });
}
