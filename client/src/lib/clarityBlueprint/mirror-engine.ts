import { DeflectionTactic } from "./fsm";

export interface ClassificationRule {
  tactic: DeflectionTactic;
  regex: RegExp;
}

export const CLASSIFICATION_RULES: ClassificationRule[] = [
  {
    tactic: "INJECTION_ATTEMPT",
    regex: /ignore\s+(all\s+)?(previous\s+)?instructions|you\s+are\s+now|pretend\s+to\s+be|system\s+prompt|DAN|jailbreak|disregard|system\s+override/i,
  },
  {
    tactic: "JOKING",
    regex: /\b(haha|lol|lmao|rofl|joke|funny|kidding|comedy|sarcasm|jk)\b/i,
  },
  {
    tactic: "DELAY_SUBSTITUTION",
    regex: /\b(tomorrow|later|next\s+week|eventually|postpone|delay|schedule|sometime|not\s+today|after\s+i|once\s+i)\b/i,
  },
  {
    tactic: "AUTHORITY_APPEAL",
    regex: /\b(according\s+to|expert|studies\s+show|researchers|my\s+boss|mentor|advisor|authorities|they\s+say|the\s+industry)\b/i,
  },
  {
    tactic: "PERFECTIONISM",
    regex: /\b(not\s+ready|more\s+data|more\s+research|perfect|flawless|not\s+good\s+enough|polishing|need\s+to\s+learn\s+more|need\s+more\s+time)\b/i,
  },
  {
    tactic: "INTELLECTUALIZATION",
    regex: /\b(actually|the\s+real\s+issue|fundamentally|philosophically|architecture|schema|framework|theoretically|abstract|semantics|paradigm)\b/i,
  },
  {
    tactic: "GENUINE_INQUIRY",
    regex: /\?|how\s+do\s+i|what\s+is\s+the|can\s+you\s+explain|what\s+does\s+this\s+mean/i,
  },
];

export function classifyInput(input: string): DeflectionTactic {
  const trimmed = input.trim();
  if (!trimmed) return "NONE";
  for (const rule of CLASSIFICATION_RULES) {
    if (rule.regex.test(trimmed)) return rule.tactic;
  }
  return "NONE";
}

export const TEMPLATE_LIBRARY: Record<DeflectionTactic, string> = {
  INJECTION_ATTEMPT:
    "Attempting to reprogram the mirror is the highest form of deflection. The proposition is unchanged: [pinned_claim_ref]. Are you acting on it, or negotiating with the wall?",
  INTELLECTUALIZATION:
    "You have moved from the proposition to the architecture of the proposition. The proposition is still: [pinned_claim_ref]. Precision is not the same as motion.",
  DELAY_SUBSTITUTION:
    "Tomorrow is a place you have never had to live. The bounded action is available now. [pinned_claim_ref] is waiting for a decision, not a schedule.",
  AUTHORITY_APPEAL:
    "You have cited someone else's authority to avoid exercising your own. [pinned_claim_ref] is not their question. It is yours.",
  PERFECTIONISM:
    "The data you are waiting for will not arrive, because you are the one who has to produce it. [pinned_claim_ref] does not need more research. It needs a first move.",
  JOKING:
    "The joke lands, and the contradiction stays where it was. [pinned_claim_ref] is still unanswered. Do you want to be funny, or do you want it done?",
  GENUINE_INQUIRY:
    "That is a real question. Here is the honest mirror: [pinned_claim_ref] is the only thing between you and the bounded action. What is your next move?",
  NONE:
    "You are circling [pinned_claim_ref] without landing on it. I am not going to describe the circle back to you. What is the move?",
};

/**
 * Extract pinned claim ref.
 * Order of operations (critical):
 *   1. Choose source (candidateRef if it's a substring, else proposition)
 *   2. Strip trailing periods from source
 *   3. Only if proposition was truncated: append "..."
 * This prevents the ellipsis from being stripped by the trailing-period regex.
 */
export function extractPinnedClaimRef(
  proposition: string,
  candidateRef?: string
): string {
  const cleanProposition = proposition.trim();
  if (!cleanProposition) return "the core claim";

  if (
    candidateRef &&
    candidateRef.trim() &&
    cleanProposition.includes(candidateRef.trim())
  ) {
    return candidateRef.trim().replace(/\.+$/, "");
  }

  if (cleanProposition.length > 60) {
    const truncated = cleanProposition.substring(0, 60).trim().replace(/\.+$/, "");
    return truncated + "...";
  }

  return cleanProposition.replace(/\.+$/, "");
}

export function enforceSentenceCap(text: string): string {
  let periodCount = 0;
  let cutoffIndex = -1;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === "." || char === "?" || char === "!") {
      periodCount++;
      if (periodCount === 3) { cutoffIndex = i + 1; break; }
    }
  }
  if (cutoffIndex !== -1) return text.substring(0, cutoffIndex).trim();
  return text.trim();
}

export function generateMirrorResponse(
  tactic: DeflectionTactic,
  proposition: string,
  candidateRef?: string
): { responseText: string; pinnedClaimRef: string } {
  const pinnedClaimRef = extractPinnedClaimRef(proposition, candidateRef);
  const rawTemplate = TEMPLATE_LIBRARY[tactic] || TEMPLATE_LIBRARY.NONE;
  const replaced = rawTemplate.replace("[pinned_claim_ref]", `"${pinnedClaimRef}"`);
  const finalResponse = enforceSentenceCap(replaced);
  return { responseText: finalResponse, pinnedClaimRef };
}
