import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
// Le nom du cookie est configurable (`SESSION_COOKIE_NAME`) et la CI le
// surcharge. Ce qui est vérifié ici, c'est que la route pose bien le cookie
// *configuré* — pas qu'elle en code un en dur.
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

const mocks = vi.hoisted(() => ({
  beginLogin: vi.fn(),
  completeTwoFactorLogin: vi.fn(),
  enforceRateLimit: vi.fn(),
  toPublicAuthError: vi.fn(),
  recordSecurityEvent: vi.fn(),
}));

vi.mock("@/lib/services/auth-service", () => ({
  beginLogin: mocks.beginLogin,
  completeTwoFactorLogin: mocks.completeTwoFactorLogin,
}));

vi.mock("@/lib/security/rate-limit-guard", () => ({
  enforceRateLimit: mocks.enforceRateLimit,
}));

vi.mock("@/lib/services/auth-errors", () => ({
  toPublicAuthError: mocks.toPublicAuthError,
}));

vi.mock("@/lib/security/security-events", () => ({
  recordSecurityEvent: mocks.recordSecurityEvent,
}));

import { POST } from "@/app/api/auth/login/route";

function loginRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:3000",
    },
    body: JSON.stringify(body),
  });
}

function authenticatedUser(role: "client" | "staff" | "admin") {
  return {
    kind: "authenticated" as const,
    user: {
      id: `user-${role}`,
      email: `${role}@example.test`,
      role,
    },
    session: {
      id: `session-id-${role}`,
      token: `session-${role}`,
      maxAgeSeconds: 3600,
      knownDevice: true,
      deviceName: "Test",
    },
    destination: role === "client" ? "/mon-compte" : "/admin",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.enforceRateLimit.mockResolvedValue({ allowed: true });
  mocks.toPublicAuthError.mockReturnValue({
    message: "Adresse e-mail ou mot de passe incorrect.",
    status: 401,
    code: "INVALID_CREDENTIALS",
  });
});

describe("POST /api/auth/login", () => {
  test("crée le cookie et renvoie /mon-compte pour le parcours client exact", async () => {
    mocks.beginLogin.mockResolvedValue(authenticatedUser("client"));

    const response = await POST(
      loginRequest({
        email: "client@example.test",
        password: "mot-de-passe",
        next: "/mon-compte",
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      destination: "/mon-compte",
      user: { role: "client" },
    });
    expect(response.headers.get("set-cookie")).toContain(
      `${SESSION_COOKIE_NAME}=session-client`
    );
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("SameSite=strict");
  });

  test("renvoie /admin à un administrateur sans next", async () => {
    mocks.beginLogin.mockResolvedValue(authenticatedUser("admin"));

    const response = await POST(
      loginRequest({
        email: "admin@example.test",
        password: "mot-de-passe",
      })
    );

    await expect(response.json()).resolves.toMatchObject({
      success: true,
      destination: "/admin",
    });
  });

  test("conserve une destination client interne précise", async () => {
    mocks.beginLogin.mockResolvedValue({
      ...authenticatedUser("client"),
      destination: "/mon-compte/devis",
    });

    const response = await POST(
      loginRequest({
        email: "client@example.test",
        password: "mot-de-passe",
        next: "/mon-compte/devis",
      })
    );

    await expect(response.json()).resolves.toMatchObject({
      success: true,
      destination: "/mon-compte/devis",
    });
  });

  test("refuse une redirection externe et revient au repli du rôle", async () => {
    mocks.beginLogin.mockResolvedValue(authenticatedUser("client"));

    const response = await POST(
      loginRequest({
        email: "client@example.test",
        password: "mot-de-passe",
        next: "https://site-malveillant.example",
      })
    );

    await expect(response.json()).resolves.toMatchObject({
      success: true,
      destination: "/mon-compte",
    });
  });

  test("un échec ne crée aucun cookie de session", async () => {
    mocks.beginLogin.mockRejectedValue(new Error("bad-password"));

    const response = await POST(
      loginRequest({
        email: "client@example.test",
        password: "incorrect",
        next: "/mon-compte",
      })
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toMatchObject({
      success: false,
      error: "Adresse e-mail ou mot de passe incorrect.",
    });
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
