import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { organizationMembers, organizations, productEntitlements, productKeyValues, userProfiles } from "../../drizzle/schema";
import { getDb } from "../db";
import { getProduct } from "../products";
import { ensureProductPrice, ensureXinUSPlusPrice, getStripe } from "../stripe";
import { protectedProcedure, router } from "../_core/trpc";

let billingDatabaseResolver = getDb;
let billingStripeResolver = getStripe;

/** Limits dependency replacement to deterministic server tests; production uses the managed database and Stripe helpers. */
export function setBillingDependenciesForTests(dependencies?: { database?: typeof getDb; stripe?: typeof getStripe }) {
  billingDatabaseResolver = dependencies?.database ?? getDb;
  billingStripeResolver = dependencies?.stripe ?? getStripe;
}

async function requireDb() {
  const db = await billingDatabaseResolver();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "XinUS billing data is unavailable." });
  return db;
}

async function ensureProfile(userId: number) {
  const db = await requireDb();
  const profile = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  if (profile[0]) return { db, profile: profile[0] };
  await db.insert(userProfiles).values({ userId });
  const created = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  return { db, profile: created[0]! };
}

function originFromRequest(req: { headers: Record<string, string | string[] | undefined>; protocol?: string }) {
  const origin = req.headers.origin;
  if (typeof origin === "string" && /^https?:\/\//.test(origin)) return origin.replace(/\/$/, "");
  const host = req.headers["x-forwarded-host"] ?? req.headers.host;
  const forwarded = req.headers["x-forwarded-proto"];
  const protocol = typeof forwarded === "string" ? forwarded : req.protocol ?? "https";
  return `${protocol}://${typeof host === "string" ? host : "localhost"}`;
}

export function validateProductCheckout(product: ReturnType<typeof getProduct>, payerConfirmed: boolean) {
  if (product.billingModel === "free") throw new TRPCError({ code: "BAD_REQUEST", message: `${product.name} is free for people accessing recovery support; claim free Recovery access instead.` });
  if (product.key === "pam") throw new TRPCError({ code: "BAD_REQUEST", message: "PAM is included with selected XinUS products." });
  if (product.billingModel === "organization" && !payerConfirmed) throw new TRPCError({ code: "BAD_REQUEST", message: "Confirm that you are authorized to purchase this organization-funded product." });
}

export const billingRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    const { profile } = await ensureProfile(ctx.user.id);
    return { tier: profile.subscriptionTier, status: profile.subscriptionStatus, renewsAt: profile.subscriptionRenewsAt, hasCustomer: Boolean(profile.stripeCustomerId) };
  }),
  checkout: protectedProcedure.input(z.object({ returnPath: z.enum(["/account", "/pd-pro", "/pd-pro/office", "/recidivism"]).default("/account") })).mutation(async ({ ctx, input }) => {
    const { db, profile } = await ensureProfile(ctx.user.id);
    if (profile.subscriptionTier === "plus" && ["active", "trialing", "past_due"].includes(profile.subscriptionStatus ?? "")) throw new TRPCError({ code: "CONFLICT", message: "XinUS Plus is already active." });
    let stripe;
    try { stripe = billingStripeResolver(); } catch { throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "XinUS billing is temporarily unavailable." }); }
    const customerId = profile.stripeCustomerId ?? (await stripe.customers.create({ email: ctx.user.email ?? undefined, name: ctx.user.name ?? undefined, metadata: { xinus_user_id: String(ctx.user.id) } })).id;
    if (!profile.stripeCustomerId) await db.update(userProfiles).set({ stripeCustomerId: customerId }).where(eq(userProfiles.id, profile.id));
    const priceId = await ensureXinUSPlusPrice(stripe);
    const origin = originFromRequest(ctx.req);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}${input.returnPath}?billing=success`,
      cancel_url: `${origin}${input.returnPath}?billing=cancel`,
      allow_promotion_codes: true,
      client_reference_id: String(ctx.user.id),
      metadata: { user_id: String(ctx.user.id), customer_email: ctx.user.email ?? "", customer_name: ctx.user.name ?? "" },
      subscription_data: { metadata: { user_id: String(ctx.user.id) } },
    });
    if (!session.url) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "XinUS could not start Checkout." });
    return { url: session.url };
  }),
  portal: protectedProcedure.mutation(async ({ ctx }) => {
    const { profile } = await ensureProfile(ctx.user.id);
    if (!profile.stripeCustomerId) throw new TRPCError({ code: "BAD_REQUEST", message: "No XinUS billing record exists yet." });
    const stripe = billingStripeResolver();
    const portal = await stripe.billingPortal.sessions.create({ customer: profile.stripeCustomerId, return_url: `${originFromRequest(ctx.req)}/account` });
    return { url: portal.url };
  }),
  checkoutProduct: protectedProcedure.input(z.object({
    productKey: z.enum(productKeyValues),
    returnPath: z.enum(["/products", "/account", "/pd-pro", "/ged-tutor", "/hidden-gems", "/recidivism", "/sitrep", "/pam", "/pam"]).default("/products"),
    organizationName: z.string().trim().min(2).max(255).optional(),
    payerConfirmed: z.boolean().default(false),
  })).mutation(async ({ ctx, input }) => {
    const product = getProduct(input.productKey);
    validateProductCheckout(product, input.payerConfirmed);
    const db = await requireDb();
    const active = await db.select().from(productEntitlements).where(and(eq(productEntitlements.userId, ctx.user.id), eq(productEntitlements.productKey, product.key), eq(productEntitlements.status, "active"))).limit(1);
    if (active[0]) throw new TRPCError({ code: "CONFLICT", message: `${product.name} is already active for your account.` });
    let stripe;
    try { stripe = billingStripeResolver(); } catch { throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "XinUS billing is temporarily unavailable." }); }
    let organizationId: number | undefined;
    let customerId: string;
    if (product.billingModel === "organization") {
      const member = await db.select({ organizationId: organizationMembers.organizationId }).from(organizationMembers).where(eq(organizationMembers.userId, ctx.user.id)).limit(1);
      let organization = member[0] ? (await db.select().from(organizations).where(eq(organizations.id, member[0].organizationId)).limit(1))[0] : undefined;
      if (!organization) {
        if (!input.organizationName) throw new TRPCError({ code: "BAD_REQUEST", message: "Enter the purchasing organization’s name for this professional product." });
        const ids = await db.insert(organizations).values({ name: input.organizationName, billingEmail: ctx.user.email ?? null }).$returningId();
        organization = (await db.select().from(organizations).where(eq(organizations.id, ids[0]!.id)).limit(1))[0]!;
        await db.insert(organizationMembers).values({ organizationId: organization.id, userId: ctx.user.id, role: "owner" });
      }
      organizationId = organization.id;
      customerId = organization.stripeCustomerId ?? (await stripe.customers.create({ email: organization.billingEmail ?? ctx.user.email ?? undefined, name: organization.name, metadata: { xinus_organization_id: String(organization.id), purchaser_user_id: String(ctx.user.id) } })).id;
      if (!organization.stripeCustomerId) await db.update(organizations).set({ stripeCustomerId: customerId }).where(eq(organizations.id, organization.id));
    } else {
      const { db: profileDb, profile } = await ensureProfile(ctx.user.id);
      customerId = profile.stripeCustomerId ?? (await stripe.customers.create({ email: ctx.user.email ?? undefined, name: ctx.user.name ?? undefined, metadata: { xinus_user_id: String(ctx.user.id) } })).id;
      if (!profile.stripeCustomerId) await profileDb.update(userProfiles).set({ stripeCustomerId: customerId }).where(eq(userProfiles.id, profile.id));
    }
    const priceId = await ensureProductPrice(product.key, stripe);
    const origin = originFromRequest(ctx.req);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}${input.returnPath}?billing=success&product=${product.key}`,
      cancel_url: `${origin}${input.returnPath}?billing=cancel&product=${product.key}`,
      allow_promotion_codes: true,
      client_reference_id: String(ctx.user.id),
      metadata: { user_id: String(ctx.user.id), product_key: product.key, organization_id: organizationId ? String(organizationId) : "", payer_type: product.billingModel === "organization" ? "organization" : "individual" },
      subscription_data: { metadata: { user_id: String(ctx.user.id), product_key: product.key, organization_id: organizationId ? String(organizationId) : "", payer_type: product.billingModel === "organization" ? "organization" : "individual" } },
    });
    if (!session.url) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "XinUS could not start product Checkout." });
    return { url: session.url, productKey: product.key };
  }),
});
