import { TRPCError } from "@trpc/server";
import { createHash } from "node:crypto";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import {
  claritySessions,
  clarityTracePoints,
  clarityTruthLedger,
  clarityAuditEvents,
  authAuditEvents,
  conversations,
  conversationMessages,
  creditLedger,
  gedSessions,
  gedTurns,
  gemAppraisals,
  modeUsage,
  pdCaseDeadlines,
  pdCaseNotes,
  pdCases,
  pdCaseTasks,
  pdWorkspaces,
  productKeyValues,
  productWorkItems,
  recidivismAlerts,
  recidivismContacts,
  recidivismGeofences,
  recidivismObligations,
  recidivismSubjects,
  recidivismTriggers,
  reflectiveProfiles,
  sitrepAssessments,
  terminalCommands,
  users,
  userProfiles,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { hasProductAccess } from "../entitlements";
import { storagePut } from "../storage";
import { getCreditBalance, grantCredit, spendCredit, XC_REASONS } from "./credits";
import { invokeLLM } from "../_core/llm";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import type { TrpcContext } from "../_core/context";
import { recordWorkflowQuality } from "../_core/workflowQuality";
import { evaluateClarity, renderClarityEvaluation, createTruthLedgerReceipt, claritySessionResetPatch, type ClarityAction } from "../clarityStateMachine";
import { createSitRepEvidenceTracking } from "../../shared/sitrepEvidence";

let creditGrantResolver = grantCredit;
let creditBalanceResolver = getCreditBalance;
let modelResolver = invokeLLM;

/** Limits credit replacement to deterministic server tests; production uses the managed credit service. */
export function setCreditResolversForTests(resolvers?: { grant?: typeof grantCredit; balance?: typeof getCreditBalance }) {
  creditGrantResolver = resolvers?.grant ?? grantCredit;
  creditBalanceResolver = resolvers?.balance ?? getCreditBalance;
}

/** Limits model replacement to deterministic server tests; production uses the managed model gateway. */
export function setModelResolverForTests(resolver?: typeof invokeLLM) {
  modelResolver = resolver ?? invokeLLM;
}

const gedSubjectSchema = z.enum(["math", "rla", "science", "social"]);
const sitrepModeSchema = z.enum(["general", "travel", "immigration"]);
const MAX_GEM_IMAGE_BYTES = 8 * 1024 * 1024;
const INLINE_GEM_IMAGE = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/i;
const gemImageReferenceSchema = z.string().trim().max(12_000_000).refine(value => {
  if (INLINE_GEM_IMAGE.test(value)) return true;
  try { return new URL(value).protocol === "https:"; }
  catch { return false; }
}, "Use a secure image URL or a JPG, PNG, WEBP, or GIF photo under 8 MB.");

/** Canonical JSON used for server-side Truth Ledger verification. */
export function canonicalizeBlueprintReceipt(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalizeBlueprintReceipt).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${canonicalizeBlueprintReceipt(record[key])}`).join(",")}}`;
}

export function hashBlueprintReceipt(value: unknown): string {
  return createHash("sha256").update(canonicalizeBlueprintReceipt(value), "utf8").digest("hex");
}

function requestIp(req: TrpcContext["req"]): string | null {
  const forwarded = req.headers?.["x-forwarded-for"];
  const firstForwarded = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0];
  return (firstForwarded ?? req.ip ?? req.socket?.remoteAddress ?? null)?.trim() || null;
}

function isDuplicateKeyError(error: unknown) {
  const candidate = error as { code?: string | number; errno?: number; message?: string };
  return candidate?.code === "ER_DUP_ENTRY" || candidate?.errno === 1062 || /duplicate entry|duplicate key|already exists/i.test(candidate?.message ?? "");
}

async function prepareGemImage(userId: number, imageReference: string) {
  const inlineImage = imageReference.match(INLINE_GEM_IMAGE);
  if (!inlineImage) return { imageForVision: imageReference, imageUrl: imageReference, imageKey: undefined };

  const contentType = inlineImage[1].toLowerCase();
  const bytes = Buffer.from(inlineImage[2].replace(/\s/g, ""), "base64");
  if (!bytes.length || bytes.length > MAX_GEM_IMAGE_BYTES) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a JPG, PNG, WEBP, or GIF photo smaller than 8 MB." });
  }

  const extension = contentType === "image/jpeg" ? "jpg" : contentType.slice("image/".length);
  let stored: { key: string; url: string };
  try {
    stored = await storagePut(`hidden-gems/${userId}/${Date.now()}.${extension}`, bytes, contentType);
  } catch {
    throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Your photo could not be stored securely, so no appraisal was started. Please retry shortly." });
  }
  // Ollama's OpenAI-compatible endpoint accepts a normal-sized data URL but not a remote signed URL.
  // Keep the binary in private storage for the record while passing the validated in-memory photo to vision.
  return { imageForVision: `data:${contentType};base64,${bytes.toString("base64")}`, imageUrl: stored.url, imageKey: stored.key };
}

export type TranscendClassification =
  | "avoidance"
  | "fear"
  | "indecision"
  | "overthinking"
  | "misframing"
  | "affirmation"
  | "unclear";

