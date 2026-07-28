import { NextResponse } from "next/server";
import { toPublicAuthError } from "@/lib/services/auth-errors";

export function authErrorResponse(error: unknown): NextResponse {
  const safe = toPublicAuthError(error);
  return NextResponse.json(
    {
      success: false,
      error: { code: safe.code, message: safe.message },
    },
    { status: safe.status }
  );
}

export function authValidationResponse(
  message = "Veuillez vérifier les informations saisies."
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: { code: "VALIDATION_ERROR", message },
    },
    { status: 422 }
  );
}

export function sessionExpiredResponse(): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: { code: "SESSION_EXPIRED", message: "Votre session a expiré." },
    },
    { status: 401 }
  );
}
