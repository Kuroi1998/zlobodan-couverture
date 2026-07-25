"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Cookie, Check, X } from "lucide-react";

export const CookieBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("zlobodan_cookie_consent");
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("zlobodan_cookie_consent", "accepted");
    setIsVisible(false);
  };

  const handleRefuse = () => {
    localStorage.setItem("zlobodan_cookie_consent", "refused");
    setIsVisible(false);
  };

  if (!isVisible) return null;

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
