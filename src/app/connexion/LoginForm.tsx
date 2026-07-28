"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import TurnstileWidget from "@/components/forms/TurnstileWidget";
import { safeReturnPath } from "@/lib/security/urls";

interface Props {
  requestedNextPath: string | null;
}

interface ApiPayload {
  success?: boolean;
  destination?: string;
  code?: string;
  message?: string;
  error?: string | { message?: string; code?: string };
}

function messageFrom(payload: ApiPayload, fallback: string): string {
  if (typeof payload.error === "string") return payload.error;
  if (payload.error && typeof payload.error.message === "string") {
    return payload.error.message;
  }
  return payload.message ?? fallback;
}

export default function LoginForm({ requestedNextPath }: Readonly<Props>) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [twoFactorStep, setTwoFactorStep] = useState(false);
  const [twoFactorMethod, setTwoFactorMethod] = useState<"totp" | "recovery">("totp");
  const [captchaToken, setCaptchaToken] = useState("");
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [failed, setFailed] = useState(false);

  const onCaptchaToken = useCallback((token: string) => {
    setCaptchaToken(token);
  }, []);

  function finishLogin(destination: unknown): void {
    const safeDestination = safeReturnPath(destination, "/mon-compte");
    router.replace(safeDestination);
    router.refresh();
  }

  async function submitLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setFeedback("");
    setFailed(false);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
        totpCode: form.get("totpCode") || undefined,
        next: requestedNextPath ?? undefined,
        captchaToken: captchaToken || undefined,
      }),
    }).catch(() => null);
    const payload = response
      ? ((await response.json().catch(() => ({}))) as ApiPayload)
      : {};

    if (response?.status === 202 && payload.code === "TWO_FACTOR_REQUIRED") {
      setTwoFactorStep(true);
      setFeedback(payload.message ?? "Second facteur requis.");
      setPending(false);
      return;
    }
    if (!response?.ok || payload.success !== true) {
      setFailed(true);
      setFeedback(messageFrom(payload, "Connexion temporairement indisponible."));
      const errorCode =
        payload.code ??
        (typeof payload.error === "object" ? payload.error.code : undefined);
      if (errorCode === "CHALLENGE_REQUIRED") setShowCaptcha(true);
      setPending(false);
      return;
    }
    finishLogin(payload.destination);
  }

  async function submitSecondFactor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setFeedback("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/two-factor/challenge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: form.get("code"),
        method: twoFactorMethod,
      }),
    }).catch(() => null);
    const payload = response
      ? ((await response.json().catch(() => ({}))) as ApiPayload)
      : {};
    if (!response?.ok || payload.success !== true) {
      setFailed(true);
      setFeedback(messageFrom(payload, "Code invalide ou expiré."));
      setPending(false);
      return;
    }
    finishLogin(payload.destination);
  }

  async function submitRegistration(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setFeedback("");
    setFailed(false);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: form.get("firstName"),
        lastName: form.get("lastName"),
        email: form.get("email"),
        phone: form.get("phone"),
        password: form.get("password"),
        passwordConfirmation: form.get("passwordConfirmation"),
        acceptTerms: form.get("acceptTerms") === "on",
        acceptPrivacy: form.get("acceptPrivacy") === "on",
      }),
    }).catch(() => null);
    const payload = response
      ? ((await response.json().catch(() => ({}))) as ApiPayload)
      : {};
    setFailed(!response?.ok);
    setFeedback(
      messageFrom(
        payload,
        response?.ok
          ? "Vérifiez votre boîte e-mail pour activer le compte."
          : "Inscription impossible."
      )
    );
    setPending(false);
  }

  const inputClass =
    "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white focus:border-brand-terracotta focus:outline-none";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-white">
      <div className="w-full max-w-lg space-y-6 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-8">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-2xl font-extrabold">
            <ShieldCheck className="text-brand-terracotta" /> ZLOBODAN
          </Link>
          <p className="mt-2 text-xs text-slate-400">Espace client et administration sécurisés</p>
        </div>

        {!twoFactorStep && (
          <div className="grid grid-cols-2 rounded-xl bg-slate-950 p-1">
            {(["login", "register"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setMode(item);
                  setFeedback("");
                }}
                className={`rounded-lg py-2 text-sm font-bold ${mode === item ? "bg-brand-terracotta" : "text-slate-400"}`}
              >
                {item === "login" ? "Se connecter" : "Créer un compte"}
              </button>
            ))}
          </div>
        )}

        {feedback && (
          <p
            role={failed ? "alert" : "status"}
            className={`rounded-xl border p-3 text-sm ${failed ? "border-red-800 bg-red-950 text-red-200" : "border-emerald-800 bg-emerald-950 text-emerald-200"}`}
          >
            {feedback}
          </p>
        )}

        {twoFactorStep ? (
          <form onSubmit={submitSecondFactor} className="space-y-4">
            <h1 className="text-xl font-bold">Vérification en deux étapes</h1>
            <label className="block space-y-1">
              <span className="text-xs font-bold uppercase">
                {twoFactorMethod === "totp" ? "Code 2FA" : "Code de récupération"}
              </span>
              <input
                name="code"
                autoComplete="one-time-code"
                inputMode={twoFactorMethod === "totp" ? "numeric" : "text"}
                maxLength={32}
                required
                className={inputClass}
              />
            </label>
            <button
              type="button"
              onClick={() =>
                setTwoFactorMethod((value) =>
                  value === "totp" ? "recovery" : "totp"
                )
              }
              className="text-xs text-brand-terracotta underline"
            >
              {twoFactorMethod === "totp"
                ? "Utiliser un code de récupération"
                : "Utiliser l'application d'authentification"}
            </button>
            <button disabled={pending} className="w-full rounded-xl bg-brand-terracotta py-3 font-bold disabled:opacity-60">
              {pending ? "Vérification…" : "Terminer la connexion"}
            </button>
          </form>
        ) : mode === "login" ? (
          <form onSubmit={submitLogin} className="space-y-4">
            <label className="block space-y-1">
              <span className="text-xs font-bold uppercase">Adresse Email</span>
              <input name="email" type="email" autoComplete="email" required className={inputClass} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-bold uppercase">Mot de Passe</span>
              <input name="password" type="password" autoComplete="current-password" required className={inputClass} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-bold uppercase">Code 2FA (si activé)</span>
              <input name="totpCode" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className={inputClass} />
            </label>
            {showCaptcha && <TurnstileWidget onToken={onCaptchaToken} theme="dark" />}
            <div className="text-right">
              <Link href="/mot-de-passe-oublie" className="text-xs text-brand-terracotta underline">
                Mot de passe oublié ?
              </Link>
            </div>
            <button disabled={pending} className="w-full rounded-xl bg-brand-terracotta py-3 font-bold disabled:opacity-60">
              {pending ? "Connexion…" : "Accéder à mon Espace"}
            </button>
          </form>
        ) : (
          <form onSubmit={submitRegistration} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1"><span className="text-xs uppercase">Prénom</span><input name="firstName" autoComplete="given-name" required maxLength={100} className={inputClass} /></label>
              <label className="space-y-1"><span className="text-xs uppercase">Nom</span><input name="lastName" autoComplete="family-name" required maxLength={100} className={inputClass} /></label>
            </div>
            <label className="block space-y-1"><span className="text-xs uppercase">Adresse e-mail</span><input name="email" type="email" autoComplete="email" required className={inputClass} /></label>
            <label className="block space-y-1"><span className="text-xs uppercase">Téléphone (facultatif)</span><input name="phone" type="tel" autoComplete="tel" className={inputClass} /></label>
            <label className="block space-y-1"><span className="text-xs uppercase">Mot de passe</span><input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required className={inputClass} /></label>
            <label className="block space-y-1"><span className="text-xs uppercase">Confirmer le mot de passe</span><input name="passwordConfirmation" type="password" autoComplete="new-password" minLength={12} maxLength={128} required className={inputClass} /></label>
            <label className="flex gap-2 text-xs"><input name="acceptTerms" type="checkbox" required /> J’accepte les conditions d’utilisation.</label>
            <label className="flex gap-2 text-xs"><input name="acceptPrivacy" type="checkbox" required /> J’accepte la politique de confidentialité.</label>
            <button disabled={pending} className="w-full rounded-xl bg-brand-terracotta py-3 font-bold disabled:opacity-60">
              {pending ? "Création…" : "Créer mon compte"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
