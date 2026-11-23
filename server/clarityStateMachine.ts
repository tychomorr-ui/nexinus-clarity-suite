import { createHash, randomUUID } from "node:crypto";

export type ClarityState = "ALCHEMY" | "RESPOND" | "LIGHT_WARRIOR" | "TRANSCEND";
export type ClarityAction = "start" | "respond" | "act";

export type ClarityEvaluation = {
  state: ClarityState;
  mirrorReflection: string;
  falsePremise: string;
  boundedAction?: string;
  operationalConstraint?: string;
  verificationGate?: string;
  resistanceCounter: number;
  requiresFork: boolean;
};

export function claritySessionResetPatch() {
  return { conversationId: null, resistance: 0, currentState: "ALCHEMY" as const, turnCount: 0 };
}

const deflectionPattern = /(?:but|can't|cannot|impossible|always|never|they make me|they won't|what if|maybe someday|i need more time|not my fault|in theory|just thinking|i don't know where to start)/i;
const avoidancePattern = /(?:later|tomorrow|eventually|when things settle|after i|someday|keep thinking|research more|plan more|wait until)/i;

function clean(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function firstSentence(value: string) {
  return clean(value).split(/(?<=[.!?])\s+/)[0] || clean(value);
}

function preview(value: string) {
  const normalized = clean(value);
  return normalized.length > 600 ? `${normalized.slice(0, 600)}…` : normalized;
}

export function canonicalLedgerPayload(input: {
  timestamp: string;
  premiseBroken: string;
  boundedAction: string;
  constraint: string;
  verificationGate: string;
  sessionId: string;
}) {
  return JSON.stringify({
    timestamp: input.timestamp,
    premise_broken: input.premiseBroken,
    bounded_action: input.boundedAction,
    constraint: input.constraint,
    verification_gate: input.verificationGate,
    session_id: input.sessionId,
  });
}

export function sha256Hex(canonicalPayload: string) {
  return createHash("sha256").update(canonicalPayload, "utf8").digest("hex");
}

export function createTruthLedgerReceipt(input: {
  premiseBroken: string;
  boundedAction: string;
  constraint: string;
  verificationGate: string;
  now?: Date;
  sessionId?: string;
}) {
  const timestamp = (input.now ?? new Date()).toISOString();
  const sessionId = input.sessionId ?? randomUUID();
  const canonical = canonicalLedgerPayload({ ...input, timestamp, sessionId });
  return {
    timestamp,
    sessionId,
    payload: JSON.parse(canonical) as Record<string, string>,
    canonicalPayload: canonical,
    hash: sha256Hex(canonical),
    status: "PENDING" as const,
  };
}

export function evaluateClarity(input: {
  proposition: string;
  action: ClarityAction;
  priorResistance?: number;
}): ClarityEvaluation {
  const proposition = clean(input.proposition);
  const priorResistance = Math.max(0, Math.min(2, input.priorResistance ?? 0));
  const resistanceCounter = input.action === "respond" && deflectionPattern.test(proposition)
    ? Math.min(2, priorResistance + 1)
    : input.action === "respond" ? 0 : priorResistance;

  if (input.action === "act") {
    return {
      state: "LIGHT_WARRIOR",
      mirrorReflection: `You stated: “${preview(proposition)}”`,
      falsePremise: "Insight without a bounded action remains avoidance.",
      boundedAction: `Complete the first observable step of this proposition within 24 hours: ${firstSentence(proposition)}`,
      operationalConstraint: "Do not add another planning cycle, research pass, or substitute task before the first step is complete.",
      verificationGate: "Binary test: record the completed first step and its timestamp within 24 hours; otherwise mark FAILED.",
      resistanceCounter,
      requiresFork: false,
    };
  }

  if (resistanceCounter >= 2) {
    return {
      state: "TRANSCEND",
      mirrorReflection: `You restated the obstacle without supplying operational counter-evidence: “${preview(proposition)}”`,
      falsePremise: "Your defense is being used to preserve the current identity and avoid a falsifiable commitment.",
      resistanceCounter: 0,
      requiresFork: false,
    };
  }

  const falsePremise = avoidancePattern.test(proposition)
    ? "Delay is being presented as preparation; the premise is that more time will remove the cost of acting."
    : "The proposition treats the current framing as fixed before identifying the assumption that makes it unavoidable.";

  return {
    state: input.action === "start" ? "ALCHEMY" : "RESPOND",
    mirrorReflection: `You are describing this proposition without resolving its governing contradiction: “${preview(proposition)}”`,
    falsePremise,
    resistanceCounter,
    requiresFork: true,
  };
}

export function renderClarityEvaluation(evaluation: ClarityEvaluation) {
  if (evaluation.state === "LIGHT_WARRIOR") {
    return `BOUNDED ACTION\n${evaluation.boundedAction}\n\nOPERATIONAL CONSTRAINT\n${evaluation.operationalConstraint}\n\nVERIFICATION GATE\n${evaluation.verificationGate}`;
  }
  if (evaluation.state === "TRANSCEND") {
    return `TRANSCEND\n\nMIRROR REFLECTION\n${evaluation.mirrorReflection}\n\nFALSE PREMISE / CONTRADICTION\n${evaluation.falsePremise}\n\nACKNOWLEDGMENT GATE\nAcknowledge the evasion with one verifiable counter-fact or terminate this session.`;
  }
  return `MIRROR REFLECTION\n${evaluation.mirrorReflection}\n\nFALSE PREMISE / CONTRADICTION\n${evaluation.falsePremise}`;
}
