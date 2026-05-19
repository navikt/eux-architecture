"use client";

import {
  Heading,
  BodyLong,
  BodyShort,
  VStack,
  HStack,
  Box,
  Tag,
  Chips,
  Accordion,
  Detail,
  CopyButton,
} from "@navikt/ds-react";

const subtle = { color: "var(--ax-text-subtle, #555)" };
const eyebrow = {
  ...subtle,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
};

type Env = "q1" | "q2";

type ServiceRow = {
  name: string;
  repo?: string;
  description: string;
  q1?: string;
  q2?: string;
  /** path appended for Swagger UI when API docs exist (typically Spring Boot services) */
  swagger?: string;
};

const services: ServiceRow[] = [
  { name: "nEESSI", repo: "eux-web-app", description: "Frontend for saksbehandlere (servert via eux-neessi-ingressen)", q1: "https://eux-neessi-q1.intern.dev.nav.no/", q2: "https://eux-neessi-q2.intern.dev.nav.no/" },
  { name: "eux-neessi", description: "Backend-for-frontend / orkestrator", q1: "https://eux-neessi-backend-q1.intern.dev.nav.no", q2: "https://eux-neessi-backend-q2.intern.dev.nav.no", swagger: "/swagger-ui/index.html" },
  { name: "eux-rina-api", description: "Mellomvare mot RINA CPI", q1: "https://eux-rina-api-q1.intern.dev.nav.no", q2: "https://eux-rina-api-q2.intern.dev.nav.no", swagger: "/swagger-ui/index.html" },
  { name: "eux-rina-terminator-api", description: "Lukke- og sletteoperasjoner mot RINA", q1: "https://eux-rina-terminator-api-q1.intern.dev.nav.no", q2: "https://eux-rina-terminator-api-q2.intern.dev.nav.no", swagger: "/swagger-ui/index.html" },
  { name: "eux-nav-rinasak", description: "Kobling mellom NAV-fagsaker og RINA-saker", q1: "https://eux-nav-rinasak-q1.intern.dev.nav.no", q2: "https://eux-nav-rinasak-q2.intern.dev.nav.no", swagger: "/swagger-ui/index.html" },
  { name: "eux-journal", description: "Feilregistrering og ferdigstilling av journalposter", q1: "https://eux-journal-q1.intern.dev.nav.no", q2: "https://eux-journal-q2.intern.dev.nav.no", swagger: "/swagger-ui/index.html" },
  { name: "eux-oppgave", description: "Integrasjon mot NAV Oppgave", q1: "https://eux-oppgave-q1.intern.dev.nav.no", q2: "https://eux-oppgave-q2.intern.dev.nav.no", swagger: "/swagger-ui/index.html" },
  { name: "eux-saksbehandler", description: "Saksbehandlerinnstillinger", q1: "https://eux-saksbehandler-q1.intern.dev.nav.no", q2: "https://eux-saksbehandler-q2.intern.dev.nav.no", swagger: "/swagger-ui/index.html" },
  { name: "eux-rina-case-search", description: "Søkeindeks for RINA-saker", q1: "https://eux-rina-case-search-q1.intern.dev.nav.no", q2: "https://eux-rina-case-search-q2.intern.dev.nav.no", swagger: "/swagger-ui/index.html" },
  { name: "eux-all-rina-events", description: "Mottar NIE-hendelser fra RINA og publiserer på Kafka", q1: "https://eux-all-rina-events-q1.intern.dev.nav.no", q2: "https://eux-all-rina-events-q2.intern.dev.nav.no", swagger: "/swagger-ui/index.html" },
  { name: "eux-legacy-rina-events", description: "Bygger bro fra nye dokumenthendelser til legacy-topics", q1: "https://eux-legacy-rina-events-q1.intern.dev.nav.no", q2: "https://eux-legacy-rina-events-q2.intern.dev.nav.no", swagger: "/swagger-ui/index.html" },
  { name: "eux-journalarkivar", description: "Ferdigstiller og feilregistrerer journalposter (kjøres av NAIS-jobber)", q1: "https://eux-journalarkivar-q1.intern.dev.nav.no", q2: "https://eux-journalarkivar-q2.intern.dev.nav.no", swagger: "/swagger-ui/index.html" },
  { name: "eux-avslutt-rinasaker", description: "Lukker og arkiverer RINA-saker", q1: "https://eux-avslutt-rinasaker-q1.intern.dev.nav.no", q2: "https://eux-avslutt-rinasaker-q2.intern.dev.nav.no", swagger: "/swagger-ui/index.html" },
  { name: "eux-slett-usendte-rinasaker", description: "Sletter RINA-saker som aldri fikk SED", q1: "https://eux-slett-usendte-rinasaker-q1.intern.dev.nav.no", q2: "https://eux-slett-usendte-rinasaker-q2.intern.dev.nav.no", swagger: "/swagger-ui/index.html" },
  { name: "eux-adresse-oppdatering", description: "Oppdaterer adresser i PDL fra innkommende SED", q2: "https://eux-adresse-oppdatering-q2.intern.dev.nav.no", swagger: "/swagger-ui/index.html" },
  { name: "eux-person-oppdatering", description: "Sender utenlandske ID-nummer fra SED til PDL", q2: "https://eux-person-oppdatering-q2.intern.dev.nav.no", swagger: "/swagger-ui/index.html" },
  { name: "eux-barnetrygd", description: "Årlig fornyelse av barnetrygdsaker", q1: "https://eux-barnetrygd-q1.intern.dev.nav.no", q2: "https://eux-barnetrygd-q2.intern.dev.nav.no", swagger: "/swagger-ui/index.html" },
];

