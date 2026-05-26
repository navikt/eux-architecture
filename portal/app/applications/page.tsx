import { Heading, BodyLong, VStack, BodyShort } from "@navikt/ds-react";

export const metadata = {
  title: "Applikasjoner · Team EESSI Nav",
};

type AppDetail = {
  role?: string;
  inbound?: string[];
  outbound?: string[];
  kafkaConsumes?: string[];
  kafkaProduces?: string[];
  auth?: string;
  patterns?: string[];
  notes?: string[];
};

type App = {
  name: string;
  repo?: string;
  tech: string;
  db: string;
  description: string;
  detail?: AppDetail;
};

const core: App[] = [
  {
    name: "nEESSI",
    repo: "eux-web-app",
    tech: "React / TypeScript / Node.js",
    db: "—",
    description:
      "Frontend for saksbehandlere. Node.js BFF videresender forespørsler til eux-neessi med OAuth2 on-behalf-of.",
    detail: {
      role: "Eneste web-klient saksbehandlere bruker. En liten Express-basert BFF foran React-appen håndterer Azure AD-innlogging via Wonderwall sidecar og proxer /api og /v2–/v5 videre til eux-neessi.",
      inbound: ["Saksbehandler i nettleser (Azure AD via Wonderwall)"],
      outbound: ["eux-neessi (HTTP, OBO-token)"],
      auth: "Azure AD via Wonderwall sidecar; OAuth2 on-behalf-of mot eux-neessi.",
      patterns: ["React", "TypeScript", "Node.js BFF", "Wonderwall", "NAV Aksel"],
    },
  },
  {
    name: "eux-neessi",
    tech: "Java / Spring Boot",
    db: "—",
    description:
      "Backend-for-frontend / orkestrator. Kaller eux-* tjenester, PDL, Dokarkiv, SAF.",
    detail: {
      role: "Sentral orkestrator. All trafikk fra nEESSI går hit, og denne kaller alle underliggende eux-* tjenester pluss eksterne NAV-systemer. Driver mesteparten av forretningslogikken for saksbehandlerflyten.",
      inbound: ["nEESSI (OBO-token)"],
      outbound: [
        "eux-rina-api",
        "eux-nav-rinasak",
        "eux-journal",
        "eux-oppgave",
        "eux-saksbehandler",
        "Dokarkiv (REST)",
        "SAF (GraphQL)",
        "PDL (GraphQL)",
        "NORG2",
        "Aa-registeret",
        "A-Inntekt",
      ],
      auth: "Azure AD OBO inn fra nEESSI; OBO eller client-credentials videre nedstrøms.",
      patterns: ["Caffeine cache", "Resilience4j retry", "GraphQL-klient"],
    },
  },
  {
    name: "eux-rina-api",
    tech: "Java / Spring Boot",
    db: "—",
    description:
      "Mellomvare mot RINA CPI. SED-malrendering, PDF-generering, saksstyring.",
    detail: {
      role: "Oversetter mellom NAV-format og EU/SED-format, renderer SED-maler fra classpath, genererer PDF og styrer saksoperasjoner mot RINA CPI. ACL-laget (EessiAcl) er transformasjonsmotoren — ikke adgangskontroll.",
      inbound: [
        "eux-neessi",
        "eux-fagmodul-journalfoering",
        "eux-journalarkivar",
        "eux-barnetrygd",
        "eux-adresse-oppdatering",
        "eux-person-oppdatering",
      ],
      outbound: [
        "RINA CPI (shared-secret JWT → CAS-ticket → JSESSIONID)",
        "PDL (GraphQL)",
        "eux-pdf (for U020/U029)",
      ],
      auth: "Azure AD client credentials inn; shared-secret JWT ut mot RINA CPI.",
      patterns: ["Caffeine cache", "GraphQL-klient", "iText PDF"],
      notes: [
        "ACL er IKKE adgangskontroll — det er SED-transformasjonslaget. Manglende kodemapping gir tom streng og en warning, ikke feilkast.",
        "CPI-sesjonscache utløper på 29 min, RINA på 30 min. Lange operasjoner kan treffe auth-feil uten automatisk fornyelse.",
        "Manglende actions på et dokument returnerer 404 — vanskelig å skille fra «ikke funnet».",
        "Polling av vedlegg (1 s × 2 min) kaster 504 Gateway Timeout som exception, ikke null.",
        "U020 og U029 PDF-generering går mot ekstern eux-pdf-tjeneste; resten genereres internt med iText.",
        "Retry mot CPI er hardkodet til 10 forsøk × 1 s og gjelder bare enkelte kodebaner.",
        "Vedleggs-filnavn med / eller \\ erstattes med Unicode-fullwidth-tegn (\\uFF0F, \\uFF3C).",
      ],
    },
  },
  {
    name: "eux-nav-rinasak",
    tech: "Kotlin / Spring Boot",
    db: "PostgreSQL",
    description:
      "Kobler NAV-fagsaker til RINA-saker. Holder styr på journalstatus per SED.",
    detail: {
      role: "Sentralt register som binder en RINA-sak til en NAV-fagsak (pensjon, sykdom, barnetrygd, m.fl.) og sporer journalstatus per SED. Brukes av både frontend-flyten og bakgrunnsarbeiderne.",
      inbound: [
        "eux-neessi",
        "eux-fagmodul-journalfoering",
        "eux-journalarkivar",
        "eux-barnetrygd",
      ],
      outbound: ["PostgreSQL (Cloud SQL)"],
      auth: "Azure AD client credentials.",
      patterns: ["PostgreSQL", "Flyway", "OpenAPI codegen", "Multi-modul Maven"],
    },
  },
  {
    name: "eux-journal",
    tech: "Kotlin / Spring Boot",
    db: "PostgreSQL",
    description: "Feilregistrering og ferdigstilling av journalposter.",
    detail: {
      role: "Domenetjeneste for journalpost-livssyklus: feilregistrering når noe har gått galt, og ferdigstilling når en journalpost er klar. Snakker direkte med Dokarkiv og SAF.",
      inbound: ["eux-neessi", "eux-journalarkivar"],
      outbound: ["Dokarkiv (REST)", "SAF (GraphQL)", "PostgreSQL"],
      auth: "Azure AD client credentials.",
      patterns: ["PostgreSQL", "Flyway", "OpenAPI codegen", "GraphQL-klient"],
    },
  },
  {
    name: "eux-oppgave",
    tech: "Kotlin / Spring Boot",
    db: "PostgreSQL",
    description: "Integrasjonslag mot NAV Oppgave.",
    detail: {
      role: "Tynt integrasjonslag mellom EUX-tjenestene og NAV Oppgave. Oppretter, oppdaterer og ferdigstiller oppgaver. Beholder en lokal kopi for sporing og idempotens.",
      inbound: [
        "eux-neessi",
        "eux-fagmodul-journalfoering",
        "eux-journalarkivar",
        "eux-barnetrygd",
      ],
      outbound: ["NAV Oppgave (REST)", "PostgreSQL"],
      auth: "Azure AD client credentials.",
      patterns: ["PostgreSQL", "Flyway", "OpenAPI codegen", "Spring Retry"],
    },
  },
  {
    name: "eux-saksbehandler",
    tech: "Kotlin / Spring Boot",
    db: "PostgreSQL",
    description: "Saksbehandlerinnstillinger (f.eks. favorittenhet).",
    detail: {
      role: "Lagrer per-bruker innstillinger for saksbehandlere, som favorittenhet. Kalles utelukkende av nEESSI via eux-neessi.",
      inbound: ["eux-neessi"],
      outbound: ["PostgreSQL"],
      auth: "Azure AD OBO (kjenner saksbehandleren).",
      patterns: ["PostgreSQL", "Flyway", "OpenAPI codegen"],
    },
  },
  {
    name: "eux-rina-terminator-api",
    tech: "Kotlin / Spring Boot",
    db: "—",
    description: "REST-API for å lukke, arkivere og slette RINA-saker.",
    detail: {
      role: "Eneste vei inn til lukk-/arkiver-/slett-operasjoner mot RINA CPI. Brukes av opprydnings-arbeiderne, ikke direkte av saksbehandlere.",
      inbound: ["eux-avslutt-rinasaker", "eux-slett-usendte-rinasaker"],
      outbound: ["RINA CPI (service user credentials)"],
      auth: "Azure AD client credentials inn; service-bruker (CAS-ticket) ut mot RINA CPI.",
      patterns: ["Caffeine cache"],
    },
  },
  {
    name: "eux-rina-case-search",
    tech: "Java / Spring Boot",
    db: "PostgreSQL",
    description: "Søkeindeks for RINA-saker. Bygges fra Kafka-hendelser.",
    detail: {
      role: "Bygger og holder vedlike en søkbar indeks over RINA-saker ved å konsumere case- og dokument-hendelser fra Kafka. Eksponerer et REST-søke-API som eux-neessi bruker.",
      inbound: ["eux-neessi"],
      outbound: ["RINA CPI (CAS-ticket)", "PostgreSQL"],
      kafkaConsumes: ["eux-rina-case-events-v1", "eux-rina-document-events-v1"],
      auth: "Azure AD client credentials inn; CAS-ticket ut mot RINA CPI.",
      patterns: ["PostgreSQL", "Flyway", "Kafka consumer", "Egendefinert retry"],
    },
  },
];

