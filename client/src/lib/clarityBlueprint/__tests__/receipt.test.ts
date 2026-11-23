import { describe, it, expect } from "vitest";
import {
  canonicalStringify,
  computeSha256Hex,
  ContradictionConcessionEnvelope,
} from "../receipt";
import {
  initialSession,
  MAX_TURNS,
  computeDominantTactic,
  clarityReducer,
} from "../fsm";

describe("Receipt & FSM", () => {
  it("produces deterministic canonical JSON with sorted keys", () => {
    const objA = { z: 1, a: "test", m: [3, 2, 1] };
    const objB = { a: "test", m: [3, 2, 1], z: 1 };
    expect(canonicalStringify(objA)).toBe(canonicalStringify(objB));
    expect(canonicalStringify(objA)).toBe('{"a":"test","m":[3,2,1],"z":1}');
  });

  it("computes 64-char deterministic SHA-256", async () => {
    const envelope: ContradictionConcessionEnvelope = {
      session_id: "test_session_123",
      original_proposition: "Deploy the product",
      contradiction_summary: "Desires to deploy, halts via delay",
      dominant_tactic: "INTELLECTUALIZATION",
      tactic_tally: { INTELLECTUALIZATION: 5, JOKING: 0 },
      total_turns: 5,
      terminal_state: "COMMITTED",
      completion_type: "BOUNDED_ACTION",
      bounded_action: "Ship migration",
      constraint: "Today",
      verification_gate: "Vitest exits 0",
      generated_at: 1700000000000,
    };
    const h1 = await computeSha256Hex(canonicalStringify(envelope));
    const h2 = await computeSha256Hex(canonicalStringify(envelope));
    expect(h1).toHaveLength(64);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
    expect(h1).toBe(h2);
  });

  it("transitions to TRANSCEND at resistance >= 2", () => {
    let s = initialSession();
    s = clarityReducer(s, { type: "SUBMIT_PROPOSITION", proposition: "I want to ship but I delay." });
    expect(s.state).toBe("EXPAND");

    const dummy = {
      id: "1", turnNumber: 1, speaker: "OPERATOR" as const,
      text: "x", tactic: "DELAY_SUBSTITUTION" as const,
      pinnedClaimRef: "", timestamp: Date.now(),
    };
    const dummyMirror = { ...dummy, id: "2", speaker: "MIRROR" as const };

    s = clarityReducer(s, { type: "CHOOSE_RESPOND_FORK", operatorTurn: dummy, mirrorTurn: dummyMirror });
    expect(s.resistanceCount).toBe(1);
    expect(s.state).toBe("EXPAND");

    s = clarityReducer(s, { type: "CHOOSE_RESPOND_FORK", operatorTurn: dummy, mirrorTurn: dummyMirror });
    expect(s.resistanceCount).toBe(2);
    expect(s.state).toBe("TRANSCEND");
  });

  it("CHOOSE_ACT_FORK resets resistance and advances to ASCEND", () => {
    let s = initialSession();
    s = clarityReducer(s, { type: "SUBMIT_PROPOSITION", proposition: "Test" });
    s = { ...s, resistanceCount: 2, state: "TRANSCEND" };
    s = clarityReducer(s, { type: "CHOOSE_ACT_FORK" });
    expect(s.resistanceCount).toBe(0);
    expect(s.state).toBe("ASCEND");
  });

  it("COMMIT_BOUNDED_ACTION sets terminalState to COMMITTED", () => {
    let s = initialSession();
    s = clarityReducer(s, { type: "SUBMIT_PROPOSITION", proposition: "Test" });
    s = clarityReducer(s, { type: "CHOOSE_ACT_FORK" });
    s = clarityReducer(s, {
      type: "COMMIT_BOUNDED_ACTION",
      boundedAction: "Ship it",
      constraint: "Today",
      verificationGate: "Tests pass",
      receiptHash: "a".repeat(64),
    });
    expect(s.state).toBe("CONCEDED");
    expect(s.terminalState).toBe("COMMITTED");
    expect(s.completionType).toBe("BOUNDED_ACTION");
  });

  it("MAX_TURNS is 12", () => {
    expect(MAX_TURNS).toBe(12);
  });

  it("computes dominant tactic deterministically", () => {
    const tally = initialSession().tacticTally;
    tally.INTELLECTUALIZATION = 5;
    tally.JOKING = 2;
    expect(computeDominantTactic(tally)).toBe("INTELLECTUALIZATION");
  });
});