type EnvDetails = {
  key: Env;
  navn: string;
  badgeColor: string;
  identifikator: string;
  rinaVersjon: string;
  rinaUiUrl: string;
  rinaServer: string;
  innlogging: string;
  frontend: string;
  cpiApp: string;
  cpiUrl: string;
  nieApp: string;
  nieUrl: string;
  ekstra?: { label: string; href: string }[];
  notater?: string;
};

const envs: EnvDetails[] = [
  {
    key: "q1",
    navn: "Q1",
    badgeColor: "#0067c5",
    identifikator: "NO:NAVAT06",
    rinaVersjon: "JINA 2025 V2.1",
    rinaUiUrl: "https://rina-ss4-q.adeo.no",
    rinaServer: "b27apvw175",
    innlogging: "AD-brukere",
    frontend: "https://eux-neessi-q1.intern.dev.nav.no/",
    cpiApp: "eux-rina-api-q1",
    cpiUrl: "https://eux-rina-api-q1.intern.dev.nav.no",
    nieApp: "eux-all-rina-events-q1",
    nieUrl: "https://eux-all-rina-events-q1.intern.dev.nav.no",
  },
  {
    key: "q2",
    navn: "Q2",
    badgeColor: "#634689",
    identifikator: "NO:NAVAT07",
    rinaVersjon: "JINA 2025 v2.1",
    rinaUiUrl: "https://rina-ss1-q.adeo.no",
    rinaServer: "b27apvw171",
    innlogging: "AD-brukere",
    frontend: "https://eux-neessi-q2.intern.dev.nav.no/",
    cpiApp: "eux-rina-api-q2",
    cpiUrl: "https://eux-rina-api-q2.intern.dev.nav.no",
    nieApp: "eux-all-rina-events-q2",
    nieUrl: "https://eux-all-rina-events-q2.intern.dev.nav.no",
    ekstra: [
      { label: "Gosys (test)", href: "https://gosys.dev.intern.nav.no/gosys" },
    ],
    notater: "Purge OK.",
  },
];

function hostnameOf(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname + (u.pathname && u.pathname !== "/" ? u.pathname : "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
}

function UrlLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={href}
      style={{
        fontFamily:
          '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: "0.85rem",
        wordBreak: "break-all",
      }}
    >
      {hostnameOf(href)} ↗
    </a>
  );
}

function MetaRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "110px 1fr",
        gap: "0.75rem",
        alignItems: "baseline",
        paddingBlock: "0.25rem",
      }}
    >
      <BodyShort size="small" style={subtle}>
        {label}
      </BodyShort>
      <div style={{ minWidth: 0 }}>{children}</div>
    </div>
  );
}

