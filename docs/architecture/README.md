# Architecture

## Runtime layers

1. **Standalone app surfaces** provide Clarity, GED Tutor, Hidden Gems, PD Pro, Recovery, Task Force Pro, SitRep, and PAM workflows.
2. **Shared server procedures** enforce authentication, entitlements, validation, persistence, provider policy, audit events, and export handling.
3. **Deterministic engines** handle state transitions, evidence boundaries, hashing, receipts, and safety gates.
4. **Local intelligence adapters** call approved Ollama models for non-authoritative generation, summarization, retrieval, and explanation.
5. **Human approval controls** separate suggestions and simulations from consequential actions.

## Trust boundaries

The browser is an untrusted presentation and verification surface. The application server is the policy and persistence boundary. Ollama is a private model service and must be reachable only through the server-side adapter. Database rows, audit events, and signed exports are authoritative only after server validation.

## Core invariants

- Model output cannot change a deterministic state transition without an explicit application rule and human action.
- Unverified evidence cannot be promoted by a simulation branch.
- Export hashes are recomputed server-side.
- Audit events are append-only.
- Restricted data cannot be routed to a cloud provider.
- Cross-app context sharing requires explicit user controls.

See `README.production.md` for runtime operations and the integration documents for Ollama and Pharo-Lapse boundaries.
