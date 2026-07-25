export interface SiteConfig {
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  city: string;
  postalCode: string;
  department: string;
  region: string;
  address: string;
  fullAddress: string;
  radiusKm: number;
  phone: string;
  phoneFormatted: string;
  emergencyPhone: string;
  emergencyPhoneFormatted: string;
  email: string;
  siret: string; // BCE en Belgique
  capital: string;
  rcs: string;
  tvaIntra: string;
  insuranceName: string;
  insuranceNumber: string;
  experienceYears: number;
  responseDelay: string;
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
  coveredPostalCodes: string[];
}

export const siteData: SiteConfig = {
  name: "Zlobodan Couverture-Zinguerie SRL",
  shortName: "Zlobodan Couverture Belgique",
  tagline: "Couvreur-Zingueur agréé à Bruxelles, Brabant Wallon & Wallonie",
  description: "Entreprise de couverture-zinguerie agréée en Belgique. Spécialisée dans la réfection complète de toiture, dépannage fuite d'urgence 24/7, démoussage hydrofuge, pose de Velux et isolation de toiture. Agrément enregistrement d'entrepreneur & Garantie Décennale 10 ans.",
  city: "Bruxelles",
  postalCode: "1000",
  department: "Brabant / Région Bruxelloise",
  region: "Belgique (Bruxelles-Capitale & Wallonie)",
  address: "Avenue Louise 14",
  fullAddress: "Avenue Louise 14, 1050 Bruxelles, Belgique",
  radiusKm: 40,
  phone: "+3223456789",
  phoneFormatted: "02 345 67 89",
  emergencyPhone: "+32470123456",
  emergencyPhoneFormatted: "0470 12 34 56",
  email: "contact@zlobodan-couverture.be",
  siret: "BE 0849.201.394 (N° BCE)",
  capital: "18 600 €",
  rcs: "RPM Bruxelles",
  tvaIntra: "BE 0849.201.394",
  insuranceName: "AXA Belgium / Ethias - Responsabilité Civile Décennale (Loi du 31 mai 2017)",
  insuranceNumber: "POL-DEC-BE-849201",
  experienceYears: 18,
  responseDelay: "Devis gratuit sous 48h",
  isEmergencyBannerActive: true,
  emergencyBannerMessage: "🚨 Alerte Intempéries Belgique : Service d'urgence fuite & bâchage opérationnel 24h/24 & 7j/7 dans toute la région.",
  openingHours: {
    days: "Du Lundi au Samedi",
    hours: "07h30 - 19h00",
    emergency: "Dépannage d'urgence fuite & tempête 24h/24 - 7j/7",
  },
  reassuranceBadges: [
    {
      id: "decennale",
      title: "Garantie Décennale 10 ans",
      subtitle: "Conforme à la Loi belge du 31 mai 2017 (AXA Belgium)",
      iconName: "ShieldCheck",
    },
    {
      id: "rge",
      title: "Entrepreneur Agréé Primes",
      subtitle: "Éligible Primes Renolution (Bruxelles) & Primes Habitation (Wallonie)",
      iconName: "Award",
    },
    {
      id: "devis",
      title: "Devis Gratuit & Détaillé",
      subtitle: "Réponse et métré sur place sous 48h",
      iconName: "FileText",
    },
    {
      id: "experience",
      title: "18 Ans de Métier en Belgique",
      subtitle: "Plus de 700 toitures rénovées en Belgique",
      iconName: "CheckCircle2",
    },
    {
      id: "urgence",
      title: "Urgence Fuite 24/7",
      subtitle: "Intervention rapide Bruxelles & Brabant Wallon",
      iconName: "Zap",
    },
  ],
  guarantees: [
    {
      title: "Garantie Décennale Belge",
      description: "Couverture intégrale de 10 ans sur l'étanchéité et la solidité de la toiture selon la législation belge.",
      icon: "Shield",
    },
    {
      title: "Éligibilité aux Primes Régionales",
      description: "Dossier d'accompagnement pour les Primes Renolution (Bruxelles) et Primes à la rénovation de toiture (Wallonie).",
      icon: "Award",
    },
    {
      title: "Nettoyage & Protection du Chantier",
      description: "Installation de bâches de protection, évacuation des décombres et remise en état propre du jardin.",
      icon: "Sparkles",
    },
    {
      title: "Prix Métreur Ferme & Détaillé",
      description: "Devis clair sans frais cachés validé préalablement avant le coup d'envoi des travaux.",
      icon: "Euro",
    },
  ],
  coveredPostalCodes: [
    "1000", "1050", "1180", "1150", "1200", // Bruxelles, Ixelles, Uccle, Woluwe
    "1300", // Wavre
    "1380", // Lasne
    "1400", // Nivelles
    "1410", // Waterloo
    "5000", // Namur
    "4000", // Liège
    "7000", // Mons
    "1340", // Ottignies-Louvain-la-Neuve
    "1420", // Braine-l'Alleud
  ],
};
