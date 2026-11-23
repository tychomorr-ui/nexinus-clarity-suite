# XinUS Clarity Suite — Production Environment

This document records production configuration names only. **Never commit values, private keys, `.env` files, or PEM files to Git.** Supply secrets through the deployment secret manager or an untracked environment file.

## Clarity Suite variables

### Required for the normal production deployment

| Variable | Purpose |
|---|---|
| `NODE_ENV` | Set to `production`. |
| `PORT` | HTTP listener port; defaults to `3000` when omitted. |
| `DATABASE_URL` | MySQL/TiDB connection string for the XinUS database. |
| `JWT_SECRET` | Server-side session/cookie signing secret. |
| `VITE_APP_ID` | Application identifier used by the server configuration. |
| `OAUTH_SERVER_URL` | Private OAuth issuer/base URL when OAuth is enabled. |
| `OWNER_OPEN_ID` | Owner identity used by owner-gated workflows. |
| `XINUS_BETA_AUTH_BYPASS` | Must be exactly `false` in production to require authentication. |
| `XINUS_AI_PROVIDER` | Approved server-side provider, typically `ollama`, `bedrock-runtime`, `bedrock-mantle`, or `forge`. |

### Local-first AI configuration

Use these when the production host runs local Ollama:

| Variable | Purpose |
|---|---|
| `OLLAMA_BASE_URL` | Internal Ollama base URL. |
| `OLLAMA_MODEL` | Text model name. |
| `OLLAMA_FALLBACK_MODEL` | Approved fallback text model name. |
| `OLLAMA_EMBED_MODEL` | Approved embedding model name, normally Nomic Embed. |
| `OLLAMA_VISION_MODEL` | Optional vision model name for image workflows. |
| `OLLAMA_TIMEOUT_MS` | Maximum upstream request time. |
| `OLLAMA_MAX_CONCURRENCY` | Maximum concurrent local model requests. |

### Optional cloud/provider configuration

| Variable | Purpose |
|---|---|
| `BUILT_IN_FORGE_API_URL` | Server-side Forge endpoint, if Forge is selected. |
| `BUILT_IN_FORGE_API_KEY` | Server-side Forge credential; never expose to the client. |
| `AWS_BEARER_TOKEN_BEDROCK` | Amazon Bedrock bearer credential, if Bedrock is explicitly enabled. |
| `XINUS_BEDROCK_API_KEY` | Alternate Bedrock credential name supported by the app. |
| `XINUS_BEDROCK_REGION` | Bedrock region; defaults to `eu-west-1`. |
| `XINUS_BEDROCK_MODEL` | Bedrock model identifier. |
| `TAVILY_API_KEY` | Optional research integration credential. |
| `STRIPE_SECRET_KEY` | Server-side Stripe credential, if billing is enabled. |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret, if billing is enabled. |

### Export signing and private storage

| Variable | Purpose |
|---|---|
| `XINUS_EXPORT_ED25519_PRIVATE_KEY_HEX` | Server-only Ed25519 private key used to sign verifiable Clarity exports. Keep in a secret manager; never commit or print it. |
| `XINUS_PRIVATE_STORAGE_DIR` | Private local storage directory for restricted files. |
| `XINUS_QUALITY_TELEMETRY` | Optional quality telemetry configuration. |
| `XINUS_UNLIMITED_ACCESS` | Optional self-hosted entitlement override; enable only intentionally. |

## Root-Gate and Resonate Earth handoff variables

Root-Gate/Resonate Earth is an external deployment boundary and is not implemented by the XinUS source tree. The following names are reserved for that deployment and must be provisioned there, not placed in client-side code:

| Variable | Purpose |
|---|---|
| `ROOTGATE_SECRET` | Root-Gate server secret. |
| `ROOTGATE_MANIFEST_PUBKEY_HEX` | Public key used to validate the Root-Gate manifest. |
| `SERVER_ED25519_PRIVATE_KEY` | Offline/server-only signing key for the Resonate Earth manifest or server envelope. |

If the Resonate Earth deployment defines additional service-specific variables, document them in that deployment's private operations runbook rather than copying secret values into this repository.

## Key handling

The Root-Gate manifest private key and the Clarity export signing private key must be generated and stored offline or in an approved secret manager. Only public keys may be distributed to verification clients. Rotate keys through a documented migration window and retain the old public key long enough to verify existing exports.

## Database migrations

Run the checked-in Drizzle migration sequence against a clean production database using the project's migration workflow:

```bash
pnpm db:push
```

The append-only `clarity_audit_events` table is created by `drizzle/0013_equal_forgotten_one.sql`. The database-level `(sessionId, hash)` uniqueness constraint is created by `drizzle/0014_panoramic_red_skull.sql`. Both migrations are present in `drizzle/meta/_journal.json` and must be applied in sequence after the earlier Truth Ledger table migrations.

## Production validation

```bash
pnpm check
pnpm test
pnpm build
NODE_ENV=production node dist/index.js
```
