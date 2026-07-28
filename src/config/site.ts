import { companyIdentity } from "./company";

/**
 * Configuration éditoriale du site.
 *
 * Ne contient **que** du contenu de présentation. Tout ce qui identifie
 * légalement l'entreprise — dénomination, numéro BCE, TVA, adresse, téléphone,
 * courriel, assurance — vit dans `config/company.ts` et n'est pas recopié ici.
 *
 * Les champs `siret`, `capital`, `rcs`, `tvaIntra`, `insuranceName`,
 * `insuranceNumber`, `experienceYears`, `phone` et `email` ont été retirés lors
 * de l'audit éditorial du 2026-07-27 : ils portaient des valeurs héritées d'un
 * modèle français, sans preuve, et se retrouvaient jusque dans les données
 * structurées et les mentions légales.
 *
 * Règle de rédaction pour ce fichier : **aucun chiffre invérifiable**. Ni
 * années d'expérience, ni nombre de chantiers, ni note, ni délai garanti. Un
 * texte de présentation peut décrire une manière de travailler ; il ne peut pas
 * affirmer une performance que l'entreprise ne peut pas démontrer.
 */

export interface SiteConfig {
  /** Alias du nom commercial. La valeur vient de `companyIdentity`. */
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  /** Ville de référence pour la présentation éditoriale et les pages locales. */
  city: string;
  region: string;
  /** Bannière d'information ponctuelle, désactivée par défaut. */
  isEmergencyBannerActive: boolean;
  emergencyBannerMessage: string;
  openingHours: {
    days: string;
    hours: string;
    emergency: string;
  };
  reassuranceBadges: Array<{
    id: string;
    title: string;
    subtitle: string;
    iconName: string;
  }>;
  guarantees: Array<{
    title: string;
    description: string;
    icon: string;
  }>;
  /**
   * Codes postaux de la zone d'intervention annoncée.
   *
   * La liste précédente mêlait Bruxelles, le Brabant wallon, Namur, Liège et
   * Mons tout en annonçant par ailleurs un rayon de 40 km : Liège est à environ
   * 90 km de Bruxelles, la contradiction était visible. La liste est ramenée à
   * Bruxelles et au Brabant wallon, cohérents entre eux. L'étendue réelle reste
   * à confirmer par l'entreprise.
   */
  coveredPostalCodes: string[];
}

export const siteConfig: SiteConfig = {
  name: companyIdentity.tradeName,
  shortName: "Zlobodan Couverture",
  tagline: "Couvreur-zingueur à Bruxelles et en Brabant wallon",
  description:
    "Entreprise de couverture-zinguerie active à Bruxelles et en Brabant wallon : " +
    "rénovation et réfection de toiture, recherche et réparation de fuites, " +
    "démoussage, pose de fenêtres de toit, isolation et travaux de zinguerie. " +
    "Devis établi après analyse de votre demande.",
  city: "Bruxelles",
  region: "Bruxelles-Capitale et Brabant wallon",

  // Bannière désactivée : la précédente annonçait en permanence une « alerte
  // intempéries » doublée d'un service « 24h/24 & 7j/7 dans toute la région ».
  // Une alerte perpétuelle n'est pas une alerte, et la disponibilité annoncée
  // n'était adossée à aucune organisation démontrable.
  isEmergencyBannerActive: false,
  emergencyBannerMessage:
    "Dégât sur votre toiture ? Contactez-nous pour que nous évaluions la situation.",

  openingHours: {
    days: "Du lundi au vendredi",
    hours: "08h00 - 17h00",
    emergency:
      "Demandes urgentes traitées en priorité, selon nos disponibilités.",
  },

  reassuranceBadges: [
    {
      id: "decennale",
      title: "Responsabilité décennale",
      // La responsabilité décennale n'est pas un label commercial : c'est une
      // obligation légale belge pour le gros œuvre. L'énoncer est factuel ;
      // nommer un assureur ou un numéro de police ne l'est pas tant que le
      // contrat n'a pas été vérifié.
      subtitle:
        "Obligation légale belge sur les travaux de gros œuvre, dont l'étanchéité de toiture.",
      iconName: "ShieldCheck",
    },
    {
      id: "primes",
      title: "Accompagnement aux primes",
      // Formulation d'un service rendu, et non d'un agrément détenu. Le badge
      // précédent annonçait « Entrepreneur Agréé Primes », qui laissait
      // entendre une accréditation ; l'éligibilité dépend en réalité du
      // logement et des travaux, pas de l'entreprise.
      subtitle:
        "Aide au montage des dossiers de primes régionales, selon votre situation.",
      iconName: "Award",
    },
    {
      id: "devis",
      title: "Devis détaillé",
      subtitle: "Chiffrage poste par poste, remis après analyse de votre demande.",
      iconName: "FileText",
    },
    {
      id: "chantier",
      title: "Chantier protégé",
      subtitle: "Protection des abords, évacuation des déchets et remise en état.",
      iconName: "Sparkles",
    },
  ],

  guarantees: [
    {
      title: "Responsabilité décennale",
      description:
        "Les travaux de toiture relevant du gros œuvre engagent la responsabilité décennale de l'entrepreneur, conformément au droit belge.",
      icon: "Shield",
    },
    {
      title: "Accompagnement aux primes régionales",
      description:
        "Nous vous aidons à réunir les pièces demandées pour les primes de la Région bruxelloise ou de la Wallonie. L'octroi relève de l'administration concernée.",
      icon: "Award",
    },
    {
      title: "Protection du chantier",
      description:
        "Bâchage des abords, évacuation des déchets de chantier et remise en état des accès en fin de travaux.",
      icon: "Sparkles",
    },
    {
      title: "Devis validé avant travaux",
      description:
        "Le chiffrage est détaillé poste par poste et validé avec vous avant le démarrage. Toute modification en cours de chantier fait l'objet d'un accord préalable.",
      icon: "Euro",
    },
  ],

  coveredPostalCodes: [
    // Région de Bruxelles-Capitale
    "1000", // Bruxelles
    "1050", // Ixelles
    "1180", // Uccle
    "1150", // Woluwe-Saint-Pierre
    "1200", // Woluwe-Saint-Lambert
    // Brabant wallon
    "1300", // Wavre
    "1340", // Ottignies-Louvain-la-Neuve
    "1380", // Lasne
    "1400", // Nivelles
    "1410", // Waterloo
    "1420", // Braine-l'Alleud
  ],
};
