"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  enabled: boolean;
  recoveryCodesRemaining: number;
}

interface SetupData {
  qrCodeDataUrl: string;
  manualKey: string;
}

interface ApiData {
  data?: {
    qrCodeDataUrl?: string;
    manualKey?: string;
    recoveryCodes?: string[];
  };
  message?: string;
  error?: { message?: string };
}

export default function TwoFactorPanel({
  enabled,
  recoveryCodesRemaining,
}: Readonly<Props>) {
  const router = useRouter();
  const [setup, setSetup] = useState<SetupData | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");
  const [pending, setPending] = useState(false);

  async function call(endpoint: string, body: Record<string, unknown>) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as ApiData;
    if (!response.ok) {
      throw new Error(payload.error?.message ?? "Action impossible.");
    }
    return payload;
  }

  async function start(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFeedback("");
    const form = new FormData(event.currentTarget);
    try {
      const payload = await call("/api/auth/two-factor/setup", {
        currentPassword: form.get("currentPassword"),
        verificationCode: form.get("verificationCode") || undefined,
      });
      if (payload.data?.qrCodeDataUrl && payload.data.manualKey) {
        setSetup({
          qrCodeDataUrl: payload.data.qrCodeDataUrl,
          manualKey: payload.data.manualKey,
        });
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Action impossible.");
    }
    setPending(false);
  }

  async function confirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      const payload = await call("/api/auth/two-factor/confirm", {
        code: form.get("code"),
      });
      setRecoveryCodes(payload.data?.recoveryCodes ?? []);
      setSetup(null);
      setFeedback(payload.message ?? "2FA activée.");
      router.refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Code invalide.");
    }
    setPending(false);
  }

  async function strongAction(
    event: React.FormEvent<HTMLFormElement>,
    endpoint: string
  ) {
    event.preventDefault();
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      const payload = await call(endpoint, {
        currentPassword: form.get("currentPassword"),
        verificationCode: form.get("verificationCode"),
        confirmation: true,
      });
      if (payload.data?.recoveryCodes) setRecoveryCodes(payload.data.recoveryCodes);
      setFeedback(payload.message ?? "Action terminée.");
      router.refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Action impossible.");
    }
    setPending(false);
  }

  function downloadCodes(): void {
    const blob = new Blob([`${recoveryCodes.join("\n")}\n`], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "zlobodan-codes-recuperation.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const input =
    "w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm";
  return (
    <section className="space-y-4 rounded-2xl border border-slate-800 p-5">
      <div>
        <h2 className="font-bold text-white">Authentification à deux facteurs</h2>
        <p className="text-sm text-slate-400">
          {enabled
            ? `Active · ${recoveryCodesRemaining} code(s) de récupération restant(s).`
            : "Ajoutez une application TOTP compatible."}
        </p>
      </div>
      {!enabled && !setup && (
        <form onSubmit={start} className="space-y-2">
          <input name="currentPassword" type="password" autoComplete="current-password" required placeholder="Mot de passe actuel" className={input} />
          <button disabled={pending} className="rounded-xl bg-brand-terracotta px-4 py-2 font-bold disabled:opacity-60">Configurer la 2FA</button>
        </form>
      )}
      {setup && (
        <form onSubmit={confirm} className="space-y-3">
          <Image src={setup.qrCodeDataUrl} alt="QR code TOTP à scanner localement" width={240} height={240} unoptimized className="rounded bg-white p-2" />
          <p className="break-all font-mono text-xs">Clé manuelle : {setup.manualKey}</p>
          <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required placeholder="Premier code à 6 chiffres" className={input} />
          <button disabled={pending} className="rounded-xl bg-emerald-700 px-4 py-2 font-bold disabled:opacity-60">Confirmer et afficher les codes de secours</button>
        </form>
      )}
      {enabled && (
        <div className="grid gap-4 lg:grid-cols-2">
          <form onSubmit={(event) => strongAction(event, "/api/auth/two-factor/recovery-codes")} className="space-y-2">
            <h3 className="text-sm font-bold">Régénérer les codes</h3>
            <input name="currentPassword" type="password" autoComplete="current-password" required placeholder="Mot de passe actuel" className={input} />
            <input name="verificationCode" autoComplete="one-time-code" required placeholder="Code TOTP ou de récupération" className={input} />
            <button disabled={pending} className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-bold disabled:opacity-60">Régénérer</button>
          </form>
          <form onSubmit={(event) => strongAction(event, "/api/auth/two-factor/disable")} className="space-y-2">
            <h3 className="text-sm font-bold">Désactiver la 2FA</h3>
            <input name="currentPassword" type="password" autoComplete="current-password" required placeholder="Mot de passe actuel" className={input} />
            <input name="verificationCode" autoComplete="one-time-code" required placeholder="Code TOTP ou de récupération" className={input} />
            <button disabled={pending} className="rounded-xl bg-red-800 px-4 py-2 text-sm font-bold disabled:opacity-60">Désactiver</button>
          </form>
        </div>
      )}
      {recoveryCodes.length > 0 && (
        <div className="space-y-3 rounded-xl border border-amber-700 bg-amber-950 p-4">
          <p className="font-bold text-amber-200">Affichage unique : enregistrez ces codes maintenant.</p>
          <ul className="grid gap-1 font-mono sm:grid-cols-2">{recoveryCodes.map((code) => <li key={code}>{code}</li>)}</ul>
          <div className="flex gap-2">
            <button type="button" onClick={() => navigator.clipboard.writeText(recoveryCodes.join("\n"))} className="rounded bg-slate-700 px-3 py-2 text-xs font-bold">Copier</button>
            <button type="button" onClick={downloadCodes} className="rounded bg-slate-700 px-3 py-2 text-xs font-bold">Télécharger</button>
            <button type="button" onClick={() => setRecoveryCodes([])} className="rounded bg-slate-800 px-3 py-2 text-xs">Masquer définitivement</button>
          </div>
        </div>
      )}
      {feedback && <p role="status" className="rounded-xl bg-slate-800 p-3 text-sm">{feedback}</p>}
    </section>
  );
}
