"use client";

import { Fragment, useCallback, useState, type ReactNode } from "react";
import NextLink from "next/link";
import { Accordion, BodyLong, BodyShort, CopyButton, Detail, Heading, Table } from "@navikt/ds-react";
import { ArrowRightIcon, ExternalLinkIcon, LightningIcon, MoonIcon, TrashIcon } from "@navikt/aksel-icons";
import { useReducedMotion, useScrollSpy } from "@/components/architecture/hooks";
import { archHref, ghHref } from "@/components/avslutning/tones";
import { ENVS, GRENSE_DAGER, JOBS, STATUSES, differsFromProd, schedLabel, type StatusId } from "@/components/sletting/data";
import { CaseJourney } from "@/components/sletting/CaseJourney";
import { SystemFlow } from "@/components/sletting/SystemFlow";
import { NightStrip } from "@/components/sletting/NightStrip";
import { StatusMachine } from "@/components/sletting/StatusMachine";
import { RinaSequence } from "@/components/sletting/RinaSequence";
import { StatusChips } from "@/components/sletting/StatusChips";
import { SlackReport } from "@/components/sletting/SlackReport";

const SECTIONS = [
  { id: "livslop", label: "Livsløp" },
  { id: "system", label: "Systemet" },
  { id: "natten", label: "Natten" },
  { id: "statuser", label: "Statuser" },
  { id: "rina", label: "Kallet til RINA" },
  { id: "feil", label: "Feil" },
  { id: "drift", label: "Drift" },
  { id: "ordliste", label: "Ordliste" },
  { id: "videre", label: "Videre" },
];
const SECTION_IDS = SECTIONS.map((s) => s.id);

const NIGHT_JOBS = JOBS.filter((j) => j.sched.prod.freq === "daily" && j.sched.prod.h < 6).length;
const USED_STATUSES = STATUSES.filter((s) => !s.unused).length;

/* ---------- Innhold ---------- */

type Response = { code: string; what: ReactNode; result: StatusId[]; tone: "success" | "danger" | "warning" | "info" };

const RESPONSES: { call: string; job: string; endpoint: string; rows: Response[] }[] = [
  {
    call: "Statussjekk",
    job: "til-sletting",
    endpoint: "GET /api/v1/rinasaker/{id}/status",
    rows: [
      {
        code: "200 · true",
        what: "RINA tilbyr handlingen Delete_Case på saken.",
        result: ["TIL_SLETTING"],
        tone: "success",
      },
      {
        code: "200 · false",
        what: "Saken finnes, men RINA tilbyr ikke handlingen Delete_Case.",
        result: ["KAN_IKKE_SLETTES"],
        tone: "info",
      },
      {
        code: "Alle feil",
        what: (
          <>
            404, 5xx, 422 fra terminatoren, tidsavbrudd og andre exceptions. <strong>Alt</strong> fanges og gir samme
            status – også 404, selv om saken da ikke finnes i RINA.
          </>
        ),
        result: ["KAN_IKKE_SLETTES"],
        tone: "danger",
      },
    ],
  },
  {
    call: "Sletting",
    job: "slett",
    endpoint: "DELETE /api/v1/rinasaker/{id}",
    rows: [
      {
        code: "204",
        what: "Terminatoren har utført Delete_Case i RINA.",
        result: ["SLETTET"],
        tone: "success",
      },
      {
        code: "404",
        what: "Saken finnes ikke lenger i RINA. Fanges som HttpClientErrorException.NotFound.",
        result: ["NOT_FOUND"],
        tone: "info",
      },
      {
        code: "Andre feil",
        what: (
          <>
            400 når Delete_Case ikke lenger tilbys («Det er ikke tillatt å fjerne denne Rinasaken.»), 422 når PUT-kallet mot
            RINA feiler, 5xx, tidsavbrudd og andre exceptions. Første gang blir saken prøvd igjen neste natt, andre gang gir
            slett opp.
          </>
        ),
        result: ["SLETTING_FEILET_RETRY", "SLETTING_FEILET"],
        tone: "danger",
      },
    ],
  },
];

