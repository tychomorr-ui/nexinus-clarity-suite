import type { ProductKey } from "../drizzle/schema";

export type BillingModel = "individual" | "organization" | "free";

export type XinUSProduct = {
  key: ProductKey;
  name: string;
  description: string;
  route: string;
  billingModel: BillingModel;
  payerLabel: string;
  amountUsdCents?: number;
  interval?: "month";
  grants: ProductKey[];
};

/**
 * Product catalog. Recovery access is deliberately free to the participant;
 * professional/agency tools are paid by the entity using them operationally.
 */
export const XINUS_PRODUCTS: Record<ProductKey, XinUSProduct> = {
  clarity: { key: "clarity", name: "XinUS Clarity", description: "Reflective decision support and guided next actions.", route: "/clarity", billingModel: "individual", payerLabel: "Individual or sponsoring organization", amountUsdCents: 999, interval: "month", grants: ["clarity", "pam"] },
  ged_tutor: { key: "ged_tutor", name: "XinUS GED Tutor", description: "Question-led academic support for Math, RLA, Science, and Social Studies.", route: "/ged-tutor", billingModel: "individual", payerLabel: "Tutor, educator, school, or program", amountUsdCents: 1499, interval: "month", grants: ["ged_tutor", "pam"] },
  hidden_gems: { key: "hidden_gems", name: "XinUS Hidden Gems", description: "Structured image-led appraisal and collection insights.", route: "/hidden-gems", billingModel: "individual", payerLabel: "Individual collector or sponsor", amountUsdCents: 899, interval: "month", grants: ["hidden_gems"] },
  pd_pro: { key: "pd_pro", name: "XinUS PD Pro", description: "Case, deadline, and operations intelligence for public defender teams.", route: "/pd-pro", billingModel: "organization", payerLabel: "Public defender office or legal-services organization", amountUsdCents: 4900, interval: "month", grants: ["pd_pro", "pam"] },
  recovery: { key: "recovery", name: "XinUS Recovery", description: "A participant-centered reflection and recovery-support workspace.", route: "/recidivism", billingModel: "free", payerLabel: "Free to people in recovery", grants: ["recovery", "pam"] },
  task_force_pro: { key: "task_force_pro", name: "XinUS Task Force Pro", description: "Operational supervision, coordination, and risk-pattern tools.", route: "/task-force-pro", billingModel: "organization", payerLabel: "Probation, public-safety, or agency organization", amountUsdCents: 4900, interval: "month", grants: ["task_force_pro", "pam"] },
  sitrep: { key: "sitrep", name: "XinUS SitRep", description: "Situation framing for general, travel, and immigration contexts.", route: "/sitrep", billingModel: "individual", payerLabel: "Individual or sponsoring organization", amountUsdCents: 899, interval: "month", grants: ["sitrep", "pam"] },
  pam: { key: "pam", name: "XinUS PAM", description: "A clear reflective companion shared by enabled XinUS products.", route: "/pam", billingModel: "individual", payerLabel: "Included with selected XinUS products", amountUsdCents: 699, interval: "month", grants: ["pam"] },
};

export const productKeys = Object.keys(XINUS_PRODUCTS) as ProductKey[];
export const XINUS_PLUS = { key: "xinus_plus_monthly", name: "XinUS Platform", description: "Legacy all-suite subscription.", amountUsdCents: 999, interval: "month" as const };

export function getProduct(productKey: ProductKey) {
  return XINUS_PRODUCTS[productKey];
}
