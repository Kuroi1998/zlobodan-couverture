import { NextRequest } from "next/server";
import { requireApiRole } from "@/lib/security/guards";
import { readJsonBody } from "@/lib/security/body";
import { CreateInternalNoteSchema } from "@/lib/validations/account-schemas";
import { createInternalNote } from "@/lib/services/internal-note-service";
import { getTrustedIp } from "@/lib/security/request-context";
import { apiCreated, apiError } from "@/lib/api/responses";
import { toFieldErrors } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

const ROUTE = "/api/admin/notes";

/**
 * Ajout d'une note interne.
 *
 * Point de terminaison HTTP plutôt que Server Action, comme le reste des
 * mutations du projet. Ce n'est pas un choix de goût : le contrôle d'origine
 * du filtre de bordure (`proxy.ts`) ne s'applique qu'aux chemins `/api/`. Une
 * Server Action poste vers l'URL de la page et échapperait donc à ce contrôle,
 * au profit du seul mécanisme interne de Next. Un seul mécanisme, une seule
 * barrière à vérifier.
 */
export async function POST(req: NextRequest) {
  const auth = await requireApiRole(ROUTE, ["staff", "admin"]);
  if (!auth.ok) return auth.response;

  const body = await readJsonBody(req, 16 * 1024);
  if (!body.ok) return body.response;

  const parsed = CreateInternalNoteSchema.safeParse(body.value);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", { fields: toFieldErrors(parsed.error) });
  }

  const result = await createInternalNote({
    actor: auth.user,
    entityType: parsed.data.entityType,
    entityId: parsed.data.entityId,
    content: parsed.data.content,
    ipAddress: getTrustedIp(req),
  });

  switch (result.outcome) {
    case "created":
      return apiCreated({ id: result.id });
    case "entity-not-found":
      return apiError("NOT_FOUND", { message: "Dossier introuvable." });
    case "forbidden":
      return apiError("FORBIDDEN");
  }
}