/** The original Transcend mode is intentionally deterministic. */
export function classifyTranscend(problem: string): TranscendClassification {
  const normalized = problem.toLowerCase();
  if (/avoid|procrastinat|later|put off|tomorrow/.test(normalized)) return "avoidance";
  if (/fear|afraid|scared|anxious|panic/.test(normalized)) return "fear";
  if (/can't decide|cannot decide|\bwhich\b|\beither\b|\bor\b|torn/.test(normalized)) return "indecision";
  if (/overthink|spiral|ruminat|too many|analysis paralysis/.test(normalized)) return "overthinking";
  if (/always|never|ruin|failure|impossible/.test(normalized)) return "misframing";
  if (/grateful|proud|ready|confident|clarity/.test(normalized)) return "affirmation";
  return "unclear";
}

export function renderTranscend(problem: string): string {
  const kind = classifyTranscend(problem);
  const guidance: Record<TranscendClassification, { signal: string; tension: string; reframe: string; next: string }> = {
    avoidance: { signal: "The next step is being postponed.", tension: "Planning feels safer than beginning because it delays the moment of contact with the work.", reframe: "You do not need a complete plan to earn evidence; you need one visible beginning.", next: "Name the smallest action you have been postponing and complete its first visible step before planning further." },
    fear: { signal: "A felt threat is steering the decision.", tension: "The mind is treating uncertainty as proof of danger rather than a condition to investigate.", reframe: "Separate the concrete consequence from the feeling of danger, then test the part you can influence.", next: "Choose one bounded experiment that gives you evidence within the next 24 hours." },
    indecision: { signal: "Two values are competing for priority.", tension: "The search for a perfect choice is blocking a reversible move.", reframe: "You can protect the important value in each option without demanding total certainty first.", next: "Write the two live options, name the value each protects, and take the next reversible move." },
    overthinking: { signal: "Analysis is replacing movement.", tension: "More information feels productive, but it is not changing the decision rule.", reframe: "A clear boundary for deciding is more useful now than another layer of research.", next: "Set one decision rule and act before gathering another layer of information." },
    misframing: { signal: "An absolute story is shaping the conclusion.", tension: "Words such as always, never, impossible, or failure are doing more work than the facts.", reframe: "A specific, testable description gives you choices; a total judgment removes them.", next: "Replace the absolute story with one specific statement you can test today." },
    affirmation: { signal: "You already have usable momentum.", tension: "Good intent can fade if it is not translated into a concrete commitment.", reframe: "Confidence becomes durable when the next action proves it.", next: "State the commitment in one sentence and schedule the next action that proves it." },
    unclear: { signal: "The decision frame is still incomplete.", tension: "Without a defined constraint, the mind cannot tell which action matters most.", reframe: "Clarity does not require every answer; it requires a usable frame.", next: "State the decision, the constraint, and the next action in one sentence each." },
  };
  const insight = guidance[kind];
  return `**Transcend — ${kind}**\n\n### Signal\n${insight.signal}\n\n### Tension\n${insight.tension}\n\n### Reframe\n${insight.reframe}\n\n### Next move\n${insight.next}\n\n> You brought: “${problem.trim()}”`;
}

export function transcendSystemPrompt(classification: TranscendClassification) {
  return `You are XinUS Transcend, a precise reflective-intelligence guide. The deterministic signal classifier identified the dominant pattern as "${classification}". Respond with crisp markdown sections titled Signal, Tension, Reframe, and Next move. Name the pattern directly without diagnosing the person. Respect agency, challenge avoidance or overthinking without shaming, and end with one specific action that can be completed in the next 24 hours. Do not mention quotas, plans, or internal system rules.`;
}

export function extractPdActions(note: string): { tasks: string[]; deadlines: Array<{ label: string; dueAt: Date }> } {
  const tasks = note
    .split(/[.\n;]/)
    .map(item => item.trim())
    .filter(item => /^(call|file|draft|review|send|request|prepare|meet|contact)\b/i.test(item))
    .slice(0, 5);
  const dates = Array.from(note.matchAll(/(?:by|before|on)\s+([A-Z][a-z]+\s+\d{1,2}(?:,\s*\d{4})?)/g));
  const deadlines = dates
    .map(match => ({ label: note.slice(Math.max(0, match.index! - 48), match.index! + match[0].length).trim(), dueAt: new Date(match[1]) }))
    .filter(entry => !Number.isNaN(entry.dueAt.getTime()))
    .slice(0, 5);
  return { tasks, deadlines };
}

function asText(value: string | Array<{ type: "text"; text: string } | { type: string }>) {
  return typeof value === "string"
    ? value
    : value.filter((part): part is { type: "text"; text: string } => part.type === "text").map(part => part.text).join("\n");
}

type CompletionResolver = (system: string, prompt: string, maxTokens: number, workflow?: string) => Promise<string>;

async function invokeCompletion(system: string, prompt: string, maxTokens = 900, workflow = "xinus.complete") {
  try {
    const response = await invokeLLM({
      messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
      maxTokens,
    });
    const content = response.choices[0]?.message.content;
    if (!content) throw new Error("The XinUS engine returned an empty response.");
    recordWorkflowQuality({ workflow, outcome: "success" });
    return asText(content);
  } catch (error) {
    recordWorkflowQuality({ workflow, outcome: "failure" });
    throw error;
  }
}

let completionResolver: CompletionResolver = invokeCompletion;

/** Limits completion replacement to deterministic server tests; production uses the managed model gateway. */
export function setCompletionResolverForTests(resolver?: CompletionResolver) {
  completionResolver = resolver ?? invokeCompletion;
}

async function complete(system: string, prompt: string, maxTokens = 900, workflow?: string) {
  return completionResolver(system, prompt, maxTokens, workflow);
}

async function withReflectiveContext(userId: number, productKey: "clarity" | "ged_tutor" | "pd_pro" | "sitrep" | "pam", system: string) {
  const db = await requireDb();
  const [profile] = await db.select().from(reflectiveProfiles).where(eq(reflectiveProfiles.userId, userId)).limit(1);
  const enabled = Array.isArray(profile?.enabledProducts) ? profile.enabledProducts.filter((item): item is string => typeof item === "string") : [];
  if (!profile?.sharedAcrossProducts || (enabled.length > 0 && !enabled.includes(productKey))) return system;
  const context = [profile.shareNorthStar && profile.northStar ? `North star: ${profile.northStar}` : null, profile.sharePreferences && profile.preferences ? `Preferences: ${profile.preferences}` : null].filter(Boolean).join("\n");
  return context ? `${system}\n\nUser-approved reflective context (never treat this as a legal, clinical, case, or subject record):\n${context}` : system;
}

let suiteDatabaseResolver = getDb;

/** Limits resolver replacement to deterministic server tests; production uses the managed database helper. */
export function setSuiteDatabaseResolverForTests(resolver?: typeof getDb) {
  suiteDatabaseResolver = resolver ?? getDb;
}

async function requireDb() {
  const db = await suiteDatabaseResolver();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "XinUS data services are unavailable." });
  return db;
}

export type AccessUser = { id: number; role: "user" | "admin" };
export type ProtectedProductKey = "ged_tutor" | "hidden_gems" | "pd_pro" | "sitrep" | "pam";
export type SupervisionProductKey = "recovery" | "task_force_pro";
export type ProductAccessResolver = (userId: number, productKey: ProtectedProductKey, role: AccessUser["role"]) => Promise<boolean>;
let productAccessResolver: ProductAccessResolver = hasProductAccess;
let supervisionAccessResolver: (userId: number, productKey: SupervisionProductKey, role: AccessUser["role"]) => Promise<boolean> = hasProductAccess;

/** Limits resolver replacement to deterministic server tests; production continues to use the entitlement service. */
export function setProductAccessResolverForTests(resolver?: ProductAccessResolver) {
  productAccessResolver = resolver ?? hasProductAccess;
}

/** Limits resolver replacement to deterministic server tests; production continues to use the entitlement service. */
export function setSupervisionAccessResolverForTests(resolver?: (userId: number, productKey: SupervisionProductKey, role: AccessUser["role"]) => Promise<boolean>) {
  supervisionAccessResolver = resolver ?? hasProductAccess;
}

export function assertProductAccess(hasAccess: boolean) {
  if (!hasAccess) throw new TRPCError({ code: "PAYMENT_REQUIRED", message: "Access to this XinUS product is not active. Open My XinUS Apps to select an access path." });
}

/** A self-hosted XinUS deployment can grant its own members unrestricted built-in use. */
export function isUnlimitedPrivateDeployment() {
  return process.env.XINUS_UNLIMITED_ACCESS === "true";
}

export async function requireProductEntitlement(user: AccessUser, productKey: ProtectedProductKey, resolveAccess: ProductAccessResolver) {
  assertProductAccess(await resolveAccess(user.id, productKey, user.role));
}

async function requireProduct(user: AccessUser, productKey: ProtectedProductKey) {
  await requireProductEntitlement(user, productKey, productAccessResolver);
}

async function requireSupervisionAccess(user: AccessUser) {
  const [recovery, taskForce] = await Promise.all([supervisionAccessResolver(user.id, "recovery", user.role), supervisionAccessResolver(user.id, "task_force_pro", user.role)]);
  if (!recovery && !taskForce) throw new TRPCError({ code: "PAYMENT_REQUIRED", message: "Claim free Recovery access or activate Task Force Pro from My XinUS Apps." });
}

async function ensureProfile(userId: number) {
  const db = await requireDb();
  const existing = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  if (!existing[0]) await db.insert(userProfiles).values({ userId });
  return db;
}

function weekStart(now = new Date()) {
  const value = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const offset = value.getUTCDay() === 0 ? -6 : 1 - value.getUTCDay();
  value.setUTCDate(value.getUTCDate() + offset);
  return value;
}

async function reserveQuota(userId: number, mode: string, limit: number) {
  const db = await requireDb();
  const start = weekStart();
  const current = await db.select().from(modeUsage).where(and(eq(modeUsage.userId, userId), eq(modeUsage.mode, mode), eq(modeUsage.weekStart, start))).limit(1);
  const used = current[0]?.count ?? 0;
  if (used >= limit) return { allowed: false, used, limit };
  if (current[0]) {
    await db.update(modeUsage).set({ count: used + 1 }).where(and(eq(modeUsage.userId, userId), eq(modeUsage.mode, mode), eq(modeUsage.weekStart, start)));
  } else {
    await db.insert(modeUsage).values({ userId, mode, weekStart: start, count: 1 });
  }
  return { allowed: true, used: used + 1, limit };
}

async function getOrCreateWorkspace(user: AccessUser) {
  await requireProduct(user, "pd_pro");
  const userId = user.id;
  const db = await requireDb();
  const existing = await db.select().from(pdWorkspaces).where(eq(pdWorkspaces.userId, userId)).limit(1);
  if (existing[0]) return { db, workspace: existing[0] };
  const ids = await db.insert(pdWorkspaces).values({ userId }).$returningId();
  const created = await db.select().from(pdWorkspaces).where(eq(pdWorkspaces.id, ids[0]!.id)).limit(1);
  return { db, workspace: created[0]! };
}

