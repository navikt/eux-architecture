import { Heading, BodyLong, VStack, Box, BodyShort } from "@navikt/ds-react";

export const metadata = {
  title: "Applikasjoner · EUX-arkitektur",
};

type App = {
  name: string;
  tech: string;
  db: string;
  description: string;
};

const core: App[] = [
  { name: "nEESSI", tech: "React / TypeScript / Node.js", db: "—", description: "Frontend for saksbehandlere. Node.js BFF videresender forespørsler til eux-neessi med OAuth2 on-behalf-of." },
  { name: "eux-neessi", tech: "Java / Spring Boot", db: "—", description: "Backend-for-frontend / orkestrator. Kaller eux-* tjenester, PDL, Dokarkiv, SAF." },
  { name: "eux-rina-api", tech: "Java / Spring Boot", db: "—", description: "Mellomvare mot RINA CPI. SED-malrendering, PDF-generering, saksstyring." },
  { name: "eux-nav-rinasak", tech: "Kotlin / Spring Boot", db: "PostgreSQL", description: "Kobler NAV-fagsaker til RINA-saker. Holder styr på journalstatus per SED." },
  { name: "eux-journal", tech: "Kotlin / Spring Boot", db: "PostgreSQL", description: "Feilregistrering og ferdigstilling av journalposter." },
  { name: "eux-oppgave", tech: "Kotlin / Spring Boot", db: "PostgreSQL", description: "Integrasjonslag mot NAV Oppgave." },
  { name: "eux-saksbehandler", tech: "Kotlin / Spring Boot", db: "PostgreSQL", description: "Saksbehandlerinnstillinger (f.eks. favorittenhet)." },
  { name: "eux-rina-terminator-api", tech: "Kotlin / Spring Boot", db: "—", description: "REST-API for å lukke, arkivere og slette RINA-saker." },
  { name: "eux-rina-case-search", tech: "Java / Spring Boot", db: "PostgreSQL", description: "Søkeindeks for RINA-saker. Bygges fra Kafka-hendelser." },
];

const events: App[] = [
  { name: "eux-all-rina-events", tech: "Java / Spring Boot", db: "—", description: "Mottar NIE-hendelser fra RINA via HTTP POST. Publiserer på tre Kafka-topics." },
  { name: "eux-legacy-rina-events", tech: "Java / Spring Boot", db: "—", description: "Bro fra nye dokumenthendelser til legacy-topicene sedmottatt-v1 / sedsendt-v1." },
];

const workers: App[] = [
  { name: "eux-fagmodul-journalfoering", tech: "Java / Spring Boot", db: "—", description: "Konsumerer sedmottatt/sedsendt. Auto-journalfører SED-er via Dokarkiv, PDL, eux-nav-rinasak, eux-oppgave." },
  { name: "eux-journalarkivar", tech: "Kotlin / Spring Boot", db: "—", description: "Orkestrerer ferdigstilling og feilregistrering av journalposter. Trigges av NAIS-jobber." },
  { name: "eux-avslutt-rinasaker", tech: "Kotlin / Spring Boot", db: "PostgreSQL", description: "Håndterer livssyklusen for lukking/arkivering av RINA-saker. Trigges av NAIS-jobber." },
  { name: "eux-slett-usendte-rinasaker", tech: "Kotlin / Spring Boot", db: "PostgreSQL", description: "Sletter RINA-saker som aldri fikk en SED. Trigges av NAIS-jobber." },
  { name: "eux-adresse-oppdatering", tech: "Kotlin / Spring Boot", db: "—", description: "Oppdaterer adresser i PDL når adressedata finnes i innkommende SED-er." },
  { name: "eux-person-oppdatering", tech: "Java / Spring Boot", db: "PostgreSQL", description: "Henter utenlandske ID-nummer fra innkommende SED-er og sender oppdateringer til PDL." },
  { name: "eux-barnetrygd", tech: "Java / Spring Boot", db: "—", description: "Planlagt arbeider for årlig fornyelse av barnetrygdsaker." },
];

const libs: App[] = [
  { name: "eux-parent-pom", tech: "Maven parent POM", db: "—", description: "Felles avhengighetsversjoner (Spring Boot, Kotlin, Java, token-validation, PostgreSQL)." },
  { name: "eux-logging", tech: "Kotlin-bibliotek", db: "—", description: "MDC-filter for sporing av request-id og EUX-spesifikk loggekontekst." },
  { name: "eux-versions-maven-plugin", tech: "Maven-plugin", db: "—", description: "Auto-inkrementerer patch-versjoner fra git-tagger. Brukes i CI/CD." },
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
          Applikasjoner
        </Heading>
        <BodyLong size="large">
          Plattformen består av om lag to dusin små tjenester,
          organisert i fire grupper. Klikk på et navn for å åpne
          GitHub-repoet.
        </BodyLong>
      </div>

      <section>
        <Heading level="2" size="medium" spacing>
          Kjernetjenester
        </Heading>
        <AppTable rows={core} />
      </section>

      <section>
        <Heading level="2" size="medium" spacing>
          Hendelsesinfrastruktur
        </Heading>
        <AppTable rows={events} />
      </section>

      <section>
        <Heading level="2" size="medium" spacing>
          Bakgrunnsarbeidere
        </Heading>
        <AppTable rows={workers} />
      </section>

      <section>
        <Heading level="2" size="medium" spacing>
          Biblioteker og byggeverktøy
        </Heading>
        <AppTable rows={libs} />
      </section>
    </VStack>
  );
}