function GroupHeading({ children }: { children: React.ReactNode }) {
  return (
    <BodyShort
      size="small"
      style={{
        ...eyebrow,
        fontSize: "0.7rem",
        marginTop: "0.5rem",
        marginBottom: "0.25rem",
      }}
    >
      {children}
    </BodyShort>
  );
}

function EnvCard({ env }: { env: EnvDetails }) {
  return (
    <Box
      borderRadius="12"
      borderWidth="1"
      borderColor="neutral-subtle"
      style={{
        height: "100%",
        overflow: "hidden",
        background: "var(--ax-bg-default, #fff)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "1.25rem 1.5rem",
          background: `linear-gradient(135deg, ${env.badgeColor}14 0%, ${env.badgeColor}06 100%)`,
          borderBottom: "1px solid var(--ax-border-subtle, rgba(0,0,0,0.08))",
          display: "flex",
          gap: "1rem",
          alignItems: "center",
        }}
      >
        <div
          aria-hidden
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: env.badgeColor,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: "1.4rem",
            flexShrink: 0,
            boxShadow: `0 4px 10px ${env.badgeColor}33`,
          }}
        >
          {env.navn}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <Heading level="2" size="small" style={{ margin: 0 }}>
            Testmiljø {env.navn}
          </Heading>
          <HStack gap="space-4" align="center" wrap style={{ marginTop: "0.35rem" }}>
            <Tag size="xsmall" variant="info">
              {env.identifikator}
            </Tag>
            <Tag size="xsmall" variant="neutral">
              {env.rinaVersjon}
            </Tag>
            <Tag size="xsmall" variant="neutral">
              dev-gcp
            </Tag>
          </HStack>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "1rem 1.5rem 1.25rem" }}>
        <GroupHeading>RINA-instans</GroupHeading>
        <MetaRow label="RINA-UI">
          <UrlLink href={env.rinaUiUrl} />
        </MetaRow>
        <MetaRow label="Server">
          <HStack gap="space-4" align="center">
            <code style={{ fontSize: "0.85rem" }}>{env.rinaServer}</code>
            <CopyButton
              copyText={env.rinaServer}
              size="xsmall"
              variant="action"
              title={`Kopier ${env.rinaServer}`}
            />
          </HStack>
        </MetaRow>
        <MetaRow label="Pålogging">
          <BodyShort size="small">{env.innlogging}</BodyShort>
        </MetaRow>

        <GroupHeading>NAV-endepunkter</GroupHeading>
        <MetaRow label="Frontend">
          <UrlLink href={env.frontend} />
        </MetaRow>
        <MetaRow label="CPI">
          <VStack gap="space-0">
            <UrlLink href={env.cpiUrl} />
            <BodyShort size="small" style={subtle}>
              app: <code style={{ fontSize: "0.78rem" }}>{env.cpiApp}</code>
            </BodyShort>
          </VStack>
        </MetaRow>
        <MetaRow label="NIE">
          <VStack gap="space-0">
            <UrlLink href={env.nieUrl} />
            <BodyShort size="small" style={subtle}>
              app: <code style={{ fontSize: "0.78rem" }}>{env.nieApp}</code>
            </BodyShort>
          </VStack>
        </MetaRow>

        {env.ekstra && env.ekstra.length > 0 && (
          <>
            <GroupHeading>Andre lenker</GroupHeading>
            <HStack gap="space-12" wrap>
              {env.ekstra.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: "0.9rem" }}
                >
                  {l.label} ↗
                </a>
              ))}
            </HStack>
          </>
        )}

        {env.notater && (
          <BodyShort
            size="small"
            style={{ ...subtle, marginTop: "0.75rem", fontStyle: "italic" }}
          >
            {env.notater}
          </BodyShort>
        )}
      </div>
    </Box>
  );
}

function ServiceLink({
  url,
  swagger,
}: {
  url?: string;
  swagger?: string;
}) {
  if (!url) {
    return (
      <BodyShort size="small" style={subtle}>
        —
      </BodyShort>
    );
  }
  const baseUrl = url.replace(/\/$/, "");
  return (
    <VStack gap="space-4">
      <BodyShort size="small">
        <a href={url} target="_blank" rel="noreferrer">
          {url.replace("https://", "")}
        </a>
      </BodyShort>
      {swagger && (
        <BodyShort size="small">
          <a href={`${baseUrl}${swagger}`} target="_blank" rel="noreferrer">
            Swagger UI ↗
          </a>
        </BodyShort>
      )}
    </VStack>
  );
}

