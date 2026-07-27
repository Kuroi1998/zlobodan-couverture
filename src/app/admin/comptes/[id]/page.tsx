import { notFound } from "next/navigation";
import { requirePageRole } from "@/lib/security/guards";
import {
  getAccountAdministration,
  listAccountSecurityEvents,
} from "@/lib/services/auth/admin-account-service";
import AdminAccountActions from "@/components/admin/AdminAccountActions";

export const dynamic = "force-dynamic";

export default async function AdminAccountPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  await requirePageRole(["admin"], "/admin/comptes");
  const { id } = await params;
  const account = await getAccountAdministration(id);
  if (!account) notFound();
  const events = await listAccountSecurityEvents(account.id);

  return (
    <div className="max-w-5xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">{account.email}</h1>
        <p className="text-slate-400">
          {account.role} · {account.status} · {account.activeSessions} session(s)
        </p>
      </div>
      <dl className="grid gap-3 rounded border border-slate-800 bg-slate-950 p-4 sm:grid-cols-3">
        <div><dt className="text-slate-500">E-mail vérifié</dt><dd>{account.emailVerifiedAt ? "oui" : "non"}</dd></div>
        <div><dt className="text-slate-500">2FA</dt><dd>{account.twoFactorEnabled ? "active" : "non"}</dd></div>
        <div><dt className="text-slate-500">Créé</dt><dd>{account.createdAt.toLocaleString("fr-BE")}</dd></div>
        <div><dt className="text-slate-500">Dernière connexion</dt><dd>{account.lastLoginAt?.toLocaleString("fr-BE") ?? "jamais"}</dd></div>
        <div><dt className="text-slate-500">Mot de passe modifié</dt><dd>{account.passwordChangedAt?.toLocaleString("fr-BE") ?? "date inconnue"}</dd></div>
        <div><dt className="text-slate-500">Verrouillé jusqu’au</dt><dd>{account.lockedUntil?.toLocaleString("fr-BE") ?? "non"}</dd></div>
      </dl>
      <AdminAccountActions publicId={account.publicId} status={account.status} />
      <section className="rounded border border-slate-800 bg-slate-950 p-4">
        <h2 className="mb-3 font-bold text-white">Événements de sécurité</h2>
        <ul className="space-y-2">
          {events.map((event) => (
            <li key={event.id} className="flex justify-between border-b border-slate-800 pb-2">
              <span>{event.eventType} · {event.severity}</span>
              <time>{event.createdAt.toLocaleString("fr-BE")}</time>
            </li>
          ))}
          {events.length === 0 && <li className="text-slate-500">Aucun événement.</li>}
        </ul>
      </section>
    </div>
  );
}