const PITFALLS: { group: string; items: { title: string; body: ReactNode }[] }[] = [
  {
    group: "Statuser og tid",
    items: [
      {
        title: "Klokken starter når appen ser saken",
        body: (
          <>
            De 15 dagene regnes fra <code>opprettetTidspunkt</code>, som settes når eux-slett-usendte-rinasaker lagrer saken
            for første gang – ikke fra når saken ble opprettet i RINA. Nye sakshendelser oppdaterer bare{" "}
            <code>endretTidspunkt</code> og flytter ikke grensen.
          </>
        ),
      },
      {
        title: "En SED overstyrer alt – også endelige statuser",
        body: (
          <>
            SENT_DOCUMENT og RECEIVE_DOCUMENT setter <code>DOKUMENT_SENT</code> uansett hvilken status saken har, og oppretter
            raden hvis den mangler. Også en sak som er <code>SLETTET</code> eller <code>KAN_IKKE_SLETTES</code>, får ny
            status hvis det kommer en dokumenthendelse etterpå. Statusen heter «sent», men gjelder både sendt og mottatt
            – i rapporten står den som «Dokument mottatt».
          </>
        ),
      },
      {
        title: "404 i statussjekken gir KAN_IKKE_SLETTES",
        body: (
          <>
            til-sletting skiller ikke mellom feiltyper: alle exceptions fra statussjekken gir <code>KAN_IKKE_SLETTES</code>.
            Bare slett skiller ut 404 og setter <code>NOT_FOUND</code>.
          </>
        ),
      },
      {
        title: "KAN_IKKE_SLETTES sjekkes aldri på nytt",
        body: (
          <>
            Statusen er endelig. En sak som ikke kunne slettes på dag 15 – f.eks. fordi RINA var nede i natt – blir
            liggende i RINA. Den må eventuelt settes tilbake til <code>NY_SAK</code> i databasen.
          </>
        ),
      },
      {
        title: "KORRUPT er ikke i bruk",
        body: (
          <>
            <code>KORRUPT</code> finnes i enumen <code>RinasakStatus.Status</code>, men ingen kode setter eller leser den.
          </>
        ),
      },
      {
        title: "«Forrige måned» i rapporten",
        body: (
          <>
            Rapporten teller saker som <em>nå</em> har en endelig status, og der <code>endretTidspunkt</code> er i forrige
            måned. Sakshendelser oppdaterer <code>endretTidspunkt</code> også for saker med endelig status, så en sak kan
            flytte seg til en senere måned. Tallene er derfor et godt anslag, ikke en logg.
          </>
        ),
      },
    ],
  },
  {
    group: "Drift",
    items: [
      {
        title: "En mislykket kjøring ser vellykket ut",
        body: (
          <>
            NAIS-jobben logger bare en advarsel hvis kallet til eux-slett-usendte-rinasaker feiler, og avslutter normalt. Med{" "}
            <code>backoffLimit: 0</code> blir det heller ikke gjort nye forsøk. Følg med på loggene, ikke på jobbstatusen.
          </>
        ),
      },
      {
        title: "Endepunktet har ikke token",
        body: (
          <>
            <code>/api/v1/sletteprosess/…</code> er <code>@Unprotected</code>, og NAIS-jobbene sender ingen token. Det
            eneste som stopper andre, er <code>accessPolicy.inbound</code>, som bare slipper inn de tre NAIS-jobbene.
          </>
        ),
      },
      {
        title: "Ingen grense per kjøring",
        body: (
          <>
            til-sletting og slett tar alle sakene som matcher, én om gangen, og kallet svarer først når alt er ferdig. Et
            stort etterslep gir en lang kjøring – og mange kall mot RINA samme natt.
          </>
        ),
      },
      {
        title: "Rapporten sendes bare fra prod",
        body: (
          <>
            I Q1 og Q2 er rapport-jobben satt til 31. februar og kjører aldri. Slett og til-sletting kjører likt i alle
            miljøer.
          </>
        ),
      },
      {
        title: "Hva om saken endres mellom natt og natt?",
        body: (
          <>
            Det går ≈ 23 timer fra en sak blir <code>TIL_SLETTING</code> til slett kjører. Sendes det en SED i mellomtiden,
            får saken <code>DOKUMENT_SENT</code> og slettes ikke. Selv om hendelsen skulle komme for sent, sjekker
            terminatoren Delete_Case på nytt før den sletter, og svarer 400 hvis handlingen er borte.
          </>
        ),
      },
    ],
  },
];

