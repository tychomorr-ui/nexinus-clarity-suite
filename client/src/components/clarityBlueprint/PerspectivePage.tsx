import React, { useEffect, useState } from "react";
import { ClaritySession } from "../../lib/clarityBlueprint/fsm";
import { getPerspectivesForTactic, isStubFallback } from "../../lib/clarityBlueprint/perspectives";
import {
  canonicalStringify,
  computeSha256Hex,
  ContradictionConcessionEnvelope,
  ReceiptRecord,
} from "../../lib/clarityBlueprint/receipt";

interface PerspectivePageProps {
  session: ClaritySession;
  receiptRecord: ReceiptRecord | null;
  onReset: () => void;
}

export const PerspectivePage: React.FC<PerspectivePageProps> = ({
  session,
  receiptRecord,
  onReset,
}) => {
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedCanonical, setCopiedCanonical] = useState(false);
  const [hashStatus, setHashStatus] = useState<"pending" | "ok" | "mismatch" | "missing">("pending");

  const stored = receiptRecord;
  const envelope: ContradictionConcessionEnvelope | null = stored?.envelope ?? null;
  const receiptHash = stored?.receiptHash ?? session.receiptHash ?? "";
  const perspectives = getPerspectivesForTactic(session.dominantTactic);
  const showFallbackNotice = isStubFallback(session.dominantTactic);

  // Live verification: re-hash the stored envelope, compare to stored hash.
  useEffect(() => {
    if (!stored) { setHashStatus("missing"); return; }
    (async () => {
      const recomputed = await computeSha256Hex(canonicalStringify(stored.envelope));
      setHashStatus(recomputed === stored.receiptHash ? "ok" : "mismatch");
    })();
  }, [stored]);

  const handleCopyJson = async () => {
    if (!envelope) return;
    await navigator.clipboard.writeText(JSON.stringify(envelope, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleCopyCanonical = async () => {
    if (!envelope) return;
    await navigator.clipboard.writeText(canonicalStringify(envelope));
    setCopiedCanonical(true);
    setTimeout(() => setCopiedCanonical(false), 2000);
  };

  const handleDownloadExport = () => {
    if (!envelope) return;
    window.location.assign(`/api/clarity/export/${encodeURIComponent(session.sessionId)}`);
  };

  const headerLabel =
    session.completionType === "BOUNDED_ACTION" ? "Bounded Action Committed"
    : session.terminalState === "AUTO_UNRESOLVED" ? "Auto-Unresolved Contradiction"
    : "Contradiction Conceded";

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 py-6 px-4">
      <div className="border border-xinus-800 bg-xinus-900 p-6 rounded space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-xinus-800 flex-wrap gap-3">
          <div>
            <h2 className="text-sm font-bold text-xinus-100 uppercase tracking-wider">
              Terminal State: {headerLabel}
            </h2>
            <p className="text-xs text-xinus-400 mt-1">
              Session {session.sessionId} · Dominant Tactic: {session.dominantTactic}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyJson}
              disabled={!envelope}
              className="px-3 py-1.5 text-xs bg-xinus-800 hover:bg-xinus-700 disabled:opacity-40 text-xinus-200 rounded border border-xinus-700"
            >
              {copiedJson ? "✓ Copied JSON" : "Copy Receipt JSON"}
            </button>
            <button
              onClick={handleCopyCanonical}
              disabled={!envelope}
              className="px-3 py-1.5 text-xs bg-xinus-800 hover:bg-xinus-700 disabled:opacity-40 text-xinus-200 rounded border border-xinus-700"
            >
              {copiedCanonical ? "✓ Copied Canonical" : "Copy Canonical String"}
            </button>
            <button
              onClick={handleDownloadExport}
              disabled={!envelope}
              className="px-3 py-1.5 text-xs bg-xinus-accent/15 hover:bg-xinus-accent/25 disabled:opacity-40 text-xinus-accent rounded border border-xinus-accent/40"
            >
              Download Verifiable Export
            </button>
            <a
              href="/verify"
              className="px-3 py-1.5 text-xs text-xinus-300 underline decoration-xinus-700 underline-offset-4 hover:text-xinus-100"
            >
              Verify outside XinUS
            </a>
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-xinus-800 hover:bg-xinus-700 text-xinus-200 rounded border border-xinus-700"
            >
              <span>↻</span>
              <span>Initialize New Session</span>
            </button>
          </div>
        </div>

        {session.completionType === "BOUNDED_ACTION" && (
          <div className="space-y-3 p-4 bg-xinus-950 border border-xinus-800 rounded text-xs">
            <div className="text-xinus-400 font-semibold uppercase">Committed Bounded Action</div>
            <div className="text-xinus-100 font-bold">{session.boundedAction}</div>
            <div className="text-xinus-400 pt-2 border-t border-xinus-900">Constraint: {session.constraint}</div>
            <div className="text-xinus-400">Verification Gate: {session.verificationGate}</div>
          </div>
        )}

        <div className="space-y-3">
          <div className="text-xs text-xinus-400 uppercase">Original Proposition</div>
          <div className="p-3 bg-xinus-950 border border-xinus-800 rounded text-xs text-xinus-200">
            {session.proposition}
          </div>
          <div className="text-xs text-xinus-400 uppercase">Identified Contradiction</div>
          <div className="p-3 bg-xinus-950 border border-xinus-800 rounded text-xs text-xinus-danger">
            {session.contradiction}
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-xinus-800">
          <div className="text-xs font-semibold text-xinus-accent uppercase tracking-wider">
            Deterministic Psychological Reading (Three Perspectives)
          </div>
          {showFallbackNotice && (
            <div className="p-2 bg-yellow-950/30 border border-yellow-800 rounded text-xs text-yellow-300">
              ⚠ Default reading shown — perspective set for tactic [{session.dominantTactic}] pending.
            </div>
          )}
          <div className="space-y-3">
            {perspectives.map((p) => (
              <div
                key={p.id}
                className="p-4 bg-xinus-950 border border-xinus-800 rounded text-xs leading-relaxed text-xinus-200"
              >
                <div className="font-bold text-xinus-100 mb-1">{p.title}</div>
                <div className="text-xinus-400">{p.body}</div>
              </div>
            ))}
          </div>
          <p className="font-serif italic text-xs text-xinus-400 pt-2 text-center">
            This is not advice. This is what was already in the room.
          </p>
        </div>
      </div>

      <div className="border border-xinus-800 bg-xinus-900 p-6 rounded space-y-4">
        <div>
          <div className="text-xs font-semibold text-xinus-100 uppercase tracking-wider">
            Truth Ledger Receipt
          </div>
          <div className="text-xs text-xinus-400 mt-0.5">
            Stored under `clarity.receipts.{session.sessionId}`
          </div>
        </div>

        <div className="p-3 bg-xinus-950 border border-xinus-800 rounded font-mono text-xs text-xinus-accent break-all select-all">
          SHA-256: {receiptHash || "(missing)"}
        </div>

        <div className="text-xs">
          {hashStatus === "ok" && (
            <span className="text-green-400">✓ Hash verifies against stored envelope</span>
          )}
          {hashStatus === "mismatch" && (
            <span className="text-red-400">⚠ Hash mismatch — envelope and hash do not agree</span>
          )}
          {hashStatus === "missing" && (
            <span className="text-yellow-400">⚠ No stored receipt found for this session</span>
          )}
          {hashStatus === "pending" && (
            <span className="text-xinus-400">Verifying…</span>
          )}
        </div>

        <div className="text-xs text-xinus-400">CANONICAL LEDGER PAYLOAD (what was hashed)</div>
        <pre className="p-3 bg-xinus-950 border border-xinus-800 rounded text-xs text-xinus-400 overflow-x-auto max-h-64 font-mono">
          {envelope ? JSON.stringify(envelope, null, 2) : "(no envelope)"}
        </pre>
      </div>
    </div>
  );
};
