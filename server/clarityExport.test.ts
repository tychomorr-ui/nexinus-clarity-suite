import { describe, expect, it } from "vitest";
import { clarityExportPublicKeyHex, signClarityReceiptHash, verifyClarityReceiptSignature } from "./clarityExport";

describe("Clarity verifiable exports", () => {
  it("signs the exact receipt hash with a verifiable Ed25519 key", () => {
    const receiptHash = "a".repeat(64);
    const signature = signClarityReceiptHash(receiptHash);
    const publicKey = clarityExportPublicKeyHex();
    expect(publicKey).toHaveLength(64);
    expect(signature).toHaveLength(128);
    expect(verifyClarityReceiptSignature(receiptHash, signature, publicKey)).toBe(true);
    expect(verifyClarityReceiptSignature(`${receiptHash.slice(0, -1)}b`, signature, publicKey)).toBe(false);
  });
});
