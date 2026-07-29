import { describe, expect, test } from "vitest";
import { NextRequest } from "next/server";
import { readJsonBody } from "@/lib/security/body";
import { checkCsrf } from "@/lib/security/csrf";

function mutatingRequest(headers: Record<string, string>): NextRequest {
  return new NextRequest("http://zlobodan.test/api/contact", {
    method: "POST",
    headers: {
      host: "zlobodan.test",
      "content-type": "application/json",
      ...headers,
    },
    body: "{}",
  });
}

describe("Preuve d'origine des mutations", () => {
  test("accepte uniquement le contexte navigateur same-origin", () => {
    expect(checkCsrf(mutatingRequest({ "sec-fetch-site": "same-origin" }))).toEqual({
      allowed: true,
    });
  });

  test("refuse un sous-domaine same-site", () => {
    expect(checkCsrf(mutatingRequest({ "sec-fetch-site": "same-site" }))).toEqual({
      allowed: false,
      reason: "cross-origin",
    });
  });

  test("refuse des en-tetes contradictoires", () => {
    expect(
      checkCsrf(
        mutatingRequest({
          "sec-fetch-site": "same-origin",
          origin: "https://attacker.example",
        })
      )
    ).toEqual({ allowed: false, reason: "cross-origin" });
  });
});

describe("Lecture bornee du JSON", () => {
  test("refuse une charge JSON annoncee comme texte", async () => {
    const request = mutatingRequest({ "content-type": "text/plain" });
    const result = await readJsonBody(request);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(415);
  });

  test("accepte application/json avec un charset", async () => {
    const request = mutatingRequest({
      "content-type": "application/json; charset=utf-8",
    });

    expect(await readJsonBody(request)).toEqual({ ok: true, value: {} });
  });

  test("mesure la limite sur les octets UTF-8 et non les caracteres", async () => {
    const request = new NextRequest("http://zlobodan.test/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify("ééé"),
    });
    const result = await readJsonBody(request, 6);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(413);
  });
});
