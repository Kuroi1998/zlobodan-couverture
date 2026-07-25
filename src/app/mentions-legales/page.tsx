import React from "react";
import Link from "next/link";
import { siteConfig } from "@/config/site";

export const metadata = {
  title: "Mentions Légales | Zlobodan Couverture-Zinguerie",
  description: "Mentions légales, éditeur du site, hébergement et données réglementaires de l'entreprise Zlobodan Couverture à Nantes.",
};

export default function MentionsLegalesPage() {
  return (
    <div className="py-16 bg-slate-950 text-white min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        <h1 className="font-heading font-extrabold text-3xl sm:text-4xl text-white">
          Mentions Légales
        </h1>

        <div className="space-y-6 text-sm text-slate-300 leading-relaxed bg-slate-900 border border-slate-800 p-8 rounded-3xl">
          
          <section className="space-y-2">
            <h2 className="font-heading font-bold text-lg text-white">1. Éditeur du site</h2>
            <p>
              Le présent site web est édité par la société <strong>{siteConfig.name}</strong>, Société par Actions Simplifiée (SAS) au capital de {siteConfig.capital}.
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li><strong>Siège social :</strong> {siteConfig.fullAddress}</li>
              <li><strong>SIRET :</strong> {siteConfig.siret}</li>
              <li><strong>RCS :</strong> {siteConfig.rcs}</li>
              <li><strong>Numéro de TVA Intracommunautaire :</strong> {siteConfig.tvaIntra}</li>
              <li><strong>Directeur de la publication :</strong> Direction Zlobodan Couverture</li>
              <li><strong>Email :</strong> {siteConfig.email}</li>
              <li><strong>Téléphone :</strong> {siteConfig.phoneFormatted}</li>
            </ul>
          </section>

          <section className="space-y-2 pt-4 border-t border-slate-800">
            <h2 className="font-heading font-bold text-lg text-white">2. Assurance Responsabilité Civile Professionnelle &amp; Décennale</h2>
            <p>
              La société {siteConfig.name} est couverte par un contrat d'assurance Responsabilité Civile Professionnelle et Garantie Décennale souscrit auprès de la compagnie <strong>{siteConfig.insuranceName}</strong> sous le numéro de police <strong>{siteConfig.insuranceNumber}</strong>, valable pour l'ensemble du territoire français.
            </p>
          </section>

          <section className="space-y-2 pt-4 border-t border-slate-800">
            <h2 className="font-heading font-bold text-lg text-white">3. Hébergement du site</h2>
            <p>
              Le site est hébergé sur des serveurs hautement sécurisés situés au sein de l'Union Européenne par Vercel Inc., 340 S Lemon Ave #4133 Walnut, CA 91789, USA.
            </p>
          </section>

          <section className="space-y-2 pt-4 border-t border-slate-800">
            <h2 className="font-heading font-bold text-lg text-white">4. Propriété intellectuelle</h2>
            <p>
              L'ensemble des éléments composant ce site (textes, graphismes, logos, images, vidéos, animations, icônes) est la propriété exclusive de {siteConfig.name}. Toute reproduction, représentation, modification ou adaptation sans autorisation écrite préalable est strictement interdite.
            </p>
          </section>

        </div>

      </div>
    </div>
  );
}
