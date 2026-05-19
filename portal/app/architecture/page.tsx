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
  ReadMore,
  GuidePanel,
  Detail,
  Link as DsLink,
} from "@navikt/ds-react";
import {
  SyncFlowDiagram,
  EventFlowDiagram,
  SedLifecycleDiagram,
} from "@/components/Diagrams";

const subtleStyle = { color: "var(--ax-text-subtle, #555)" };
const eyebrowStyle = {
  ...subtleStyle,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
};

const sections = [
  { id: "intro", label: "Hva er EUX?" },
  { id: "eessi", label: "EESSI" },
  { id: "rina", label: "RINA" },
  { id: "sync", label: "Forespørselsflyt" },
  { id: "events", label: "Hendelsesflyt" },
  { id: "lifecycle", label: "SED-livssyklus" },
  { id: "layers", label: "Tjenestelag" },
  { id: "external", label: "Eksterne systemer" },
  { id: "patterns", label: "Mønstre" },
  { id: "pitfalls", label: "Fallgruver" },
  { id: "next", label: "Videre lesing" },
];

function Section({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} style={{ scrollMarginTop: "2rem" }}>
      <VStack gap="space-16">{children}</VStack>
    </section>
  );
}

function Figure({
  caption,
  children,
}: {
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <Box as="figure" style={{ margin: 0 }}>
      <div className="portal-figure">{children}</div>
      <BodyShort
        as="figcaption"
        size="small"
        style={{
          textAlign: "center",
          marginTop: "0.75rem",
          color: "var(--ax-text-subtle, #555)",
        }}
      >
        {caption}
      </BodyShort>
    </Box>
  );
}