const events: App[] = [
  {
    name: "eux-all-rina-events",
    tech: "Java / Spring Boot",
    db: "—",
    description:
      "Mottar NIE-hendelser fra RINA via HTTP POST. Publiserer på tre Kafka-topics.",
    detail: {
      role: "Eneste inngang for NIE-hendelser fra RINA CPI. Validerer og fan-outer på tre Kafka-topics. Eneste applikasjon som publiserer disse topicene.",
      inbound: ["RINA CPI (NIE, HTTP POST)"],
      kafkaProduces: [
        "eux-rina-case-events-v1",
        "eux-rina-document-events-v1",
        "eux-rina-notification-events-v1",
      ],
      auth: "Token/shared-secret fra RINA inn; Aiven Kafka ut.",
      patterns: ["Kafka producer"],
    },
  },
  {
    name: "eux-legacy-rina-events",
    tech: "Java / Spring Boot",
    db: "—",
    description:
      "Bro fra nye dokumenthendelser til legacy-topicene sedmottatt-v1 / sedsendt-v1.",
    detail: {
      role: "Bakoverkompatibilitetsbro. Konverterer nye dokument-hendelser til legacy-format slik at eldre konsumenter (eux-fagmodul-journalfoering, eux-person-oppdatering, eessi-pensjon) fortsatt fungerer.",
      kafkaConsumes: ["eux-rina-document-events-v1"],
      kafkaProduces: ["sedmottatt-v1", "sedsendt-v1"],
      patterns: ["Kafka consumer", "Kafka producer"],
    },
  },
];