const GLOSSARY: { term: string; full?: string; text: string }[] = [
  { term: "RINA", full: "Reference Implementation of a National Application", text: "Europakommisjonens system for å behandle EESSI-saker. Sakene som slettes, ligger her." },
  { term: "CPI", full: "Case Processing Interface", text: "REST-API-et til RINA. eux-rina-terminator-api bruker det for å hente og slette saker." },
  { term: "BUC", full: "Business Use Case", text: "En saksprosess i EESSI. Sletting gjelder alle BUC-typer likt." },
  { term: "SED", full: "Structured Electronic Document", text: "Et strukturert dokument som sendes mellom landene i en BUC. En sak med SED slettes aldri." },
  { term: "Usendt sak", text: "En RINA-sak der det ikke er sendt eller mottatt noen SED. Typisk opprettet ved en feil eller forlatt." },
  { term: "Delete_Case", text: "Handlingen i RINA som sletter en sak. RINA tilbyr den bare når saken kan slettes." },
  { term: "kanSlettes", text: "Svaret fra statussjekken i eux-rina-terminator-api: true hvis saken har handlingen Delete_Case." },
  { term: "opprettetTidspunkt", text: "Når eux-slett-usendte-rinasaker lagret saken første gang. Grunnlaget for 15-dagersgrensen." },
  { term: "endretTidspunkt", text: "Når raden sist ble endret – av en hendelse eller en statusendring. Grunnlaget for månedsrapporten." },
  { term: "NAIS-jobb", text: "En Kubernetes CronJob på NAIS. Her: en jobb per prosess som bare kaller REST-endepunktet." },
];

const DB_COLUMNS: [string, string][] = [
  ["rinasak_id", "unik"],
  ["status", "indeks"],
  ["buc_type", ""],
  ["opprettet_tidspunkt", "15 dager"],
  ["endret_tidspunkt", "rapport"],
];

const REPOS = ["eux-slett-usendte-rinasaker", "eux-slett-usendte-rinasaker-naisjob", "eux-rina-terminator-api"];