export default function ArchitecturePage() {
  return (
    <VStack gap="space-64">
      {/* Hero */}
      <section className="portal-hero">
        <Box
          paddingBlock={{ xs: "space-32", md: "space-48" }}
          paddingInline={{ xs: "space-24", md: "space-48" }}
        >
          <VStack gap="space-16" style={{ maxWidth: "52rem" }}>
            <BodyShort size="small" style={eyebrowStyle}>
              Arkitekturoversikt
            </BodyShort>
            <Heading level="1" size="xlarge">
              Slik snakker EUX med resten av Europa
            </Heading>
            <BodyLong size="large">
              Når noen som bor i Norge har bodd eller jobbet i et annet
              EU/EØS-land — og nå trenger pensjon, sykepenger eller en
              familieytelse — kan ikke NAV bare slå opp svaret i et norsk
              register. Vi må spørre landet de kom fra, og de må spørre
              oss. <strong>EUX</strong> er samlingen av om lag 24 små
              tjenester som gjør de samtalene mulige.
            </BodyLong>
            <HStack gap="space-8" align="center" wrap>
              <Tag size="small" variant="info">EESSI</Tag>
              <Tag size="small" variant="info">RINA</Tag>
              <Tag size="small" variant="info">SED</Tag>
              <Tag size="small" variant="info">BUC</Tag>
              <Tag size="small" variant="info">PDL · Dokarkiv · SAF</Tag>
            </HStack>
          </VStack>
        </Box>
      </section>

      {/* Table of contents */}
      <Box>
        <Detail style={{ marginBottom: "0.5rem", ...subtleStyle }}>
          Hopp til
        </Detail>
        <Chips>
          {sections.map((s) => (
            <Chips.Toggle as="a" href={`#${s.id}`} key={s.id}>
              {s.label}
            </Chips.Toggle>
          ))}
        </Chips>
      </Box>

      {/* Intro */}
      <Section id="intro">
        <Heading level="2" size="large">
          Hva er EUX?
        </Heading>
        <BodyLong size="large" className="portal-prose">
          <strong>EUX</strong> (av og til skrevet <em>EUX/EESSI</em>) er
          NAVs domene for trygdesamordning på tvers av landegrenser.
          Funksjonelt er det et tynt lag NAV-tjenester som sitter mellom
          norske saksbehandlere og den europeiske infrastrukturen som
          heter EESSI/RINA. Driftsmessig eies det av teamet{" "}
          <strong>eessibasis</strong> i NAV.
        </BodyLong>
        <BodyLong className="portal-prose">
          Fra et utviklerperspektiv er EUX om lag to dusin tjenester på
          NAIS — en React/TypeScript-frontend, et knippe
          Spring-Boot-backender i Kotlin og Java, noen Kafka-konsumenter
          og noen planlagte jobber — alle koblet til den norske
          RINA-instansen og en rekke NAV-registre (PDL, Dokarkiv, SAF,
          NAV Oppgave).
        </BodyLong>
        <GuidePanel poster>
          <Heading level="3" size="small" spacing>
            Én setning
          </Heading>
          <BodyLong>
            EUX lar en norsk saksbehandler utveksle strukturerte
            dokumenter (<strong>SED-er</strong>) med
            trygdemyndigheter i andre EU/EØS-land — og holder samtidig
            NAVs egne registre i synk i bakgrunnen.
          </BodyLong>
        </GuidePanel>
      </Section>

      {/* EESSI */}
      <Section id="eessi">
        <Heading level="2" size="large">
          EESSI — det europeiske nettverket
        </Heading>
        <BodyLong className="portal-prose">
          <strong>EESSI</strong> (Electronic Exchange of Social Security
          Information) er EUs nettverk for trygdesamordning på tvers av
          land. Hvert EU/EØS-land har sitt eget nasjonale
          kontaktpunkt. Når NAV trenger informasjon fra for eksempel
          Tyskland, reiser forespørselen over EESSI og når den tyske
          motparten til NAV. Programvaren hvert land kjører på sin side
          av nettverket heter <strong>RINA</strong>.
        </BodyLong>
        <BodyLong className="portal-prose">
          Arbeidsenheten i EESSI er en <strong>BUC</strong> (Business
          Use Case) — for eksempel &laquo;P_BUC_01&raquo; for en
          ordinær pensjonssøknad. En BUC er en liten arbeidsflyt som
          definerer <em>hvilke</em> dokumenter som utveksles,{" "}
          <em>av hvem</em> og <em>i hvilken rekkefølge</em>. Hvert
          dokument i en BUC er en <strong>SED</strong> (Structured
          Electronic Document) med et veldefinert skjema, f.eks.{" "}
          <code>P2000</code> for søknad om alderspensjon.
        </BodyLong>
        <ReadMore header="Mer om EESSI-begrepene">
          <ul className="portal-prose">
            <li>
              <strong>SED</strong> — Structured Electronic Document.
              Selve XML/JSON-meldingen som sendes mellom land.
            </li>
            <li>
              <strong>BUC</strong> — Business Use Case. En arbeidsflyt
              som kjeder sammen et sett SED-er.
            </li>
            <li>
              <strong>RINA</strong> — Reference Implementation of a
              National Application. Den lokale UI-en og serveren hvert
              land bruker for å delta i EESSI.
            </li>
            <li>
              <strong>CPI</strong> — Case Processing Interface.
              REST-API-et til RINA. Det er dette{" "}
              <code>eux-rina-api</code> snakker med.
            </li>
            <li>
              <strong>NIE</strong> — National Interface Endpoint. Slik
              pusher RINA hendelser <em>ut</em> til nasjonale systemer
              — konsumeres av <code>eux-all-rina-events</code>.
            </li>
          </ul>
        </ReadMore>
      </Section>

      {/* RINA */}
      <Section id="rina">
        <Heading level="2" size="large">
          RINA — EU-applikasjonen NAV drifter
        </Heading>
        <BodyLong className="portal-prose">
          RINA leveres av EU-kommisjonen, men hvert medlemsland drifter
          sin egen instans. NAV drifter NAV sin. Fra NAV sitt
          synspunkt er RINA den andre enden av et REST-API
          (<strong>CPI</strong>) og en push-kanal for hendelser
          (<strong>NIE</strong>). Den norske saksbehandleren åpner
          aldri RINA direkte — de bruker <code>eux-web-app</code>, som
          går via NAVs tjenester og først der når RINA.
        </BodyLong>
        <BodyLong className="portal-prose">
          Det ene designvalget — &laquo;NAV-rettet UI på toppen av
          RINA, ikke RINA selv&raquo; — er grunnen til at
          EUX-plattformen har akkurat den formen den har.
        </BodyLong>
      </Section>

      {/* Sync */}
      <Section id="sync">
        <Heading level="2" size="large">
          Forespørselsflyt — hva skjer når en saksbehandler klikker
        </Heading>
        <BodyLong className="portal-prose">
          En saksbehandler åpner <code>eux-web-app</code> i nettleseren.
          Node.js-BFF-en logger dem inn med Azure AD via
          Wonderwall-sidecaren, og sender deretter forespørselen videre
          til <code>eux-neessi</code> med en OAuth2{" "}
          <em>on-behalf-of</em>-token. <code>eux-neessi</code> er
          orkestratoren: den splitter ut til et lite sett spesialiserte
          tjenester og syr svarene sammen igjen.
        </BodyLong>
        <Figure caption="Synkron forespørselsflyt. Heltrukne piler er REST-kall; Node.js-BFF-en til venstre håndterer Azure AD-innlogging.">
          <SyncFlowDiagram />
        </Figure>
        <Accordion>
          <Accordion.Item>
            <Accordion.Header>
              Hva hver tjeneste gjør
            </Accordion.Header>
            <Accordion.Content>
              <ul className="portal-prose">
                <li>
                  <code>eux-web-app</code> — saksbehandler-UI, React +
                  TypeScript. Node.js-BFF-en videresender{" "}
                  <code>/api</code>, <code>/v2</code>–<code>/v5</code>{" "}
                  til <code>eux-neessi</code>.
                </li>
                <li>
                  <code>eux-neessi</code> — orkestrator-BFF i Java +
                  Spring Boot. Kaller alt under.
                </li>
                <li>
                  <code>eux-rina-api</code> — mellomvare mot RINA CPI.
                  Oversetter mellom NAVs SED-format og EU-formatet,
                  genererer PDF, styrer saksforløp.
                </li>
                <li>
                  <code>eux-nav-rinasak</code> — kobler NAV-fagsaker
                  til RINA-saker. Sporer journalstatus per SED.
                  PostgreSQL.
                </li>
                <li>
                  <code>eux-journal</code> — feilregistrering og
                  ferdigstilling av journalposter.
                </li>
                <li>
                  <code>eux-oppgave</code> — integrasjon mot NAV
                  Oppgave.
                </li>
                <li>
                  <code>eux-saksbehandler</code> — lagrer
                  saksbehandlerinnstillinger (favorittenhet osv.).
                </li>
              </ul>
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item>
            <Accordion.Header>
              Hvorfor en BFF foran en BFF?
            </Accordion.Header>
            <Accordion.Content>
              <BodyLong>
                <code>eux-web-app</code> har en Node.js-BFF som
                håndterer innlogging og token-veksling — det er et
                NAV-mønster. <code>eux-neessi</code> er en
                domenespesifikk backend-for-frontend som skjuler den
                EUX-interne tjenestegrafen for frontenden. Resultat:
                React-appen forholder seg til <em>én</em> backend, og
                tjenestene under kan utvikle seg uavhengig.
              </BodyLong>
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item>
            <Accordion.Header>
              Den lange synkrone kjeden — og hva man skal være obs på
            </Accordion.Header>
            <Accordion.Content>
              <BodyLong>
                Ett klikk fra en bruker kan gå{" "}
                <code>web-app → neessi → rina-api → RINA CPI</code>.
                En timeout i RINA forplanter seg hele veien tilbake.
                Vær nøye med timeout-innstillinger i hvert lag, og
                motstå fristelsen å legge til &laquo;bare ett til&raquo;
                synkront kall.
              </BodyLong>
            </Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </Section>

      {/* Events */}
      <Section id="events">
        <Heading level="2" size="large">
          Hendelsesflyt — hva RINA forteller oss, og hvem som lytter
        </Heading>
        <BodyLong className="portal-prose">
          Når noe skjer i RINA — en ny sak opprettes, et dokument kommer
          inn fra et annet land, et varsel fyrer av — pusher RINA en
          hendelse til <code>eux-all-rina-events</code> over HTTP. Den
          tjenesten publiserer hendelsen på Kafka, og derfra gjør en
          liten sky av konsumenter selve arbeidet.
        </BodyLong>
        <Figure caption="Hendelsesflyt. eux-all-rina-events er den eneste inngangen; alt annet er Kafka-konsumenter.">
          <EventFlowDiagram />
        </Figure>
        <Accordion>
          <Accordion.Item>
            <Accordion.Header>De tre hovedtopicene</Accordion.Header>
            <Accordion.Content>
              <ul className="portal-prose">
                <li>
                  <code>eux-rina-case-events-v1</code> —
                  saks-livssyklus. Konsumeres av{" "}
                  <code>eux-rina-case-search</code>,{" "}
                  <code>eux-avslutt-rinasaker</code> og{" "}
                  <code>eux-slett-usendte-rinasaker</code>.
                </li>
                <li>
                  <code>eux-rina-document-events-v1</code> — SED-er
                  som kommer inn og blir sendt. Bygges bro til{" "}
                  <code>sedmottatt-v1</code> /{" "}
                  <code>sedsendt-v1</code> av{" "}
                  <code>eux-legacy-rina-events</code>. Konsumeres også
                  av <code>eux-adresse-oppdatering</code>.
                </li>
                <li>
                  <code>eux-rina-notification-events-v1</code> —
                  brukerrettede varsler. Konsumeres av eksterne
                  systemer (eessi-pensjon m.fl.).
                </li>
              </ul>
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item>
            <Accordion.Header>
              Hvorfor en &laquo;legacy&raquo;-bro?
            </Accordion.Header>
            <Accordion.Content>
              <BodyLong>
                Det nåværende dokumenthendelsesformatet erstattet et
                eldre. For å unngå å bryte alle eksisterende
                konsumenter samtidig leser{" "}
                <code>eux-legacy-rina-events</code> det nye topicet og
                publiserer på nytt til <code>sedmottatt-v1</code> /{" "}
                <code>sedsendt-v1</code>. Eldre tjenester som{" "}
                <code>eux-journalfoering</code>,{" "}
                <code>eux-person-oppdatering</code> og eksterne
                konsumenter (f.eks. eessi-pensjon) lytter fremdeles
                dit.
              </BodyLong>
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item>
            <Accordion.Header>
              Hva &laquo;automatisk journalføring&raquo; faktisk betyr
            </Accordion.Header>
            <Accordion.Content>
              <BodyLong>
                Når en innkommende SED treffer{" "}
                <code>sedmottatt-v1</code>, slår{" "}
                <code>eux-journalfoering</code> personen opp i PDL,
                finner saken i <code>eux-nav-rinasak</code>, skriver
                en journalpost til Dokarkiv og oppretter en oppgave
                for riktig NAV-enhet — alt uten et menneske i loopen,
                så lenge dataene er entydige.
              </BodyLong>
            </Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </Section>

      {/* SED lifecycle */}
      <Section id="lifecycle">
        <Heading level="2" size="large">
          En SED — fra start til slutt
        </Heading>
        <BodyLong className="portal-prose">
          Den samme SED-en kan reise langt på noen timer. Her er den
          lykkelige livssyklusen til en typisk utgående SED.
        </BodyLong>
        <Figure caption="Typisk livssyklus for en utgående SED. Hvert steg eies av en egen EUX-tjeneste.">
          <SedLifecycleDiagram />
        </Figure>
      </Section>

      {/* Layers */}
      <Section id="layers">
        <Heading level="2" size="large">
          Plattformen i fire lag
        </Heading>
        <BodyLong className="portal-prose">
          Mentalt grupperer de ~24 EUX-tjenestene seg i fire lag. Den
          fullstendige tabellen med beskrivelser og lenker finner du på{" "}
          <DsLink href="/applications">applikasjonssiden</DsLink>.
        </BodyLong>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "1rem",
          }}
        >
          {[
            {
              title: "Frontend",
              color: "portal-card portal-card--blue",
              body: "eux-web-app — det eneste saksbehandleren ser. React + TypeScript med en Node.js-BFF.",
            },
            {
              title: "Kjernetjenester",
              color: "portal-card portal-card--green",
              body: "eux-neessi, eux-rina-api, eux-nav-rinasak, eux-journal, eux-oppgave, eux-saksbehandler, eux-rina-terminator-api, eux-rina-case-search.",
            },
            {
              title: "Hendelsesinfrastruktur",
              color: "portal-card portal-card--purple",
              body: "eux-all-rina-events tar RINA-hendelser inn på Kafka; eux-legacy-rina-events bygger bro til det eldre topic-formatet.",
            },
            {
              title: "Arbeidere og jobber",
              color: "portal-card portal-card--orange",
              body: "eux-journalfoering, eux-journalarkivar, eux-avslutt-rinasaker, eux-slett-usendte-rinasaker, eux-adresse-oppdatering, eux-person-oppdatering, eux-barnetrygd — pluss NAIS-jobbene som trigger dem.",
            },
          ].map((c) => (
            <div key={c.title} className={c.color}>
              <Heading level="3" size="small" spacing>
                {c.title}
              </Heading>
              <BodyLong size="small">{c.body}</BodyLong>
            </div>
          ))}
        </div>
      </Section>

      {/* External */}
      <Section id="external">
        <Heading level="2" size="large">
          Eksterne NAV-systemer EUX er avhengig av
        </Heading>
        <Box className="portal-figure">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th align="left" style={{ padding: "0.5rem", borderBottom: "1px solid #ddd" }}>System</th>
                <th align="left" style={{ padding: "0.5rem", borderBottom: "1px solid #ddd" }}>Formål</th>
                <th align="left" style={{ padding: "0.5rem", borderBottom: "1px solid #ddd" }}>Tilgang</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["RINA CPI", "EU-saksbehandlingssystem", "REST · shared-secret JWT eller CAS"],
                ["PDL", "Personregisteret (Folkeregisteret)", "GraphQL · Azure AD"],
                ["PDL-Mottak", "Skrive oppdateringer til PDL", "REST · Azure AD"],
                ["Dokarkiv", "Opprette/oppdatere journalposter", "REST · Azure AD"],
                ["SAF", "Spørre på journalposter og dokumenter", "GraphQL · Azure AD"],
                ["NAV Oppgave", "Oppgavestyring", "REST · Azure AD via eux-oppgave"],
                ["NORG2", "NAVs organisasjonsenheter", "REST · uten autentisering"],
                ["Aa-registeret", "Arbeidsforholdsdata", "REST · Azure AD via eux-neessi"],
                ["A-Inntekt", "Inntektsdata", "REST · Azure AD via eux-neessi"],
              ].map(([s, p, a]) => (
                <tr key={s}>
                  <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>
                    <strong>{s}</strong>
                  </td>
                  <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>{p}</td>
                  <td style={{ padding: "0.5rem", borderBottom: "1px solid #eee" }}>
                    <code>{a}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      </Section>

      {/* Patterns */}
      <Section id="patterns">
        <Heading level="2" size="large">
          Felles mønstre
        </Heading>
        <BodyLong className="portal-prose">
          De fleste EUX-tjenester ser veldig like ut utenfra: Spring
          Boot, Azure AD, NAIS, PostgreSQL (når de er stateful),{" "}
          <code>/actuator/health</code>,{" "}
          <code>/actuator/prometheus</code>. Noen ting varierer
          bevisst.
        </BodyLong>
        <Accordion>
          <Accordion.Item>
            <Accordion.Header>
              Autentisering — hvem snakker med hvem, hvordan
            </Accordion.Header>
            <Accordion.Content>
              <ul className="portal-prose">
                <li>
                  Tjeneste-til-tjeneste: <strong>Azure AD</strong>{" "}
                  OAuth2 client-credentials eller on-behalf-of.
                </li>
                <li>
                  Brukerinnlogging: <strong>Wonderwall</strong>-sidecar
                  foran <code>eux-web-app</code>.
                </li>
                <li>
                  <code>eux-rina-api</code> → RINA CPI: shared-secret
                  JWT, deretter en CAS-billett, deretter en JSESSIONID.
                  Bufret.
                </li>
                <li>
                  <code>eux-rina-terminator-api</code> og{" "}
                  <code>eux-rina-case-search</code> → RINA CPI:
                  systembruker med CAS-billett.
                </li>
              </ul>
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item>
            <Accordion.Header>Persistens</Accordion.Header>
            <Accordion.Content>
              <BodyLong>
                PostgreSQL via GCP Cloud SQL med Flyway-migreringer.
                Brukes av <code>eux-nav-rinasak</code>,{" "}
                <code>eux-journal</code>, <code>eux-oppgave</code>,{" "}
                <code>eux-saksbehandler</code>,{" "}
                <code>eux-rina-case-search</code>,{" "}
                <code>eux-avslutt-rinasaker</code>,{" "}
                <code>eux-slett-usendte-rinasaker</code> og{" "}
                <code>eux-person-oppdatering</code>. Resten er
                stateless.
              </BodyLong>
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item>
            <Accordion.Header>Bygg og avhengigheter</Accordion.Header>
            <Accordion.Content>
              <BodyLong>
                De fleste Kotlin/Java-tjenester arver fra{" "}
                <code>eux-parent-pom</code>, som pinner versjoner for
                Spring Boot, Kotlin, Java, token-validation og
                PostgreSQL. Flere tjenester genererer Spring-controllere
                og DTO-er fra en OpenAPI-spesifikasjon; mindre tjenester
                kobler endepunkter for hånd.
              </BodyLong>
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item>
            <Accordion.Header>Observabilitet</Accordion.Header>
            <Accordion.Content>
              <BodyLong>
                Alle JVM-tjenester eksponerer{" "}
                <code>/actuator/health</code> og{" "}
                <code>/actuator/prometheus</code>.{" "}
                <code>eux-web-app</code> bruker{" "}
                <code>/internal/isAlive</code> og{" "}
                <code>/internal/isReady</code> i stedet. Strukturert
                logging med MDC (<code>x_request_id</code>,{" "}
                <code>rinasakId</code>, <code>sedId</code>,{" "}
                <code>sedType</code>) via det felles biblioteket{" "}
                <code>eux-logging</code>.
              </BodyLong>
            </Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </Section>

      {/* Pitfalls */}
      <Section id="pitfalls">
        <Heading level="2" size="large">
          Fallgruver og ting å passe på
        </Heading>
        <BodyLong className="portal-prose">
          Noen ting har lurt bidragsytere mange nok ganger til at de
          fortjener sin egen liste. Les minst de tre første før du
          endrer noe i <code>eux-rina-api</code>.
        </BodyLong>
        <Accordion>
          <Accordion.Item>
            <Accordion.Header>
              &laquo;ACL&raquo; i eux-rina-api er ikke tilgangsstyring
            </Accordion.Header>
            <Accordion.Content>
              <BodyLong>
                Klassen <code>EessiAcl.java</code> er{" "}
                <strong>transformasjonslaget</strong> for SED-format —
                den konverterer SED-er mellom NAVs interne format og
                EU-formatet ved hjelp av kodemapping og maler. Hvis et
                kodemappingsoppslag feiler, blir verdien stille mappet
                til en <strong>tom streng</strong> og logget som en
                warning. Data kan altså bli borte uten at det blir
                kastet en feil.
              </BodyLong>
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item>
            <Accordion.Header>
              CPI-sesjonsbufferen utløper etter 29 minutter
            </Accordion.Header>
            <Accordion.Content>
              <BodyLong>
                <code>eux-rina-api</code> bufrer CPI-sesjonen i 29
                minutter; RINA utløper den etter 30. Langvarige
                operasjoner (store SED-transformasjoner, polling av
                vedlegg) kan møte autentiseringsfeil hvis de starter
                nær slutten av et buffervindu. Det er ingen automatisk
                refresh — hele 3-stegs-autentiseringen (JWT →
                CAS-billett → JSESSIONID) må gjøres på nytt.
              </BodyLong>
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item>
            <Accordion.Header>
              Action-sjekkene har en race condition
            </Accordion.Header>
            <Accordion.Content>
              <BodyLong>
                Før <code>eux-rina-api</code> oppretter, oppdaterer
                eller sender en SED, kaller den{" "}
                <code>hentMuligeActions()</code> på RINA. Det er ingen
                lås — saksstatusen i RINA kan endre seg mellom sjekken
                og operasjonen, og du får{" "}
                <strong>409 Conflict</strong>. Kallere bør forberedes
                på å forsøke på nytt ved 409.
              </BodyLong>
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item>
            <Accordion.Header>
              Den lange synkrone kjeden
            </Accordion.Header>
            <Accordion.Content>
              <BodyLong>
                <code>web-app → neessi → rina-api → RINA CPI</code> er
                fire hopp, alle synkrone. En treg RINA forplanter seg.
                Vær nøye med timeouts i hvert lag.
              </BodyLong>
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item>
            <Accordion.Header>
              DB-pooler er bevisst små
            </Accordion.Header>
            <Accordion.Content>
              <BodyLong>
                Stateful tjenester kjøres typisk med maks 2 / min 1
                DB-tilkobling. Det er bevisst på NAIS — men det
                betyr at en treg spørring kan blokkere alt annet. Hold
                transaksjonene korte.
              </BodyLong>
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item>
            <Accordion.Header>
              Kafka-konsumenter kan sette seg fast
            </Accordion.Header>
            <Accordion.Content>
              <BodyLong>
                Flere konsumenter commiter manuelt med små poll-størrelser.
                Hvis en melding feiler gjentatte ganger, kan konsumenten
                bli stående på den. <code>eux-adresse-oppdatering</code>{" "}
                prøver 3 ganger og sender deretter til en DLT; andre
                oppfører seg annerledes. Følg med på consumer-lag.
              </BodyLong>
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item>
            <Accordion.Header>
              NAIS-jobber med &laquo;umulig&raquo; schedule
            </Accordion.Header>
            <Accordion.Content>
              <BodyLong>
                Noen jobber leveres med en cron som{" "}
                <code>0 0 31 2 *</code> (31. februar — finnes ikke).
                Det er bevisst: de jobbene skrus på per miljø. Sjekk
                alltid den miljøspesifikke YAML-en, ikke bare base-malen.
              </BodyLong>
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item>
            <Accordion.Header>
              FSS vs. GCP — ekstra ventetid
            </Accordion.Header>
            <Accordion.Content>
              <BodyLong>
                Enkelte eksterne NAV-tjenester (Dokarkiv, SAF, NAV
                Oppgave) nås fortsatt via FSS-public-endepunkter
                (<code>*.prod-fss-pub.nais.io</code>), som gir mer
                ventetid enn kall i klyngen.
              </BodyLong>
            </Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </Section>

      {/* Next */}
      <Section id="next">
        <Heading level="2" size="large">
          Videre lesing
        </Heading>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1.25rem",
          }}
        >
          <a className="portal-card portal-card--blue" href="/applications">
            <Heading level="3" size="small" spacing>
              Bla i alle tjenester
            </Heading>
            <BodyLong size="small">
              Hele applikasjonskatalogen — beskrivelser, teknologi og
              GitHub-lenker.
            </BodyLong>
          </a>
          <a className="portal-card portal-card--purple" href="/environments">
            <Heading level="3" size="small" spacing>
              Miljøer (Q1 og Q2)
            </Heading>
            <BodyLong size="small">
              RINA-instanser, frontend-URL-er, CPI/NIE-endepunkter og
              Swagger-lenker per tjeneste.
            </BodyLong>
          </a>
          <a
            className="portal-card portal-card--green"
            href="https://github.com/navikt/eux-architecture/blob/main/README.md"
            target="_blank"
            rel="noreferrer"
          >
            <Heading level="3" size="small" spacing>
              README.md
            </Heading>
            <BodyLong size="small">
              Det kanoniske, alltid oppdaterte arkitekturdokumentet.
              Les dette før endringer på tvers av tjenester.
            </BodyLong>
          </a>
        </div>
      </Section>
    </VStack>
  );
}
