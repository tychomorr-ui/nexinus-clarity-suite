# XinUS Workflow Verification Matrix

The XinUS client currently exposes **45 typed query or mutation surfaces**. The matrix below groups them by protected product domain and requires an equivalent loading, empty, success, and recoverable-error contract. Shared fallback states are implemented through query-state UI, product workboard local fallback, the safe global error boundary, and the new Streamline review gate.

| Domain | Surfaces covered | Required recovery contract |
| --- | --- | --- |
| Identity and dashboard | Private account, dashboard overview, product catalog/access/context | Sign-in recovery, loading state, alert on unavailable profile data, no cross-account data. |
| Billing and credits | Billing status, product checkout, credits summary | Clear entitlement state, non-silent checkout failure, no payment completion without Stripe confirmation. |
| Clarity and PAM | Reflection history/run; PAM history/converse | Private history state, local-model retry, explicit uncertainty and next move. |
| GED Tutor | Sessions, send turn, recommendation, research | Subject-specific loading, plain-math rendering, verified-source fallback, learner-visible next practice. |
| Hidden Gems | Appraisal/list | Camera/upload handoff, private persistence, local-vision retry, evidence and uncertainty labels. |
| PD Pro | Workspace, create case, notes, mode, task, office assist, case report | Protected workspace states, case-bound authorization, review-before-export, PDF error recovery. |
| Recovery and Task Force Pro | Subject, trigger, obligation, contact, geofence and alert procedures | Product guard, local-only sensitive workflow policy, human review before follow-through. |
| SitRep | Assessment/list | Unknowns, options, explicit human review, safe retry. |
| Shared Streamline | Draft, accept, queue, work create/list/status | Local AI draft, explicit review confirmation, user-owned queue, sensitive cross-product exclusion by default. |

> **Release criterion:** A state is not considered complete merely because it compiles. It must avoid raw upstream output, preserve the user’s unsaved input where possible, distinguish an empty result from an unavailable service, and require review before any consequential follow-through is stored.
