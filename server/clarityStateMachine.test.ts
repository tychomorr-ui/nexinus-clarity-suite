import { describe, expect, it } from "vitest";
import { canonicalLedgerPayload, claritySessionResetPatch, createTruthLedgerReceipt, evaluateClarity, renderClarityEvaluation, sha256Hex } from "./clarityStateMachine";

describe("XinUS Clarity deterministic state machine", () => {
  it("starts in Alchemy and always exposes the Fork", () => {
    const result = evaluateClarity({ proposition: "I need to decide whether to start the project.", action: "start" });
    expect(result.state).toBe("ALCHEMY");
    expect(result.requiresFork).toBe(true);
    expect(renderClarityEvaluation(result)).toContain("MIRROR REFLECTION");
    expect(renderClarityEvaluation(result)).toContain("FALSE PREMISE / CONTRADICTION");
  });

  it("routes two deflections to Transcend", () => {
    const result = evaluateClarity({ proposition: "But maybe someday, and it is not my fault.", action: "respond", priorResistance: 1 });
    expect(result.state).toBe("TRANSCEND");
    expect(result.resistanceCounter).toBe(0);
    expect(renderClarityEvaluation(result)).toContain("ACKNOWLEDGMENT GATE");
  });

  it("routes Act on this to one bounded Light Warrior action", () => {
    const result = evaluateClarity({ proposition: "Send the requested document before noon.", action: "act" });
    expect(result.state).toBe("LIGHT_WARRIOR");
    expect(result.boundedAction).toContain("Send the requested document");
    expect(result.operationalConstraint).toBeTruthy();
    expect(result.verificationGate).toBeTruthy();
  });

  it("resets only the active session state to a clean Alchemy entry", () => {
    expect(claritySessionResetPatch()).toEqual({ conversationId: null, resistance: 0, currentState: "ALCHEMY", turnCount: 0 });
  });

  it("evaluates long-form source text without returning the full source in the reflection", () => {
    const source = "A long source proposition. ".repeat(500);
    const result = evaluateClarity({ proposition: source, action: "start" });
    expect(source.length).toBeGreaterThan(2000);
    expect(result.mirrorReflection.length).toBeLessThan(800);
  });

  it("hashes the exact canonical Truth Ledger payload", () => {
    const canonical = canonicalLedgerPayload({ timestamp: "2026-10-18T09:00:00.000Z", premiseBroken: "Delay is preparation.", boundedAction: "Send one email.", constraint: "No more research.", verificationGate: "Sent timestamp exists.", sessionId: "session-1" });
    expect(canonical).toBe('{"timestamp":"2026-10-18T09:00:00.000Z","premise_broken":"Delay is preparation.","bounded_action":"Send one email.","constraint":"No more research.","verification_gate":"Sent timestamp exists.","session_id":"session-1"}');
    expect(sha256Hex(canonical)).toHaveLength(64);
    expect(createTruthLedgerReceipt({ premiseBroken: "Delay is preparation.", boundedAction: "Send one email.", constraint: "No more research.", verificationGate: "Sent timestamp exists.", now: new Date("2026-10-18T09:00:00.000Z"), sessionId: "session-1" }).hash).toBe(sha256Hex(canonical));
  });
});
