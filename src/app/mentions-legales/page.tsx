import React from "react";
import Link from "next/link";
import { siteData } from "@/data/siteData";

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
              Le présent site web est édité par la société <strong>{siteData.name}</strong>, Société par Actions Simplifiée (SAS) au capital de {siteData.capital}.
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li><strong>Siège social :</strong> {siteData.fullAddress}</li>
              <li><strong>SIRET :</strong> {siteData.siret}</li>
              <li><strong>RCS :</strong> {siteData.rcs}</li>
              <li><strong>Numéro de TVA Intracommunautaire :</strong> {siteData.tvaIntra}</li>
              <li><strong>Directeur de la publication :</strong> Direction Zlobodan Couverture</li>
              <li><strong>Email :</strong> {siteData.email}</li>
              <li><strong>Téléphone :</strong> {siteData.phoneFormatted}</li>
            </ul>
          </section>

          <section className="space-y-2 pt-4 border-t border-slate-800">
            <h2 className="font-heading font-bold text-lg text-white">2. Assurance Responsabilité Civile Professionnelle &amp; Décennale</h2>
            <p>
              La société {siteData.name} est couverte par un contrat d'assurance Responsabilité Civile Professionnelle et Garantie Décennale souscrit auprès de la compagnie <strong>{siteData.insuranceName}</strong> sous le numéro de police <strong>{siteData.insuranceNumber}</strong>, valable pour l'ensemble du territoire français.
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
              L'ensemble des éléments composant ce site (textes, graphismes, logos, images, vidéos, animations, icônes) est la propriété exclusive de {siteData.name}. Toute reproduction, représentation, modification ou adaptation sans autorisation écrite préalable est strictement interdite.
            </p>
          </section>

        </div>

      </div>
    </div>
  );
}