export default function EnvironmentsPage() {
  return (
    <VStack gap="space-48">
      {/* Hero */}
      <section className="portal-hero">
        <Box
          paddingBlock={{ xs: "space-32", md: "space-48" }}
          paddingInline={{ xs: "space-24", md: "space-48" }}
        >
          <VStack gap="space-16" style={{ maxWidth: "52rem" }}>
            <BodyShort size="small" style={eyebrow}>
              Miljøer
            </BodyShort>
            <Heading level="1" size="xlarge">
              Test- og utviklingsmiljøer
            </Heading>
            <BodyLong size="large">
              Plattformen kjører i to testmiljøer på NAIS: Q1 og Q2.
              Hvert miljø har sin egen Norge-instans av RINA (med egen
              identifikator i EESSI-nettverket), egen frontend for
              saksbehandlere og sin egen kjede av tjenester.
            </BodyLong>
            <HStack gap="space-8" align="center" wrap>
              <Tag size="small" variant="info">
                Q1
              </Tag>
              <Tag size="small" variant="info">
                Q2
              </Tag>
              <BodyShort size="small" style={subtle}>
                Produksjon er ikke dokumentert her — sjekk NAIS-konsollen.
              </BodyShort>
            </HStack>
          </VStack>
        </Box>
      </section>

      {/* Quick nav */}
      <Box>
        <Detail style={{ marginBottom: "0.5rem", ...subtle }}>Hopp til</Detail>
        <Chips>
          <Chips.Toggle as="a" href="#q1">
            Q1
          </Chips.Toggle>
          <Chips.Toggle as="a" href="#q2">
            Q2
          </Chips.Toggle>
          <Chips.Toggle as="a" href="#alle-tjenester">
            Alle tjenester
          </Chips.Toggle>
          <Chips.Toggle as="a" href="#hva-er-forskjellen">
            Hva er forskjellen?
          </Chips.Toggle>
        </Chips>
      </Box>

      {/* Env cards */}
      <section
        id="environments"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "1.5rem",
        }}
      >
        {envs.map((e) => (
          <div key={e.key} id={e.key}>
            <EnvCard env={e} />
          </div>
        ))}
      </section>

      {/* All services table */}
      <section id="alle-tjenester" style={{ scrollMarginTop: "2rem" }}>
        <VStack gap="space-12">
          <Heading level="2" size="large">
            Alle tjenester per miljø
          </Heading>
          <BodyLong className="portal-prose">
            Klikk på en URL for å åpne tjenesten, eller på{" "}
            <strong>Swagger UI</strong> der det er API-dokumentasjon. URL-er
            som mangler betyr at tjenesten ikke er deployet i det miljøet.
          </BodyLong>
          <Box
            padding="space-16"
            borderRadius="12"
            borderWidth="1"
            borderColor="neutral-subtle"
            style={{ overflowX: "auto" }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "720px" }}>
              <thead>
                <tr>
                  <th align="left" style={{ padding: "0.5rem", borderBottom: "1px solid #ddd" }}>
                    Tjeneste
                  </th>
                  <th align="left" style={{ padding: "0.5rem", borderBottom: "1px solid #ddd" }}>
                    Beskrivelse
                  </th>
                  <th align="left" style={{ padding: "0.5rem", borderBottom: "1px solid #ddd" }}>
                    Q1
                  </th>
                  <th align="left" style={{ padding: "0.5rem", borderBottom: "1px solid #ddd" }}>
                    Q2
                  </th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.name}>
                    <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee", verticalAlign: "top" }}>
                      <BodyShort weight="semibold">
                        <a
                          href={`https://github.com/navikt/${s.repo ?? s.name}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {s.name}
                        </a>
                      </BodyShort>
                    </td>
                    <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee", verticalAlign: "top" }}>
                      <BodyShort size="small" style={subtle}>
                        {s.description}
                      </BodyShort>
                    </td>
                    <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee", verticalAlign: "top" }}>
                      <ServiceLink url={s.q1} swagger={s.swagger} />
                    </td>
                    <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee", verticalAlign: "top" }}>
                      <ServiceLink url={s.q2} swagger={s.swagger} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </VStack>
      </section>

      {/* FAQ */}
      <section id="hva-er-forskjellen" style={{ scrollMarginTop: "2rem" }}>
        <VStack gap="space-16">
          <Heading level="2" size="large">
            Hva er forskjellen mellom Q1 og Q2?
          </Heading>
          <Accordion>
            <Accordion.Item>
              <Accordion.Header>
                Hvorfor har vi to testmiljøer?
              </Accordion.Header>
              <Accordion.Content>
                <BodyLong>
                  Hver RINA-instans må registreres i EESSI-nettverket med en
                  unik nasjonal identifikator. Q1 og Q2 har derfor hver sin
                  egen identifikator (<code>NO:NAVAT06</code> og{" "}
                  <code>NO:NAVAT07</code>) og kan teste utveksling mot ulike
                  utenlandske test-institusjoner uavhengig av hverandre. Q1
                  brukes typisk til parallell verifisering opp mot
                  produksjon, mens Q2 er det &laquo;åpne&raquo;
                  utviklingsmiljøet hvor det er lov å rote.
                </BodyLong>
              </Accordion.Content>
            </Accordion.Item>
            <Accordion.Item>
              <Accordion.Header>
                Hvordan logger jeg inn?
              </Accordion.Header>
              <Accordion.Content>
                <BodyLong>
                  Frontenden (<code>nEESSI</code> via{" "}
                  <code>eux-neessi-qN.intern.dev.nav.no</code>) bruker Azure
                  AD med Wonderwall-sidecar. Du logger inn med din vanlige
                  NAV-bruker. RINA-UI-ene (<code>rina-ss4-q.adeo.no</code> og{" "}
                  <code>rina-ss1-q.adeo.no</code>) bruker AD-brukere over
                  HTTPS — disse er kun tilgjengelige fra NAV-nettet.
                </BodyLong>
              </Accordion.Content>
            </Accordion.Item>
            <Accordion.Item>
              <Accordion.Header>
                Hvor finner jeg API-dokumentasjonen?
              </Accordion.Header>
              <Accordion.Content>
                <BodyLong>
                  Backendene som bruker springdoc har Swagger UI på{" "}
                  <code>/swagger-ui/index.html</code> i Q1 og Q2 (slått
                  av i produksjon). Bruk lenkene i tabellen over —{" "}
                  &laquo;Swagger UI ↗&raquo; under hver tjeneste. Tilgang
                  krever NAV-pålogging via Wonderwall.
                </BodyLong>
              </Accordion.Content>
            </Accordion.Item>
            <Accordion.Item>
              <Accordion.Header>
                Hva betyr CPI og NIE?
              </Accordion.Header>
              <Accordion.Content>
                <BodyLong>
                  CPI (Case Processing Interface) er REST-API-et RINA
                  tilbyr <em>inn</em> mot seg — <code>eux-rina-api</code>{" "}
                  snakker med dette på vegne av alle tjenestene som
                  trenger å lese eller skrive SED-er. NIE (National
                  Interface Endpoint) er motsatt vei: hendelseskanalen
                  RINA pusher hendelser <em>ut</em> på. NAV mottar disse
                  via <code>eux-all-rina-events</code> og legger dem på
                  Kafka.
                </BodyLong>
              </Accordion.Content>
            </Accordion.Item>
            <Accordion.Item>
              <Accordion.Header>
                Hvor er produksjon?
              </Accordion.Header>
              <Accordion.Content>
                <BodyLong>
                  Produksjonsmiljøet er bevisst <em>ikke</em> dokumentert i
                  denne portalen — for å redusere sjansen for at noen åpner
                  feil lenke. Bruk{" "}
                  <a
                    href="https://console.nav.cloud.nais.io"
                    target="_blank"
                    rel="noreferrer"
                  >
                    NAIS-konsollen
                  </a>{" "}
                  for å finne produksjonsendepunkter.
                </BodyLong>
              </Accordion.Content>
            </Accordion.Item>
          </Accordion>
        </VStack>
      </section>
    </VStack>
  );
}