const FURTHER: { href: string; title: string; text: string; external?: boolean }[] = [
  { href: archHref("eux-slett-usendte-rinasaker"), title: "Arkitektur", text: "Se eux-slett-usendte-rinasaker i arkitekturkartet, med alt den snakker med." },
  { href: "/prosesser/automatisk-avslutning", title: "Automatisk avslutning", text: "Hvordan saker uten aktivitet lukkes og arkiveres i RINA." },
  { href: "/prosesser/journalfoering", title: "Journalføring", text: "Hvordan SED-er journalføres automatisk." },
  { href: "/kafka/sed-hendelser", title: "SED-hendelser", text: "Sanntidsmonitor for sedmottatt og sedsendt i Q1 og Q2." },
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

/* ---------- Side ---------- */

export default function AutomatiskSlettingPage() {
  const active = useScrollSpy(SECTION_IDS);
  const reduced = useReducedMotion();
  const [status, setStatus] = useState<StatusId | null>(null);

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

  return (
    <div className="portal-page--wide arch-page avs-page sl-page">
      <header className="portal-hero arch-hero">
        <div className="arch-hero__text">
          <Detail className="arch-eyebrow">Prosess</Detail>
          <Heading level="1" size="xlarge" spacing>
            Automatisk sletting av usendte RINA-saker
          </Heading>
          <BodyLong size="large" className="arch-hero__lead">
            En RINA-sak der ingen SED er sendt eller mottatt etter {GRENSE_DAGER} dager, skal ikke bli liggende.
            eux-slett-usendte-rinasaker følger hver sak via Kafka. Om natten spør den RINA om sakene kan slettes, og
            sletter dem natten etter.
          </BodyLong>
        </div>

        <dl className="arch-stats">
          {[
            { n: GRENSE_DAGER, label: "dager uten SED", sub: "regnet fra første hendelse" },
            { n: JOBS.length, label: "NAIS-jobber", sub: `${NIGHT_JOBS} om natten, 1 månedlig` },
            { n: USED_STATUSES, label: "statuser i bruk", sub: `${STATUSES.length} i enumen` },
            { n: 2, label: "Kafka-topics", sub: "sak- og dokumenthendelser" },
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
          <a href="#system" className="arch-flow-card" data-tone="meta-purple">
            <span className="arch-flow-card__icon" aria-hidden>
              <LightningIcon />
            </span>
            <span>
              <strong>Hendelser inn</strong>
              <span className="arch-flow-card__text">
                RINA → eux-all-rina-events → Kafka. Nye saker registreres, og en SED redder saken for godt.
              </span>
            </span>
            <ArrowRightIcon aria-hidden className="arch-flow-card__arrow" />
          </a>
          <a href="#natten" className="arch-flow-card" data-tone="warning">
            <span className="arch-flow-card__icon" aria-hidden>
              <MoonIcon />
            </span>
            <span>
              <strong>Natten</strong>
              <span className="arch-flow-card__text">
                Kl. 01.00 slettes sakene som ble merket natten før. Kl. 02.00 merkes nye saker for sletting.
              </span>
            </span>
            <ArrowRightIcon aria-hidden className="arch-flow-card__arrow" />
          </a>
          <a href="#rina" className="arch-flow-card" data-tone="info">
            <span className="arch-flow-card__icon" aria-hidden>
              <TrashIcon />
            </span>
            <span>
              <strong>Sletting i RINA</strong>
              <span className="arch-flow-card__text">
                eux-rina-terminator-api sjekker at RINA tilbyr Delete_Case, og utfører handlingen.
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
        id="livslop"
        eyebrow="Oversikt"
        title="En sak fra opprettet til slettet"
        lead="Velg hva som skjer med saken, og trykk «Spill av». De første 15 dagene er komprimert – det er nettene etterpå som avgjør. Klikk på en hendelse for å se statusen."
      >
        <CaseJourney onFocusStatus={focusStatus} />
      </Section>

      <Section
        id="system"
        eyebrow="Arkitektur"
        title="Hvem snakker med hvem"
        lead="Fire flyter holder prosessen i gang: hendelser inn fra RINA, nattlige NAIS-jobber, kall til RINA via eux-rina-terminator-api og en månedlig rapport til Slack. Velg en flyt, eller klikk på en boks for detaljer."
      >
        <SystemFlow />
      </Section>

      <Section
        id="natten"
        eyebrow="Planlagt"
        title="To jobber, i «feil» rekkefølge"
        lead="slett kjører før til-sletting. En sak som merkes i natt, blir derfor stående nesten et døgn før den slettes – og en SED som kommer i mellomtiden, redder den. Hold over en jobb for å se hva den gjør."
      >
        <NightStrip onFocusStatus={focusStatus} />
      </Section>

      <Section
        id="statuser"
        eyebrow="Tilstander"
        title="Statusene til en sak"
        lead="Tallene på pilene viser hvilken jobb som flytter saken. Bare i de stiplede feltene kalles RINA – det er bare der noe kan feile. Den lilla prikken viser at en SED tar saken ut av prosessen fra hvilken som helst status."
      >
        <StatusMachine selected={status} onSelect={setStatus} />
      </Section>

      <Section
        id="rina"
        eyebrow="Mot RINA"
        title="Kallet til RINA"
        lead="eux-slett-usendte-rinasaker snakker aldri med RINA selv. Begge kallene går via eux-rina-terminator-api, som henter saken fra CPI og ser etter handlingen Delete_Case. Velg kall og hvordan saken ser ut i RINA."
      >
        <RinaSequence onFocusStatus={focusStatus} />
      </Section>

      <Section
        id="feil"
        eyebrow="Feilhåndtering"
        title="Svar og fallgruver"
        lead="Svaret fra eux-rina-terminator-api avgjør neste status. Statussjekken gir aldri et nytt forsøk, mens slett prøver én gang til natten etter."
      >
        <div className="arch-table avs-errors sl-errors">
          <Table size="small">
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell scope="col">Svar</Table.HeaderCell>
                <Table.HeaderCell scope="col">Hva skjer</Table.HeaderCell>
                <Table.HeaderCell scope="col">Ny status</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {RESPONSES.map((g) => (
                <Fragment key={g.call}>
                  <Table.Row className="sl-errors__group">
                    <Table.HeaderCell scope="colgroup" colSpan={3}>
                      <span className="sl-errors__call">{g.call}</span>
                      <span className="arch-mono arch-subtle">
                        {g.job} → {g.endpoint}
                      </span>
                    </Table.HeaderCell>
                  </Table.Row>
                  {g.rows.map((r) => (
                    <Table.Row key={r.code}>
                      <Table.HeaderCell scope="row">
                        <span className="avs-code" data-tone={r.tone}>
                          {r.code}
                        </span>
                      </Table.HeaderCell>
                      <Table.DataCell>{r.what}</Table.DataCell>
                      <Table.DataCell>
                        <StatusChips ids={r.result} onFocusStatus={focusStatus} />
                      </Table.DataCell>
                    </Table.Row>
                  ))}
                </Fragment>
              ))}
            </Table.Body>
          </Table>
        </div>

        <div className="arch-pitfalls avs-pitfalls">
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

      <Section
        id="drift"
        eyebrow="Drift"
        title="Kjøring, miljøer og rapport"
        lead="Alle jobbene ligger i eux-slett-usendte-rinasaker-naisjob og kjører i tidssonen Europe/Oslo. Hver jobb gjør ett kall mot samme endepunkt, med prosessnavnet i stien."
      >
        <div className="arch-table avs-jobtable">
          <Table size="small">
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell scope="col">Jobb</Table.HeaderCell>
                {ENVS.map((e) => (
                  <Table.HeaderCell key={e.id} scope="col">
                    {e.label}
                  </Table.HeaderCell>
                ))}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {JOBS.map((j) => (
                <Table.Row key={j.id}>
                  <Table.HeaderCell scope="row">
                    <span className="avs-night__no avs-night__no--inline" aria-hidden>
                      {j.no}
                    </span>{" "}
                    <span className="arch-mono">{j.id}</span>
                  </Table.HeaderCell>
                  {ENVS.map((e) => {
                    const s = j.sched[e.id];
                    return (
                      <Table.DataCell key={e.id} className={e.id !== "prod" && differsFromProd(j, e.id) ? "avs-diffcell" : undefined}>
                        <span className={s.freq === "never" ? "arch-subtle" : ""}>{schedLabel(s)}</span>
                        <code className="avs-cron">{s.cron}</code>
                      </Table.DataCell>
                    );
                  })}
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
        <BodyShort size="small" className="arch-subtle avs-note">
          Uthevede celler avviker fra prod. CronJob-ene heter <code>eux-slett-usendte-rinasaker-&lt;jobb&gt;-naisjob</code>, med{" "}
          <code>-q1</code>/<code>-q2</code> i dev.
        </BodyShort>

        <div className="avs-ops">
          <div className="avs-ops__col">
            <article className="arch-card avs-ops__card" data-tone="accent">
              <Heading level="3" size="xsmall">
                Endepunktet
              </Heading>
              <Snippet>{"POST /api/v1/sletteprosess/{sletteprosess}/execute"}</Snippet>
              <BodyShort size="small">
                Synkront: svarer <code>204</code> når prosessen er ferdig, og <code>400</code> for et ukjent prosessnavn. Gyldige
                verdier:
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
              <BodyShort size="small">Start en ny kjøring fra CronJob-en, f.eks. slett i prod:</BodyShort>
              <Snippet>kubectl create job --from=cronjob/eux-slett-usendte-rinasaker-slett-naisjob slett-manuell -n eessibasis</Snippet>
              <BodyShort size="small" className="arch-subtle">
                Navnet på den nye jobben må være unikt. Husk at slett faktisk sletter i RINA.
              </BodyShort>
            </article>
            <article className="arch-card avs-ops__card" data-tone="neutral">
              <Heading level="3" size="xsmall">
                Tabellen rinasak_status
              </Heading>
              <BodyShort size="small">Én rad per sak. Status er tekst, så det er enkelt å se etter i databasen:</BodyShort>
              <ul className="sl-db">
                {DB_COLUMNS.map(([col, note]) => (
                  <li key={col}>
                    <code>{col}</code>
                    {note && <span className="sl-db__note">{note}</span>}
                  </li>
                ))}
              </ul>
              <Snippet>{"select status, count(*) from rinasak_status group by status;"}</Snippet>
            </article>
          </div>
          <div className="avs-ops__col">
            <Heading level="3" size="xsmall" spacing>
              Månedsrapporten i Slack
            </Heading>
            <SlackReport />
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