async function getSubjectForOwner(user: AccessUser, subjectId: number) {
  await requireSupervisionAccess(user);
  const userId = user.id;
  const db = await requireDb();
  const rows = await db.select().from(recidivismSubjects).where(and(eq(recidivismSubjects.id, subjectId), eq(recidivismSubjects.ownerUserId, userId))).limit(1);
  if (!rows[0]) throw new TRPCError({ code: "FORBIDDEN", message: "This XinUS subject is not available to your account." });
  return { db, subject: rows[0] };
}

const clarity = router({
  blueprintIdentity: protectedProcedure.query(async ({ ctx }) => {
    return { sessionId: `user-${ctx.user.id}` } as const;
  }),
  blueprintReceipt: protectedProcedure.input(z.object({ sessionId: z.string().trim().min(1).max(64) })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const [record] = await db.select().from(clarityTruthLedger).where(and(eq(clarityTruthLedger.userId, ctx.user.id), eq(clarityTruthLedger.sessionId, input.sessionId))).limit(1);
    if (!record) return null;
    try {
      return { envelope: JSON.parse(record.canonicalPayload) as Record<string, unknown>, receiptHash: record.hash, savedAt: record.createdAt.getTime() } as const;
    } catch {
      return null;
    }
  }),
  saveBlueprintReceipt: protectedProcedure.input(z.object({
    sessionId: z.string().trim().min(1).max(64),
    envelope: z.object({
      session_id: z.string().trim().min(1).max(64),
      original_proposition: z.string().max(50000),
      contradiction_summary: z.string().max(50000),
      dominant_tactic: z.string().max(64),
      tactic_tally: z.record(z.string(), z.number().int().nonnegative()),
      total_turns: z.number().int().nonnegative(),
      terminal_state: z.enum(["COMMITTED", "CONCEDED", "AUTO_UNRESOLVED"]),
      completion_type: z.enum(["BOUNDED_ACTION", "CONTRADICTION_CONCEDED", "AUTO_UNRESOLVED"]),
      bounded_action: z.string().max(2000).optional(),
      constraint: z.string().max(2000).optional(),
      verification_gate: z.string().max(2000).optional(),
      generated_at: z.number().int().positive(),
    }),
    receiptHash: z.string().regex(/^[a-f0-9]{64}$/),
  })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const canonicalPayload = canonicalizeBlueprintReceipt(input.envelope);
    const serverHash = hashBlueprintReceipt(input.envelope);
    if (input.sessionId !== input.envelope.session_id || serverHash !== input.receiptHash) {
      await db.insert(clarityAuditEvents).values({ timestamp: new Date(), sessionId: input.sessionId, userId: ctx.user.id, eventType: "TAMPER_ATTEMPT", clientHash: input.receiptHash, serverHash, ipAddress: requestIp(ctx.req) });
      console.error("[TAMPER_ATTEMPT] Clarity Truth Ledger hash mismatch", { userId: ctx.user.id, sessionId: input.sessionId, clientHash: input.receiptHash, serverHash });
      throw new TRPCError({ code: "BAD_REQUEST", message: input.sessionId === input.envelope.session_id ? "Receipt hash verification failed." : "Receipt session identity does not match the authenticated session." });
    }

    const findExisting = async () => {
      const [record] = await db.select().from(clarityTruthLedger).where(and(eq(clarityTruthLedger.userId, ctx.user.id), eq(clarityTruthLedger.sessionId, input.sessionId))).limit(1);
      return record;
    };
    const existing = await findExisting();
    if (existing) {
      if (existing.hash !== serverHash) {
        await db.insert(clarityAuditEvents).values({ timestamp: new Date(), sessionId: input.sessionId, userId: ctx.user.id, eventType: "TAMPER_ATTEMPT", clientHash: input.receiptHash, serverHash, ipAddress: requestIp(ctx.req) });
        console.error("[TAMPER_ATTEMPT] Clarity Truth Ledger session replay mismatch", { userId: ctx.user.id, sessionId: input.sessionId, clientHash: input.receiptHash, serverHash, existingHash: existing.hash });
        throw new TRPCError({ code: "BAD_REQUEST", message: "A different receipt already exists for this session." });
      }
      return { sessionId: input.sessionId, envelope: JSON.parse(existing.canonicalPayload) as typeof input.envelope, receiptHash: existing.hash, savedAt: existing.createdAt.getTime() } as const;
    }

    try {
      await db.insert(clarityTruthLedger).values({ userId: ctx.user.id, sessionId: input.sessionId, timestamp: new Date(input.envelope.generated_at), premiseBroken: input.envelope.contradiction_summary, boundedAction: input.envelope.bounded_action ?? "No bounded action committed.", constraint: input.envelope.constraint ?? "No additional constraint recorded.", verificationGate: input.envelope.verification_gate ?? "No verification gate recorded.", canonicalPayload, hash: serverHash, status: "PENDING" });
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      const raced = await findExisting();
      if (!raced || raced.hash !== serverHash) throw error;
      return { sessionId: input.sessionId, envelope: JSON.parse(raced.canonicalPayload) as typeof input.envelope, receiptHash: raced.hash, savedAt: raced.createdAt.getTime() } as const;
    }

    await db.insert(clarityAuditEvents).values({ timestamp: new Date(), sessionId: input.sessionId, userId: ctx.user.id, eventType: "RECEIPT_ACCEPTED", clientHash: input.receiptHash, serverHash, ipAddress: requestIp(ctx.req) });
    const conversationIds = await db.insert(conversations).values({ userId: ctx.user.id, kind: "clarity", title: input.envelope.original_proposition.slice(0, 96) || "Deterministic Clarity session" }).$returningId();
    const conversationId = conversationIds[0]!.id;
    await db.insert(conversationMessages).values([
      { conversationId, role: "user", content: input.envelope.original_proposition, metadata: { engine: "xinus-clarity-blueprint", sessionId: input.sessionId } },
      { conversationId, role: "assistant", content: `Deterministic ${input.envelope.completion_type} receipt committed. Dominant tactic: ${input.envelope.dominant_tactic}.`, metadata: { engine: "xinus-clarity-blueprint", receiptHash: serverHash, state: input.envelope.terminal_state } },
    ]);
    return { sessionId: input.sessionId, envelope: input.envelope, receiptHash: serverHash, savedAt: Date.now() } as const;
  }),
  history: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    const records = await db.select().from(conversations).where(and(eq(conversations.userId, ctx.user.id), eq(conversations.kind, "clarity"))).orderBy(desc(conversations.updatedAt)).limit(24);
    return Promise.all(records.map(async record => {
      const messages = await db.select({ role: conversationMessages.role, content: conversationMessages.content, metadata: conversationMessages.metadata, createdAt: conversationMessages.createdAt }).from(conversationMessages).where(eq(conversationMessages.conversationId, record.id)).orderBy(asc(conversationMessages.createdAt)).limit(12);
      const proposition = messages.find(message => message.role === "user");
      const reflection = messages.find(message => message.role === "assistant");
      const metadata = proposition?.metadata && typeof proposition.metadata === "object" && !Array.isArray(proposition.metadata) ? proposition.metadata as Record<string, unknown> : null;
      return { ...record, proposition: proposition?.content ?? "", reflection: reflection?.content ?? "", attachmentName: typeof metadata?.attachmentName === "string" ? metadata.attachmentName : null, messageCount: messages.length };
    }));
  }),
  deleteHistory: protectedProcedure.input(z.object({ conversationId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    await db.delete(conversations).where(and(eq(conversations.id, input.conversationId), eq(conversations.userId, ctx.user.id), eq(conversations.kind, "clarity")));
    return { success: true } as const;
  }),
  resetSession: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await requireDb();
    const reset = claritySessionResetPatch();
    await db.update(claritySessions).set({ ...reset, lastSeenAt: new Date() }).where(eq(claritySessions.userId, ctx.user.id));
    return { success: true, state: reset.currentState } as const;
  }),
  run: protectedProcedure.input(z.object({
    problem: z.string().trim().min(1).max(50000),
    action: z.enum(["start", "respond", "act"]).default("start"),
    attachmentName: z.string().max(255).optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const previous = await db.select().from(claritySessions).where(eq(claritySessions.userId, ctx.user.id)).limit(1);
    const evaluation = evaluateClarity({ proposition: input.problem, action: input.action as ClarityAction, priorResistance: previous[0]?.resistance ?? 0 });
    const response = renderClarityEvaluation(evaluation);
    const title = input.problem.slice(0, 96);
    const conversationIds = await db.insert(conversations).values({ userId: ctx.user.id, kind: "clarity", title }).$returningId();
    const conversationId = conversationIds[0]!.id;
    const metadata = input.attachmentName ? { attachmentName: input.attachmentName } : null;
    await db.insert(conversationMessages).values({ conversationId, role: "user", content: input.problem, metadata });
    const sessionId = previous[0]?.id ?? (await db.insert(claritySessions).values({ userId: ctx.user.id, conversationId }).$returningId())[0]!.id;
    await db.insert(conversationMessages).values({ conversationId, role: "assistant", content: response, metadata: { action: input.action, state: evaluation.state } });
    const persistedState = evaluation.state === "TRANSCEND" ? "RESPOND" : evaluation.state;
    await db.update(claritySessions).set({ conversationId, resistance: evaluation.resistanceCounter, currentState: persistedState, turnCount: (previous[0]?.turnCount ?? 0) + 1, lastSeenAt: new Date() }).where(eq(claritySessions.id, sessionId));
    await db.insert(clarityTracePoints).values({ sessionId, turn: (previous[0]?.turnCount ?? 0) + 1, state: persistedState, resistance: evaluation.resistanceCounter, tags: { action: input.action, state: evaluation.state } });
    return { conversationId, response, state: evaluation.state, resistance: evaluation.resistanceCounter, requiresFork: evaluation.requiresFork, boundedAction: evaluation.boundedAction ?? null, operationalConstraint: evaluation.operationalConstraint ?? null, verificationGate: evaluation.verificationGate ?? null };
  }),
  commitTruthLedger: protectedProcedure.input(z.object({
    premiseBroken: z.string().trim().min(1).max(2000),
    boundedAction: z.string().trim().min(1).max(2000),
    constraint: z.string().trim().min(1).max(2000),
    verificationGate: z.string().trim().min(1).max(2000),
  })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const receipt = createTruthLedgerReceipt(input);
    await db.insert(clarityTruthLedger).values({ userId: ctx.user.id, sessionId: receipt.sessionId, timestamp: new Date(receipt.timestamp), premiseBroken: input.premiseBroken, boundedAction: input.boundedAction, constraint: input.constraint, verificationGate: input.verificationGate, canonicalPayload: receipt.canonicalPayload, hash: receipt.hash, status: "PENDING" });
    return { ...receipt };
  }),
  truthLedger: protectedProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    return db.select().from(clarityTruthLedger).where(eq(clarityTruthLedger.userId, ctx.user.id)).orderBy(desc(clarityTruthLedger.createdAt)).limit(12);
  }),
});

