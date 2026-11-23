import { createPrivateKey, createPublicKey, randomUUID, sign, verify, type KeyObject } from "node:crypto";

export const PHARO_LAPSE_SCHEMA = "PHARO_LAPSE_ENVELOPE/v1" as const;

export type PharoLapsePayload = Record<string, unknown>;

export type PharoLapseUnsignedEnvelope = {
  schema: typeof PHARO_LAPSE_SCHEMA;
  envelopeId: string;
  senderPeerId: string;
  recipientPeerId: string;
  createdAt: string;
  kind: string;
  payload: PharoLapsePayload;
  senderPublicKey: string;
};

export type PharoLapseEnvelope = PharoLapseUnsignedEnvelope & {
  senderSignature: string;
};

export type PharoLapsePeer = {
  peerId: string;
  endpoint: string;
  pinnedPublicKey: string;
};

export type PharoLapseVerification =
  | { ok: true; senderPeerId: string; recipientPeerId: string }
  | { ok: false; code: "malformed" | "unknown_sender" | "recipient_mismatch" | "signature_invalid"; reason: string };

/** Deterministic sorted-key JSON for the protocol's simple JSON value set. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "number") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
  }
  throw new TypeError("Unsupported value in canonical JSON");
}

function signingView(envelope: PharoLapseUnsignedEnvelope | PharoLapseEnvelope): PharoLapseUnsignedEnvelope {
  const { senderSignature: _senderSignature, ...unsigned } = envelope as PharoLapseEnvelope;
  return unsigned;
}

function publicKeyBase64(privateKey: KeyObject): string {
  return (createPublicKey(privateKey).export({ format: "der", type: "spki" }) as Buffer).toString("base64");
}

export function createSignedEnvelope(input: {
  senderPeerId: string;
  recipientPeerId: string;
  kind: string;
  payload: PharoLapsePayload;
  privateKey: KeyObject | string | Buffer;
  envelopeId?: string;
  createdAt?: string;
}): PharoLapseEnvelope {
  const privateKey = typeof input.privateKey === "string" || Buffer.isBuffer(input.privateKey)
    ? createPrivateKey(input.privateKey)
    : input.privateKey;
  const unsigned: PharoLapseUnsignedEnvelope = {
    schema: PHARO_LAPSE_SCHEMA,
    envelopeId: input.envelopeId ?? randomUUID(),
    senderPeerId: input.senderPeerId,
    recipientPeerId: input.recipientPeerId,
    createdAt: input.createdAt ?? new Date().toISOString(),
    kind: input.kind,
    payload: input.payload,
    senderPublicKey: publicKeyBase64(privateKey),
  };
  const senderSignature = sign(null, Buffer.from(canonicalJson(unsigned), "utf8"), privateKey).toString("base64");
  return { ...unsigned, senderSignature };
}

export function verifySignedEnvelope(envelope: unknown, localPeerId: string, registry: readonly PharoLapsePeer[]): PharoLapseVerification {
  if (!envelope || typeof envelope !== "object") {
    return { ok: false, code: "malformed", reason: "Envelope must be an object." };
  }
  const candidate = envelope as Partial<PharoLapseEnvelope>;
  if (
    candidate.schema !== PHARO_LAPSE_SCHEMA ||
    typeof candidate.envelopeId !== "string" ||
    typeof candidate.senderPeerId !== "string" ||
    typeof candidate.recipientPeerId !== "string" ||
    typeof candidate.createdAt !== "string" ||
    typeof candidate.kind !== "string" ||
    !candidate.payload || typeof candidate.payload !== "object" || Array.isArray(candidate.payload) ||
    typeof candidate.senderPublicKey !== "string" ||
    typeof candidate.senderSignature !== "string"
  ) {
    return { ok: false, code: "malformed", reason: "Envelope does not match PHARO_LAPSE_ENVELOPE/v1." };
  }
  const peer = registry.find((entry) => entry.peerId === candidate.senderPeerId);
  if (!peer || peer.pinnedPublicKey !== candidate.senderPublicKey) {
    return { ok: false, code: "unknown_sender", reason: "Sender is not registered with the pinned public key." };
  }
  if (candidate.recipientPeerId !== localPeerId) {
    return { ok: false, code: "recipient_mismatch", reason: "Envelope recipient does not match this peer." };
  }
  try {
    const publicKey = createPublicKey({ key: Buffer.from(candidate.senderPublicKey, "base64"), format: "der", type: "spki" });
    const valid = verify(
      null,
      Buffer.from(canonicalJson(signingView(candidate as PharoLapseEnvelope)), "utf8"),
      publicKey,
      Buffer.from(candidate.senderSignature, "base64"),
    );
    return valid
      ? { ok: true, senderPeerId: candidate.senderPeerId, recipientPeerId: candidate.recipientPeerId }
      : { ok: false, code: "signature_invalid", reason: "Ed25519 signature verification failed." };
  } catch {
    return { ok: false, code: "signature_invalid", reason: "Ed25519 signature could not be verified." };
  }
}
