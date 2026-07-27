import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema/users";
import { userTwoFactor } from "@/db/schema/accounts";
import { requirePageRole } from "@/lib/security/guards";

export const dynamic = "force-dynamic";
export const metadata = { title: "Comptes | Administration Zlobodan" };

export default async function AdminAccountsPage() {
  await requirePageRole(["admin"], "/admin/comptes");
  const accounts = await db
    .select({
      publicId: users.publicId,
      email: users.email,
      role: users.role,
      status: users.status,
      emailVerifiedAt: users.emailVerifiedAt,
      lastLoginAt: users.lastLoginAt,
      twoFactorEnabled: userTwoFactor.enabled,
    })
    .from(users)
    .leftJoin(userTwoFactor, eq(userTwoFactor.userId, users.id))
    .orderBy(desc(users.createdAt))
    .limit(200);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Comptes</h1>
        <p className="text-slate-400">
          État, vérification, 2FA et dernière connexion. Aucun secret n’est exposé.
        </p>
      </div>
      <div className="overflow-x-auto rounded border border-slate-800">
        <table className="w-full text-left">
          <thead className="bg-slate-950 text-slate-400">
            <tr>
              <th className="p-3">E-mail</th>
              <th className="p-3">Rôle</th>
              <th className="p-3">Statut</th>
              <th className="p-3">Vérifié</th>
              <th className="p-3">2FA</th>
              <th className="p-3">Dernière connexion</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.publicId} className="border-t border-slate-800">
                <td className="p-3">
                  <Link
                    href={`/admin/comptes/${account.publicId}`}
                    className="font-bold text-brand-terracotta hover:underline"
                  >
                    {account.email}
                  </Link>
                </td>
                <td className="p-3">{account.role}</td>
                <td className="p-3">{account.status}</td>
                <td className="p-3">{account.emailVerifiedAt ? "oui" : "non"}</td>
                <td className="p-3">{account.twoFactorEnabled === 1 ? "active" : "non"}</td>
                <td className="p-3">
                  {account.lastLoginAt?.toLocaleString("fr-BE") ?? "jamais"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