const gedLearnerSchema = z.object({
  goal: z.string().trim().max(160).optional(),
  confidence: z.enum(["building", "steady", "strong"]).optional(),
  style: z.enum(["guided", "visual", "challenge"]).optional(),
  tone: z.enum(["warm", "playful", "direct"]).optional(),
  interests: z.string().trim().max(240).optional(),
  strengths: z.string().trim().max(240).optional(),
  focusAreas: z.string().trim().max(240).optional(),
});

function gedTeachingSystem(subject: "math" | "rla" | "science" | "social", learner?: z.infer<typeof gedLearnerSchema>) {
  const profile = [learner?.goal ? `Goal: ${learner.goal}` : null, learner?.confidence ? `Confidence: ${learner.confidence}` : null, learner?.style ? `Preferred teaching style: ${learner.style}` : null, learner?.tone ? `Preferred teaching tone: ${learner.tone}` : null, learner?.strengths ? `Existing strengths: ${learner.strengths}` : null, learner?.focusAreas ? `Focus areas: ${learner.focusAreas}` : null, learner?.interests ? `Motivators or interests: ${learner.interests}` : null].filter(Boolean).join("\n");
  return `You are XinUS GED Tutor, an expert adult educator for GED ${subject.toUpperCase()} and a warm, engaging study coach. Teach accurately with an encouraging, fun, age-respectful tone. Adapt your explanation to the learner profile below. Start with one quick confidence-building observation, then use short markdown sections titled Concept, Try it, Check yourself, and Next practice. Do not simply give a final answer when reasoning can be taught. Never bluff or invent facts. If the question depends on a current, obscure, or uncertain fact, add a concise Verify this note that identifies an appropriate trustworthy source category (official GED materials, a library database, a textbook, or a subject authority), then continue by teaching the durable concept you can verify from the learner’s prompt. Write mathematics in plain learner-readable notation only: use √(6), 3/4, 2^2, ≤, and ×. Never use LaTeX delimiters ($ or $$), backslash commands, or code-like math notation.\n\nLearner profile:\n${profile || "No saved preferences yet — ask one concise question that will help you adapt."}`;
}

async function findGedResearch(query: string) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return { available: false, message: "Verified research is not configured yet. Use official GED materials, a library database, or a subject textbook to confirm this detail." as const, sources: [] as Array<{ title: string; url: string; snippet: string }> };
  try {
    const response = await fetch("https://api.tavily.com/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ api_key: apiKey, query: `GED study question: ${query}`, max_results: 3, search_depth: "basic" }) });
    if (!response.ok) throw new Error("Research service did not accept the request.");
    const payload = await response.json() as { results?: Array<{ title?: string; url?: string; content?: string }> };
    const sources = (payload.results ?? []).filter(item => item.title && item.url).map(item => ({ title: item.title!, url: item.url!, snippet: (item.content ?? "").slice(0, 260) }));
    return sources.length ? { available: true, message: "Use these sources to verify the detail, then return here to work through the concept together." as const, sources } : { available: false, message: "No focused verification source was found. Try rephrasing the question or consult official GED materials." as const, sources: [] };
  } catch {
    return { available: false, message: "Verified research is temporarily unavailable. Your tutor can still explain the durable concept and recommend a trusted source category." as const, sources: [] as Array<{ title: string; url: string; snippet: string }> };
  }
}

const ged = router({
  sessions: protectedProcedure.input(z.object({ subject: gedSubjectSchema }).optional()).query(async ({ ctx, input }) => {
    await requireProduct(ctx.user, "ged_tutor");
    const db = await requireDb();
    if (input) {
      return db.select().from(gedSessions).where(and(eq(gedSessions.userId, ctx.user.id), eq(gedSessions.subject, input.subject))).orderBy(desc(gedSessions.updatedAt)).limit(12);
    }
    return db.select().from(gedSessions).where(eq(gedSessions.userId, ctx.user.id)).orderBy(desc(gedSessions.updatedAt)).limit(24);
  }),
  sendTurn: protectedProcedure.input(z.object({ sessionId: z.number().int().positive().optional(), subject: gedSubjectSchema, message: z.string().trim().min(1).max(4000), learner: gedLearnerSchema.optional() })).mutation(async ({ ctx, input }) => {
    await requireProduct(ctx.user, "ged_tutor");
    const db = await requireDb();
    let sessionId = input.sessionId;
    if (!sessionId) sessionId = (await db.insert(gedSessions).values({ userId: ctx.user.id, subject: input.subject, title: `${input.subject.toUpperCase()} practice` }).$returningId())[0]!.id;
    const owned = await db.select().from(gedSessions).where(and(eq(gedSessions.id, sessionId), eq(gedSessions.userId, ctx.user.id))).limit(1);
    if (!owned[0]) throw new TRPCError({ code: "FORBIDDEN", message: "This GED session is not available to your account." });
    await db.insert(gedTurns).values({ sessionId, role: "student", content: input.message });
    const response = await complete(await withReflectiveContext(ctx.user.id, "ged_tutor", gedTeachingSystem(input.subject, input.learner)), input.message, 900, "ged.send_turn");
    await db.insert(gedTurns).values({ sessionId, role: "tutor", content: response });
    return { sessionId, response };
  }),
  recommend: protectedProcedure.input(z.object({ subject: gedSubjectSchema, learner: gedLearnerSchema, studyFocus: z.string().trim().max(80).optional(), recentChallenge: z.string().trim().max(600).optional() })).mutation(async ({ ctx, input }) => {
    await requireProduct(ctx.user, "ged_tutor");
    const prompt = `Create a personalized GED ${input.subject.toUpperCase()} study recommendation. Include: (1) a 20-minute next study block that uses the stated study focus, (2) one fun practice idea tied to the learner’s interests when supplied, (3) one confidence-building sentence that recognizes supplied strengths, and (4) a research-aware note only if the stated challenge needs a verified source. Keep it under 220 words.\n\nStudy focus: ${input.studyFocus || "Build core understanding"}\nRecent challenge: ${input.recentChallenge || "Not specified"}`;
    const recommendation = await complete(await withReflectiveContext(ctx.user.id, "ged_tutor", gedTeachingSystem(input.subject, input.learner)), prompt, 700, "ged.recommend");
    return { recommendation };
  }),
  research: protectedProcedure.input(z.object({ question: z.string().trim().min(8).max(600) })).mutation(async ({ ctx, input }) => {
    await requireProduct(ctx.user, "ged_tutor");
    return findGedResearch(input.question);
  }),
});

