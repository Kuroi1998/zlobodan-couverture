"use client";

import React from "react";
import Link from "next/link";
import { Phone, FileText } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

export const MobileCallBar: React.FC = () => {
  const handleContact = () => {
    trackEvent("click_contact_mobile_bar", {
      event_category: "Conversion",
      event_label: "mobile_bar",
    });
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-2.5 shadow-2xl">
      <div className="grid grid-cols-2 gap-2.5 max-w-md mx-auto">
        <Link
          href="/contact"
          onClick={handleContact}
          className="flex items-center justify-center gap-2 rounded-lg bg-brand-terracotta px-3 py-3 text-sm font-bold text-white shadow-lg transition-transform active:scale-95 active:bg-orange-700"
        >
          <Phone className="h-4 w-4" />
          <span>Nous contacter</span>
        </Link>

        <Link
          href="/devis"
          className="flex items-center justify-center gap-2 bg-slate-800 border border-slate-700 active:bg-slate-700 text-white py-3 px-3 rounded-lg text-sm font-bold shadow-md transition-transform active:scale-95"
        >
          <FileText className="h-4 w-4 text-amber-400" />
          <span>Demander un devis</span>
        </Link>
      </div>
    </div>
  );
};
