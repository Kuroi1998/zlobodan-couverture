import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  loginUser: vi.fn(),
  enforceRateLimit: vi.fn(),
  toPublicAuthError: vi.fn(),
  recordSecurityEvent: vi.fn(),
}));

vi.mock("@/lib/services/auth-service", () => ({
  loginUser: mocks.loginUser,
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
    user: {
      id: `user-${role}`,
      email: `${role}@example.test`,
      role,
    },
    session: {
      token: `session-${role}`,
      maxAgeSeconds: 3600,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.enforceRateLimit.mockResolvedValue({ allowed: true });
  mocks.toPublicAuthError.mockReturnValue({
    message: "Adresse e-mail ou mot de passe incorrect.",
    status: 401,
    code: "invalid-credentials",
  });
});

describe("POST /api/auth/login", () => {
  test("crée le cookie et renvoie /mon-compte pour le parcours client exact", async () => {
    mocks.loginUser.mockResolvedValue(authenticatedUser("client"));

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
      "zlobodan_session=session-client"
    );
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("SameSite=strict");
  });

  test("renvoie /admin à un administrateur sans next", async () => {
    mocks.loginUser.mockResolvedValue(authenticatedUser("admin"));

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
    mocks.loginUser.mockResolvedValue(authenticatedUser("client"));

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
    mocks.loginUser.mockResolvedValue(authenticatedUser("client"));

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
    mocks.loginUser.mockRejectedValue(new Error("bad-password"));

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
