import React from "react";
import Link from "next/link";
import { siteData } from "@/data/siteData";

export const metadata = {
  title: "Politique de Confidentialité & RGPD | Zlobodan Couverture",
  description: "Engagement de protection des données personnelles et règles RGPD du site Zlobodan Couverture.",
};

export default function PolitiqueConfidentialitePage() {
  return (
    <div className="py-16 bg-slate-950 text-white min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        <h1 className="font-heading font-extrabold text-3xl sm:text-4xl text-white">
          Politique de Confidentialité &amp; RGPD
        </h1>

        <div className="space-y-6 text-sm text-slate-300 leading-relaxed bg-slate-900 border border-slate-800 p-8 rounded-3xl">
          
          <section className="space-y-2">
            <h2 className="font-heading font-bold text-lg text-white">1. Collecte des Données Personnelles</h2>
            <p>
              Dans le cadre de l'utilisation du site et de notre formulaire de devis, la société <strong>{siteData.name}</strong> est amenée à collecter des données personnelles (Nom, Prénom, Téléphone, Adresse email, Code postal, Ville, Photos du chantier).
            </p>
          </section>

          <section className="space-y-2 pt-4 border-t border-slate-800">
            <h2 className="font-heading font-bold text-lg text-white">2. Finalité du Traitement</h2>
            <p>
              Ces données sont collectées aux fins exclusives de :
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>L'établissement et l'envoi de votre devis gratuit de toiture.</li>
              <li>La prise de contact téléphonique pour organiser une visite de diagnostic.</li>
              <li>La gestion de la relation client et du suivi de chantier.</li>
            </ul>
            <p>Vos données ne sont **jamais vendues, louées ni cédées** à des tiers commerciaux.</p>
          </section>

          <section className="space-y-2 pt-4 border-t border-slate-800">
            <h2 className="font-heading font-bold text-lg text-white">3. Durée de conservation &amp; Droits Informatique et Libertés</h2>
            <p>
              Les données sont conservées pendant une durée maximale de 3 ans après le dernier contact commercial. Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez d'un droit d'accès, de rectification, de suppression et d'opposition.
            </p>
            <p>
              Pour exercer ces droits, vous pouvez nous adresser un email à <strong>{siteData.email}</strong> ou un courrier à l'adresse <strong>{siteData.address}, {siteData.postalCode} {siteData.city}</strong>.
            </p>
          </section>

        </div>

      </div>
    </div>
  );
}
