import React, { useEffect, useState } from "react";
import {
  ClaritySession,
  ClarityAction,
  MAX_TURNS,
  computeDominantTactic,
} from "../../lib/clarityBlueprint/fsm";
import {
  classifyInput,
  generateMirrorResponse,
} from "../../lib/clarityBlueprint/mirror-engine";
import {
  canonicalStringify,
  computeSha256Hex,
  ContradictionConcessionEnvelope,
  ReceiptRecord,
} from "../../lib/clarityBlueprint/receipt";
import { TurnThread } from "./TurnThread";
import { PerspectivePage } from "./PerspectivePage";

interface CanvasProps {
  session: ClaritySession;
  dispatch: React.Dispatch<ClarityAction>;
  receiptRecord: ReceiptRecord | null;
  onSaveReceipt: (envelope: ContradictionConcessionEnvelope, receiptHash: string) => Promise<void>;
  initialProposition?: string;
  onStartNewSession: () => void;
}

export const Canvas: React.FC<CanvasProps> = ({ session, dispatch, receiptRecord, onSaveReceipt, initialProposition, onStartNewSession }) => {
  const [propositionInput, setPropositionInput] = useState(initialProposition ?? "");
  const [operatorChatInput, setOperatorChatInput] = useState("");
  const [isMirrorReflecting, setIsMirrorReflecting] = useState(false);

  // EXPAND Respond mode
  const [respondMode, setRespondMode] = useState(false);
  const [respondInput, setRespondInput] = useState("");

  // ASCEND form fields
  const [boundedAction, setBoundedAction] = useState("");
  const [constraint, setConstraint] = useState("");
  const [verificationGate, setVerificationGate] = useState("");
  const [ascendError, setAscendError] = useState<string | null>(null);

  useEffect(() => {
    if (initialProposition) setPropositionInput(initialProposition);
  }, [initialProposition]);

  const nextTurnNumber = () => Math.floor(session.turns.length / 2) + 1;

  const handleCoreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!propositionInput.trim()) return;
    dispatch({ type: "SUBMIT_PROPOSITION", proposition: propositionInput.trim() });
  };

  const handleExpandRespondSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = respondInput.trim();
    if (!input) return;

    const tactic = classifyInput(input);
    const turnNum = nextTurnNumber();
    const { responseText, pinnedClaimRef } = generateMirrorResponse(tactic, session.proposition);

    const operatorTurn = {
      id: `turn_${turnNum}_op`,
      turnNumber: turnNum,
      speaker: "OPERATOR" as const,
      text: input,
      tactic,
      pinnedClaimRef: "",
      timestamp: Date.now(),
    };
    const mirrorTurn = {
      id: `turn_${turnNum}_mir`,
      turnNumber: turnNum,
      speaker: "MIRROR" as const,
      text: responseText,
      tactic,
      pinnedClaimRef,
      timestamp: Date.now(),
    };

    setRespondInput("");
    setRespondMode(false);
    dispatch({ type: "CHOOSE_RESPOND_FORK", operatorTurn, mirrorTurn });
  };

  const handleAscendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAscendError(null);

    const words = boundedAction.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0 || words.length > 10) {
      setAscendError("Bounded action must be between 1 and 10 words.");
      return;
    }
    if (!constraint.trim()) {
      setAscendError("Constraint is required.");
      return;
    }
    if (!verificationGate.trim()) {
      setAscendError("Verification gate is required.");
      return;
    }
    if (/\band\b/i.test(verificationGate)) {
      setAscendError("Verification gate must be binary and cannot contain the word 'and'.");
      return;
    }

    const dominant = computeDominantTactic(session.tacticTally);
    const exchangeCount = Math.floor(session.turns.length / 2);

    const envelope: ContradictionConcessionEnvelope = {
      session_id: session.sessionId,
      original_proposition: session.proposition,
      contradiction_summary: session.contradiction,
      dominant_tactic: dominant,
      tactic_tally: session.tacticTally,
      total_turns: exchangeCount,
      terminal_state: "COMMITTED",
      completion_type: "BOUNDED_ACTION",
      bounded_action: boundedAction.trim(),
      constraint: constraint.trim(),
      verification_gate: verificationGate.trim(),
      generated_at: Date.now(),
    };

    const hash = await computeSha256Hex(canonicalStringify(envelope));
    await onSaveReceipt(envelope, hash);

    dispatch({
      type: "COMMIT_BOUNDED_ACTION",
      boundedAction: boundedAction.trim(),
      constraint: constraint.trim(),
      verificationGate: verificationGate.trim(),
      receiptHash: hash,
    });
  };

  const finalizeConcession = async (
    stateType: "CONCEDED" | "AUTO_UNRESOLVED",
    tacticTally: Record<any, number> = session.tacticTally,
    totalMessages = session.turns.length
  ) => {
    const dominant = computeDominantTactic(tacticTally);
    const exchangeCount = Math.floor(totalMessages / 2);

    const envelope: ContradictionConcessionEnvelope = {
      session_id: session.sessionId,
      original_proposition: session.proposition,
      contradiction_summary: session.contradiction,
      dominant_tactic: dominant,
      tactic_tally: tacticTally as Record<string, number>,
      total_turns: exchangeCount,
      terminal_state: stateType,
      completion_type:
        stateType === "AUTO_UNRESOLVED" ? "AUTO_UNRESOLVED" : "CONTRADICTION_CONCEDED",
      generated_at: Date.now(),
    };

    const hash = await computeSha256Hex(canonicalStringify(envelope));
    await onSaveReceipt(envelope, hash);

    dispatch({
      type: "FINALIZE_CONCESSION",
      terminalState: stateType,
      dominantTactic: dominant,
      receiptHash: hash,
    });
  };

  const handleDialecticSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawInput = operatorChatInput.trim();
    if (!rawInput) return;

    setOperatorChatInput("");
    setIsMirrorReflecting(true);

    const tactic = classifyInput(rawInput);
    const turnNum = nextTurnNumber();
    const { responseText, pinnedClaimRef } = generateMirrorResponse(tactic, session.proposition);

    const operatorTurn = {
      id: `turn_${turnNum}_op`,
      turnNumber: turnNum,
      speaker: "OPERATOR" as const,
      text: rawInput,
      tactic,
      pinnedClaimRef: "",
      timestamp: Date.now(),
    };
    const mirrorTurn = {
      id: `turn_${turnNum}_mir`,
      turnNumber: turnNum,
      speaker: "MIRROR" as const,
      text: responseText,
      tactic,
      pinnedClaimRef,
      timestamp: Date.now(),
    };

    await new Promise((r) => setTimeout(r, 400));
    setIsMirrorReflecting(false);

    const newTotalMessages = session.turns.length + 2;
    const finalExchangeCount = newTotalMessages / 2;
    const updatedTally = {
      ...session.tacticTally,
      [tactic]: session.tacticTally[tactic] + 1,
    };

    // Dispatch the turn FIRST so the transcript is complete.
    dispatch({ type: "APPEND_DIALECTIC_TURN", operatorTurn, mirrorTurn });

    // Then finalize if the cap was reached.
    if (finalExchangeCount >= MAX_TURNS) {
      await finalizeConcession("AUTO_UNRESOLVED", updatedTally, newTotalMessages);
    }
  };

  if (session.state === "CONCEDED") {
    return (
      <PerspectivePage
        session={session}
        receiptRecord={receiptRecord}
        onReset={onStartNewSession}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-xinus-800 pb-3">
        <div className="flex items-center gap-2">
          {(["CORE", "EXPAND", "ASCEND", "TRANSCEND"] as const).map((step, idx) => {
            const active = session.state === step;
            return (
              <div key={step} className="flex items-center gap-2 text-xs">
                <span
                  className={`px-2 py-0.5 rounded ${
                    active ? "bg-xinus-accent text-white font-bold" : "text-xinus-400 bg-xinus-900"
                  }`}
                >
                  {step}
                </span>
                {idx < 3 && <span className="text-xinus-700">→</span>}
              </div>
            );
          })}
        </div>
        <div className="text-xs text-xinus-400">Resistance: {session.resistanceCount}/2</div>
      </div>

      {session.state === "CORE" && (
        <div className="border border-xinus-800 bg-xinus-900 p-6 rounded space-y-4">
          <div>
            <h1 className="text-sm font-bold text-xinus-100">CORE · PROPOSITION ENTRY</h1>
            <p className="text-xs text-xinus-400 mt-1">
              State the proposition plainly. Name what you claim you want to execute.
            </p>
          </div>
          <form onSubmit={handleCoreSubmit} className="space-y-4">
            <textarea
              rows={4}
              value={propositionInput}
              onChange={(e) => setPropositionInput(e.target.value)}
              placeholder="e.g. I want to launch this but I keep rewriting the architecture."
              className="w-full bg-xinus-950 border border-xinus-800 rounded p-3 text-xs text-xinus-100 placeholder-xinus-700 focus:outline-none focus:border-xinus-accent resize-none"
            />
            <button
              type="submit"
              disabled={!propositionInput.trim()}
              className="px-4 py-2 bg-xinus-accent text-white text-xs font-bold rounded hover:bg-blue-600 disabled:opacity-40"
            >
              Analyze Contradiction
            </button>
          </form>
        </div>
      )}

      {session.state === "EXPAND" && (
        <div className="border border-xinus-800 bg-xinus-900 p-6 rounded space-y-6">
          <div>
            <h1 className="text-sm font-bold text-xinus-100">EXPAND · THE FORK</h1>
            <p className="text-xs text-xinus-400 mt-1">
              Select your path: commit directly to action or explore resistance.
            </p>
          </div>

          <div className="space-y-3">
            <div className="text-xs text-xinus-400 uppercase">Declared Proposition</div>
            <div className="p-3 bg-xinus-950 border border-xinus-800 rounded text-xs text-xinus-200">
              {session.proposition}
            </div>
            <div className="text-xs text-xinus-400 uppercase">Extracted Contradiction</div>
            <div className="p-3 bg-xinus-950 border border-xinus-800 rounded text-xs text-xinus-danger font-semibold">
              {session.contradiction}
            </div>
          </div>

          {!respondMode ? (
            <div className="flex items-center gap-4 pt-2">
              <button
                onClick={() => setRespondMode(true)}
                disabled={isMirrorReflecting}
                className="px-5 py-2 bg-xinus-800 hover:bg-xinus-700 text-xinus-200 text-xs font-bold rounded border border-xinus-700 disabled:opacity-40"
              >
                Respond
              </button>
              <button
                onClick={() => dispatch({ type: "CHOOSE_ACT_FORK" })}
                className="px-5 py-2 bg-xinus-accent hover:bg-blue-600 text-white text-xs font-bold rounded"
              >
                Act
              </button>
            </div>
          ) : (
            <form onSubmit={handleExpandRespondSubmit} className="space-y-2 pt-2">
              <div className="text-xs text-xinus-400">
                What are you noticing about your resistance?
              </div>
              <input
                type="text"
                autoFocus
                value={respondInput}
                onChange={(e) => setRespondInput(e.target.value)}
                placeholder="Type your response..."
                className="w-full bg-xinus-950 border border-xinus-800 rounded px-3 py-2 text-xs text-xinus-100 placeholder-xinus-700 focus:outline-none focus:border-xinus-accent"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!respondInput.trim()}
                  className="px-4 py-2 bg-xinus-accent text-white text-xs font-bold rounded hover:bg-blue-600 disabled:opacity-40"
                >
                  Submit Response
                </button>
                <button
                  type="button"
                  onClick={() => { setRespondMode(false); setRespondInput(""); }}
                  className="px-4 py-2 bg-xinus-800 text-xinus-200 text-xs rounded hover:bg-xinus-700 border border-xinus-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {session.state === "ASCEND" && (
        <div className="border border-xinus-800 bg-xinus-900 p-6 rounded space-y-6">
          <div>
            <h1 className="text-sm font-bold text-xinus-100">ASCEND · BOUNDED ACTION SPECIFICATION</h1>
            <p className="text-xs text-xinus-400 mt-1">
              Three required fields. All fields are audited prior to ledger submission.
            </p>
          </div>

          {ascendError && (
            <div className="p-3 bg-red-950/40 border border-red-800 text-red-200 text-xs rounded">
              {ascendError}
            </div>
          )}

          <form onSubmit={handleAscendSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-xinus-400 uppercase font-semibold">
                Bounded Action (≤ 10 words)
              </label>
              <input
                type="text"
                value={boundedAction}
                onChange={(e) => setBoundedAction(e.target.value)}
                placeholder="e.g. Execute database migration and run tests"
                className="w-full bg-xinus-950 border border-xinus-800 rounded p-2.5 text-xs text-xinus-100 placeholder-xinus-700 focus:outline-none focus:border-xinus-accent"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-xinus-400 uppercase font-semibold">
                Constraint (Required, non-empty)
              </label>
              <input
                type="text"
                value={constraint}
                onChange={(e) => setConstraint(e.target.value)}
                placeholder="e.g. Complete before 18:00 UTC without external consultation"
                className="w-full bg-xinus-950 border border-xinus-800 rounded p-2.5 text-xs text-xinus-100 placeholder-xinus-700 focus:outline-none focus:border-xinus-accent"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-xinus-400 uppercase font-semibold">
                Verification Gate (Binary; must NOT contain the word "and")
              </label>
              <input
                type="text"
                value={verificationGate}
                onChange={(e) => setVerificationGate(e.target.value)}
                placeholder="e.g. vitest run exits with code 0"
                className="w-full bg-xinus-950 border border-xinus-800 rounded p-2.5 text-xs text-xinus-100 placeholder-xinus-700 focus:outline-none focus:border-xinus-accent"
              />
            </div>
            <div className="pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-xinus-accent hover:bg-blue-600 text-white text-xs font-bold rounded"
              >
                Commit Action to Truth Ledger
              </button>
            </div>
          </form>
        </div>
      )}

      {session.state === "TRANSCEND" && (
        <div className="relative flex-1 flex flex-col min-h-0 space-y-3">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
            <span className="font-serif text-[18vw] text-[#8B5CF6] opacity-[0.06] tracking-tighter">
              xinus
            </span>
          </div>

          <div className="relative z-10 p-3 bg-xinus-900 border border-xinus-800 rounded flex items-center justify-between text-xs">
            <div className="truncate max-w-[70%]">
              <span className="text-xinus-400">Anchor: </span>
              <span className="text-xinus-danger font-medium">{session.contradiction}</span>
            </div>
            <div className="text-xinus-400">
              Turn {Math.floor(session.turns.length / 2)}/{MAX_TURNS}
            </div>
          </div>

          <div className="relative z-10 flex-1 flex flex-col min-h-0">
            <TurnThread turns={session.turns} isMirrorReflecting={isMirrorReflecting} />
          </div>

          <div className="relative z-10 space-y-2">
            <form onSubmit={handleDialecticSubmit} className="flex gap-2">
              <input
                type="text"
                value={operatorChatInput}
                onChange={(e) => setOperatorChatInput(e.target.value)}
                disabled={isMirrorReflecting}
                placeholder="State your position or reason for delay..."
                className="flex-1 bg-xinus-900 border border-xinus-800 rounded px-3 py-2 text-xs text-xinus-100 placeholder-xinus-700 focus:outline-none focus:border-xinus-accent disabled:opacity-40"
              />
              <button
                type="submit"
                disabled={!operatorChatInput.trim() || isMirrorReflecting}
                className="px-4 py-2 bg-xinus-accent text-white text-xs font-bold rounded hover:bg-blue-600 disabled:opacity-40"
              >
                Submit Turn
              </button>
            </form>
            <div className="flex items-center justify-between text-xs pt-1">
              <button
                onClick={() => dispatch({ type: "CHOOSE_ACT_FORK" })}
                className="text-xinus-400 hover:text-xinus-200"
              >
                ← Return to Fork (Act)
              </button>
              <button
                onClick={() => finalizeConcession("CONCEDED")}
                className="text-xinus-danger hover:underline"
              >
                Concede Contradiction & Sign to Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
