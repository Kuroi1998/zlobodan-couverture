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
  heroImage: string;
  alertSymptoms: string[];
  methodologySteps: ServiceStep[];
  materialsAndBrands: {
    category: string;
    items: string[];
  }[];
  priceIndicative: {
    range: string;
    unit: string;
    factors: string[];
  };
  guarantees: string[];
  realisationIds: string[];
  faq: ServiceFAQ[];
  devisPreselectId: string;
}
