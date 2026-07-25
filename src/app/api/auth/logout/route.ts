import { NextRequest, NextResponse } from "next/server";
import { getSessionTokenFromCookie } from "@/lib/auth/session";
import { logoutUser } from "@/lib/services/authService";

export async function POST(req: NextRequest) {
  const sessionToken = getSessionTokenFromCookie();
  await logoutUser(sessionToken);

  return NextResponse.json({ success: true, message: "Déconnexion réussie." });
}
