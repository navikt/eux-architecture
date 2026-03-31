This is a documentation-only repository. It contains no application code, no tests, and no build system.
Its purpose is to document the architecture of the EUX/EESSI platform at NAV (team eessibasis).

## Key context

Read README.md before making any changes — it is the single source of truth for the EUX architecture.

## Domain terminology (official EU definitions)

- **EESSI**: Electronic Exchange of Social Security Information
- **SED**: Structured Electronic Document (NOT "Structured European Document")
- **RINA**: Reference Implementation of a National Application (NOT "Records, Information and Notification Application")
- **BUC**: Business Use Case
- **CPI**: Case Processing Interface (RINA's REST API)
- **NIE**: National Interface Endpoint (how RINA pushes events to national systems)
- **PDL**: Persondataløsningen (NAV's person data service)
- **SAF**: Sak- og Arkivfunksjonalitet (document archive query service)
- **Dokarkiv**: Document archive write API
- **NAIS**: NAV's Kubernetes platform on GCP
- **Fagsak**: A case in a NAV benefit system (e.g. pension, sickness)
- **Journalpost**: A registered document entry in Dokarkiv
- **Oppgave**: A task/work item in NAV's task management system
- **Saksbehandler**: Caseworker / case handler

## Writing guidelines

- Be concise. This document is read by both humans and AI assistants.
- Be precise about which services a statement applies to. Never say "all services do X" unless it is actually true for every single one.
- When describing patterns, always list the specific applications that use that pattern.
- Verify EU/EESSI terminology against official European Commission sources before introducing new terms.
- Keep the architecture diagram in sync with the application tables.
- Do not include specific version numbers for dependencies (e.g. "Spring Boot 4.0.3") — these change frequently. Use "Spring Boot" or link to eux-parent-pom instead. The exception is the eux-parent-pom entry itself, where the current version is useful context.
- Do not add information you cannot verify from the actual source repositories. When in doubt, check the repo.

## Repository structure

- `README.md` — The architecture document. This is the main deliverable.
- `.github/copilot-instructions.md` — This file. Instructions for AI assistants.
- `.github/agents/eux-java-dev.agent.md` — Copilot agent for Java EUX projects.
- `.github/agents/eux-kotlin-dev.agent.md` — Copilot agent for Kotlin EUX projects.
- `.github/agents/eux-full-stack-dev.agent.md` — Copilot agent for full-stack EUX work (React + Java/Kotlin).
- `.github/skills/update-java-dev/` — Skill to sync Java agent with current repo state.
- `.github/skills/update-kotlin-dev/` — Skill to sync Kotlin agent with current repo state.
- `.github/skills/update-full-stack-dev/` — Skill to sync full-stack agent with current repo state.
- `.github/skills/jira-ten/` — Skill for interacting with JIRA issues in the TEN project via acli.
- `.github/skills/odin-jira/` — Skill that analyzes a TEN JIRA issue, implements fixes across EUX repos, creates PRs, and reports back to JIRA.
- `.github/skills/odin-plan/` — Skill that analyzes a TEN JIRA issue and posts an implementation plan as a JIRA comment. Planning only — no code changes.
- `install-agents.sh` — Creates symlinks from `~/.copilot/agents/` to the agent files above.

## EUX platform overview

The platform consists of ~24 repositories under github.com/navikt/, all in the eessibasis team/namespace:

**Core services**: eux-web-app (React frontend), eux-neessi (BFF/orchestrator), eux-rina-api (RINA middleware),
eux-nav-rinasak, eux-journal, eux-oppgave, eux-saksbehandler (all Kotlin/Spring Boot with PostgreSQL),
eux-rina-terminator-api (case termination), eux-rina-case-search (search index).

**Event infrastructure**: eux-all-rina-events (RINA → Kafka), eux-legacy-rina-events (format bridge).

**Background workers**: eux-journalfoering (auto-journaling), eux-journalarkivar (journal cleanup),
eux-avslutt-rinasaker (case closure), eux-slett-usendte-rinasaker (orphan deletion),
eux-adresse-oppdatering (address sync), eux-person-oppdatering (foreign ID sync to PDL),
eux-barnetrygd (child benefit renewal).

**NAIS jobs**: eux-avslutt-rinasaker-naisjob, eux-journalarkivar-naisjob, eux-slett-usendte-rinasaker-naisjob.
These are cron triggers with no business logic — they just call REST endpoints on the corresponding services.

**Libraries/tools**: eux-parent-pom (Maven parent), eux-logging (MDC library), eux-versions-maven-plugin (version bumping).

## Common tech stack

- Backend services use Kotlin or Java with Spring Boot, deployed on NAIS (GCP).
- Authentication is Azure AD (OAuth2) for service-to-service calls, except RINA CPI which uses shared-secret JWT, service user credentials, or CAS tickets depending on the calling service.
- Services with a database use PostgreSQL via GCP Cloud SQL with Flyway migrations.
- The frontend (eux-web-app) is React/TypeScript with a Node.js BFF.
