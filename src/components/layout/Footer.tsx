import React from "react";
import Link from "next/link";
import { ShieldCheck, MapPin, Mail, Clock, ExternalLink, Award } from "lucide-react";
import { siteConfig } from "@/config/site";
import { publishableContactPoints } from "@/config/company";
import { servicesData } from "@/data/services";
import { villesData } from "@/data/villes";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 text-slate-300 pt-16 pb-24 md:pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
          
          {/* Col 1: Entreprise & Garanties */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-brand-terracotta p-2 rounded-lg text-white">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <span className="font-heading font-extrabold text-xl text-white tracking-tight">
                {siteConfig.name}
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Entreprise de couverture, zinguerie, démoussage et isolation de
              toiture, active à Bruxelles et en Brabant wallon.
            </p>
            <div className="pt-2 space-y-2 text-xs text-slate-400">
              <p className="flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-400 shrink-0" />
                <span>Assurance Décennale Belge (Loi du 31 mai 2017)</span>
              </p>
              <p className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-brand-terracotta shrink-0" />
                <span>Entrepreneur Agréé Belgique (Primes Renolution &amp; Wallonie)</span>
              </p>
            </div>
          </div>

          {/* Col 2: Services */}
          <div className="space-y-4">
            <h2 className="font-heading font-bold text-lg text-white tracking-wide border-b border-slate-800 pb-2">
              Nos Prestations
            </h2>
            <ul className="space-y-2.5 text-sm">
              {servicesData.map((svc) => (
                <li key={svc.id}>
                  <Link
                    href={`/services/${svc.slug}`}
                    className="hover:text-brand-terracotta transition-colors flex items-center gap-2 text-slate-300"
                  >
                    <span className="text-brand-terracotta">›</span>
                    <span>{svc.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Zone d'Intervention SEO (Dynamic Belgian Cities) */}
          <div className="space-y-4">
            <h2 className="font-heading font-bold text-lg text-white tracking-wide border-b border-slate-800 pb-2">
              Zone d'intervention
            </h2>
            <ul className="grid grid-cols-2 gap-2 text-sm">
              {Object.values(villesData).slice(0, 6).map((v) => (
                <li key={v.slug}>
                  <Link href={`/${v.slug}`} className="hover:text-brand-terracotta transition-colors">
                    Couvreur {v.name}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="pt-2">
              <a
                href="https://maps.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:underline"
              >
                <span>Fiche Google Business Profile</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Col 4: Contact & Horaires */}
          <div className="space-y-4">
            <h2 className="font-heading font-bold text-lg text-white tracking-wide border-b border-slate-800 pb-2">
              Contact &amp; Dépannage Belgique
            </h2>
            <div className="space-y-3 text-sm">
              {/* Adresse, téléphone et courriel ne s'affichent que s'ils sont
                  déclarés vérifiés dans `config/company.ts`. Le pied de page
                  reproduisait des coordonnées héritées d'un modèle. */}
              {publishableContactPoints().map((point) => (
                <p key={point.label} className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-terracotta" />
                  {point.href ? (
                    <a href={point.href} className="font-bold text-white hover:underline">
                      {point.value}
                    </a>
                  ) : (
                    <span>{point.value}</span>
                  )}
                </p>
              ))}
              <p className="flex items-start gap-2.5">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                <Link href="/contact" className="text-slate-300 hover:underline">
                  Nous écrire via le formulaire
                </Link>
              </p>
              <div className="pt-2 border-t border-slate-900 text-xs space-y-1">
                <p className="flex items-center gap-1.5 text-slate-400">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span>{siteConfig.openingHours.days}</span>
                </p>
                <p className="text-white font-medium pl-5">{siteConfig.openingHours.hours}</p>
                <p className="text-brand-terracotta font-semibold pl-5 text-[11px]">
                  {siteConfig.openingHours.emergency}
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Legal & Copyright */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} {siteConfig.name}. Tous droits réservés.</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/mentions-legales" className="hover:text-slate-300 transition-colors">
              Mentions Légales
            </Link>
            <span>•</span>
            <Link href="/politique-de-confidentialite" className="hover:text-slate-300 transition-colors">
              Politique de Confidentialité
            </Link>
            <span>•</span>
            <Link href="/contact" className="hover:text-slate-300 transition-colors">
              Plan du site &amp; Accessibilité
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
