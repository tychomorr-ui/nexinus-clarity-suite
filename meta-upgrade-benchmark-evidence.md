# XinUS Benchmark Evidence Ledger

**Status:** Research working record for Phase 2. The entries below distinguish published benchmark capabilities from XinUS opportunities; none is a claim that XinUS already provides the listed capability.

## Cross-category capability signals

| XinUS surface | Verified market signal | Opportunity hypothesis for XinUS |
| --- | --- | --- |
| Clarity and PAM | Project-oriented AI products treat long-running work as a scoped workspace with saved source material, instructions, continuity, access controls, and memory boundaries.[1] | Move beyond a chat log by introducing user-owned **Decision Threads**: an explicit decision, assumptions, options, evidence, commitments, and an expiry/revisit date. Keep cross-product context opt-in and field-level. |
| Clarity and PAM | Research systems emphasize source selection, visible plans, real-time control, and report-grade output rather than an opaque answer.[2] | Add an **Evidence Mode** that separates user facts, assumptions, research sources, unknowns, confidence, and recommended next move. It must preserve the existing non-diagnostic stance and make no automatic web call. |
| GED Tutor | The official GED mobile app combines personalized study paths, practice questions, AI explanations, progress tracking, short lessons, reminders, and test-day guidance.[3] | Add a persistent **Study Loop**: baseline check, target skill, worked example, one micro-practice item, mastery signal, and review schedule. Treat AI feedback as coaching, not a score or official GED prediction. |
| PD Pro | Leading legal-workflow tools transform source documents into reviewable deadlines/tasks, surface original context, and require human review before completion.[4] | Upgrade PD Pro from note capture to an **evidence-linked case timeline** with a source excerpt, extracted deadline/task, confidence, and explicit attorney/advocate approval state. Do not characterize output as legal advice. |
| Recovery and Task Force Pro | Responsible justice-data platforms make AI optional, prohibit unsupervised life-altering decisions, use human review, minimize data use, and disclose fairness/privacy controls.[5] | Add a **human-review safety rail**: no automated risk judgment, no enforcement recommendation, clear data-purpose labels, review-required status, and a product-specific AI opt-out. |
| Recovery and Task Force Pro | Secure justice platforms emphasize least-privilege authorization, RBAC, audit trails, isolated environments, encrypted logs, incident response, and vulnerability management.[6] | Establish an auditable **sensitive-workflow baseline** before adding more AI: action log, visibility by role, configurable retention, export/access history, and a clear security controls page. |
| Hidden Gems | Online appraisal intake expects multiple high-quality angles, close-ups of marks, measurements, condition, provenance, and supplemental documentation—not a single photo alone.[7] | Replace one-shot appraisal input with a **guided capture checklist** and evidence packet. The output should separate visual observations, user-provided facts, comparable-research needs, uncertainty, and professional-authentication guidance. |
| SitRep | Operational-AI platforms emphasize visible logic, proposal review, traceable history, human approval, and evaluation before production change.[8] | Add a **SitRep decision brief** that renders inputs, assumptions, severity rationale, missing facts, proposed action, owner, timestamp, and an approval/decline history. |
| Platform-wide governance | NIST’s voluntary AI RMF organizes trustworthy-AI risk work across Govern, Map, Measure, and Manage rather than treating safety as a one-time model selection.[9] [10] | Add a lightweight **XinUS AI assurance register** for each AI workflow: intended use, prohibited use, data class, provider, test cases, failure behavior, owner, and review date. |
| Platform-wide privacy | The NIST Privacy Framework is intended to help organizations identify and manage privacy risk while developing services.[11] | Make data-purpose, retention, export, and external-provider choices visible at the product and field level; keep the default profile sharing model narrow. |
| Platform-wide accessibility | WCAG 2.2 provides testable, technology-neutral success criteria and recommends the current guidance to improve accessibility for desktop and mobile users.[12] | Establish WCAG 2.2 AA as the practical acceptance target for new and changed workflows, with keyboard, focus, touch-target, contrast, error-message, and reduced-motion checks. |

## Compound design principles

The competitive opportunity is not to replicate every benchmark feature. XinUS can differentiate by using the same common standard across standalone products: **a useful AI answer must be traceable, consent-bounded, actionable, reversible when possible, and clearly subject to human judgment.** This gives Clarity, education, casework, recovery, operations, appraisal, and situational assessment a single disciplined interaction model while retaining product-specific language.

| Principle | Minimum product behavior |
| --- | --- |
| User agency | Users can see what context is used, change it, revoke it, and choose whether an external provider may receive it. |
| Evidence separation | The UI labels direct user input, extracted data, model inference, sourced research, and unanswered questions separately. |
| Human accountability | In legal, recovery, task-force, and operational workflows, users must review/approve consequential follow-through. |
| Graceful degradation | When a provider, storage service, research service, or payment gate is unavailable, preserve local work and give a clear next step rather than an opaque parser failure. |
| Measurable quality | Each AI workflow records non-sensitive outcome telemetry: completion, error category, correction/rejection, time-to-action, and user feedback. |

## References

[1]: https://help.openai.com/en/articles/10169521-projects-in-chatgpt "Projects in ChatGPT"
[2]: https://chatgpt.com/features/deep-research/ "Deep research in ChatGPT"
[3]: https://www.ged.com/study/ged-mobile-app.html "GED & Me — The Official GED Mobile App"
[4]: https://www.clio.com/features/legal-ai-software/ "Legal AI software — Clio"
[5]: https://www.recidiviz.org/ai "How Recidiviz Uses AI"
[6]: https://www.recidiviz.org/security "Infrastructure & Security — Recidiviz"
[7]: https://www.valuemystuff.com/us/appraisal "Begin Your Appraisal — ValueMyStuff"
[8]: https://www.palantir.com/platforms/aip/ "Palantir Artificial Intelligence Platform"
[9]: https://www.nist.gov/itl/ai-risk-management-framework "AI Risk Management Framework — NIST"
[10]: https://airc.nist.gov/airmf-resources/playbook/ "NIST AI RMF Playbook"
[11]: https://www.nist.gov/privacy-framework "Privacy Framework — NIST"
[12]: https://www.w3.org/TR/WCAG22/ "Web Content Accessibility Guidelines (WCAG) 2.2 — W3C"
