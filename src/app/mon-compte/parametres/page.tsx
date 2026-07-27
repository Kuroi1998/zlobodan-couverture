import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Lock, Settings, ShieldCheck, Smartphone } from "lucide-react";
import { requirePageAuth } from "@/lib/security/guards";
import { getClientProfile } from "@/lib/services/client-profile-service";
import ProfileForm from "@/components/account/ProfileForm";
import RevokeSessionsButton from "@/components/account/RevokeSessionsButton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Profil et confidentialité | Espace client Zlobodan",
};

/**
 * Profil et confidentialité.
 *
 * L'écran était intégralement en lecture seule : il s'appelait « paramètres »
 * sans qu'aucun paramètre puisse être modifié. Le téléphone est désormais
 * réellement modifiable, et les autres sessions réellement révocables.
 *
 * L'adresse e-mail reste affichée sans champ de saisie. Elle identifie le
 * compte et sert d'adresse de récupération : la changer suppose une
 * confirmation sur les deux adresses, parcours reporté en V2. Afficher un
 * champ grisé laisserait croire à une panne plutôt qu'à une décision.
 */
export default async function ClientSettingsPage() {
  const user = await requirePageAuth("/mon-compte/parametres");
  const profile = await getClientProfile(user.id);
  if (!profile) notFound();

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-white sm:text-3xl">
          Profil et confidentialité
        </h1>
        <p className="text-sm text-slate-400">
          Informations réelles de votre compte et accès à vos droits RGPD.
        </p>
      </div>

      <section className="space-y-5 rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="flex items-center gap-2 font-bold text-white">
          <Settings className="h-5 w-5 text-brand-terracotta" /> Mes coordonnées
        </h2>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase text-slate-500">Adresse e-mail</dt>
            <dd className="text-white">{profile.email}</dd>
            <dd className="text-[11px] text-slate-500">
              Identifie votre compte. Écrivez-nous pour la faire changer.
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">E-mail vérifié</dt>
            <dd className="text-white">{profile.emailVerifiedAt ? "Oui" : "Non"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Compte créé le</dt>
            <dd className="text-white">
              {profile.createdAt.toLocaleDateString("fr-BE")}
            </dd>
          </div>
        </dl>
        <div className="border-t border-slate-800 pt-5">
          <ProfileForm
            initialPhone={profile.phone}
            initialFirstName={profile.firstName}
            initialLastName={profile.lastName}
          />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <Smartphone className="mb-3 h-5 w-5 text-amber-400" />
          <p className="font-bold text-white">Double facteur</p>
          <p className="text-sm text-slate-400">
            {profile.totpEnabled ? "Activé sur ce compte." : "Non activé sur ce compte."}
          </p>
        </div>
        <div className="space-y-3 rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <Lock className="h-5 w-5 text-blue-400" />
          <p className="font-bold text-white">Sessions actives</p>
          <p className="text-sm text-slate-400">
            {profile.activeSessions} session(s), celle-ci comprise.
          </p>
          {/* Le bouton n'apparaît que s'il y a réellement autre chose à fermer. */}
          {profile.activeSessions > 1 && <RevokeSessionsButton />}
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="flex items-center gap-2 font-bold text-white">
          <ShieldCheck className="h-5 w-5 text-emerald-400" /> Droits RGPD
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/api/client/privacy/export"
            className="rounded-2xl border border-slate-800 bg-slate-950 p-4 hover:bg-slate-800"
          >
            <Download className="mb-2 h-5 w-5 text-brand-terracotta" />
            <p className="text-xs font-bold text-white">Exporter mes données</p>
            <p className="text-[11px] text-slate-400">Archive JSON générée côté serveur.</p>
          </Link>
          <Link
            href="/contact"
            className="rounded-2xl border border-slate-800 bg-slate-950 p-4 hover:bg-slate-800"
          >
            <ShieldCheck className="mb-2 h-5 w-5 text-red-400" />
            <p className="text-xs font-bold text-white">
              Demander une rectification ou suppression
            </p>
            <p className="text-[11px] text-slate-400">
              La demande est vérifiée avant toute action irréversible.
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
