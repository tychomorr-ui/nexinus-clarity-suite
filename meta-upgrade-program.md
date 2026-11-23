# XinUS Meta-Upgrade Program

**Objective:** Build a stronger XinUS product system through durable operational quality—not an unsupported claim that the suite is universally superior. The program prioritizes privacy-bounded intelligence, user agency, evidence-aware workflows, human accountability, accessibility, and reliable recovery from external-service failures.

> **XinUS standard:** Every intelligence-assisted workflow should make it clear what the user supplied, what the system inferred, what remains unknown, where the work is stored, and what a person must review before acting.

## Prioritization model

The implementation order weighs four factors: user harm if the workflow fails, cross-product leverage, evidence from benchmark research, and delivery feasibility on the current Lightsail architecture. This gives immediate preference to provider resiliency, upload reliability, consent, and user-visible failure states over feature quantity.

| Priority | Upgrade initiative | Why it comes first | Completion measure |
| --- | --- | --- | --- |
| P0 | Provider policy, Bedrock readiness, and observability | One provider boundary supplies the AI behavior used by most XinUS products. Amazon Bedrock Runtime can support a server-side OpenAI-compatible path in Ireland while Ollama remains private/local by default.[1] [2] | Explicit provider selection, Bedrock configuration validation, no credential/client leakage, consent policy hook, health-safe status, regression tests, and unchanged Ollama default behavior. |
| P0 | Hidden Gems upload reliability and clear recovery | A photo-analysis workflow must never surface HTML-parser noise to the user or silently lose an image. | Validate presign content type before JSON parsing, add a secure persistence fallback appropriate to Lightsail, return a clear recovery message, and add end-to-end regression tests. |
| P0 | Consistent intelligence outcome states | Trust drops when products expose raw upstream errors, ambiguous loading, or no explanation of unavailable actions. | Each upgraded action has a visible loading, success, empty, error, retry, and preserved-local-work state; errors are categorized without leaking internals. |
| P1 | Evidence-aware work objects | Leading research, legal, and operational workflows retain scope, sources, assumptions, and review points rather than only generated prose.[3] [4] [5] | Decision Thread, case timeline, appraisal evidence packet, and SitRep brief each label input, inference, evidence, uncertainty, owner, and review status. |
| P1 | Adaptive progress loops | Adult learning tools compete through guided practice, progress signals, reminders, and personalized planning rather than chat alone.[6] | GED Tutor gains baseline skill signal, next micro-practice, self-rating, spaced review suggestion, and an explainable study plan. |
| P1 | Human-review safety rails | Justice/supervision and operational systems should make AI optional, human-reviewed, data-minimized, and auditable.[7] [8] | Recovery, Task Force Pro, PD Pro, and SitRep require user confirmation for consequential follow-through and display an AI-use/opt-out boundary. |
| P2 | Privacy, accessibility, and quality governance | Trustworthy AI and inclusive UX need continuous lifecycle controls, not a one-time product claim.[9] [10] [11] | Per-workflow assurance register, product data controls, retention/export transparency, WCAG 2.2 AA acceptance checks, and non-sensitive quality telemetry. |

## P0 execution scope

This release concentrates on the platform improvements that directly unblock current experience quality and safely prepare the user-requested Bedrock integration.

| Workstream | Included now | Explicit boundary |
| --- | --- | --- |
| AI routing | A provider-neutral resolver, `ollama` default, Bedrock Runtime-ready OpenAI-compatible routing, provider/model allowlist, safe status metadata, and test coverage | Bedrock remains disabled until a server-side credential and production access policy are supplied; it will not silently receive sensitive material. |
| Bedrock security | Region-locked configuration, server-only secret, error normalization, no secret logging, and an intended-use policy | No client-side key, no hard-coded secret, no long-term-key recommendation for production, and no automatic cloud routing for PD Pro/recovery/Task Force/Hidden Gems media. |
| Hidden Gems | Content-type-aware Forge parsing, explicit private-storage failure classification, and a Lightsail-compatible fallback plan | No base64 archive as a default data-store and no public object URLs. A fallback must remain user-authorized and privately served. |
| Product reliability | Reusable error copy and clear retry behavior in directly affected AI/upload screens | This is not a replacement for the remaining route-by-route state audit, which stays in the ledger. |

