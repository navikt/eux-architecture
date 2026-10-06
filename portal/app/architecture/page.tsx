"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import NextLink from "next/link";
import { Accordion, BodyLong, BodyShort, Detail, Heading, Link as DsLink, Table } from "@navikt/ds-react";
import { ArrowRightIcon, ClockIcon, ExternalLinkIcon, LightningIcon, ArrowsSquarepathIcon } from "@navikt/aksel-icons";
import { ArchitectureMap } from "@/components/architecture/ArchitectureMap";
import { RequestFlow } from "@/components/architecture/RequestFlow";
import { EventMetro } from "@/components/architecture/EventMetro";
import { NightTimeline } from "@/components/architecture/NightTimeline";
import { Catalogue } from "@/components/architecture/Catalogue";
import { PatternMatrix } from "@/components/architecture/PatternMatrix";
import { useReducedMotion, useScrollSpy } from "@/components/architecture/hooks";
import { JOB_COUNT, NODES, NODE_BY_ID, SERVICE_COUNT, TOPIC_COUNT, incoming } from "@/components/architecture/data";

const SECTIONS = [
  { id: "kart", label: "Kart" },
  { id: "foresporsel", label: "Forespørsler" },
  { id: "hendelser", label: "Hendelser" },
  { id: "planlagt", label: "Planlagt" },
  { id: "tjenester", label: "Tjenester" },
  { id: "eksterne", label: "Eksterne systemer" },
  { id: "monstre", label: "Mønstre" },
  { id: "fallgruver", label: "Fallgruver" },
  { id: "ordliste", label: "Ordliste" },
  { id: "videre", label: "Videre" },
];
const SECTION_IDS = SECTIONS.map((s) => s.id);

/* ---------- Innhold ---------- */

const EXTERNAL: { name: string; what: string; users: string[]; note?: string; verb?: string }[] = [
  {
    name: "RINA CPI",
    what: "RINAs REST-API for saker, SED-er og vedlegg.",
    users: incoming("rina")
      .filter((e) => e.kind === "rest")
      .map((e) => e.from),
    note: "eux-rina-api: shared-secret JWT → CAS-billett → sesjon. De andre: systembruker → CAS-billett.",
  },
  {
    name: "RINA NIE",
    what: "RINA sender sak-, dokument- og varslingshendelser over HTTP.",
    users: ["eux-all-rina-events"],
    verb: "Mottas av",
  },
  ...NODES.filter((n) => n.zone === "nav").map((n) => ({
    name: n.name,
    what: n.summary,
    users: incoming(n.id).map((e) => e.from),
  })),
];

