import { useState, type DragEvent } from "react";
import { Link } from "wouter";
import { ArrowLeft, CheckCircle2, FileUp, ShieldCheck, Upload, XCircle } from "lucide-react";
import { canonicalStringify, computeSha256Hex } from "../lib/clarityBlueprint/receipt";

type ExportBundle = {
  envelope: Record<string, unknown>;
  receipt_hash: string;
  server_signature_ed25519_hex: string;
  server_pubkey_hex: string;
};

type VerificationResult = {
  valid: boolean;
  hashValid: boolean;
  signatureValid: boolean;
  bundle: ExportBundle;
  message?: string;
};

function hexBytes(value: string, label: string) {
  if (!/^[0-9a-f]+$/i.test(value) || value.length % 2 !== 0) throw new Error(`${label} is not valid hexadecimal.`);
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index += 1) bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  return bytes;
}

function parseBundle(raw: string): ExportBundle {
  const parsed = JSON.parse(raw) as Partial<ExportBundle>;
  if (!parsed || typeof parsed !== "object" || !parsed.envelope || typeof parsed.envelope !== "object") throw new Error("The file does not contain an envelope.");
  if (typeof parsed.receipt_hash !== "string" || !/^[a-f0-9]{64}$/.test(parsed.receipt_hash)) throw new Error("The receipt_hash must be a 64-character SHA-256 value.");
  if (typeof parsed.server_signature_ed25519_hex !== "string" || parsed.server_signature_ed25519_hex.length !== 128) throw new Error("The Ed25519 signature is missing or malformed.");
  if (typeof parsed.server_pubkey_hex !== "string" || parsed.server_pubkey_hex.length !== 64) throw new Error("The Ed25519 public key is missing or malformed.");
  return parsed as ExportBundle;
}

async function verifyBundle(raw: string): Promise<VerificationResult> {
  const bundle = parseBundle(raw);
  const computedHash = await computeSha256Hex(canonicalStringify(bundle.envelope));
  const hashValid = computedHash === bundle.receipt_hash;
  let signatureValid = false;
  try {
    const publicKey = await crypto.subtle.importKey("raw", hexBytes(bundle.server_pubkey_hex, "The public key"), { name: "Ed25519" }, false, ["verify"]);
    signatureValid = await crypto.subtle.verify({ name: "Ed25519" }, publicKey, hexBytes(bundle.server_signature_ed25519_hex, "The signature"), new TextEncoder().encode(bundle.receipt_hash));
  } catch {
    signatureValid = false;
  }
  return { valid: hashValid && signatureValid, hashValid, signatureValid, bundle };
}

