import express, { type Express, type Request, type Response } from "express";
import { and, eq } from "drizzle-orm";
import type Stripe from "stripe";
import { productEntitlements, productKeyValues, userProfiles, type ProductKey } from "../drizzle/schema";
import { getDb } from "./db";
import { getProduct } from "./products";
import { getStripe } from "./stripe";

let stripeWebhookDatabaseResolver = getDb;

/** Limits resolver replacement to deterministic server tests; production uses the managed database helper. */
export function setStripeWebhookDatabaseResolverForTests(resolver?: typeof getDb) {
  stripeWebhookDatabaseResolver = resolver ?? getDb;
}

export function deriveProductEntitlementSync(subscription: Stripe.Subscription) {
  const productKey = subscription.metadata.product_key as ProductKey | undefined;
  if (!productKey || !productKeyValues.includes(productKey)) return null;
  const organizationId = Number(subscription.metadata.organization_id) || null;
  const payerType: "organization" | "individual" = subscription.metadata.payer_type === "organization" ? "organization" : "individual";
  const statusValue: "active" | "trialing" | "past_due" | "canceled" | "expired" = ["active", "trialing", "past_due"].includes(subscription.status) ? subscription.status as "active" | "trialing" | "past_due" : subscription.status === "canceled" ? "canceled" : "expired";
  const currentPeriodEnd = (subscription as unknown as { current_period_end?: number }).current_period_end;
  return { grants: getProduct(productKey).grants, organizationId, payerType, statusValue, priceId: subscription.items.data[0]?.price.id ?? null, endsAt: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : null };
}

export async function applySubscription(subscription: Stripe.Subscription) {
  const db = await stripeWebhookDatabaseResolver();
  if (!db) throw new Error("XinUS billing database is unavailable.");
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const userId = Number(subscription.metadata.user_id);
  if (!Number.isInteger(userId) || userId <= 0) return;
  const status = subscription.status;
  const currentPeriodEnd = (subscription as unknown as { current_period_end?: number }).current_period_end;
  const productSync = deriveProductEntitlementSync(subscription);
  if (productSync) {
    for (const grantedProduct of productSync.grants) {
      const existing = await db.select().from(productEntitlements).where(and(eq(productEntitlements.stripeSubscriptionId, subscription.id), eq(productEntitlements.productKey, grantedProduct))).limit(1);
      const update = { status: productSync.statusValue, stripePriceId: productSync.priceId, endsAt: productSync.endsAt };
      if (existing[0]) await db.update(productEntitlements).set(update).where(eq(productEntitlements.id, existing[0].id));
      else await db.insert(productEntitlements).values({ productKey: grantedProduct, userId: productSync.organizationId ? null : userId, organizationId: productSync.organizationId, payerType: productSync.payerType, source: "stripe", status: productSync.statusValue, stripeSubscriptionId: subscription.id, stripePriceId: productSync.priceId, endsAt: productSync.endsAt });
    }
    return;
  }
  const tier = ["active", "trialing", "past_due"].includes(status) ? "plus" : "core";
  const update = { stripeCustomerId: customerId, subscriptionId: subscription.id, subscriptionStatus: status, subscriptionTier: tier as "core" | "plus", subscriptionRenewsAt: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : null };
  const profile = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  if (profile[0]) await db.update(userProfiles).set(update).where(eq(userProfiles.id, profile[0].id));
  else await db.insert(userProfiles).values({ userId, ...update });
}

export function registerStripeWebhook(app: Express) {
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req: Request, res: Response) => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    const signature = req.headers["stripe-signature"];
    if (!secret || typeof signature !== "string") return res.status(400).json({ error: "Invalid webhook configuration." });
    try {
      const stripe = getStripe();
      const event = stripe.webhooks.constructEvent(req.body, signature, secret);
      if (event.id.startsWith("evt_test_")) return res.json({ verified: true });
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          await applySubscription(await stripe.subscriptions.retrieve(subscriptionId));
        }
      }
      if (["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type)) await applySubscription(event.data.object as Stripe.Subscription);
      return res.json({ received: true });
    } catch (error) {
      console.error("[XinUS Stripe webhook]", error);
      return res.status(400).json({ error: "Webhook verification failed." });
    }
  });
}
