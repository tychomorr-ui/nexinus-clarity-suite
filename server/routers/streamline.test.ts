import { describe, expect, it } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import { setCompletionResolverForTests, setSuiteDatabaseResolverForTests } from "./suite";

describe("XinUS Streamline", () => {
  const caller = () => appRouter.createCaller({ user: { id: 41, role: "user" }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });

  it("returns a review-required local draft without persisting user intake", async () => {
    setCompletionResolverForTests(async () => "## Intake facts\n- supplied note\n\n## Human review\n- confirm before acting");
    try {
      await expect(caller().suite.streamline.draft({ productKey: "clarity", intake: "Prioritize a call", desiredOutcome: "Choose a safe next step" })).resolves.toMatchObject({ productKey: "clarity", requiresHumanReview: true, draft: expect.stringContaining("Human review") });
    } finally {
      setCompletionResolverForTests();
    }
  });

  it("persists a follow-through item only after explicit confirmation", async () => {
    const writes: unknown[] = [];
    const db = { insert: () => ({ values: (value: unknown) => { writes.push(value); return { $returningId: async () => [{ id: 91 }] }; } }) };
    setSuiteDatabaseResolverForTests(async () => db as never);
    try {
      await expect(caller().suite.streamline.accept({ productKey: "clarity", title: "Review call context", details: "Check facts first", confirmed: true })).resolves.toEqual({ id: 91, accepted: true });
      expect(writes[0]).toMatchObject({ kind: "human_reviewed_follow_up", metadata: { source: "xinus_streamline", humanReviewed: true } });
    } finally {
      setSuiteDatabaseResolverForTests();
    }
  });

  it("keeps sensitive product follow-through out of the cross-product queue by default", async () => {
    const records = [
      { id: 1, productKey: "clarity", kind: "human_reviewed_follow_up", title: "Review decision", updatedAt: new Date() },
      { id: 2, productKey: "pd_pro", kind: "human_reviewed_follow_up", title: "Protected case task", updatedAt: new Date() },
    ];
    const db = { select: () => ({ from: () => ({ where: () => ({ orderBy: () => ({ limit: async () => records }) }) }) }) };
    setSuiteDatabaseResolverForTests(async () => db as never);
    try {
      await expect(caller().suite.streamline.queue()).resolves.toEqual([expect.objectContaining({ id: 1, productKey: "clarity" })]);
      await expect(caller().suite.streamline.queue({ includeSensitive: true })).resolves.toHaveLength(2);
    } finally {
      setSuiteDatabaseResolverForTests();
    }
  });
});
