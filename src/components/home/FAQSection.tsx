"use client";

import React, { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { faqData, FAQItem } from "@/data/faq";

interface FAQSectionProps {
  customItems?: Array<{ question: string; answer: string; category?: string }>;
  title?: string;
  subtitle?: string;
}

export const FAQSection: React.FC<FAQSectionProps> = ({
  customItems,
  title = "Foire Aux Questions — Toiture & Rénovation",
  subtitle = "Des réponses claires et concrètes à toutes vos questions avant de démarrer votre chantier.",
}) => {
  const items = customItems || faqData;
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleItem = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section className="py-20 bg-brand-lightBg text-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-orange-100 text-brand-terracotta text-xs font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full">
            <HelpCircle className="h-4 w-4" />
            <span>Réponses des Experts</span>
          </div>
          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl text-slate-900 tracking-tight">
            {title}
          </h2>
          <p className="text-base text-slate-600">
            {subtitle}
          </p>
        </div>

        {/* Accordion Items */}
        <div className="space-y-4">
          {items.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() => toggleItem(idx)}
                  aria-expanded={isOpen}
                  className="w-full text-left p-6 flex items-center justify-between gap-4 font-heading font-bold text-lg text-slate-900 hover:text-brand-terracotta transition-colors focus:outline-none"
                >
                  <span>{item.question}</span>
                  <div
                    className={`p-2 rounded-full bg-slate-100 text-slate-500 transition-transform duration-200 shrink-0 ${
                      isOpen ? "rotate-180 bg-orange-100 text-brand-terracotta" : ""
                    }`}
                  >
                    <ChevronDown className="h-5 w-5" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 pt-0 text-sm text-slate-600 leading-relaxed border-t border-slate-100/60 animate-in fade-in duration-200">
                    <p className="pt-3">{item.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
