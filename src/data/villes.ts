export interface VilleData {
  slug: string;
  name: string;
  postalCode: string;
  population: string;
  dominantRoofTypes: string[];
  heroTitle: string;
  metaTitle: string;
  metaDescription: string;
  introText: string;
  localArchitecturalContext: string;
  weatherAndRisks: string;
  servicesOfferedText: string;
  neighborhoodsServed: string[];
  faqVille: Array<{ question: string; answer: string }>;
}

export const villesData: Record<string, VilleData> = {
  "bruxelles": {
    slug: "couvreur-bruxelles",
    name: "Bruxelles",
    postalCode: "1000",
    population: "185 000 habitants (1.2M Région)",
    dominantRoofTypes: ["Ardoise naturelle d'Espagne & Eternit", "Tuiles terre cuite Koramic / Pottelberg", "Zinguerie à joint debout & mansardes"],
    heroTitle: "Couvreur-Zingueur à Bruxelles (1000) — Réfection, Urgence Fuite & Démoussage",
    metaTitle: "Couvreur-zingueur à Bruxelles (1000) | Zlobodan Couverture",
    metaDescription: "Couvreur-zingueur à Bruxelles : réfection de toiture en ardoise ou tuile, recherche de fuite, démoussage, zinguerie et fenêtres de toit. Devis établi après analyse.",
    introText: "Zlobodan Couverture-Zinguerie est le partenaire de confiance des propriétaires bruxellois pour la rénovation, l'entretien et le dépannage d'urgence de toiture. Des maisons de maître du Pentagone bruxellois aux quartiers d'Ixelles, Uccle, Schaerbeek ou Etterbeek, nos couvreurs mettent leur savoir-faire au service du bâti bruxellois.",
    localArchitecturalContext: "L'architecture bruxelloise se distingue par ses somptueuses toitures à mansardes, ses lucarnes ouvragées et ses toitures en pente raide revêtues d'ardoises naturelles ou de tuiles terre cuite belges (Koramic Pottelberg). Les maisons bourgeoises du XIXe siècle possèdent de vastes chéneaux en zinc et des gouttières encastrées nécessitant une maîtrise parfaite du façonnage et de la soudure à l'étain. Nous respectons scrupuleusement les exigences des permis d'urbanisme de la Région Bruxelloise.",
    weatherAndRisks: "Le climat océanique belge est caractérisé par des averses fréquentes et des vents du nord-ouest soutenus. L'humidité constante favorise le développement d'algues et de mousses sur les versants ombragés. De plus, les coups de vent automnaux occasionnent régulièrement des décrochages d'ardoises et des dégâts de faîtage. Les demandes urgentes liées à ces épisodes sont traitées en priorité, selon nos disponibilités.",
    servicesOfferedText: "Nos prestations à Bruxelles incluent la rénovation complète de toiture en ardoises ou tuiles belges, le démoussage avec traitement hydrofuge rénovateur perlant, la zinguerie sur mesure (gouttières encastrées, solins), l'isolation thermique du toit éligible à la Prime Renolution Bruxelles, et la pose de fenêtres de toit Velux.",
    neighborhoodsServed: ["Bruxelles Centre (Pentagone)", "Ixelles (Châtelain, Flagey)", "Uccle (Observatoire, Fort Jaco)", "Woluwe-Saint-Pierre", "Woluwe-Saint-Lambert", "Etterbeek", "Schaerbeek", "Forest"],
    faqVille: [
      {
        question: "Comment obtenir la Prime Renolution à Bruxelles pour ma toiture ?",
        answer: "La Prime Renolution de la Région de Bruxelles-Capitale finance une part importante des travaux d'isolation et de rénovation de toiture. En tant qu'entrepreneur agréé, nous vous fournissons les attestations techniques et factures conformes exigées."
      },
      {
        question: "Quel est le délai d'interventions fuite d'urgence à Bruxelles ?",
        answer: "Pour les fuites actives dans la Région Bruxelloise, nos équipes d'astreinte interviennent en moins de 2 heures pour effectuer un bâchage de protection."
      }
    ]
  },
  "waterloo": {
    slug: "couvreur-waterloo",
    name: "Waterloo",
    postalCode: "1410",
    population: "30 000 habitants",
    dominantRoofTypes: ["Ardoises clouées", "Tuiles terre cuite Koramic", "Isolation de toiture Sarking"],
    heroTitle: "Couvreur à Waterloo (1410) — Rénovation de Toiture, Zinguerie & Isolation",
    metaTitle: "Couvreur-zingueur à Waterloo (1410) | Zlobodan Couverture",
    metaDescription: "Entreprise de couverture à Waterloo : rénovation de toiture en tuile et ardoise, démoussage hydrofuge, recherche de fuite et accompagnement aux primes wallonnes.",
    introText: "Commune emblématique du Brabant Wallon, Waterloo se caractérise par un habitat résidentiel de haut standing, composé de belles villas et de propriétés arborées. Zlobodan Couverture SRL accompagne les Waterlootois dans la rénovation et la conservation durable de leur toiture.",
    localArchitecturalContext: "À Waterloo (Faubourg, Chenois, Joli-Bois), les villas pavillonnaires et demeures de prestige arborent des toitures à pentes raides en ardoises naturelles de première qualité ou en tuiles terre cuite. Les raccords de zinguerie et l'isolation thermique du toit y sont essentiels pour garantir un confort thermique optimal en hiver comme en été.",
    weatherAndRisks: "La proximité des forêts du Brabant et l'ombrage des grands arbres favorisent l'accumulation de mousses végétales. Sans traitement hydrofuge périodique, la tuile ou l'ardoise devient poreuse et craint le gel hivernal.",
    servicesOfferedText: "Réfection complète de toiture ardoise/tuile, démoussage avec hydrofuge perlant, isolation thermique Sarking éligible aux Primes Habitation de la Région Wallonne, pose de Velux avec volets solaires.",
    neighborhoodsServed: ["Waterloo Centre", "Le Faubourg", "Chenois", "Joli-Bois", "Mont-Saint-Jean"],
    faqVille: [
      {
        question: "Bénéficie-t-on des Primes Wallonnes à Waterloo ?",
        answer: "Oui, Waterloo se situant en Région Wallonne, vous pouvez bénéficier des Primes Habitation Wallonie pour l'isolation et la rénovation de toiture par notre entreprise agréée."
      }
    ]
  },
  "uccle": {
    slug: "couvreur-uccle",
    name: "Uccle",
    postalCode: "1180",
    population: "85 000 habitants",
    dominantRoofTypes: ["Ardoise naturelle", "Zinc à joint debout", "Tuiles belges Pottelberg"],
    heroTitle: "Couvreur-Zingueur à Uccle (1180) — Rénovation Toiture & Dépannage Fuite",
    metaTitle: "Couvreur-zingueur à Uccle (1180) | Zlobodan Couverture",
    metaDescription: "Couvreur à Uccle : réfection de toiture en ardoise et tuile, gouttières en zinc sur mesure, recherche de fuite et pose de fenêtres de toit.",
    introText: "Commune prisée du sud de Bruxelles, Uccle regroupe de magnifiques demeures de style Art Nouveau, des villas d'architecte et des maisons familiales d'exception. Zlobodan Couverture apporte son savoir-faire d'artisan rigoureux pour la mise en valeur et l'étanchéité des toitures uccloises.",
    localArchitecturalContext: "Des toitures élégantes du quartier de l'Observatoire aux villas du Fort Jaco ou du Prince d'Orange, la couverture en ardoise naturelle clouée et les détails de zinguerie d'art (zinc quartz, cuivre) sont omniprésents. Chaque intervention respecte le caractère architectural unique du bien.",
    weatherAndRisks: "L'humidité apportée par la forêt de Soignes voisine accentue l'encrassement des toitures et exige un nettoyage doux suivi d'un traitement hydrofuge de qualité professionnelle.",
    servicesOfferedText: "Réfection haut de gamme de toitures en ardoises, étanchéité de plateformes et zingueries, démoussage hydrofuge et installation de fenêtres de toit Velux.",
    neighborhoodsServed: ["Uccle Centre", "Observatoire", "Fort Jaco", "Prince d'Orange", "Stalle", "Calevoet"],
    faqVille: [
      {
        question: "Intervenez-vous en urgence fuite le week-end à Uccle ?",
        answer: "Signalez-nous la situation par le formulaire : les urgences de type infiltration ou dégât de tempête sont traitées en priorité, selon nos disponibilités."
      }
    ]
  },
  "wavre": {
    slug: "couvreur-wavre",
    name: "Wavre",
    postalCode: "1300",
    population: "35 000 habitants",
    dominantRoofTypes: ["Tuiles Koramic", "Ardoises", "Isolation thermique de toiture"],
    heroTitle: "Couvreur à Wavre (1300) — Toiture, démoussage et isolation",
    metaTitle: "Couvreur-zingueur à Wavre (1300) | Zlobodan Couverture",
    metaDescription: "Travaux de toiture à Wavre : rénovation de couverture, recherche de fuite, traitement anti-mousse et isolation de toiture.",
    introText: "Chef-lieu du Brabant Wallon, la ville de Wavre combine dynamisme urbain et zones pavillonnaires calmes. Zlobodan Couverture SRL est l'intervenant de choix pour tous vos travaux de couverture et d'isolation de toiture.",
    localArchitecturalContext: "À Wavre (Bierges, Limal, Louvranges), on retrouve une alternance de toitures traditionnelles en tuiles terre cuite et d'ardoises. Les projets d'isolation par l'extérieur (Sarking) y sont très recherchés pour améliorer la performance énergétique des habitations.",
    weatherAndRisks: "Les vents d'ouest et les orages estivaux occasionnent fréquemment des bris de tuiles et des engorgements de chéneaux.",
    servicesOfferedText: "Rénovation globale de toiture, isolation de toiture avec dossiers Primes Wallonnes, démoussage hydrofuge et pose de Velux.",
    neighborhoodsServed: ["Wavre Centre", "Bierges", "Limal", "Louvranges", "Bas-Wavre"],
    faqVille: [
      {
        question: "Quel est le délai pour obtenir un devis de toiture à Wavre ?",
        answer: "Nous convenons d'un rendez-vous sur place pour prendre les mesures, puis nous vous remettons un devis détaillé après analyse."
      }
    ]
  },
  "ixelles": {
    slug: "couvreur-ixelles",
    name: "Ixelles",
    postalCode: "1050",
    population: "87 000 habitants",
    dominantRoofTypes: ["Ardoise naturelle", "Zinguerie Nantaise & Bruxelles", "Fenêtres de toit Velux"],
    heroTitle: "Couvreur-Zingueur à Ixelles (1050) — Rénovation Toiture & Dépannage",
    metaTitle: "Couvreur-zingueur à Ixelles (1050) | Zlobodan Couverture",
    metaDescription: "Couvreur à Ixelles : réfection de toiture en ardoise, zinguerie de mansarde, recherche de fuite et accompagnement aux primes Renolution.",
    introText: "Au cœur de Bruxelles, la commune d'Ixelles se caractérise par un patrimoine architectural d'une grande richesse, des Étangs d'Ixelles au quartier Flagey et de la Flagey à la Porte de Namur. Zlobodan Couverture offre un service de couverture sur mesure.",
    localArchitecturalContext: "Les toitures ixelloises sont principalement composées de mansardes en ardoises clouées et de rives métalliques. L'accès au chantier nécessite souvent l'utilisation d'échafaudages spécifiques adaptés aux rues étroites.",
    weatherAndRisks: "Infiltrations d'eau au niveau des noues métalliques anciennes et des solins de cheminée.",
    servicesOfferedText: "Réfection complète de toiture ardoise, recherche et réparation de fuite, isolation sous toiture et rénovation de gouttières zinc.",
    neighborhoodsServed: ["Ixelles Centre", "Flagey", "Châtelain", "Molière", "Boondael"],
    faqVille: [
      {
        question: "Aidez-vous pour le dossier Prime Renolution à Ixelles ?",
        answer: "Oui, nous préparons l'ensemble des attestations d'entrepreneur agréé nécessaires pour votre demande de prime de la Région Bruxelloise."
      }
    ]
  },
};
