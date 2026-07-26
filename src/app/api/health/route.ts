import { NextResponse } from "next/server";
import { checkDatabaseConnection } from "@/db/diagnostics";

/**
 * Sonde de disponibilité — `/api/health`.
 *
 * Destinée aux répartiteurs de charge et à la supervision. Elle ne révèle
 * **rien** de l'infrastructure : ni URL, ni hôte interne, ni utilisateur, ni
 * version, ni trace. Uniquement un état haut/bas.
 *
 * `200` quand la base répond, `503` sinon. `no-store` pour qu'aucun cache ne
 * serve un état périmé.
 */

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const database = await checkDatabaseConnection();

  const body = {
    status: database.ok ? "ok" : "degraded",
    database: database.ok ? "reachable" : "unreachable",
  };

  return NextResponse.json(body, {
    status: database.ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
