import { execFileSync } from "node:child_process";
import { createHash, createPrivateKey, createPublicKey, sign } from "node:crypto";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const privatePrefix = Buffer.from("302e020100300506032b657004220420", "hex");
const publicPrefix = Buffer.from("302a300506032b6570032100", "hex");
const seed = Buffer.alloc(32, 7);
const privateKey = createPrivateKey({ key: Buffer.concat([privatePrefix, seed]), format: "der", type: "pkcs8" });
const publicKeyHex = (createPublicKey(privateKey).export({ format: "der", type: "spki" })).subarray(publicPrefix.length).toString("hex");
const canonical = (value: any): string => value === null || typeof value !== "object" ? JSON.stringify(value) : Array.isArray(value) ? `[${value.map(canonical).join(",")}]` : `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;

function makeBundle() {
  const envelope = { generated_at: 1792320000000, original_proposition: "Complete the review.", session_id: "cli-test-session", terminal_state: "COMMITTED" };
  const receiptHash = createHash("sha256").update(canonical(envelope), "utf8").digest("hex");
  const signature = sign(null, Buffer.from(receiptHash, "utf8"), privateKey).toString("hex");
  return { envelope, receipt_hash: receiptHash, server_signature_ed25519_hex: signature, server_pubkey_hex: publicKeyHex };
}

describe("verify-receipt CLI", () => {
  it("validates a known-good signed receipt and rejects a tampered one", async () => {
    const directory = await mkdtemp(join(tmpdir(), "xinus-verify-"));
    const validPath = join(directory, "valid.json");
    const tamperedPath = join(directory, "tampered.json");
    const valid = makeBundle();
    await writeFile(validPath, JSON.stringify(valid));
    await writeFile(tamperedPath, JSON.stringify({ ...valid, envelope: { ...valid.envelope, original_proposition: "Tampered." } }));
    const cli = join(process.cwd(), "verify-receipt.mjs");
    const validOutput = execFileSync(process.execPath, [cli, validPath], { encoding: "utf8" });
    expect(validOutput).toContain("✅ VALID RECEIPT");
    expect(() => execFileSync(process.execPath, [cli, tamperedPath], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })).toThrow();
  });
});
