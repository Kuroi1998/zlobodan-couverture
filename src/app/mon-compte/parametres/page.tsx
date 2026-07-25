"use client";

import React, { useState } from "react";
import { Settings, ShieldCheck, Lock, Smartphone, Download, Trash2 } from "lucide-react";

export default function ClientSettingsPage() {
  const [feedback, setFeedback] = useState("");
  const [totpEnabled, setTotpEnabled] = useState(false);

  const handleExportRgpd = async () => {
    setFeedback("✅ Votre dossier d'export d'archive RGPD (données personnelles au format JSON) a été généré.");
  };

  const handleDeleteAccount = async () => {
    if (confirm("Êtes-vous sûr de vouloir demander la suppression de votre compte conformément au droit à l'oubli RGPD ?")) {
      setFeedback("ℹ️ Demande de suppression transmise au DPO. Votre compte sera archivé anonymement sous 30 jours.");
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      
      {/* Header */}
      <div>
        <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-white">
          Paramètres du Compte &amp; Confidentialité RGPD
        </h1>
        <p className="text-sm text-slate-400">
          Gérez votre profil, vos options de sécurité (2FA, sessions), vos préférences et vos droits RGPD (exportation &amp; suppression).
        </p>
      </div>

      {feedback && (
        <div className="p-4 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-200 text-sm animate-in fade-in">
          {feedback}
        </div>
      )}

      {/* 1. Coordonnées */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4">
        <h2 className="font-heading font-bold text-lg text-white flex items-center gap-2">
          <Settings className="h-5 w-5 text-brand-terracotta" />
          <span>Informations Personnelles</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <label htmlFor="settings-name" className="text-slate-400 font-bold uppercase">Nom complet</label>
            <input id="settings-name" name="fullName" type="text" defaultValue="Jean Peeters" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-terracotta" />
          </div>
          <div className="space-y-1">
            <label htmlFor="settings-phone" className="text-slate-400 font-bold uppercase">Numéro de téléphone</label>
            <input id="settings-phone" name="phone" type="tel" defaultValue="0470 12 34 56" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-terracotta" />
          </div>
        </div>
      </div>

      {/* 2. Authentification à Deux Facteurs (2FA) */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4">
        <h2 className="font-heading font-bold text-lg text-white flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-amber-400" />
          <span>Double Facteur TOTP (2FA)</span>
        </h2>

        <div className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs">
          <div className="space-y-1">
            <p className="font-bold text-white">Sécuriser votre compte avec Google Authenticator ou Authy</p>
            <p className="text-slate-400">Exige un code temporaire à chaque connexion.</p>
          </div>

          <button
            onClick={() => {
              setTotpEnabled(!totpEnabled);
              setFeedback(totpEnabled ? "ℹ️ 2FA désactivée." : "✅ 2FA TOTP activée avec succès.");
            }}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition ${
              totpEnabled ? "bg-red-950 text-red-300 border border-red-800" : "bg-brand-terracotta text-white"
            }`}
          >
            {totpEnabled ? "Désactiver 2FA" : "Activer 2FA"}
          </button>
        </div>
      </div>

      {/* 3. Sessions Actives avec Révocation à Distance */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4">
        <h2 className="font-heading font-bold text-lg text-white flex items-center gap-2">
          <Lock className="h-5 w-5 text-blue-400" />
          <span>Sessions Actives sur ce Compte</span>
        </h2>

        <div className="space-y-3 text-xs">
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <p className="font-bold text-white">Session Actuelle (Bruxelles, Belgique)</p>
              <p className="text-slate-400">Chrome sur Windows • IP: 85.27.xx.xx</p>
            </div>
            <span className="text-emerald-400 font-bold">● En ligne</span>
          </div>
        </div>
      </div>

      {/* 4. Droits RGPD (Export & Suppression) */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4">
        <h2 className="font-heading font-bold text-lg text-white flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-400" />
          <span>Droits RGPD &amp; Protection des Données</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={handleExportRgpd}
            className="p-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-2xl text-left space-y-1 transition"
          >
            <Download className="h-5 w-5 text-brand-terracotta" />
            <p className="font-bold text-white text-xs">Exporter mes données (RGPD)</p>
            <p className="text-[11px] text-slate-400">Télécharger l'archive complète au format JSON.</p>
          </button>

          <button
            onClick={handleDeleteAccount}
            className="p-4 bg-slate-950 hover:bg-red-950/40 border border-slate-800 hover:border-red-800 rounded-2xl text-left space-y-1 transition"
          >
            <Trash2 className="h-5 w-5 text-red-500" />
            <p className="font-bold text-red-400 text-xs">Demander la suppression du compte</p>
            <p className="text-[11px] text-slate-400">Droit à l'oubli et suppression sous 30 jours.</p>
          </button>
        </div>
      </div>

    </div>
  );
}
