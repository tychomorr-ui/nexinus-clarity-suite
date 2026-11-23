import { describe, expect, it } from "vitest";
import type Stripe from "stripe";
import { applySubscription, deriveProductEntitlementSync, setStripeWebhookDatabaseResolverForTests } from "./stripeWebhook";

function subscription(metadata: Record<string, string>, status: Stripe.Subscription.Status = "active") {
  return { id: "sub_xinus", customer: "cus_xinus", metadata, status, items: { data: [{ price: { id: "price_xinus" } }] }, current_period_end: 1_792_000_000 } as unknown as Stripe.Subscription;
}

describe("XinUS Stripe entitlement synchronization", () => {
  it("maps organization-funded PD Pro subscriptions to organization-scoped product grants", () => {
    const sync = deriveProductEntitlementSync(subscription({ user_id: "4", product_key: "pd_pro", organization_id: "82", payer_type: "organization" }));
    expect(sync).toMatchObject({ organizationId: 82, payerType: "organization", statusValue: "active", priceId: "price_xinus" });
    expect(sync?.grants).toContain("pd_pro");
    expect(sync?.grants).toContain("pam");
  });

  it("maps an individual product subscription without an organization owner", () => {
    const sync = deriveProductEntitlementSync(subscription({ user_id: "4", product_key: "ged_tutor", payer_type: "individual" }, "trialing"));
    expect(sync).toMatchObject({ organizationId: null, payerType: "individual", statusValue: "trialing" });
    expect(sync?.grants).toEqual(expect.arrayContaining(["ged_tutor", "pam"]));
  });

  it("writes every granted organization entitlement from the actual subscription synchronization path", async () => {
    const inserted: unknown[] = [];
    const db = {
      select: () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) }),
      insert: () => ({ values: async (value: unknown) => { inserted.push(value); return []; } }),
      update: () => ({ set: () => ({ where: async () => [] }) }),
    };
    setStripeWebhookDatabaseResolverForTests(async () => db as never);
    try {
      await applySubscription(subscription({ user_id: "4", product_key: "pd_pro", organization_id: "82", payer_type: "organization" }));
      expect(inserted).toEqual(expect.arrayContaining([
        expect.objectContaining({ productKey: "pd_pro", organizationId: 82, userId: null, payerType: "organization", status: "active", source: "stripe" }),
        expect.objectContaining({ productKey: "pam", organizationId: 82, userId: null, payerType: "organization", status: "active", source: "stripe" }),
      ]));
    } finally {
      setStripeWebhookDatabaseResolverForTests();
    }
  });
});
