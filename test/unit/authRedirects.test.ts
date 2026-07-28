import { describe, expect, test, vi } from "vitest";
import {
  DEFAULT_ADMIN_DESTINATION,
  DEFAULT_CLIENT_DESTINATION,
  getDefaultDestination,
  getLoginRedirectPath,
  getPostLoginDestination,
  isUserRole,
} from "@/lib/auth/destinations";
import { getClearedSessionCookieOptions } from "@/lib/auth/session";
import {
  AuthError,
  toPublicAuthError,
} from "@/lib/services/auth-errors";

describe("Destinations après connexion", () => {
  test("un client honore le chemin précis demandé dans son espace", () => {
    expect(getPostLoginDestination("client", "/mon-compte")).toBe("/mon-compte");
    expect(getPostLoginDestination("client", "/mon-compte/devis")).toBe(
      "/mon-compte/devis"
    );
  });

  test("les replis dépendent uniquement du rôle authentifié par le serveur", () => {
    expect(getDefaultDestination("client")).toBe(DEFAULT_CLIENT_DESTINATION);
    expect(getDefaultDestination("staff")).toBe(DEFAULT_ADMIN_DESTINATION);
    expect(getDefaultDestination("admin")).toBe(DEFAULT_ADMIN_DESTINATION);
  });

  test("une destination externe est refusée", () => {
    expect(
      getPostLoginDestination("client", "https://site-malveillant.example")
    ).toBe(DEFAULT_CLIENT_DESTINATION);
    expect(getPostLoginDestination("admin", "//site-malveillant.example")).toBe(
      DEFAULT_ADMIN_DESTINATION
    );
  });

  test("un client ne peut pas choisir l'administration via next", () => {
    expect(getPostLoginDestination("client", "/admin")).toBe(
      DEFAULT_CLIENT_DESTINATION
    );
    expect(getPostLoginDestination("client", "/admin/audit?from=login")).toBe(
      DEFAULT_CLIENT_DESTINATION
    );
  });

  test("un rôle inconnu n'est jamais assimilé à un rôle privilégié", () => {
    expect(isUserRole("client")).toBe(true);
    expect(isUserRole("staff")).toBe(true);
    expect(isUserRole("admin")).toBe(true);
    expect(isUserRole("superadmin")).toBe(false);
    expect(isUserRole(undefined)).toBe(false);
  });

  test("la garde encode un unique paramètre next interne", () => {
    expect(getLoginRedirectPath("/mon-compte/devis?etat=envoye")).toBe(
      "/connexion?next=%2Fmon-compte%2Fdevis%3Fetat%3Denvoye"
    );
    expect(getLoginRedirectPath("https://site-malveillant.example")).toBe(
      "/connexion"
    );
  });
});

/**
 * Ces tests fixent `SESSION_COOKIE_NAME` au lieu de lire l'environnement
 * ambiant. La CI surcharge cette variable (`zlobodan_ci_session`) pour isoler
 * ses cookies : une assertion sur le nom par défaut y échouerait, alors que le
 * comportement vérifié — préfixe `__Host-` en production, absence de préfixe
 * en local — est précisément indépendant du nom choisi.
 */
describe("Cookie de session", () => {
  test("le cookie local est HTTP-only, strict et disponible sur tout le site", async () => {
    vi.stubEnv("SESSION_COOKIE_NAME", "zlobodan_session");
    vi.resetModules();

    try {
      const localSession = await import("@/lib/auth/session");
      expect(localSession.SESSION_COOKIE_NAME).toBe("zlobodan_session");
      expect(localSession.getSessionCookieOptions(3600)).toMatchObject({
        httpOnly: true,
        secure: false,
        sameSite: "strict",
        path: "/",
        maxAge: 3600,
      });
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });

  test("la déconnexion expire le cookie avec les mêmes attributs de sécurité", () => {
    expect(getClearedSessionCookieOptions()).toMatchObject({
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    });
  });

  test("le cookie de production utilise le préfixe __Host- et exige HTTPS", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_COOKIE_NAME", "zlobodan_session");
    vi.resetModules();

    try {
      const productionSession = await import("@/lib/auth/session");
      expect(productionSession.SESSION_COOKIE_NAME).toBe(
        "__Host-zlobodan_session"
      );
      expect(productionSession.getSessionCookieOptions(3600)).toMatchObject({
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: 3600,
      });
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });
});

describe("Messages d'authentification", () => {
  test("un mauvais mot de passe reste générique", () => {
    expect(toPublicAuthError(new AuthError("INVALID_CREDENTIALS"))).toEqual({
      message: "Adresse e-mail ou mot de passe incorrect.",
      status: 401,
      code: "INVALID_CREDENTIALS",
    });
  });

  test("une panne technique n'est pas présentée comme un mauvais mot de passe", () => {
    expect(toPublicAuthError(new Error("database unavailable"))).toEqual({
      message: "La connexion est temporairement indisponible. Veuillez réessayer.",
      status: 503,
      code: "UNEXPECTED_AUTH_ERROR",
    });
  });
});
