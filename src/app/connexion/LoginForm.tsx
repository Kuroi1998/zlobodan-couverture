"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { safeReturnPath } from "@/lib/security/urls";
import {
  ShieldCheck,
  Lock,
  Mail,
  Phone,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  KeyRound,
} from "lucide-react";

const TEMPORARY_LOGIN_ERROR =
  "La connexion est temporairement indisponible. Veuillez réessayer.";

class LoginFeedbackError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LoginFeedbackError";
  }
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function isResponseRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getResponseError(value: unknown, fallback: string): string {
  if (!isResponseRecord(value) || typeof value.error !== "string") return fallback;
  return value.error;
}

interface LoginFormProps {
  requestedNextPath: string | null;
}

export default function LoginForm({ requestedNextPath }: Readonly<LoginFormProps>) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [totpCode, setTotpCode] = useState("");

  // Status State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMsg("");
    setSuccessMsg("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          totpCode: totpCode || undefined,
          next: requestedNextPath ?? undefined,
        }),
      });

      const data: unknown = await res.json();

      if (!res.ok || !isResponseRecord(data) || data.success !== true) {
        throw new LoginFeedbackError(
          getResponseError(data, TEMPORARY_LOGIN_ERROR)
        );
      }

      const destination = safeReturnPath(data.destination, "");
      if (!destination) {
        throw new LoginFeedbackError(TEMPORARY_LOGIN_ERROR);
      }

      // Le serveur a authentifié l'utilisateur, choisi la destination depuis
      // son rôle réel et attaché le cookie à cette réponse. `replace` retire
      // le formulaire (et son état) de l'historique ; `refresh` force l'arbre
      // serveur de destination à relire immédiatement la nouvelle session.
      setPassword("");
      setTotpCode("");
      setSuccessMsg("Connexion réussie. Redirection vers votre espace...");
      router.replace(destination);
      router.refresh();
    } catch (error: unknown) {
      // Un échec d'authentification est affiché, jamais contourné.
      //
      // La version précédente redirigeait vers /admin ou /mon-compte selon que
      // l'adresse contenait « admin » — un raccourci de développement qui
      // masquait toute erreur et envoyait l'utilisateur vers une zone protégée
      // sans session. Les gardes serveur le renvoyaient aussitôt vers cette
      // page : le symptôme visible était une boucle de redirection, et la
      // cause réelle restait invisible.
      setErrorMsg(
        error instanceof LoginFeedbackError
          ? error.message
          : TEMPORARY_LOGIN_ERROR
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMsg("");
    setSuccessMsg("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, phone }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erreur lors de l'inscription.");
      }

      // Message neutre, aligné sur la réponse du serveur : il ne confirme pas
      // qu'un compte vient d'être créé, ce qui permettrait d'énumérer les
      // adresses déjà inscrites. Pas de redirection : le compte doit d'abord
      // être vérifié par email.
      setSuccessMsg(
        data.message ||
          "Si cette adresse peut être utilisée, un email de vérification vient d'être envoyé."
      );
    } catch (error: unknown) {
      // Plus d'annonce de succès sur un échec : la version précédente affichait
      // « Inscription validée » puis redirigeait, quelle que soit la réponse du
      // serveur — y compris lorsque le mot de passe était refusé.
      setErrorMsg(getErrorMessage(error, "Erreur lors de l'inscription."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 py-16">
      
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        
        {/* Header Logo */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5 font-heading font-extrabold text-2xl text-white">
            <div className="bg-brand-terracotta p-2 rounded-xl text-white shadow-accent">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <span>ZLOBODAN</span>
          </Link>
          <p className="text-xs text-slate-400">
            Espace Client &amp; Back-Office Administration Belgique
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-2xl border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setActiveTab("login");
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`py-2.5 rounded-xl transition ${
              activeTab === "login"
                ? "bg-brand-terracotta text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Se Connecter
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("register");
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`py-2.5 rounded-xl transition ${
              activeTab === "register"
                ? "bg-brand-terracotta text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Créer un Compte
          </button>
        </div>

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
            <span role="alert" aria-live="polite">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span role="status" aria-live="polite">{successMsg}</span>
          </div>
        )}

        {/* LOGIN FORM */}
        {activeTab === "login" ? (
          <form
            onSubmit={handleLoginSubmit}
            aria-busy={isSubmitting}
            className="space-y-4"
          >
            <div className="space-y-1">
              <label htmlFor="login-email" className="text-xs font-bold text-slate-300 uppercase">Adresse Email *</label>
              <div className="relative">
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jean.peeters@email.be"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pl-10 text-sm text-white focus:outline-none focus:border-brand-terracotta"
                />
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="login-password" className="text-xs font-bold text-slate-300 uppercase">Mot de Passe *</label>
              <div className="relative">
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pl-10 text-sm text-white focus:outline-none focus:border-brand-terracotta"
                />
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="login-totp" className="text-xs font-bold text-slate-300 uppercase">
                Code 2FA (administration)
              </label>
              <div className="relative">
                <input
                  id="login-totp"
                  name="totpCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  aria-describedby="login-totp-help"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pl-10 text-sm text-white tracking-[0.3em] focus:outline-none focus:border-brand-terracotta"
                />
                <KeyRound className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
              </div>
              <p id="login-totp-help" className="text-[11px] text-slate-500">
                Requis uniquement pour les comptes administrateur et staff.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className="w-full bg-brand-terracotta hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70 text-white font-extrabold py-3.5 rounded-xl text-sm shadow-accent transition flex items-center justify-center gap-2 mt-2"
            >
              <span>{isSubmitting ? "Connexion en cours..." : "Accéder à mon Espace"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        ) : (
          /* REGISTER FORM */
          <form
            onSubmit={handleRegisterSubmit}
            aria-busy={isSubmitting}
            className="space-y-4"
          >
            <div className="space-y-1">
              <label htmlFor="register-email" className="text-xs font-bold text-slate-300 uppercase">Adresse Email *</label>
              <div className="relative">
                <input
                  id="register-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jean.peeters@email.be"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pl-10 text-sm text-white focus:outline-none focus:border-brand-terracotta"
                />
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="register-phone" className="text-xs font-bold text-slate-300 uppercase">Téléphone (facultatif)</label>
              <div className="relative">
                <input
                  id="register-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0470 12 34 56"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pl-10 text-sm text-white focus:outline-none focus:border-brand-terracotta"
                />
                <Phone className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="register-password" className="text-xs font-bold text-slate-300 uppercase">Mot de passe (12 caractères min) *</label>
              <div className="relative">
                <input
                  id="register-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pl-10 text-sm text-white focus:outline-none focus:border-brand-terracotta"
                />
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className="w-full bg-brand-terracotta hover:bg-orange-600 text-white font-extrabold py-3.5 rounded-xl text-sm shadow-accent transition flex items-center justify-center gap-2 mt-2"
            >
              <span>Créer mon Compte Espace Client</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}

      </div>

    </div>
  );
}
