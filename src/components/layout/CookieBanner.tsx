"use client";

import React, { useCallback, useSyncExternalStore } from "react";
import Link from "next/link";
import { Cookie, Check, X } from "lucide-react";

const CONSENT_KEY = "zlobodan_cookie_consent";

/**
 * Le consentement vit dans `localStorage`, c'est-à-dire dans un système
 * extérieur à React. `useSyncExternalStore` est l'outil prévu pour cela : il
 * lit la valeur au bon moment du rendu et gère proprement le décalage entre
 * serveur et client.
 *
 * La version précédente lisait `localStorage` dans un `useEffect` puis
 * appelait `setState` — ce qui déclenche un second rendu en cascade juste
 * après le premier, et que React déconseille explicitement.
 */
const consentListeners = new Set<() => void>();

function subscribeToConsent(onChange: () => void): () => void {
  consentListeners.add(onChange);
  // Un autre onglet peut accepter ou refuser : on se tient au courant.
  window.addEventListener("storage", onChange);
  return () => {
    consentListeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function notifyConsentChanged(): void {
  consentListeners.forEach((listener) => listener());
}

function readConsent(): string | null {
  return localStorage.getItem(CONSENT_KEY);
}

/**
 * Valeur utilisée pendant le rendu serveur.
 *
 * On simule un consentement déjà donné : la bannière reste donc absente du
 * HTML initial, ce qui évite un affichage fugace chez les visiteurs ayant déjà
 * répondu, et écarte toute divergence d'hydratation.
 */
function readConsentOnServer(): string {
  return "server";
}

export const CookieBanner: React.FC = () => {
  const consent = useSyncExternalStore(
    subscribeToConsent,
    readConsent,
    readConsentOnServer
  );

  const record = useCallback((value: "accepted" | "refused") => {
    localStorage.setItem(CONSENT_KEY, value);
    notifyConsentChanged();
  }, []);

  const handleAccept = () => record("accepted");
  const handleRefuse = () => record("refused");

  if (consent) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-6 left-4 right-4 md:left-6 md:right-auto md:max-w-md z-50 bg-slate-900 text-white p-5 rounded-xl border border-slate-700 shadow-2xl space-y-3 animate-in fade-in slide-in-from-bottom duration-300">
      <div className="flex items-start gap-3">
        <Cookie className="h-6 w-6 text-brand-terracotta shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs text-slate-300">
          <p className="font-bold text-sm text-white">Respect de votre vie privée</p>
          <p>
            Nous utilisons des cookies strictement nécessaires et des outils d'analyse anonymes pour mesurer l'audience et vous offrir la meilleure expérience. 
            <Link href="/politique-de-confidentialite" className="text-brand-terracotta underline ml-1">
              En savoir plus
            </Link>
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          onClick={handleRefuse}
          className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-slate-300 text-xs font-medium hover:bg-slate-800 transition flex items-center gap-1"
        >
          <X className="h-3.5 w-3.5" />
          <span>Refuser</span>
        </button>
        <button
          onClick={handleAccept}
          className="px-4 py-1.5 rounded-lg bg-brand-terracotta text-white text-xs font-bold hover:bg-orange-600 transition flex items-center gap-1 shadow-accent"
        >
          <Check className="h-3.5 w-3.5" />
          <span>Accepter</span>
        </button>
      </div>
    </div>
  );
};
