import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextResponse } from "next/server";
import { describe, expect, test } from "vitest";
import AppErrorPage from "@/app/error";
import { JsonLdSchema } from "@/components/seo/JsonLdSchema";
import { applySecurityHeaders } from "@/lib/security/headers";

describe("Boundary d’erreur", () => {
  test("n’expose pas le détail technique et conserve les actions de récupération", () => {
    const markup = renderToStaticMarkup(
      createElement(AppErrorPage, {
        error: new Error("STACK_TRACE_SECRET"),
        reset: () => undefined,
      })
    );

    expect(markup).toContain("Une erreur est survenue");
    expect(markup).toContain("Réessayer");
    expect(markup).toContain('href="/"');
    expect(markup).not.toContain("STACK_TRACE_SECRET");
  });
});

describe("Données structurées JSON-LD", () => {
  test("produit du JSON valide, des positions ordonnées et des URL absolues", () => {
    const markup = renderToStaticMarkup(
      createElement(JsonLdSchema, {
        type: "Service",
        serviceTitle: "Réfection de toiture",
        serviceDescription: "Service professionnel",
        breadcrumbs: [
          { name: "Accueil", url: "/" },
          { name: "Services", url: "/services" },
        ],
      })
    );
    const scripts = Array.from(
      markup.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g),
      (match) => match[1]
    );

    expect(scripts).toHaveLength(2);
    expect(() => scripts.forEach((script) => JSON.parse(script))).not.toThrow();
    expect(scripts.join("")).toContain('"position":1');
    expect(scripts.join("")).toContain('"position":2');
    expect(scripts.join("")).toContain('"item":"https://zlobodan-couverture.be/services"');
    expect(scripts.join("")).not.toContain("undefined");
  });

  test("neutralise une tentative de fermeture prématurée de la balise script", () => {
    const markup = renderToStaticMarkup(
      createElement(JsonLdSchema, {
        type: "Service",
        serviceTitle: "</script><script>alert(1)</script>",
      })
    );

    expect(markup).not.toContain("</script><script>");
    expect(markup).toContain("\\u003c");
  });
});

describe("En-têtes HTTP de sécurité", () => {
  test("écrase les doublons, conserve la CSP et retire les signatures serveur", () => {
    const response = new NextResponse(null, {
      headers: {
        Server: "example",
        "X-Powered-By": "Next.js",
        "X-Content-Type-Options": "invalid",
      },
    });

    const secured = applySecurityHeaders(response, "default-src 'self'", true);
    applySecurityHeaders(secured, "default-src 'self'", true);

    expect(secured).toBe(response);
    expect(secured.headers.get("Content-Security-Policy")).toBe("default-src 'self'");
    expect(secured.headers.get("Strict-Transport-Security")).toBe(
      "max-age=63072000; includeSubDomains; preload"
    );
    expect(secured.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(secured.headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin"
    );
    expect(secured.headers.get("Permissions-Policy")).toContain("camera=()");
    expect(secured.headers.has("Server")).toBe(false);
    expect(secured.headers.has("X-Powered-By")).toBe(false);
    expect(
      Array.from(secured.headers.keys()).filter(
        (header) => header === "content-security-policy"
      )
    ).toHaveLength(1);
  });

  test("réserve HSTS aux réponses de production", () => {
    const response = new NextResponse(null, {
      headers: {
        "Strict-Transport-Security": "max-age=1",
      },
    });

    applySecurityHeaders(response, "default-src 'self'", false);

    expect(response.headers.has("Strict-Transport-Security")).toBe(false);
  });
});
