import Link from "next/link";
import { companyIdentity } from "@/config/company";

export const metadata = {
  title: "Politique de confidentialité | Zlobodan Couverture-Zinguerie",
  description:
    "Données collectées, finalités, durées de conservation, sous-traitants et exercice de vos droits sur le site Zlobodan Couverture-Zinguerie.",
};

/**
 * Politique de confidentialité.
 *
 * Réécrite lors de l'audit du 2026-07-27 pour correspondre aux fonctionnalités
 * **réellement livrées**. La version précédente ne décrivait que le formulaire
 * de devis, alors que le site gère des comptes, des sessions, une double
 * authentification, des pièces jointes, des documents PDF et un journal
 * d'audit. À l'inverse, elle laissait entendre un suivi commercial et une
 * « visite de diagnostic » téléphonique qui ne correspondent à aucun traitement
 * automatisé.
 *
 * Deux règles ont guidé la rédaction : ne décrire aucun service qui n'est pas
 * utilisé, et n'omettre aucun service qui l'est. La mesure d'audience, en
 * particulier, n'est **pas** mentionnée : le module `lib/analytics.ts` n'émet
 * d'événement que si `window.gtag` existe, et aucun script de ce type n'est
 * chargé par l'application.
 *
 * Ce texte n'est pas un avis juridique : il décrit fidèlement les traitements
 * observés dans le code. Sa validation relève de l'entreprise.
 */
