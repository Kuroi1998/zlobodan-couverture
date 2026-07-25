"use client";

import React, { useState, useRef, useCallback } from "react";
import Image from "next/image";

interface BeforeAfterProps {
  beforeImage: string;
  afterImage: string;
  beforeAlt?: string;
  afterAlt?: string;
  title?: string;
}

export const BeforeAfterSlider: React.FC<BeforeAfterProps> = ({
  beforeImage,
  afterImage,
  beforeAlt = "Toiture avant rénovation (tuiles ou ardoise usagée)",
  afterAlt = "Toiture après réfection par Zlobodan Couverture",
  title = "Comparatif Avant / Après Rénovation",
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      let percentage = (x / rect.width) * 100;
      if (percentage < 0) percentage = 0;
      if (percentage > 100) percentage = 100;
      setSliderPosition(percentage);
    },
    []
  );

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      setSliderPosition((prev) => Math.max(0, prev - 5));
    } else if (e.key === "ArrowRight") {
      setSliderPosition((prev) => Math.min(100, prev + 5));
    }
  };

  return (
    <div className="space-y-3">
      {title && (
        <h4 className="font-heading font-bold text-base text-slate-900 flex items-center justify-between">
          <span>{title}</span>
          <span className="text-xs text-slate-500 font-normal">
            Glissez le curseur ◄ ► ou utilisez les flèches du clavier
          </span>
        </h4>
      )}

      <div
        ref={containerRef}
        role="slider"
        tabIndex={0}
        aria-valuenow={Math.round(sliderPosition)}
        aria-valuemin={0}
        aria-valuemax={100}
        onKeyDown={handleKeyDown}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        aria-label="Slider de comparaison Avant / Après"
        className="relative w-full h-[320px] sm:h-[420px] rounded-2xl overflow-hidden select-none cursor-ew-resize border border-slate-200 shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-terracotta"
      >
        {/* AFTER Image (Full background) */}
        <div className="absolute inset-0 w-full h-full">
          <Image
            src={afterImage}
            alt={afterAlt}
            fill
            className="object-cover"
          />
          <span className="absolute top-4 right-4 bg-emerald-600/90 text-white text-xs font-bold px-3 py-1 rounded-full shadow backdrop-blur-sm">
            APRÈS
          </span>
        </div>

        {/* BEFORE Image (Clipped overlay) */}
        <div
          className="absolute inset-0 h-full overflow-hidden"
          style={{ width: `${sliderPosition}%` }}
        >
          <div className="relative w-full h-full min-w-full">
            <Image
              src={beforeImage}
              alt={beforeAlt}
              fill
              className="object-cover"
            />
          </div>
          <span className="absolute top-4 left-4 bg-red-600/90 text-white text-xs font-bold px-3 py-1 rounded-full shadow backdrop-blur-sm">
            AVANT
          </span>
        </div>

        {/* Divider Bar & Handle Button */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-white shadow-2xl z-20"
          style={{ left: `${sliderPosition}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 bg-brand-terracotta text-white rounded-full flex items-center justify-center shadow-accent border-2 border-white font-bold text-sm">
            ◄►
          </div>
        </div>
      </div>
    </div>
  );
};
