# Pharo-Lapse Integration

## Current status

XinUS contains a local protocol core in `server/pharoLapse.ts` with deterministic canonicalization, Ed25519 envelope signing, pinned-peer verification, recipient validation, and tamper tests.

This is protocol support, not live mesh connectivity. The separate protocol repository is:

<https://github.com/tychomorr-ui/pharo-lapse>

Its XinUS Clarity adapter is intentionally marked pending. The reference adapter accepts an operator-approved payload and places it in a local queue; it does not call a XinUS API, create a complete v1.1 signed transport envelope, deliver to a peer, or prove an acknowledgement.

## Required production boundary

Before enabling delivery, XinUS needs an approved event/export contract, a v1.1-compliant adapter, operator-controlled durable queue and listener, verified peer IDs and Ed25519 keys, replay protection, retry/state handling, and an independently recorded signed acknowledgement test.

The application must not transmit restricted case data merely because a peer is listed in a manifest. Payload scope, recipient, user approval, and data sensitivity must be explicit. Valkyrie must remain an external adversarial-review capability until its API contract, authentication, authorization, and response-verification rules are approved.

## Safe rollout

1. Export a non-sensitive, operator-approved Clarity test receipt.
2. Convert it to the approved Pharo-Lapse envelope using a local adapter.
3. Verify the sender signature and pinned recipient before queueing.
4. Deliver only across the approved operator network.
5. Verify the signed acknowledgement and exactly-once behavior.
6. Record the receipt without storing private keys in XinUS or Git.

Do not represent a local queue entry, public manifest, or passing unit test as live mesh synchronization.
