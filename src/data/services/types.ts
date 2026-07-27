export interface ServiceStep {
  number: number;
  title: string;
  description: string;
}

export interface ServiceFAQ {
  question: string;
  answer: string;
}

export interface ServiceItem {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  heroSubtitle: string;
  icon: string;
  alertSymptoms: string[];
  methodologySteps: ServiceStep[];
  materialsAndBrands: {
    category: string;
    items: string[];
  }[];
  /**
   * Facteurs faisant varier le prix.
   *
   * Les fourchettes chiffrées (« 90 € à 185 € par m² ») ont été retirées lors
   * de l'audit du 2026-07-27 : héritées d'un modèle français, elles ne
   * correspondaient à aucun barème vérifié de l'entreprise et s'affichaient
   * sans mention de TVA, de contenu ni de validité. Les facteurs, eux,
   * informent réellement le visiteur sans rien promettre.
   */
  priceFactors: string[];
  guarantees: string[];
  faq: ServiceFAQ[];
  devisPreselectId: string;
}