const gems = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    await requireProduct(ctx.user, "hidden_gems");
    const db = await requireDb();
    return db.select().from(gemAppraisals).where(eq(gemAppraisals.userId, ctx.user.id)).orderBy(desc(gemAppraisals.createdAt)).limit(20);
  }),
  appraise: protectedProcedure.input(z.object({ imageUrl: gemImageReferenceSchema, hint: z.string().trim().max(500).optional() })).mutation(async ({ ctx, input }) => {
    await requireProduct(ctx.user, "hidden_gems");
    const db = await ensureProfile(ctx.user.id);
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, ctx.user.id)).limit(1);
    const preparedImage = await prepareGemImage(ctx.user.id, input.imageUrl);
    let source: "free_quota" | "xc" | "plus" = "plus";
    let quota: { allowed: boolean; used: number; limit: number } | null = null;
    let xcSpent = false;
    if (profile?.subscriptionTier !== "plus" && !isUnlimitedPrivateDeployment()) {
      const spending = await spendCredit(ctx.user.id, 1, XC_REASONS.gemsSpend);
      if (spending.ok) {
        source = "xc";
        xcSpent = true;
      } else {
        quota = await reserveQuota(ctx.user.id, "gems", 3);
        if (!quota.allowed) throw new TRPCError({ code: "PAYMENT_REQUIRED", message: "You are out of free appraisals and out of XC. Upgrade to XinUS Plus or earn more coins." });
        source = "free_quota";
      }
    }
    try {
      const response = await modelResolver({
        model: process.env.OLLAMA_VISION_MODEL?.trim() || undefined,
        messages: [{ role: "system", content: "You are XinUS Hidden Gems. Return an accurate, cautious JSON appraisal. Do not claim professional authentication." }, { role: "user", content: [{ type: "text", text: `Appraise this object. Context: ${input.hint ?? "none"}` }, { type: "image_url", image_url: { url: preparedImage.imageForVision, detail: "high" } }] }],
        response_format: { type: "json_schema", json_schema: { name: "gem_appraisal", strict: true, schema: { type: "object", properties: { title: { type: "string" }, category: { type: "string" }, estimatedRange: { type: "string" }, confidence: { type: "string" }, condition: { type: "string" }, evidence: { type: "array", items: { type: "string" } }, cautions: { type: "array", items: { type: "string" } }, nextStep: { type: "string" } }, required: ["title", "category", "estimatedRange", "confidence", "condition", "evidence", "cautions", "nextStep"], additionalProperties: false } } },
        maxTokens: 900,
        dataSensitivity: "restricted",
      });
      const raw = asText(response.choices[0]?.message.content ?? "");
      let appraisal: Record<string, unknown>;
      try { appraisal = JSON.parse(raw) as Record<string, unknown>; }
      catch {
        if (xcSpent) await creditGrantResolver(ctx.user.id, 1, XC_REASONS.gemsUnreadableRefund);
        throw new TRPCError({ code: "BAD_GATEWAY", message: "XinUS could not read the appraisal response. Your XC was refunded." });
      }
      await creditGrantResolver(ctx.user.id, 3, XC_REASONS.firstAppraisal, "first_appraisal_bonus_v1");
      const id = (await db.insert(gemAppraisals).values({ userId: ctx.user.id, imageUrl: preparedImage.imageUrl, imageKey: preparedImage.imageKey, hint: input.hint, result: appraisal, source }).$returningId())[0]!.id;
      recordWorkflowQuality({ workflow: "hidden_gems.appraise", outcome: "success", dataSensitivity: "restricted" });
      return { id, appraisal, quota, source, creditBalance: await creditBalanceResolver(ctx.user.id) };
    } catch (error) {
      recordWorkflowQuality({ workflow: "hidden_gems.appraise", outcome: "failure", dataSensitivity: "restricted" });
      if (xcSpent && !(error instanceof TRPCError)) await creditGrantResolver(ctx.user.id, 1, XC_REASONS.gemsUnavailableRefund);
      throw error;
    }
  }),
});

