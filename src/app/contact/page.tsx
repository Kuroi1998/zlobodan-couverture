import Link from "next/link";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { siteConfig } from "@/config/site";
import { companyIdentity, publishableContactPoints } from "@/config/company";
import ContactForm from "@/components/contact/ContactForm";

export const metadata = {
  title: "Contact | Zlobodan Couverture-Zinguerie",
  // L'ancienne description reproduisait un numéro de téléphone et une adresse
  // qui n'ont jamais été vérifiés. Une métadonnée est indexée puis citée par
  // les moteurs : elle propage une coordonnée fausse bien au-delà du site.
  description:
    "Contactez Zlobodan Couverture-Zinguerie pour un projet de toiture à Bruxelles ou en Brabant wallon. Formulaire de contact et demande de devis détaillée.",
};

/** Icône associée à chaque type de coordonnée publiable. */
const CONTACT_ICONS = { Téléphone: Phone, Courriel: Mail, Adresse: MapPin } as const;

export default function ContactPage() {
  const contactPoints = publishableContactPoints();

  return (
    <div className="py-12 bg-slate-950 text-white min-h-screen space-y-16">

      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4 px-4">
        <span className="inline-block bg-slate-900 border border-slate-800 text-brand-terracotta text-xs font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full">
          Nous écrire
        </span>
        <h1 className="font-heading font-extrabold text-3xl sm:text-5xl text-white tracking-tight">
          Contactez {companyIdentity.tradeName}
        </h1>
        <p className="text-base text-slate-400">
          Un projet de toiture ou une infiltration à signaler ? Décrivez-nous la
          situation : les demandes urgentes sont traitées en priorité, selon nos
          disponibilités.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

          {/* Left Column: Direct Info */}
          <div className="lg:col-span-5 space-y-8">

            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-6">
              <h2 className="font-heading font-extrabold text-xl text-white">
                Nos coordonnées
              </h2>

              <div className="space-y-4 text-sm text-slate-300">
                {/*
                  Les coordonnées affichées sont celles que `config/company.ts`
                  déclare vérifiées. Tant qu'aucune ne l'est, le formulaire
                  reste le canal de contact — il fonctionne réellement, là où un
                  numéro hérité d'un modèle ne menait nulle part.
                */}
                {contactPoints.map((point) => {
                  const Icon = CONTACT_ICONS[point.label as keyof typeof CONTACT_ICONS] ?? MapPin;
                  return (
                    <div key={point.label} className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-brand-terracotta">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold text-white">{point.label}</p>
                        {point.href ? (
                          <a href={point.href} className="text-sm text-brand-terracotta hover:underline">
                            {point.value}
                          </a>
                        ) : (
                          <p className="text-xs text-slate-400">{point.value}</p>
                        )}
                      </div>
                    </div>
                  );
                })}

                {contactPoints.length === 0 && (
                  <p className="text-xs text-slate-400">
                    Le formulaire ci-contre est actuellement le moyen le plus sûr
                    de nous joindre. Nous vous répondons à l'adresse que vous
                    indiquez.
                  </p>
                )}

                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-blue-400">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-white">Horaires</p>
                    <p className="text-xs text-slate-400">
                      {siteConfig.openingHours.days} : {siteConfig.openingHours.hours}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {siteConfig.openingHours.emergency}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-xs text-slate-400">
              <p>
                Zone d'intervention : {siteConfig.region}.
              </p>
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
