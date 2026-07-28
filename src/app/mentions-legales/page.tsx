import type { Metadata } from "next";
import Link from "next/link";
import {
  companyIdentity,
  formatRegisteredAddress,
  hasPublishableLegalIdentity,
} from "@/config/company";

export const metadata: Metadata = {
  title: "Mentions légales | Zlobodan Couverture-Zinguerie",
  // L'ancienne description situait l'entreprise « à Nantes ». Le site se
  // présente par ailleurs comme belge : la contradiction était indexée.
  description:
    "Mentions légales du site Zlobodan Couverture-Zinguerie : éditeur, identification de l'entreprise, hébergement et propriété intellectuelle.",
};

/**
 * Mentions légales.
 *
 * La version précédente appliquait un modèle **français** à une entreprise
 * présentée comme belge : « Société par Actions Simplifiée (SAS) », « SIRET »,
 * « RCS », et une assurance « valable pour l'ensemble du territoire français ».
 * Elle affichait en outre un numéro d'entreprise, un capital social et un
 * numéro de police d'assurance dont aucun n'était vérifié.
 *
 * Le parti pris est désormais le suivant : **n'afficher que ce qui est
 * prouvé**. Une mention légale incomplète mais sincère expose bien moins qu'une
 * mention complète et fausse — un numéro d'entreprise erroné désigne
 * potentiellement une autre société, et une couverture d'assurance annoncée à
 * tort engage lourdement.
 *
 * Ce texte n'est pas un avis juridique. Les éléments restant à réunir sont
 * suivis dans `docs/content-verification-register.md` et doivent être validés
 * par l'entreprise, au besoin avec un conseil compétent.
 */
export default function MentionsLegalesPage() {
  const address = formatRegisteredAddress();
  const identityIsPublishable = hasPublishableLegalIdentity();

  return (
    <div className="min-h-screen bg-slate-950 py-16 text-white">
      <div className="mx-auto max-w-4xl space-y-8 px-4 sm:px-6 lg:px-8">
        <h1 className="font-heading text-3xl font-extrabold text-white sm:text-4xl">
          Mentions légales
        </h1>

        <div className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900 p-8 text-sm leading-relaxed text-slate-300">
          <section className="space-y-2">
            <h2 className="font-heading text-lg font-bold text-white">
              1. Éditeur du site
            </h2>
            <p>
              Le présent site est édité par{" "}
              <strong>{companyIdentity.legalName ?? companyIdentity.tradeName}</strong>.
            </p>

            <ul className="list-inside list-disc space-y-1 text-slate-400">
              <li>
                <strong>Nom commercial :</strong> {companyIdentity.tradeName}
              </li>
              {companyIdentity.legalForm && (
                <li>
                  <strong>Forme juridique :</strong> {companyIdentity.legalForm}
                </li>
              )}
              {address && (
                <li>
                  <strong>Siège social :</strong> {address}
                </li>
              )}
              {companyIdentity.companyNumber && (
                <li>
                  <strong>Numéro d&apos;entreprise (BCE) :</strong>{" "}
                  {companyIdentity.companyNumber}
                </li>
              )}
              {companyIdentity.vatNumber && (
                <li>
                  <strong>Numéro de TVA :</strong> {companyIdentity.vatNumber}
                </li>
              )}
              {companyIdentity.publicationDirector && (
                <li>
                  <strong>Responsable de la publication :</strong>{" "}
                  {companyIdentity.publicationDirector}
                </li>
              )}
              {companyIdentity.publicEmail && (
                <li>
                  <strong>Courriel :</strong> {companyIdentity.publicEmail}
                </li>
              )}
              {companyIdentity.publicPhoneLabel && (
                <li>
                  <strong>Téléphone :</strong> {companyIdentity.publicPhoneLabel}
                </li>
              )}
              <li>
                <strong>Site :</strong> {companyIdentity.websiteUrl}
              </li>
            </ul>

            {!identityIsPublishable && (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200">
                Les données d&apos;identification légale de l&apos;entreprise
                (dénomination complète, forme juridique, siège social et numéro
                d&apos;entreprise) sont en cours de vérification et seront
                publiées ici dès qu&apos;elles auront été confirmées. Dans
                l&apos;intervalle, vous pouvez nous joindre via le{" "}
                <Link href="/contact" className="underline">
                  formulaire de contact
                </Link>
                .
              </p>
            )}
          </section>

          <section className="space-y-2 border-t border-slate-800 pt-4">
            <h2 className="font-heading text-lg font-bold text-white">
              2. Responsabilité et assurance
            </h2>
            <p>
              En droit belge, l&apos;entrepreneur qui réalise des travaux
              relevant du gros œuvre — dont l&apos;étanchéité de toiture —
              engage sa responsabilité décennale. La loi du 31 mai 2017 impose
              par ailleurs une obligation d&apos;assurance pour certains
              travaux immobiliers.
            </p>
            <p className="text-xs text-slate-400">
              Le détail de notre couverture — compagnie, numéro de police,
              activités et territoire couverts — vous est communiqué sur demande
              et figure dans les documents contractuels remis avant le démarrage
              des travaux. Aucune information d&apos;assurance n&apos;est
              publiée ici tant qu&apos;elle n&apos;a pas été vérifiée sur le
              contrat lui-même.
            </p>
          </section>

          <section className="space-y-2 border-t border-slate-800 pt-4">
            <h2 className="font-heading text-lg font-bold text-white">
              3. Hébergement
            </h2>
            <p className="text-xs text-slate-400">
              L&apos;identité de l&apos;hébergeur du site est en cours de
              confirmation et sera précisée ici. La mention précédente indiquait
              simultanément un hébergement « au sein de l&apos;Union
              européenne » et une adresse aux États-Unis, sans qu&apos;aucune
              des deux ne puisse être vérifiée.
            </p>
          </section>

          <section className="space-y-2 border-t border-slate-800 pt-4">
            <h2 className="font-heading text-lg font-bold text-white">
              4. Propriété intellectuelle
            </h2>
            <p>
              Les textes et éléments graphiques composant ce site sont protégés
              par le droit d&apos;auteur. Toute reproduction ou adaptation sans
              autorisation écrite préalable est interdite.
            </p>
          </section>

          <section className="space-y-2 border-t border-slate-800 pt-4">
            <h2 className="font-heading text-lg font-bold text-white">
              5. Données personnelles
            </h2>
            <p>
              Le traitement des données que vous nous transmettez est décrit
              dans notre{" "}
              <Link
                href="/politique-de-confidentialite"
                className="text-brand-terracotta underline"
              >
                politique de confidentialité
              </Link>
              .
            </p>
          </section>

          <section className="space-y-2 border-t border-slate-800 pt-4">
            <h2 className="font-heading text-lg font-bold text-white">
              6. Droit applicable
            </h2>
            <p>
              Le présent site est soumis au droit belge. En cas de litige avec
              un consommateur, une solution amiable est recherchée en priorité.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
