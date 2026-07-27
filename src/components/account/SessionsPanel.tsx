"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SessionItem {
  id: string;
  deviceName: string;
  createdAt: string;
  lastSeenAt: string | null;
  expiresAt: string;
  current: boolean;
}

export default function SessionsPanel({
  sessions,
}: Readonly<{ sessions: SessionItem[] }>) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function revoke(id: string): Promise<void> {
    setPending(true);
    const response = await fetch(`/api/auth/sessions/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }).catch(() => null);
    setFeedback(response?.ok ? "Session fermée." : "Session impossible à fermer.");
    setPending(false);
    if (response?.ok) router.refresh();
  }

  async function revokeOthers(): Promise<void> {
    setPending(true);
    const response = await fetch("/api/auth/sessions/revoke-others", {
      method: "POST",
    }).catch(() => null);
    setFeedback(response?.ok ? "Autres sessions fermées." : "Action impossible.");
    setPending(false);
    if (response?.ok) router.refresh();
  }

  async function revokeAll(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/sessions/revoke-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: form.get("currentPassword"),
        verificationCode: form.get("verificationCode") || undefined,
      }),
    }).catch(() => null);
    if (response?.ok) {
      window.location.assign("/connexion");
      return;
    }
    setFeedback("La déconnexion globale a été refusée.");
    setPending(false);
  }

  return (
    <section className="space-y-4 rounded-2xl border border-slate-800 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-bold text-white">Appareils connectés</h2>
          <p className="text-sm text-slate-400">Les jetons de session ne sont jamais affichés.</p>
        </div>
        {sessions.length > 1 && <button type="button" disabled={pending} onClick={revokeOthers} className="rounded bg-slate-700 px-3 py-2 text-xs font-bold">Fermer les autres</button>}
      </div>
      <ul className="space-y-2">
        {sessions.map((session) => (
          <li key={session.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-950 p-3">
            <div>
              <p className="font-bold">{session.deviceName} {session.current && <span className="text-emerald-400">· session actuelle</span>}</p>
              <p className="text-xs text-slate-500">Créée {new Date(session.createdAt).toLocaleString("fr-BE")} · activité {new Date(session.lastSeenAt ?? session.createdAt).toLocaleString("fr-BE")} · expire {new Date(session.expiresAt).toLocaleString("fr-BE")}</p>
            </div>
            <button type="button" disabled={pending} onClick={() => revoke(session.id)} className="rounded bg-red-900 px-3 py-2 text-xs font-bold">Déconnecter</button>
          </li>
        ))}
      </ul>
      <form onSubmit={revokeAll} className="space-y-2 rounded-xl border border-red-900 p-3">
        <h3 className="text-sm font-bold text-red-300">Déconnecter tous les appareils</h3>
        <input name="currentPassword" type="password" autoComplete="current-password" required placeholder="Mot de passe actuel" className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
        <input name="verificationCode" autoComplete="one-time-code" placeholder="Code 2FA si activée" className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" />
        <button disabled={pending} className="rounded bg-red-800 px-3 py-2 text-xs font-bold disabled:opacity-60">Tout déconnecter</button>
      </form>
      {feedback && <p role="status" className="text-sm">{feedback}</p>}
    </section>
  );
}
