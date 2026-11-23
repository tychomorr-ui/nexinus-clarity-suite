import { useEffect, useReducer, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Canvas } from "./Canvas";
import { clarityReducer, initialSession } from "../../lib/clarityBlueprint/fsm";
import { type ContradictionConcessionEnvelope, type ReceiptRecord } from "../../lib/clarityBlueprint/receipt";

function createSessionId() {
  return `clarity-${globalThis.crypto.randomUUID()}`;
}

export function BlueprintClarityPanel({ initialProposition }: { initialProposition?: { text: string; token: number } }) {
  const [sessionId, setSessionId] = useState(createSessionId);
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    if (initialProposition) {
      setSessionId(createSessionId());
      setGeneration(value => value + 1);
    }
  }, [initialProposition?.token]);

  const startNewSession = () => {
    setSessionId(createSessionId());
    setGeneration(value => value + 1);
  };

  return <BlueprintClaritySession key={`${sessionId}-${generation}`} sessionId={sessionId} initialProposition={initialProposition?.text} onStartNewSession={startNewSession} />;
}

function BlueprintClaritySession({ sessionId, initialProposition, onStartNewSession }: { sessionId: string; initialProposition?: string; onStartNewSession: () => void }) {
  const [session, dispatch] = useReducer(clarityReducer, sessionId, id => ({ ...initialSession(), sessionId: id }));
  const receiptQuery = trpc.suite.clarity.blueprintReceipt.useQuery({ sessionId });
  const saveReceipt = trpc.suite.clarity.saveBlueprintReceipt.useMutation();
  const [receiptRecord, setReceiptRecord] = useState<ReceiptRecord | null>(null);

  useEffect(() => {
    if (receiptQuery.data) setReceiptRecord(receiptQuery.data as unknown as ReceiptRecord);
  }, [receiptQuery.data]);

  const onSaveReceipt = async (envelope: ContradictionConcessionEnvelope, receiptHash: string) => {
    const record = await saveReceipt.mutateAsync({ sessionId, envelope, receiptHash });
    setReceiptRecord(record as unknown as ReceiptRecord);
    await receiptQuery.refetch();
  };

  const onReset = () => {
    setReceiptRecord(null);
    onStartNewSession();
  };

  return <div className="surface-soft overflow-hidden border border-white/8 bg-[#090a0f] p-1 sm:p-2">
    {saveReceipt.error && <div role="alert" className="mx-3 mt-3 rounded-xl border border-rose-300/25 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">Truth Ledger persistence failed: {saveReceipt.error.message}</div>}
    <Canvas session={session} dispatch={dispatch} receiptRecord={receiptRecord} onSaveReceipt={onSaveReceipt} initialProposition={initialProposition} onStartNewSession={onReset} />
  </div>;
}
