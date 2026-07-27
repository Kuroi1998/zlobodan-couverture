export interface FAQItem {
  question: string;
  answer: string;
  category?: "prix" | "durée" | "aides" | "assurance" | "technique" | "ville" | "general";
}

export const faqData: FAQItem[] = [
  {
    question: "Quel est le prix moyen au m² pour une réfection de toiture en Belgique ?",
    answer: "Le coût d'une réfection complète de toiture en Belgique varie généralement entre 90 € et 185 € par m², fourniture et pose comprises. Ce tarif évolue selon le matériau (ardoise naturelle d'Espagne vs tuile terre cuite Koramic/Pottelberg), l'état de la charpente et les ouvrages de zinguerie sur mesure.",
    category: "prix"
  },
  {
    question: "Combien de temps dure un chantier de rénovation de toiture ?",
    answer: "Pour une habitation unifamiliale standard (100 à 140 m²), comptez entre 4 et 7 jours ouvrables de travaux. Pendant la durée du chantier, nous garantissons l'étanchéité quotidienne de votre logement grâce à des bâches étanches de protection.",
    category: "durée"
  },
  {
    question: "Quelles sont les primes toiture et isolation disponibles en Belgique ?",
    answer: "Selon la localisation de votre bien, vous pouvez bénéficier des Primes Renolution (en Région de Bruxelles-Capitale) ou des Primes Habitation (en Région Wallonne). De plus, les travaux d'isolation et de rénovation de toiture sur des habitations de plus de 10 ans bénéficient du taux de TVA réduit à 6% en Belgique.",
    category: "aides"
  },
  {
    question: "Comment fonctionne la prise en charge par l'assurance incendie lors d'une fuite ou d'une tempête ?",
    answer: "En cas de sinistre (tuiles envolées par tempête, infiltration), signalez-nous la situation : les urgences sont traitées en priorité, selon nos disponibilités. Nous établissons un rapport photographique et un devis que vous pouvez transmettre à votre compagnie d'assurance.",
    category: "assurance"
  },
  {
    question: "À quelle fréquence faut-il réaliser le démoussage d'une toiture en Belgique ?",
    answer: "Compte tenu du climat humide belge, un démoussage préventif est recommandé tous les 3 à 5 ans. Lorsqu'un traitement hydrofuge professionnel à effet perlant est appliqué, la protection de la tuile ou de l'ardoise dure plus de 10 à 15 ans.",
    category: "technique"
  },
  {
    question: "Comment s'applique la Garantie Décennale en Belgique ?",
    answer: "En Belgique, la responsabilité décennale des entrepreneurs de toiture est encadrée par la législation belge (Loi du 31 mai 2017). Elle garantit la réparation des désordres compromettant la solidité ou l'étanchéité du toit pendant 10 ans après la réception des travaux.",
    category: "assurance"
  }
];
