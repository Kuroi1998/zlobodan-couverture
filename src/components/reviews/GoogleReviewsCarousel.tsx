"use client";

import React, { useState } from "react";
import { Star, ChevronLeft, ChevronRight, CheckCircle, ExternalLink } from "lucide-react";
import { reviewsData, ReviewItem } from "@/data/reviews";

export const GoogleReviewsCarousel: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const prevReview = () => {
    setCurrentIndex((prev) => (prev === 0 ? reviewsData.length - 1 : prev - 1));
  };

  const nextReview = () => {
    setCurrentIndex((prev) => (prev === reviewsData.length - 1 ? 0 : prev + 1));
  };

  const currentRev: ReviewItem = reviewsData[currentIndex];

  return (
    <section className="py-20 bg-slate-900 text-white border-y border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Google Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-12 border-b border-slate-800">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-xs font-semibold">
              {/* Google G Logo simulation */}
              <span className="font-extrabold text-blue-400">G</span>
              <span className="font-extrabold text-red-400">o</span>
              <span className="font-extrabold text-yellow-400">o</span>
              <span className="font-extrabold text-blue-400">g</span>
              <span className="font-extrabold text-green-400">l</span>
              <span className="font-extrabold text-red-400">e</span>
              <span className="text-slate-300 ml-1">My Business</span>
            </div>
            <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-white tracking-tight">
              Avis Clients Vérifiés (4.9 / 5 Stars)
            </h2>
          </div>

          {/* Rating Badge & Google Link */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="flex items-center justify-end gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Basé sur 124+ avis certifiés</p>
            </div>

            <a
              href="https://maps.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow"
            >
              <span>Voir sur Google</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {/* Carousel Card */}
        <div className="pt-12 max-w-4xl mx-auto">
          <div className="relative bg-slate-950 border border-slate-800 p-8 md:p-12 rounded-3xl shadow-2xl space-y-6">
            
            {/* Navigation buttons */}
            <div className="absolute top-6 right-6 flex items-center gap-2">
              <button
                onClick={prevReview}
                aria-label="Avis précédent"
                className="p-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 transition border border-slate-800"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={nextReview}
                aria-label="Avis suivant"
                className="p-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 transition border border-slate-800"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Stars */}
            <div className="flex items-center gap-1 text-amber-400">
              {[...Array(currentRev.rating)].map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
              ))}
            </div>

            {/* Comment Text */}
            <blockquote className="text-lg md:text-xl text-slate-200 leading-relaxed font-serif italic">
              "{currentRev.comment}"
            </blockquote>

            {/* Author info */}
            <div className="flex items-center justify-between border-t border-slate-900 pt-6">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-brand-terracotta text-white font-bold text-lg flex items-center justify-center shadow">
                  {currentRev.avatarInitial}
                </div>
                <div>
                  <h4 className="font-heading font-bold text-base text-white flex items-center gap-1.5">
                    <span>{currentRev.author}</span>
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                  </h4>
                  <p className="text-xs text-slate-400">
                    {currentRev.city} • Prestation : {currentRev.serviceCategory}
                  </p>
                </div>
              </div>

              <span className="text-xs text-slate-500 hidden sm:inline">
                {currentRev.date}
              </span>
            </div>

          </div>

          {/* Dots Indicator */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {reviewsData.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Aller à l'avis ${idx + 1}`}
                className={`h-2.5 rounded-full transition-all ${
                  idx === currentIndex ? "w-8 bg-brand-terracotta" : "w-2.5 bg-slate-700"
                }`}
              />
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};
