import React from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { servicesData, ServiceItem } from "@/data/services";
import { realisationsData } from "@/data/realisations";
import { siteConfig } from "@/config/site";
import { FAQSection } from "@/components/home/FAQSection";
import { JsonLdSchema } from "@/components/seo/JsonLdSchema";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Euro,
  FileText,
  Phone,
  ArrowRight,
  Layers,
  Award,
} from "lucide-react";

export async function generateStaticParams() {
  return servicesData.map((s) => ({
    slug: s.slug,
  }));
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const service = servicesData.find((s) => s.slug === params.slug);
  if (!service) return {};

  return {
    title: `${service.title} à Nantes (44) | Zlobodan Couverture`,
    description: service.shortDescription,
    alternates: {
      canonical: `/services/${service.slug}`,
    },
  };
}

export default function ServiceDetailPage({ params }: { params: { slug: string } }) {
  const service = servicesData.find((s) => s.slug === params.slug);
  if (!service) notFound();

  // Related projects filtering
  const relatedProjects = realisationsData.filter((r) =>
    service.realisationIds.includes(r.id)
  );

  return (
    <>
      <JsonLdSchema
        type="Service"
        serviceTitle={service.title}
        serviceDescription={service.shortDescription}
        breadcrumbs={[
          { name: "Accueil", url: "/" },
          { name: "Services", url: "/services" },
          { name: service.title, url: `/services/${service.slug}` },
        ]}
      />

      <div className="bg-slate-950 text-white min-h-screen">
        
        {/* Breadcrumb */}
        <div className="bg-slate-900 border-b border-slate-800 py-3 text-xs text-slate-400">
          <div className="max-w-7xl mx-auto px-4 flex items-center gap-2">
            <Link href="/" className="hover:text-white">Accueil</Link>
            <span>/</span>
            <Link href="/services" className="hover:text-white">Services</Link>
            <span>/</span>
            <span className="text-brand-terracotta font-medium">{service.title}</span>
          </div>
        </div>

        {/* 1. Specific Service Hero */}
        <section className="relative py-16 md:py-24 bg-slate-900 border-b border-slate-800 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              
              <div className="lg:col-span-7 space-y-6">
                <span className="inline-block bg-brand-terracotta/20 border border-brand-terracotta/40 text-brand-terracotta text-xs font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full">
                  Prestation Couverture Qualifiée
                </span>
                <h1 className="font-heading font-extrabold text-3xl sm:text-5xl text-white tracking-tight">
                  {service.title} à Nantes &amp; Agglomération
                </h1>
                <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
                  {service.heroSubtitle}
                </p>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Link
                    href={`/devis?service=${service.devisPreselectId}`}
                    className="bg-brand-terracotta hover:bg-orange-600 text-white font-extrabold px-6 py-3.5 rounded-xl text-sm shadow-accent transition text-center flex items-center justify-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Devis Gratuit Pré-Rempli ({service.title})</span>
                  </Link>

                  <a
                    href={`tel:${siteConfig.phone}`}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-6 py-3.5 rounded-xl text-sm transition text-center flex items-center justify-center gap-2 border border-slate-700"
                  >
                    <Phone className="h-4 w-4 text-emerald-400" />
                    <span>{siteConfig.phoneFormatted}</span>
                  </a>
                </div>
              </div>

              <div className="lg:col-span-5 relative h-[320px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
                <Image
                  src={service.heroImage}
                  alt={service.title}
                  fill
                  className="object-cover"
                />
              </div>

            </div>
          </div>
        </section>

        {/* 2. Alert Symptoms Section */}
        <section className="py-16 bg-slate-950 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="space-y-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" />
                <span>Diagnostic Prévoyance</span>
              </span>
              <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-white">
                Les symptômes &amp; signes qui doivent vous alerter
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {service.alertSymptoms.map((symptom, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex items-start gap-3"
                >
                  <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{symptom}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3. Detailed Methodology Steps */}
        <section className="py-16 bg-slate-900 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="text-xs font-bold text-brand-terracotta uppercase tracking-widest">
                Rigueur Technique &amp; DTU
              </span>
              <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-white">
                Notre méthode de travail étape par étape
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {service.methodologySteps.map((step) => (
                <div
                  key={step.number}
                  className="bg-slate-950 border border-slate-800 p-6 rounded-2xl space-y-3 relative"
                >
                  <span className="font-heading font-extrabold text-2xl text-brand-terracotta">
                    Étape {step.number}
                  </span>
                  <h3 className="font-heading font-bold text-lg text-white">
                    {step.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. Materials, Brands & Pricing Indicative */}
        <section className="py-16 bg-slate-950 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              
              {/* Materials & Brands */}
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl space-y-6">
                <h3 className="font-heading font-extrabold text-xl text-white flex items-center gap-2">
                  <Layers className="h-5 w-5 text-brand-terracotta" />
                  <span>Matériaux &amp; Marques Utilisés</span>
                </h3>

                <div className="space-y-4">
                  {service.materialsAndBrands.map((cat, idx) => (
                    <div key={idx} className="space-y-2">
                      <h4 className="font-bold text-sm text-slate-200 uppercase tracking-wider text-xs">
                        {cat.category}
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-400">
                        {cat.items.map((item, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing Indicative */}
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl space-y-6">
                <h3 className="font-heading font-extrabold text-xl text-white flex items-center gap-2">
                  <Euro className="h-5 w-5 text-amber-400" />
                  <span>Fourchette de Prix Indicative</span>
                </h3>

                <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-2 text-center">
                  <span className="font-heading font-extrabold text-3xl sm:text-4xl text-brand-terracotta">
                    {service.priceIndicative.range}
                  </span>
                  <p className="text-xs text-slate-400">{service.priceIndicative.unit}</p>
                </div>

                <div className="space-y-2 text-xs text-slate-300">
                  <p className="font-bold text-white uppercase tracking-wider text-[11px]">
                    Facteurs faisant varier le prix :
                  </p>
                  <ul className="space-y-1.5 text-slate-400 list-disc list-inside">
                    {service.priceIndicative.factors.map((factor, fIdx) => (
                      <li key={fIdx}>{factor}</li>
                    ))}
                  </ul>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* 5. Service-specific FAQ */}
        <FAQSection customItems={service.faq} title={`FAQ Spécifique — ${service.title}`} />

        {/* 6. Bottom CTA */}
        <section className="py-16 bg-brand-terracotta text-white text-center">
          <div className="max-w-4xl mx-auto px-4 space-y-6">
            <h2 className="font-heading font-extrabold text-3xl text-white">
              Demandez votre devis pour : {service.title}
            </h2>
            <p className="text-sm text-orange-100 max-w-xl mx-auto">
              Chiffrage gratuit remis sous 48h par notre maître couvreur à Nantes.
            </p>
            <Link
              href={`/devis?service=${service.devisPreselectId}`}
              className="inline-block bg-slate-950 hover:bg-slate-900 text-white font-extrabold px-8 py-4 rounded-xl text-base shadow-2xl transition"
            >
              Obtenir mon Devis Gratuit →
            </Link>
          </div>
        </section>

      </div>
    </>
  );
}
