import { createHash, createPrivateKey, createPublicKey, sign, verify } from "node:crypto";

const PKCS8_ED25519_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");
const SPKI_ED25519_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

function privateSeed() {
  const configured = process.env.XINUS_EXPORT_ED25519_PRIVATE_KEY_HEX?.trim();
  if (configured) {
    const seed = Buffer.from(configured, "hex");
    if (seed.length !== 32) throw new Error("XINUS_EXPORT_ED25519_PRIVATE_KEY_HEX must contain a 32-byte Ed25519 seed.");
    return seed;
  }
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required to derive the Clarity export signing key.");
  return createHash("sha256").update(`xinus-clarity-export-ed25519:${secret}`, "utf8").digest();
}

function privateKey() {
  return createPrivateKey({ key: Buffer.concat([PKCS8_ED25519_PREFIX, privateSeed()]), format: "der", type: "pkcs8" });
}

export function clarityExportPublicKeyHex() {
  const publicDer = createPublicKey(privateKey()).export({ format: "der", type: "spki" }) as Buffer;
  return publicDer.subarray(SPKI_ED25519_PREFIX.length).toString("hex");
}

export function signClarityReceiptHash(receiptHash: string) {
  return sign(null, Buffer.from(receiptHash, "utf8"), privateKey()).toString("hex");
}

export function verifyClarityReceiptSignature(receiptHash: string, signatureHex: string, publicKeyHex = clarityExportPublicKeyHex()) {
  const publicDer = Buffer.concat([SPKI_ED25519_PREFIX, Buffer.from(publicKeyHex, "hex")]);
  return verify(null, Buffer.from(receiptHash, "utf8"), { key: publicDer, format: "der", type: "spki" }, Buffer.from(signatureHex, "hex"));
}
