import Link from "next/link";
import { notFound } from "next/navigation";
import { servicesData } from "@/data/services";
import { FAQSection } from "@/components/home/FAQSection";
import { JsonLdSchema } from "@/components/seo/JsonLdSchema";
import {
  AlertTriangle,
  CheckCircle2,
  Euro,
  FileText,
  Layers,
} from "lucide-react";
import ContactActionButton from "@/components/ui/ContactActionButton";

export async function generateStaticParams() {
  return servicesData.map((s) => ({
    slug: s.slug,
  }));
}

export async function generateMetadata({ params }: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  const service = servicesData.find((s) => s.slug === slug);
  if (!service) return {};

  return {
    title: `${service.title} à Bruxelles et en Brabant wallon | Zlobodan Couverture`,
    description: service.shortDescription,
    alternates: {
      canonical: `/services/${service.slug}`,
    },
  };
}

export default async function ServiceDetailPage({ params }: Readonly<{ params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  const service = servicesData.find((s) => s.slug === slug);
  if (!service) notFound();

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

      <article className="min-h-screen bg-slate-950 text-white py-12">
        {/* 1. Service Hero Header */}
        <section className="border-b border-slate-800 pb-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            
            {/* Breadcrumb Navigation */}
            <nav aria-label="Fil d'Ariane" className="text-xs text-slate-400 flex items-center gap-2">
              <Link href="/" className="hover:text-white transition-colors">
                Accueil
              </Link>
              <span>/</span>
              <Link href="/services" className="hover:text-white transition-colors">
                Services
              </Link>
              <span>/</span>
              <span className="text-white font-medium">{service.title}</span>
            </nav>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <span className="inline-block bg-brand-terracotta/20 text-brand-terracotta text-xs font-extrabold uppercase tracking-widest px-3 py-1 rounded-full border border-brand-terracotta/30">
                  Intervention à Bruxelles et en Brabant wallon
                </span>
                <h1 className="font-heading font-extrabold text-3xl sm:text-5xl text-white tracking-tight leading-tight">
                  {service.title}
                </h1>
                <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
                  {service.heroSubtitle}
                </p>

                <div className="flex flex-wrap gap-4 pt-4">
                  <Link
                    href={`/devis?service=${service.devisPreselectId}`}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-terracotta hover:bg-brand-terracotta/90 text-white font-bold text-sm transition-colors shadow-lg"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Demander un devis</span>
                  </Link>
                  <ContactActionButton className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 font-bold text-sm transition-colors" />
                </div>
              </div>

              {/*
                Le visuel de service a été retiré : les fichiers présents dans
                le dépôt pesaient un à deux kilo-octets — des substituts, pas
                des photographies — et leur origine n'était pas documentée. Un
                bloc typographique vaut mieux qu'une image dont on ne peut pas
                justifier les droits.
              */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
                <p className="text-xs font-bold uppercase tracking-wider text-brand-terracotta">
                  Prestation
                </p>
                <p className="mt-2 font-heading text-2xl font-extrabold text-white">
                  {service.title}
                </p>
                <p className="mt-3 text-sm text-slate-400">{service.heroSubtitle}</p>
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
              {service.alertSymptoms.map((symptom) => (
                <div
                  key={symptom}
                  className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex items-start gap-3"
                >
                  <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{symptom}</p>
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
                  {service.materialsAndBrands.map((cat) => (
                    <div key={cat.category} className="space-y-2">
                      <h4 className="font-bold text-sm text-slate-200 uppercase tracking-wider text-xs">
                        {cat.category}
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-400">
                        {cat.items.map((item) => (
                          <li key={item} className="flex items-center gap-2">
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

                <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950 p-6 text-center">
                  <p className="font-heading text-xl font-extrabold text-brand-terracotta">
                    Tarif établi après analyse de votre demande
                  </p>
                  <p className="text-xs text-slate-400">
                    Chaque toiture est différente. Nous chiffrons poste par poste
                    après avoir pris connaissance de votre situation.
                  </p>
                </div>

                <div className="space-y-2 text-xs text-slate-300">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-white">
                    Ce qui fait varier le prix :
                  </p>
                  <ul className="list-inside list-disc space-y-1.5 text-slate-400">
                    {service.priceFactors.map((factor) => (
                      <li key={factor}>{factor}</li>
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
              Décrivez-nous votre projet : nous revenons vers vous avec un
              chiffrage détaillé après analyse de votre demande.
            </p>
            <Link
              href={`/devis?service=${service.devisPreselectId}`}
              className="inline-block bg-slate-950 hover:bg-slate-900 text-white font-extrabold px-8 py-4 rounded-xl text-base shadow-2xl transition"
            >
              Demander un devis →
            </Link>
          </div>
        </section>

      </article>
    </>
  );
}
