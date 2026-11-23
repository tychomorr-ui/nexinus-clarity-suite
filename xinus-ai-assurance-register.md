# XinUS AI Assurance Register

**Version:** 1.0 — non-Bedrock upgrade cycle
**Applies to:** Clarity, GED Tutor, Hidden Gems, PD Pro, Recovery, Task Force Pro, SitRep, and PAM.

> This register is an operational quality-control document. It does not claim certification or replace a legal, security, accessibility, or sector-specific compliance assessment.

The register applies the practical lifecycle questions in the NIST AI RMF—govern, map, measure, and manage—to the XinUS workflows that can use AI or AI-adjacent decision support.[1] The privacy baseline is data minimization, a clear purpose boundary, user-controlled sharing, and no browser-exposed provider credentials.[2]

| Product | Intended assistance | Data boundary and active provider | Prohibited use | Required human review | Failure behavior and quality check |
| --- | --- | --- | --- | --- | --- |
| Clarity | Reflective decision framing and one reversible next move | User-scoped conversation; local Ollama only in this cycle | Diagnosis, authoritative prediction, or decision substitution | User reviews the working frame and decides the next action | Show a recoverable error; Transcend retains a deterministic fallback. Check that output distinguishes user input, working frame, verification need, and next move. |
| GED Tutor | Age-respectful adult learning, scaffolded explanation, and a next practice step | User-scoped learner preferences and session text; local Ollama plus explicit Tavily research action when selected | Fabricating facts, representing itself as the GED provider, or scoring/predicting an official result | Learner checks their answer and verifies current or uncertain claims with a trusted source | Preserve readable plain mathematics, show research unavailability clearly, and test for Concept, Try it, Check yourself, Next practice, and Verify this structure. |
| Hidden Gems | Cautious visual observation and appraisal starting point | Private image storage plus local vision inference; photo bytes are not cloud-routed | Professional authentication, definitive valuation, insurance/estate appraisal, or purchase/sale instruction | User validates with comparable research or a qualified appraiser before a consequential decision | Reject invalid files, store privately before inference, avoid raw upstream error text, and return a retriable storage error when persistence is unavailable. |
| PD Pro | Organization workflow organization, task/deadline extraction, and professional drafts | Private case workspace; local Ollama for Office assistance only | Legal advice, filing authorization, factual/legal citation invention, or action without review | Qualified advocate reviews inputs, source material, output, and every consequential action | Use Inputs, Draft/Working analysis, Unknowns, and Review checklist labels. Test ownership/authorization and PDF export access. |
| Recovery | Person-centered check-ins and support-plan organization | User-scoped recovery records; no cloud AI enabled | Automated risk score, diagnosis, supervision decision, or enforcement recommendation | Participant and authorized support professional retain judgment | Keep access free where configured; show durable local/server records and user-readable error/empty states. |
| Task Force Pro | Operational coordination and human-reviewed follow-through | Protected organization-owned records; no cloud AI enabled | Automated determination, enforcement instruction, or unreviewed escalation | Accountable human reviews facts, policy, and proportionality | Record action ownership and status; test authorization for every subject-scoped mutation. |
| SitRep | Structured situation assessment and decision brief | User-scoped situation/context; local Ollama only | Legal/immigration authority, emergency command, or fact invention | Accountable person validates assumptions, unknowns, and next move | Return Situation inputs, Working assessment, Unknowns, Options, Recommended next move, and Human review. Fail clearly and preserve the user’s entered text locally where supported. |
| PAM | Grounded continuity and routing to an appropriate XinUS workspace | User-scoped conversation plus only user-approved shared context; local Ollama only | Medical, legal, emergency authority, or undisclosed cross-product context sharing | User edits/revokes sharing and judges the next move | Return What I heard, Working frame, What to check, and Next move; retain the deterministic grounded fallback. |

## Release gates

The following gates apply to changed AI or AI-adjacent workflow code before production release.

| Gate | Evidence required |
| --- | --- |
| Access and privacy | A protected-route/ownership regression test, no client-side secret, and no ordinary log of full prompt, photo bytes, case text, or private record contents. |
| Output structure | A deterministic test or prompt-contract check for the relevant evidence, uncertainty, next-step, and human-review labels. |
| Failure recovery | A test for unavailable provider, unavailable storage, malformed response, or denied entitlement that confirms the user receives a recoverable message rather than an internal parser/detail leak. |
| Accessibility | Keyboard-reachable controls, visible focus, clear form labels, semantic `role="alert"` error messaging, motion that respects user preference, and contrast/reflow review against WCAG 2.2 AA guidance.[3] |
| Product accountability | A visible product-specific boundary naming what the workflow is and is not intended to decide. |

## Privacy-preserving quality signal

The local inference path now emits a minimal operational event containing only the **workflow identifier**, **outcome** (`success`, `failure`, or `fallback`), and **data sensitivity** (`standard` or `restricted`). The signal records no user identifier, prompt, response, photo bytes, case material, URL, IP address, provider credential, or model payload. Operators can disable it with `XINUS_QUALITY_TELEMETRY=false`. This makes reliability trend review possible without turning product content into telemetry.

## Review cadence

Review this register whenever a provider changes, a new sensitive data class is accepted, a new user-controlled sharing field is added, an AI workflow becomes action-capable, or a material incident/repeated quality failure occurs. The local-provider policy must be reviewed before any future Bedrock or other external-provider activation.

## References

[1]: https://www.nist.gov/itl/ai-risk-management-framework "NIST AI Risk Management Framework"
[2]: https://www.nist.gov/privacy-framework "NIST Privacy Framework"
[3]: https://www.w3.org/TR/WCAG22/ "Web Content Accessibility Guidelines (WCAG) 2.2"
