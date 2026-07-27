import { ServiceItem } from "./types";

export const repairsService: ServiceItem = {
  id: "reparation-fuite",
  slug: "recherche-reparation-fuite",
  title: "Recherche & Réparation de Fuite d'Urgence",
  shortDescription: "Recherche de fuite, bâchage de protection et réparation de toiture. Les demandes urgentes sont traitées en priorité, selon nos disponibilités.",
  heroSubtitle: "Une fuite d'eau détériore rapidement votre charpente et vos plafonds. Signalez-la nous : les urgences sont traitées en priorité, selon nos disponibilités.",
  icon: "Droplets",
  alertSymptoms: [
    "Taches jaunâtres ou moisissures apparaissant sur vos plafonds.",
    "Goutte-à-goutte audible lors de fortes pluies ou tempêtes.",
    "Tuiles déplacées ou envolées sous l'action du vent.",
    "Gouttière ou chéneau débordant vers l'intérieur de la corniche.",
    "Infiltrations au niveau de la souche de cheminée ou du contour de Velux."
  ],
  methodologySteps: [
    {
      number: 1,
      title: "Déplacement immédiat & Sécurisation",
      description: "Arrivée prioritaire de notre camion d'urgence avec matériel de sécurité et matériel de bâchage."
    },
    {
      number: 2,
      title: "Recherche de fuite & Diagnostic",
      description: "Inspection visuelle et test humidimétrique pour cibler le défaut d'étanchéité."
    },
    {
      number: 3,
      title: "Bâchage d'urgence sous intempéries",
      description: "Pose d'une bâche armée étanche haute résistance pour stopper immédiatement les dégradations intérieures."
    },
    {
      number: 4,
      title: "Remise en état pérenne",
      description: "Remplacement des tuiles/ardoises cassées, réfection du solin zinc décollé ou étanchement de cheminée."
    },
    {
      number: 5,
      title: "Dossier pour votre Assurance Habitation",
      description: "Remise d'un rapport photographique que vous pouvez transmettre à votre compagnie d'assurance."
    }
  ],
  materialsAndBrands: [
    {
      category: "Produits de Colmatage Professionnels",
      items: ["Mastic Sikaflex Belux", "Bâches armées renforcées 250g/m²", "Bandes d'étanchéité plomb/aluminium auto-adhésives"]
    }
  ],
  priceFactors: [
      "L'urgence de l'intervention (heures ouvrables vs week-end / nuit)",
      "La nécessité ou non d'un bâchage de grande surface",
      "La quantité d'ardoises/tuiles et éléments de zinguerie à remplacer"
    ],
  guarantees: [
    "Demandes urgentes traitées en priorité, selon nos disponibilités",
    "Rapport photos conforme aux exigences des assurances belges",
    "Étanchéité garantie après intervention"
  ],
  faq: [
    {
      question: "Mon assurance habitation belge prend-elle en charge la réparation de fuite ?",
      answer: "Oui, la recherche de fuite et les travaux de mise en sécurité d'urgence (bâchage, tuiles envolées par tempête) sont couverts par l'assurance incendie/habitation. Nous vous remettons un dossier de facturation conforme."
    },
    {
      question: "Intervenez-vous le dimanche ou les jours fériés ?",
      answer: "Signalez-nous la situation par le formulaire de demande : les urgences de type infiltration ou dégât de tempête sont traitées en priorité. Nous vous indiquons rapidement si nous pouvons intervenir et sous quel délai, en fonction de nos disponibilités et des conditions météorologiques."
    }
  ],
  devisPreselectId: "fuite"
};
