# XinUS AI Architecture and Amazon Bedrock Readiness Audit

**Status:** Phase 1 working record for the XinUS meta-upgrade program.
**Scope:** The current production deployment, model-provider seam, data-handling implications, and the appropriate Amazon Bedrock path.

## Current production position

XinUS is **not currently using Amazon Bedrock**. The live Ireland deployment has only the local Ollama provider configured, with `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, and `OLLAMA_VISION_MODEL` present in the service environment. The Amazon Bedrock Runtime SDK is not installed, no Bedrock environment variables are configured, and the provider resolver contains only local-Ollama and Forge branches.

| Area | Current state | Implication |
| --- | --- | --- |
| Text inference | Local Ollama through an OpenAI-compatible `/v1/chat/completions` endpoint | Keeps routine reflective and tutoring content on the Lightsail host, but capability and resilience depend on the local models. |
| Vision appraisal | Local Ollama vision model, with an in-memory data URL passed to the model | Maintains the existing Hidden Gems flow, but persistent photo storage currently remains a separate reliability risk. |
| Product model calls | Clarity, GED Tutor, Hidden Gems, PD Pro, SitRep, and PAM call the common provider layer; Recovery and Task Force workflows are presently deterministic/data-backed | A single provider-routing upgrade can improve consistency, observability, fallbacks, and model policy across the suite. |
| Context sharing | The server injects only user-approved North Star and preferences for eligible products | This is a useful privacy baseline, but product sensitivity must govern future cloud-model routing. |
| Research support | GED uses Tavily only for an explicit trusted-source research action | Research stays optional and separate from model generation, which should be preserved. |

## Architecture assessment

The existing `server/_core/llm.ts` abstraction already accepts an OpenAI-compatible Chat Completions request shape. That makes a **Bedrock OpenAI-compatible provider** materially lower-risk than a first integration built directly on a model-specific API. The current implementation needs provider selection, configuration validation, model policy, structured error normalization, privacy-aware routing, and provider-focused tests—not a rewrite of each product workflow.

The system currently has a useful safety characteristic: the shared reflective profile is narrow and opt-in. It must not be expanded into an automatic transfer of legal case material, recovery/supervision records, or appraisal images to a third-party model. Such transfers must require a separate, plainly named user or organization policy decision.

## Amazon Bedrock recommendation

> **Use Amazon Bedrock Runtime in `eu-west-1` as the optional cloud-quality provider; keep Ollama as the private/local default and emergency fallback.**

Amazon Bedrock offers OpenAI-compatible Chat Completions and Responses endpoints. AWS recommends the `bedrock-runtime` endpoint for new applications, and it exposes features that matter to XinUS’s sensitive workflows, including Guardrails, intelligent prompt routing, and cross-Region inference controls.[1] [2]

The Lightsail deployment is already in **Europe (Ireland)**, and both the runtime service and the Mantle endpoint are available in `eu-west-1`.[1] A runtime base URL of `https://bedrock-runtime.eu-west-1.amazonaws.com/openai/v1` aligns with the current server-only provider boundary. This preserves the option to adopt Mantle later for specialized asynchronous or server-side-tool workloads without treating Mantle as the default path.

| Provider mode | Intended workload | Data boundary | Default decision |
| --- | --- | --- | --- |
| `ollama` | Routine Clarity, PAM, basic GED tutoring, local Hidden Gems vision | Stays on the XinUS Lightsail host | **Default** |
| `bedrock-runtime` | Explicitly approved high-quality analysis, more difficult tutoring, and selected organizational workflows | Sent to AWS in the configured region under a documented policy | **Opt-in** |
| `bedrock-mantle` | Future asynchronous, stateful, agentic, or server-side-tool workload where its exclusive features are justified | Sent to AWS; stored response settings must be explicit | **Deferred** |
| `forge` | Managed-environment fallback only where it is actually available | Managed-provider boundary | **Existing fallback** |

## Credential and security position

No Bedrock credential is currently present. A literal secret should **not** be placed in source code, browser code, SSH history, or an unencrypted deployment script. For production, AWS recommends short-term keys rather than long-term keys; short-term API keys last at most 12 hours and are region-bound, while long-term keys are positioned for exploration only.[3] [4]

The preferred production setup is an IAM identity/role with the least required Bedrock permissions and short-lived credentials. If a supplied Bedrock API key must be used for the first integration test, XinUS should store it server-side only under the Bedrock-defined bearer-token environment convention, scope it to `eu-west-1`, set an explicit expiry/rotation record, and add a startup health check that reports only provider status—not credential contents. AWS records API activity in CloudTrail and specifies distinct authorization actions for Bedrock Runtime and Bedrock Mantle bearer-token traffic.[3] [5]

## Required implementation controls

| Control | Minimum XinUS implementation standard |
| --- | --- |
| Provider selection | Server-side `XINUS_AI_PROVIDER=ollama|bedrock-runtime|bedrock-mantle|forge`, with local Ollama retained as an explicit fallback rather than silently switching providers. |
| Model policy | Product- and capability-specific allowlist; vision and structured-output use cases must be validated against the selected Bedrock model before activation. |
| Consent boundary | Default cloud routing off for PD Pro case text, Recovery/Task Force information, and Hidden Gems images; require product-level approval with a clear explanation of the external processor and region. |
| Retention | Disable stored-response behavior where the selected API supports it unless a user or organization explicitly chooses a documented continuity feature. Amazon Bedrock Responses otherwise stores request/response content by default for 30 days.[1] |
| Guardrails | Evaluate Bedrock Guardrails for cloud-routed general and education interactions; do not present generative output as legal, clinical, supervision, valuation, or enforcement judgment. |
| Observability | Log provider, selected model policy, latency band, outcome class, and request ID only. Never log full prompts, photos, case material, learner answers, or credentials by default. |
| Resilience | Bounded timeout, one safe fallback attempt, standard user-facing incident state, and a no-charge/no-credit-spend outcome when the provider fails before a usable answer is returned. |
| Tests | Unit tests for provider resolution, no-secret logging, consent-based routing, OpenAI-compatible Bedrock request mapping, fallback behavior, and non-regression of existing Ollama calls. |

## Phase-1 decision

Amazon Bedrock is a **viable and strategically useful optional provider**, but it should not replace the local private model unconditionally. The next implementation should create a tested, provider-neutral routing policy and then accept the user’s credential through server-side secret management. It should start with Bedrock Runtime in `eu-west-1`, not Mantle, because AWS recommends Runtime for new applications and Runtime supplies the relevant guardrail and inference-routing options.[2]

## References

[1]: https://docs.aws.amazon.com/bedrock/latest/userguide/bedrock-mantle.html "Inference using Responses API - Amazon Bedrock"
[2]: https://docs.aws.amazon.com/bedrock/latest/userguide/endpoints.html "Endpoints supported by Amazon Bedrock"
[3]: https://docs.aws.amazon.com/bedrock/latest/userguide/api-keys.html "API keys - Amazon Bedrock"
[4]: https://docs.aws.amazon.com/bedrock/latest/userguide/api-keys-how.html "How Amazon Bedrock API keys work"
[5]: https://docs.aws.amazon.com/bedrock/latest/userguide/api-keys-permissions.html "Control permissions for generating and using Amazon Bedrock API keys"
