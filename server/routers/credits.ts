import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { creditLedger, users } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const XC_REASONS = {
  welcome: "welcome_bonus",
  firstAppraisal: "first_appraisal_bonus",
  gemsSpend: "spend:gems_appraise",
  gemsUnreadableRefund: "refund:gems_appraise_unreadable",
  gemsUnavailableRefund: "refund:gems_appraise_unavailable",
} as const;

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "XinUS credit services are unavailable." });
  return db;
}

export async function getCreditBalance(userId: number) {
  const db = await requireDb();
  const rows = await db.select({ balance: sql<number>`coalesce(sum(${creditLedger.delta}), 0)` }).from(creditLedger).where(eq(creditLedger.userId, userId));
  return Number(rows[0]?.balance ?? 0);
}

export async function grantCredit(userId: number, amount: number, reason: string, idempotencyKey?: string) {
  const db = await requireDb();
  await db.insert(creditLedger).values({ userId, delta: amount, reason, idempotencyKey: idempotencyKey ?? null }).onDuplicateKeyUpdate({ set: { reason: sql`${creditLedger.reason}` } });
  return getCreditBalance(userId);
}

export async function spendCredit(userId: number, amount: number, reason: string) {
  const db = await requireDb();
  return db.transaction(async tx => {
    await tx.execute(sql`SELECT id FROM ${users} WHERE ${users.id} = ${userId} FOR UPDATE`);
    const rows = await tx.select({ balance: sql<number>`coalesce(sum(${creditLedger.delta}), 0)` }).from(creditLedger).where(eq(creditLedger.userId, userId));
    const balance = Number(rows[0]?.balance ?? 0);
    if (balance < amount) return { ok: false as const, balance };
    await tx.insert(creditLedger).values({ userId, delta: -amount, reason });
    return { ok: true as const, balance: balance - amount };
  });
}

export const creditsRouter = router({
  summary: protectedProcedure.query(async ({ ctx }) => {
    await grantCredit(ctx.user.id, 5, XC_REASONS.welcome, "welcome_bonus_v1");
    const db = await requireDb();
    const recent = await db.select({ delta: creditLedger.delta, reason: creditLedger.reason, createdAt: creditLedger.createdAt }).from(creditLedger).where(eq(creditLedger.userId, ctx.user.id)).orderBy(desc(creditLedger.createdAt)).limit(20);
    return { balance: await getCreditBalance(ctx.user.id), recent };
  }),
  history: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    return db.select().from(creditLedger).where(eq(creditLedger.userId, ctx.user.id)).orderBy(desc(creditLedger.createdAt)).limit(50);
  }),
  canSpend: protectedProcedure.input(z.object({ amount: z.number().int().positive() })).query(async ({ ctx, input }) => ({ balance: await getCreditBalance(ctx.user.id), amount: input.amount })),
});
