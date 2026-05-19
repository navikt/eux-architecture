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
  { id: "intro", label: "What is EUX?" },
  { id: "eessi", label: "EESSI" },
  { id: "rina", label: "RINA" },
  { id: "sync", label: "Request flow" },
  { id: "events", label: "Event flow" },
  { id: "lifecycle", label: "SED lifecycle" },
  { id: "layers", label: "Service layers" },
  { id: "external", label: "External systems" },
  { id: "patterns", label: "Patterns" },
  { id: "pitfalls", label: "Pitfalls" },
  { id: "next", label: "Where to go next" },
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
              Architecture overview
            </BodyShort>
            <Heading level="1" size="xlarge">
              How EUX talks to Europe
            </Heading>
            <BodyLong size="large">
              When someone in Norway has lived or worked in another EU/EEA
              country — and now needs a pension, a sickness benefit, a
              family allowance — NAV cannot just look the answer up in a
              Norwegian register. We have to ask the country they came
              from, and they have to ask us. <strong>EUX</strong> is the
              collection of ~24 small services that makes those
              conversations possible.
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
          Jump to
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
          What is EUX?
        </Heading>
        <BodyLong size="large" className="portal-prose">
          <strong>EUX</strong> (sometimes written <em>EUX/EESSI</em>) is
          NAV&rsquo;s domain for cross-border social-security
          coordination. Functionally it is a thin layer of NAV services
          that sit between Norwegian caseworkers and the European
          infrastructure called EESSI/RINA. Operationally it is owned by
          the team <strong>eessibasis</strong> in NAV.
        </BodyLong>
        <BodyLong className="portal-prose">
          From a developer&rsquo;s perspective, EUX is roughly two dozen
          services on NAIS — a React/TypeScript frontend, a few
          Spring-Boot backends in Kotlin and Java, a handful of Kafka
          consumers, and some scheduled jobs — all wired into the
          Norwegian instance of RINA and a number of NAV registers (PDL,
          Dokarkiv, SAF, NAV Oppgave).
        </BodyLong>
        <GuidePanel poster>
          <Heading level="3" size="small" spacing>
            One sentence
          </Heading>
          <BodyLong>
            EUX lets a Norwegian caseworker exchange structured documents
            (<strong>SEDs</strong>) with social-security institutions in
            other EU/EEA countries — and quietly keeps NAV&rsquo;s
            registers in sync while it happens.
          </BodyLong>
        </GuidePanel>
      </Section>

      {/* EESSI */}
      <Section id="eessi">
        <Heading level="2" size="large">
          EESSI — the European network
        </Heading>
        <BodyLong className="portal-prose">
          <strong>EESSI</strong> (Electronic Exchange of Social Security
          Information) is the EU&rsquo;s network for cross-border social
          security. Every EU/EEA country has a national connection point.
          When NAV needs information from, say, Germany, the request
          travels over EESSI and reaches the German equivalent of NAV.
          The piece of software each country runs on its side of the
          network is called <strong>RINA</strong>.
        </BodyLong>
        <BodyLong className="portal-prose">
          The unit of work in EESSI is a <strong>BUC</strong> (Business
          Use Case) — for example &ldquo;P_BUC_01&rdquo; for a basic
          pension claim. A BUC is a small workflow that defines{" "}
          <em>which</em> documents are exchanged, <em>by whom</em>, and{" "}
          <em>in which order</em>. Each document inside a BUC is a{" "}
          <strong>SED</strong> (Structured Electronic Document) with a
          well-defined schema, e.g.{" "}
          <code>P2000</code> for a claim for old-age pension.
        </BodyLong>
        <ReadMore header="More on the EESSI domain language">
          <ul className="portal-prose">
            <li>
              <strong>SED</strong> — Structured Electronic Document.
              The actual XML/JSON message passed between countries.
            </li>
            <li>
              <strong>BUC</strong> — Business Use Case. A workflow that
              chains a set of SEDs together.
            </li>
            <li>
              <strong>RINA</strong> — Reference Implementation of a
              National Application. The local UI/server every country
              uses to participate in EESSI.
            </li>
            <li>
              <strong>CPI</strong> — Case Processing Interface.
              RINA&rsquo;s REST API. This is what NAV&rsquo;s
              <code> eux-rina-api</code> talks to.
            </li>
            <li>
              <strong>NIE</strong> — National Interface Endpoint. How
              RINA pushes events <em>out</em> to national systems —
              consumed by <code>eux-all-rina-events</code>.
            </li>
          </ul>
        </ReadMore>
      </Section>

      {/* RINA */}
      <Section id="rina">
        <Heading level="2" size="large">
          RINA — the EU app NAV operates
        </Heading>
        <BodyLong className="portal-prose">
          RINA is delivered by the European Commission, but each member
          state runs its own instance. NAV hosts NAV&rsquo;s. From
          NAV&rsquo;s point of view, RINA is the other end of a REST API
          (<strong>CPI</strong>) and an event push channel
          (<strong>NIE</strong>). The Norwegian caseworker never opens
          RINA directly — they use{" "}
          <code>eux-web-app</code>, which goes through NAV&rsquo;s
          services and only then reaches RINA.
        </BodyLong>
        <BodyLong className="portal-prose">
          That single design choice — &ldquo;NAV-facing UI on top of
          RINA, not RINA itself&rdquo; — is the reason the EUX platform
          exists in the shape it does.
        </BodyLong>
      </Section>

      {/* Sync */}
      <Section id="sync">
        <Heading level="2" size="large">
          Request flow — what happens when a caseworker clicks
        </Heading>
        <BodyLong className="portal-prose">
          A caseworker opens <code>eux-web-app</code> in their browser.
          The frontend&rsquo;s Node.js BFF logs them in with Azure AD via
          the Wonderwall sidecar, then proxies the request to{" "}
          <code>eux-neessi</code> using an OAuth2{" "}
          <em>on-behalf-of</em> token. <code>eux-neessi</code> is the
          orchestrator: it fans out to a small set of focused services
          and stitches the answers back together.
        </BodyLong>
        <Figure caption="Synchronous request flow. Solid arrows are REST calls; the Node.js BFF on the left handles Azure AD login.">
          <SyncFlowDiagram />
        </Figure>
        <Accordion>
          <Accordion.Item>
            <Accordion.Header>What each service does</Accordion.Header>
            <Accordion.Content>
              <ul className="portal-prose">
                <li>
                  <code>eux-web-app</code> — caseworker UI, React +
                  TypeScript. Node.js BFF proxies <code>/api</code>,
                  <code> /v2</code>–<code>/v5</code> to{" "}
                  <code>eux-neessi</code>.
                </li>
                <li>
                  <code>eux-neessi</code> — orchestrator BFF in Java +
                  Spring Boot. Calls everything below.
                </li>
                <li>
                  <code>eux-rina-api</code> — middleware to RINA CPI.
                  Translates between NAV&rsquo;s SED format and the EU
                  format, generates PDFs, manages case lifecycle.
                </li>
                <li>
                  <code>eux-nav-rinasak</code> — links NAV fagsaker to
                  RINA cases. Tracks per-SED journal status. PostgreSQL.
                </li>
                <li>
                  <code>eux-journal</code> — error-registration
                  (feilregistrering) and finalization (ferdigstilling)
                  of journal posts.
                </li>
                <li>
                  <code>eux-oppgave</code> — integration to NAV Oppgave.
                </li>
                <li>
                  <code>eux-saksbehandler</code> — stores caseworker
                  preferences (favourite unit, etc.).
                </li>
              </ul>
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item>
            <Accordion.Header>
              Why a BFF in front of a BFF?
            </Accordion.Header>
            <Accordion.Content>
              <BodyLong>
                <code>eux-web-app</code> has a Node.js BFF that handles
                login and token exchange — that is a NAV-wide pattern.{" "}
                <code>eux-neessi</code> is a domain-level
                backend-for-frontend that hides the EUX-internal service
                graph from the frontend. The result: the React app only
                needs to know about <em>one</em> backend, and the
                downstream services can evolve independently.
              </BodyLong>
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item>
            <Accordion.Header>
              The deep call chain — and what to watch out for
            </Accordion.Header>
            <Accordion.Content>
              <BodyLong>
                A single user click can travel{" "}
                <code>web-app → neessi → rina-api → RINA CPI</code>. A
                timeout in RINA cascades all the way back. Be careful
                with timeout settings at each layer and resist the urge
                to add &ldquo;just one more&rdquo; synchronous hop.
              </BodyLong>
            </Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </Section>

      {/* Events */}
      <Section id="events">
        <Heading level="2" size="large">
          Event flow — what RINA tells us, and who listens
        </Heading>
        <BodyLong className="portal-prose">
          When something happens in RINA — a new case is created, a
          document arrives from another country, a notification fires —
          RINA pushes an event to <code>eux-all-rina-events</code> over
          HTTP. That service publishes it onto Kafka, and from there a
          small cloud of consumers does the actual work.
        </BodyLong>
        <Figure caption="Event flow. eux-all-rina-events is the only ingress; everything else is a Kafka consumer.">
          <EventFlowDiagram />
        </Figure>
        <Accordion>
          <Accordion.Item>
            <Accordion.Header>
              The three primary topics
            </Accordion.Header>
            <Accordion.Content>
              <ul className="portal-prose">
                <li>
                  <code>eux-rina-case-events-v1</code> — case lifecycle.
                  Consumed by{" "}
                  <code>eux-rina-case-search</code>,{" "}
                  <code>eux-avslutt-rinasaker</code>,{" "}
                  <code>eux-slett-usendte-rinasaker</code>.
                </li>
                <li>
                  <code>eux-rina-document-events-v1</code> — SEDs
                  arriving and being sent. Bridged to{" "}
                  <code>sedmottatt-v1</code> / <code>sedsendt-v1</code>{" "}
                  by <code>eux-legacy-rina-events</code>. Also consumed
                  by <code>eux-adresse-oppdatering</code>.
                </li>
                <li>
                  <code>eux-rina-notification-events-v1</code> —
                  user-facing notifications. Consumed by external
                  systems (eessi-pensjon, etc.).
                </li>
              </ul>
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item>
            <Accordion.Header>
              Why a &ldquo;legacy&rdquo; bridge?
            </Accordion.Header>
            <Accordion.Content>
              <BodyLong>
                The current document-event format replaced an older
                one. To avoid breaking every existing consumer at once,{" "}
                <code>eux-legacy-rina-events</code> reads the new topic
                and re-publishes onto <code>sedmottatt-v1</code> /{" "}
                <code>sedsendt-v1</code>. Older services like{" "}
                <code>eux-journalfoering</code>,{" "}
                <code>eux-person-oppdatering</code> and external
                consumers (e.g. eessi-pensjon) still listen to those.
              </BodyLong>
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item>
            <Accordion.Header>
              What &ldquo;auto-journaling&rdquo; actually means
            </Accordion.Header>
            <Accordion.Content>
              <BodyLong>
                When an incoming SED hits{" "}
                <code>sedmottatt-v1</code>,{" "}
                <code>eux-journalfoering</code> looks the person up in
                PDL, looks the case up in <code>eux-nav-rinasak</code>,
                writes a journal post to Dokarkiv, and creates an
                Oppgave for the right NAV unit — all without a human in
                the loop, as long as the data is unambiguous.
              </BodyLong>
            </Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </Section>

      {/* SED lifecycle */}
      <Section id="lifecycle">
        <Heading level="2" size="large">
          A SED, from start to finish
        </Heading>
        <BodyLong className="portal-prose">
          The same SED can travel a long way in a few hours. Here is the
          happy-path lifecycle of a typical outgoing SED.
        </BodyLong>
        <Figure caption="Typical outgoing SED lifecycle. Each step is owned by a different EUX service.">
          <SedLifecycleDiagram />
        </Figure>
      </Section>

      {/* Layers */}
      <Section id="layers">
        <Heading level="2" size="large">
          The platform in four layers
        </Heading>
        <BodyLong className="portal-prose">
          Mentally, the ~24 EUX services group into four layers. The
          full table with descriptions and links lives on{" "}
          <DsLink href="/applications">the Applications page</DsLink>.
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
              body: "eux-web-app — the only thing the caseworker sees. React + TypeScript with a Node.js BFF.",
            },
            {
              title: "Core services",
              color: "portal-card portal-card--green",
              body: "eux-neessi, eux-rina-api, eux-nav-rinasak, eux-journal, eux-oppgave, eux-saksbehandler, eux-rina-terminator-api, eux-rina-case-search.",
            },
            {
              title: "Event infrastructure",
              color: "portal-card portal-card--purple",
              body: "eux-all-rina-events brings RINA events into Kafka; eux-legacy-rina-events bridges to the older topic format.",
            },
            {
              title: "Workers & jobs",
              color: "portal-card portal-card--orange",
              body: "eux-journalfoering, eux-journalarkivar, eux-avslutt-rinasaker, eux-slett-usendte-rinasaker, eux-adresse-oppdatering, eux-person-oppdatering, eux-barnetrygd — plus their NAIS-job cron triggers.",
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
          External NAV systems EUX depends on
        </Heading>
        <Box className="portal-figure">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th align="left" style={{ padding: "0.5rem", borderBottom: "1px solid #ddd" }}>System</th>
                <th align="left" style={{ padding: "0.5rem", borderBottom: "1px solid #ddd" }}>Purpose</th>
                <th align="left" style={{ padding: "0.5rem", borderBottom: "1px solid #ddd" }}>Access</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["RINA CPI", "EU case management", "REST · shared-secret JWT or CAS"],
                ["PDL", "Person registry (Folkeregisteret)", "GraphQL · Azure AD"],
                ["PDL-Mottak", "Write updates to PDL", "REST · Azure AD"],
                ["Dokarkiv", "Create/update journal posts", "REST · Azure AD"],
                ["SAF", "Query journal posts and documents", "GraphQL · Azure AD"],
                ["NAV Oppgave", "Task management", "REST · Azure AD via eux-oppgave"],
                ["NORG2", "NAV organisational units", "REST · no auth"],
                ["Aa-registeret", "Employment data", "REST · Azure AD via eux-neessi"],
                ["A-Inntekt", "Income data", "REST · Azure AD via eux-neessi"],
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
          Common patterns
        </Heading>
        <BodyLong className="portal-prose">
          Most EUX services look very similar from the outside: Spring
          Boot, Azure AD, NAIS, PostgreSQL (when stateful),{" "}
          <code>/actuator/health</code>,{" "}
          <code>/actuator/prometheus</code>. A few things vary
          deliberately.
        </BodyLong>
        <Accordion>
          <Accordion.Item>
            <Accordion.Header>
              Authentication — who talks to whom, how
            </Accordion.Header>
            <Accordion.Content>
              <ul className="portal-prose">
                <li>
                  Service-to-service: <strong>Azure AD</strong> OAuth2
                  client-credentials or on-behalf-of.
                </li>
                <li>
                  Frontend login: <strong>Wonderwall</strong> sidecar in
                  front of <code>eux-web-app</code>.
                </li>
                <li>
                  <code>eux-rina-api</code> → RINA CPI: shared-secret
                  JWT, then a CAS ticket, then a JSESSIONID. Cached.
                </li>
                <li>
                  <code>eux-rina-terminator-api</code>,{" "}
                  <code>eux-rina-case-search</code> → RINA CPI: service
                  user credentials with CAS tickets.
                </li>
              </ul>
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item>
            <Accordion.Header>Persistence</Accordion.Header>
            <Accordion.Content>
              <BodyLong>
                PostgreSQL via GCP Cloud SQL, with Flyway migrations.
                Used by <code>eux-nav-rinasak</code>,{" "}
                <code>eux-journal</code>, <code>eux-oppgave</code>,{" "}
                <code>eux-saksbehandler</code>,{" "}
                <code>eux-rina-case-search</code>,{" "}
                <code>eux-avslutt-rinasaker</code>,{" "}
                <code>eux-slett-usendte-rinasaker</code> and{" "}
                <code>eux-person-oppdatering</code>. Everything else is
                stateless.
              </BodyLong>
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item>
            <Accordion.Header>Build & dependencies</Accordion.Header>
            <Accordion.Content>
              <BodyLong>
                Most Kotlin/Java services inherit from{" "}
                <code>eux-parent-pom</code>, which pins Spring Boot,
                Kotlin, Java, token-validation and PostgreSQL versions.
                Several services generate Spring controllers and DTOs
                from an OpenAPI spec; smaller services wire endpoints
                by hand.
              </BodyLong>
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item>
            <Accordion.Header>Observability</Accordion.Header>
            <Accordion.Content>
              <BodyLong>
                Every JVM service exposes <code>/actuator/health</code>{" "}
                and <code>/actuator/prometheus</code>.{" "}
                <code>eux-web-app</code> uses{" "}
                <code>/internal/isAlive</code> and{" "}
                <code>/internal/isReady</code> instead. Structured
                logging with MDC (<code>x_request_id</code>,{" "}
                <code>rinasakId</code>, <code>sedId</code>,{" "}
                <code>sedType</code>) via the shared{" "}
                <code>eux-logging</code> library.
              </BodyLong>
            </Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </Section>

      {/* Pitfalls */}
      <Section id="pitfalls">
        <Heading level="2" size="large">
          Pitfalls and gotchas
        </Heading>
        <BodyLong className="portal-prose">
          A handful of things have caught contributors out enough times
          that they deserve their own list. Read at least the first
          three before changing anything in <code>eux-rina-api</code>.
        </BodyLong>
        <Accordion>
          <Accordion.Item>
            <Accordion.Header>
              &ldquo;ACL&rdquo; in eux-rina-api is not access control
            </Accordion.Header>
            <Accordion.Content>
              <BodyLong>
                The class <code>EessiAcl.java</code> is the SED format{" "}
                <strong>transformation</strong> layer — it converts
                SEDs between NAV&rsquo;s internal format and the EU
                format using code mappings and templates. If a code
                mapping lookup fails, the value is silently mapped to
                an <strong>empty string</strong> and logged as a
                warning. Data can be lost without any error being
                raised.
              </BodyLong>
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item>
            <Accordion.Header>
              CPI session cache expires at 29 minutes
            </Accordion.Header>
            <Accordion.Content>
              <BodyLong>
                <code>eux-rina-api</code> caches the CPI session for 29
                minutes; RINA expires it at 30. Long-running operations
                (big SED transforms, attachment polling) can hit auth
                failures if they start near the end of a cache window.
                There is no automatic refresh — the full 3-step auth
                (JWT → CAS ticket → JSESSIONID) is repeated.
              </BodyLong>
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item>
            <Accordion.Header>
              Action checks have a race condition
            </Accordion.Header>
            <Accordion.Content>
              <BodyLong>
                Before creating, updating or sending a SED,{" "}
                <code>eux-rina-api</code> calls{" "}
                <code>hentMuligeActions()</code> on RINA. There is no
                lock — the case state can change between the check and
                the operation, producing <strong>409 Conflict</strong>.
                Callers should retry on 409.
              </BodyLong>
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item>
            <Accordion.Header>
              The deep synchronous call chain
            </Accordion.Header>
            <Accordion.Content>
              <BodyLong>
                <code>
                  web-app → neessi → rina-api → RINA CPI
                </code>{" "}
                is four hops, all synchronous. A slow RINA cascades.
                Pay close attention to timeouts at each layer.
              </BodyLong>
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item>
            <Accordion.Header>
              Database connection pools are small on purpose
            </Accordion.Header>
            <Accordion.Content>
              <BodyLong>
                Stateful services typically run with max 2 / min 1 DB
                connection. That is intentional on NAIS — but it means
                a slow query can block everything else. Keep
                transactions short.
              </BodyLong>
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item>
            <Accordion.Header>
              Kafka consumers can get stuck
            </Accordion.Header>
            <Accordion.Content>
              <BodyLong>
                Several consumers commit manually with small poll
                sizes. If a message keeps failing, the consumer can
                wedge on it.{" "}
                <code>eux-adresse-oppdatering</code> retries 3 times
                then ships to a DLT; others behave differently. Monitor
                consumer lag.
              </BodyLong>
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item>
            <Accordion.Header>
              NAIS-job schedules that &ldquo;never fire&rdquo;
            </Accordion.Header>
            <Accordion.Content>
              <BodyLong>
                Some jobs ship with a cron like{" "}
                <code>0 0 31 2 *</code> (February 31st — never). That
                is intentional: those jobs are enabled per environment.
                Always check the env-specific YAML, not just the base
                template.
              </BodyLong>
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item>
            <Accordion.Header>
              FSS vs GCP — extra latency
            </Accordion.Header>
            <Accordion.Content>
              <BodyLong>
                A few external NAV services (Dokarkiv, SAF, NAV
                Oppgave) are still accessed via FSS public endpoints
                (<code>*.prod-fss-pub.nais.io</code>), which adds
                latency vs in-cluster calls.
              </BodyLong>
            </Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </Section>

      {/* Next */}
      <Section id="next">
        <Heading level="2" size="large">
          Where to go next
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
              Browse every service
            </Heading>
            <BodyLong size="small">
              The full Applications catalogue — descriptions, tech,
              GitHub links.
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
              The canonical, always-current architecture document.
              Read this before any cross-service change.
            </BodyLong>
          </a>
          <a
            className="portal-card portal-card--purple"
            href="https://eux-rina-gateway-portal-q1.intern.dev.nav.no"
            target="_blank"
            rel="noreferrer"
          >
            <Heading level="3" size="small" spacing>
              RINA Gateway portal
            </Heading>
            <BodyLong size="small">
              Live status, smoke tests, and the story of the gateway
              replacement.
            </BodyLong>
          </a>
        </div>
      </Section>
    </VStack>
  );
}
