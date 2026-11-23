import { describe, expect, it } from "vitest";
import { vi } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import { assertProductAccess, canonicalizeBlueprintReceipt, classifyTranscend, extractPdActions, hashBlueprintReceipt, isUnlimitedPrivateDeployment, renderTranscend, requireProductEntitlement, setCompletionResolverForTests, setCreditResolversForTests, setModelResolverForTests, setProductAccessResolverForTests, setSuiteDatabaseResolverForTests, setSupervisionAccessResolverForTests, transcendSystemPrompt } from "./suite";
import { storagePut } from "../storage";

vi.mock("../storage", () => ({
  storagePut: vi.fn(async () => ({ key: "hidden-gems/41/photo.png", url: "/manus-storage/hidden-gems/41/photo.png" })),
}));

describe("XinUS deterministic workflows", () => {
  const receiptFor = (sessionId: string) => ({
    session_id: sessionId,
    original_proposition: "I will complete the review.",
    contradiction_summary: "I keep delaying the review.",
    dominant_tactic: "DELAY_SUBSTITUTION",
    tactic_tally: { DELAY_SUBSTITUTION: 1 },
    total_turns: 0,
    terminal_state: "COMMITTED" as const,
    completion_type: "BOUNDED_ACTION" as const,
    bounded_action: "Complete the review",
    constraint: "Before the next check-in",
    verification_gate: "Review is marked complete",
    generated_at: 1792320000000,
  });

  it("classifies the original Transcend concern categories deterministically", () => {
    expect(classifyTranscend("I keep putting off filing the motion until tomorrow.")).toBe("avoidance");
    expect(classifyTranscend("I am afraid the conversation will go badly.")).toBe("fear");
    expect(classifyTranscend("I am torn between two options and cannot decide.")).toBe("indecision");
    expect(classifyTranscend("I am spiraling into analysis paralysis.")).toBe("overthinking");
    expect(classifyTranscend("I always ruin every opportunity.")).toBe("misframing");
    expect(classifyTranscend("I am grateful that I can take the next step.")).toBe("affirmation");
    expect(classifyTranscend("There is a situation I need to frame.")).toBe("unclear");
    expect(renderTranscend("I am spiraling into overthinking.")).toContain("overthinking");
    expect(renderTranscend("I am spiraling into overthinking.")).toContain("### Signal");
    expect(renderTranscend("I am spiraling into overthinking.")).toContain("### Next move");
    expect(transcendSystemPrompt("overthinking")).toContain("Signal, Tension, Reframe, and Next move");
    expect(transcendSystemPrompt("overthinking")).toContain('"overthinking"');
  });

  it("extracts action-oriented PD tasks and written deadlines from case notes", () => {
    const actions = extractPdActions("Call client tomorrow. File motion to suppress by April 30. Review discovery.");
    expect(actions.tasks).toEqual(expect.arrayContaining(["Call client tomorrow", "File motion to suppress by April 30", "Review discovery"]));
    expect(actions.deadlines).toHaveLength(1);
    expect(actions.deadlines[0]?.label).toContain("April 30");
  });

  it("rejects anonymous requests before any protected suite workflow is reached", async () => {
    const caller = appRouter.createCaller({ user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    await expect(caller.suite.usage.summary()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("deletes only a signed-in user's Clarity history record through the protected route", async () => {
    let deleted = false;
    const db = { delete: () => ({ where: async () => { deleted = true; } }) };
    setSuiteDatabaseResolverForTests(async () => db as never);
    const caller = appRouter.createCaller({ user: { id: 41, role: "user" }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    try {
      await expect(caller.suite.clarity.deleteHistory({ conversationId: 77 })).resolves.toEqual({ success: true });
      expect(deleted).toBe(true);
    } finally {
      setSuiteDatabaseResolverForTests();
    }
  });

  it("rejects a tampered Blueprint Truth Ledger hash before any database write", async () => {
    let inserted = false;
    const auditEvents: unknown[] = [];
    const db = { insert: () => ({ values: (value: unknown) => {
      if ((value as { eventType?: string }).eventType) { auditEvents.push(value); return Promise.resolve(); }
      inserted = true;
      throw new Error("Truth Ledger write must not run");
    } }) };
    setSuiteDatabaseResolverForTests(async () => db as never);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const caller = appRouter.createCaller({ user: { id: 41, role: "user" }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    const envelope = receiptFor("clarity-11111111-1111-4111-8111-111111111111");
    try {
      await expect(caller.suite.clarity.saveBlueprintReceipt({ sessionId: envelope.session_id, envelope, receiptHash: "0".repeat(64) })).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(inserted).toBe(false);
      expect(auditEvents).toHaveLength(1);
      expect(auditEvents[0]).toMatchObject({ eventType: "TAMPER_ATTEMPT", sessionId: envelope.session_id, clientHash: "0".repeat(64) });
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("TAMPER_ATTEMPT"), expect.objectContaining({ sessionId: envelope.session_id }));
    } finally {
      errorSpy.mockRestore();
      setSuiteDatabaseResolverForTests();
    }
  });

  it("stores two distinct Blueprint sessions without overwriting either receipt", async () => {
    const writes: unknown[] = [];
    let conversationId = 100;
    const db = {
      select: () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) }),
      insert: () => ({
        values: (value: unknown) => {
          writes.push(value);
          if (!Array.isArray(value) && (value as { kind?: string }).kind === "clarity") return { $returningId: async () => [{ id: conversationId++ }] };
          return Promise.resolve();
        },
      }),
    };
    setSuiteDatabaseResolverForTests(async () => db as never);
    const caller = appRouter.createCaller({ user: { id: 41, role: "user" }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    const first = receiptFor("clarity-22222222-2222-4222-8222-222222222222");
    const second = receiptFor("clarity-33333333-3333-4333-8333-333333333333");
    try {
      await expect(caller.suite.clarity.saveBlueprintReceipt({ sessionId: first.session_id, envelope: first, receiptHash: hashBlueprintReceipt(first) })).resolves.toMatchObject({ sessionId: first.session_id });
      await expect(caller.suite.clarity.saveBlueprintReceipt({ sessionId: second.session_id, envelope: second, receiptHash: hashBlueprintReceipt(second) })).resolves.toMatchObject({ sessionId: second.session_id });
      const ledgerWrites = writes.filter(value => !Array.isArray(value) && (value as { sessionId?: string }).sessionId && !(value as { eventType?: string }).eventType);
      expect(ledgerWrites).toHaveLength(2);
      expect(new Set(ledgerWrites.map(value => (value as { sessionId: string }).sessionId))).toEqual(new Set([first.session_id, second.session_id]));
      expect(canonicalizeBlueprintReceipt(first)).not.toBe(canonicalizeBlueprintReceipt(second));
    } finally {
      setSuiteDatabaseResolverForTests();
    }
  });

  it("accepts an exact receipt replay without duplicating the Truth Ledger row", async () => {
    const writes: unknown[] = [];
    let stored: Record<string, unknown> | null = null;
    const db = {
      select: () => ({ from: () => ({ where: () => ({ limit: async () => stored ? [stored] : [] }) }) }),
      insert: () => ({
        values: (value: unknown) => {
          writes.push(value);
          if ((value as { eventType?: string }).eventType) return Promise.resolve();
          if ((value as { canonicalPayload?: string }).canonicalPayload) {
            stored = { ...(value as Record<string, unknown>), createdAt: new Date(1792320000000) };
            return Promise.resolve();
          }
          return { $returningId: async () => [{ id: 101 }] };
        },
      }),
    };
    setSuiteDatabaseResolverForTests(async () => db as never);
    const caller = appRouter.createCaller({ user: { id: 41, role: "user" }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    const envelope = receiptFor("clarity-44444444-4444-4444-8444-444444444444");
    const request = { sessionId: envelope.session_id, envelope, receiptHash: hashBlueprintReceipt(envelope) };
    try {
      await expect(caller.suite.clarity.saveBlueprintReceipt(request)).resolves.toMatchObject({ sessionId: envelope.session_id, receiptHash: request.receiptHash });
      await expect(caller.suite.clarity.saveBlueprintReceipt(request)).resolves.toMatchObject({ sessionId: envelope.session_id, receiptHash: request.receiptHash });
      expect(writes.filter(value => !Array.isArray(value) && (value as { canonicalPayload?: string }).canonicalPayload)).toHaveLength(1);
      expect(writes.filter(value => (value as { eventType?: string }).eventType)).toHaveLength(1);
      expect(writes.filter(value => (value as { eventType?: string }).eventType === "RECEIPT_ACCEPTED")).toHaveLength(1);
    } finally {
      setSuiteDatabaseResolverForTests();
    }
  });

  it("handles ten simultaneous identical receipt submissions with one ledger row and one accepted audit event", async () => {
    const writes: unknown[] = [];
    const committedLedgerRows: unknown[] = [];
    let stored: Record<string, unknown> | null = null;
    const db = {
      select: () => ({ from: () => ({ where: () => ({ limit: async () => stored ? [stored] : [] }) }) }),
      insert: () => ({
        values: (value: unknown) => {
          writes.push(value);
          if ((value as { eventType?: string }).eventType) return Promise.resolve();
          if ((value as { canonicalPayload?: string }).canonicalPayload) {
            if (stored) return Promise.reject({ errno: 1062, message: "Duplicate entry" });
            stored = { ...(value as Record<string, unknown>), createdAt: new Date(1792320000000) };
            committedLedgerRows.push(stored);
            return Promise.resolve();
          }
          return { $returningId: async () => [{ id: 102 }] };
        },
      }),
    };
    setSuiteDatabaseResolverForTests(async () => db as never);
    const caller = appRouter.createCaller({ user: { id: 41, role: "user" }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    const envelope = receiptFor("clarity-55555555-5555-4555-8555-555555555555");
    const request = { sessionId: envelope.session_id, envelope, receiptHash: hashBlueprintReceipt(envelope) };
    try {
      const results = await Promise.all(Array.from({ length: 10 }, () => caller.suite.clarity.saveBlueprintReceipt(request)));
      expect(results).toHaveLength(10);
      expect(results.every(result => result.sessionId === envelope.session_id && result.receiptHash === request.receiptHash)).toBe(true);
      expect(committedLedgerRows).toHaveLength(1);
      expect(writes.filter(value => (value as { eventType?: string }).eventType === "RECEIPT_ACCEPTED")).toHaveLength(1);
    } finally {
      setSuiteDatabaseResolverForTests();
    }
  });

  it("protects every standalone product workflow before entitlement resolution", async () => {
    const caller = appRouter.createCaller({ user: null, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    await expect(caller.suite.ged.sessions()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.suite.gems.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.suite.sitrep.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.suite.pam.history()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("returns payment-required guidance for unentitled standalone-product callers", async () => {
    expect(() => assertProductAccess(false)).toThrow(/Access to this XinUS product is not active/);
    expect(() => assertProductAccess(true)).not.toThrow();
  });

  it("recognizes the explicit self-hosted unlimited-access flag without changing the default product policy", () => {
    const prior = process.env.XINUS_UNLIMITED_ACCESS;
    try {
      delete process.env.XINUS_UNLIMITED_ACCESS;
      expect(isUnlimitedPrivateDeployment()).toBe(false);
      process.env.XINUS_UNLIMITED_ACCESS = "true";
      expect(isUnlimitedPrivateDeployment()).toBe(true);
    } finally {
      if (prior === undefined) delete process.env.XINUS_UNLIMITED_ACCESS;
      else process.env.XINUS_UNLIMITED_ACCESS = prior;
    }
  });

  it("blocks signed-in unentitled callers for GED Tutor, Hidden Gems, SitRep, and PAM before any database workflow", async () => {
    const signedInUser = { id: 998, role: "user" as const };
    const deny = async () => false;
    await expect(requireProductEntitlement(signedInUser, "ged_tutor", deny)).rejects.toMatchObject({ code: "PAYMENT_REQUIRED" });
    await expect(requireProductEntitlement(signedInUser, "hidden_gems", deny)).rejects.toMatchObject({ code: "PAYMENT_REQUIRED" });
    await expect(requireProductEntitlement(signedInUser, "sitrep", deny)).rejects.toMatchObject({ code: "PAYMENT_REQUIRED" });
    await expect(requireProductEntitlement(signedInUser, "pam", deny)).rejects.toMatchObject({ code: "PAYMENT_REQUIRED" });
  });

  it("returns PAYMENT_REQUIRED from the actual authenticated standalone tRPC workflows before database access", async () => {
    setProductAccessResolverForTests(async () => false);
    const caller = appRouter.createCaller({ user: { id: 997, role: "user" }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    try {
      await expect(caller.suite.ged.sessions()).rejects.toMatchObject({ code: "PAYMENT_REQUIRED" });
      await expect(caller.suite.gems.list()).rejects.toMatchObject({ code: "PAYMENT_REQUIRED" });
      await expect(caller.suite.sitrep.list()).rejects.toMatchObject({ code: "PAYMENT_REQUIRED" });
      await expect(caller.suite.pam.history()).rejects.toMatchObject({ code: "PAYMENT_REQUIRED" });
    } finally {
      setProductAccessResolverForTests();
    }
  });

  it("returns an authorized PD Pro case-report structure through the live tRPC workflow", async () => {
    const workspace = { id: 17, userId: 41, mode: "PD", clarityLevel: 72, riskScore: 18 };
    const caseRecord = { id: 9, workspaceId: 17, name: "Sample Matter", client: "Client A" };
    const responses = [[workspace], [caseRecord], [{ id: 4, caseId: 9, text: "Review discovery", createdAt: new Date("2026-08-12") }], [{ id: 5, caseId: 9, text: "Review discovery", done: false, createdAt: new Date("2026-08-12") }], [{ id: 6, caseId: 9, label: "File by August 20", dueAt: new Date("2026-08-20") }]];
    const db = { select: () => ({ from: () => ({ where: () => ({ limit: async () => responses.shift() ?? [], orderBy: () => ({ limit: async () => responses.shift() ?? [] }) }) }) }) };
    setProductAccessResolverForTests(async () => true);
    setSuiteDatabaseResolverForTests(async () => db as never);
    const caller = appRouter.createCaller({ user: { id: 41, role: "user" }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    try {
      await expect(caller.suite.pd.caseReport({ caseId: 9 })).resolves.toMatchObject({ caseRecord: { id: 9, name: "Sample Matter" }, workspace: { mode: "PD", clarityLevel: 72, riskScore: 18 }, notes: [{ text: "Review discovery" }], tasks: [{ text: "Review discovery", done: false }], deadlines: [{ label: "File by August 20" }] });
    } finally {
      setProductAccessResolverForTests();
      setSuiteDatabaseResolverForTests();
    }
  });

  it("reads the expanded GED, Hidden Gems, SitRep, and Recovery workflows through their authenticated tRPC routes", async () => {
    const responses = [[{ id: 1, subject: "math", title: "Practice" }], [{ id: 2, imageUrl: "https://example.test/item.jpg" }], [{ id: 3, mode: "general", situation: "Travel plan" }], [{ id: 4, name: "Anchor record", riskScore: 20 }]];
    const ordered = () => {
      const response = responses.shift() ?? [];
      return Object.assign(Promise.resolve(response), { limit: async () => response });
    };
    const db = { select: () => ({ from: () => ({ where: () => ({ orderBy: ordered, limit: async () => responses.shift() ?? [] }) }) }) };
    setProductAccessResolverForTests(async () => true);
    setSupervisionAccessResolverForTests(async () => true);
    setSuiteDatabaseResolverForTests(async () => db as never);
    const caller = appRouter.createCaller({ user: { id: 41, role: "user" }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    try {
      await expect(caller.suite.ged.sessions()).resolves.toMatchObject([{ title: "Practice" }]);
      await expect(caller.suite.gems.list()).resolves.toMatchObject([{ imageUrl: "https://example.test/item.jpg" }]);
      await expect(caller.suite.sitrep.list()).resolves.toMatchObject([{ situation: "Travel plan" }]);
      await expect(caller.suite.recidivism.listSubjects()).resolves.toMatchObject([{ name: "Anchor record", riskScore: 20 }]);
    } finally {
      setProductAccessResolverForTests();
      setSupervisionAccessResolverForTests();
      setSuiteDatabaseResolverForTests();
    }
  });

  it("runs GED Tutor, SitRep, and Recovery mutations through their authenticated workflows", async () => {
    const writes: unknown[] = [];
    const selects = [[{ id: 77, userId: 41 }], [{ sharedAcrossProducts: false, enabledProducts: [], shareNorthStar: false, sharePreferences: false }], [{ sharedAcrossProducts: false, enabledProducts: [], shareNorthStar: false, sharePreferences: false }]];
    const db = {
      select: () => ({ from: () => ({ where: () => ({ limit: async () => selects.shift() ?? [], orderBy: () => ({ limit: async () => selects.shift() ?? [] }) }) }) }),
      insert: () => ({ values: (value: unknown) => { writes.push(value); return { $returningId: async () => [{ id: 77 }] }; } }),
    };
    setProductAccessResolverForTests(async () => true);
    setSupervisionAccessResolverForTests(async () => true);
    setCompletionResolverForTests(async () => "A concise XinUS response.");
    setSuiteDatabaseResolverForTests(async () => db as never);
    const caller = appRouter.createCaller({ user: { id: 41, role: "user" }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    try {
      await expect(caller.suite.ged.sendTurn({ subject: "math", message: "How do fractions work?" })).resolves.toEqual({ sessionId: 77, response: "A concise XinUS response." });
      await expect(caller.suite.sitrep.assess({ mode: "general", situation: "Travel decision", context: "Time-sensitive" })).resolves.toMatchObject({ id: 77, response: "A concise XinUS response.", tracking: { evidenceStatus: "partially_verified", simulationStatus: "baseline", decisionState: "cross_check_required", humanReviewRequired: true, baseline: { confidence: 0.91, simulationStatus: "baseline" } } });
      await expect(caller.suite.recidivism.createSubject({ name: "Anchor record" })).resolves.toEqual({ id: 77 });
      expect(writes).toHaveLength(5);
    } finally {
      setProductAccessResolverForTests();
      setSupervisionAccessResolverForTests();
      setCompletionResolverForTests();
      setSuiteDatabaseResolverForTests();
    }
  });

  it("produces a personalized adaptive GED study recommendation through the authenticated tutoring workflow", async () => {
    const profile = { sharedAcrossProducts: false, enabledProducts: [], shareNorthStar: false, sharePreferences: false };
    const db = { select: () => ({ from: () => ({ where: () => ({ limit: async () => [profile] }) }) }) };
    setProductAccessResolverForTests(async () => true);
    setCompletionResolverForTests(async (system, prompt) => {
      expect(system).toContain("Goal: Pass with confidence");
      expect(system).toContain("Preferred teaching style: visual");
      expect(system).toContain("Preferred teaching tone: playful");
      expect(system).toContain("Existing strengths: I read graphs well");
      expect(system).toContain("Focus areas: fractions and proportions");
      expect(system).toContain("Concept, Try it, Check yourself, and Next practice");
      expect(system).toContain("Verify this note");
      expect(prompt).toContain("20-minute next study block");
      expect(prompt).toContain("Study focus: review a mistake");
      return "A personalized 20-minute Math study block.";
    });
    setSuiteDatabaseResolverForTests(async () => db as never);
    const caller = appRouter.createCaller({ user: { id: 41, role: "user" }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    try {
      await expect(caller.suite.ged.recommend({ subject: "math", learner: { goal: "Pass with confidence", confidence: "building", style: "visual", tone: "playful", interests: "music", strengths: "I read graphs well", focusAreas: "fractions and proportions" }, studyFocus: "review a mistake", recentChallenge: "fractions" })).resolves.toEqual({ recommendation: "A personalized 20-minute Math study block." });
    } finally {
      setProductAccessResolverForTests();
      setCompletionResolverForTests();
      setSuiteDatabaseResolverForTests();
    }
  });

  it("runs the Hidden Gems appraisal mutation through the authenticated workflow", async () => {
    const writes: unknown[] = [];
    const priorVisionModel = process.env.OLLAMA_VISION_MODEL;
    const profile = { id: 3, userId: 41, subscriptionTier: "plus", sharedAcrossProducts: false, enabledProducts: [], shareNorthStar: false, sharePreferences: false };
    const selects = [[profile], [profile]];
    const db = {
      select: () => ({ from: () => ({ where: () => ({ limit: async () => selects.shift() ?? [] }) }) }),
      insert: () => ({ values: (value: unknown) => { writes.push(value); return { $returningId: async () => [{ id: 91 }] }; } }),
    };
    setProductAccessResolverForTests(async () => true);
    const appraisalJson = JSON.stringify({ title: "Pocket watch", category: "Timepiece", estimatedRange: "$40–$80", confidence: "low", condition: "used", evidence: ["visible marks"], cautions: ["needs inspection"], nextStep: "Consult an expert" });
    process.env.OLLAMA_VISION_MODEL = "qwen2.5vl:3b";
    setModelResolverForTests(async params => {
      expect(params.model).toBe("qwen2.5vl:3b");
      expect(params.dataSensitivity).toBe("restricted");
      return ({ choices: [{ message: { content: appraisalJson } }] }) as never;
    });
    setCreditResolversForTests({ grant: async () => 8, balance: async () => 8 });
    setSuiteDatabaseResolverForTests(async () => db as never);
    const caller = appRouter.createCaller({ user: { id: 41, role: "user" }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    try {
      await expect(caller.suite.gems.appraise({ imageUrl: "https://example.test/watch.jpg", hint: "Estate sale" })).resolves.toMatchObject({ id: 91, source: "plus", creditBalance: 8, appraisal: { title: "Pocket watch", nextStep: "Consult an expert" } });
      expect(writes).toHaveLength(1);
    } finally {
      setProductAccessResolverForTests();
      setModelResolverForTests();
      setCreditResolversForTests();
      setSuiteDatabaseResolverForTests();
      if (priorVisionModel === undefined) delete process.env.OLLAMA_VISION_MODEL;
      else process.env.OLLAMA_VISION_MODEL = priorVisionModel;
    }
  });

  it("rejects non-image data and insecure image references before Hidden Gems appraisal work begins", async () => {
    const caller = appRouter.createCaller({ user: { id: 41, role: "user" }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    await expect(caller.suite.gems.appraise({ imageUrl: "http://example.test/object.jpg" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.suite.gems.appraise({ imageUrl: "data:text/plain;base64,aGVsbG8=" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("stores uploaded Hidden Gems photos privately while using a data URL for local vision", async () => {
    const writes: Array<Record<string, unknown>> = [];
    const profile = { id: 3, userId: 41, subscriptionTier: "plus", sharedAcrossProducts: false, enabledProducts: [], shareNorthStar: false, sharePreferences: false };
    const db = {
      select: () => ({ from: () => ({ where: () => ({ limit: async () => [profile] }) }) }),
      insert: () => ({ values: (value: Record<string, unknown>) => { writes.push(value); return { $returningId: async () => [{ id: 92 }] }; } }),
    };
    const appraisalJson = JSON.stringify({ title: "Test object", category: "Illustration", estimatedRange: "Unknown", confidence: "low", condition: "unknown", evidence: ["uploaded photo"], cautions: ["verify in person"], nextStep: "Compare details" });
    setProductAccessResolverForTests(async () => true);
    setCreditResolversForTests({ grant: async () => 8, balance: async () => 8 });
    setSuiteDatabaseResolverForTests(async () => db as never);
    setModelResolverForTests(async params => {
      const content = params.messages[1]?.content as Array<{ type: string; image_url?: { url: string } }>;
      expect(content[1]?.image_url?.url).toMatch(/^data:image\/png;base64,/);
      return ({ choices: [{ message: { content: appraisalJson } }] }) as never;
    });
    const caller = appRouter.createCaller({ user: { id: 41, role: "user" }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    try {
      await expect(caller.suite.gems.appraise({ imageUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAADUlEQVQImWP4z8DwHwAFgAI/ScL9KAAAAABJRU5ErkJggg==" })).resolves.toMatchObject({ id: 92 });
      expect(vi.mocked(storagePut)).toHaveBeenCalledOnce();
      expect(writes[0]).toMatchObject({ imageKey: "hidden-gems/41/photo.png", imageUrl: "/manus-storage/hidden-gems/41/photo.png" });
    } finally {
      vi.mocked(storagePut).mockClear();
      setProductAccessResolverForTests();
      setCreditResolversForTests();
      setModelResolverForTests();
      setSuiteDatabaseResolverForTests();
    }
  });

  it("runs Recovery and Task Force follow-through mutations through the Task Force entitlement path", async () => {
    const requestedProducts: string[] = [];
    const subject = { id: 12, ownerUserId: 41, name: "Operational record", riskScore: 20 };
    const selects = [[subject], [subject]];
    const writes: unknown[] = [];
    const db = {
      select: () => ({ from: () => ({ where: () => ({ limit: async () => selects.shift() ?? [] }) }) }),
      insert: () => ({ values: (value: unknown) => { writes.push(value); return { $returningId: async () => [{ id: 88 }] }; } }),
      update: () => ({ set: () => ({ where: async () => [] }) }),
    };
    setSupervisionAccessResolverForTests(async (_userId, productKey) => { requestedProducts.push(productKey); return productKey === "task_force_pro"; });
    setSuiteDatabaseResolverForTests(async () => db as never);
    const caller = appRouter.createCaller({ user: { id: 41, role: "user" }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    try {
      await expect(caller.suite.recidivism.addTrigger({ subjectId: 12, situation: "Missed support meeting", note: "Follow up" })).resolves.toEqual({ riskScore: 28 });
      await expect(caller.suite.recidivism.addObligation({ subjectId: 12, title: "Contact coordinator", dueAt: new Date("2026-08-20"), type: "meeting" })).resolves.toEqual({ id: 88 });
      expect(requestedProducts).toEqual(["recovery", "task_force_pro", "recovery", "task_force_pro"]);
      expect(writes).toHaveLength(2);
    } finally {
      setSupervisionAccessResolverForTests();
      setSuiteDatabaseResolverForTests();
    }
  });

  it("records terminal errors and requires a second explicit confirmation for mutating owner commands", async () => {
    const writes: unknown[] = [];
    const db = { insert: () => ({ values: async (value: unknown) => { writes.push(value); } }) };
    setSuiteDatabaseResolverForTests(async () => db as never);
    const caller = appRouter.createCaller({ user: { id: 41, role: "admin" }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    try {
      await expect(caller.suite.admin.runTerminal({ input: "/not-a-command" })).resolves.toMatchObject({ ok: false, lines: ["Unknown command. Use /help for the safe XinUS terminal command set."] });
      await expect(caller.suite.admin.runTerminal({ input: "/quota reset" })).resolves.toMatchObject({ ok: true, requiresConfirmation: true });
      expect(writes).toEqual(expect.arrayContaining([expect.objectContaining({ outcome: "err" }), expect.objectContaining({ outcome: "pending_confirmation" })]));
    } finally {
      setSuiteDatabaseResolverForTests();
    }
  });

  it("rejects invalid and cross-workspace PD Pro note and task updates before records can change", async () => {
    const workspace = { id: 17, userId: 41, mode: "PD", clarityLevel: 72, riskScore: 18 };
    const responses = [[workspace], [], [workspace], []];
    const db = {
      select: () => ({ from: () => ({ where: () => ({ limit: async () => responses.shift() ?? [] }), innerJoin: () => ({ where: () => ({ limit: async () => responses.shift() ?? [] }) }) }) }),
    };
    setProductAccessResolverForTests(async () => true);
    setSuiteDatabaseResolverForTests(async () => db as never);
    const caller = appRouter.createCaller({ user: { id: 41, role: "user" }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    try {
      await expect(caller.suite.pd.createCase({ name: "" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
      await expect(caller.suite.pd.addNote({ caseId: 9, text: "Review discovery" })).rejects.toMatchObject({ code: "FORBIDDEN", message: "This PD case is not available to your workspace." });
      await expect(caller.suite.pd.toggleTask({ taskId: 6, done: true })).rejects.toMatchObject({ code: "FORBIDDEN", message: "This task is not available to your workspace." });
    } finally {
      setProductAccessResolverForTests();
      setSuiteDatabaseResolverForTests();
    }
  });

  it("records PD Pro note-derived tasks and deadlines while preserving the workspace action history", async () => {
    const workspace = { id: 17, userId: 41, mode: "PD", clarityLevel: 72, riskScore: 18 };
    const responses = [[workspace], [{ id: 9, workspaceId: 17 }]];
    const writes: unknown[] = []; const updates: unknown[] = [];
    const db = {
      select: () => ({ from: () => ({ where: () => ({ limit: async () => responses.shift() ?? [] }) }) }),
      insert: () => ({ values: (value: unknown) => { writes.push(value); return { $returningId: async () => [{ id: 1 }] }; } }),
      update: () => ({ set: (value: unknown) => { updates.push(value); return { where: async () => [] }; } }),
    };
    setProductAccessResolverForTests(async () => true);
    setSuiteDatabaseResolverForTests(async () => db as never);
    const caller = appRouter.createCaller({ user: { id: 41, role: "user" }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    try {
      await expect(caller.suite.pd.addNote({ caseId: 9, text: "Call client tomorrow. File motion by April 30.", source: "note" })).resolves.toMatchObject({ tasks: ["Call client tomorrow", "File motion by April 30"], deadlines: [{ label: expect.stringContaining("April 30") }] });
      expect(writes).toHaveLength(3);
      expect(updates).toEqual([expect.objectContaining({ lastAction: "Case note recorded", clarityLevel: 76 })]);
    } finally {
      setProductAccessResolverForTests();
      setSuiteDatabaseResolverForTests();
    }
  });

  it("returns the owner terminal history through command and outcome-filter paths", async () => {
    let receivedWhere: unknown;
    const history = [{ id: 7, command: "/quota", args: "reset", outcome: "pending_confirmation" }];
    const db = { select: () => ({ from: () => ({ where: (conditions: unknown) => { receivedWhere = conditions; return { orderBy: () => ({ limit: async () => history }) }; } }) }) };
    setSuiteDatabaseResolverForTests(async () => db as never);
    const caller = appRouter.createCaller({ user: { id: 41, role: "admin" }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    try {
      await expect(caller.suite.admin.terminalHistory({ command: "quota", outcome: "pending_confirmation" })).resolves.toEqual(history);
      expect(receivedWhere).toBeTruthy();
    } finally {
      setSuiteDatabaseResolverForTests();
    }
  });

  it("stores, scopes, and updates private work records through the protected workboard router", async () => {
    const writes: unknown[] = [];
    const updates: unknown[] = [];
    const record = { id: 71, userId: 41, productKey: "clarity", kind: "follow_up", title: "Send the decision summary", details: "Before 3 PM", status: "active", createdAt: new Date("2026-08-12T00:00:00Z"), updatedAt: new Date("2026-08-12T00:00:00Z") };
    const db = {
      select: () => ({ from: () => ({ where: () => ({ orderBy: () => ({ limit: async () => [record] }), limit: async () => [record] }) }) }),
      insert: () => ({ values: (value: unknown) => { writes.push(value); return { $returningId: async () => [{ id: 71 }] }; } }),
      update: () => ({ set: (value: unknown) => { updates.push(value); return { where: async () => [] }; } }),
    };
    setSuiteDatabaseResolverForTests(async () => db as never);
    const caller = appRouter.createCaller({ user: { id: 41, role: "user" }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] });
    try {
      await expect(caller.suite.work.list({ productKey: "clarity" })).resolves.toMatchObject([{ id: 71, userId: 41, title: "Send the decision summary" }]);
      await expect(caller.suite.work.create({ productKey: "clarity", kind: "follow_up", title: "Send the decision summary", details: "Before 3 PM" })).resolves.toEqual({ id: 71 });
      await expect(caller.suite.work.setStatus({ id: 71, status: "complete" })).resolves.toEqual({ success: true });
      expect(writes).toEqual([expect.objectContaining({ userId: 41, productKey: "clarity", title: "Send the decision summary" })]);
      expect(updates).toEqual([expect.objectContaining({ status: "complete" })]);
    } finally {
      setSuiteDatabaseResolverForTests();
    }
  });
});
