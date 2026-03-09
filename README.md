# EUX Architecture Overview

This repository documents the architecture of the **EUX (EESSI) platform** — NAV's system for electronic exchange of social security information with EU/EEA countries. It serves as a starting point for developers and AI assistants working across the various EUX projects.

## What is EESSI?

**EESSI** (Electronic Exchange of Social Security Information) is the EU system for cross-border coordination of social security benefits. NAV's EUX platform enables Norwegian caseworkers to exchange **SEDs** (Structured Electronic Documents) with other EU/EEA countries through the **RINA** (Records, Information and Notification Application) system.

## Applications

| Application | Tech | Database | Role |
|---|---|---|---|
| [eux-web-app](https://github.com/navikt/eux-web-app) | React / TypeScript / Node.js | — | Frontend for caseworkers |
| [eux-neessi](https://github.com/navikt/eux-neessi) | Java 25 / Spring Boot | — (stateless) | Backend-for-frontend, orchestration |
| [eux-rina-api](https://github.com/navikt/eux-rina-api) | Java 25 / Spring Boot | — (stateless) | Middleware to the RINA system |
| [eux-nav-rinasak](https://github.com/navikt/eux-nav-rinasak) | Kotlin / Spring Boot | PostgreSQL | Links NAV cases to RINA cases |
| [eux-journalfoering](https://github.com/navikt/eux-journalfoering) | Java 25 / Spring Boot | — (stateless) | Auto-journals SEDs from Kafka events |
| [eux-journal](https://github.com/navikt/eux-journal) | Kotlin / Spring Boot | PostgreSQL | Error-registration and finalization of journal posts |
| [eux-oppgave](https://github.com/navikt/eux-oppgave) | Kotlin / Spring Boot | PostgreSQL | Integration with NAV's task system (Oppgave) |

## Architecture Diagram

```
                          ┌─────────────────┐
                          │   Caseworker     │
                          │   (Browser)      │
                          └────────┬─────────┘
                                   │
                          ┌────────▼─────────┐
                          │  eux-web-app     │  React frontend + Node.js BFF
                          │  (port 8080)     │  OAuth2 on-behalf-of proxy
                          └────────┬─────────┘
                                   │
                          ┌────────▼─────────┐
                          │  eux-neessi      │  Main backend — orchestrates
                          │  (port 8080)     │  calls to all downstream services
                          └──┬──┬──┬──┬──┬───┘
                             │  │  │  │  │
              ┌──────────────┘  │  │  │  └──────────────────┐
              │         ┌───────┘  │  └────────┐            │
              ▼         ▼         ▼            ▼            ▼
     ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
     │eux-rina  │ │eux-nav   │ │eux-      │ │eux-      │ │eux-      │
     │-api      │ │-rinasak  │ │journal   │ │oppgave   │ │journal-  │
     │          │ │          │ │          │ │          │ │foering   │
     │Middleware│ │Case      │ │Journal   │ │Task      │ │Auto-     │
     │to RINA   │ │linking   │ │mgmt      │ │mgmt     │ │journal   │
     └────┬─────┘ └────┬─────┘ └──┬──┬────┘ └────┬─────┘ └──┬──┬────┘
          │            │          │  │            │          │  │
          │         [Postgres]    │  │         [Postgres]    │  │
          │                       │  │                       │  │
          ▼                       ▼  ▼                       ▼  ▼
   ┌────────────┐          ┌────────────┐             ┌────────────┐
   │  RINA CPI  │          │  Dokarkiv  │             │ NAV        │
   │  (EU)      │          │  / SAF     │             │ Oppgave    │
   └────────────┘          └────────────┘             └────────────┘

   ┌─────────────────────────────────────────┐
   │         Kafka (eessibasis topics)       │
   │  sedmottatt-v1  │  sedsendt-v1         │
   └──────────────────┬──────────────────────┘
                      │
                      ▼
              eux-journalfoering
              (consumes SED events)
```

## How the Apps Talk to Each Other

### Request Flow (user-initiated)

1. **eux-web-app** → The caseworker opens the app in their browser. The Node.js server handles Azure AD login (via Wonderwall sidecar) and proxies all `/api`, `/v2`–`/v5` requests to **eux-neessi** using OAuth2 on-behalf-of tokens.

2. **eux-neessi** → The main orchestrator. It receives requests from the frontend and fans out to downstream services:
   - **eux-rina-api** — for all RINA/SED operations (create case, fetch SED, send SED, generate PDF)
   - **eux-nav-rinasak** — to link/search NAV fagsaker with RINA cases and track SED journal status
   - **eux-journal** — to error-register or finalize journal posts
   - **eux-oppgave** — to create/update tasks in NAV Oppgave
   - **Dokarkiv / SAF** — to create and query journal posts directly
   - **PDL** — to look up person data (GraphQL)

3. **eux-rina-api** → Translates between NAV's domain and the RINA CPI system (the actual EU infrastructure). Handles SED template rendering, PDF generation, and case lifecycle.

### Event Flow (automatic journaling)

1. When a SED is sent or received, an event is published to Kafka topics (`eessibasis.sedmottatt-v1` / `eessibasis.sedsendt-v1`).
2. **eux-journalfoering** consumes these events and automatically:
   - Fetches the SED document from **eux-rina-api**
   - Resolves the person via **PDL**
   - Creates a journal post in **Dokarkiv**
   - Updates the SED journal status in **eux-nav-rinasak**
   - Creates tasks via **eux-oppgave** if needed

## External NAV Systems

| System | Purpose | Access Pattern |
|---|---|---|
| **RINA CPI** | EU case management system | REST (JWT auth) via eux-rina-api |
| **PDL** | Person data (Folkeregisteret) | GraphQL (Azure AD) |
| **Dokarkiv** | Create/update journal posts | REST (Azure AD) |
| **SAF** | Query journal posts and documents | GraphQL (Azure AD) |
| **NAV Oppgave** | Task management | REST (Azure AD) via eux-oppgave |
| **NORG2** | NAV organizational units | REST (no auth) |
| **Aa-registeret** | Employment data | REST (Azure AD) via eux-neessi |
| **A-Inntekt** | Income data | REST (Azure AD) via eux-neessi |

## Common Patterns

- **Authentication**: All services use **Azure AD** for service-to-service auth (OAuth2 client credentials / on-behalf-of). The frontend uses Azure AD via the **Wonderwall** sidecar.
- **API-first**: Most services use **OpenAPI 3.0** specs with code generation for controllers and clients.
- **Multi-module Maven**: Backend services are structured as Maven multi-module projects (`-openapi`, `-model`, `-persistence`, `-service`, `-integration`, `-webapp`).
- **NAIS deployment**: All apps deploy to **NAIS** (NAV's Kubernetes platform) on GCP, with Cloud SQL for PostgreSQL where needed.
- **Health/metrics**: All services expose `/actuator/health` and `/actuator/prometheus`.
- **Distroless containers**: Backend JVM services use `gcr.io/distroless/java25` base images.

## Pitfalls and Things to Watch Out For

### Cross-service dependencies
The services form a deep call chain (`web-app → neessi → rina-api → RINA CPI`). A timeout or failure in RINA CPI cascades back through the entire stack. Be mindful of timeout settings at each layer.

### Kafka consumer ordering
`eux-journalfoering` processes one message at a time (`max-poll-records: 1`) with manual commits. If processing fails repeatedly, the consumer can get stuck. Monitor the consumer lag.

### Journal status tracking
SED journal status is tracked in **eux-nav-rinasak**, but the actual journal post lives in **Dokarkiv**. These can get out of sync if error-registration or re-journaling happens outside the normal flow.

### Database connection pools
Services with PostgreSQL use very small connection pools (typically max 2 connections). This is intentional for NAIS but means long-running queries can block other requests.

### FSS vs GCP split
Some services still run in the legacy FSS cluster while most have migrated to GCP. Cross-cluster communication goes through public ingress endpoints (`*.prod-fss-pub.nais.io`), which adds latency and requires different network policies.

### Azure AD group sprawl
Access control uses 15+ Azure AD groups mapped to different benefit areas (pension, sickness, unemployment, etc.). Misconfigured group membership is a common source of access issues.

### PDF generation
PDF generation involves multiple services — `eux-rina-api` handles SED-to-PDF conversion using iText/PDFBox, while `eux-neessi` can also generate PDFs. Ensure you're calling the right service for your use case.
