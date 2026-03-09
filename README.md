# EUX Architecture Overview

This repository documents the architecture of the **EUX (EESSI) platform** — NAV's system for electronic exchange of social security information with EU/EEA countries. It serves as a starting point for developers and AI assistants working across the various EUX projects.

## What is EESSI?

**EESSI** (Electronic Exchange of Social Security Information) is the EU system for cross-border coordination of social security benefits. NAV's EUX platform enables Norwegian caseworkers to exchange **SEDs** (Structured Electronic Documents) with other EU/EEA countries through the **RINA** (Reference Implementation of a National Application) system. Cases are organized into **BUCs** (Business Use Cases), each defining which SEDs are exchanged for a given scenario (e.g. pension claim, family benefits).

## Applications

### Core Services

| Application | Tech | DB | Description |
|---|---|---|---|
| [eux-web-app](https://github.com/navikt/eux-web-app) | React / TypeScript / Node.js | — | Frontend for caseworkers. Node.js BFF proxies to eux-neessi with OAuth2 on-behalf-of. |
| [eux-neessi](https://github.com/navikt/eux-neessi) | Java / Spring Boot | — | Backend-for-frontend. Orchestrates calls to downstream eux-* services, PDL, Dokarkiv, SAF. |
| [eux-rina-api](https://github.com/navikt/eux-rina-api) | Java / Spring Boot | — | Middleware to the RINA CPI system. SED template rendering, PDF generation, case lifecycle. |
| [eux-nav-rinasak](https://github.com/navikt/eux-nav-rinasak) | Kotlin / Spring Boot | PostgreSQL | Links NAV fagsaker to RINA cases. Tracks SED journal status. |
| [eux-journal](https://github.com/navikt/eux-journal) | Kotlin / Spring Boot | PostgreSQL | Error-registration (feilregistrering) and finalization (ferdigstilling) of journal posts. |
| [eux-oppgave](https://github.com/navikt/eux-oppgave) | Kotlin / Spring Boot | PostgreSQL | Integration layer to NAV Oppgave (task system). Creates/updates/finishes tasks. |
| [eux-saksbehandler](https://github.com/navikt/eux-saksbehandler) | Kotlin / Spring Boot | PostgreSQL | Stores caseworker preferences (e.g. favorite unit). Called by eux-neessi. |
| [eux-rina-terminator-api](https://github.com/navikt/eux-rina-terminator-api) | Kotlin / Spring Boot | — | REST API for closing, archiving, and deleting RINA cases. Calls RINA CPI directly. |
| [eux-rina-case-search](https://github.com/navikt/eux-rina-case-search) | Java / Spring Boot | PostgreSQL | Searchable index of RINA cases. Built from Kafka events, exposes REST search API. |

### Event Infrastructure

| Application | Tech | Description |
|---|---|---|
| [eux-all-rina-events](https://github.com/navikt/eux-all-rina-events) | Java / Spring Boot | Receives NIE events from RINA via HTTP POST. Publishes to three Kafka topics: `eux-rina-case-events-v1`, `eux-rina-document-events-v1`, `eux-rina-notification-events-v1`. |
| [eux-legacy-rina-events](https://github.com/navikt/eux-legacy-rina-events) | Java / Spring Boot | Backward-compatibility bridge. Consumes `eux-rina-document-events-v1` and converts to legacy Kafka format on topics `sedmottatt-v1` / `sedsendt-v1`. |

### Background Workers

| Application | Tech | DB | Description |
|---|---|---|---|
| [eux-journalfoering](https://github.com/navikt/eux-journalfoering) | Java / Spring Boot | — | Consumes `sedmottatt-v1` / `sedsendt-v1` from Kafka. Auto-journals SEDs by calling Dokarkiv, PDL, eux-nav-rinasak, eux-oppgave. |
| [eux-journalarkivar](https://github.com/navikt/eux-journalarkivar) | Kotlin / Spring Boot | — | Orchestrates journal post finalization and error-registration. Calls eux-journal, eux-nav-rinasak, eux-oppgave, eux-rina-api, SAF, Dokarkiv. Triggered by NAIS jobs. |
| [eux-avslutt-rinasaker](https://github.com/navikt/eux-avslutt-rinasaker) | Kotlin / Spring Boot | PostgreSQL | Manages RINA case closure/archival lifecycle (state machine). Consumes case and document events from Kafka. Calls eux-rina-terminator-api. Triggered by NAIS jobs. |
| [eux-slett-usendte-rinasaker](https://github.com/navikt/eux-slett-usendte-rinasaker) | Kotlin / Spring Boot | PostgreSQL | Deletes RINA cases that never received a SED. Consumes case/document events from Kafka. Calls eux-rina-terminator-api. Triggered by NAIS jobs. |
| [eux-adresse-oppdatering](https://github.com/navikt/eux-adresse-oppdatering) | Kotlin / Spring Boot | — | Consumes `eux-rina-document-events-v1` from Kafka. Updates addresses in PDL when address data is found in incoming SEDs. |
| [eux-barnetrygd](https://github.com/navikt/eux-barnetrygd) | Java / Spring Boot | — | Scheduled worker for annual child benefit (barnetrygd) case renewal. Calls eux-oppgave, eux-rina-api, eux-nav-rinasak, PDL, SAF. |

### NAIS Jobs (Scheduled Triggers)

These are Kubernetes CronJobs that call REST endpoints on the corresponding services. They contain no business logic themselves.

| Application | Triggers | Schedule |
|---|---|---|
| [eux-avslutt-rinasaker-naisjob](https://github.com/navikt/eux-avslutt-rinasaker-naisjob) | eux-avslutt-rinasaker | Multiple jobs: arkiver (daily 05:00), sett-uvirksom, til-avslutning, slett-dokumentutkast, avslutt |
| [eux-journalarkivar-naisjob](https://github.com/navikt/eux-journalarkivar-naisjob) | eux-journalarkivar | ferdigstill (daily 01:00), feilregistrer (daily 02:00) |
| [eux-slett-usendte-rinasaker-naisjob](https://github.com/navikt/eux-slett-usendte-rinasaker-naisjob) | eux-slett-usendte-rinasaker | slett (daily 01:00), til-sletting (daily 02:00), rapport (monthly 1st 06:00) |

### Libraries & Build Tools

These are not deployed applications. They are dependencies used at build time or runtime by the services above.

| Application | Type | Description |
|---|---|---|
| [eux-parent-pom](https://github.com/navikt/eux-parent-pom) | Maven parent POM | Manages shared dependency versions: Spring Boot 4.0.3, Kotlin 2.2.x, Java 21, token-validation, PostgreSQL driver, test libraries, etc. |
| [eux-logging](https://github.com/navikt/eux-logging) | Kotlin library (JAR) | MDC filter for request ID tracking (`x_request_id`) and EUX-specific logging context (rinasakId, sedId, sedType, etc.). |
| [eux-versions-maven-plugin](https://github.com/navikt/eux-versions-maven-plugin) | Maven plugin | Auto-increments patch versions from Git tags. Used in CI/CD pipelines (`mvn eux-versions:set-next`). |

## Architecture Diagram

```
                           ┌─────────────────┐
                           │   Caseworker     │
                           │   (Browser)      │
                           └────────┬─────────┘
                                    │
                           ┌────────▼─────────┐
                           │  eux-web-app     │  React frontend + Node.js BFF
                           └────────┬─────────┘
                                    │
                           ┌────────▼─────────┐
                           │  eux-neessi      │  Main backend / orchestrator
                           └──┬──┬──┬──┬──┬───┘
                              │  │  │  │  │
            ┌─────────────────┘  │  │  │  └──────────────────┐
            │         ┌──────────┘  │  └──────────┐          │
            ▼         ▼            ▼              ▼          ▼
    ┌────────────┐┌────────────┐┌────────────┐┌────────────┐┌────────────┐
    │eux-rina-api││eux-nav-    ││eux-journal ││eux-oppgave ││eux-saks-   │
    │            ││rinasak     ││            ││            ││behandler   │
    │Middleware  ││Case linking││Journal mgmt││Task mgmt   ││Preferences │
    └─────┬──────┘└─────┬──────┘└──┬─────────┘└─────┬──────┘└─────┬──────┘
          │          [Postgres]    │              [Postgres]    [Postgres]
          ▼                       ▼                  ▼
   ┌────────────┐          ┌────────────┐     ┌────────────┐
   │  RINA CPI  │          │ Dokarkiv   │     │NAV Oppgave │
   └──────┬─────┘          │ / SAF      │     └────────────┘
          │                └────────────┘
          │
 ═══════════════════════ EVENT FLOW ═══════════════════════

   RINA CPI ──NIE events──▶ eux-all-rina-events
                                    │
                        publishes to 3 Kafka topics:
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
             case-events    document-events   notification-events
                    │               │
                    │     ┌─────────┼──────────┬──────────┐
                    │     ▼         ▼          ▼          ▼
                    │  eux-legacy  eux-adresse eux-slett  eux-avslutt
                    │  -rina-     -oppdatering -usendte  -rinasaker
                    │  events                  -rinasaker
                    │     │
                    │     ▼ converts to legacy format
                    │  sedmottatt-v1 / sedsendt-v1
                    │     │
                    │     ▼
                    │  eux-journalfoering
                    │
                    └──▶ eux-rina-case-search
```

## How the Apps Talk to Each Other

### Request Flow (user-initiated)

1. **eux-web-app** → The caseworker opens the app. The Node.js BFF handles Azure AD login (via Wonderwall sidecar) and proxies `/api`, `/v2`–`/v5` requests to **eux-neessi** using OAuth2 on-behalf-of tokens.

2. **eux-neessi** → Orchestrates downstream calls:
   - **eux-rina-api** — RINA/SED operations (create case, fetch/send SED, generate PDF)
   - **eux-nav-rinasak** — link/search NAV fagsaker with RINA cases, track SED journal status
   - **eux-journal** — error-register or finalize journal posts
   - **eux-oppgave** — create/update tasks in NAV Oppgave
   - **eux-saksbehandler** — read/update caseworker preferences
   - **Dokarkiv / SAF** — create and query journal posts directly
   - **PDL** — person data lookups (GraphQL)

3. **eux-rina-api** → Translates between NAV's domain and RINA CPI (the EU infrastructure). Handles SED template rendering, PDF generation, and case lifecycle.

### Event Flow

1. When something happens in RINA (new case, document sent/received, etc.), RINA sends an NIE event via HTTP to **eux-all-rina-events**.

2. **eux-all-rina-events** publishes to three Kafka topics:
   - `eux-rina-case-events-v1` — case lifecycle events
   - `eux-rina-document-events-v1` — document events
   - `eux-rina-notification-events-v1` — notifications

3. **eux-legacy-rina-events** converts document events to the legacy format on `sedmottatt-v1` / `sedsendt-v1` (consumed by eux-journalfoering and external systems like eessi-pensjon).

4. Multiple services consume these events:
   - **eux-journalfoering** — auto-journals SEDs (via the legacy topics)
   - **eux-adresse-oppdatering** — updates addresses in PDL from incoming SEDs
   - **eux-rina-case-search** — maintains a searchable case index
   - **eux-avslutt-rinasaker** — tracks case lifecycle for closure
   - **eux-slett-usendte-rinasaker** — tracks cases to detect orphans

### Scheduled Processes

Several cleanup and maintenance tasks run on cron schedules via NAIS jobs:

- **Journal archival** — eux-journalarkivar finalizes and error-registers journal posts (daily)
- **Case closure** — eux-avslutt-rinasaker closes, archives, and cleans up inactive RINA cases
- **Orphan deletion** — eux-slett-usendte-rinasaker deletes cases that never received a SED
- **Child benefit renewal** — eux-barnetrygd renews child benefit cases annually

## External NAV Systems

| System | Purpose | Access Pattern |
|---|---|---|
| **RINA CPI** | EU case management system | REST via eux-rina-api (shared-secret JWT) and eux-rina-terminator-api (service user credentials) |
| **PDL** | Person data (Folkeregisteret) | GraphQL (Azure AD) |
| **PDL-Mottak** | Write updates to PDL | REST (Azure AD), used by eux-adresse-oppdatering |
| **Dokarkiv** | Create/update journal posts | REST (Azure AD) |
| **SAF** | Query journal posts and documents | GraphQL (Azure AD) |
| **NAV Oppgave** | Task management | REST (Azure AD) via eux-oppgave |
| **NORG2** | NAV organizational units | REST (no auth) |
| **Aa-registeret** | Employment data | REST (Azure AD) via eux-neessi |
| **A-Inntekt** | Income data | REST (Azure AD) via eux-neessi |

## Common Patterns

- **Authentication**: All deployed services use **Azure AD** for service-to-service auth (OAuth2 client credentials / on-behalf-of). The frontend uses Azure AD via the **Wonderwall** sidecar. Exceptions: eux-rina-api uses a shared-secret JWT to RINA CPI; eux-rina-terminator-api and eux-rina-case-search use service user credentials (CAS tickets) to RINA CPI.
- **NAIS deployment**: All apps and jobs deploy to **NAIS** (NAV's Kubernetes platform) on GCP.
- **Health/metrics**: All JVM services expose `/actuator/health` and `/actuator/prometheus`. The frontend (eux-web-app) uses `/internal/isAlive` and `/internal/isReady` instead. NAIS jobs do not expose health endpoints.
- **Parent POM**: Most Kotlin/Java services inherit from **eux-parent-pom**, which pins Spring Boot, Kotlin, and shared dependency versions.
- **Structured logging**: Services that depend on **eux-logging** get MDC-based request tracing with fields like `rinasakId`, `sedId`, `sedType`.

### Patterns that vary by project

| Pattern | Applies to | Notes |
|---|---|---|
| **PostgreSQL (Cloud SQL)** | eux-nav-rinasak, eux-journal, eux-oppgave, eux-saksbehandler, eux-rina-case-search, eux-avslutt-rinasaker, eux-slett-usendte-rinasaker | The remaining services are stateless. |
| **Flyway migrations** | Same as PostgreSQL list above | Follows from having a database. |
| **OpenAPI code generation** | eux-nav-rinasak, eux-journal, eux-oppgave, eux-saksbehandler, eux-avslutt-rinasaker, eux-slett-usendte-rinasaker | Generate controllers/models from an OpenAPI spec. Other services wire endpoints manually. |
| **Multi-module Maven** | Most JVM services | Split into `-openapi`, `-model`, `-persistence`, `-service`, `-integration`, `-webapp` — but not every service has all modules. NAIS jobs and smaller services are single-module. |
| **Kafka consumer** | eux-journalfoering, eux-adresse-oppdatering, eux-avslutt-rinasaker, eux-slett-usendte-rinasaker, eux-rina-case-search, eux-legacy-rina-events | Each consumes different topics (see Event Flow). |
| **Kafka producer** | eux-all-rina-events | The only service that publishes to Kafka. eux-legacy-rina-events also publishes (converts and re-publishes). |
| **GraphQL clients** | eux-neessi, eux-journalfoering, eux-journal, eux-rina-api, eux-barnetrygd, eux-adresse-oppdatering | Used to call PDL and/or SAF. Others use REST only. |
| **Caffeine caching** | eux-neessi, eux-journalfoering, eux-rina-api, eux-rina-terminator-api | In-memory caching for lookups. |
| **Spring Retry / Resilience4j** | eux-neessi (Resilience4j), eux-oppgave (Spring Retry), eux-rina-case-search (custom retry) | Explicit retry logic for flaky downstream calls. |

## Pitfalls and Things to Watch Out For

### Cross-service dependencies
The services form a deep call chain (`web-app → neessi → rina-api → RINA CPI`). A timeout or failure in RINA CPI cascades back through the entire stack. Be mindful of timeout settings at each layer.

### Event pipeline ordering
Events flow through a chain: `RINA → eux-all-rina-events → Kafka → eux-legacy-rina-events → Kafka → eux-journalfoering`. If any link in this chain is down, downstream processing stops. Monitor consumer lag on all topics.

### Kafka consumer behavior
Several consumers use manual commits with limited poll sizes. If processing fails repeatedly, consumers can get stuck on a single message. eux-adresse-oppdatering retries 3 times then sends to DLT (Dead Letter Topic); others may behave differently.

### Journal status tracking
SED journal status is tracked in **eux-nav-rinasak**, but the actual journal post lives in **Dokarkiv**. These can get out of sync if error-registration or re-journaling happens outside the normal flow. The eux-journalarkivar service tries to reconcile this.

### Database connection pools
Services with PostgreSQL typically use very small connection pools (max 2 connections, min 1 idle). This is intentional for NAIS but means long-running queries can block other requests.

### RINA CPI authentication differences
Different services authenticate to RINA CPI in different ways: eux-rina-api uses a shared-secret JWT, eux-rina-terminator-api uses service user credentials, and eux-rina-case-search uses CAS tickets. These credentials are managed separately.

### NAIS job scheduling
Some NAIS jobs have schedules that effectively disable them (e.g. `0 0 31 2 *` = Feb 31st, which never occurs). This is intentional — those processes are enabled per environment. Check the environment-specific YAML files, not just the base template.

### FSS vs GCP split
Some external NAV services (Dokarkiv, SAF, NAV Oppgave) are still accessed via FSS public endpoints (`*.prod-fss-pub.nais.io`), which adds latency vs in-cluster calls.

### Azure AD group sprawl
Access control uses 15+ Azure AD groups mapped to different benefit areas (pension, sickness, unemployment, etc.). Misconfigured group membership is a common source of access issues.

### eux-rina-api: ACL is NOT access control
The "ACL" in eux-rina-api (`EessiAcl.java`) is the SED format **transformation layer** — it converts SEDs between NAV's internal format and the EU format using code mappings and templates. If a code mapping lookup fails, the value is silently mapped to an **empty string** and logged as a warning. This means data can be lost without any error being raised.

### eux-rina-api: CPI session cache expires at 29 minutes
The CPI session cache (`CPI_SESSION_CACHE`) is configured to expire after 29 minutes, while RINA CPI sessions time out after 30 minutes. Long-running operations (large SED transforms, attachment polling) can hit auth failures if they start near the end of a cache window. There is no automatic session refresh — the entire 3-step auth (JWT → CAS ticket → JSESSIONID) must be repeated.

### eux-rina-api: Action-checking race condition
Before creating, updating, or sending a SED, eux-rina-api fetches available actions from RINA (`hentMuligeActions()`). However, there is no lock or re-validation — the RINA case state can change between the action check and the actual operation, causing 409 Conflict errors. Callers should be prepared to retry on 409.

### eux-rina-api: 404 on missing actions is misleading
When a document has no available actions, eux-rina-api returns **404 Not Found** rather than a more semantic response. Callers must distinguish between "document not found" and "document exists but no actions available" — both return 404.

### eux-rina-api: Polling throws 504, not null
When attachment polling (1-second intervals, 2-minute timeout) exceeds the timeout, eux-rina-api throws `504 Gateway Timeout` as an exception rather than returning null or an empty response. Callers must catch this as an expected outcome, not treat it as a server error.

### eux-rina-api: Attachment limits and validation
Attachment file size is capped at 100 MB, but Spring's multipart limits are set to **unlimited** (`max-file-size: -1`). The only real enforcement is in `CpiAttachmentService`. File type validation is extension-based only (PDF, JPEG, TIFF, PNG) — MIME type and magic bytes are not checked. RINA typically takes 12–15 seconds to process an uploaded attachment.

### eux-rina-api: Filename path separator workaround
RINA interprets `/` and `\` in attachment filenames as directory paths. The code works around this by replacing them with Unicode fullwidth equivalents (`\uFF0F` and `\uFF3C`). Filenames that naturally contain these Unicode characters will be corrupted.

### eux-rina-api: SED template versioning
SED templates are loaded from the classpath (`/sedtemplates/v*/*/`). The template must match both `sedGVer` (generation version) and `sedVer` (version). If no matching template is found, the transform fails with `SED_LACKING_TEMPLATE`. Deprecated methods that auto-detect versions are still present but unreliable — always specify the version explicitly.

### eux-rina-api: PDF generation is split
Most SED types use internal PDF generation via iText. However, SED types **U020** and **U029** are handled by the external `eux-pdf` service instead. This split is easy to miss and means PDF generation for those types has a different failure mode and dependency chain.

### eux-rina-api: Retry logic is hardcoded
Retry for `ResourceAccessException` (transient CPI connection failures) uses hardcoded values: 10 attempts at 1-second intervals. These are not configurable via properties. Additionally, retries only happen on specific code paths — some methods silently fail on the first attempt.
