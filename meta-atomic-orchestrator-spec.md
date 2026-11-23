# XinUS Meta-Atomic Proactive Orchestrator Specification

## 1. Executive Summary
This specification defines the next evolutionary tier of the XinUS Clarity Suite: transforming the reactive AI-first Streamline layer into a local-first **Proactive Orchestrator**. Designed for practitioners handling 100+ caseloads and clients, this architecture bridges siloed standalone applications, synthesizes multi-evidence files, provides local semantic search, enables bulk-action workflows, and runs proactive compliance preflight checks—all while strictly adhering to the local Ollama inference policy and human-in-the-loop review boundaries.

---

## 2. Core Modules & Architectural Components

### A. Cross-App State Synchronization ("The Common Thread")
- **Master Controller**: PAM (Personal Action Manager) acts as the cross-product aggregator.
- **State Bridge**: Securely queries authorized open questions, pending decisions, and active review packets across Clarity, GED Tutor, Hidden Gems, PD Pro, Recovery, Task Force Pro, SitRep, and PAM based on user consent settings.
- **Unified Briefing**: Synthesizes active items into a single executive dashboard briefing without leaking restricted client details across product boundaries.

### B. Autonomous Multi-Evidence Synthesis & Contradiction Detection
- **Multi-Image & Document Cross-Referencing**: Enhances Hidden Gems and PD Pro intake by comparing two or more uploaded documents or photos within the same case file.
- **Contradiction Flagging**: Automatically flags conflicting dates, appraisal provenance claims, or witness testimony discrepancies and surfaces them directly in the SitRep review panel for human analysis.

### C. Local-First Semantic Search ("Deep Search Indexing")
- **Embedding & Storage**: Utilizes lightweight local vector embeddings stored in MariaDB (or indexed JSON/text structures) for archived case records, notes, and study blocks.
- **Zero-Cloud Retrieval**: Enables sub-second semantic queries ("Find all precedents regarding search warrant radius") without transmitting plaintext records to external cloud APIs.

### D. Bulk-Action Logic Engine & Batch Processing
- **Queue Approval**: Allows practitioners to select multiple approved Streamline follow-through items or case notes simultaneously.
- **Batch Export**: Instantly compiles selections into a structured **Final Case Resolution PDF** or a clean JSON/CSV package upon a single master-approval event, drastically reducing interaction fatigue.

### E. Proactive Compliance & Safety Preflight
- **Deterministic Guardrails**: Background middleware inspects intake text and proposed actions in Recovery and Task Force Pro before final persistence.
- **Intervention Prompts**: If an entry triggers privacy, automated risk-scoring, or safety boundaries, the system halts execution and displays an immediate advisory prompt, preventing accidental policy overrides.

---

## 3. Reusable Pattern Definition (Skill Standard)
The Streamline pattern will be formalized as a reusable skill module (`/home/ubuntu/skills/xinus-streamline-orchestrator/SKILL.md`) enabling any future standalone XinUS application to inherit intake parsing, structured summarization, local AI routing, and human-review gating instantly.
