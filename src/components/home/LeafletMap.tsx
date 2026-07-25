"use client";

import React, { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { villesData } from "@/data/villesData";
import { escapeHtml } from "@/lib/security/encoding";

/**
 * Carte de zone d'intervention.
 *
 * Leaflet est auto-hébergé : la version précédente injectait dynamiquement le
 * script et la feuille de style depuis unpkg.com, sans SRI. Une compromission
 * du CDN ou du paquet publié donnait l'exécution de JavaScript arbitraire sur
 * la page d'accueil de tous les visiteurs (audit H2).
 *
 * L'auto-hébergement supprime aussi le besoin d'autoriser un domaine tiers
 * dans `script-src`, ce qui permet de refermer la CSP.
 */

const BRUSSELS: [number, number] = [50.8503, 4.3517];

const CITY_COORDS: Record<string, [number, number]> = {
  "couvreur-bruxelles": [50.8503, 4.3517],
  "couvreur-waterloo": [50.7147, 4.3994],
  "couvreur-uccle": [50.8038, 4.3344],
  "couvreur-wavre": [50.7167, 4.6],
  "couvreur-ixelles": [50.8333, 4.3667],
  "couvreur-namur": [50.4669, 4.8675],
  "couvreur-liege": [50.6326, 5.5797],
};

const MARKER_HTML =
  '<div style="background-color:#EA580C;width:18px;height:18px;border-radius:50%;' +
  'border:3px solid #FFFFFF;box-shadow:0 0 10px rgba(234,88,12,0.8);"></div>';

/**
 * Leaflet rend le contenu des popups via innerHTML. Les valeurs interpolées
 * proviennent de `villesData`, donc du dépôt et non d'une entrée utilisateur,
 * mais elles sont tout de même encodées : si ce jeu de données devient un jour
 * alimenté par le back-office, le gabarit reste sûr.
 */
function buildPopup(name: string, postalCode: string, slug: string): string {
  return `
    <div style="font-family: sans-serif; padding: 4px; text-align: center;">
      <strong style="font-size: 14px; color: #0F172A;">Couvreur ${escapeHtml(name)} (${escapeHtml(postalCode)})</strong>
      <p style="font-size: 11px; color: #64748B; margin: 4px 0 8px 0;">Intervention sous 24h &amp; Devis gratuit</p>
      <a href="/${encodeURIComponent(slug)}" style="background-color: #EA580C; color: #FFFFFF; text-decoration: none; padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; display: inline-block;">
        Page commune &rarr;
      </a>
    </div>
  `;
}

export const LeafletMap: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletInstance = useRef<import("leaflet").Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || leafletInstance.current) return;

    let cancelled = false;

    // Import différé : Leaflet touche `window` à l'évaluation du module et ne
    // peut donc pas être chargé pendant le rendu serveur.
    import("leaflet")
      .then((mod) => {
        const L = mod.default;
        if (cancelled || !mapRef.current || leafletInstance.current) return;

        const map = L.map(mapRef.current, {
          center: BRUSSELS,
          zoom: 9,
          scrollWheelZoom: false,
        });
        leafletInstance.current = map;

        L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
          maxZoom: 18,
        }).addTo(map);

        L.circle(BRUSSELS, {
          color: "#EA580C",
          fillColor: "#EA580C",
          fillOpacity: 0.15,
          radius: 40000,
          weight: 2,
          dashArray: "6, 6",
        }).addTo(map);

        const customIcon = L.divIcon({
          className: "custom-leaflet-marker",
          html: MARKER_HTML,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });

        Object.values(villesData).forEach((v) => {
          const coords = CITY_COORDS[v.slug];
          if (!coords) return;
          L.marker(coords, { icon: customIcon })
            .addTo(map)
            .bindPopup(buildPopup(v.name, v.postalCode, v.slug));
        });
      })
      .catch((err: unknown) => {
        console.error("Impossible de charger la carte Leaflet :", err);
      });

    return () => {
      cancelled = true;
      if (leafletInstance.current) {
        leafletInstance.current.remove();
        leafletInstance.current = null;
      }
    };
  }, []);

  return (
    <div className="relative w-full h-[380px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      <div ref={mapRef} className="w-full h-full z-0 bg-slate-900" />
    </div>
  );
};
