import { notFound } from "next/navigation";
import { requirePageAuth } from "@/lib/security/guards";
import { resolveSession } from "@/lib/security/session-guard";
import { getClientProfile } from "@/lib/services/client-profile-service";
import { listActiveSessions } from "@/lib/services/auth-service";
import { getTwoFactorStatus } from "@/lib/services/auth/two-factor-service";
import { listOwnSecurityActivity } from "@/lib/services/auth/account-security-service";
import SecurityCredentialsForms from "@/components/account/SecurityCredentialsForms";
import TwoFactorPanel from "@/components/account/TwoFactorPanel";
import SessionsPanel from "@/components/account/SessionsPanel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sécurité du compte | Zlobodan" };

export default async function AccountSecurityPage() {
  const user = await requirePageAuth("/mon-compte/securite");
  const { sessionId } = await resolveSession();
  if (!sessionId) notFound();
  const [profile, sessions, factor, activity] = await Promise.all([
    getClientProfile(user.id),
    listActiveSessions(user.id, sessionId),
    getTwoFactorStatus(user.id),
    listOwnSecurityActivity(user.id),
  ]);
  if (!profile) notFound();

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-white">Sécurité du compte</h1>
        <p className="text-sm text-slate-400">Mot de passe, adresse, double facteur, appareils et activité récente.</p>
      </div>
      <SecurityCredentialsForms />
      <TwoFactorPanel enabled={factor.enabled} recoveryCodesRemaining={factor.recoveryCodesRemaining} />
      <SessionsPanel sessions={sessions.map((session) => ({
        ...session,
        createdAt: session.createdAt.toISOString(),
        lastSeenAt: session.lastSeenAt?.toISOString() ?? null,
        expiresAt: session.expiresAt.toISOString(),
      }))} />
      <section className="space-y-3 rounded-2xl border border-slate-800 p-5">
        <h2 className="font-bold text-white">Activité récente</h2>
        <ul className="space-y-2 text-sm">
          {activity.map((event) => (
            <li key={event.id} className="flex flex-wrap justify-between gap-2 border-b border-slate-800 pb-2">
              <span>{event.eventType} · {event.severity}</span>
              <time className="text-slate-500">{event.createdAt.toLocaleString("fr-BE")}</time>
            </li>
          ))}
          {activity.length === 0 && <li className="text-slate-500">Aucune activité enregistrée.</li>}
        </ul>
      </section>
    </div>
  );
}
