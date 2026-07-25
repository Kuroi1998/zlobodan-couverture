export interface VilleData {
  slug: string;
  name: string;
  postalCode: string;
  distanceFromBase: string;
  population: string;
  dominantRoofTypes: string[];
  heroTitle: string;
  metaTitle: string;
  metaDescription: string;
  introText: string;
  localArchitecturalContext: string;
  weatherAndRisks: string;
  servicesOfferedText: string;
  localRealisationsSummary: string;
  neighborhoodsServed: string[];
  faqVille: Array<{ question: string; answer: string }>;
}

export const villesData: Record<string, VilleData> = {
  "bruxelles": {
    slug: "couvreur-bruxelles",
    name: "Bruxelles",
    postalCode: "1000",
    distanceFromBase: "Siège social (Intervention ultra-rapide sous 1h à 2h)",
    population: "185 000 habitants (1.2M Région)",
    dominantRoofTypes: ["Ardoise naturelle d'Espagne & Eternit", "Tuiles terre cuite Koramic / Pottelberg", "Zinguerie à joint debout & mansardes"],
    heroTitle: "Couvreur-Zingueur à Bruxelles (1000) — Réfection, Urgence Fuite & Démoussage",
    metaTitle: "Couvreur Bruxelles (1000, 1050, 1180) | Devis Gratuit 48h - Zlobodan BE",
    metaDescription: "Artisan couvreur-zingueur agréé à Bruxelles (1000, Ixelles, Uccle, Woluwe). Réfection toiture ardoise/tuile, dépannage fuite 24/7, primes Renolution & Velux. Devis sous 48h.",
    introText: "Implantée au cœur de la Région de Bruxelles-Capitale, l'entreprise Zlobodan Couverture SRL est le partenaire de confiance des propriétaires bruxellois pour la rénovation, l'entretien et le dépannage d'urgence de toiture. Des maisons de maître du Pentagone bruxellois aux quartiers d'Ixelles, Uccle, Schaerbeek ou Etterbeek, nos artisans couvreurs agréés en Belgique mettent leur savoir-faire au service du bâti bruxellois.",
    localArchitecturalContext: "L'architecture bruxelloise se distingue par ses somptueuses toitures à mansardes, ses lucarnes ouvragées et ses toitures en pente raide revêtues d'ardoises naturelles ou de tuiles terre cuite belges (Koramic Pottelberg). Les maisons bourgeoises du XIXe siècle possèdent de vastes chéneaux en zinc et des gouttières encastrées nécessitant une maîtrise parfaite du façonnage et de la soudure à l'étain. Nous respectons scrupuleusement les exigences des permis d'urbanisme de la Région Bruxelloise.",
    weatherAndRisks: "Le climat océanique belge est caractérisé par des averses fréquentes et des vents du nord-ouest soutenus. L'humidité constante favorise le développement d'algues et de mousses sur les versants ombragés. De plus, les coups de vent automnaux occasionnent régulièrement des décrochages d'ardoises et des dégâts de faîtage. C'est pourquoi nous disposons d'une équipe d'astreinte d'urgence fuite 24/7 dans toutes les communes bruxelloises.",
    servicesOfferedText: "Nos prestations à Bruxelles incluent la rénovation complète de toiture en ardoises ou tuiles belges, le démoussage avec traitement hydrofuge rénovateur perlant, la zinguerie sur mesure (gouttières encastrées, solins), l'isolation thermique du toit éligible à la Prime Renolution Bruxelles, et la pose de fenêtres de toit Velux.",
    localRealisationsSummary: "Nos derniers chantiers bruxellois : la réfection d'une toiture mansardée de 160 m² à Ixelles, la rénovation de zingueries et gouttières sur une maison de maître quartier Châtelain, et le dépannage fuite d'urgence à Uccle.",
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
    distanceFromBase: "18 km (20 minutes)",
    population: "30 000 habitants",
    dominantRoofTypes: ["Ardoises clouées", "Tuiles terre cuite Koramic", "Isolation de toiture Sarking"],
    heroTitle: "Couvreur à Waterloo (1410) — Rénovation de Toiture, Zinguerie & Isolation",
    metaTitle: "Couvreur Waterloo (1410) | Toiture, Fuite & Devis Gratuit - Zlobodan BE",
    metaDescription: "Entreprise de couverture agréée à Waterloo (1410). Rénovation toiture tuile et ardoise, démoussage hydrofuge, dépannage fuite 24h/7j & primes Wallonie. Devis gratuit.",
    introText: "Commune emblématique du Brabant Wallon, Waterloo se caractérise par un habitat résidentiel de haut standing, composé de belles villas et de propriétés arborées. Zlobodan Couverture SRL accompagne les Waterlootois dans la rénovation et la conservation durable de leur toiture.",
    localArchitecturalContext: "À Waterloo (Faubourg, Chenois, Joli-Bois), les villas pavillonnaires et demeures de prestige arborent des toitures à pentes raides en ardoises naturelles de première qualité ou en tuiles terre cuite. Les raccords de zinguerie et l'isolation thermique du toit y sont essentiels pour garantir un confort thermique optimal en hiver comme en été.",
    weatherAndRisks: "La proximité des forêts du Brabant et l'ombrage des grands arbres favorisent l'accumulation de mousses végétales. Sans traitement hydrofuge périodique, la tuile ou l'ardoise devient poreuse et craint le gel hivernal.",
    servicesOfferedText: "Réfection complète de toiture ardoise/tuile, démoussage avec hydrofuge perlant, isolation thermique Sarking éligible aux Primes Habitation de la Région Wallonne, pose de Velux avec volets solaires.",
    localRealisationsSummary: "Rénovation complète d'une toiture de 210 m² à Waterloo Faubourg avec ardoises d'Espagne Cupa et isolation Sarking haute performance.",
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
    distanceFromBase: "8 km (12 minutes)",
    population: "85 000 habitants",
    dominantRoofTypes: ["Ardoise naturelle", "Zinc à joint debout", "Tuiles belges Pottelberg"],
    heroTitle: "Couvreur-Zingueur à Uccle (1180) — Rénovation Toiture & Dépannage Fuite",
    metaTitle: "Couvreur Uccle (1180) | Devis Toiture Gratuit - Zlobodan Couverture BE",
    metaDescription: "Artisan couvreur agréé à Uccle (1180). Réfection toiture ardoise & tuile, gouttières zinc sur mesure, dépannage fuite 24/7 & Velux. Devis sous 48h.",
    introText: "Commune prisée du sud de Bruxelles, Uccle regroupe de magnifiques demeures de style Art Nouveau, des villas d'architecte et des maisons familiales d'exception. Zlobodan Couverture apporte son savoir-faire d'artisan rigoureux pour la mise en valeur et l'étanchéité des toitures uccloises.",
    localArchitecturalContext: "Des toitures élégantes du quartier de l'Observatoire aux villas du Fort Jaco ou du Prince d'Orange, la couverture en ardoise naturelle clouée et les détails de zinguerie d'art (zinc quartz, cuivre) sont omniprésents. Chaque intervention respecte le caractère architectural unique du bien.",
    weatherAndRisks: "L'humidité apportée par la forêt de Soignes voisine accentue l'encrassement des toitures et exige un nettoyage doux suivi d'un traitement hydrofuge de qualité professionnelle.",
    servicesOfferedText: "Réfection haut de gamme de toitures en ardoises, étanchéité de plateformes et zingueries, démoussage hydrofuge et installation de fenêtres de toit Velux.",
    localRealisationsSummary: "Réhabilitation complète d'une toiture à mansardes avec zingueries en zinc vieilli quartier Observatoire à Uccle.",
    neighborhoodsServed: ["Uccle Centre", "Observatoire", "Fort Jaco", "Prince d'Orange", "Stalle", "Calevoet"],
    faqVille: [
      {
        question: "Intervenez-vous en urgence fuite le week-end à Uccle ?",
        answer: "Oui, nous assurons une permanence d'urgence fuite et bâchage 24h/24 et 7j/7 dans toute la commune d'Uccle au 0470 12 34 56."
      }
    ]
  },
  "wavre": {
    slug: "couvreur-wavre",
    name: "Wavre",
    postalCode: "1300",
    distanceFromBase: "25 km (25 minutes)",
    population: "35 000 habitants",
    dominantRoofTypes: ["Tuiles Koramic", "Ardoises", "Isolation thermique de toiture"],
    heroTitle: "Couvreur à Wavre (1300) — Toiture, Démoussage & Isolation RGE Wallonie",
    metaTitle: "Couvreur Wavre (1300) | Travaux Toiture & Devis Gratuit - Zlobodan BE",
    metaDescription: "Spécialiste de la toiture à Wavre (1300). Rénovation couverture, recherche fuite express, traitement anti-mousse et isolation. Entreprise agréée Belgique.",
    introText: "Chef-lieu du Brabant Wallon, la ville de Wavre combine dynamisme urbain et zones pavillonnaires calmes. Zlobodan Couverture SRL est l'intervenant de choix pour tous vos travaux de couverture et d'isolation de toiture.",
    localArchitecturalContext: "À Wavre (Bierges, Limal, Louvranges), on retrouve une alternance de toitures traditionnelles en tuiles terre cuite et d'ardoises. Les projets d'isolation par l'extérieur (Sarking) y sont très recherchés pour améliorer la performance énergétique des habitations.",
    weatherAndRisks: "Les vents d'ouest et les orages estivaux occasionnent fréquemment des bris de tuiles et des engorgements de chéneaux.",
    servicesOfferedText: "Rénovation globale de toiture, isolation de toiture avec dossiers Primes Wallonnes, démoussage hydrofuge et pose de Velux.",
    localRealisationsSummary: "Remplacement de couverture tuiles et isolation de combles sur une maison individuelle à Bierges (Wavre).",
    neighborhoodsServed: ["Wavre Centre", "Bierges", "Limal", "Louvranges", "Bas-Wavre"],
    faqVille: [
      {
        question: "Quel est le délai pour obtenir un devis de toiture à Wavre ?",
        answer: "Notre métreur se déplace gratuitement à Wavre et vous remet un devis détaillé sous 48 heures."
      }
    ]
  },
  "ixelles": {
    slug: "couvreur-ixelles",
    name: "Ixelles",
    postalCode: "1050",
    distanceFromBase: "Siège de proximité",
    population: "87 000 habitants",
    dominantRoofTypes: ["Ardoise naturelle", "Zinguerie Nantaise & Bruxelles", "Fenêtres de toit Velux"],
    heroTitle: "Couvreur-Zingueur à Ixelles (1050) — Rénovation Toiture & Dépannage",
    metaTitle: "Couvreur Ixelles (1050) | Devis Gratuit & Urgence - Zlobodan Couverture BE",
    metaDescription: "Couvreur professionnel à Ixelles (1050). Réfection toiture ardoise, zinguerie mansardée, recherche de fuite urgente & Primes Renolution. Devis gratuit.",
    introText: "Au cœur de Bruxelles, la commune d'Ixelles se caractérise par un patrimoine architectural d'une grande richesse, des Étangs d'Ixelles au quartier Flagey et de la Flagey à la Porte de Namur. Zlobodan Couverture offre un service de couverture sur mesure.",
    localArchitecturalContext: "Les toitures ixelloises sont principalement composées de mansardes en ardoises clouées et de rives métalliques. L'accès au chantier nécessite souvent l'utilisation d'échafaudages spécifiques adaptés aux rues étroites.",
    weatherAndRisks: "Infiltrations d'eau au niveau des noues métalliques anciennes et des solins de cheminée.",
    servicesOfferedText: "Réfection complète de toiture ardoise, dépannage fuite 24/7, isolation sous toiture et rénovation de gouttières zinc.",
    localRealisationsSummary: "Réfection d'une toiture mansardée en ardoises naturelles d'Espagne quartier Flagey à Ixelles.",
    neighborhoodsServed: ["Ixelles Centre", "Flagey", "Châtelain", "Molière", "Boondael"],
    faqVille: [
      {
        question: "Aidez-vous pour le dossier Prime Renolution à Ixelles ?",
        answer: "Oui, nous préparons l'ensemble des attestations d'entrepreneur agréé nécessaires pour votre demande de prime de la Région Bruxelloise."
      }
    ]
  },
  "namur": {
    slug: "couvreur-namur",
    name: "Namur",
    postalCode: "5000",
    distanceFromBase: "50 km (40 minutes via E411)",
    population: "112 000 habitants",
    dominantRoofTypes: ["Ardoise naturelle d'Espagne", "Tuiles terre cuite", "Zinguerie de Meuse"],
    heroTitle: "Couvreur à Namur (5000) — Réfection de Toiture, Fuite & Démoussage",
    metaTitle: "Couvreur Namur (5000) | Toiture, Fuite & Devis Gratuit - Zlobodan BE",
    metaDescription: "Artisan couvreur agréé à Namur (5000, Jambes, Erpent). Réfection toiture ardoise & tuile, dépannage fuite 24h/7j, primes Wallonie. Devis rapide 48h.",
    introText: "Capitale de la Wallonie, Namur est une cité historique bordée par la Meuse et la Sambre. Zlobodan Couverture SRL intervient dans toute l'agglomération namuroise pour la protection et la rénovation des toitures.",
    localArchitecturalContext: "Du centre historique de Namur à Jambes, Erpent ou Wépion, l'ardoise naturelle de haute qualité est le matériau noble par excellence, associée à des zingueries robustes face aux intempéries de la vallée mosane.",
    weatherAndRisks: "Précipitations et humidité des vallées nécessitant un entretien anti-mousse régulier.",
    servicesOfferedText: "Réfection toiture ardoise/tuile, démoussage hydrofuge perlant, isolation thermique de toiture et pose de Velux.",
    localRealisationsSummary: "Renouvellement complet de toiture en ardoises naturelles avec isolation Sarking à Erpent (Namur).",
    neighborhoodsServed: ["Namur Centre", "Jambes", "Erpent", "Wépion", "Bouge", "Salzinnes"],
    faqVille: [
      {
        question: "Intervenez-vous sur les toitures anciennes à Namur ?",
        answer: "Tout à fait. Nos artisans maîtrisent la pose traditionnelle d'ardoises et le façonnage de zinguerie sur bâtiment ancien."
      }
    ]
  },
  "liege": {
    slug: "couvreur-liege",
    name: "Liège",
    postalCode: "4000",
    distanceFromBase: "Zone d'intervention extended (E40)",
    population: "195 000 habitants",
    dominantRoofTypes: ["Ardoises d'Espagne", "Tuiles belges", "Zinc à joint debout"],
    heroTitle: "Couvreur à Liège (4000) — Rénovation de Toiture & Dépannage Fuite",
    metaTitle: "Couvreur Liège (4000) | Devis Gratuit Toiture - Zlobodan BE",
    metaDescription: "Entreprise de couverture à Liège (4000). Rénovation toiture tuile et ardoise, urgence fuite, isolation RGE Primes Wallonie. Devis sous 48h.",
    introText: "Cité ardente de Wallonie, Liège présente un bâti urbain et côtoie des reliefs collinaires prononcés. Zlobodan Couverture SRL met son expérience à disposition des propriétaires liégeois.",
    localArchitecturalContext: "Toitures en pente forte revêtues d'ardoises clouées et gouttières demi-rondes ou encastrées en zinc.",
    weatherAndRisks: "Gels hivernaux fréquents rendant impératif le traitement hydrofuge anti-porosité.",
    servicesOfferedText: "Rénovation de toitures ardoises/tuiles, urgence fuite, isolation thermique et pose de Velux.",
    localRealisationsSummary: "Rénovation de toiture ardoise et zinguerie neuve quartier Cointe à Liège.",
    neighborhoodsServed: ["Liège Centre", "Cointe", "Guillemins", "Outremeuse", "Chênée", "Grivegnée"],
    faqVille: [
      {
        question: "Les devis sont-ils gratuits à Liège ?",
        answer: "Oui, nos devis et déplacements de diagnostic toiture sont 100% gratuits à Liège et en Région liégeoise."
      }
    ]
  }
};