const workers: App[] = [
  {
    name: "eux-fagmodul-journalfoering",
    tech: "Java / Spring Boot",
    db: "—",
    description:
      "Konsumerer sedmottatt/sedsendt. Auto-journalfører SED-er via Dokarkiv, PDL, eux-nav-rinasak, eux-oppgave.",
    detail: {
      role: "Auto-journalfører innkomne og utgående SED-er. Henter SED-innhold fra eux-rina-api, slår opp person i PDL, oppretter journalpost i Dokarkiv, kobler til fagsak via eux-nav-rinasak og oppretter eventuell oppgave.",
      kafkaConsumes: ["sedmottatt-v1", "sedsendt-v1"],
      outbound: [
        "eux-rina-api",
        "PDL (GraphQL)",
        "SAF (GraphQL)",
        "Dokarkiv (REST)",
        "eux-nav-rinasak",
        "eux-oppgave",
      ],
      auth: "Azure AD client credentials.",
      patterns: ["Kafka consumer", "Caffeine cache", "GraphQL-klient"],
    },
  },
  {
    name: "eux-journalarkivar",
    tech: "Kotlin / Spring Boot",
    db: "—",
    description:
      "Orkestrerer ferdigstilling og feilregistrering av journalposter. Trigges av NAIS-jobber.",
    detail: {
      role: "Ferdigstiller og feilregistrerer journalposter, og reconciler journalstatus mellom eux-nav-rinasak og Dokarkiv når disse har kommet i utakt.",
      inbound: [
        "NAIS-jobb (ferdigstill 01:00)",
        "NAIS-jobb (feilregistrer 02:00)",
      ],
      outbound: [
        "eux-journal",
        "eux-nav-rinasak",
        "eux-oppgave",
        "eux-rina-api",
        "SAF (GraphQL)",
        "Dokarkiv (REST)",
      ],
      auth: "Azure AD client credentials.",
      patterns: ["NAIS-cronjob-trigget", "GraphQL-klient"],
    },
  },
  {
    name: "eux-avslutt-rinasaker",
    tech: "Kotlin / Spring Boot",
    db: "PostgreSQL",
    description:
      "Håndterer livssyklusen for lukking/arkivering av RINA-saker. Trigges av NAIS-jobber.",
    detail: {
      role: "Tilstandsmaskin som styrer lukking, arkivering og opprydding av RINA-saker. Lytter på Kafka for å holde tilstanden oppdatert, og kjører selve operasjonene når NAIS-jobben trigger.",
      inbound: [
        "NAIS-jobb (arkiver 05:00)",
        "NAIS-jobb (sett-uvirksom, til-avslutning, avslutt, slett-dokumentutkast)",
      ],
      outbound: ["eux-rina-terminator-api", "PostgreSQL"],
      kafkaConsumes: [
        "eux-rina-case-events-v1",
        "eux-rina-document-events-v1",
      ],
      auth: "Azure AD client credentials.",
      patterns: ["PostgreSQL", "Flyway", "Kafka consumer", "OpenAPI codegen"],
    },
  },
  {
    name: "eux-slett-usendte-rinasaker",
    tech: "Kotlin / Spring Boot",
    db: "PostgreSQL",
    description:
      "Sletter RINA-saker som aldri fikk en SED. Trigges av NAIS-jobber.",
    detail: {
      role: "Finner og fjerner foreldreløse RINA-saker — saker som ble opprettet men aldri fikk en SED — for å hindre opphopning av utkast.",
      inbound: [
        "NAIS-jobb (slett 01:00, til-sletting 02:00)",
        "NAIS-jobb (månedlig rapport 1. kl 06:00)",
      ],
      outbound: ["eux-rina-terminator-api", "PostgreSQL"],
      kafkaConsumes: [
        "eux-rina-case-events-v1",
        "eux-rina-document-events-v1",
      ],
      auth: "Azure AD client credentials.",
      patterns: ["PostgreSQL", "Flyway", "Kafka consumer", "OpenAPI codegen"],
    },
  },
  {
    name: "eux-adresse-oppdatering",
    tech: "Kotlin / Spring Boot",
    db: "—",
    description:
      "Oppdaterer adresser i PDL når adressedata finnes i innkommende SED-er.",
    detail: {
      role: "Plukker adressedata ut av innkommende SED-er og sender oppdateringer til PDL via PDL-Mottak.",
      kafkaConsumes: ["eux-rina-document-events-v1"],
      outbound: ["PDL-Mottak (REST)", "PDL (GraphQL)", "eux-rina-api"],
      auth: "Azure AD client credentials.",
      patterns: ["Kafka consumer (3 retries → DLT)", "GraphQL-klient"],
    },
  },
  {
    name: "eux-person-oppdatering",
    tech: "Java / Spring Boot",
    db: "PostgreSQL",
    description:
      "Henter utenlandske ID-nummer fra innkommende SED-er og sender oppdateringer til PDL.",
    detail: {
      role: "Ekstraherer utenlandske identifikatorer fra innkommende SED-er og sender oppdateringer til PDL via PDL-Mottak. Sporer oppdateringsstatus i database for idempotens.",
      kafkaConsumes: ["sedmottatt-v1"],
      outbound: [
        "eux-rina-api",
        "PDL-Mottak (REST)",
        "PDL (GraphQL)",
        "PostgreSQL",
      ],
      auth: "Azure AD client credentials.",
      patterns: ["PostgreSQL", "Flyway", "Kafka consumer", "GraphQL-klient"],
    },
  },
  {
    name: "eux-barnetrygd",
    tech: "Java / Spring Boot",
    db: "—",
    description: "Planlagt arbeider for årlig fornyelse av barnetrygdsaker.",
    detail: {
      role: "Schedulert arbeider som starter den årlige fornyelsesrunden av barnetrygdsaker — oppretter oppgaver og forbereder SED-utveksling.",
      outbound: [
        "eux-oppgave",
        "eux-rina-api",
        "eux-nav-rinasak",
        "PDL (GraphQL)",
        "SAF (GraphQL)",
      ],
      auth: "Azure AD client credentials.",
      patterns: ["Scheduled", "GraphQL-klient"],
    },
  },
];

