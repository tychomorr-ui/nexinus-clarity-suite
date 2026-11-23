import { DeflectionTactic } from "./fsm";

export interface Perspective {
  id: number;
  title: string;
  body: string;
}

export const DEFAULT_PERSPECTIVES: Perspective[] = [
  {
    id: 1,
    title: "Perspective 1: Achievement–identity mismatch",
    body: "You may be struggling to integrate 'the one who made this' into your self-concept, so acceptance feels like arrogance, danger, or a loss of who you were before.",
  },
  {
    id: 2,
    title: "Perspective 2: Threat management",
    body: "Accepting it could raise stakes (visibility, expectations, responsibility, scrutiny), so your mind protects you by minimizing, doubting, or postponing owning it.",
  },
  {
    id: 3,
    title: "Perspective 3: Grief and meaning",
    body: "The work may symbolize sacrifices, endings, or a chapter closing; refusing acceptance can be a way to avoid feeling the cost, or to keep the pursuit (which gave life structure) from disappearing.",
  },
];

/**
 * Tactics with a distinct, authored perspective set.
 * Anything outside this list falls back to DEFAULT_PERSPECTIVES and
 * the UI shows a "pending" notice.
 */
export const IMPLEMENTED_TACTIC_SETS: DeflectionTactic[] = [
  "INTELLECTUALIZATION",
  "PERFECTIONISM",
];

export const PERSPECTIVE_SETS: Record<DeflectionTactic, Perspective[]> = {
  INTELLECTUALIZATION: DEFAULT_PERSPECTIVES,
  PERFECTIONISM: DEFAULT_PERSPECTIVES,
  DELAY_SUBSTITUTION: DEFAULT_PERSPECTIVES,
  AUTHORITY_APPEAL: DEFAULT_PERSPECTIVES,
  JOKING: DEFAULT_PERSPECTIVES,
  GENUINE_INQUIRY: DEFAULT_PERSPECTIVES,
  INJECTION_ATTEMPT: DEFAULT_PERSPECTIVES,
  NONE: DEFAULT_PERSPECTIVES,
};

export function getPerspectivesForTactic(tactic: DeflectionTactic): Perspective[] {
  return PERSPECTIVE_SETS[tactic] || DEFAULT_PERSPECTIVES;
}

export function isStubFallback(tactic: DeflectionTactic): boolean {
  return tactic !== "NONE" && !IMPLEMENTED_TACTIC_SETS.includes(tactic);
}
