# XinUS Clarity Suite

XinUS Clarity Suite is a privacy-first, multi-app decision-support workspace for evidence analysis, learning, casework, recovery, operations, situational reporting, and personal action management.

The suite is built as eight standalone experiences powered by one shared intelligence boundary:

- **Clarity** — deterministic proposition and decision workflows.
- **GED Tutor** — adaptive, encouraging study support.
- **Hidden Gems** — image-led appraisal and provenance review.
- **PD Pro** — public-defense case organization and review.
- **Recovery** — structured recovery and reentry support.
- **Task Force Pro** — operational planning and supervision workflows.
- **SitRep** — evidence-bound situational assessment and comparison.
- **PAM** — Personal Action Manager and cross-app briefing surface.

## Production status

The production runtime is the Manus WebDev project `CERUhtwoxiEDvVacJwQnY6`, deployed at [exonissuite-ceruhtwo.manus.space](https://exonissuite-ceruhtwo.manus.space). This repository is the canonical source for that Manus deployment. See [SOURCE-OF-TRUTH.md](SOURCE-OF-TRUTH.md) for provenance and the boundaries between this repository, legacy Replit exports, and the separate Pharo-Lapse protocol repository.

## Architecture

The application uses React, TypeScript, Tailwind, Express, tRPC, Drizzle, and MySQL/TiDB-compatible persistence. The server owns authentication, authorization, provider selection, persistence, cryptographic verification, audit logging, and restricted-data policy. The browser never receives server-side provider credentials or signing keys.

The Clarity core contains a deterministic state machine and Truth Ledger. Deterministic transitions remain authoritative. Model-assisted output may explain, summarize, retrieve, or suggest; it may not silently change a state transition, verify evidence, create a receipt, or approve a consequential action.

SitRep preserves the distinction between evidence status and model confidence. Source documents and claims remain reviewable, simulation branches cannot promote unverified material, and consequential actions remain human-in-the-loop.

## Local-first intelligence

XinUS supports a server-side Ollama provider for private workflows through an OpenAI-compatible chat endpoint. Provider selection is controlled by `XINUS_AI_PROVIDER`; restricted workflows must use the local provider. The current provider abstraction is the foundation for the planned primary/fallback model router and Nomic Embed semantic index. See [docs/integrations/ollama.md](docs/integrations/ollama.md).

## Cryptographic verification

Clarity exports include a canonical envelope hash and server signature. Users can verify exports at `/verify` or with the root CLI utility:

```bash
node verify-receipt.mjs /path/to/export.json
```

Pharo-Lapse support is currently bounded to local signed-envelope construction and verification tests. It is not a claim of live mesh routing or Valkyrie connectivity. See [docs/integrations/pharo-lapse.md](docs/integrations/pharo-lapse.md).

## Development

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build
```

Do not commit `.env` files, private keys, signing material, credentials, database URLs, or provider tokens. Use the deployment secret manager and consult [README.production.md](README.production.md) and [SECURITY.md](SECURITY.md).

## License

The application is released under the MIT License. See [LICENSE](LICENSE).