const pd = router({
  workspace: protectedProcedure.query(async ({ ctx }) => {
    const { db, workspace } = await getOrCreateWorkspace(ctx.user);
    const cases = await db.select().from(pdCases).where(eq(pdCases.workspaceId, workspace.id)).orderBy(desc(pdCases.updatedAt));
    return { workspace, cases };
  }),
  setMode: protectedProcedure.input(z.object({ mode: z.enum(["CLIENT", "PD", "EMERGENCY"]) })).mutation(async ({ ctx, input }) => {
    const { db, workspace } = await getOrCreateWorkspace(ctx.user);
    const set = input.mode === "EMERGENCY" ? { mode: input.mode, preEmergencyMode: workspace.mode === "PD" ? "PD" as const : "CLIENT" as const, riskScore: Math.min(100, workspace.riskScore + 25), lastAction: "Emergency protocol activated", lastEventAt: new Date() } : { mode: input.mode, lastAction: `Mode set to ${input.mode}`, lastEventAt: new Date() };
    await db.update(pdWorkspaces).set(set).where(eq(pdWorkspaces.id, workspace.id));
    return { success: true };
  }),
  createCase: protectedProcedure.input(z.object({ name: z.string().trim().min(1).max(255), client: z.string().trim().max(255).optional() })).mutation(async ({ ctx, input }) => {
    const { db, workspace } = await getOrCreateWorkspace(ctx.user);
    const ids = await db.insert(pdCases).values({ workspaceId: workspace.id, name: input.name, client: input.client || null }).$returningId();
    return { id: ids[0]!.id };
  }),
  addNote: protectedProcedure.input(z.object({ caseId: z.number().int().positive(), text: z.string().trim().min(1).max(8000), source: z.enum(["voice", "note"]).default("note") })).mutation(async ({ ctx, input }) => {
    const { db, workspace } = await getOrCreateWorkspace(ctx.user);
    const owned = await db.select().from(pdCases).where(and(eq(pdCases.id, input.caseId), eq(pdCases.workspaceId, workspace.id))).limit(1);
    if (!owned[0]) throw new TRPCError({ code: "FORBIDDEN", message: "This PD case is not available to your workspace." });
    const extracted = extractPdActions(input.text);
    await db.insert(pdCaseNotes).values({ caseId: input.caseId, text: input.text, source: input.source });
    if (extracted.tasks.length) await db.insert(pdCaseTasks).values(extracted.tasks.map(text => ({ caseId: input.caseId, text, source: input.source })));
    if (extracted.deadlines.length) await db.insert(pdCaseDeadlines).values(extracted.deadlines.map(item => ({ caseId: input.caseId, label: item.label, dueAt: item.dueAt })));
    await db.update(pdWorkspaces).set({ lastAction: "Case note recorded", clarityLevel: Math.min(100, workspace.clarityLevel + 4), lastEventAt: new Date() }).where(eq(pdWorkspaces.id, workspace.id));
    return extracted;
  }),
  toggleTask: protectedProcedure.input(z.object({ taskId: z.number().int().positive(), done: z.boolean() })).mutation(async ({ ctx, input }) => {
    const { db, workspace } = await getOrCreateWorkspace(ctx.user);
    const tasks = await db.select({ id: pdCaseTasks.id }).from(pdCaseTasks).innerJoin(pdCases, eq(pdCaseTasks.caseId, pdCases.id)).where(and(eq(pdCaseTasks.id, input.taskId), eq(pdCases.workspaceId, workspace.id))).limit(1);
    if (!tasks[0]) throw new TRPCError({ code: "FORBIDDEN", message: "This task is not available to your workspace." });
    await db.update(pdCaseTasks).set({ done: input.done, completedAt: input.done ? new Date() : null }).where(eq(pdCaseTasks.id, input.taskId));
    return { success: true };
  }),
  caseReport: protectedProcedure.input(z.object({ caseId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const { db, workspace } = await getOrCreateWorkspace(ctx.user);
    const [caseRecord] = await db.select().from(pdCases).where(and(eq(pdCases.id, input.caseId), eq(pdCases.workspaceId, workspace.id))).limit(1);
    if (!caseRecord) throw new TRPCError({ code: "FORBIDDEN", message: "This PD case is not available for export." });
    const [notes, tasks, deadlines] = await Promise.all([
      db.select().from(pdCaseNotes).where(eq(pdCaseNotes.caseId, caseRecord.id)).orderBy(desc(pdCaseNotes.createdAt)).limit(20),
      db.select().from(pdCaseTasks).where(eq(pdCaseTasks.caseId, caseRecord.id)).orderBy(desc(pdCaseTasks.createdAt)).limit(50),
      db.select().from(pdCaseDeadlines).where(eq(pdCaseDeadlines.caseId, caseRecord.id)).orderBy(pdCaseDeadlines.dueAt).limit(50),
    ]);
    return { caseRecord, notes, tasks, deadlines, workspace: { mode: workspace.mode, clarityLevel: workspace.clarityLevel, riskScore: workspace.riskScore } };
  }),
  officeAssist: protectedProcedure.input(z.object({ message: z.string().trim().min(1).max(8000) })).mutation(async ({ ctx, input }) => ({ response: await complete(await withReflectiveContext(ctx.user.id, "pd_pro", "You are XinUS PD Pro Office. Produce organized, professional work product with headings and direct language. Never present yourself as legal counsel. Label provided material as Inputs, distinguish any Draft or Working analysis from verified fact, identify Unknowns to verify, and end with a Review checklist requiring qualified human approval before use or distribution."), input.message, 1100, "pd.office_assist") })),
});

const recidivism = router({
  listSubjects: protectedProcedure.query(async ({ ctx }) => {
    await requireSupervisionAccess(ctx.user);
    const db = await requireDb();
    return db.select().from(recidivismSubjects).where(eq(recidivismSubjects.ownerUserId, ctx.user.id)).orderBy(desc(recidivismSubjects.updatedAt));
  }),
  createSubject: protectedProcedure.input(z.object({ name: z.string().trim().min(1).max(255) })).mutation(async ({ ctx, input }) => {
    await requireSupervisionAccess(ctx.user);
    const db = await requireDb();
    const ids = await db.insert(recidivismSubjects).values({ ownerUserId: ctx.user.id, name: input.name }).$returningId();
    return { id: ids[0]!.id };
  }),
  getSubject: protectedProcedure.input(z.object({ subjectId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const { db, subject } = await getSubjectForOwner(ctx.user, input.subjectId);
    const [triggers, obligations, contacts, geofences, alerts] = await Promise.all([
      db.select().from(recidivismTriggers).where(eq(recidivismTriggers.subjectId, subject.id)).orderBy(desc(recidivismTriggers.occurredAt)).limit(12),
      db.select().from(recidivismObligations).where(eq(recidivismObligations.subjectId, subject.id)).orderBy(recidivismObligations.dueAt),
      db.select().from(recidivismContacts).where(eq(recidivismContacts.subjectId, subject.id)),
      db.select().from(recidivismGeofences).where(eq(recidivismGeofences.subjectId, subject.id)),
      db.select().from(recidivismAlerts).where(eq(recidivismAlerts.subjectId, subject.id)).orderBy(desc(recidivismAlerts.occurredAt)).limit(20),
    ]);
    return { subject, triggers, obligations, contacts, geofences, alerts };
  }),
  addTrigger: protectedProcedure.input(z.object({ subjectId: z.number().int().positive(), situation: z.string().trim().min(1).max(2000), place: z.string().trim().max(255).optional(), person: z.string().trim().max(255).optional(), note: z.string().trim().max(4000).optional() })).mutation(async ({ ctx, input }) => {
    const { db, subject } = await getSubjectForOwner(ctx.user, input.subjectId);
    await db.insert(recidivismTriggers).values({ subjectId: subject.id, occurredAt: new Date(), situation: input.situation, place: input.place || null, person: input.person || null, note: input.note || null });
    const riskScore = Math.min(100, subject.riskScore + 8);
    await db.update(recidivismSubjects).set({ riskScore }).where(eq(recidivismSubjects.id, subject.id));
    if (riskScore >= 70) await db.insert(recidivismAlerts).values({ subjectId: subject.id, type: "high_risk" });
    return { riskScore };
  }),
  addObligation: protectedProcedure.input(z.object({ subjectId: z.number().int().positive(), title: z.string().trim().min(1).max(255), dueAt: z.date(), type: z.enum(["court", "meeting", "test", "curfew"]) })).mutation(async ({ ctx, input }) => {
    const { db, subject } = await getSubjectForOwner(ctx.user, input.subjectId);
    const ids = await db.insert(recidivismObligations).values({ subjectId: subject.id, title: input.title, dueAt: input.dueAt, type: input.type }).$returningId();
    return { id: ids[0]!.id };
  }),
  setObligationStatus: protectedProcedure.input(z.object({ obligationId: z.number().int().positive(), status: z.enum(["upcoming", "completed", "missed"]) })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const matched = await db.select({ id: recidivismObligations.id, subjectId: recidivismObligations.subjectId }).from(recidivismObligations).innerJoin(recidivismSubjects, eq(recidivismObligations.subjectId, recidivismSubjects.id)).where(and(eq(recidivismObligations.id, input.obligationId), eq(recidivismSubjects.ownerUserId, ctx.user.id))).limit(1);
    if (!matched[0]) throw new TRPCError({ code: "FORBIDDEN", message: "This obligation is not available to your account." });
    await db.update(recidivismObligations).set({ status: input.status }).where(eq(recidivismObligations.id, input.obligationId));
    if (input.status === "missed") await db.insert(recidivismAlerts).values({ subjectId: matched[0].subjectId, type: "missed_obligation" });
    return { success: true };
  }),
  addContact: protectedProcedure.input(z.object({ subjectId: z.number().int().positive(), name: z.string().trim().min(1).max(255), role: z.string().trim().min(1).max(128), phone: z.string().trim().min(5).max(64) })).mutation(async ({ ctx, input }) => {
    const { db, subject } = await getSubjectForOwner(ctx.user, input.subjectId);
    const ids = await db.insert(recidivismContacts).values({ subjectId: subject.id, name: input.name, role: input.role, phone: input.phone }).$returningId();
    return { id: ids[0]!.id };
  }),
  addGeofence: protectedProcedure.input(z.object({ subjectId: z.number().int().positive(), name: z.string().trim().min(1).max(255), address: z.string().trim().min(1).max(2000), radius: z.number().int().min(1).max(50000), type: z.enum(["avoid", "required"]) })).mutation(async ({ ctx, input }) => {
    const { db, subject } = await getSubjectForOwner(ctx.user, input.subjectId);
    const ids = await db.insert(recidivismGeofences).values({ subjectId: subject.id, name: input.name, address: input.address, radius: input.radius, type: input.type }).$returningId();
    return { id: ids[0]!.id };
  }),
  resolveAlert: protectedProcedure.input(z.object({ alertId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const alerts = await db.select({ id: recidivismAlerts.id }).from(recidivismAlerts).innerJoin(recidivismSubjects, eq(recidivismAlerts.subjectId, recidivismSubjects.id)).where(and(eq(recidivismAlerts.id, input.alertId), eq(recidivismSubjects.ownerUserId, ctx.user.id))).limit(1);
    if (!alerts[0]) throw new TRPCError({ code: "FORBIDDEN", message: "This alert is not available to your account." });
    await db.update(recidivismAlerts).set({ resolved: true, resolvedAt: new Date() }).where(eq(recidivismAlerts.id, input.alertId));
    return { success: true };
  }),
});

const sitrep = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    await requireProduct(ctx.user, "sitrep");
    const db = await requireDb();
    return db.select().from(sitrepAssessments).where(eq(sitrepAssessments.userId, ctx.user.id)).orderBy(desc(sitrepAssessments.createdAt)).limit(12);
  }),
  assess: protectedProcedure.input(z.object({ mode: sitrepModeSchema, situation: z.string().trim().min(1).max(4000), context: z.string().trim().max(2000).optional(), planningHorizon: z.string().trim().max(64).default("not specified"), includeSimulation: z.boolean().default(true), claims: z.array(z.object({ id: z.string().trim().min(1).max(128), text: z.string().trim().min(1).max(1000), sourceName: z.string().trim().min(1).max(255), status: z.enum(["verified", "unverified"]) })).max(100).default([]), sourceDocuments: z.array(z.object({ name: z.string().trim().min(1).max(255), size: z.number().int().nonnegative().max(20_000_000), claimCount: z.number().int().nonnegative().max(100) })).max(10).default([]) })).mutation(async ({ ctx, input }) => {
    await requireProduct(ctx.user, "sitrep");
    const assessmentId = `sitrep_${ctx.user.id}_${Date.now()}`;
    const tracking = createSitRepEvidenceTracking({ assessmentId, mode: input.mode, situation: input.situation, context: input.context, planningHorizon: input.planningHorizon, includeSimulation: input.includeSimulation, claims: input.claims, sourceDocuments: input.sourceDocuments });
    const disclaimer = input.mode === "immigration" ? "This is general information, not legal advice.\n\n" : "";
    const response = disclaimer + await complete(await withReflectiveContext(ctx.user.id, "sitrep", `You are XinUS SitRep in ${input.mode} mode. Return markdown sections exactly titled Situation inputs, Working assessment, Unknowns to verify, Options, Recommended next move, and Human review. Be concrete, careful, and non-diagnostic. Never invent source facts or represent a proposed action as an authorized instruction. Confidence is separate from evidence verification. Never call supplied claims verified unless the user provides independent verification. End with the human review boundary.`), `Planning horizon: ${input.planningHorizon}\nSituation: ${input.situation}\nContext: ${input.context ?? "None"}`, 1000, "sitrep.assess");
    const db = await requireDb();
    const ids = await db.insert(sitrepAssessments).values({ userId: ctx.user.id, mode: input.mode, situation: input.situation, context: input.context || null, result: response, evidenceStatus: tracking.evidenceStatus, simulationStatus: tracking.simulationStatus, confidenceScore: Math.round(tracking.baseline.confidence * 100), decisionState: tracking.decisionState, tracking }).$returningId();
    return { id: ids[0]!.id, response, tracking };
  }),
});

