# EUX Architecture Overview

This repository documents the architecture of the **EUX (EESSI) platform**, NAV's system for electronic exchange of social security information with EU/EEA countries. It is a starting point for developers and AI assistants working across the EUX repositories.

**Interactive architecture map:** <https://eux-docs.intern.dev.nav.no/architecture> (the *EUX Architecture Portal*, built from `portal/` and `portal-core/` in this repo).

## What is EESSI?

**EESSI** (Electronic Exchange of Social Security Information) is the EU system for cross-border coordination of social security. NAV caseworkers exchange **SEDs** (Structured Electronic Documents) with other EU/EEA countries through **RINA** (Reference Implementation of a National Application). SEDs are exchanged within **BUCs** (Business Use Cases), each defining which SEDs belong to a given scenario (e.g. a pension claim or family benefits).

## Architecture at a Glance

The platform has three main flows. The portal shows them as interactive diagrams.

1. **Request flow (synchronous).** The caseworker uses **nEESSI** (eux-web-app). Its Node.js BFF exchanges the user token on-behalf-of and proxies to **eux-neessi**, which orchestrates the EUX domain services and NAV systems. All RINA operations go through **eux-rina-api**, which talks to **RINA CPI**.
2. **Event flow (asynchronous).** RINA pushes **NIE** events over HTTP to **eux-all-rina-events**, which publishes them to three Kafka topics. **eux-legacy-rina-events** converts document events to the legacy topics `sedmottatt-v1` / `sedsendt-v1`. Workers in EUX and in other teams consume these topics.
3. **Scheduled flow.** NAIS jobs trigger REST endpoints on worker services that finalize journal posts, close and archive RINA cases, and delete unsent cases. Case operations against RINA go through **eux-rina-terminator-api**.

All deployed applications run on **NAIS** in GCP (`dev-gcp` / `prod-gcp`), namespace `eessibasis`.

## Applications

### Core Services

