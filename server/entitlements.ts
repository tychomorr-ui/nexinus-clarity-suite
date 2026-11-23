import { and, eq, gt, inArray, isNull, or } from "drizzle-orm";
import { organizationMembers, productEntitlements, userProfiles, type ProductKey } from "../drizzle/schema";
import { getDb } from "./db";
import { productKeys } from "./products";

const activeStatuses = ["active", "trialing", "past_due"] as const;

export async function getEntitledProducts(userId: number, role?: "user" | "admin") {
  if (role === "admin") return [...productKeys];
  const db = await getDb();
  if (!db) throw new Error("XinUS entitlement data is unavailable.");
  const memberships = await db.select({ organizationId: organizationMembers.organizationId }).from(organizationMembers).where(eq(organizationMembers.userId, userId));
  const organizationIds = memberships.map(member => member.organizationId);
  const directOrOrganization = organizationIds.length
    ? or(eq(productEntitlements.userId, userId), inArray(productEntitlements.organizationId, organizationIds))
    : eq(productEntitlements.userId, userId);
  const rows = await db.select({ productKey: productEntitlements.productKey }).from(productEntitlements).where(and(directOrOrganization, inArray(productEntitlements.status, activeStatuses), or(isNull(productEntitlements.endsAt), gt(productEntitlements.endsAt, new Date()))));
  const profile = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  const legacySuite = profile[0]?.subscriptionTier === "plus" && activeStatuses.includes((profile[0]?.subscriptionStatus ?? "active") as (typeof activeStatuses)[number]);
  return Array.from(new Set([...(legacySuite ? productKeys : []), ...rows.map(row => row.productKey)]));
}

export async function hasProductAccess(userId: number, productKey: ProductKey, role?: "user" | "admin") {
  return (await getEntitledProducts(userId, role)).includes(productKey);
}
