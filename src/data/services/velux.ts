import { ServiceItem } from "./types";

export const veluxService: ServiceItem = {
  id: "pose-velux",
  slug: "pose-fenetre-de-toit-velux",
  title: "Pose & Remplacement de Fenêtres de Toit Velux",
  shortDescription: "Installation et remplacement de fenêtres de toit Velux Belux, volets roulants solaires et raccords d'étanchéité haute qualité.",
  heroSubtitle: "Apportez une lumière naturelle abondante et une aération idéale dans vos combles avec l'assurance d'un raccordement d'étanchéité parfait sous les pluies belges.",
  icon: "Sun",
  heroImage: "/images/chantiers/chantier-03.webp",
  alertSymptoms: [
    "Ancien Velux fuyant, buée entre vitrages ou joints détériorés.",
    "Combles assombris nécessitant un apport de lumière.",
    "Absence de volet roulant provoquant des chaleurs estivales.",
    "Mécanisme d'ouverture bloqué."
  ],
  methodologySteps: [
    {
      number: 1,
      title: "Étude d'emplacement & Chevêtre",
      description: "Prise des mesures et renforcement de la charpente si nécessaire."
    },
    {
      number: 2,
      title: "Dépose & Ouverture de toit",
      description: "Dépose soignée de l'ancienne fenêtre et préparation du contour."
    },
    {
      number: 3,
      title: "Pose du châssis & Collerette BFX",
      description: "Fixation du cadre dormant et raccordement de la collerette d'étanchéité sous-toiture Velux."
    },
    {
      number: 4,
      title: "Raccords d'étanchéité pluie & Volet solaire",
      description: "Pose des raccords d'étanchéité adaptés aux tuiles ou ardoises et installation éventuelle d'un volet solaire."
    }
  ],
  materialsAndBrands: [
    {
      category: "Gammes Velux Belux",
      items: ["Velux Tout Confort & Confort (Double/Triple vitrage)", "Volets roulants solaires Velux SSL & Stores DKL", "Raccords d'étanchéité EDW (tuile) / EDL (ardoise)"]
    }
  ],
  priceIndicative: {
    range: "650 € à 1 450 €",
    unit: "par fenêtre posée (fourniture + raccord + pose)",
    factors: [
      "La dimension du Velux (ex: UK04 134x98 cm vs CK02 55x78 cm)",
      "La finition choisie (EverFinish PVC blanc vs Bois vernis)",
      "L'ajout d'un volet roulant solaire autonome"
    ]
  },
  guarantees: [
    "Garantie 10 ans fabricant Velux Belux et étanchéité",
    "Garantie 5 ans sur les moteurs et volets solaires",
    "Pose certifiée installateur spécialisé"
  ],
  realisationIds: ["chantier-velux-nantes"],
  faq: [
    {
      question: "Les volets solaires Velux fonctionnent-ils bien en Belgique ?",
      answer: "Tout à fait ! La cellule photovoltaïque Velux accumule l'énergie solaire même lors de journées couvertes typiques du climat belge et fonctionne de manière 100% autonome."
    }
  ],
  devisPreselectId: "velux"
};
