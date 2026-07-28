import React from "react";
import { ShieldCheck, Award, FileText, CheckCircle2, Zap } from "lucide-react";
import { siteConfig } from "@/config/site";

export const ReassuranceBar: React.FC = () => {
  const getIcon = (name: string) => {
    switch (name) {
      case "ShieldCheck":
        return <ShieldCheck className="h-6 w-6 text-brand-terracotta" />;
      case "Award":
        return <Award className="h-6 w-6 text-amber-500" />;
      case "FileText":
        return <FileText className="h-6 w-6 text-blue-500" />;
      case "CheckCircle2":
        return <CheckCircle2 className="h-6 w-6 text-emerald-500" />;
      case "Zap":
        return <Zap className="h-6 w-6 text-yellow-500" />;
      default:
        return <ShieldCheck className="h-6 w-6 text-brand-terracotta" />;
    }
  };

  return (
    <section className="bg-slate-900 border-y border-slate-800 py-6 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {siteConfig.reassuranceBadges.map((badge) => (
            <div
              key={badge.id}
              className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl flex items-center gap-3 hover:border-slate-700 transition"
            >
              <div className="shrink-0 bg-slate-900 p-2.5 rounded-lg">
                {getIcon(badge.iconName)}
              </div>
              <div className="space-y-0.5">
                <h3 className="font-heading font-bold text-xs sm:text-sm text-white leading-tight">
                  {badge.title}
                </h3>
                <p className="text-[11px] text-slate-400 leading-tight line-clamp-2">
                  {badge.subtitle}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
