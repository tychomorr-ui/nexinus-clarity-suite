# XinUS WCAG 2.2 Validation Baseline

This baseline records the accessibility checks applied to the non-Bedrock meta-upgrade. It is a product-engineering review record, not a formal third-party conformance certification.

| Criterion area | XinUS implementation check | Status |
| --- | --- | --- |
| Keyboard focus | Interactive links, buttons, inputs, textareas, selects, and custom button roles receive a visible high-contrast `:focus-visible` outline with an offset. | Implemented and type/build validated. |
| Touch targets | Mode controls have a 40px minimum height to support pointer and touch input. | Implemented and browser-reviewed on the public/mobile and product-workspace surfaces. |
| Motion | A `prefers-reduced-motion: reduce` rule suppresses non-essential animation and smooth scrolling. | Implemented and build validated. |
| Status messaging | Updated query/mutation states use loading indicators, `role="alert"` for errors, clear empty states, and a shared recovery boundary that does not expose runtime stack traces. | Implemented and workflow/browser reviewed. |
| Contrast and readability | The dark atmospheric system uses high-contrast primary copy, clear muted-copy hierarchy, and readable focus indication; the light-theme toggle was exercised with the temporary validation account. | Browser reviewed; retain periodic manual contrast checks as copy changes. |
| Error recovery | The global boundary offers reload and return-to-apps actions while stating that private records were not changed. | Implemented, type/build validated, and deployed. |

## Remaining assurance boundary

Sensitive workflows are already local-provider-only where restricted data is involved and do not route to a cloud provider. A **user-persisted, server-enforced “disable AI assistance” preference** for sensitive products remains a separate queued implementation. It must block the relevant server mutation, not merely hide a client control, before it can be represented as complete.