export default function VerifyPage() {
  const [raw, setRaw] = useState("");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  const runVerification = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await verifyBundle(raw));
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : "The export could not be verified.");
    } finally {
      setBusy(false);
    }
  };

  const loadFile = async (file: File | undefined) => {
    if (!file) return;
    setRaw(await file.text());
    setResult(null);
    setError(null);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void loadFile(event.dataTransfer.files?.[0]);
  };

  const copyVerificationSummary = async () => {
    if (!result?.valid) return;
    const summary = [
      "VALID RECEIPT",
      `Timestamp: ${timestamp}`,
      `Original proposition: ${proposition}`,
      `Receipt hash: ${result.bundle.receipt_hash}`,
    ].join("\n");
    await navigator.clipboard.writeText(summary);
    setCopiedSummary(true);
    window.setTimeout(() => setCopiedSummary(false), 2000);
  };

  const envelope = result?.bundle.envelope;
  const timestamp = typeof envelope?.generated_at === "number" ? new Date(envelope.generated_at).toLocaleString() : typeof envelope?.timestamp === "string" ? envelope.timestamp : "Unknown timestamp";
  const proposition = typeof envelope?.original_proposition === "string" ? envelope.original_proposition : "Unknown proposition";

  return (
    <main className="min-h-screen bg-[#08090d] px-4 py-8 text-stone-100 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-stone-400 transition-colors hover:text-stone-100"><ArrowLeft className="size-4" /> XinUS home</Link>
        <section className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-[#11131b] shadow-2xl shadow-black/30">
          <div className="border-b border-white/10 bg-gradient-to-br from-cyan-300/10 via-transparent to-violet-300/10 p-7 sm:p-10">
            <div className="flex items-center gap-3 text-cyan-200"><ShieldCheck className="size-6" /><span className="text-xs font-semibold uppercase tracking-[0.24em]">Public cryptographic verifier</span></div>
            <h1 className="mt-4 font-serif text-4xl tracking-tight sm:text-5xl">Verify a Clarity export</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-400">Verification happens entirely in this browser. No bundle is uploaded, stored, or sent to XinUS.</p>
          </div>
          <div className="space-y-5 p-7 sm:p-10">
            <label className="block text-sm font-medium text-stone-200" htmlFor="export-bundle">Paste the exported JSON bundle</label>
            <div onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={handleDrop} className={`rounded-2xl border-2 border-dashed p-2 transition-colors ${dragging ? "border-cyan-200 bg-cyan-200/10" : "border-white/10"}`}>
              <textarea id="export-bundle" value={raw} onChange={(event) => { setRaw(event.target.value); setResult(null); setError(null); }} placeholder={'Paste JSON here, or drag and drop an export file…\n\n{\n  "envelope": { ... },\n  "receipt_hash": "...",\n  "server_signature_ed25519_hex": "...",\n  "server_pubkey_hex": "..."\n}'} className="min-h-64 w-full rounded-xl bg-black/25 p-4 font-mono text-xs leading-5 text-stone-200 outline-none transition focus:ring-2 focus:ring-cyan-200/15" />
              <p className="px-3 pb-2 text-xs text-stone-500">{dragging ? "Release to load the JSON export" : "Drag and drop a .json export anywhere in this area"}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-stone-200 transition hover:bg-white/10"><FileUp className="size-4" /> Upload JSON<input type="file" accept="application/json,.json" className="sr-only" onChange={(event) => void loadFile(event.target.files?.[0])} /></label>
              <button type="button" disabled={!raw.trim() || busy} onClick={() => void runVerification()} className="inline-flex items-center gap-2 rounded-xl bg-cyan-200 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"><Upload className="size-4" /> {busy ? "Verifying…" : "Verify bundle"}</button>
            </div>

            {error && <div role="alert" className="rounded-2xl border border-rose-300/30 bg-rose-300/10 p-4 text-sm text-rose-100"><strong>✗ INVALID OR TAMPERED RECEIPT</strong><p className="mt-1 text-rose-200/80">{error}</p></div>}
            {result && <div role="status" className={`rounded-2xl border p-5 ${result.valid ? "border-emerald-300/35 bg-emerald-300/10" : "border-rose-300/30 bg-rose-300/10"}`}>
              <div className={`flex items-center gap-2 text-lg font-bold ${result.valid ? "text-emerald-200" : "text-rose-200"}`}>{result.valid ? <CheckCircle2 className="size-6" /> : <XCircle className="size-6" />} {result.valid ? "✓ VALID RECEIPT" : "✗ INVALID OR TAMPERED RECEIPT"}</div>
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div><span className="text-stone-400">Integrity hash</span><div className={result.hashValid ? "text-emerald-200" : "text-rose-200"}>{result.hashValid ? "Passed" : "Failed"}</div></div><div><span className="text-stone-400">Ed25519 signature</span><div className={result.signatureValid ? "text-emerald-200" : "text-rose-200"}>{result.signatureValid ? "Passed" : "Failed"}</div></div></div>
              {result.valid && <div className="mt-4 border-t border-emerald-200/15 pt-4 text-sm"><div><span className="text-stone-400">Timestamp</span><p className="mt-1 text-stone-100">{timestamp}</p></div><div className="mt-3"><span className="text-stone-400">Original proposition</span><p className="mt-1 text-stone-100">{proposition}</p></div><button type="button" onClick={() => void copyVerificationSummary()} className="mt-4 rounded-xl border border-emerald-200/30 bg-emerald-200/10 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-200/20">{copiedSummary ? "✓ Copied verification summary" : "Copy Verification Summary"}</button></div>}
            </div>}
          </div>
        </section>
        <p className="mt-5 text-center text-xs text-stone-500">SHA-256 integrity and Ed25519 authenticity are checked locally with the Web Crypto API.</p>
      </div>
    </main>
  );
}
