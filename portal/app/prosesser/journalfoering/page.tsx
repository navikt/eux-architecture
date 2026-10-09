"use client";

import { useCallback, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import NextLink from "next/link";
import { Accordion, BodyLong, BodyShort, CopyButton, Detail, Heading, Table } from "@navikt/ds-react";
import { ArrowRightIcon, ExternalLinkIcon, HourglassIcon, MoonIcon, TestFlaskIcon } from "@navikt/aksel-icons";
import { useReducedMotion, useScrollSpy } from "@/components/architecture/hooks";
import { archHref, ghHref } from "@/components/avslutning/tones";
import {
  BEHANDLES,
  BEHANDLINGSTEMA_ROWS,
  BEHANDLINGSTYPE_ROWS,
  DEFAULT_INPUT,
  JOBS,
  OPPGAVETYPER,
  OPPGAVE_ROWS,
  SEKTOR_BY_ID,
  STATUSES,
  TEMA_ROWS,
  presetInput,
  simulate,
  type EnhetRule,
  type SimInput,
  type StatusId,
  type Tone,
} from "@/components/journalfoering/data";
import { StatusChips } from "@/components/journalfoering/StatusChips";
import { SystemFlow } from "@/components/journalfoering/SystemFlow";
import { Simulator } from "@/components/journalfoering/Simulator";
import { EnhetCascade } from "@/components/journalfoering/EnhetCascade";
import { CaseStory } from "@/components/journalfoering/CaseStory";
import { StatusMachine } from "@/components/journalfoering/StatusMachine";
import { NightJobs } from "@/components/journalfoering/NightJobs";
import { ManualFlows } from "@/components/journalfoering/ManualFlows";

const SECTIONS = [
  { id: "system", label: "Systemet" },
  { id: "simulator", label: "Prøv en SED" },
  { id: "regler", label: "Tema og enhet" },
  { id: "ferdigstilling", label: "Midlertidig eller ferdig" },
  { id: "statuser", label: "Statuser" },
  { id: "natten", label: "Natten" },
  { id: "manuelt", label: "Fra nEESSI" },
  { id: "feil", label: "Feil" },
  { id: "drift", label: "Drift" },
  { id: "ordliste", label: "Ordliste" },
  { id: "videre", label: "Videre" },
];
const SECTION_IDS = SECTIONS.map((s) => s.id);

/* ---------- Innhold ---------- */

const C = ({ children }: { children: ReactNode }) => <code className="avs-slack__code">{children}</code>;

const ERRORS: { what: string; tone: Tone; how: ReactNode; result: StatusId[] | string }[] = [
  {
    what: "Behandlingen av SED-en kaster en feil",
    tone: "danger",
    how: (
      <>
        Fagmodulen varsler i Slack og kaster feilen videre. Kafka-lytteren logger den, teller{" "}
        <code>sed_kafka_consumer_failed</code> og går videre til neste melding. <strong>SED-en leses ikke på nytt.</strong>
      </>
    ),
    result: "Det som var satt før feilen",
  },
  {
    what: "Dokarkiv svarer med feil",
    tone: "danger",
    how: (
      <>
        Fagmodulen prøver noen ganger til, varsler i Slack og går videre som om journalposten ikke finnes. Det blir ingen
        oppgave og ikke noe dokument i nav-rinasak. Uten dokument feiler ferdigstill to netter på rad.
      </>
    ),
    result: ["UKJENT", "FEILET_FERDIGSTILL", "KORRUPT"],
  },
  {
    what: "Dokarkiv svarer 409: journalposten finnes",
    tone: "warning",
    how: "Bare en advarsel i loggen. Fagmodulen lager ingen oppgave og legger ikke til dokumentet i nav-rinasak. Statusen ble satt før kallet.",
    result: ["UKJENT"],
  },
  {
    what: "Oppgave svarer 400",
    tone: "warning",
    how: "Fagmodulen varsler i Slack med svaret fra Oppgave, tema, oppgavetype, BUC og SED. Oppgaven må opprettes manuelt.",
    result: "Påvirkes ikke",
  },
  {
    what: "Oppgave svarer 409",
    tone: "neutral",
    how: "Oppgaven finnes fra før. Bare en advarsel i loggen.",
    result: "Påvirkes ikke",
  },
  {
    what: "Oppgave feiler på annen måte",
    tone: "danger",
    how: "Fagmodulen prøver noen ganger til og logger så en feil. Ingen varsling i Slack, og ingen oppgave.",
    result: "Påvirkes ikke",
  },
  {
    what: "ferdigstill feiler for en SED",
    tone: "danger",
    how: "Prøves igjen neste natt. Feiler den igjen, gir jobben opp. Feilmeldingen lagres i sed_journalstatus.",
    result: ["FEILET_FERDIGSTILL", "KORRUPT"],
  },
  {
    what: "feilregistrer feiler for en SED",
    tone: "danger",
    how: "Prøves igjen neste natt. Feiler den igjen, gir jobben opp.",
    result: ["FEILET_FEILREGISTRER", "KORRUPT"],
  },
  {
    what: "Naisjoben får ikke svar fra eux-journalarkivar",
    tone: "warning",
    how: "Naisjoben logger en advarsel. Ingen varsling, og ingen ny kjøring før neste natt.",
    result: "Ingen endring",
  },
];

const PITFALLS: { group: string; items: { title: string; body: ReactNode }[] }[] = [
  {
    group: "Fagmodulen",
    items: [
      {
        title: "En SED som feiler, leses ikke på nytt",
        body: (
          <>
            Feilhåndteringen i Kafka-lytteren logger feilen og hopper videre. Det finnes ingen retry-topic eller dead letter.
            Varselet i Slack og metrikken <code>sed_kafka_consumer_failed</code> er de eneste sporene.
          </>
        ),
      },
      {
        title: "Feil i Dokarkiv ender som KORRUPT",
        body: (
          <>
            Statusen settes til <code>UKJENT</code> før journalposten lages. Lykkes ikke journalposten, blir det ikke noe dokument
            i nav-rinasak. ferdigstill finner ikke dokumentet og setter <code>FEILET_FERDIGSTILL</code>, og natten etter{" "}
            <code>KORRUPT</code>.
          </>
        ),
      },
      {
        title: "Et duplikat gir ingen oppgave",
        body: (
          <>
            Svarer Dokarkiv 409 fordi journalposten finnes, lager fagmodulen ingen oppgave. Feilet oppgaven første gang, må den
            lages manuelt.
          </>
        ),
      },
      {
        title: "Mottatte SED-er blir midlertidige til saken er journalført",
        body: (
          <>
            Fagmodulen ber bare om ferdigstilling av en inngående SED når nav-rinasaken har et journalført dokument, eller når
            BUC-en er UB_BUC_01, FB_BUC_01 eller FB_BUC_04. Ellers blir journalposten midlertidig og får en JFR-oppgave, selv om
            både sak og bruker er kjent. I S og H finnes det dessuten ingen fagsak uten nav-rinasak.
          </>
        ),
      },
      {
        title: "Melosys-sjekken ser bare på første SED",
        body: (
          <>
            Fagmodulen lar Melosys journalføre når den <em>første</em> journalstatusen i saken er{" "}
            <code>MELOSYS_JOURNALFOERER</code>. Statusen til senere SED-er spiller ingen rolle.
          </>
        ),
      },
      {
        title: "Tema for P og LA brukes aldri",
        body: (
          <>
            Temalogikken har regler for pensjon (PEN) og lovvalg (MED), men SED-er i P og LA stoppes av filteret før temaet
            velges.
          </>
        ),
      },
    ],
  },
  {
    group: "Nattjobbene",
    items: [
      {
        title: "Uten en ferdigstilt journalpost i saken skjer ingenting",
        body: (
          <>
            ferdigstill kopierer sak, bruker og tema fra en journalpost som allerede er journalført. Finnes ingen, blir SED-en
            stående som <code>UKJENT</code> natt etter natt, til saksbehandler journalfører saken.
          </>
        ),
      },
      {
        title: "feilregistrer tar bare utgående journalposter uten bruker",
        body: (
          <>
            Inngående journalposter og journalposter med bruker blir stående som <code>UKJENT</code>. Jobben ser bare på SED-er
            som har vært <code>UKJENT</code> i mer enn 30 dager.
          </>
        ),
      },
      {
        title: "FEILREGISTRERT selv om Dokarkiv sa nei",
        body: (
          <>
            feilregistrer kaller <code>POST /api/v1/journalposter/settStatusAvbryt</code> i eux-journal. eux-journal logger feil
            fra Dokarkiv, men svarer likevel OK. Jobben setter da <code>FEILREGISTRERT</code> selv om journalposten ikke ble
            avbrutt.
          </>
        ),
      },
      {
        title: "FEILREGISTRERT er ikke endestasjon",
        body: (
          <>
            ferdigstill leser <code>FEILREGISTRERT</code> hver natt. En avbrutt journalpost har status <code>AVBRUTT</code> i SAF,
            ikke <code>FEILREGISTRERT</code>. Finnes det en ferdigstilt journalpost i saken, prøver jobben derfor å ferdigstille
            den avbrutte journalposten.
          </>
        ),
      },
      {
        title: "KORRUPT er endestasjon",
        body: (
          <>
            Ingen jobb leser <code>KORRUPT</code>. SED-en må følges opp manuelt. Feilmeldingen står i kolonnen{" "}
            <code>feilmelding</code> i sed_journalstatus.
          </>
        ),
      },
      {
        title: "feilregistrer kjører ikke hver natt i Q2",
        body: (
          <>
            I Q2 er tidsplanen <code>0 14 25 11 *</code>, altså bare 25. november kl. 14.00.
          </>
        ),
      },
      {
        title: "Naisjoben varsler ikke",
        body: (
          <>
            Feiler kallet til eux-journalarkivar, logger naisjoben bare en advarsel. Det kommer ingen melding i Slack.
          </>
        ),
      },
    ],
  },
  {
    group: "Fra nEESSI",
    items: [
      {
        title: "Manuell journalføring endrer ikke statusen",
        body: (
          <>
            Fagmodulen ferdigstiller journalpostene, men endrer ikke sed_journalstatus. SED-ene står som <code>UKJENT</code> til
            ferdigstill kjører kl. 01.00 og ser at de er journalført.
          </>
        ),
      },
      {
        title: "Feilregistrering fra nEESSI gir ikke FEILREGISTRERT",
        body: (
          <>
            eux-journal avbryter utgående journalposter og flytter oppgaven for inngående, men endrer ikke sed_journalstatus.
            Resultatet lagres bare i databasen til eux-journal.
          </>
        ),
      },
    ],
  },
];

const GLOSSARY: { term: string; full?: string; text: string }[] = [
  { term: "SED", full: "Structured Electronic Document", text: "Dokumentet som sendes mellom land i EESSI, f.eks. S005 eller H001." },
  { term: "BUC", full: "Business Use Case", text: "En type RINA-sak. Delen foran første «_» er sektoren, f.eks. UB i UB_BUC_01." },
  { term: "Sektor", text: "Fagområdet til BUC-en. Fagmodulen journalfører åtte: FB, UB, H, S, M, R, AW og AD." },
  { term: "Journalpost", text: "Arkivoppføringen i Dokarkiv. Fagmodulen lager én per SED, med SED-en og vedleggene som dokumenter og kanal EESSI." },
  { term: "Midlertidig", text: "En journalpost som ikke er ferdigstilt. Den mangler sak eller bruker, eller fagmodulen ba ikke om ferdigstilling." },
  { term: "Ferdigstille", text: "Gjøre journalposten ferdig i Dokarkiv. Krever sak og bruker. Fagmodulen bruker journalførende enhet 9999." },
  { term: "Fagsak", text: "Saken i fagsystemet som journalposten knyttes til. Fagmodulen finner den via nav-rinasaken, eller som personens nyeste fagsak på riktig tema i SAF." },
  { term: "nav-rinasak", text: "NAVs data om RINA-saken i eux-nav-rinasak: fagsak, overstyrt enhet og dokumentene med dokumentInfoId." },
  { term: "sed_journalstatus", text: "Tabellen i eux-nav-rinasak med én journalstatus per SED-versjon." },
  { term: "Behandlende enhet", text: "Enheten som får oppgaven. Velges bare for inngående SED-er." },
  { term: "JFR, FDR, BEH_SED", text: `Oppgavetypene: ${Object.entries(OPPGAVETYPER).map(([k, v]) => `${k} er ${v.toLowerCase()}`).join(", ")}.` },
  { term: "Tema", text: "Fagområdet i Dokarkiv og Oppgave, f.eks. DAG, SYK eller BAR. Behandlingstema og behandlingstype gjør det mer presist." },
  { term: "SAF", text: "Leser journalposter. Nattjobbene bruker SAF for å se om en journalpost er journalført." },
  { term: "Dokarkiv", text: "API-et som oppretter, oppdaterer og ferdigstiller journalposter." },
  { term: "NORG2", text: "NAVs register over enheter. Velger enhet ut fra tema, geografisk tilknytning og behandlingstype." },
  { term: "PDL", full: "Persondataløsningen", text: "Gir aktørId, geografisk tilknytning og adressebeskyttelse." },
  { term: "Feilregistrere", text: "Her: sette en utgående journalpost til status avbrutt i Dokarkiv." },
];

const REPOS = ["eux-fagmodul-journalfoering", "eux-journalarkivar", "eux-journalarkivar-naisjob", "eux-journal", "eux-nav-rinasak"];

const FURTHER: { href: string; title: string; text: string; external?: boolean }[] = [
  { href: archHref("eux-fagmodul-journalfoering"), title: "Arkitektur", text: "Se fagmodulen i arkitekturkartet, med alt den snakker med." },
  { href: "/prosesser/automatisk-avslutning", title: "Automatisk avslutning", text: "Hvordan uvirksomme RINA-saker lukkes og arkiveres." },
  { href: "/prosesser/automatisk-sletting", title: "Automatisk sletting", text: "Hvordan saker uten sendt SED slettes." },
  { href: "/kafka/sed-hendelser", title: "SED-hendelser", text: "Sanntidsmonitor for sedmottatt og sedsendt i Q1 og Q2." },
  { href: "/nav-rinasak/sed-er", title: "SED-er i nEESSI", text: "Saker og SED-er som registreres i eux-nav-rinasak, i sanntid." },
  { href: "/applications", title: "Applikasjoner", text: "Rolle, avhengigheter, Kafka-topics og repo for hver applikasjon." },
  { href: "/environments", title: "Miljøer", text: "Testmiljøene Q1 og Q2, med hver sin RINA-instans." },
  ...REPOS.map((r) => ({ href: ghHref(r), title: r, text: "Kildekoden på GitHub.", external: true })),
];

/* ---------- Byggeklosser ---------- */

function Section({ id, eyebrow, title, lead, children }: { id: string; eyebrow: string; title: string; lead?: ReactNode; children: ReactNode }) {
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

function Snippet({ children }: { children: string }) {
  return (
    <div className="avs-snippet">
      <code>{children}</code>
      <CopyButton copyText={children} size="xsmall" />
    </div>
  );
}

function SubHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="avs-subhead">
      <Heading level="3" size="small">
        {title}
      </Heading>
      {children && (
        <BodyShort size="small" className="arch-subtle">
          {children}
        </BodyShort>
      )}
    </div>
  );
}

