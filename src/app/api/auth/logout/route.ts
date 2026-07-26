import { NextRequest, NextResponse } from "next/server";
import {
  getClearedSessionCookieOptions,
  getSessionTokenFromCookie,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import { logoutUser } from "@/lib/services/auth-service";

export async function POST(req: NextRequest) {
  const sessionToken = getSessionTokenFromCookie();
  await logoutUser(sessionToken);

  const response = NextResponse.json({ success: true, message: "Déconnexion réussie." });
  response.cookies.set(SESSION_COOKIE_NAME, "", getClearedSessionCookieOptions());
  return response;
}
