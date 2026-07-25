"use client";

import React from "react";
import Link from "next/link";
import { Phone, FileText } from "lucide-react";
import { siteData } from "@/data/siteData";

export const MobileCallBar: React.FC = () => {
  const handleCall = () => {
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "click_phone_mobile_bar", {
        event_category: "Conversion",
        event_label: siteData.emergencyPhoneFormatted,
      });
    }
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 p-2.5 shadow-2xl">
      <div className="grid grid-cols-2 gap-2.5 max-w-md mx-auto">
        <a
          href={`tel:${siteData.emergencyPhone}`}
          onClick={handleCall}
          className="flex items-center justify-center gap-2 bg-brand-terracotta active:bg-orange-700 text-white py-3 px-3 rounded-lg text-sm font-bold shadow-lg transition-transform active:scale-95"
        >
          <Phone className="h-4 w-4 animate-bounce" />
          <span>Appeler 24/7</span>
        </a>

        <Link
          href="/devis"
          className="flex items-center justify-center gap-2 bg-slate-800 border border-slate-700 active:bg-slate-700 text-white py-3 px-3 rounded-lg text-sm font-bold shadow-md transition-transform active:scale-95"
        >
          <FileText className="h-4 w-4 text-amber-400" />
          <span>Devis Gratuit</span>
        </Link>
      </div>
    </div>
  );
};
