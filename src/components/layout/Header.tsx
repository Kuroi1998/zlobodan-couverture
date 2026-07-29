"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Phone, ShieldCheck, Menu, X, FileText, AlertTriangle, Clock, User } from "lucide-react";
import { siteConfig } from "@/config/site";
import { trackEvent } from "@/lib/analytics";

export const Header: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleContactClick = () => {
    // L'étiquette d'événement reprenait le numéro affiché. Elle nomme
    // désormais l'emplacement du clic, ce qui est à la fois plus stable et
    // moins bavard en analytique.
    trackEvent("click_contact_header", {
      event_category: "Conversion",
      event_label: "header",
    });
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-brand-slate text-white shadow-lg">
      {/* Top Banner - Emergency Alert */}
      {siteConfig.isEmergencyBannerActive && (
        <div className="bg-brand-terracotta px-4 py-2 text-xs md:text-sm font-semibold text-white transition-all">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
              <AlertTriangle className="h-4 w-4 shrink-0 animate-pulse text-yellow-300" />
              <span>{siteConfig.emergencyBannerMessage}</span>
            </div>
            <Link
              href="/devis"
              onClick={handleContactClick}
              className="flex shrink-0 items-center gap-1 rounded bg-white px-2.5 py-1 text-xs font-bold text-brand-terracotta shadow transition hover:bg-slate-100"
            >
              <Phone className="h-3 w-3" />
              <span>Nous contacter</span>
            </Link>
          </div>
        </div>
      )}

      {/* Top Bar Info (Desktop) */}
      <div className="hidden lg:block border-b border-slate-800 bg-slate-950 text-slate-300 text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* La bande annonçait un assureur nommé et un numéro de police
                inventés. La responsabilité décennale, elle, est une obligation
                légale : l'énoncer sans citer d'assureur reste exact. */}
            <span className="flex items-center gap-1.5 font-medium text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
              Responsabilité décennale (droit belge)
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              {siteConfig.openingHours.days} : {siteConfig.openingHours.hours}
            </span>
          </div>
          <div className="flex items-center gap-4">
            {/* Le numéro BCE et la note « 4.9/5 (124+ avis Google) » ont été
                retirés : le premier n'était pas vérifié, la seconde ne
                provenait d'aucun profil et n'était reliée à aucune source
                pouvant la mettre à jour. */}
            <Link href="/connexion" className="text-white hover:text-brand-terracotta font-bold flex items-center gap-1">
              <User className="h-3.5 w-3.5 text-brand-terracotta" />
              <span>Espace Client / Admin</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Header Nav */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="bg-brand-terracotta p-2.5 rounded-lg text-white shadow-accent group-hover:scale-105 transition-transform">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div className="flex flex-col">
            <span className="font-heading font-extrabold text-xl md:text-2xl tracking-tight text-white group-hover:text-brand-terracotta transition-colors">
              ZLOBODAN
            </span>
            <span className="text-xs uppercase tracking-widest text-slate-400 font-medium">
              Couverture • Belgique
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
          <Link href="/" className="hover:text-brand-terracotta transition-colors py-2">
            Accueil
          </Link>
          <Link href="/services" className="hover:text-brand-terracotta transition-colors py-2">
            Services
          </Link>
          <Link href="/couvreur-bruxelles" className="hover:text-brand-terracotta transition-colors py-2">
            Zone &amp; Villes
          </Link>
          <Link href="/a-propos" className="hover:text-brand-terracotta transition-colors py-2">
            À Propos
          </Link>
          <Link href="/contact" className="hover:text-brand-terracotta transition-colors py-2">
            Contact
          </Link>
        </nav>

        {/* CTA Phone & Devis & Connexion */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            href="/contact"
            onClick={handleContactClick}
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-sm font-semibold text-white transition hover:border-slate-500"
          >
            <Phone className="h-4 w-4 text-emerald-400" />
            <div className="flex flex-col text-left leading-tight">
              <span className="text-[10px] font-normal uppercase text-slate-400">Nous joindre</span>
              <span>Contact</span>
            </div>
          </Link>

          <Link
            href="/devis"
            className="flex items-center gap-2 bg-brand-terracotta hover:bg-orange-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold shadow-accent transition hover:-translate-y-0.5"
          >
            <FileText className="h-4 w-4" />
            <span>Devis Gratuit</span>
          </Link>

          <Link
            href="/connexion"
            className="flex items-center gap-1.5 border border-slate-700 hover:border-slate-500 bg-slate-900 text-slate-200 hover:text-white px-3 py-2.5 rounded-lg text-xs font-bold transition"
            title="Connexion Espace Client"
          >
            <User className="h-4 w-4 text-brand-terracotta" />
            <span className="hidden xl:inline">Espace Client</span>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-controls="mobile-navigation"
          aria-expanded={isMobileMenuOpen}
          aria-label={
            isMobileMenuOpen
              ? "Fermer le menu de navigation"
              : "Ouvrir le menu de navigation"
          }
          className="lg:hidden inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800 transition"
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Drawer Navigation */}
      {isMobileMenuOpen && (
        <div
          id="mobile-navigation"
          className="lg:hidden border-t border-slate-800 bg-brand-slate px-4 pt-4 pb-6 space-y-4"
        >
          <nav className="flex flex-col space-y-3 font-medium text-base">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md hover:bg-slate-800"
            >
              Accueil
            </Link>
            <Link
              href="/services"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md hover:bg-slate-800"
            >
              Nos Services de Couverture
            </Link>
            <Link
              href="/couvreur-bruxelles"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md hover:bg-slate-800"
            >
              Zone d'Intervention (Bruxelles &amp; Wallonie)
            </Link>
            <Link
              href="/connexion"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-3 py-2 rounded-md hover:bg-slate-800 text-brand-terracotta font-bold flex items-center gap-2"
            >
              <User className="h-4 w-4" />
              <span>Espace Client / Admin</span>
            </Link>
          </nav>

          <div className="pt-2 border-t border-slate-800 flex flex-col gap-3">
            <Link
              href="/contact"
              onClick={() => {
                handleContactClick();
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center justify-center gap-2 rounded-lg bg-slate-800 py-3 font-bold text-white"
            >
              <Phone className="h-5 w-5 text-emerald-400" />
              Nous contacter
            </Link>
            <Link
              href="/devis"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 bg-brand-terracotta text-white py-3 rounded-lg font-bold shadow-accent"
            >
              <FileText className="h-5 w-5" />
              Demander un Devis Gratuit
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
