import { describe, expect, it } from "vitest";
import { getProduct } from "../products";
import { setBillingDependenciesForTests, validateProductCheckout } from "./billing";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

describe("XinUS standalone billing policy", () => {
  it("routes Recovery to free-access claiming rather than paid checkout", () => {
    expect(() => validateProductCheckout(getProduct("recovery"), false)).toThrow(/claim free Recovery access/i);
  });

  it("requires payer confirmation for professional organization-funded products", () => {
    expect(() => validateProductCheckout(getProduct("pd_pro"), false)).toThrow(/authorized to purchase/i);
    expect(() => validateProductCheckout(getProduct("pd_pro"), true)).not.toThrow();
    expect(() => validateProductCheckout(getProduct("task_force_pro"), true)).not.toThrow();
  });

  it("keeps PAM bundled with selected XinUS products", () => {
    expect(() => validateProductCheckout(getProduct("pam"), true)).toThrow(/included with selected XinUS products/i);
  });

  it("creates organization-funded PD Pro checkout metadata through the signed-in tRPC flow", async () => {
    const product = getProduct("pd_pro");
    const organization = { id: 82, name: "Public Defender Office", billingEmail: "billing@example.com", stripeCustomerId: null };
    let selects = 0;
    const db = {
      select: () => ({ from: () => ({ where: () => ({ limit: async () => { selects += 1; return selects === 3 ? [organization] : []; } }) }) }),
      insert: () => ({ values: () => ({ $returningId: async () => [{ id: 82 }] }) }),
      update: () => ({ set: () => ({ where: async () => [] }) }),
    };
    const sessions: unknown[] = [];
    const stripe = {
      customers: { create: async () => ({ id: "cus_pd_office" }) },
      products: { search: async () => ({ data: [{ id: "prod_pd" }] }), create: async () => ({ id: "prod_pd" }) },
      prices: { list: async () => ({ data: [{ id: "price_pd", unit_amount: product.amountUsdCents, currency: "usd", recurring: { interval: product.interval } }] }), create: async () => ({ id: "price_pd" }) },
      checkout: { sessions: { create: async (input: unknown) => { sessions.push(input); return { url: "https://checkout.example.test/session" }; } } },
      billingPortal: { sessions: { create: async () => ({ url: "https://billing.example.test" }) } },
    };
    setBillingDependenciesForTests({ database: async () => db as never, stripe: () => stripe as never });
    const caller = appRouter.createCaller({ user: { id: 41, role: "user", email: "buyer@example.com", name: "Buyer" }, req: { protocol: "https", headers: { host: "xinus.example.test" } } as TrpcContext["req"], res: {} as TrpcContext["res"] });
    try {
      await expect(caller.billing.checkoutProduct({ productKey: "pd_pro", organizationName: "Public Defender Office", payerConfirmed: true, returnPath: "/products" })).resolves.toEqual({ url: "https://checkout.example.test/session", productKey: "pd_pro" });
      expect(sessions[0]).toMatchObject({ metadata: { user_id: "41", product_key: "pd_pro", organization_id: "82", payer_type: "organization" }, subscription_data: { metadata: { product_key: "pd_pro", organization_id: "82", payer_type: "organization" } } });
    } finally {
      setBillingDependenciesForTests();
    }
  });
});
