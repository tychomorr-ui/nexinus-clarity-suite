export type ClarityState = "CORE" | "EXPAND" | "ASCEND" | "TRANSCEND" | "CONCEDED";

export type DeflectionTactic =
  | "INTELLECTUALIZATION"
  | "JOKING"
  | "DELAY_SUBSTITUTION"
  | "AUTHORITY_APPEAL"
  | "PERFECTIONISM"
  | "GENUINE_INQUIRY"
  | "INJECTION_ATTEMPT"
  | "NONE";

export interface DialecticTurn {
  id: string;
  turnNumber: number;
  speaker: "OPERATOR" | "MIRROR";
  text: string;
  tactic: DeflectionTactic;
  pinnedClaimRef: string;
  timestamp: number;
}

export interface ClaritySession {
  sessionId: string;
  state: ClarityState;
  proposition: string;
  contradiction: string;
  resistanceCount: number;
  boundedAction: string;
  constraint: string;
  verificationGate: string;
  turns: DialecticTurn[];
  tacticTally: Record<DeflectionTactic, number>;
  dominantTactic: DeflectionTactic;
  terminalState: "ACTIVE" | "COMMITTED" | "CONCEDED" | "AUTO_UNRESOLVED";
  completionType: "BOUNDED_ACTION" | "CONTRADICTION_CONCEDED" | "AUTO_UNRESOLVED" | null;
  receiptHash: string | null;
  startedAt: number;
  completedAt: number | null;
}

export type ClarityAction =
  | { type: "SUBMIT_PROPOSITION"; proposition: string }
  | { type: "CHOOSE_RESPOND_FORK"; operatorTurn: DialecticTurn; mirrorTurn: DialecticTurn }
  | { type: "CHOOSE_ACT_FORK" }
  | {
      type: "COMMIT_BOUNDED_ACTION";
      boundedAction: string;
      constraint: string;
      verificationGate: string;
      receiptHash: string;
    }
  | {
      type: "APPEND_DIALECTIC_TURN";
      operatorTurn: DialecticTurn;
      mirrorTurn: DialecticTurn;
    }
  | {
      type: "FINALIZE_CONCESSION";
      terminalState: "CONCEDED" | "AUTO_UNRESOLVED";
      dominantTactic: DeflectionTactic;
      receiptHash: string;
    }
  | { type: "RESET_SESSION" };

export const MAX_TURNS = 12;

export function initialSession(): ClaritySession {
  return {
    sessionId: `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    state: "CORE",
    proposition: "",
    contradiction: "",
    resistanceCount: 0,
    boundedAction: "",
    constraint: "",
    verificationGate: "",
    turns: [],
    tacticTally: {
      INTELLECTUALIZATION: 0, JOKING: 0, DELAY_SUBSTITUTION: 0,
      AUTHORITY_APPEAL: 0, PERFECTIONISM: 0, GENUINE_INQUIRY: 0,
      INJECTION_ATTEMPT: 0, NONE: 0,
    },
    dominantTactic: "NONE",
    terminalState: "ACTIVE",
    completionType: null,
    receiptHash: null,
    startedAt: Date.now(),
    completedAt: null,
  };
}

export function computeDominantTactic(
  tally: Record<DeflectionTactic, number>
): DeflectionTactic {
  const rankedTactics: DeflectionTactic[] = [
    "INTELLECTUALIZATION","PERFECTIONISM","DELAY_SUBSTITUTION",
    "AUTHORITY_APPEAL","JOKING","INJECTION_ATTEMPT","GENUINE_INQUIRY","NONE",
  ];
  let highest = 0;
  let dominant: DeflectionTactic = "NONE";
  for (const tactic of rankedTactics) {
    if (tally[tactic] > highest) {
      highest = tally[tactic];
      dominant = tactic;
    }
  }
  return dominant;
}

export function extractContradiction(proposition: string): string {
  const normalized = proposition.trim();

  const wantButMatch = normalized.match(
    /want(?:ed)?\s+to\s+(.*?)\s+(?:but|yet|however)\s+(.*)/i
  );
  if (wantButMatch) {
    return `Desires to ${wantButMatch[1].trim()}, but halts via: ${wantButMatch[2].trim()}`;
  }

  const needButMatch = normalized.match(
    /need(?:ed)?\s+to\s+(.*?)\s+(?:but|yet|however)\s+(.*)/i
  );
  if (needButMatch) {
    return `Must ${needButMatch[1].trim()}, yet preserves postponement through: ${needButMatch[2].trim()}`;
  }

  const generalButMatch = normalized.match(/(.*?)\s+(?:but|yet|however)\s+(.*)/i);
  if (generalButMatch) {
    return `Claims: "${generalButMatch[1].trim()}", while practicing: "${generalButMatch[2].trim()}"`;
  }

  return `Asserts desire to change while maintaining the existing boundary conditions.`;
}

export function clarityReducer(
  state: ClaritySession,
  action: ClarityAction
): ClaritySession {
  switch (action.type) {
    case "SUBMIT_PROPOSITION": {
      const contradiction = extractContradiction(action.proposition);
      return {
        ...state,
        proposition: action.proposition,
        contradiction,
        state: "EXPAND",
        resistanceCount: 0,
      };
    }

    case "CHOOSE_RESPOND_FORK": {
      const nextResistance = state.resistanceCount + 1;
      const updatedTurns = [...state.turns, action.operatorTurn, action.mirrorTurn];
      const nextTally = {
        ...state.tacticTally,
        [action.operatorTurn.tactic]: state.tacticTally[action.operatorTurn.tactic] + 1,
      };
      if (nextResistance >= 2) {
        return {
          ...state,
          resistanceCount: nextResistance,
          turns: updatedTurns,
          tacticTally: nextTally,
          state: "TRANSCEND",
        };
      }
      return {
        ...state,
        resistanceCount: nextResistance,
        turns: updatedTurns,
        tacticTally: nextTally,
        state: "EXPAND",
      };
    }

    case "CHOOSE_ACT_FORK": {
      return { ...state, state: "ASCEND", resistanceCount: 0 };
    }

    case "COMMIT_BOUNDED_ACTION": {
      const dominant = computeDominantTactic(state.tacticTally);
      return {
        ...state,
        boundedAction: action.boundedAction,
        constraint: action.constraint,
        verificationGate: action.verificationGate,
        state: "CONCEDED",
        terminalState: "COMMITTED",
        completionType: "BOUNDED_ACTION",
        dominantTactic: dominant,
        receiptHash: action.receiptHash,
        completedAt: Date.now(),
      };
    }

    case "APPEND_DIALECTIC_TURN": {
      const updatedTurns = [...state.turns, action.operatorTurn, action.mirrorTurn];
      const nextTally = {
        ...state.tacticTally,
        [action.operatorTurn.tactic]: state.tacticTally[action.operatorTurn.tactic] + 1,
      };
      return { ...state, turns: updatedTurns, tacticTally: nextTally };
    }

    case "FINALIZE_CONCESSION": {
      return {
        ...state,
        state: "CONCEDED",
        terminalState: action.terminalState,
        completionType:
          action.terminalState === "AUTO_UNRESOLVED"
            ? "AUTO_UNRESOLVED"
            : "CONTRADICTION_CONCEDED",
        dominantTactic: action.dominantTactic,
        receiptHash: action.receiptHash,
        completedAt: Date.now(),
      };
    }

    case "RESET_SESSION": return initialSession();
    default: return state;
  }
}
