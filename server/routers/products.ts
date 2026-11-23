import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { productEntitlements, productKeyValues, reflectiveProfiles } from "../../drizzle/schema";
import { getDb } from "../db";
import { getEntitledProducts } from "../entitlements";
import { XINUS_PRODUCTS } from "../products";
import { protectedProcedure, router } from "../_core/trpc";

let productDatabaseResolver = getDb;

/** Limits resolver replacement to deterministic server tests; production uses the managed database helper. */
export function setProductsDatabaseResolverForTests(resolver?: typeof getDb) {
  productDatabaseResolver = resolver ?? getDb;
}

async function requireDb() {
  const db = await productDatabaseResolver();
  if (!db) throw new Error("XinUS product services are unavailable.");
  return db;
}

export function buildRecoveryClaimEntitlement(userId: number) {
  return { userId, productKey: "recovery" as const, payerType: "free" as const, source: "recovery_access" as const, status: "active" as const };
}

export const productsRouter = router({
  catalog: protectedProcedure.query(async ({ ctx }) => {
    const entitled = await getEntitledProducts(ctx.user.id, ctx.user.role);
    return Object.values(XINUS_PRODUCTS).map(product => ({ ...product, entitled: entitled.includes(product.key), purchasable: product.billingModel !== "free" && product.key !== "pam" }));
  }),
  access: protectedProcedure.query(async ({ ctx }) => ({ products: await getEntitledProducts(ctx.user.id, ctx.user.role) })),
  claimRecoveryAccess: protectedProcedure.input(z.object({ selfAttest: z.literal(true) })).mutation(async ({ ctx }) => {
    const db = await requireDb();
    const existing = await db.select().from(productEntitlements).where(and(eq(productEntitlements.userId, ctx.user.id), eq(productEntitlements.productKey, "recovery"), eq(productEntitlements.status, "active"))).limit(1);
    if (!existing[0]) await db.insert(productEntitlements).values(buildRecoveryClaimEntitlement(ctx.user.id));
    return { success: true, productKey: "recovery" as const };
  }),
  context: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const db = await requireDb();
      const [profile] = await db.select().from(reflectiveProfiles).where(eq(reflectiveProfiles.userId, ctx.user.id)).limit(1);
      return profile ?? { northStar: null, preferences: null, sharedAcrossProducts: true, shareNorthStar: true, sharePreferences: true, enabledProducts: productKeyValues };
    }),
    update: protectedProcedure.input(z.object({ northStar: z.string().trim().max(1000).nullable(), preferences: z.string().trim().max(2000).nullable(), sharedAcrossProducts: z.boolean(), shareNorthStar: z.boolean(), sharePreferences: z.boolean(), enabledProducts: z.array(z.enum(productKeyValues)).max(productKeyValues.length) })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const existing = await db.select().from(reflectiveProfiles).where(eq(reflectiveProfiles.userId, ctx.user.id)).limit(1);
      const values = { northStar: input.northStar, preferences: input.preferences, sharedAcrossProducts: input.sharedAcrossProducts, shareNorthStar: input.shareNorthStar, sharePreferences: input.sharePreferences, enabledProducts: input.enabledProducts };
      if (existing[0]) await db.update(reflectiveProfiles).set(values).where(eq(reflectiveProfiles.id, existing[0].id));
      else await db.insert(reflectiveProfiles).values({ userId: ctx.user.id, ...values });
      return { success: true };
    }),
  }),
});
