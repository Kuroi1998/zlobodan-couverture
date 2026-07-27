import { ServiceItem } from "./types";

export const insulationService: ServiceItem = {
  id: "isolation-toiture",
  slug: "isolation-toiture-combles",
  title: "Isolation de Toiture (Sarking & Combles - Primes Belgique)",
  shortDescription: "Isolation thermique de toiture par l'extérieur (sarking) ou par l'intérieur, avec accompagnement au montage des dossiers de primes régionales.",
  heroSubtitle: "30% de la chaleur s'échappe par le toit. Économisez sur vos factures de chauffage et bénéficiez des Primes Renolution (Bruxelles) et Primes Wallonie.",
  icon: "Flame",
  alertSymptoms: [
    "Surchauffe à l'étage en été et sensation de froid vif en hiver.",
    "Factures de gaz/électricité particulièrement élevées.",
    "Neige fondant très vite sur le toit par rapport aux maisons voisines.",
    "Combles perdus disposant d'un isolant ancien ou tassé."
  ],
  methodologySteps: [
    {
      number: 1,
      title: "Calcul de la résistance thermique R",
      description: "Diagnostic de la résistance thermique et préconisation de l'isolant adapté pour atteindre la conformité aux exigences des primes belges (R ≥ 4.5 à 6 m².K/W)."
    },
    {
      number: 2,
      title: "Pare-vapeur & Préparation",
      description: "Pose d'un pare-vapeur étanche à l'air continu."
    },
    {
      number: 3,
      title: "Mise en œuvre (Sarking ou Soufflage)",
      description: "Pose de panneaux isolants rigides sur les chevrons (Sarking) ou projection/soufflage de laine minérale."
    },
    {
      number: 4,
      title: "Attestation Primes Régionales",
      description: "Rédaction des pièces justificatives pour votre demande de Primes Renolution (Bruxelles) ou Primes Habitation (Wallonie)."
    }
  ],
  materialsAndBrands: [
    {
      category: "Isolants Haute Performance",
      items: ["Panneaux Polyuréthane Soprema / Recticel / Kingspan", "Laine de verre & Laine de roche Isover / Rockwool Belux", "Ouate de cellulose & Laine de bois Pavatex"]
    }
  ],
  priceFactors: [
      "La technique choisie (soufflage combles perdus vs Sarking sous toiture)",
      "L'épaisseur et la marque de l'isolant (Recticel vs Rockwool)",
      "Les travaux annexes de finition"
    ],
  guarantees: [
    "Attestations conformes Primes Renolution (Bruxelles) & Wallonie",
    "Suppression des ponts thermiques",
    "TVA à taux réduit 6% pour habitations de plus de 10 ans en Belgique"
  ],
  faq: [
    {
      question: "À combien s'élèvent les primes toiture en Belgique ?",
      answer: "Selon vos revenus et votre région (Bruxelles ou Wallonie), les primes peuvent financer de 30% à 70% du montant des travaux d'isolation de toiture. Nous vous remettons un dossier complet pour faciliter votre demande."
    },
    {
      question: "Puis-je bénéficier du taux de TVA réduit à 6% en Belgique ?",
      answer: "Oui ! En Belgique, les travaux de rénovation et d'isolation de toiture sur des logements de plus de 10 ans bénéficient du taux de TVA réduit à 6% au lieu de 21%."
    }
  ],
  devisPreselectId: "isolation"
};