const libs: App[] = [
  {
    name: "eux-parent-pom",
    tech: "Maven parent POM",
    db: "—",
    description:
      "Felles avhengighetsversjoner (Spring Boot, Kotlin, Java, token-validation, PostgreSQL).",
    detail: {
      role: "Felles Maven-parent for alle JVM-tjenester i plattformen. Pinner versjoner på Spring Boot, Kotlin, Java, token-validation, PostgreSQL-driver og testbiblioteker. Endringer her propagerer ved neste bygg.",
      patterns: ["Maven"],
    },
  },
  {
    name: "eux-logging",
    tech: "Kotlin-bibliotek",
    db: "—",
    description:
      "MDC-filter for sporing av request-id og EUX-spesifikk loggekontekst.",
    detail: {
      role: "Logback MDC-filter som propagerer x_request_id på tvers av tjenester og legger til EUX-spesifikke felter (rinasakId, sedId, sedType, bucId, m.fl.) i strukturert logg.",
      patterns: ["Kotlin-bibliotek", "Logback MDC"],
    },
  },
  {
    name: "eux-versions-maven-plugin",
    tech: "Maven-plugin",
    db: "—",
    description:
      "Auto-inkrementerer patch-versjoner fra git-tagger. Brukes i CI/CD.",
    detail: {
      role: "Maven-plugin som auto-inkrementerer patch-versjon basert på siste Git-tag. Kjøres i CI med mvn eux-versions:set-next før release.",
      patterns: ["Maven-plugin", "CI/CD"],
    },
  },
];

