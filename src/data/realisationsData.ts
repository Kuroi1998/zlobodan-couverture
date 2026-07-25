export interface RealisationItem {
  id: string;
  slug: string;
  title: string;
  category: string;
  city: string;
  postalCode: string;
  year: number;
  durationDays: number;
  roofType: string;
  initialProblem: string;
  solutionApplied: string;
  materialsUsed: string[];
  mainImage: string;
  beforeImage: string;
  afterImage: string;
  gallery: string[];
  clientReview?: {
    author: string;
    rating: number;
    text: string;
  };
}

export const realisationsData: RealisationItem[] = [
  {
    id: "chantier-nantes-ardoise",
    slug: "refection-toiture-ardoise-bruxelles-ixelles",
    title: "Réfection complète d'une toiture mansardée en ardoises clouées d'Espagne",
    category: "refection",
    city: "Ixelles",
    postalCode: "1050",
    year: 2024,
    durationDays: 6,
    roofType: "Ardoise naturelle d'Espagne Cupa 4 (32x22 cm)",
    initialProblem: "Toiture mansardée d'origine présentant de nombreuses ardoises cassées, des crochets rouillés provoquant des chutes lors des coups de vent à Bruxelles, et des infiltrations au niveau des solins de cheminée.",
    solutionApplied: "Dépose complète de la couverture usagée, contrôle des versants, pose d'une sous-toiture HPV Doerken, voligeage neuf et pose de 160 m² d'ardoises naturelles clouées avec zingueries neuves.",
    materialsUsed: [
      "Ardoise naturelle Cupa 4 d'Espagne (garantie 30 ans)",
      "Crochets inox 18/10",
      "Sous-toiture Doerken Delta-PV",
      "Zinguerie en Zinc Quartz Rheinzink 0.65mm"
    ],
    mainImage: "/images/chantiers/chantier-01.webp",
    beforeImage: "/images/chantiers/before-after-01.webp",
    afterImage: "/images/chantiers/chantier-01.webp",
    gallery: [
      "/images/chantiers/chantier-01.webp",
      "/images/chantiers/before-after-01.webp",
      "/images/chantiers/chantier-02.webp"
    ],
    clientReview: {
      author: "Jean-Marc V. (Ixelles Flagey)",
      rating: 5,
      text: "L'équipe de Zlobodan a réalisé un travail exceptionnel sur notre maison bruxelloise. La toiture en ardoise est magnifique, le chantier a été nettoyé chaque soir et la Garantie Décennale rassure !"
    }
  },
  {
    id: "chantier-orvault-tuile",
    slug: "renovation-toiture-tuile-pottelberg-waterloo",
    title: "Rénovation de toiture en tuiles terre cuite Koramic Pottelberg & zinguerie",
    category: "refection",
    city: "Waterloo",
    postalCode: "1410",
    year: 2024,
    durationDays: 5,
    roofType: "Tuiles terre cuite Koramic Pottelberg",
    initialProblem: "Tuiles en béton poreuses causant de l'humidité stagnante dans les sous-pentes et dégradation prononcée des rives.",
    solutionApplied: "Remplacement de l'ensemble de la couverture par des tuiles terre cuite belges hautes performances et pose de gouttières demi-rondes en zinc.",
    materialsUsed: [
      "Tuiles Koramic Pottelberg 44 Rouge Nuancé",
      "Faîtières ventilées avec closoir ventilé métallique",
      "Gouttières zinc 333"
    ],
    mainImage: "/images/chantiers/chantier-02.webp",
    beforeImage: "/images/chantiers/before-after-01.webp",
    afterImage: "/images/chantiers/chantier-02.webp",
    gallery: [
      "/images/chantiers/chantier-02.webp",
      "/images/chantiers/chantier-03.webp"
    ],
    clientReview: {
      author: "Philippe & Chantal D. (Waterloo Faubourg)",
      rating: 5,
      text: "Un travail soigné et un devis clair sans surprise. Nous avons particulièrement apprécié le professionnalisme des couvreurs."
    }
  },
  {
    id: "chantier-demoussage-rez",
    slug: "demoussage-hydrofuge-toiture-uccle",
    title: "Démoussage basse pression et traitement hydrofuge rénovateur",
    category: "demoussage",
    city: "Uccle",
    postalCode: "1180",
    year: 2024,
    durationDays: 2,
    roofType: "Tuiles terre cuite",
    initialProblem: "Envahissement massif de mousse verte et de lichens bloquant l'écoulement des eaux pluviales.",
    solutionApplied: "Nettoyage doux basse pression, application d'un traitement fongicide professionnel sans chlore et pulvérisation de 2 couches d'hydrofuge incolore perlant.",
    materialsUsed: [
      "Fongicide algicide concentré professionnel",
      "Hydrofuge perlant Dalep 2100",
      "Protections de descente pluviale"
    ],
    mainImage: "/images/chantiers/chantier-03.webp",
    beforeImage: "/images/chantiers/before-after-01.webp",
    afterImage: "/images/chantiers/chantier-03.webp",
    gallery: [
      "/images/chantiers/chantier-03.webp",
      "/images/chantiers/chantier-01.webp"
    ],
    clientReview: {
      author: "Michel L. (Uccle Fort Jaco)",
      rating: 5,
      text: "Notre toit qui avait 25 ans a retrouvé son éclat d'origine. L'effet perlant sous les averses belges est impressionnant."
    }
  },
  {
    id: "chantier-velux-nantes",
    slug: "pose-fenetres-toit-velux-solaires-bruxelles",
    title: "Création et pose de 3 fenêtres de toit Velux Tout Confort avec volets solaires",
    category: "velux",
    city: "Bruxelles",
    postalCode: "1000",
    year: 2024,
    durationDays: 2,
    roofType: "Ardoises sur voligeage",
    initialProblem: "Combles aménagés très sombres manquant de ventilation et surchauffant fortement l'été.",
    solutionApplied: "Création de 3 chevêtres sur mesure, encastrement de fenêtres de toit Velux 114x118 cm Tout Confort avec raccords zinc et volets solaires autónomes.",
    materialsUsed: [
      "Velux GGU SK06 Tout Confort blanc",
      "Volets roulants solaires Velux SSL",
      "Raccords EDL ardoise"
    ],
    mainImage: "/images/chantiers/chantier-01.webp",
    beforeImage: "/images/chantiers/before-after-01.webp",
    afterImage: "/images/chantiers/chantier-01.webp",
    gallery: [
      "/images/chantiers/chantier-01.webp"
    ],
    clientReview: {
      author: "Sophie B. (Bruxelles Woluwe)",
      rating: 5,
      text: "La luminosité apportée dans nos combles est incroyable. Les volets solaires sont hyper confortables. Travail très propre."
    }
  },
  {
    id: "chantier-fuite-vertou",
    slug: "reparation-fuite-urgence-bachage-wavre",
    title: "Intervention d'urgence dépannage fuite et bâchage post-tempête",
    category: "fuite",
    city: "Wavre",
    postalCode: "1300",
    year: 2024,
    durationDays: 1,
    roofType: "Tuiles mécaniques",
    initialProblem: "Infiltration d'eau importante au plafond après le passage d'une tempête ayant envolé 18 tuiles.",
    solutionApplied: "Intervention sous 1h30 : bâchage d'urgence armé, remplacement des tuiles manquantes et refaçonnerie du solin zinc.",
    materialsUsed: [
      "Bâche armée 250g/m²",
      "Tuiles Koramic de remplacement",
      "Mastic Sikaflex 11FC+"
    ],
    mainImage: "/images/chantiers/chantier-02.webp",
    beforeImage: "/images/chantiers/before-after-01.webp",
    afterImage: "/images/chantiers/chantier-02.webp",
    gallery: [
      "/images/chantiers/chantier-02.webp"
    ],
    clientReview: {
      author: "Antoine T. (Wavre Bierges)",
      rating: 5,
      text: "L'équipe d'astreinte est arrivée rapidement un dimanche sous des cordes de pluie pour bâcher le toit. Un grand merci !"
    }
  },
  {
    id: "chantier-isolation-carquefou",
    slug: "isolation-toiture-sarking-primes-namur",
    title: "Isolation thermique de toiture par l'extérieur (Sarking) Primes Wallonie",
    category: "isolation",
    city: "Namur",
    postalCode: "5000",
    year: 2024,
    durationDays: 7,
    roofType: "Tuiles terre cuite",
    initialProblem: "Factures de chauffage élevées et manque d'isolation dans les pièces sous-pente.",
    solutionApplied: "Pose de panneaux isolants Sarking polyuréthane de 140 mm d'épaisseur au-dessus des chevrons avec pare-vapeur et sous-toiture.",
    materialsUsed: [
      "Panneaux Recticel Sarking R=6.5 m².K/W",
      "Pare-vapeur Soprema",
      "Contre-lattage renforcé"
    ],
    mainImage: "/images/chantiers/chantier-03.webp",
    beforeImage: "/images/chantiers/before-after-01.webp",
    afterImage: "/images/chantiers/chantier-03.webp",
    gallery: [
      "/images/chantiers/chantier-03.webp"
    ],
    clientReview: {
      author: "Bernard P. (Namur Erpent)",
      rating: 5,
      text: "Grâce à l'isolation Sarking réalisée par Zlobodan, nous ressentons la différence de température immédiatement. Montage du dossier de Prime Wallonne parfait."
    }
  }
];
