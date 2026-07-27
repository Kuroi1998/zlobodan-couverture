import { NextRequest } from "next/server";
import { requireApiUser } from "@/lib/security/guards";
import { readJsonBody } from "@/lib/security/body";
import { enforceRateLimit } from "@/lib/security/rate-limit-guard";
import { getTrustedIp } from "@/lib/security/request-context";
import { UpdateProfileSchema } from "@/lib/validations/account-schemas";
import { updateClientProfile } from "@/lib/services/client-profile-service";
import { apiError, apiSuccess } from "@/lib/api/responses";
import { toFieldErrors } from "@/lib/api/validation";

export const dynamic = "force-dynamic";

const ROUTE = "/api/client/profile";

/**
 * Modification du profil.
 *
 * L'identité vient de la session, jamais du corps de la requête : le schéma
 * n'accepte aucun champ `userId`, et le service reçoit `auth.user.id`. Un
 * appelant ne peut donc pas désigner le compte qu'il modifie.
 *
 * `PATCH` et non `PUT` : la requête décrit une modification partielle, elle ne
 * remplace pas la ressource. Un `PUT` laisserait entendre que les champs
 * absents doivent être effacés.
 */
export async function PATCH(req: NextRequest) {
  const auth = await requireApiUser(ROUTE);
  if (!auth.ok) return auth.response;

  const limit = await enforceRateLimit(req, "accountUpdate", `user:${auth.user.id}`);
  if (!limit.allowed) return limit.response;

  const body = await readJsonBody(req, 4 * 1024);
  if (!body.ok) return body.response;

  const parsed = UpdateProfileSchema.safeParse(body.value);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", { fields: toFieldErrors(parsed.error) });
  }

  const result = await updateClientProfile({
    userId: auth.user.id,
    input: parsed.data,
    ipAddress: getTrustedIp(req),
  });

  if (result.outcome === "not-found") {
    return apiError("NOT_FOUND", { message: "Compte introuvable." });
  }

  return apiSuccess({
    phone: result.phone,
    firstName: result.firstName,
    lastName: result.lastName,
    message: "Profil mis à jour.",
  });
}