const PITFALLS: { group: string; items: { title: string; body: ReactNode }[] }[] = [
  {
    group: "Plattformen",
    items: [
      {
        title: "Lang synkron kjede",
        body: (
          <>
            <code>eux-web-app → eux-neessi → eux-rina-api → RINA CPI</code>. Treghet eller feil i RINA CPI forplanter seg
            gjennom alle leddene. BFF-en i eux-web-app avbryter kall etter 60 sekunder.
          </>
        ),
      },
      {
        title: "eux-rina-api deles med andre team",
        body: <>eessi-pensjon og melosys-eessi kaller eux-rina-api direkte. Endringer i API-et påvirker mer enn nEESSI.</>,
      },
      {
        title: "De eldre topicene er en offentlig kontrakt",
        body: (
          <>
            <code>sedmottatt-v1</code> og <code>sedsendt-v1</code> leses av eessi-pensjon, melosys-eessi og EUX-tjenester.
            Stopper eux-all-rina-events eller eux-legacy-rina-events, stopper også journalføring og personoppdatering.
            Følg med på consumer lag.
          </>
        ),
      },
      {
        title: "Feilhåndteringen i Kafka varierer",
        body: (
          <>
            eux-fagmodul-journalfoering og eux-person-oppdatering henter én melding om gangen og committer per melding.
            eux-adresse-oppdatering bruker manuell ack og <code>@RetryableTopic</code> (3 forsøk, 15 sekunders pause,
            deretter DLT). eux-rina-case-search har en DLQ for dokumenthendelser. Ikke anta at konsumentene oppfører seg
            likt.
          </>
        ),
      },
      {
        title: "Journalstatusen kan komme ut av synk",
        body: (
          <>
            Journalstatus per SED lagres i eux-nav-rinasak, mens selve journalposten ligger i Dokarkiv. eux-journalarkivar
            avstemmer hver natt: den ferdigstiller poster med status <code>UKJENT</code>, <code>FEILET_FERDIGSTILL</code>{" "}
            eller <code>FEILREGISTRERT</code>, og feilregistrerer <code>UKJENT</code>-poster som er eldre enn 30 dager.
          </>
        ),
      },
      {
        title: "Små connection pools",
        body: (
          <>
            PostgreSQL-tjenestene bruker HikariCP med <code>maximum-pool-size: 2</code> og <code>minimum-idle: 1</code>,
            unntatt eux-rina-case-search (50 / 2). Lange spørringer kan blokkere andre forespørsler.
          </>
        ),
      },
      {
        title: "Innloggingen mot RINA CPI varierer",
        body: (
          <>
            eux-rina-api bruker en shared-secret JWT som byttes mot en CAS-billett. eux-rina-terminator-api,
            eux-rina-case-search, eux-legacy-rina-events og eux-pdf bruker en systembruker (<code>CPI_USERNAME</code> /{" "}
            <code>CPI_PASSWORD</code>). Hemmelighetene forvaltes separat per app.
          </>
        ),
      },
      {
        title: "Tidsplanene til NAIS-jobbene ligger i miljøfiler",
        body: (
          <>
            Felles <code>nais.yaml</code> har plassholderen <code>{"{{ schedule }}"}</code>, som fylles fra en fil per jobb
            og miljø. I dev er rapportjobbene i praksis slått av med <code>0 0 31 2 *</code> (31. februar). Sjekk alltid
            miljøfilen.
          </>
        ),
      },
      {
        title: "FSS-endepunkter",
        body: (
          <>
            PDL, PDL-Mottak, Dokarkiv, SAF, NAV Oppgave, NORG2 og flere nås via <code>*.prod-fss-pub.nais.io</code>. De må
            deklareres som eksterne verter i access policy, ikke som applikasjoner i klyngen.
          </>
        ),
      },
      {
        title: "Mange Azure AD-grupper",
        body: (
          <>
            eux-neessi mapper et stort antall Azure AD-grupper til tilganger – én per fagområde (pensjon, sykdom,
            arbeidsledighet osv.). Feil gruppemedlemskap er en vanlig årsak til tilgangsproblemer.
          </>
        ),
      },
    ],
  },
  {
    group: "eux-rina-api",
    items: [
      {
        title: "«ACL» betyr ikke tilgangskontroll",
        body: (
          <>
            <code>EessiAcl</code> er <strong>formattransformasjonen</strong> av SED-er mellom NAV-format og EU-format, basert
            på maler og kodeverk. Feiler en kodemapping, blir verdien en <strong>tom streng</strong>, og det logges bare en
            advarsel.
          </>
        ),
      },
      {
        title: "CPI-sesjonen bufres",
        body: (
          <>
            Sesjoner bufres i 29 minutter (<code>CPI_SESSION_CACHE</code>), rett under RINAs standard på 30 minutter.
            Innloggingen har tre steg (JWT → CAS-billett → <code>JSESSIONID</code>). Det logges ikke inn på nytt ved 401, så
            en sesjon som RINA har ugyldiggjort, blir liggende i bufferet til den utløper.
          </>
        ),
      },
      {
        title: "Ulike statuskoder når RINA-handlingen mangler",
        body: (
          <>
            Om RINA tillater en operasjon, avhenger av sakens tilstand, som kan endre seg når som helst. Mangler handlingen,
            svarer eux-rina-api <strong>404</strong> (f.eks. ingen handlinger på saken eller ingen send-handling),{" "}
            <strong>409</strong> (ingen gyldig handling under en operasjon) eller <strong>412</strong> (lesehandlingen er
            utilgjengelig ved konvertering til NAV-format), avhengig av endepunktet. Tolk ikke 404 som at saken eller
            dokumentet ikke finnes.
          </>
        ),
      },
      {
        title: "Venting på RINA",
        body: (
          <>
            NIE kan melde om en SED før CPI er klar til å levere den. eux-rina-api spør etter lesehandlingen opptil 10 ganger
            med 1 sekunds mellomrom (hardkodet). Vedlegg polles hvert sekund med en konfigurerbar timeout (standard 120 s),
            og kallet gir <strong>504 Gateway Timeout</strong> når den løper ut.
          </>
        ),
      },
      {
        title: "Vedlegg",
        body: (
          <ul>
            <li>
              Maks 100 MB, håndhevet i <code>CpiAttachmentService</code>. Springs multipart-grenser er ubegrenset (
              <code>-1</code>).
            </li>
            <li>Filtypen valideres bare mot typen klienten oppgir (PDF, JPEG, TIFF, PNG). Innholdet sjekkes ikke.</li>
            <li>
              RINA tolker <code>/</code> og <code>\</code> i filnavn som stier, så de byttes ut med fullbredde{" "}
              <code>／</code> (U+FF0F) og <code>＼</code> (U+FF3C).
            </li>
          </ul>
        ),
      },
      {
        title: "SED-maler og versjoner",
        body: (
          <>
            Maler lastes fra <code>classpath*:/sedtemplates/v*/*/*.json</code> og velges etter SED-type og versjon. Mangler
            malen, feiler kallet med <code>SED_LACKING_TEMPLATE</code>. Utgåtte metoder utleder versjonen fra{" "}
            <code>sedGVer</code>/<code>sedVer</code> (standard 4.1), noe som er upålitelig. Send versjonen eksplisitt.
          </>
        ),
      },
      {
        title: "PDF-genereringen er delt",
        body: (
          <>
            eux-rina-api lager de fleste SED-PDF-er selv med iText. <strong>U020</strong> og <strong>U029</strong> lages av{" "}
            <strong>eux-pdf</strong> (PDFBox), som henter data fra RINA CPI med egen systembruker. Disse to SED-typene har
            derfor en annen avhengighetskjede og andre feilmåter.
          </>
        ),
      },
    ],
  },
];

const GLOSSARY: { term: string; full?: string; text: string }[] = [
  { term: "EESSI", full: "Electronic Exchange of Social Security Information", text: "EUs system for elektronisk utveksling av trygdeinformasjon mellom landene." },
  { term: "RINA", full: "Reference Implementation of a National Application", text: "Europakommisjonens referanseimplementasjon for å behandle EESSI-saker." },
  { term: "CPI", full: "Case Processing Interface", text: "RINAs REST-API." },
  { term: "NIE", full: "National Interface Endpoint", text: "Måten RINA sender hendelser til nasjonale systemer på." },
  { term: "BUC", full: "Business Use Case", text: "En saksprosess i EESSI. En RINA-sak følger én BUC." },
  { term: "SED", full: "Structured Electronic Document", text: "Et strukturert dokument som sendes mellom landene i en BUC." },
  { term: "nEESSI", text: "NAVs saksbehandlerløsning for EESSI: eux-web-app med eux-neessi som backend." },
  { term: "CAS-billett", text: "Innloggingsbilletten RINA krever før den gir en sesjon (JSESSIONID)." },
  { term: "On-behalf-of (OBO)", text: "Tokenveksling i Azure AD der en tjeneste kaller videre på vegne av den innloggede brukeren." },
  { term: "Wonderwall", text: "NAIS-sidecar som håndterer innlogging for nettapplikasjoner." },
  { term: "NAIS", text: "NAVs applikasjonsplattform på Kubernetes. EUX kjører i dev-gcp og prod-gcp." },
  { term: "FSS", text: "NAVs fagsystemsone. Tjenester der nås fra GCP via *.prod-fss-pub.nais.io." },
  { term: "PDL", full: "Persondataløsningen", text: "NAVs kilde til persondata." },
  { term: "SAF", text: "NAVs API for å søke i journalposter og dokumenter." },
  { term: "Dokarkiv", text: "API for å opprette og oppdatere journalposter." },
  { term: "Fagsak", text: "En sak i et av NAVs fagsystemer, f.eks. pensjon eller sykepenger." },
  { term: "Journalpost", text: "Et registrert dokument i arkivet." },
  { term: "Oppgave", text: "En arbeidsoppgave for saksbehandler i NAV Oppgave." },
];

const FURTHER: { href: string; title: string; text: string; external?: boolean }[] = [
  { href: "/applications", title: "Applikasjoner", text: "Rolle, avhengigheter, Kafka-topics og repo for hver applikasjon." },
  { href: "/environments", title: "Miljøer", text: "Testmiljøene Q1 og Q2, med hver sin RINA-instans og frontend." },
  { href: "/prosesser/automatisk-avslutning", title: "Automatisk avslutning", text: "Hvordan inaktive RINA-saker lukkes og arkiveres – med regler per BUC, statuser og nattjobber." },
  { href: "/prosesser/automatisk-sletting", title: "Automatisk sletting", text: "Hvordan saker uten sendt SED slettes etter 15 dager." },
  { href: "/prosesser/journalfoering", title: "Journalføring", text: "Hvordan SED-er journalføres automatisk." },
  { href: "/kafka/sed-hendelser", title: "SED-hendelser", text: "Sanntidsmonitor for sedmottatt og sedsendt i Q1 og Q2." },
  {
    href: "https://github.com/navikt/eux-architecture#readme",
    title: "README på GitHub",
    text: "Den tekstlige arkitekturbeskrivelsen, på engelsk.",
    external: true,
  },
];

/* ---------- Byggeklosser ---------- */

function Section({
  id,
  eyebrow,
  title,
  lead,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  lead?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="arch-section" aria-labelledby={`${id}-title`}>
      <header className="arch-section__head">
        <Detail className="arch-eyebrow">{eyebrow}</Detail>
        <Heading level="2" size="large" id={`${id}-title`}>
          {title}
        </Heading>
        {lead && <BodyLong className="arch-section__lead">{lead}</BodyLong>}
      </header>
      {children}
    </section>
  );
}

function UserChips({ ids, onFocusNode }: { ids: string[]; onFocusNode: (id: string) => void }) {
  return (
    <span className="arch-chips">
      {ids.map((id) => (
        <button key={id} type="button" className="portal-chip arch-chip-btn" onClick={() => onFocusNode(id)} title="Vis i kartet">
          {NODE_BY_ID[id].name}
        </button>
      ))}
    </span>
  );
}

/* ---------- Side ---------- */

export default function ArchitecturePage() {
  const [selected, setSelected] = useState<string | null>(null);
  const active = useScrollSpy(SECTION_IDS);
  const reduced = useReducedMotion();

  const focusNode = useCallback(
    (id: string) => {
      if (!NODE_BY_ID[id]) return;
      setSelected(id);
      document.getElementById("kart")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    },
    [reduced],
  );

  // Deep link from other pages: /architecture?fokus=<node-id>#kart
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("fokus");
    if (!id || !NODE_BY_ID[id]) return;
    const t = window.setTimeout(() => {
      setSelected(id);
      document.getElementById("kart")?.scrollIntoView({ block: "start" });
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="portal-page--wide arch-page">
      <header className="portal-hero arch-hero">
        <div className="arch-hero__text">
          <Detail className="arch-eyebrow">Arkitektur</Detail>
          <Heading level="1" size="xlarge" spacing>
            Slik henger EUX sammen
          </Heading>
          <BodyLong size="large" className="arch-hero__lead">
            EUX er NAVs plattform for EESSI – den elektroniske utvekslingen av trygdeinformasjon med andre land i EU/EØS og
            Sveits. Saksbehandlerne jobber i nEESSI, mens sakene og SED-ene ligger i RINA. EUX binder dette sammen med resten
            av NAV.
          </BodyLong>
        </div>

        <dl className="arch-stats">
          {[
            { n: SERVICE_COUNT, label: "applikasjoner" },
            { n: JOB_COUNT, label: "NAIS-jobber" },
            { n: TOPIC_COUNT, label: "Kafka-topics" },
            { n: 2, label: "NAIS-klynger", sub: "dev-gcp og prod-gcp" },
          ].map((s, i) => (
            <div key={s.label} className="arch-stat" style={{ ["--arch-delay" as string]: `${120 + i * 70}ms` }}>
              <dt>{s.label}</dt>
              <dd>
                <span className="arch-stat__n">{s.n}</span>
                {s.sub && <span className="arch-stat__sub">{s.sub}</span>}
              </dd>
            </div>
          ))}
        </dl>

        <div className="arch-flows">
          <a href="#foresporsel" className="arch-flow-card" data-tone="accent">
            <span className="arch-flow-card__icon" aria-hidden>
              <ArrowsSquarepathIcon />
            </span>
            <span>
              <strong>Forespørsler</strong>
              <span className="arch-flow-card__text">
                Saksbehandler → nEESSI → eux-neessi → eux-rina-api → RINA. Synkront, med tokenveksling i hvert ledd.
              </span>
            </span>
            <ArrowRightIcon aria-hidden className="arch-flow-card__arrow" />
          </a>
          <a href="#hendelser" className="arch-flow-card" data-tone="meta-purple">
            <span className="arch-flow-card__icon" aria-hidden>
              <LightningIcon />
            </span>
            <span>
              <strong>Hendelser</strong>
              <span className="arch-flow-card__text">
                RINA varsler eux-all-rina-events, som publiserer på Kafka. Bakgrunnstjenester og andre team reagerer.
              </span>
            </span>
            <ArrowRightIcon aria-hidden className="arch-flow-card__arrow" />
          </a>
          <a href="#planlagt" className="arch-flow-card" data-tone="warning">
            <span className="arch-flow-card__icon" aria-hidden>
              <ClockIcon />
            </span>
            <span>
              <strong>Planlagt</strong>
              <span className="arch-flow-card__text">
                NAIS-jobber starter journalavstemming, avslutning og sletting om natten.
              </span>
            </span>
            <ArrowRightIcon aria-hidden className="arch-flow-card__arrow" />
          </a>
        </div>
      </header>

      <nav className="arch-jumpnav" aria-label="Innhold på siden">
        <ol>
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} aria-current={active === s.id ? "location" : undefined}>
                {s.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <Section
        id="kart"
        eyebrow="Oversikt"
        title="Arkitekturkartet"
        lead={
          <>
            Alle tjenestene i EUX, gruppert etter ansvar. Linjene mellom sonene samler mange kall i én stamme – velg en boks
            for å se nøyaktig hvem den snakker med. Bruk filteret for å vise bare forespørsler, hendelser eller planlagte
            kjøringer.
          </>
        }
      >
        <ArchitectureMap selected={selected} onSelect={setSelected} />
      </Section>

      <Section
        id="foresporsel"
        eyebrow="Flyt 1 · synkron"
        title="En forespørsel fra saksbehandler til RINA"
        lead="Når en saksbehandler åpner en sak eller sender en SED, går kallet gjennom fire ledd, med egen autentisering i hvert av dem. Gå gjennom stegene, eller trykk «Spill av»."
      >
        <RequestFlow onFocusNode={focusNode} />
      </Section>

      <Section
        id="hendelser"
        eyebrow="Flyt 2 · asynkron"
        title="Hendelser fra RINA"
        lead={
          <>
            RINA sender hendelser via NIE til eux-all-rina-events, som fordeler dem på tre Kafka-topics.
            eux-legacy-rina-events gjør dokumenthendelsene om til det eldre formatet som journalføringen og andre team bygger
            på. Bare disse to tjenestene publiserer til Kafka.
          </>
        }
      >
        <EventMetro onFocusNode={focusNode} />
      </Section>

      <Section
        id="planlagt"
        eyebrow="Flyt 3 · planlagt"
        title="Natten i EUX"
        lead={
          <>
            Tre NAIS-jobber starter arbeid i bakgrunnstjenestene. Jobbene har ingen forretningslogikk – de kaller bare et
            REST-endepunkt i tjenesten. eux-barnetrygd har i stedet en innebygd cron. Klikk på et jobbnavn for å se det i
            kartet.
          </>
        }
      >
        <NightTimeline onFocusNode={focusNode} />
      </Section>

      <Section
        id="tjenester"
        eyebrow="Katalog"
        title="Tjenestene"
        lead={
          <>
            {SERVICE_COUNT} applikasjoner og {JOB_COUNT} NAIS-jobber, gruppert etter lag. Flere detaljer finner du under{" "}
            <DsLink as={NextLink} href="/applications">
              Applikasjoner
            </DsLink>
            .
          </>
        }
      >
        <Catalogue onFocusNode={focusNode} />
      </Section>

      <Section
        id="eksterne"
        eyebrow="Integrasjoner"
        title="Eksterne systemer"
        lead="Systemene utenfor EUX som tjenestene snakker med. «Brukes av» kommer fra samme modell som kartet – klikk på en tjeneste for å se den der."
      >
        <div className="arch-table">
          <Table size="small">
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell scope="col">System</Table.HeaderCell>
                <Table.HeaderCell scope="col">Hva</Table.HeaderCell>
                <Table.HeaderCell scope="col">Brukes av</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {EXTERNAL.map((r) => (
                <Table.Row key={r.name}>
                  <Table.HeaderCell scope="row" style={{ whiteSpace: "nowrap" }}>
                    {r.name}
                  </Table.HeaderCell>
                  <Table.DataCell>
                    {r.what}
                    {r.note && (
                      <BodyShort size="small" className="arch-subtle" style={{ marginTop: 4 }}>
                        {r.note}
                      </BodyShort>
                    )}
                  </Table.DataCell>
                  <Table.DataCell>
                    {r.verb && <span className="arch-subtle">{r.verb} </span>}
                    <UserChips ids={r.users} onFocusNode={focusNode} />
                  </Table.DataCell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      </Section>

      <Section id="monstre" eyebrow="Felles og ulikt" title="Mønstre">
        <div className="arch-patterns">
          <ul className="arch-pattern-list">
            <li>
              <strong>Autentisering.</strong> Kall mellom tjenester bruker Azure AD (client credentials eller on-behalf-of).
              Frontend logger inn via Wonderwall. RINA CPI er unntaket – se eksterne systemer.
            </li>
            <li>
              <strong>Kjøremiljø.</strong> Alle applikasjoner og NAIS-jobber kjører på NAIS i GCP (dev-gcp og prod-gcp).
            </li>
            <li>
              <strong>Helse og metrikker.</strong> JVM-tjenestene eksponerer <code>/actuator/health</code> og{" "}
              <code>/actuator/prometheus</code>. eux-web-app bruker <code>/internal/isAlive</code>,{" "}
              <code>/internal/isReady</code> og <code>/internal/metrics</code>. NAIS-jobbene har ingen helseendepunkter.
            </li>
            <li>
              <strong>Maven-parent.</strong> JVM-tjenestene og NAIS-jobbene arver fra{" "}
              <DsLink href="https://github.com/navikt/eux-parent-pom" target="_blank" rel="noreferrer">
                eux-parent-pom
              </DsLink>
              , unntatt eux-all-rina-events, eux-legacy-rina-events og eux-rina-case-search, som bruker{" "}
              <code>spring-boot-starter-parent</code>.
            </li>
            <li>
              <strong>Strukturert logging.</strong> Alle Kotlin-tjenestene, samt eux-journalarkivar-naisjob og
              eux-slett-usendte-rinasaker-naisjob, bruker{" "}
              <DsLink href="https://github.com/navikt/eux-logging" target="_blank" rel="noreferrer">
                eux-logging
              </DsLink>{" "}
              for MDC-basert sporing. Java-tjenestene gjør det ikke.
            </li>
            <li>
              <strong>Database.</strong> De ni tjenestene med database har hver sin PostgreSQL-instans i Cloud SQL
              (<code>sqlInstances</code> i NAIS-manifestet), med skjemaendringer via Flyway.
            </li>
          </ul>
          <PatternMatrix onFocusNode={focusNode} />
        </div>
      </Section>

      <Section
        id="fallgruver"
        eyebrow="Verdt å vite"
        title="Fallgruver"
        lead="Ting som har overrasket før, og som er lette å gå i igjen."
      >
        <div className="arch-pitfalls">
          {PITFALLS.map((g) => (
            <div key={g.group}>
              <Heading level="3" size="small" spacing>
                {g.group}
              </Heading>
              <Accordion size="small">
                {g.items.map((p) => (
                  <Accordion.Item key={p.title}>
                    <Accordion.Header>{p.title}</Accordion.Header>
                    <Accordion.Content>
                      <BodyLong as="div" size="small">
                        {p.body}
                      </BodyLong>
                    </Accordion.Content>
                  </Accordion.Item>
                ))}
              </Accordion>
            </div>
          ))}
        </div>
      </Section>

      <Section id="ordliste" eyebrow="Begreper" title="Ordliste">
        <dl className="arch-glossary">
          {GLOSSARY.map((g) => (
            <div key={g.term}>
              <dt>
                {g.term}
                {g.full && <span className="arch-glossary__full">{g.full}</span>}
              </dt>
              <dd>{g.text}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section id="videre" eyebrow="Mer" title="Videre lesing">
        <div className="arch-further">
          {FURTHER.map((f) =>
            f.external ? (
              <a key={f.href} href={f.href} target="_blank" rel="noreferrer" className="arch-further__card">
                <strong>
                  {f.title} <ExternalLinkIcon aria-hidden />
                </strong>
                <span>{f.text}</span>
              </a>
            ) : (
              <NextLink key={f.href} href={f.href} className="arch-further__card">
                <strong>
                  {f.title} <ArrowRightIcon aria-hidden />
                </strong>
                <span>{f.text}</span>
              </NextLink>
            ),
          )}
        </div>
      </Section>
    </div>
  );
}
