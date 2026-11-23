# Security Policy

## Scope

This policy covers the XinUS Clarity Suite source in this repository and the production Manus deployment documented in `SOURCE-OF-TRUTH.md`.

## Security boundaries

The server is the trust boundary. Server-side credentials, database access, provider tokens, export signing keys, authentication secrets, and restricted-data policy must remain server-side. Browser cryptography is used for verification and integrity checks; it is not a key vault.

Deterministic Clarity state transitions, Truth Ledger receipts, audit events, and evidence-status boundaries must not be replaced by unverified model output. Human review is required before consequential actions.

## Reporting a vulnerability

Do not open a public issue for a suspected secret, authentication bypass, private-data exposure, signing-key problem, or exploitable vulnerability. Use a private GitHub Security Advisory for this repository when available, or contact the repository owner through an authenticated private channel. Include reproduction steps, affected commit or deployment, impact, and a safe remediation suggestion. Do not include live credentials or sensitive case data.

## Secret-handling rules

Never commit `.env` files, PEM/private-key material, database URLs, access tokens, webhook secrets, cookies, session secrets, or unredacted production exports. Use the deployment secret manager. If a secret is committed, treat it as compromised even if the commit is later deleted: revoke it, rotate it, and then remove the material from history through an approved repository-maintenance process.

## Automated controls

Pull requests and pushes are checked for high-confidence secrets with Gitleaks. Dependency review and `pnpm audit` run in CI. The repository also contains a tracked-file security audit script that rejects sensitive filenames and common private-key or credential patterns.

These checks reduce risk but do not replace human review, least privilege, dependency updates, backups, log redaction, or incident response.

## Supported versions

Only the default branch and the active Manus deployment are maintained as production targets. Legacy Replit repositories are historical and are not security-supported production sources.