const pam = router({
  history: protectedProcedure.query(async ({ ctx }) => {
    await requireProduct(ctx.user, "pam");
    const db = await requireDb();
    return db.select().from(conversations).where(and(eq(conversations.userId, ctx.user.id), eq(conversations.kind, "pam"))).orderBy(desc(conversations.updatedAt)).limit(12);
  }),
  converse: protectedProcedure.input(z.object({ persona: z.literal("PAM").default("PAM"), tone: z.enum(["calm", "balanced", "intense"]).default("balanced"), intensity: z.number().int().min(1).max(3).default(2), omni: z.boolean().default(false), message: z.string().trim().min(1).max(4000) })).mutation(async ({ ctx, input }) => {
    await requireProduct(ctx.user, "pam");
    const db = await requireDb();
    const conversationId = (await db.insert(conversations).values({ userId: ctx.user.id, kind: "pam", title: `${input.persona} conversation` }).$returningId())[0]!.id;
    await db.insert(conversationMessages).values({ conversationId, role: "user", content: input.message });
    let response: string;
    try { response = await complete(await withReflectiveContext(ctx.user.id, "pam", `You are PAM, the XinUS reflective assistant. Use a ${input.tone} tone at intensity ${input.intensity}/3. Be concise, grounded, and never claim medical, legal, or emergency authority. Use sections titled What I heard, Working frame, What to check, and Next move. Clearly separate the user’s stated experience from your working inference.${input.omni ? " Omni awareness is enabled: when useful, direct the user to the relevant XinUS module—Clarity, GED Tutor, Hidden Gems, PD Pro, Recidivism, or SitRep." : ""}`), input.message, 650, "pam.converse"); }
    catch { response = "I’m here. State the decision, the constraint, and the next action you can take in the next ten minutes."; }
    await db.insert(conversationMessages).values({ conversationId, role: "assistant", content: response });
    return { conversationId, response };
  }),
});

const work = router({
  list: protectedProcedure.input(z.object({ productKey: z.enum(productKeyValues), status: z.enum(["active", "complete", "archived"]).optional() })).query(async ({ ctx, input }) => {
    if (input.productKey !== "clarity") {
      if (input.productKey === "recovery" || input.productKey === "task_force_pro") await requireSupervisionAccess(ctx.user);
      else await requireProduct(ctx.user, input.productKey);
    }
    const db = await requireDb();
    const filters = [eq(productWorkItems.userId, ctx.user.id), eq(productWorkItems.productKey, input.productKey)];
    if (input.status) filters.push(eq(productWorkItems.status, input.status));
    return db.select().from(productWorkItems).where(and(...filters)).orderBy(desc(productWorkItems.updatedAt)).limit(24);
  }),
  create: protectedProcedure.input(z.object({ productKey: z.enum(productKeyValues), kind: z.string().trim().min(1).max(64), title: z.string().trim().min(1).max(255), details: z.string().trim().max(4000).optional(), metadata: z.record(z.string(), z.unknown()).optional() })).mutation(async ({ ctx, input }) => {
    if (input.productKey !== "clarity") {
      if (input.productKey === "recovery" || input.productKey === "task_force_pro") await requireSupervisionAccess(ctx.user);
      else await requireProduct(ctx.user, input.productKey);
    }
    const db = await requireDb();
    const ids = await db.insert(productWorkItems).values({ userId: ctx.user.id, productKey: input.productKey, kind: input.kind, title: input.title, details: input.details || null, metadata: input.metadata ?? null }).$returningId();
    return { id: ids[0]!.id };
  }),
  setStatus: protectedProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["active", "complete", "archived"]) })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const [item] = await db.select().from(productWorkItems).where(and(eq(productWorkItems.id, input.id), eq(productWorkItems.userId, ctx.user.id))).limit(1);
    if (!item) throw new TRPCError({ code: "FORBIDDEN", message: "This XinUS work record is not available to your account." });
    await db.update(productWorkItems).set({ status: input.status }).where(eq(productWorkItems.id, item.id));
    return { success: true };
  }),
});

const streamlineFocus: Record<(typeof productKeyValues)[number], string> = {
  clarity: "clarify decision criteria, constraints, and a reversible next move",
  ged_tutor: "turn a learning obstacle into a short practice loop and confidence check",
  hidden_gems: "separate observable evidence, provenance questions, uncertainty, and the next research step",
  pd_pro: "organize a reviewable casework follow-through without asserting legal conclusions or issuing instructions",
  recovery: "support a self-directed check-in, support step, and optional follow-up without risk scoring or diagnosis",
  task_force_pro: "organize an operational review without ranking people, escalating, or authorizing intervention",
  sitrep: "distinguish situation facts, unknowns, options, and a decision-owner review point",
  pam: "preserve one authorized continuity action and the question that remains open",
};