| Application | Tech | DB | Description |
|---|---|---|---|
| [eux-web-app](https://github.com/navikt/eux-web-app) | React / TypeScript, Node.js BFF | — | **nEESSI**, the caseworker frontend. The BFF logs in via the Wonderwall sidecar and proxies `/api` and `/v2`–`/v5` to eux-neessi using on-behalf-of tokens. |
| [eux-neessi](https://github.com/navikt/eux-neessi) | Java / Spring Boot | — | Backend for nEESSI. Orchestrates calls to EUX services and NAV systems (PDL, SAF, Dokarkiv, Aa-registeret, Inntekt, NORG2 and more). |
| [eux-rina-api](https://github.com/navikt/eux-rina-api) | Java / Spring Boot | — | Middleware to RINA CPI. Converts SEDs between NAV and EU format, generates PDFs, manages cases, documents and attachments. Also used by eessi-pensjon and melosys-eessi. |
| [eux-nav-rinasak](https://github.com/navikt/eux-nav-rinasak) | Kotlin / Spring Boot | PostgreSQL | Links NAV fagsaker to RINA cases and tracks journal status per SED. |
| [eux-journal](https://github.com/navikt/eux-journal) | Kotlin / Spring Boot | PostgreSQL | Journal post operations: finalization (ferdigstilling) and error-registration (feilregistrering) via Dokarkiv and SAF. |
| [eux-oppgave](https://github.com/navikt/eux-oppgave) | Kotlin / Spring Boot | PostgreSQL | Integration layer to NAV Oppgave. Creates, finds, assigns and finishes tasks. |
| [eux-saksbehandler](https://github.com/navikt/eux-saksbehandler) | Kotlin / Spring Boot | PostgreSQL | Stores caseworker preferences (favourite unit). Called by eux-neessi. |
| [eux-relaterte-rinasaker](https://github.com/navikt/eux-relaterte-rinasaker) | Kotlin / Spring Boot | PostgreSQL | Links related RINA cases to each other. Called by eux-neessi. |
| [eux-rina-terminator-api](https://github.com/navikt/eux-rina-terminator-api) | Kotlin / Spring Boot | — | Closes (locally/globally), archives and deletes RINA cases, and deletes draft documents, directly against RINA CPI. |
| [eux-rina-case-search](https://github.com/navikt/eux-rina-case-search) | Java / Spring Boot | PostgreSQL | Search index of RINA cases by person ID, built from Kafka events. Called by eux-rina-api. |
| [eux-pdf](https://github.com/navikt/eux-pdf) | Kotlin / Spring Boot | — | Generates PDFs for SED types U020 and U029. Called by eux-rina-api. |

### Event Infrastructure

| Application | Tech | Description |
|---|---|---|
| [eux-all-rina-events](https://github.com/navikt/eux-all-rina-events) | Java / Spring Boot | Receives NIE events from RINA (`POST /events/v1/{eventType}`) and publishes them to `eux-rina-case-events-v1`, `eux-rina-document-events-v1` and `eux-rina-notification-events-v1`. eux-rina-api also uses it to re-publish document events. |
| [eux-legacy-rina-events](https://github.com/navikt/eux-legacy-rina-events) | Java / Spring Boot | Backward-compatibility bridge. Consumes `eux-rina-document-events-v1`, enriches with data from RINA CPI, and publishes the legacy format to `sedmottatt-v1` / `sedsendt-v1`. |

### Background Workers

| Application | Tech | DB | Description |
|---|---|---|---|
| [eux-fagmodul-journalfoering](https://github.com/navikt/eux-fagmodul-journalfoering) | Java / Spring Boot | — | Consumes `sedmottatt-v1` / `sedsendt-v1` and journals SEDs automatically (Dokarkiv), creates tasks via eux-oppgave and updates eux-nav-rinasak. eux-neessi also calls it to journal all SEDs in a RINA case onto a fagsak. |
| [eux-journalarkivar](https://github.com/navikt/eux-journalarkivar) | Kotlin / Spring Boot | — | Nightly reconciliation of SED journal status: finalizes journal posts that can be resolved, and error-registers posts still unresolved after 30 days. Triggered by NAIS jobs. |
| [eux-avslutt-rinasaker](https://github.com/navikt/eux-avslutt-rinasaker) | Kotlin / Spring Boot | PostgreSQL | Automatic closure and archiving of inactive RINA cases. Consumes case and document events; calls eux-rina-terminator-api. Triggered by NAIS jobs. See the [process page](https://eux-docs.intern.dev.nav.no/prosesser/automatisk-avslutning). |
| [eux-slett-usendte-rinasaker](https://github.com/navikt/eux-slett-usendte-rinasaker) | Kotlin / Spring Boot | PostgreSQL | Tracks new RINA cases from case/document events and deletes cases where no SED has been sent after 15 days. Calls eux-rina-terminator-api. Triggered by NAIS jobs. |
| [eux-adresse-oppdatering](https://github.com/navikt/eux-adresse-oppdatering) | Kotlin / Spring Boot | — | Consumes `eux-rina-document-events-v1` and updates foreign addresses in PDL (via PDL-Mottak) from incoming SEDs. |
| [eux-person-oppdatering](https://github.com/navikt/eux-person-oppdatering) | Java / Spring Boot | PostgreSQL | Consumes `sedmottatt-v1`, extracts foreign ID numbers from incoming SEDs and sends them to PDL via PDL-Mottak. Tracks update status in its database. |
| [eux-barnetrygd](https://github.com/navikt/eux-barnetrygd) | Java / Spring Boot | — | Annual renewal of child benefit (barnetrygd) cases in EESSI. Runs on an in-app Spring `@Scheduled` cron (not a NAIS job). Calls eux-oppgave, eux-rina-api, eux-nav-rinasak, PDL and SAF. |

### NAIS Jobs (Scheduled Triggers)

Kubernetes CronJobs (Kotlin) that call one REST endpoint on the corresponding service with an Azure AD token. They contain no business logic. Production schedules, time zone `Europe/Oslo`:

| Application | Triggers | Jobs (prod schedule) |
|---|---|---|
| [eux-journalarkivar-naisjob](https://github.com/navikt/eux-journalarkivar-naisjob) | eux-journalarkivar | ferdigstill (01:00), feilregistrer (02:00) |
| [eux-avslutt-rinasaker-naisjob](https://github.com/navikt/eux-avslutt-rinasaker-naisjob) | eux-avslutt-rinasaker | sett-uvirksom (01:00), til-avslutning (02:00), avslutt (03:00), til-arkivering (04:00), arkiver (05:00), slett-dokumentutkast (14:42), rapport (1st of month 00:05) |
| [eux-slett-usendte-rinasaker-naisjob](https://github.com/navikt/eux-slett-usendte-rinasaker-naisjob) | eux-slett-usendte-rinasaker | slett (01:00), til-sletting (02:00), rapport (1st of month 06:00) |

### Libraries & Build Tools

Not deployed. Used at build time or as dependencies.

| Repository | Type | Description |
|---|---|---|
| [eux-parent-pom](https://github.com/navikt/eux-parent-pom) | Maven parent POM (`no.nav.eux:parent-pom`) | Shared dependency and plugin management (Spring Boot, Kotlin, token-validation, test libraries, etc.). |
| [eux-logging](https://github.com/navikt/eux-logging) | Kotlin library | MDC filter for request tracing (`x_request_id`) and EUX context fields (`rinasakId`, `sedId`, `sedType`, `bucType`, `journalpostId`, `dokumentInfoId`, …). |
| [eux-versions-maven-plugin](https://github.com/navikt/eux-versions-maven-plugin) | Maven plugin | Sets the next version based on existing Git tags (`mvn eux-versions:set-next`). Used in CI. |

## How the Apps Talk to Each Other

### Request Flow (user-initiated)

1. **eux-web-app** → **eux-neessi** (on-behalf-of token).
2. **eux-neessi** calls (on-behalf-of tokens for eux-rina-api and the EUX services):
   - **eux-rina-api**: all RINA operations (cases, SEDs, attachments, PDFs, re-publishing SED events)
   - **eux-nav-rinasak**: link fagsaker and RINA cases, SED journal status
   - **eux-journal**: finalize or error-register journal posts
   - **eux-fagmodul-journalfoering**: journal all SEDs in a RINA case onto a fagsak
   - **eux-relaterte-rinasaker**: related RINA cases
   - **eux-saksbehandler**: caseworker preferences
   - NAV systems: PDL, SAF, Dokarkiv, Sak, Aa-registeret, Inntekt, NORG2, Dokdistfordeling, NOM and Microsoft Graph
3. **eux-rina-api** calls RINA CPI and PDL, plus **eux-rina-case-search** (case search), **eux-pdf** (U020/U029 PDFs) and **eux-all-rina-events** (re-publish document events).

eux-neessi does **not** call eux-oppgave or eux-rina-case-search directly. Tasks are created by eux-journal, eux-fagmodul-journalfoering, eux-journalarkivar and eux-barnetrygd through eux-oppgave.

### Event Flow

1. RINA sends NIE events over HTTP to **eux-all-rina-events**.
2. **eux-all-rina-events** publishes to:
   - `eux-rina-case-events-v1`: consumed by eux-avslutt-rinasaker, eux-slett-usendte-rinasaker, eux-rina-case-search
   - `eux-rina-document-events-v1`: consumed by eux-legacy-rina-events, eux-adresse-oppdatering, eux-avslutt-rinasaker, eux-slett-usendte-rinasaker, eux-rina-case-search
   - `eux-rina-notification-events-v1`: consumed by eux-rina-case-search
3. **eux-legacy-rina-events** publishes `sedmottatt-v1` (received SEDs) and `sedsendt-v1` (sent SEDs), consumed by:
   - **eux-fagmodul-journalfoering** (both topics)
   - **eux-person-oppdatering** (`sedmottatt-v1`)
   - Other teams: eessi-pensjon applications and melosys-eessi
   - eux-portal-core in this repository (dev topics only, streamed live to the portal)

### Scheduled Processes

- **Journal reconciliation**: eux-journalarkivar (nightly, via NAIS jobs)
- **Case closure and archiving**: eux-avslutt-rinasaker (nightly pipeline, via NAIS jobs)
- **Deletion of unsent cases**: eux-slett-usendte-rinasaker (nightly, via NAIS jobs)
- **Child benefit renewal**: eux-barnetrygd (in-app cron)

## External Systems

| System | Purpose | Used by |
|---|---|---|
| **RINA CPI** | EU case management (REST) | eux-rina-api (shared-secret JWT → CAS ticket → session); eux-rina-terminator-api, eux-rina-case-search, eux-legacy-rina-events, eux-pdf (service user → CAS ticket) |
| **RINA NIE** | Push of case/document/notification events | → eux-all-rina-events |
| **PDL** | Person data (GraphQL, Azure AD) | eux-neessi, eux-rina-api, eux-fagmodul-journalfoering, eux-barnetrygd, eux-adresse-oppdatering, eux-person-oppdatering |
| **PDL-Mottak** | Write changes to PDL | eux-adresse-oppdatering, eux-person-oppdatering |
| **Dokarkiv** | Create/update journal posts (REST) | eux-neessi, eux-journal, eux-fagmodul-journalfoering, eux-journalarkivar |
| **SAF** | Query journal posts and documents (GraphQL) | eux-neessi, eux-journal, eux-fagmodul-journalfoering, eux-journalarkivar, eux-barnetrygd |
| **NAV Oppgave** | Task management (REST) | eux-oppgave only |
| **NORG2** | NAV organizational units (REST, no auth) | eux-neessi, eux-fagmodul-journalfoering |
| **Aa-registeret, Inntekt, Sak, Dokdistfordeling, NOM, Microsoft Graph** | Employment, income, archive cases, distribution, org data, user info | eux-neessi |

## Common Patterns

- **Authentication**: Service-to-service calls use **Azure AD** (client credentials or on-behalf-of). The frontend logs in through the **Wonderwall** sidecar. RINA CPI is the exception (see External Systems).
- **Deployment**: All applications and NAIS jobs deploy to NAIS on GCP.
- **Health/metrics**: JVM services expose `/actuator/health` and `/actuator/prometheus`. eux-web-app uses `/internal/isAlive`, `/internal/isReady` and `/internal/metrics`. NAIS jobs have no health endpoints.
- **Parent POM**: All JVM services and NAIS jobs inherit from **eux-parent-pom**, except eux-all-rina-events, eux-legacy-rina-events and eux-rina-case-search, which use `spring-boot-starter-parent`.
- **Structured logging**: All Kotlin services, plus eux-journalarkivar-naisjob and eux-slett-usendte-rinasaker-naisjob, depend on **eux-logging** for MDC-based tracing. The Java services do not.

### Patterns That Vary by Project

| Pattern | Applies to | Notes |
|---|---|---|
| **PostgreSQL (Cloud SQL) + Flyway** | eux-nav-rinasak, eux-journal, eux-oppgave, eux-saksbehandler, eux-relaterte-rinasaker, eux-rina-case-search, eux-avslutt-rinasaker, eux-slett-usendte-rinasaker, eux-person-oppdatering | The other services are stateless. |
| **OpenAPI code generation + multi-module Maven** | eux-nav-rinasak, eux-journal, eux-oppgave, eux-relaterte-rinasaker, eux-journalarkivar, eux-rina-terminator-api | Modules like `-openapi`, `-model`, `-persistence`, `-service`, `-integration`, `-webapp` (not all in every service). Other services are single-module with hand-written controllers. |
| **Kafka consumer** | eux-fagmodul-journalfoering, eux-person-oppdatering, eux-adresse-oppdatering, eux-avslutt-rinasaker, eux-slett-usendte-rinasaker, eux-rina-case-search, eux-legacy-rina-events | See Event Flow for topics. |
| **Kafka producer** | eux-all-rina-events, eux-legacy-rina-events | No other EUX service publishes to Kafka. |
| **GraphQL clients** | eux-neessi, eux-rina-api, eux-fagmodul-journalfoering, eux-journal, eux-journalarkivar, eux-barnetrygd, eux-adresse-oppdatering, eux-person-oppdatering | PDL and/or SAF. |
| **Caffeine caching** | eux-neessi, eux-rina-api, eux-fagmodul-journalfoering, eux-rina-terminator-api | In-memory caching. |
| **Retry** | Spring `@Retryable` (Spring Framework resilience): eux-rina-api, eux-rina-case-search, eux-legacy-rina-events, eux-fagmodul-journalfoering, eux-journalarkivar, eux-barnetrygd, eux-adresse-oppdatering, eux-person-oppdatering. Spring Retry: eux-oppgave. Resilience4j: eux-neessi. | Retry semantics differ per service. |

## Pitfalls and Things to Watch Out For

### Long synchronous chain

`eux-web-app → eux-neessi → eux-rina-api → RINA CPI`. Slowness or failure in RINA CPI propagates through every layer. The web-app BFF times out requests after 60 seconds.

### eux-rina-api is shared with other teams

eessi-pensjon applications and melosys-eessi call eux-rina-api directly. API changes affect more than nEESSI.

### Legacy topics are a public contract

`sedmottatt-v1` / `sedsendt-v1` are consumed by eessi-pensjon, melosys-eessi and EUX workers. If eux-all-rina-events or eux-legacy-rina-events stops, journaling and person updates stop too. Monitor consumer lag.

### Kafka error handling differs per consumer

eux-fagmodul-journalfoering and eux-person-oppdatering poll one record at a time and commit per record. eux-adresse-oppdatering uses manual acks and `@RetryableTopic` (3 attempts, 15 s backoff, then a DLT handler). eux-rina-case-search has a DLQ for document events. Do not assume the same semantics across services.

### Journal status can drift

SED journal status is stored in **eux-nav-rinasak**, while the journal post lives in **Dokarkiv**. eux-journalarkivar reconciles them nightly: it finalizes posts with status `UKJENT`, `FEILET_FERDIGSTILL` or `FEILREGISTRERT`, and error-registers `UKJENT` posts older than 30 days.

### Small database connection pools

PostgreSQL services use HikariCP with `maximum-pool-size: 2` and `minimum-idle: 1`, except eux-rina-case-search (50 / 2). Long-running queries can block other requests.

### RINA CPI credentials differ per service

eux-rina-api uses a shared-secret JWT exchanged for a CAS ticket. eux-rina-terminator-api, eux-rina-case-search, eux-legacy-rina-events and eux-pdf use a service user (`CPI_USERNAME` / `CPI_PASSWORD`) to get CAS tickets. Credentials are managed separately per app.

### NAIS job schedules live in per-environment files

The base `nais.yaml` uses a `{{ schedule }}` placeholder, filled in from per-job, per-environment files. In dev, the report jobs are effectively disabled with `0 0 31 2 *` (31 February). Always check the environment file.

### FSS endpoints

PDL, PDL-Mottak, Dokarkiv, SAF, NAV Oppgave, NORG2 and several others are reached through `*.prod-fss-pub.nais.io` hosts. They must be declared as external hosts in the access policy, not as in-cluster applications.

### Azure AD group sprawl

eux-neessi maps a large set of Azure AD groups (one per benefit area: pension, sickness, unemployment, etc.). Wrong group membership is a common cause of access issues.

### eux-rina-api: "ACL" is not access control

`EessiAcl` is the SED **format transformation** between NAV and EU format, based on templates and code mappings. When a code mapping fails, the value becomes an **empty string** and only a warning is logged.

### eux-rina-api: CPI session cache

CPI sessions are cached for 29 minutes (`CPI_SESSION_CACHE`), just under RINA's default 30-minute session. Login is a three-step flow (JWT → CAS service ticket → `JSESSIONID`). There is no re-login on 401; a session invalidated earlier by RINA stays cached until it expires.

### eux-rina-api: inconsistent status codes for missing RINA actions

Whether RINA allows an operation depends on the case state, which can change at any time. When the required action is missing, eux-rina-api returns **404** (e.g. no actions on the case, no send action), **409** (no valid action during an operation) or **412** (read action unavailable when converting to NAV format), depending on the endpoint. Callers must not interpret 404 as "case or document does not exist".

### eux-rina-api: waiting for RINA

NIE can announce a SED before CPI is ready to serve it. eux-rina-api polls for the read action up to 10 times at 1-second intervals (hardcoded). Attachment polling uses 1-second intervals and a configurable timeout (default 120 s), and throws **504 Gateway Timeout** when it expires.

### eux-rina-api: attachments

- Size limit: 100 MB, enforced in `CpiAttachmentService`. Spring multipart limits are unlimited (`-1`).
- File type: validated only against the caller-supplied type (PDF, JPEG, TIFF, PNG). Content is not inspected.
- Filenames: RINA treats `/` and `\` as paths, so they are replaced by fullwidth `／` (U+FF0F) and `＼` (U+FF3C).

### eux-rina-api: SED templates and versions

Templates are loaded from `classpath*:/sedtemplates/v*/*/*.json` and selected by SED type and version. A missing template fails with `SED_LACKING_TEMPLATE`. Deprecated methods infer the version from `sedGVer`/`sedVer` (default 4.1), which is unreliable. Pass the version explicitly.

### eux-rina-api: PDF generation is split

eux-rina-api generates most SED PDFs internally with iText. **U020** and **U029** are delegated to **eux-pdf** (PDFBox), which fetches data from RINA CPI with its own service-user login. These two SED types therefore have a different dependency chain and failure modes.
