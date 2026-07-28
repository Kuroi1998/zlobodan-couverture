import { ServiceItem } from "./types";

export const roofingService: ServiceItem = {
  id: "refection-toiture",
  slug: "renovation-refection-toiture",
  title: "Réfection & Rénovation de Toiture",
  shortDescription: "Rénovation intégrale de toitures en ardoise naturelle, tuile terre cuite Koramic/Pottelberg ou zinc avec dépose, sous-toiture HPV et voligeage neuf.",
  heroSubtitle: "Garantissez une étanchéité parfaite et une valeur pérenne à votre bien en Belgique grâce à une couverture posée selon les normes de la profession.",
  icon: "Home",
  alertSymptoms: [
    "Tuiles fêtées, poreuses, cassées ou décalées après une tempête en Belgique.",
    "Ardoises naturelles effritées ou crochets en inox cassés par l'usure.",
    "Infiltrations d'eau au plafond ou traces d'humidité dans les combles.",
    "Toiture âgée de plus de 30 ans n'ayant jamais fait l'objet d'une réfection.",
    "Présence importante de mousses traversantes détériorant le matériau."
  ],
  methodologySteps: [
    {
      number: 1,
      title: "Sécurité & Échafaudage agréé",
      description: "Installation d'un échafaudage périphérique conforme aux normes de sécurité belges et protection du chantier (bâchage)."
    },
    {
      number: 2,
      title: "Dépose soignée de l'ancienne couverture",
      description: "Dépose minutieuse des anciennes tuiles ou ardoises, évacuation en centre de tri agréé et contrôle de la charpente."
    },
    {
      number: 3,
      title: "Sous-toiture HPV & Contre-lattage",
      description: "Mise en place d'un écran de sous-toiture Haute Perméabilité à la Vapeur (Doerken / Eternit) protégeant des infiltrations accidentelles."
    },
    {
      number: 4,
      title: "Lattage & Pose des tuiles ou ardoises belges",
      description: "Pose au millimètre des ardoises (clouées/crochets inox) ou tuiles terre cuite emboîtées Koramic Pottelberg avec fixations anti-tempête."
    },
    {
      number: 5,
      title: "Zinguerie sur mesure & Réception",
      description: "Façonnage des solins en zinc, rives et noues, nettoyage complet du chantier et remise des documents de fin de travaux."
    }
  ],
  materialsAndBrands: [
    {
      category: "Ardoises & Tuiles Belges & Européennes",
      items: ["Ardoises Cupa Pizzaras & Eternit Belgik", "Tuiles Koramic / Wienerberger Pottelberg", "Tuiles terre cuite Terreal & Monier"]
    },
    {
      category: "Sous-toitures & Équipements",
      items: ["Écran de sous-toiture Doerken Delta-PV / Eternit Spirtech", "Crochets Inox 18/10 anti-corrosion", "Bois de charpente certifié traité classe 2/3"]
    }
  ],
  priceFactors: [
      "Le choix du matériau (ardoise naturelle d'Espagne vs tuile Koramic vs zinc)",
      "La pente du toit et la complexité des découpes (mansardes, lucarnes)",
      "L'accessibilité et la hauteur d'échafaudage à Bruxelles/Wallonie",
      "Le besoin d'une réparation de charpente préalable"
    ],
  guarantees: [
    "Responsabilité décennale de l'entrepreneur, conformément au droit belge",
    "Garantie fabricant des tuiles/ardoises (30 ans)",
    "Conformité aux spécifications techniques belges STS / NBN"
  ],
  faq: [
    {
      question: "Combien de temps dure un chantier de rénovation de toiture en Belgique ?",
      answer: "Pour une habitation unifamiliale standard (100 à 140 m²), le chantier dure généralement entre 4 et 7 jours ouvrables, selon les conditions météo."
    },
    {
      question: "Puis-je rester habiter dans ma maison pendant les travaux ?",
      answer: "Oui. Nous mettons en place une protection étanche provisoire chaque soir avant de quitter le chantier. Votre intérieur demeure parfaitement au sec."
    },
    {
      question: "Quelle est la durée de vie d'une toiture rénovée en ardoise ou en tuile ?",
      answer: "Une toiture en ardoise naturelle correctement posée dure plus de 80 à 100 ans. Une toiture en tuile terre cuite belge Koramic dure entre 40 et 60 ans."
    }
  ],
  devisPreselectId: "refection"
};
