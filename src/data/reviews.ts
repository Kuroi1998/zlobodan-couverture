export interface ReviewItem {
  id: string;
  author: string;
  city: string;
  rating: number;
  date: string;
  serviceCategory: string;
  comment: string;
  verifiedGoogle: boolean;
  avatarInitial: string;
}

export const reviewsData: ReviewItem[] = [
  {
    id: "rev-1",
    author: "Jean-Marc Vanderbeeken",
    city: "Bruxelles (1000)",
    rating: 5,
    date: "Il y a 2 semaines",
    serviceCategory: "Réfection toiture ardoise",
    comment: "Artisan couvreur de grande valeur en Belgique. Devis remis sous 48h, chantier très propre et ardoises posées à la perfection. La Garantie Décennale 10 ans rassure.",
    verifiedGoogle: true,
    avatarInitial: "J"
  },
  {
    id: "rev-2",
    author: "Chantal Dubois",
    city: "Waterloo (1410)",
    rating: 5,
    date: "Il y a 1 mois",
    serviceCategory: "Rénovation tuiles & Zinguerie",
    comment: "Très satisfaite de la réfection de notre toit. Équipe ponctuelle, courtoise et professionnelle. Prix conforme au devis initial sans mauvaise surprise.",
    verifiedGoogle: true,
    avatarInitial: "C"
  },
  {
    id: "rev-3",
    author: "Antoine Thiry",
    city: "Wavre (1300)",
    rating: 5,
    date: "Il y a 1 mois",
    serviceCategory: "Urgence fuite & Bâchage",
    comment: "Attitude formidable lors de la tempête. Intervenus le dimanche en moins de 2h pour bâcher notre toit et stopper l'infiltration. Vrais pros en Belgique !",
    verifiedGoogle: true,
    avatarInitial: "A"
  },
  {
    id: "rev-4",
    author: "Sophie Wouters",
    city: "Ixelles (1050)",
    rating: 5,
    date: "Il y a 2 mois",
    serviceCategory: "Pose de Velux solaires",
    comment: "Installation de 3 Velux solaires dans nos combles. Travail soigné, protection complète de nos parquets pendant la pose. Luminosité magnifique.",
    verifiedGoogle: true,
    avatarInitial: "S"
  },
  {
    id: "rev-5",
    author: "Michel Laurent",
    city: "Uccle (1180)",
    rating: 5,
    date: "Il y a 3 mois",
    serviceCategory: "Démoussage & Hydrofuge",
    comment: "Notre toiture qui avait 25 ans a retrouvé son éclat d'origine. L'effet perlant sous les pluies belges est impressionnant. Bravo à Zlobodan !",
    verifiedGoogle: true,
    avatarInitial: "M"
  },
  {
    id: "rev-6",
    author: "Bernard Peeters",
    city: "Namur (5000)",
    rating: 5,
    date: "Il y a 3 mois",
    serviceCategory: "Isolation Sarking Primes Wallonie",
    comment: "Gain de confort thermique immédiat et accompagnement parfait pour les attestations de Primes Habitation Wallonnes. À recommander !",
    verifiedGoogle: true,
    avatarInitial: "B"
  }
];
