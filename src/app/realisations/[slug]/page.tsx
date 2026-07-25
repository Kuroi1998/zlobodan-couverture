import React from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { realisationsData, RealisationItem } from "@/data/realisations";
import { siteConfig } from "@/config/site";
import { BeforeAfterSlider } from "@/components/realisations/BeforeAfterSlider";
import { MapPin, Clock, CheckCircle2, Star, Phone, FileText } from "lucide-react";

type PageProps = Readonly<{
  params: Readonly<{
    slug: string;
  }>;
}>;

export async function generateStaticParams() {
  return realisationsData.map((r) => ({
    slug: r.slug,
  }));
}

export async function generateMetadata({ params }: PageProps) {
  const item = realisationsData.find((r) => r.slug === params.slug);
  if (!item) return {};

  return {
    title: `${item.title} à ${item.city} | Zlobodan Couverture`,
    description: item.initialProblem,
    alternates: {
      canonical: `/realisations/${item.slug}`,
    },
  };
}

export default function RealisationDetailPage({ params }: PageProps) {
  const project = realisationsData.find((r) => r.slug === params.slug);
  if (!project) notFound();

  return (
    <div className="py-12 bg-slate-950 text-white min-h-screen space-y-12">
      
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Link href="/" className="hover:text-white">Accueil</Link>
          <span>/</span>
          <Link href="/realisations" className="hover:text-white">Réalisations</Link>
          <span>/</span>
          <span className="text-brand-terracotta font-medium">{project.title}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Title Header */}
        <div className="space-y-4 max-w-4xl">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="bg-brand-terracotta/20 border border-brand-terracotta/40 text-brand-terracotta font-extrabold px-3 py-1 rounded-full uppercase">
              {project.category}
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <MapPin className="h-3.5 w-3.5 text-brand-terracotta" />
              {project.city} ({project.postalCode})
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              Durée : {project.durationDays} jours
            </span>
          </div>

          <h1 className="font-heading font-extrabold text-3xl sm:text-5xl text-white tracking-tight">
            {project.title}
          </h1>
        </div>

        {/* Before / After Slider */}
        <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-3xl">
          <BeforeAfterSlider
            beforeImage={project.beforeImage}
            afterImage={project.afterImage}
            title={`Comparatif Avant / Après — ${project.city}`}
          />
        </div>

        {/* Technical Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-8 space-y-8">
            
            {/* Initial Problem */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-2">
              <h3 className="font-heading font-bold text-lg text-amber-400">
                1. État initial &amp; Problématique du client
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                {project.initialProblem}
              </p>
            </div>

            {/* Solution Applied */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-2">
              <h3 className="font-heading font-bold text-lg text-emerald-400">
                2. Solution technique apportée par nos couvreurs
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                {project.solutionApplied}
              </p>
            </div>

            {/* Materials Used */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
              <h3 className="font-heading font-bold text-lg text-white">
                3. Matériaux et équipements mis en œuvre
              </h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                {project.materialsUsed.map((mat, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-brand-terracotta shrink-0" />
                    <span>{mat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Review if available */}
            {project.clientReview && (
              <div className="bg-slate-900 border border-amber-500/30 p-6 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-heading font-bold text-base text-white">
                    Avis du propriétaire ({project.clientReview.author})
                  </h4>
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(project.clientReview.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>
                <blockquote className="text-sm text-slate-200 italic font-serif leading-relaxed">
                  "{project.clientReview.text}"
                </blockquote>
              </div>
            )}

          </div>

          {/* Sidebar CTA */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6 sticky top-28">
              <h3 className="font-heading font-bold text-lg text-white">
                Un projet similaire sur votre maison ?
              </h3>
              <p className="text-xs text-slate-400">
                Nos couvreurs se déplacent gratuitement à {project.city} et sur toute la Loire-Atlantique pour votre chiffrage.
              </p>

              <div className="space-y-3 pt-2">
                <Link
                  href="/devis"
                  className="w-full bg-brand-terracotta hover:bg-orange-600 text-white font-bold py-3.5 px-4 rounded-xl text-xs shadow-accent transition flex items-center justify-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  <span>Demander un Devis Gratuit</span>
                </Link>

                <a
                  href={`tel:${siteConfig.phone}`}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 border border-slate-700"
                >
                  <Phone className="h-4 w-4 text-emerald-400" />
                  <span>Appeler le {siteConfig.phoneFormatted}</span>
                </a>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