export default function PolitiqueConfidentialitePage() {
  return (
    <div className="min-h-screen bg-slate-950 py-16 text-white">
      <div className="mx-auto max-w-4xl space-y-8 px-4 sm:px-6 lg:px-8">
        <h1 className="font-heading text-3xl font-extrabold text-white sm:text-4xl">
          Politique de confidentialité
        </h1>

        <div className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900 p-8 text-sm leading-relaxed text-slate-300">
          <section className="space-y-2">
            <h2 className="font-heading text-lg font-bold text-white">
              1. Responsable du traitement
            </h2>
            <p>
              Les données collectées sur ce site sont traitées par{" "}
              <strong>{companyIdentity.legalName ?? companyIdentity.tradeName}</strong>.
              Les coordonnées complètes figurent dans les{" "}
              <Link href="/mentions-legales" className="text-brand-terracotta underline">
                mentions légales
              </Link>
              .
            </p>
          </section>

          <section className="space-y-2 border-t border-slate-800 pt-4">
            <h2 className="font-heading text-lg font-bold text-white">
              2. Données collectées et finalités
            </h2>

            <div className="space-y-3 text-slate-400">
              <p>
                <strong className="text-white">Demande de devis et contact.</strong>{" "}
                Nom, adresse électronique, téléphone, code postal, commune, type
                d&apos;intervention, type de toiture, surface déclarée,
                description libre et pièces jointes éventuelles. Finalité :
                analyser votre demande, y répondre et établir un chiffrage.
              </p>
              <p>
                <strong className="text-white">Compte client.</strong> Adresse
                électronique, mot de passe conservé sous forme de condensat
                (bcrypt), prénom et nom si renseignés, statut du compte.
                Finalité : vous permettre de suivre vos demandes et vos
                documents.
              </p>
              <p>
                <strong className="text-white">Sessions et sécurité.</strong>{" "}
                Jeton de session conservé sous forme hachée, description
                d&apos;appareil, dates de création et d&apos;expiration,
                empreinte de l&apos;adresse IP. L&apos;adresse IP n&apos;est
                jamais stockée en clair : seule une empreinte salée est
                conservée. Finalité : maintenir votre connexion, vous permettre
                de révoquer un appareil et détecter les abus.
              </p>
              <p>
                <strong className="text-white">Double authentification.</strong>{" "}
                Si vous l&apos;activez : secret TOTP chiffré et codes de secours
                hachés. Finalité : protéger l&apos;accès à votre compte.
              </p>
              <p>
                <strong className="text-white">Documents.</strong> Récapitulatifs
                de demande générés au format PDF, leurs versions successives et
                leur empreinte. Finalité : vous remettre une trace fidèle de
                votre demande et en conserver l&apos;historique.
              </p>
              <p>
                <strong className="text-white">Journaux.</strong> Événements
                d&apos;administration et de sécurité : connexions, échecs
                d&apos;authentification, consultations et téléchargements de
                documents, accès refusés. Finalité : sécurité du service et
                traçabilité des accès aux données personnelles. Base légale :
                intérêt légitime.
              </p>
            </div>
          </section>

          <section className="space-y-2 border-t border-slate-800 pt-4">
            <h2 className="font-heading text-lg font-bold text-white">
              3. Cookies et traceurs
            </h2>
            <p className="text-slate-400">
              Le site n&apos;utilise <strong className="text-white">aucun</strong>{" "}
              cookie de mesure d&apos;audience ni de publicité. Sont utilisés :
            </p>
            <ul className="list-inside list-disc space-y-1 text-slate-400">
              <li>
                <strong className="text-white">Cookie de session</strong> —
                strictement nécessaire, déposé uniquement après connexion, pour
                vous maintenir authentifié.
              </li>
              <li>
                <strong className="text-white">Cloudflare Turnstile</strong> —
                strictement nécessaire, protège les formulaires contre les
                soumissions automatisées.
              </li>
            </ul>
            <p className="text-xs text-slate-500">
              Ces traceurs relevant du fonctionnement du service, ils ne sont pas
              soumis à consentement préalable.
            </p>
          </section>

          <section className="space-y-2 border-t border-slate-800 pt-4">
            <h2 className="font-heading text-lg font-bold text-white">
              4. Sous-traitants et destinataires
            </h2>
            <p className="text-slate-400">
              Vos données ne sont ni vendues, ni louées, ni cédées à des tiers à
              des fins commerciales. Interviennent techniquement :
            </p>
            <ul className="list-inside list-disc space-y-1 text-slate-400">
              <li>
                <strong className="text-white">Cloudflare</strong> (Turnstile) —
                protection anti-robot des formulaires ; reçoit votre adresse IP
                et des signaux de navigateur.
              </li>
              <li>
                <strong className="text-white">CARTO et OpenStreetMap</strong> —
                fonds cartographiques de la carte de zone ; votre adresse IP est
                transmise lors du chargement des tuiles.
              </li>
              <li>
                <strong className="text-white">Fournisseur SMTP</strong> —
                acheminement des courriels transactionnels.
              </li>
              <li>
                <strong className="text-white">Hébergeur et stockage objet</strong>{" "}
                — hébergement de l&apos;application, de la base de données et des
                fichiers privés.
              </li>
              <li>
                <strong className="text-white">Upstash</strong> — limitation de
                débit ; ne reçoit que des identifiants techniques dérivés, pas
                de données de formulaire.
              </li>
            </ul>
            <p className="text-xs text-amber-200">
              L&apos;identité précise de l&apos;hébergeur et du fournisseur SMTP
              est en cours de confirmation et sera précisée ici.
            </p>
          </section>

          <section className="space-y-2 border-t border-slate-800 pt-4">
            <h2 className="font-heading text-lg font-bold text-white">
              5. Durées de conservation
            </h2>
            <ul className="list-inside list-disc space-y-1 text-slate-400">
              <li>Demandes de devis et pièces jointes : trois ans après le dernier échange.</li>
              <li>Compte client : jusqu&apos;à votre demande de suppression.</li>
              <li>Sessions : jusqu&apos;à expiration ou révocation.</li>
              <li>
                Documents émis : conservés pour la durée requise par nos
                obligations, y compris après archivage.
              </li>
              <li>Journaux de sécurité : durée limitée, à des fins de preuve et de sécurité.</li>
            </ul>
          </section>

          <section className="space-y-2 border-t border-slate-800 pt-4">
            <h2 className="font-heading text-lg font-bold text-white">
              6. Vos droits
            </h2>
            <p>
              Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès,
              de rectification, d&apos;effacement, de limitation, d&apos;opposition
              et de portabilité.
            </p>
            <p>
              Adressez-nous votre demande via le{" "}
              <Link href="/contact" className="text-brand-terracotta underline">
                formulaire de contact
              </Link>
              . Si vous disposez d&apos;un compte, l&apos;export de vos données
              est directement accessible depuis{" "}
              <Link
                href="/mon-compte/parametres"
                className="text-brand-terracotta underline"
              >
                vos paramètres
              </Link>
              .
            </p>
            <p className="text-xs text-slate-500">
              Vous pouvez également introduire une réclamation auprès de
              l&apos;Autorité de protection des données (Belgique).
            </p>
          </section>

          <section className="space-y-2 border-t border-slate-800 pt-4">
            <h2 className="font-heading text-lg font-bold text-white">
              7. Sécurité
            </h2>
            <p className="text-slate-400">
              Les mots de passe sont hachés, les secrets de double
              authentification chiffrés, les jetons de session stockés sous forme
              hachée et les adresses IP réduites à une empreinte salée. Les
              pièces jointes et les documents sont conservés dans un stockage
              privé, hors de la racine publique du site, et ne sont servis
              qu&apos;après vérification des droits d&apos;accès.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
