import { Heading, BodyLong, VStack, Box } from "@navikt/ds-react";

export const metadata = {
  title: "Architecture · EUX Architecture",
};

const diagram = `                       ┌─────────────────┐
                       │   Caseworker     │
                       │   (Browser)      │
                       └────────┬─────────┘
                                │
                       ┌────────▼─────────┐
                       │  eux-web-app     │  React frontend + Node.js BFF
                       └────────┬─────────┘
                                │
                       ┌────────▼─────────┐
                       │   eux-neessi     │  Main BFF / orchestrator
                       └──┬──┬──┬──┬──┬───┘
                          │  │  │  │  │
        ┌─────────────────┘  │  │  │  └──────────────────┐
        │                    │  │  │                     │
┌───────▼─────┐  ┌──────────▼┐ ┌▼──────────┐ ┌──────────▼─┐
│eux-rina-api │  │eux-nav-   │ │eux-journal│ │eux-oppgave  │
│ (RINA CPI)  │  │rinasak    │ │           │ │             │
└─────┬───────┘  └───────────┘ └───────────┘ └─────────────┘
      │                            ▲                ▲
      │                            │                │
      ▼                            │                │
┌──────────┐    NIE events    ┌────┴────────────────┴────┐
│  RINA    │ ───────────────▶ │ eux-all-rina-events      │
│ (CPI)    │                  │ → Kafka                  │
└──────────┘                  └──────────────────────────┘`;

export default function ArchitecturePage() {
  return (
    <VStack gap="space-32" className="portal-prose">
      <div>
        <Heading level="1" size="xlarge" spacing>
          Architecture
        </Heading>
        <BodyLong size="large">
          A bird&rsquo;s-eye view of the EUX platform. Caseworkers interact
          with <code>eux-web-app</code>, which talks to{" "}
          <code>eux-neessi</code> (the orchestrator BFF). Everything beneath
          that is internal: REST calls to specialised services, and Kafka
          events that fan out from RINA into our background workers.
        </BodyLong>
      </div>

      <Box>
        <Heading level="2" size="medium" spacing>
          High-level diagram
        </Heading>
        <pre className="portal-pre">{diagram}</pre>
      </Box>

      <Box>
        <Heading level="2" size="medium" spacing>
          Synchronous flows
        </Heading>
        <BodyLong>
          Caseworker traffic enters through <code>eux-web-app</code> and is
          forwarded by its Node.js BFF to <code>eux-neessi</code>.{" "}
          <code>eux-neessi</code> orchestrates calls to a handful of focused
          services:
        </BodyLong>
        <ul>
          <li>
            <code>eux-rina-api</code> — middleware to RINA CPI, used for
            anything that needs to read or write SEDs.
          </li>
          <li>
            <code>eux-nav-rinasak</code> — links RINA cases to NAV
            fagsaker and tracks per-SED journal status.
          </li>
          <li>
            <code>eux-journal</code> — error-registration
            (feilregistrering) and finalization (ferdigstilling) of
            journal posts.
          </li>
          <li>
            <code>eux-oppgave</code> — integration to NAV Oppgave (task
            system).
          </li>
          <li>
            <code>eux-saksbehandler</code> — caseworker preferences.
          </li>
          <li>
            <code>eux-rina-case-search</code> — searchable index of RINA
            cases, built from Kafka events.
          </li>
        </ul>
      </Box>

      <Box>
        <Heading level="2" size="medium" spacing>
          Event-driven flows
        </Heading>
        <BodyLong>
          RINA pushes events to <code>eux-all-rina-events</code>, which
          publishes them onto three Kafka topics:{" "}
          <code>eux-rina-case-events-v1</code>,{" "}
          <code>eux-rina-document-events-v1</code> and{" "}
          <code>eux-rina-notification-events-v1</code>.{" "}
          <code>eux-legacy-rina-events</code> bridges document events to the
          older <code>sedmottatt-v1</code> / <code>sedsendt-v1</code>{" "}
          topics. Background workers (
          <code>eux-journalfoering</code>, <code>eux-avslutt-rinasaker</code>
          , <code>eux-slett-usendte-rinasaker</code>,{" "}
          <code>eux-adresse-oppdatering</code>,{" "}
          <code>eux-person-oppdatering</code>) consume these topics and
          drive downstream side-effects.
        </BodyLong>
      </Box>

      <Box>
        <Heading level="2" size="medium" spacing>
          External integrations
        </Heading>
        <ul>
          <li>
            <strong>RINA CPI</strong> — the European Commission&rsquo;s
            Case Processing Interface. NAV runs its own RINA instance and
            talks to it through <code>eux-rina-api</code>.
          </li>
          <li>
            <strong>PDL</strong> (Persondataløsningen) — NAV&rsquo;s
            person registry.
          </li>
          <li>
            <strong>Dokarkiv</strong> — NAV&rsquo;s document archive
            (write).
          </li>
          <li>
            <strong>SAF</strong> — Sak- og Arkivfunksjonalitet (document
            archive read).
          </li>
          <li>
            <strong>NAV Oppgave</strong> — NAV&rsquo;s task management
            system.
          </li>
        </ul>
      </Box>

      <Box>
        <Heading level="2" size="medium" spacing>
          Where to dig deeper
        </Heading>
        <ul>
          <li>
            <a
              href="https://github.com/navikt/eux-architecture/blob/main/README.md"
              target="_blank"
              rel="noreferrer"
            >
              eux-architecture README
            </a>{" "}
            — the canonical, always-current document.
          </li>
          <li>
            <a
              href="https://eux-rina-gateway-portal-q1.intern.dev.nav.no"
              target="_blank"
              rel="noreferrer"
            >
              RINA Gateway portal
            </a>{" "}
            — live status, smoke tests, and an example of how a Swagger UI
            and developer portal can be embedded.
          </li>
        </ul>
      </Box>
    </VStack>
  );
}
