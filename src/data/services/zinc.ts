import { ServiceItem } from "./types";

export const zincService: ServiceItem = {
  id: "zinguerie-gouttieres",
  slug: "zinguerie-gouttieres",
  title: "Zinguerie, Gouttières & Chéneaux sur Mesure",
  shortDescription: "Installation et remplacement de gouttières zinc/aluminium, solins, noues, entourage de cheminée et toiture en zinc à joint debout.",
  heroSubtitle: "La zinguerie constitue la clé de l'étanchéité sous la pluie belge. Nos zingueurs façonnent sur mesure vos gouttières et finitions métalliques.",
  icon: "ShieldAlert",
  heroImage: "/images/chantiers/chantier-01.webp",
  alertSymptoms: [
    "Gouttière percée, déboîtée ou fuiante au niveau des soudures.",
    "Traces d'humidité le long des façades sous la ligne de toit.",
    "Solin de cheminée décollé provoquant des infiltrations dans la cheminée.",
    "Noue de toiture encombrée ou perforée."
  ],
  methodologySteps: [
    {
      number: 1,
      title: "Relevé de côtes & Pentes d'écoulement",
      description: "Prise des mesures précises et calcul des pentes d'évacuation d'eaux pluviales."
    },
    {
      number: 2,
      title: "Façonnage sur mesure",
      description: "Découpe et pliage des éléments en zinc naturel, zinc quartz ou cuivre."
    },
    {
      number: 3,
      title: "Pose & Soudures à l'étain",
      description: "Assemblage sur place par soudures croisées au fer chaud et à l'étain pour une étanchéité inaltérable."
    },
    {
      number: 4,
      title: "Mise en eau & Validation",
      description: "Test de bonne évacuation dans les descentes pluviales."
    }
  ],
  materialsAndBrands: [
    {
      category: "Matériaux Zinguerie Belge",
      items: ["Zinc naturel, Zinc Quartz Rheinzink / VMZinc", "Cuivre & Aluminium thermolaqué", "Étain pur 33% pour soudures de précision"]
    }
  ],
  priceIndicative: {
    range: "35 € à 85 €",
    unit: "par mètre linéaire de gouttière posée",
    factors: [
      "Le matériau sélectionné (zinc naturel vs aluminium vs cuivre)",
      "Le type de gouttière (demi-ronde, pendue, chéneau encastré)",
      "La hauteur et la complexité des raccords métalliques"
    ]
  },
  guarantees: [
    "Garantie Décennale 10 ans sur les soudures et la pose",
    "Zinc normé NF EN 988 / NBN",
    "Évacuation d'eau dimensionnée pour les fortes averses belges"
  ],
  realisationIds: ["chantier-nantes-ardoise"],
  faq: [
    {
      question: "Quelle est la durée de vie d'une zinguerie en zinc en Belgique ?",
      answer: "Le zinc de qualité supérieure possède une durée de vie moyenne de 40 à 70 ans sans aucun entretien lourd, développant une patine naturelle auto-protectrice."
    }
  ],
  devisPreselectId: "gouttieres"
};
