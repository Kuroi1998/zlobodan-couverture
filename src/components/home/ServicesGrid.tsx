import React from "react";
import Link from "next/link";
import { Home, Droplets, Sparkles, ShieldAlert, Flame, Sun, ArrowRight, CheckCircle2 } from "lucide-react";
import { servicesData, ServiceItem } from "@/data/servicesData";

export const ServicesGrid: React.FC = () => {
  const getServiceIcon = (iconName: string) => {
    switch (iconName) {
      case "Home":
        return <Home className="h-6 w-6 text-brand-terracotta" />;
      case "Droplets":
        return <Droplets className="h-6 w-6 text-blue-500" />;
      case "Sparkles":
        return <Sparkles className="h-6 w-6 text-amber-500" />;
      case "ShieldAlert":
        return <ShieldAlert className="h-6 w-6 text-emerald-500" />;
      case "Flame":
        return <Flame className="h-6 w-6 text-orange-500" />;
      case "Sun":
        return <Sun className="h-6 w-6 text-yellow-400" />;
      default:
        return <Home className="h-6 w-6 text-brand-terracotta" />;
    }
  };

  return (
    <section className="py-20 bg-brand-lightBg text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <span className="inline-block bg-orange-100 text-brand-terracotta text-xs font-extrabold uppercase tracking-widest px-3 py-1 rounded-full">
            Nos Domaines d'Expertise
          </span>
          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl text-slate-900 tracking-tight">
            Des prestations de couverture-zinguerie de haute précision
          </h2>
          <p className="text-base text-slate-600 leading-relaxed">
            Chaque ouvrage est réalisé selon les règles des DTU en vigueur, garanti 10 ans par notre assurance décennale et exécuté par nos propres artisans fidélisés.
          </p>
        </div>

        {/* 6 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {servicesData.map((svc: ServiceItem) => (
            <div
              key={svc.id}
              className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-premium hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1.5"
            >
              <div className="space-y-4">
                {/* Icon & Title Header */}
                <div className="flex items-center justify-between">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 group-hover:bg-orange-50 transition-colors">
                    {getServiceIcon(svc.icon)}
                  </div>
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md">
                    {svc.priceIndicative.range}
                  </span>
                </div>

                <h3 className="font-heading font-bold text-xl text-slate-900 group-hover:text-brand-terracotta transition-colors">
                  {svc.title}
                </h3>

                <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
                  {svc.shortDescription}
                </p>

                {/* Symptoms highlight list */}
                <div className="pt-2 border-t border-slate-100 space-y-2 text-xs text-slate-500">
                  <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Signes d'alerte :</p>
                  {svc.alertSymptoms.slice(0, 2).map((symptom, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-brand-terracotta shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{symptom}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Footer CTA Link */}
              <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
                <Link
                  href={`/devis?service=${svc.devisPreselectId}`}
                  className="text-xs font-bold text-brand-terracotta hover:underline"
                >
                  Devis pré-rempli →
                </Link>
                <Link
                  href={`/services/${svc.slug}`}
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-900 group-hover:text-brand-terracotta transition-colors"
                >
                  <span>En savoir plus</span>
                  <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
