# XinUS Clarity Suite Archive Inventory

The supplied archive is a TypeScript monorepo with a principal XinUS application, five dedicated product surfaces, a shared API server, a Drizzle/PostgreSQL database package, a shared streaming protocol, and a separate Solidity token project. The web rebuild scope is the suite of browser-facing product surfaces and their shared server-side workflows; the Solidity project is retained as a source artifact and is not part of the managed web runtime.

| Original artifact | Verified pages or modules | Intended rebuild area |
|---|---|---|
| `xinus` | Landing, Why, Home, Hologram, Anywhere, Account, Sign In, Admin, Admin Terminal, Engineering | Core XinUS Clarity Suite |
| `xinus-ged` | Tutor | GED Tutor |
| `xinus-hidden-gems` | Gems | Hidden Gems appraisal |
| `xinus-pd-pro` | Home, Client Mode, PD Mode, Office, Settings | XinUS PD Pro |
| `xinus-recidivism` | Subject and Anchor dashboards, triggers, patterns, obligations, geofences, contacts, profile, report, console | Recidivism workspace |
| `xinus-sitrep` | SitRep | Situation assessment |

The original API server exposes guarded workflows for clarity analysis, GED tutoring, Hidden Gems appraisal, PD Pro office assistance, SitRep assessment, Wraith conversation, authentication, billing and credits, owner audit functions, and the owner terminal. The core clarity engine includes deterministic `transcend` classification, adaptive DXNS session state, a streaming response contract, attachment handling, mode-level access rules, and a bounded in-memory conversation history.

| Original database model | Verified purpose |
|---|---|
| `users` | Identity, billing tier, Stripe subscription state, and timestamps |
| `sessions` | Server-issued session records and expiry |
| `auth_events` | Authentication audit trail |
| `terminal_commands` | Owner terminal audit trail |
| `conversations` and `messages` | Stored conversation metadata and message history |
| `credit_ledger` | Per-user credit movements |
| `mode_usage` | Per-user, per-mode, weekly usage limits |

The reviewed tall source reference is an operational instruction screenshot for modifying a prior clarity-engine implementation. It confirms the archive includes iterative development material but does not define the product visual system. The modern rebuild will draw its UI structure and terminology from the original application source, while the new design system will supply the requested polished presentation.
