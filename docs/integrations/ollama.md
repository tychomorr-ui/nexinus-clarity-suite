# Ollama Integration

## Purpose

Ollama is the preferred private intelligence provider for XinUS. The browser calls XinUS server procedures; the server calls Ollama. No browser code should call Ollama directly, and no Ollama credential should be bundled into the frontend.

## Provider contract

The current chat adapter uses Ollama's OpenAI-compatible endpoint:

```text
POST {OLLAMA_BASE_URL}/v1/chat/completions
GET  {OLLAMA_BASE_URL}/v1/models
```

The provider is selected with `XINUS_AI_PROVIDER=ollama`. The production adapter should allowlist the configured primary and fallback models rather than accepting arbitrary client-supplied model names.

## Recommended model roles

- Primary chat/reasoning: the approved Llama 3.2 8B tag installed on the operator server.
- Fallback chat/reasoning: the approved Llama 3.1 3B tag installed on the operator server.
- Embeddings: `nomic-embed-text` or the exact approved Nomic Embed tag installed on the operator server.
- Vision: an explicitly installed local vision model only when an image workflow requires it.

The exact tags must be verified with `ollama list`; do not assume a tag exists because a deployment document names it.

## Required gateway behavior

The shared server adapter should provide health checks, bounded request timeouts, output limits, concurrency limits, structured errors, retry rules for transient failures, and a primary-to-fallback transition only for eligible failures. It must not use the fallback to bypass a restricted-data policy.

Embedding requests should be separate from chat requests. Store only approved, purpose-limited fragments and metadata in the semantic index. Do not embed an entire sensitive case file by default. Retrieval results must preserve source IDs, claim status, confidence, and human-verification state.

## Deterministic boundaries

Clarity's state machine, Transcend classification, Truth Ledger hashing, audit events, and SitRep evidence-status transitions remain deterministic. Ollama may produce an explanation, summary, question, or suggested next step, but it cannot create a receipt, promote evidence, approve an action, or change a state without the existing application path and human action.

## Readiness checklist

- [ ] Ollama is reachable from the server over a private route.
- [ ] Primary, fallback, embedding, and optional vision models are installed.
- [ ] The server reports provider readiness without exposing credentials.
- [ ] Restricted requests are blocked from cloud providers.
- [ ] Primary/fallback behavior is covered by tests.
- [ ] Embedding dimensions and index schema are fixed before production data is indexed.
