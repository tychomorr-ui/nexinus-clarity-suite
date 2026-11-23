# XinUS Production Launch Checklist

## Before launch

- [ ] Provision `DATABASE_URL`, `JWT_SECRET`, `VITE_APP_ID`, `OAUTH_SERVER_URL`, and `OWNER_OPEN_ID`.
- [ ] Set `NODE_ENV=production` and `XINUS_BETA_AUTH_BYPASS=false`.
- [ ] Select and configure one approved AI path with `XINUS_AI_PROVIDER`; for local-first operation, provision `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `OLLAMA_FALLBACK_MODEL`, and `OLLAMA_EMBED_MODEL`.
- [ ] Confirm the primary, fallback, embedding, and optional vision models are installed and reachable from the server.
- [ ] Confirm restricted workflows fail closed instead of routing to a cloud provider.
- [ ] Provision `XINUS_EXPORT_ED25519_PRIVATE_KEY_HEX` through the secret manager only. Never commit or print it.
- [ ] If enabled, provision the appropriate Forge, Bedrock, Tavily, Stripe, and private-storage variables listed in `README.production.md`.
- [ ] Apply the complete checked-in Drizzle migration sequence with `pnpm db:push`.
- [ ] Confirm `clarity_audit_events` and the `clarity_truth_ledger_session_hash_unique` constraint exist in the target database.
- [ ] Confirm HTTPS, private OAuth, backups, log redaction, and restricted storage permissions.

## Root-Gate / Resonate Earth handoff

- [ ] Provision `ROOTGATE_SECRET` in the Root-Gate environment.
- [ ] Provision `ROOTGATE_MANIFEST_PUBKEY_HEX` wherever manifest validation occurs.
- [ ] Provision `SERVER_ED25519_PRIVATE_KEY` only in the approved Resonate Earth signing environment.
- [ ] Keep the manifest private key stored offline locally or in an approved secret manager; never put it in Git, a browser bundle, or a public archive.
- [ ] Record any additional Resonate Earth service variables in its private operations runbook.

## Build and verify

```bash
pnpm check
pnpm test
pnpm build
NODE_ENV=production node dist/index.js
```

To verify a downloaded Clarity export locally:

```bash
node verify-receipt.mjs <path-to-export.json>
```

Expected output is either `✅ VALID RECEIPT` or `❌ INVALID/TAMPERED RECEIPT`.

## Freeze rule

This release is code-frozen. Do not add features, rotate keys without a migration plan, or alter the deterministic Clarity engine during launch preparation.