## Measurable acceptance criteria

The program will not be reported as complete based only on a build passing. Each P0 change must satisfy the following checks.

| Dimension | P0 acceptance criterion |
| --- | --- |
| Correctness | Full Vitest suite, static type check, production build, and tests for the newly selected provider and storage branches pass. |
| Availability | Failed storage presign, AI provider timeout, malformed upstream JSON, and denied entitlement produce a user-readable recovery state rather than a raw stack, HTML fragment, or parser error. |
| Privacy | No secret, full prompt, photo bytes, legal case text, recovery/supervision record, or direct signed URL enters ordinary logs. Cloud provider selection is off for restricted products unless future product-specific consent is enabled. |
| Safety | AI output remains advisory; flows that affect legal, recovery/supervision, or operations include a visible human-review boundary. |
| Accessibility | Updated controls are keyboard reachable, have discernible labels, retain visible focus, respect reduced motion, and maintain contrast consistent with WCAG 2.2 principles.[11] |
| Evidence | New research or operational output distinguishes supplied facts, generated inference, and sources/unknowns where those elements exist. |

## Product maturation sequence after P0

After the P0 deployment, XinUS should mature each standalone application through a shared **work-object** grammar without collapsing their distinct use cases.

| Product | Next high-value object | Differentiated benefit |
| --- | --- | --- |
| Clarity | Decision Thread | Revisit a decision with explicit options, criteria, evidence, commitments, and outcome learning. |
| GED Tutor | Skill Loop | Keep coaching tied to a learn–practice–self-rate–review cycle rather than chat chronology. |
| Hidden Gems | Appraisal Evidence Packet | Guide multi-angle capture, marks, measurements, condition, provenance, uncertainty, and next research step. |
| PD Pro | Reviewable Case Timeline | Pair an extracted task/deadline with its source excerpt and an advocate approval state. |
| Recovery | Support Plan Check-in | Focus on self-directed goals, support contacts, and optional reminders—not automated risk scoring. |
| Task Force Pro | Human-reviewed Follow-through | Separate observed inputs, policy context, proposal, reviewer decision, and audit history. |
| SitRep | Decision Brief | Make assumptions, missing facts, severity rationale, decision owner, and follow-up explicit. |
| PAM | Continuity Card | Surface only the cross-product context the user has authorized, alongside a clear revoke/edit path. |

## References

[1]: https://docs.aws.amazon.com/bedrock/latest/userguide/endpoints.html "Endpoints supported by Amazon Bedrock"
[2]: https://docs.aws.amazon.com/bedrock/latest/userguide/api-keys.html "API keys - Amazon Bedrock"
[3]: https://help.openai.com/en/articles/10169521-projects-in-chatgpt "Projects in ChatGPT"
[4]: https://chatgpt.com/features/deep-research/ "Deep research in ChatGPT"
[5]: https://www.clio.com/features/legal-ai-software/ "Legal AI software — Clio"
[6]: https://www.ged.com/study/ged-mobile-app.html "GED & Me — The Official GED Mobile App"
[7]: https://www.recidiviz.org/ai "How Recidiviz Uses AI"
[8]: https://www.palantir.com/platforms/aip/ "Palantir Artificial Intelligence Platform"
[9]: https://www.nist.gov/itl/ai-risk-management-framework "AI Risk Management Framework — NIST"
[10]: https://www.nist.gov/privacy-framework "Privacy Framework — NIST"
[11]: https://www.w3.org/TR/WCAG22/ "Web Content Accessibility Guidelines (WCAG) 2.2 — W3C"