/* ---------- Side ---------- */

export default function JournalfoeringPage() {
  const active = useScrollSpy(SECTION_IDS);
  const reduced = useReducedMotion();
  const [input, setInput] = useState<SimInput>(DEFAULT_INPUT);
  const [status, setStatus] = useState<StatusId | null>(null);
  const result = useMemo(() => simulate(input), [input]);

  const scrollTo = useCallback(
    (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" }),
    [reduced],
  );
  const focusStatus = useCallback(
    (s: StatusId) => {
      setStatus(s);
      scrollTo("statuser");
    },
    [scrollTo],
  );
  const pickRule = useCallback((rule: EnhetRule) => setInput(presetInput(rule.preset)), []);

  return (
    <div className="portal-page--wide arch-page avs-page jfr-page">
      <header className="portal-hero arch-hero">
        <div className="arch-hero__text">
          <Detail className="arch-eyebrow">Prosess</Detail>
          <Heading level="1" size="xlarge" spacing>
            Journalføring av SED-er
          </Heading>
          <BodyLong size="large" className="arch-hero__lead">
            Når NAV sender eller mottar en SED i RINA, skal den arkiveres i Dokarkiv. eux-fagmodul-journalfoering leser
            SED-hendelsene fra Kafka, lager journalposten, velger tema og enhet og oppretter oppgave. Det som ikke blir ferdig
            journalført med en gang, prøver eux-journalarkivar igjen hver natt.
          </BodyLong>
        </div>

        <dl className="arch-stats">
          {[
            { n: BEHANDLES.length, label: "sektorer", sub: "journalføres her" },
            { n: 2, label: "Kafka-topics", sub: "sedmottatt og sedsendt" },
            { n: STATUSES.length, label: "journalstatuser", sub: "i eux-nav-rinasak" },
            { n: JOBS.length, label: "nattjobber", sub: "kl. 01.00 og 02.00" },
          ].map((s, i) => (
            <div key={s.label} className="arch-stat" style={{ ["--arch-delay" as string]: `${120 + i * 70}ms` }}>
              <dt>{s.label}</dt>
              <dd>
                <span className="arch-stat__n">{s.n}</span>
                <span className="arch-stat__sub">{s.sub}</span>
              </dd>
            </div>
          ))}
        </dl>

        <div className="arch-flows">
          <a href="#simulator" className="arch-flow-card" data-tone="accent">
            <span className="arch-flow-card__icon" aria-hidden>
              <TestFlaskIcon />
            </span>
            <span>
              <strong>Prøv en SED</strong>
              <span className="arch-flow-card__text">Velg sektor, BUC og SED, og se hvert steg fagmodulen tar.</span>
            </span>
            <ArrowRightIcon aria-hidden className="arch-flow-card__arrow" />
          </a>
          <a href="#ferdigstilling" className="arch-flow-card" data-tone="warning">
            <span className="arch-flow-card__icon" aria-hidden>
              <HourglassIcon />
            </span>
            <span>
              <strong>Midlertidig først</strong>
              <span className="arch-flow-card__text">
                Mottatte SED-er blir ofte midlertidige til noen journalfører saken. Følg en sak til alt er ferdig.
              </span>
            </span>
            <ArrowRightIcon aria-hidden className="arch-flow-card__arrow" />
          </a>
          <a href="#natten" className="arch-flow-card" data-tone="info">
            <span className="arch-flow-card__icon" aria-hidden>
              <MoonIcon />
            </span>
            <span>
              <strong>Natten</strong>
              <span className="arch-flow-card__text">Kl. 01.00 ferdigstiller eux-journalarkivar det den kan. Kl. 02.00 rydder den opp.</span>
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
        id="system"
        eyebrow="Arkitektur"
        title="Hvem gjør hva"
        lead="SED-hendelsene går fra RINA via Kafka til fagmodulen, som snakker med åtte andre tjenester. Om natten tar eux-journalarkivar over. Velg en flyt, eller klikk på en boks for detaljer."
      >
        <SystemFlow />
      </Section>

      <Section
        id="simulator"
        eyebrow="Interaktivt"
        title="Følg en SED gjennom fagmodulen"
        lead="Velg retning, sektor, BUC og SED, og hva som finnes fra før. Simulatoren går gjennom de samme stegene som InngaaendeSedFacade og UtgaaendeSedFacade, i samme rekkefølge."
      >
        <Simulator input={input} onChange={setInput} onFocusStatus={focusStatus} onJump={scrollTo} />
      </Section>

      <Section
        id="regler"
        eyebrow="Regler"
        title="Tema, enhet og oppgave"
        lead="Tema bestemmer hvor journalposten hører hjemme. Enheten bestemmer hvem som får oppgaven. Begge velges ut fra sektor, SED og det fagmodulen finner om personen og saken."
      >
        <SubHead title="Behandlende enhet">
          Reglene prøves ovenfra og ned, og den første som slår til, avgjør. Markeringen følger SED-en i simulatoren. Klikk på en
          regel for å prøve den.
        </SubHead>
        <EnhetCascade hit={result.enhetRule} retning={input.retning} onPick={pickRule} onJump={() => scrollTo("simulator")} />

        <div className="jfr-rules">
          <div>
            <SubHead title="Tema">Fagsakens tema brukes når det er gyldig for sektoren. Ellers gjelder kolonnen «Uten fagsak».</SubHead>
            <div className="arch-table">
              <Table size="small">
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell scope="col">Sektor</Table.HeaderCell>
                    <Table.HeaderCell scope="col">Med fagsak</Table.HeaderCell>
                    <Table.HeaderCell scope="col">Uten fagsak</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {TEMA_ROWS.map((r) => (
                    <Table.Row key={r.sektor}>
                      <Table.HeaderCell scope="row">
                        <span className="arch-mono">{r.sektor}</span>{" "}
                        <span className="arch-subtle jfr-rules__sub">{SEKTOR_BY_ID[r.sektor].label}</span>
                      </Table.HeaderCell>
                      <Table.DataCell>
                        {r.medFagsak}
                        {r.note && <span className="jfr-rules__note">{r.note}</span>}
                      </Table.DataCell>
                      <Table.DataCell className="arch-mono">{r.utenFagsak}</Table.DataCell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </div>
          </div>
          <div>
            <SubHead title="Oppgave">Bare inngående SED-er får oppgave. Første linje som passer, gjelder.</SubHead>
            <div className="arch-table">
              <Table size="small">
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell scope="col">Når</Table.HeaderCell>
                    <Table.HeaderCell scope="col">Oppgave</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {OPPGAVE_ROWS.map((r) => (
                    <Table.Row key={r.when}>
                      <Table.DataCell>{r.when}</Table.DataCell>
                      <Table.DataCell>
                        <span className="avs-code" data-tone={r.tone}>
                          {r.oppgave}
                        </span>
                      </Table.DataCell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </div>
            <BodyShort size="small" className="arch-subtle avs-note">
              Oppgavene får frist neste virkedag og opprettes av enhet 9999.
            </BodyShort>
          </div>
          <div>
            <SubHead title="Behandlingstema">Gjelder både journalposten og oppgaven. Ellers står feltet tomt.</SubHead>
            <div className="arch-table">
              <Table size="small">
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell scope="col">Når</Table.HeaderCell>
                    <Table.HeaderCell scope="col">NAV er sakseier</Table.HeaderCell>
                    <Table.HeaderCell scope="col">Ellers</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {BEHANDLINGSTEMA_ROWS.map((r) => (
                    <Table.Row key={r.when}>
                      <Table.DataCell>
                        {r.when}
                        {r.note && <span className="jfr-rules__note">{r.note}</span>}
                      </Table.DataCell>
                      <Table.DataCell className="arch-mono">{r.sakseier}</Table.DataCell>
                      <Table.DataCell className="arch-mono">{r.motpart}</Table.DataCell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </div>
          </div>
          <div>
            <SubHead title="Behandlingstype">Bare på oppgaven. Ellers står feltet tomt.</SubHead>
            <div className="arch-table">
              <Table size="small">
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell scope="col">Når</Table.HeaderCell>
                    <Table.HeaderCell scope="col">Verdi</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {BEHANDLINGSTYPE_ROWS.map((r) => (
                    <Table.Row key={r.when}>
                      <Table.DataCell>{r.when}</Table.DataCell>
                      <Table.DataCell className="arch-mono">{r.value}</Table.DataCell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            </div>
          </div>
        </div>
      </Section>

      <Section
        id="ferdigstilling"
        eyebrow="Livsløp"
        title="Midlertidig først, ferdig senere"
        lead="En journalpost blir bare ferdigstilt når fagmodulen vet både sak og bruker. Følg to SED-er i samme RINA-sak fra de kommer inn til de er journalført, og se hvordan det går når saksbehandler gjør jobben i nEESSI eller i Gosys."
      >
        <CaseStory onFocusStatus={focusStatus} />
      </Section>

      <Section
        id="statuser"
        eyebrow="Tilstander"
        title="Journalstatusen til en SED"
        lead="eux-nav-rinasak lagrer én status per SED-versjon i tabellen sed_journalstatus. F er fagmodulen, 1 og 2 er nattjobbene. Klikk på en status for å se hvem som setter den og hvor den kan gå videre."
      >
        <StatusMachine selected={status} onSelect={setStatus} />
      </Section>

      <Section
        id="natten"
        eyebrow="Planlagt"
        title="Natten i eux-journalarkivar"
        lead="To naisjobber starter hver sin prosess i eux-journalarkivar. ferdigstill fullfører det som kan fullføres. En time senere avbryter feilregistrer utgående journalposter som aldri fikk bruker."
      >
        <NightJobs onFocusStatus={focusStatus} />
      </Section>

      <Section
        id="manuelt"
        eyebrow="Saksbehandler"
        title="Journalføre og feilregistrere fra nEESSI"
        lead="Saksbehandler kan journalføre en hel RINA-sak på en fagsak, eller feilregistrere journalpostene i saken. Velg handling og se kallene. Hold musen over et steg for å finne det i diagrammet."
      >
        <ManualFlows onFocusStatus={focusStatus} />
      </Section>

      <Section
        id="feil"
        eyebrow="Feilhåndtering"
        title="Når noe går galt"
        lead="Fagmodulen prøver kallene på nytt noen ganger, men gir så opp og går videre. Det meste havner bare i loggen eller i Slack. Nattjobbene prøver én natt til før de gir opp."
      >
        <div className="arch-table avs-errors">
          <Table size="small">
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell scope="col">Hva feiler</Table.HeaderCell>
                <Table.HeaderCell scope="col">Hva skjer</Table.HeaderCell>
                <Table.HeaderCell scope="col">Journalstatus</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {ERRORS.map((r) => (
                <Table.Row key={r.what}>
                  <Table.HeaderCell scope="row">
                    <span className="jfr-err" data-tone={r.tone}>
                      {r.what}
                    </span>
                  </Table.HeaderCell>
                  <Table.DataCell>{r.how}</Table.DataCell>
                  <Table.DataCell>
                    {typeof r.result === "string" ? (
                      <span className="arch-subtle">{r.result}</span>
                    ) : (
                      <span className="jfr-err__path">
                        <StatusChips ids={r.result} onFocusStatus={focusStatus} />
                      </span>
                    )}
                  </Table.DataCell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>

        <div className="jfr-feil">
          <div>
            <SubHead title="Slik ser det ut i Slack">
              Fagmodulen poster til driftskanalen via en webhook. Meldingene starter med miljøet.
            </SubHead>
            <figure className="avs-slack jfr-slack">
              <div className="jfr-slack__feed">
              {[
                {
                  time: "09.12",
                  body: (
                    <>
                      <C>[prod]</C> Journalpost ble ikke opprettet, selv etter gjentatte forsøk. sedType=S005, eksternReferanseId=…
                    </>
                  ),
                },
                {
                  time: "09.14",
                  body: (
                    <>
                      <C>[prod]</C> Behandling av inngående SED mislyktes. rinasakId=1234567 sedId=… rinaDokumentId=… rinaDokumentVersjon=1
                      sedType=U001 bucType=UB_BUC_01
                    </>
                  ),
                },
                {
                  time: "10.03",
                  body: (
                    <>
                      🔥<C>[prod]</C>
                      <br />
                      <em>&lt;svaret fra Oppgave&gt;</em>
                      <br />
                      tema=GEN, oppgavetype=JFR
                      <br />
                      H_BUC_01, H001, RINA=7654321_…
                    </>
                  ),
                },
              ].map((m, i) => (
                <div key={m.time} className="avs-slack__msg" style={{ "--jfr-i": i } as CSSProperties}>
                  <span className="avs-slack__avatar" aria-hidden>
                    EUX
                  </span>
                  <div className="avs-slack__body">
                    <div className="avs-slack__meta">
                      <strong>eux-fagmodul-journalfoering</strong>
                      <span className="avs-slack__app">APP</span>
                      <span className="arch-subtle">{m.time}</span>
                    </div>
                    <p>{m.body}</p>
                  </div>
                </div>
              ))}
              </div>
              <figcaption>Eksempler. Saks- og dokument-ID-ene er oppdiktet.</figcaption>
            </figure>
          </div>
          <div className="arch-pitfalls avs-pitfalls jfr-pitfalls">
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
        </div>
      </Section>

      <Section
        id="drift"
        eyebrow="Drift"
        title="Kjøring, Kafka og oppfølging"
        lead="Det meste av drift handler om å finne SED-er som ble stående: i Slack, i metrikkene eller i sed_journalstatus."
      >
        <div className="avs-ops">
          <div className="avs-ops__col">
            <article className="arch-card avs-ops__card" data-tone="accent">
              <Heading level="3" size="xsmall">
                Nattjobbene
              </Heading>
              <Snippet>{"POST /api/v1/arkivarprosess/{prosess}/execute"}</Snippet>
              <BodyShort size="small">
                Synkront mot eux-journalarkivar: svarer <code>204</code> når prosessen er ferdig, og <code>400</code> for et ukjent
                prosessnavn. Gyldige verdier:
              </BodyShort>
              <ul className="avs-ops__values">
                {JOBS.map((j) => (
                  <li key={j.id} className="arch-mono">
                    {j.id}
                  </li>
                ))}
              </ul>
            </article>
            <article className="arch-card avs-ops__card" data-tone="warning">
              <Heading level="3" size="xsmall">
                Kjøre en jobb manuelt
              </Heading>
              <BodyShort size="small">Start en ny kjøring fra CronJob-en, f.eks. ferdigstill i prod:</BodyShort>
              <Snippet>kubectl create job --from=cronjob/eux-journalarkivar-ferdigstill-naisjob ferdigstill-manuell -n eessibasis</Snippet>
              <BodyShort size="small" className="arch-subtle">
                Bruk <code>eux-journalarkivar-feilregistrer-naisjob</code> for feilregistrer, og legg til <code>-q1</code> eller{" "}
                <code>-q2</code> i dev. Navnet på den nye jobben må være unikt.
              </BodyShort>
            </article>
            <article className="arch-card avs-ops__card" data-tone="info">
              <Heading level="3" size="xsmall">
                SED-er som ble stående
              </Heading>
              <BodyShort size="small">I databasen til eux-nav-rinasak:</BodyShort>
              <Snippet>select status, count(*) from sed_journalstatus group by status order by 2 desc;</Snippet>
              <Snippet>
                {"select rinasak_id, sed_id, sed_versjon, feilmelding, endret_tidspunkt from sed_journalstatus where status = 'KORRUPT' order by endret_tidspunkt desc;"}
              </Snippet>
              <BodyShort size="small" className="arch-subtle">
                Nattjobbene bruker <code>POST /api/v1/sed/journalstatuser/finn</code> og <code>PUT /api/v1/sed/journalstatuser</code> i
                eux-nav-rinasak.
              </BodyShort>
            </article>
          </div>
          <div className="avs-ops__col">
            <article className="arch-card avs-ops__card" data-tone="meta-purple">
              <Heading level="3" size="xsmall">
                Kafka
              </Heading>
              <div className="arch-table">
                <Table size="small">
                  <Table.Header>
                    <Table.Row>
                      <Table.HeaderCell scope="col">Miljø</Table.HeaderCell>
                      <Table.HeaderCell scope="col">Topics</Table.HeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {(["prod", "q1", "q2"] as const).map((e) => (
                      <Table.Row key={e}>
                        <Table.HeaderCell scope="row">{e}</Table.HeaderCell>
                        <Table.DataCell className="arch-mono jfr-topics">
                          <span>eessibasis.sedmottatt-v1{e === "prod" ? "" : `-${e}`}</span>
                          <span>eessibasis.sedsendt-v1{e === "prod" ? "" : `-${e}`}</span>
                        </Table.DataCell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              </div>
              <BodyShort size="small">
                Consumer group <code>eux-fagmodul-journalfoering</code>. Én melding om gangen: <code>max-poll-records: 1</code>,{" "}
                <code>concurrency: 1</code> og commit per melding.
              </BodyShort>
            </article>
            <article className="arch-card avs-ops__card" data-tone="success">
              <Heading level="3" size="xsmall">
                Metrikker
              </Heading>
              <BodyShort size="small">
                Fagmodulen eksponerer <code>/actuator/prometheus</code>. Tellerne får endelsen <code>_total</code> i Prometheus.
              </BodyShort>
              <dl className="avs-job__meta">
                <div>
                  <dt>sed_mottatt</dt>
                  <dd>Inngående SED-er som ble behandlet uten feil.</dd>
                </div>
                <div>
                  <dt>sed_sendt</dt>
                  <dd>Utgående SED-er som ble behandlet uten feil.</dd>
                </div>
                <div>
                  <dt>sed_kafka_consumer_failed</dt>
                  <dd>
                    Meldinger som feilet og ble hoppet over. Tag <code>topic</code>.
                  </dd>
                </div>
              </dl>
            </article>
          </div>
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
