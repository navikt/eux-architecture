import { Heading, BodyLong, VStack, Box, BodyShort } from "@navikt/ds-react";

export const metadata = {
  title: "Applications · EUX Architecture",
};

type App = {
  name: string;
  tech: string;
  db: string;
  description: string;
};

const core: App[] = [
  { name: "eux-web-app", tech: "React / TypeScript / Node.js", db: "—", description: "Frontend for caseworkers. Node.js BFF proxies to eux-neessi with OAuth2 on-behalf-of." },
  { name: "eux-neessi", tech: "Java / Spring Boot", db: "—", description: "Backend-for-frontend. Orchestrates calls to downstream eux-* services, PDL, Dokarkiv, SAF." },
  { name: "eux-rina-api", tech: "Java / Spring Boot", db: "—", description: "Middleware to the RINA CPI. SED template rendering, PDF generation, case lifecycle." },
  { name: "eux-nav-rinasak", tech: "Kotlin / Spring Boot", db: "PostgreSQL", description: "Links NAV fagsaker to RINA cases. Tracks SED journal status." },
  { name: "eux-journal", tech: "Kotlin / Spring Boot", db: "PostgreSQL", description: "Error-registration (feilregistrering) and finalization (ferdigstilling) of journal posts." },
  { name: "eux-oppgave", tech: "Kotlin / Spring Boot", db: "PostgreSQL", description: "Integration layer to NAV Oppgave (task system)." },
  { name: "eux-saksbehandler", tech: "Kotlin / Spring Boot", db: "PostgreSQL", description: "Stores caseworker preferences (e.g. favorite unit)." },
  { name: "eux-rina-terminator-api", tech: "Kotlin / Spring Boot", db: "—", description: "REST API for closing, archiving, and deleting RINA cases." },
  { name: "eux-rina-case-search", tech: "Java / Spring Boot", db: "PostgreSQL", description: "Searchable index of RINA cases. Built from Kafka events." },
];

const events: App[] = [
  { name: "eux-all-rina-events", tech: "Java / Spring Boot", db: "—", description: "Receives NIE events from RINA via HTTP POST. Publishes to three Kafka topics." },
  { name: "eux-legacy-rina-events", tech: "Java / Spring Boot", db: "—", description: "Bridges new document events to legacy sedmottatt-v1 / sedsendt-v1 topics." },
];

const workers: App[] = [
  { name: "eux-journalfoering", tech: "Java / Spring Boot", db: "—", description: "Consumes sedmottatt/sedsendt. Auto-journals SEDs via Dokarkiv, PDL, eux-nav-rinasak, eux-oppgave." },
  { name: "eux-journalarkivar", tech: "Kotlin / Spring Boot", db: "—", description: "Orchestrates journal post finalization and error-registration. Triggered by NAIS jobs." },
  { name: "eux-avslutt-rinasaker", tech: "Kotlin / Spring Boot", db: "PostgreSQL", description: "Manages RINA case closure/archival lifecycle. Triggered by NAIS jobs." },
  { name: "eux-slett-usendte-rinasaker", tech: "Kotlin / Spring Boot", db: "PostgreSQL", description: "Deletes RINA cases that never received a SED. Triggered by NAIS jobs." },
  { name: "eux-adresse-oppdatering", tech: "Kotlin / Spring Boot", db: "—", description: "Updates addresses in PDL when address data is found in incoming SEDs." },
  { name: "eux-person-oppdatering", tech: "Java / Spring Boot", db: "PostgreSQL", description: "Extracts foreign ID numbers from incoming SEDs and sends updates to PDL." },
  { name: "eux-barnetrygd", tech: "Java / Spring Boot", db: "—", description: "Scheduled worker for annual child benefit (barnetrygd) case renewal." },
];

const libs: App[] = [
  { name: "eux-parent-pom", tech: "Maven parent POM", db: "—", description: "Shared dependency versions (Spring Boot, Kotlin, Java, token-validation, PostgreSQL)." },
  { name: "eux-logging", tech: "Kotlin library", db: "—", description: "MDC filter for request-id tracking and EUX-specific logging context." },
  { name: "eux-versions-maven-plugin", tech: "Maven plugin", db: "—", description: "Auto-increments patch versions from Git tags. Used in CI/CD." },
];

function AppTable({ rows }: { rows: App[] }) {
  return (
    <VStack gap="space-12">
      {rows.map((r) => (
        <Box
          key={r.name}
          padding="space-16"
          borderRadius="8"
          borderWidth="1"
          borderColor="neutral-subtle"
          background="neutral-soft"
        >
          <VStack gap="space-4">
            <BodyShort weight="semibold">
              <a
                href={`https://github.com/navikt/${r.name}`}
                target="_blank"
                rel="noreferrer"
              >
                {r.name}
              </a>
              <span style={{ color: "var(--ax-text-subtle, #555)" }}>
                {" — "}
                {r.tech}
                {r.db !== "—" ? ` · ${r.db}` : ""}
              </span>
            </BodyShort>
            <BodyLong size="small">{r.description}</BodyLong>
          </VStack>
        </Box>
      ))}
    </VStack>
  );
}

export default function ApplicationsPage() {
  return (
    <VStack gap="space-32">
      <div>
        <Heading level="1" size="xlarge" spacing>
          Applications
        </Heading>
        <BodyLong size="large">
          The EUX platform is roughly two dozen small services, organized
          into four buckets. Click any name to open its GitHub repository.
        </BodyLong>
      </div>

      <section>
        <Heading level="2" size="medium" spacing>
          Core services
        </Heading>
        <AppTable rows={core} />
      </section>

      <section>
        <Heading level="2" size="medium" spacing>
          Event infrastructure
        </Heading>
        <AppTable rows={events} />
      </section>

      <section>
        <Heading level="2" size="medium" spacing>
          Background workers
        </Heading>
        <AppTable rows={workers} />
      </section>

      <section>
        <Heading level="2" size="medium" spacing>
          Libraries &amp; build tools
        </Heading>
        <AppTable rows={libs} />
      </section>
    </VStack>
  );
}
