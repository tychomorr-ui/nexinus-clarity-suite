import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  canonicalJson,
  createSignedEnvelope,
  verifySignedEnvelope,
  type PharoLapsePeer,
} from "./pharoLapse";

describe("Pharo-Lapse signed envelope core", () => {
  const keys = generateKeyPairSync("ed25519");
  const publicKey = (keys.publicKey.export({ format: "der", type: "spki" }) as Buffer).toString("base64");
  const registry: PharoLapsePeer[] = [{ peerId: "ARCHANGEL", endpoint: "http://archangel.test", pinnedPublicKey: publicKey }];

  function envelope() {
    return createSignedEnvelope({
      senderPeerId: "ARCHANGEL",
      recipientPeerId: "VALKYRIE",
      kind: "STATUS_ATTESTATION",
      payload: {
        attestingPeerId: "ARCHANGEL",
        subjectPeerId: "VALKYRIE",
        observedAt: "2026-10-25T00:00:00.000Z",
        observation: "HEAD 200",
        manifestCid: "cid:test",
        codeHash: null,
      },
      privateKey: keys.privateKey,
      envelopeId: "00000000-0000-4000-8000-000000000001",
      createdAt: "2026-10-25T00:00:00.000Z",
    });
  }

  it("uses sorted-key canonical JSON and verifies a pinned sender", () => {
    expect(canonicalJson({ z: 1, a: { y: true, b: 2 } })).toBe('{"a":{"b":2,"y":true},"z":1}');
    const result = verifySignedEnvelope(envelope(), "VALKYRIE", registry);
    expect(result).toEqual({ ok: true, senderPeerId: "ARCHANGEL", recipientPeerId: "VALKYRIE" });
  });

  it("rejects a payload modified after signing", () => {
    const tampered = envelope();
    tampered.payload.observation = "TAMPERED";
    expect(verifySignedEnvelope(tampered, "VALKYRIE", registry)).toMatchObject({
      ok: false,
      code: "signature_invalid",
    });
  });

  it("rejects an unpinned sender key and a wrong recipient", () => {
    const unpinned = { ...envelope(), senderPublicKey: "invalid" };
    expect(verifySignedEnvelope(unpinned, "VALKYRIE", registry)).toMatchObject({ ok: false, code: "unknown_sender" });
    expect(verifySignedEnvelope(envelope(), "OTHER-PEER", registry)).toMatchObject({ ok: false, code: "recipient_mismatch" });
  });
});