const streamline = router({
  draft: protectedProcedure.input(z.object({ productKey: z.enum(productKeyValues), intake: z.string().trim().min(1).max(6000), desiredOutcome: z.string().trim().max(1200).optional() })).mutation(async ({ ctx, input }) => {
    if (input.productKey !== "clarity") {
      if (input.productKey === "recovery" || input.productKey === "task_force_pro") await requireSupervisionAccess(ctx.user);
      else await requireProduct(ctx.user, input.productKey);
    }
    const draft = await complete(
      `You are XinUS Streamline for ${input.productKey}. Your product-specific aim is to ${streamlineFocus[input.productKey]}. Convert only the supplied intake into a concise, reviewable workload brief. Return markdown sections exactly titled Intake facts, Working priority, Next action, Follow-through, Unknowns, and Human review. Do not invent facts, rank a person, diagnose, authorize outreach, create a deadline, or represent a suggestion as an instruction. Keep sensitive legal, supervision, recovery, or appraisal material private to this local XinUS workflow.`,
      `Intake:\n${input.intake}\n\nDesired outcome:\n${input.desiredOutcome ?? "Clarify the next safe, useful action."}`,
      850,
      `streamline.${input.productKey}`,
    );
    return { draft, requiresHumanReview: true, productKey: input.productKey };
  }),
  accept: protectedProcedure.input(z.object({ productKey: z.enum(productKeyValues), title: z.string().trim().min(1).max(255), details: z.string().trim().max(4000).optional(), confirmed: z.literal(true) })).mutation(async ({ ctx, input }) => {
    if (input.productKey !== "clarity") {
      if (input.productKey === "recovery" || input.productKey === "task_force_pro") await requireSupervisionAccess(ctx.user);
      else await requireProduct(ctx.user, input.productKey);
    }
    const db = await requireDb();
    const ids = await db.insert(productWorkItems).values({ userId: ctx.user.id, productKey: input.productKey, kind: "human_reviewed_follow_up", title: input.title, details: input.details || null, metadata: { source: "xinus_streamline", humanReviewed: true } }).$returningId();
    return { id: ids[0]!.id, accepted: true };
  }),
  queue: protectedProcedure.input(z.object({ includeSensitive: z.boolean().default(false) }).default({ includeSensitive: false })).query(async ({ ctx, input }) => {
    const db = await requireDb();
    const items = await db.select().from(productWorkItems).where(and(eq(productWorkItems.userId, ctx.user.id), eq(productWorkItems.status, "active"))).orderBy(desc(productWorkItems.updatedAt)).limit(60);
    const restrictedProducts = new Set(["pd_pro", "recovery", "task_force_pro"]);
    return items.filter(item => input.includeSensitive || !restrictedProducts.has(item.productKey)).slice(0, 12).map(item => ({ id: item.id, productKey: item.productKey, kind: item.kind, title: item.title, updatedAt: item.updatedAt }));
  }),
});

const usage = router({
  summary: protectedProcedure.query(async ({ ctx }) => {
    const db = await ensureProfile(ctx.user.id);
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, ctx.user.id)).limit(1);
    const credits = await db.select({ balance: sql<number>`coalesce(sum(${creditLedger.delta}), 0)` }).from(creditLedger).where(eq(creditLedger.userId, ctx.user.id));
    return { profile, creditBalance: Number(credits[0]?.balance ?? 0) };
  }),
});

const admin = router({
  audit: adminProcedure.query(async () => {
    const db = await requireDb();
    const [commands, events, totals] = await Promise.all([
      db.select().from(terminalCommands).orderBy(desc(terminalCommands.createdAt)).limit(50),
      db.select().from(authAuditEvents).orderBy(desc(authAuditEvents.createdAt)).limit(50),
      db.select({ users: sql<number>`count(*)` }).from(users),
    ]);
    return { commands, events, totals: { users: Number(totals[0]?.users ?? 0) } };
  }),
  terminalHistory: adminProcedure.input(z.object({ command: z.string().trim().max(128).optional(), outcome: z.enum(["ok", "err", "pending_confirmation"]).optional() })).query(async ({ input }) => {
    const db = await requireDb();
    const conditions = [];
    if (input.command) conditions.push(sql`lower(${terminalCommands.command}) like ${`%${input.command.toLowerCase()}%`}`);
    if (input.outcome) conditions.push(eq(terminalCommands.outcome, input.outcome));
    return db.select().from(terminalCommands).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(terminalCommands.createdAt)).limit(200);
  }),
  runTerminal: adminProcedure.input(z.object({ input: z.string().trim().min(1).max(500), confirmed: z.boolean().default(false) })).mutation(async ({ ctx, input }) => {
    const mutating = ["/sessions kill", "/quota reset"];
    const needsConfirmation = mutating.some(command => input.input.startsWith(command));
    if (needsConfirmation && !input.confirmed) {
      await (await requireDb()).insert(terminalCommands).values({ userId: ctx.user.id, command: input.input.split(/\s+/)[0]!, args: input.input.split(/\s+/).slice(1).join(" "), outcome: "pending_confirmation" });
      return { ok: true, lines: ["Confirmation required before the mutating command can run."], requiresConfirmation: true };
    }
    const db = await requireDb();
    const [command, ...args] = input.input.split(/\s+/);
    let result: { ok: boolean; lines: string[]; requiresConfirmation?: boolean };
    if (command === "/help") result = { ok: true, lines: ["Available: /status, /users, /sessions, /billing, /quota, /logs, /open <route>, /clear.", "Mutating controls: /sessions kill and /quota reset require explicit confirmation."] };
    else if (command === "/clear") result = { ok: true, lines: ["Terminal buffer cleared. The audit ledger is retained."] };
    else if (command === "/status" || command === "/users") {
      const [total] = await db.select({ count: sql<number>`count(*)` }).from(users);
      result = { ok: true, lines: command === "/status" ? [`XinUS status: operational. Registered users: ${Number(total?.count ?? 0)}.`] : [`Registered users: ${Number(total?.count ?? 0)}. User-level details remain protected in the account domain.`] };
    } else if (command === "/sessions") {
      const [total] = await db.select({ count: sql<number>`count(*)` }).from(claritySessions);
      result = { ok: true, lines: [`Tracked clarity sessions: ${Number(total?.count ?? 0)}. Use /sessions kill with confirmation to request a controlled session action.`] };
    } else if (command === "/billing") {
      const [plus] = await db.select({ count: sql<number>`count(*)` }).from(userProfiles).where(eq(userProfiles.subscriptionTier, "plus"));
      result = { ok: true, lines: [`Active XinUS Plus profiles: ${Number(plus?.count ?? 0)}. Checkout and portal controls remain in the protected billing domain.`] };
    } else if (command === "/quota") {
      const [count] = await db.select({ count: sql<number>`count(*)` }).from(modeUsage);
      result = { ok: true, lines: [`Tracked weekly quota buckets: ${Number(count?.count ?? 0)}. Use /quota reset with confirmation to request a controlled reset action.`] };
    } else if (command === "/logs") {
      const events = await db.select({ kind: authAuditEvents.kind, createdAt: authAuditEvents.createdAt }).from(authAuditEvents).orderBy(desc(authAuditEvents.createdAt)).limit(5);
      result = { ok: true, lines: events.length ? events.map(event => `${event.createdAt.toISOString()} · ${event.kind}`) : ["No recent audited events."] };
    } else if (command === "/open") {
      const route = args[0] ?? "/";
      result = { ok: route.startsWith("/"), lines: route.startsWith("/") ? [`Open ${route} in the XinUS suite navigation.`] : ["Usage: /open /route"] };
    } else result = { ok: false, lines: ["Unknown command. Use /help for the safe XinUS terminal command set."] };
    await db.insert(terminalCommands).values({ userId: ctx.user.id, command: command!, args: args.join(" "), outcome: result.ok ? "ok" : "err" });
    return result;
  }),
});

export const suiteRouter = router({ clarity, ged, gems, pd, recidivism, sitrep, pam, work, streamline, usage, admin });
