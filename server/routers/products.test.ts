import { describe, expect, it } from "vitest";
import { buildRecoveryClaimEntitlement } from "./products";
import { setProductsDatabaseResolverForTests } from "./products";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

describe("XinUS Recovery free access", () => {
  it("builds an active free Recovery entitlement without a payment source", () => {
    expect(buildRecoveryClaimEntitlement(41)).toEqual({ userId: 41, productKey: "recovery", payerType: "free", source: "recovery_access", status: "active" });
  });

  it("creates the active Recovery entitlement through the signed-in tRPC claim flow without checkout", async () => {
    const inserted: unknown[] = [];
    const db = {
      select: () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) }),
      insert: () => ({ values: async (value: unknown) => { inserted.push(value); return []; } }),
    };
    setProductsDatabaseResolverForTests(async () => db as never);
    const caller = appRouter.createCaller({ user: { id: 41, role: "user" }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    try {
      await expect(caller.products.claimRecoveryAccess({ selfAttest: true })).resolves.toEqual({ success: true, productKey: "recovery" });
      expect(inserted).toEqual([{ userId: 41, productKey: "recovery", payerType: "free", source: "recovery_access", status: "active" }]);
    } finally {
      setProductsDatabaseResolverForTests();
    }
  });

  it("persists field-level reflective-context consent and selected product destinations through tRPC", async () => {
    const inserted: unknown[] = [];
    const db = {
      select: () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) }),
      insert: () => ({ values: async (value: unknown) => { inserted.push(value); return []; } }),
    };
    setProductsDatabaseResolverForTests(async () => db as never);
    const caller = appRouter.createCaller({ user: { id: 41, role: "user" }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    try {
      await expect(caller.products.context.update({ northStar: "Complete the program", preferences: "Direct and concise", sharedAcrossProducts: true, shareNorthStar: true, sharePreferences: false, enabledProducts: ["clarity", "ged_tutor", "pam"] })).resolves.toEqual({ success: true });
      expect(inserted).toEqual([{ userId: 41, northStar: "Complete the program", preferences: "Direct and concise", sharedAcrossProducts: true, shareNorthStar: true, sharePreferences: false, enabledProducts: ["clarity", "ged_tutor", "pam"] }]);
    } finally {
      setProductsDatabaseResolverForTests();
    }
  });
});