function Field({
  label,
  children,
  wide,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={`portal-app__field${wide ? " portal-app__field--wide" : ""}`}
    >
      <div className="portal-app__label">{label}</div>
      {children}
    </div>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="portal-app__list">
      {items.map((it) => (
        <li key={it}>{it}</li>
      ))}
    </ul>
  );
}

function AppCard({ app }: { app: App }) {
  const d = app.detail;
  return (
    <details className="portal-app">
      <summary className="portal-app__summary">
        <BodyShort as="div">
          <span className="portal-app__name">{app.name}</span>
          <span className="portal-app__meta">
            {" — "}
            {app.tech}
            {app.db !== "—" ? ` · ${app.db}` : ""}
          </span>
        </BodyShort>
        <div className="portal-app__desc">{app.description}</div>
      </summary>

      {d && (
        <div className="portal-app__body">
          {d.role && (
            <Field label="Rolle" wide>
              <BodyShort size="small">{d.role}</BodyShort>
            </Field>
          )}

          {d.inbound && d.inbound.length > 0 && (
            <Field label="Inn / triggere">
              <List items={d.inbound} />
            </Field>
          )}

          {d.outbound && d.outbound.length > 0 && (
            <Field label="Ut / avhengigheter">
              <List items={d.outbound} />
            </Field>
          )}

          {d.kafkaConsumes && d.kafkaConsumes.length > 0 && (
            <Field label="Kafka — konsumerer">
              <List items={d.kafkaConsumes} />
            </Field>
          )}

          {d.kafkaProduces && d.kafkaProduces.length > 0 && (
            <Field label="Kafka — produserer">
              <List items={d.kafkaProduces} />
            </Field>
          )}

          {d.auth && (
            <Field label="Autentisering" wide>
              <BodyShort size="small">{d.auth}</BodyShort>
            </Field>
          )}

          {d.patterns && d.patterns.length > 0 && (
            <Field label="Mønstre" wide>
              <div className="portal-app__tags">
                {d.patterns.map((p) => (
                  <span key={p} className="portal-app__tag">
                    {p}
                  </span>
                ))}
              </div>
            </Field>
          )}

          {d.notes && d.notes.length > 0 && (
            <Field label="Merknader" wide>
              <ul className="portal-app__notes">
                {d.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </Field>
          )}

          <Field label="Repo" wide>
            <a
              className="portal-app__github"
              href={`https://github.com/navikt/${app.repo ?? app.name}`}
              target="_blank"
              rel="noreferrer"
            >
              github.com/navikt/{app.repo ?? app.name} ↗
            </a>
          </Field>
        </div>
      )}
    </details>
  );
}

function AppTable({ rows }: { rows: App[] }) {
  return (
    <VStack gap="space-8">
      {rows.map((r) => (
        <AppCard key={r.name} app={r} />
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
          Plattformen består av om lag to dusin små tjenester, organisert i
          fire grupper. Klikk på en applikasjon for å se rolle, avhengigheter,
          Kafka-topics og lenke til repo.
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
