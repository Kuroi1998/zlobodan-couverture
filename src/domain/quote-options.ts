/**
 * Vocabulaire métier du formulaire de devis — source de vérité unique.
 *
 * Ce module existe parce que la liste des interventions était écrite **deux
 * fois** : une fois dans les composants d'étape (`refection`, `fuite`,
 * `demoussage`, `gouttieres`…) et une fois, avec des mots différents, dans le
 * schéma de validation serveur (`reparation`, `renovation`, `nettoyage`,
 * `zinguerie`…). Quatre des sept valeurs proposées à l'utilisateur étaient
 * donc systématiquement rejetées par la validation.
 *
 * Les identifiants ci-dessous sont ceux réellement affichés par l'interface :
 * c'est le vocabulaire du métier, et il fait foi. Le schéma Zod et les
 * composants s'y réfèrent tous les deux, ce qui rend la divergence impossible.
 *
 * Un identifiant est une **clé stable stockée en base** : le renommer impose
 * une migration des lignes existantes. Le libellé, lui, peut changer librement.
 */

export interface QuoteOption<T extends string> {
  id: T;
  label: string;
  hint?: string;
}

// --- Nature de l'intervention ----------------------------------------------

export const INTERVENTION_TYPES = [
  "refection",
  "fuite",
  "demoussage",
  "gouttieres",
  "isolation",
  "velux",
  "autre",
] as const;

export type InterventionType = (typeof INTERVENTION_TYPES)[number];

export const INTERVENTION_OPTIONS: QuoteOption<InterventionType>[] = [
  { id: "refection", label: "Réfection complète toiture" },
  { id: "fuite", label: "Réparation fuite d'urgence" },
  { id: "demoussage", label: "Démoussage & Hydrofuge" },
  { id: "gouttieres", label: "Zinguerie & Gouttières" },
  { id: "isolation", label: "Isolation toiture (Sarking/Combles)" },
  { id: "velux", label: "Pose ou remplacement Velux" },
  { id: "autre", label: "Autre projet de toiture" },
];

// --- Type de couverture -----------------------------------------------------

export const ROOF_TYPES = [
  "ardoise",
  "tuile_terre_cuite",
  "tuile_beton",
  "zinc",
  "bac_acier",
  "je_ne_sais_pas",
] as const;

export type RoofType = (typeof ROOF_TYPES)[number];

export const ROOF_TYPE_OPTIONS: QuoteOption<RoofType>[] = [
  {
    id: "ardoise",
    label: "Ardoise naturelle / synthétique",
    hint: "Fréquent en Belgique & Région bruxelloise",
  },
  {
    id: "tuile_terre_cuite",
    label: "Tuiles terre cuite Koramic / Pottelberg",
    hint: "Plates, romanes ou emboîtement",
  },
  { id: "tuile_beton", label: "Tuiles béton", hint: "Gris/Rouge massif" },
  { id: "zinc", label: "Zinc à joint debout", hint: "Toiture mansardée ou moderne" },
  { id: "bac_acier", label: "Bac acier", hint: "Entrepôts ou annexes" },
  {
    id: "je_ne_sais_pas",
    label: "Je ne sais pas",
    hint: "À diagnostiquer sur place par le couvreur",
  },
];

// --- Surface ----------------------------------------------------------------

export const SURFACE_RANGES = ["less_50", "50-100", "100-150", "more_150", "unknown"] as const;

export type SurfaceRange = (typeof SURFACE_RANGES)[number];

export const SURFACE_OPTIONS: QuoteOption<SurfaceRange>[] = [
  { id: "less_50", label: "Moins de 50 m²", hint: "Petite toiture ou annexe" },
  { id: "50-100", label: "50 à 100 m²", hint: "Maison unifamiliale standard" },
  { id: "100-150", label: "100 à 150 m²", hint: "Grande propriété ou longère" },
  { id: "more_150", label: "Plus de 150 m²", hint: "Immeuble ou villa d'exception" },
  { id: "unknown", label: "Je ne sais pas", hint: "Métré effectué lors de la visite" },
];

// --- Valeurs par défaut du formulaire ---------------------------------------

export const QUOTE_DEFAULTS = {
  interventionType: "refection" satisfies InterventionType,
  roofType: "ardoise" satisfies RoofType,
  surface: "50-100" satisfies SurfaceRange,
} as const;

/** Traduit un identifiant en libellé lisible, pour un email ou le back-office. */
export function labelFor<T extends string>(
  options: QuoteOption<T>[],
  id: string
): string {
  return options.find((o) => o.id === id)?.label ?? id;
}
