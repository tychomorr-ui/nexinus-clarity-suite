# XinUS Clarity Suite Modernization Map

## Application Structure

The modernized application will consolidate the original multi-artifact suite into one protected **XinUS Clarity Suite** workspace. It will retain the original surface names as navigation labels, but route them through one authenticated dashboard shell. The existing dashboard foundation will be adapted rather than reimplemented: it already provides responsive collapsing navigation, a protected gate, a mobile trigger, and profile controls.

| New route | Original source boundary | Protected page responsibility |
|---|---|---|
| `/` | XinUS core Home | Core Clarity conversation and mode selection. |
| `/ged-tutor` | `xinus-ged/Tutor` | Subject-specific GED Tutor. |
| `/hidden-gems` | `xinus-hidden-gems/Gems` | Photo-based structured appraisal. |
| `/pd-pro` | PD Pro Home, Client Mode, PD Mode | Client reflective loop and PD case workspace. |
| `/pd-pro/office` | PD Pro Office | Executive-assistant drafting workspace. |
| `/recidivism` | Subject/Anchor dashboards | Role-aware risk, obligation, and support workspace. |
| `/recidivism/triggers`, `/patterns`, `/obligations`, `/geofences`, `/contacts` | Matching Recidivism pages | Dedicated operational records and views. |
| `/recidivism/subjects/:id` and `/recidivism/reports/:id` | Profile and Report | Subject profile and printable report. |
| `/sitrep` | `xinus-sitrep/SitRep` | General, travel, and immigration assessment. |
| `/wraith` | Shared Wraith overlay | Voice-first assistant workspace with persona controls. |
| `/account` | XinUS Account | Manus-authenticated profile, suite usage, and security context. |
| `/admin` | XinUS Admin and Admin Terminal | Owner-restricted audit, command history, and safe command console. |

The public-facing Landing and Why information becomes an authenticated suite overview instead of a separate unauthenticated experience, because the stated rebuild requirement places all suite features behind protected routes. Unknown historical routes will redirect to their new consolidated equivalent where a direct mapping exists.

## Server and AI Workflow Map

| Original workflow | New typed server domain | Key preservation rules |
|---|---|---|
| Clarity engine | `clarity.run`, `clarity.listTurns`, `clarity.resetSession` | Preserve deterministic Transcend classification, DXNS state/resistance math, named modes, owner-only Omni guard, bounded history, and attachment limits. |
| GED Tutor | `ged.listSessions`, `ged.createSession`, `ged.sendTurn` | Preserve four subject labels, reflective tutoring method, short responses, bounded history, reset, and explicit error states. |
| Hidden Gems | `gems.createAppraisal`, `gems.listAppraisals` | Persist only S3 image references, retain structured appraisal/coin detail result shape, size/type validation, quota/credit decisions, and warning states. |
| PD Pro | `pd.getWorkspace`, `pd.processEvent`, `pd.case.*`, `pd.officeAssist` | Preserve the one mutation path for Client/PD/Emergency transitions and note-to-task/deadline extraction. |
| Recidivism | `recidivism.subject.*`, `recidivism.trigger.*`, `recidivism.obligation.*`, `recidivism.contact.*`, `recidivism.geofence.*`, `recidivism.report` | Preserve Subject/Anchor terminology, workflow entities, status updates, alert concepts, and role-specific views. |
| SitRep | `sitrep.assess`, `sitrep.listAssessments` | Preserve General, Travel, Immigration modes, structured headings, persisted latest result, and legal-information notice in Immigration mode. |
| Wraith | `wraith.converse`, `wraith.listTurns` | Preserve persona naming/tone/intensity controls, voice-first output, bounded history, module-guidance context, and safe fallback. |
| Billing/XC | `usage.getSummary`, `credits.getLedger` | Preserve Core/Plus tier model, weekly quota accounting, and append-only XC ledger. Payment activation remains isolated pending payment-provider configuration. |
| Owner administration | `admin.getAudit`, `admin.listTerminalCommands`, `admin.runTerminal` | Preserve role restriction, confirmation before mutating commands, audit trail, and the corrected outcome representation. |

All AI calls will remain server-side and use the provisioned helper. Structured outputs, notably Hidden Gems, will use a strict schema and defensive parse path. For initial refactoring, mutations return the completed response through tRPC while the client renders explicit busy, success, cancellation, and error states. This changes the underlying transport from raw SSE to typed RPC while preserving the user-facing workflow and data contracts.

## MySQL/Drizzle Migration Model

The scaffold’s OAuth `users` table remains the identity source of truth. Original password/session entities are represented by the provided managed identity layer rather than re-creating a parallel credential store. The following application tables preserve the original business records while using MySQL integer primary keys and user-scoped foreign keys.

| New table group | Tables | Original entities represented |
|---|---|---|
| Account and governance | `user_profiles`, `auth_audit_events`, `terminal_commands` | Subscription/tier metadata, auth event record, owner terminal audit. |
| Conversation and AI sessions | `conversations`, `conversation_messages`, `clarity_sessions`, `clarity_trace_points`, `mode_usage`, `credit_ledger` | Conversations, messages, DXNS state/trace, weekly usage, XC ledger. |
| Tutor, Gems, and SitRep | `ged_sessions`, `ged_turns`, `gem_appraisals`, `sitrep_assessments` | Original tutor history, structured appraisal/coin output, persisted situation reports. |
| PD Pro | `pd_workspaces`, `pd_cases`, `pd_case_notes`, `pd_case_tasks`, `pd_case_deadlines` | Client/PD/Emergency state and case workspace entities. |
| Recidivism | `recidivism_subjects`, `recidivism_subject_memberships`, `recidivism_triggers`, `recidivism_obligations`, `recidivism_contacts`, `recidivism_geofences`, `recidivism_alerts` | Subject, Anchor, and all supervision-workspace records. |

All datetime values will be stored as UTC timestamps. Images will be stored in S3 and referenced by key/URL metadata, never embedded in database BLOB columns. The migration will create tables in parent-to-child order and only use non-destructive operations.

## Authorization and User Experience Rules

All named feature routes require Manus authentication. Each server procedure checks the authenticated user before accessing user-owned data. The Recidivism area adds explicit membership/role checks for Anchor and Subject views. The administration area requires the existing `admin` user role; safe terminal command execution additionally requires explicit confirmation for state-changing commands.

The design system will use a slate-black base, warm parchment text, and restrained orchid, amber, and mint accents to represent Clarity, active actions, and verified progress. Typography will pair a clean UI sans with a literary display face for insight and report content. Every data surface will include a loading skeleton, no-data treatment, an actionable failure state, and mobile layouts that retain navigation and primary actions without horizontal scrolling.
