import { ServiceItem } from "./types";

export const cleaningService: ServiceItem = {
  id: "demoussage-hydrofuge",
  slug: "demoussage-nettoyage-hydrofuge",
  title: "Démoussage, Nettoyage & Traitement Hydrofuge",
  shortDescription: "Nettoyage basse pression de toiture, élimination des lichens/mousses et application d'un traitement hydrofuge rénovateur incolore ou coloré.",
  heroSubtitle: "Protégez vos tuiles et ardoises du gel et du climat humide belge. Un traitement hydrofuge prolonge la durée de vie de votre toit de plus de 15 ans.",
  icon: "Sparkles",
  alertSymptoms: [
    "Présence importante de mousses vertes, lichens et algues sur le toit.",
    "Gouttières régulièrement obstruées par les amas végétaux.",
    "Tuiles devenues sombres ou s'effritant sous le gel hivernal.",
    "Légères infiltrations d'humidité dues à la porosité du matériau."
  ],
  methodologySteps: [
    {
      number: 1,
      title: "Protection du chantier & Évacuations",
      description: "Obturation temporaire des descentes de gouttières et protection de vos abords et terrasses."
    },
    {
      number: 2,
      title: "Nettoyage basse pression réglée",
      description: "Décapage modéré pour enlever les grosses mousses sans dégrader la couche protectrice de la tuile."
    },
    {
      number: 3,
      title: "Application de l'anti-mousse fongicide",
      description: "Pulvérisation d'un traitement curatif et préventif professionnel pour éliminer les racines en profondeur."
    },
    {
      number: 4,
      title: "Application de l'Hydrofuge de surface",
      description: "Application en 2 passes croisées d'un traitement hydrofuge à effet perlant laissant respirer le support."
    }
  ],
  materialsAndBrands: [
    {
      category: "Produits de Traitement Professionnels",
      items: ["Fongicides & Algicides biodégradables sans chlore", "Hydrofuge perlant Technichem / Dalep", "Hydrofuge rénovateur teinté pour tuiles et ardoises"]
    }
  ],
  priceFactors: [
      "Le degré d'encrassement et la hauteur de la toiture",
      "Le type de traitement (anti-mousse simple vs hydrofuge complet)",
      "La surface totale à traiter"
    ],
  guarantees: [
    "Effet perlant garanti 10 ans",
    "Produits respectueux des zingueries et des végétaux",
    "Résistance au gel garantie"
  ],
  faq: [
    {
      question: "Pourquoi éviter le karcher haute pression sur les tuiles en Belgique ?",
      answer: "Le karcher à haute pression décape la couche supérieure de la tuile et la rend très poreuse au gel. Nous utilisons une pression modérée et des traitements d'imprégnation certifiés."
    },
    {
      question: "À quelle fréquence faut-il effectuer un démoussage ?",
      answer: "Un traitement hydrofuge complet protège la toiture pendant 10 à 15 ans. Un simple contrôle visuel tous les 3 à 5 ans permet de maintenir votre toit en parfait état."
    }
  ],
  devisPreselectId: "demoussage"
};
