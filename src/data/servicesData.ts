import { ServiceItem, ServiceStep, ServiceFAQ } from "./services/types";
import { roofingService } from "./services/roofing";
import { repairsService } from "./services/repairs";
import { cleaningService } from "./services/cleaning";
import { zincService } from "./services/zinc";
import { insulationService } from "./services/insulation";
import { veluxService } from "./services/velux";

export type { ServiceStep, ServiceFAQ, ServiceItem };

export const servicesData: ServiceItem[] = [
  roofingService,
  repairsService,
  cleaningService,
  zincService,
  insulationService,
  veluxService,
];
