import React from "react";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import ContactForm from "@/components/contact/ContactForm";

export const metadata = {
  title: "Contact & Localisation | Couvreur Zlobodan Belgique",
  description: "Contactez l'entreprise Zlobodan Couverture SRL à Bruxelles. Téléphone 02 345 67 89, email, adresse Avenue Louise 14 et horaires.",
};

export default function ContactPage() {
  return (
    <div className="py-12 bg-slate-950 text-white min-h-screen space-y-16">
      
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4 px-4">
        <span className="inline-block bg-slate-900 border border-slate-800 text-brand-terracotta text-xs font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full">
          Disponibilité &amp; Proximité Belgique
        </span>
        <h1 className="font-heading font-extrabold text-3xl sm:text-5xl text-white tracking-tight">
          Contactez Zlobodan Couverture SRL
        </h1>
        <p className="text-base text-slate-400">
          Un projet de toiture ou une fuite urgente à déclarer ? Nous sommes joignables 6j/7 et 24/7 en cas d'urgence.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Column: Direct Info & Map */}
          <div className="lg:col-span-5 space-y-8">
            
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-6">
              <h2 className="font-heading font-extrabold text-xl text-white">
                Coordonnées Directes Belgique
              </h2>

              <div className="space-y-4 text-sm text-slate-300">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-brand-terracotta">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-white">Adresse du siège social :</p>
                    <p className="text-xs text-slate-400">{siteConfig.fullAddress}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-white">Téléphone Standard :</p>
                    <a href={`tel:${siteConfig.phone}`} className="text-sm font-bold text-emerald-400 hover:underline">
                      {siteConfig.phoneFormatted}
                    </a>
                    <p className="text-[11px] text-slate-400 mt-0.5">Urgence 24/7 : {siteConfig.emergencyPhoneFormatted}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-amber-400">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-white">Adresse Email :</p>
                    <a href={`mailto:${siteConfig.email}`} className="text-xs text-slate-300 hover:underline">
                      {siteConfig.email}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-blue-400">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-white">Horaires d'ouverture :</p>
                    <p className="text-xs text-slate-400">{siteConfig.openingHours.days} : {siteConfig.openingHours.hours}</p>
                    <p className="text-xs text-brand-terracotta font-semibold mt-0.5">{siteConfig.openingHours.emergency}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* BCE Box */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-xs text-slate-400 space-y-1">
              <p><strong className="text-white">N° BCE / TVA :</strong> {siteConfig.siret}</p>
              <p><strong className="text-white">Assurance Décennale :</strong> {siteConfig.insuranceName} (n° {siteConfig.insuranceNumber})</p>
            </div>

          </div>

          {/* Right Column: Contact Form */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 p-8 sm:p-10 rounded-3xl space-y-6">
            <div>
              <h2 className="font-heading font-extrabold text-2xl text-white">
                Envoyez-nous un message direct
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Pour une demande de devis détaillée avec pièces jointes, privilégiez notre <Link href="/devis" className="text-brand-terracotta underline">Formulaire de Devis Wizard en 5 étapes</Link>.
              </p>
            </div>

            <ContactForm />
          </div>

        </div>
      </div>
    </div>
  );
}
