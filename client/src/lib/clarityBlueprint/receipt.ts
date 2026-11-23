export interface ContradictionConcessionEnvelope {
  session_id: string;
  original_proposition: string;
  contradiction_summary: string;
  dominant_tactic: string;
  tactic_tally: Record<string, number>;
  /** Conversation exchanges (operator+mirror pairs), not individual messages. */
  total_turns: number;
  terminal_state: "COMMITTED" | "CONCEDED" | "AUTO_UNRESOLVED";
  completion_type: "BOUNDED_ACTION" | "CONTRADICTION_CONCEDED" | "AUTO_UNRESOLVED";
  bounded_action?: string;
  constraint?: string;
  verification_gate?: string;
  generated_at: number;
}

export function canonicalStringify(obj: any): string {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return "[" + obj.map((item) => canonicalStringify(item)).join(",") + "]";
  }
  const sortedKeys = Object.keys(obj).sort();
  const entries = sortedKeys.map(
    (key) => `${JSON.stringify(key)}:${canonicalStringify(obj[key])}`
  );
  return "{" + entries.join(",") + "}";
}

export async function computeSha256Hex(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface ReceiptRecord {
  envelope: ContradictionConcessionEnvelope;
  receiptHash: string;
  savedAt: number;
}

export function saveReceiptToStorage(
  envelope: ContradictionConcessionEnvelope,
  receiptHash: string
): void {
  const key = `clarity.receipts.${envelope.session_id}`;
  const record = { envelope, receiptHash, savedAt: Date.now() };
  localStorage.setItem(key, JSON.stringify(record));
}

export function getReceiptFromStorage(sessionId: string): {
  envelope: ContradictionConcessionEnvelope;
  receiptHash: string;
  savedAt: number;
} | null {
  const key = `clarity.receipts.${sessionId}`;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
