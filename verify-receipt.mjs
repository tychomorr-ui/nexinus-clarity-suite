#!/usr/bin/env node
import { createHash, createPublicKey, verify } from "node:crypto";
import { readFile } from "node:fs/promises";

function canonicalStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalStringify(value[key])}`).join(",")}}`;
}

function hexBytes(value, expectedBytes) {
  return /^[0-9a-f]+$/i.test(value) && value.length === expectedBytes * 2 ? Buffer.from(value, "hex") : null;
}

function invalid(message) {
  console.log("❌ INVALID/TAMPERED RECEIPT");
  if (message) console.error(message);
  process.exitCode = 1;
}

const path = process.argv[2];
if (!path) {
  console.error("Usage: node verify-receipt.mjs <path-to-export.json>");
  process.exitCode = 2;
} else {
  try {
    const bundle = JSON.parse(await readFile(path, "utf8"));
    const envelope = bundle?.envelope;
    const receiptHash = bundle?.receipt_hash;
    const signatureHex = bundle?.server_signature_ed25519_hex;
    const publicKeyHex = bundle?.server_pubkey_hex;
    if (!envelope || typeof envelope !== "object") throw new Error("Missing envelope.");
    if (typeof receiptHash !== "string" || !/^[a-f0-9]{64}$/.test(receiptHash)) throw new Error("Invalid receipt_hash.");
    const signature = hexBytes(signatureHex, 64);
    const publicKey = hexBytes(publicKeyHex, 32);
    if (!signature || !publicKey) throw new Error("Invalid Ed25519 signature or public key.");

    const computedHash = createHash("sha256").update(canonicalStringify(envelope), "utf8").digest("hex");
    const publicDer = Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), publicKey]);
    const signatureValid = verify(null, Buffer.from(receiptHash, "utf8"), { key: createPublicKey({ key: publicDer, format: "der", type: "spki" }) }, signature);
    if (computedHash !== receiptHash || !signatureValid) {
      invalid(computedHash !== receiptHash ? "SHA-256 integrity check failed." : "Ed25519 signature check failed.");
    } else {
      console.log("✅ VALID RECEIPT");
      console.log(`Timestamp: ${typeof envelope.generated_at === "number" ? new Date(envelope.generated_at).toISOString() : envelope.timestamp ?? "Unknown"}`);
      console.log(`Original proposition: ${envelope.original_proposition ?? "Unknown"}`);
      console.log(`Receipt hash: ${receiptHash}`);
    }
  } catch (error) {
    invalid(error instanceof Error ? error.message : "Could not parse receipt export.");
  }
}
