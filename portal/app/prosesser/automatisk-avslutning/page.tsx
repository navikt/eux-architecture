"use client";

import { useCallback, useState, type ReactNode } from "react";
import NextLink from "next/link";
import { Accordion, BodyLong, BodyShort, CopyButton, Detail, Heading, Table } from "@navikt/ds-react";
import { ArrowRightIcon, ExternalLinkIcon, LightningIcon, MoonIcon, PadlockLockedIcon } from "@navikt/aksel-icons";
import { useReducedMotion, useScrollSpy } from "@/components/architecture/hooks";
import { BUCS, ENVS, JOBS, STATUSES, differsFromProd, schedLabel, type Role, type StatusId } from "@/components/avslutning/data";
import { archHref, ghHref } from "@/components/avslutning/tones";
import { CaseJourney } from "@/components/avslutning/CaseJourney";
import { SystemFlow } from "@/components/avslutning/SystemFlow";
import { NightPipeline, StatusChips } from "@/components/avslutning/NightPipeline";
import { StatusMachine } from "@/components/avslutning/StatusMachine";
import { DecisionSimulator } from "@/components/avslutning/DecisionSimulator";
import { BucTable } from "@/components/avslutning/BucTable";
import { LocalGlobal } from "@/components/avslutning/LocalGlobal";
import { SlackReport } from "@/components/avslutning/SlackReport";

const SECTIONS = [
  { id: "livslop", label: "Livsløp" },
  { id: "system", label: "Systemet" },
  { id: "natten", label: "Natten" },
  { id: "statuser", label: "Statuser" },
  { id: "regler", label: "Regler" },
  { id: "lokalt-globalt", label: "Lokalt og globalt" },
  { id: "feil", label: "Feil" },
  { id: "drift", label: "Drift" },
  { id: "ordliste", label: "Ordliste" },
  { id: "videre", label: "Videre" },
];
const SECTION_IDS = SECTIONS.map((s) => s.id);

const NIGHT_JOBS = JOBS.filter((j) => j.sched.prod?.freq === "daily" && j.sched.prod.h < 6).length;
const USED_STATUSES = STATUSES.filter((s) => !s.unused).length;

/* ---------- Innhold ---------- */

const ADVANCES: StatusId[] = ["AVSLUTTET_LOKALT", "AVSLUTTET_GLOBALT", "ARKIVERT", "UVIRKSOM"];

const RESPONSES: { code: string; what: ReactNode; result: StatusId[]; tone: "success" | "danger" | "warning" }[] = [
  {
    code: "2xx",
    what: "Handlingen er utført. Saken går videre.",
    result: ADVANCES,
    tone: "success",
  },
  {
    code: "409",
    what: "Terminatoren finner ikke handlingen på saken i RINA – «Close case», X001-handlingene eller arkivering.",
    result: ["HANDLING_MANGLER"],
    tone: "danger",
  },
  {
    code: "Andre 4xx",
    what: (
      <>
        Logges som «Uventet feil», men <strong>saken går videre som om kallet lyktes</strong>. Terminatoren sender
        4xx-svar fra RINA videre, så f.eks. 404 når saken ikke finnes i RINA havner her.
      </>
    ),
    result: ADVANCES,
    tone: "warning",
  },
  {
    code: "5xx og nettverk",
    what: "Feil i terminatoren eller RINA, tidsavbrudd og andre exceptions. Også når persondata til X001 mangler (500).",
    result: ["HANDLING_FEILET"],
    tone: "danger",
  },
];

const PITFALLS: { group: string; items: { title: string; body: ReactNode }[] }[] = [
  {
    group: "Regler og statuser",
    items: [
      {
        title: "«Mottatt» og «sendt» sjekker ikke retningen",
        body: (
          <>
            Kriteriene <code>mottattSedExistsForAvslutningAutomatisk</code> og <code>sentSedExistsForAvslutningAutomatisk</code>{" "}
            sjekker bare at en SED av riktig type finnes. For UB_BUC_01 slår regelen til selv om det er NAV som har sendt
            U002. Bare <code>sisteSedForAvslutningAutomatiskKrevesSendtFraNav</code> (FB_BUC_01) ser på retningen.
          </>
        ),
      },
      {
        title: "Hva som starter klokken på nytt",
        body: (
          <ul>
            <li>
              <strong>Uvirksom</strong> regnes fra den nyeste SED-en. En ny SED skyver grensen.
            </li>
            <li>
              <strong>Reserve og arkivering</strong> regnes fra <code>endretTidspunkt</code> på saken. Den oppdateres av
              hver sakshendelse fra RINA og hver statusendring. En dokumenthendelse oppdaterer den bare når den vekker en
              uvirksom sak.
            </li>
            <li>
              En dokumenthendelse vekker bare en sak som er <code>UVIRKSOM</code>. Andre statuser påvirkes ikke.
            </li>
          </ul>
        ),
      },
      {
        title: "Saker uten SED-er avsluttes aldri",
        body: (
          <>
            sett-uvirksom ser bare på saker som har minst én SED. En sak som aldri får en SED, blir stående som{" "}
            <code>NY_SAK</code> i eux-avslutt-rinasaker.
          </>
        ),
      },
      {
        title: "SLETT_DOKUMENTUTKAST settes ingen steder",
        body: (
          <>
            slett-dokumentutkast kjører hver dag i prod, men ingen kode setter statusen den ser etter. Den må settes utenfor
            appen, f.eks. direkte i databasen. <code>DOKUMENT_SENT</code>, <code>KAN_IKKE_AVSLUTTES</code> og{" "}
            <code>OPPRETT_OPPGAVE</code> er heller ikke i bruk.
          </>
        ),
      },
    ],
  },
  {
    group: "Drift",
    items: [
      {
        title: "Feilede saker prøves aldri igjen",
        body: (
          <>
            <code>HANDLING_MANGLER</code> og <code>HANDLING_FEILET</code> er endelige. Ingen jobb plukker dem opp. Den
            månedlige rapporten viser antallet og opptil 10 saker – resten må undersøkes i databasen.
          </>
        ),
      },
      {
        title: "En mislykket kjøring ser vellykket ut",
        body: (
          <>
            NAIS-jobben logger bare en advarsel hvis kallet til eux-avslutt-rinasaker feiler, og avslutter normalt. Med{" "}
            <code>backoffLimit: 0</code> blir det heller ikke gjort nye forsøk. Følg med på loggene, ikke på jobbstatusen.
          </>
        ),
      },
      {
        title: "Grenser per kjøring",
        body: (
          <>
            sett-uvirksom tar maks 5 000 saker per BUC, og avslutt maks 1 000 lokale og 1 000 globale per BUC. Et stort
            etterslep tar derfor flere netter. til-avslutning, til-arkivering og arkiver har ingen grense.
          </>
        ),
      },
      {
        title: "Q2 er en dag forsinket",
        body: (
          <>
            I Q2 kjører til-avslutning kl. 12.05, altså etter avslutt (kl. 03.00). En sak som blir klar for avslutning, lukkes
            derfor først natten etter. Rapporten i Q2 er satt til 31. februar og sendes aldri.
          </>
        ),
      },
    ],
  },
];

const GLOSSARY: { term: string; full?: string; text: string }[] = [
  { term: "RINA", full: "Reference Implementation of a National Application", text: "Europakommisjonens system for å behandle EESSI-saker. Sakene som lukkes og arkiveres, ligger her." },
  { term: "BUC", full: "Business Use Case", text: "En saksprosess i EESSI. Reglene for avslutning er satt per BUC." },
  { term: "SED", full: "Structured Electronic Document", text: "Et strukturert dokument som sendes mellom landene i en BUC." },
  { term: "X001", text: "SED-en som avslutter en sak for alle deltakerne. Brukes ved global lukking." },
  { term: "Sakseier", text: "NAV eier saken i RINA (rollen PO i sakshendelsen). Bare sakseier kan lukke globalt." },
  { term: "Motpart", text: "NAV deltar i en sak som et annet land eier (rollen CP i sakshendelsen)." },
  { term: "Lokal lukking", text: "Handlingen «Close case» i RINA. Saken lukkes bare hos NAV." },
  { term: "Global lukking", text: "NAV sender X001, og saken lukkes hos alle deltakerne." },
  { term: "Uvirksom", text: "Ingen SED er sendt eller mottatt innenfor grensen for BUC-en (90, 120 eller 180 dager)." },
  { term: "endretTidspunkt", text: "Når saken sist ble endret i eux-avslutt-rinasaker. Grunnlaget for reserveregelen og arkivering." },
  { term: "NAIS-jobb", text: "En Kubernetes CronJob på NAIS. Her: en jobb per prosess som bare kaller REST-endepunktet." },
];

const REPOS = ["eux-avslutt-rinasaker", "eux-avslutt-rinasaker-naisjob", "eux-rina-terminator-api"];

const FURTHER: { href: string; title: string; text: string; external?: boolean }[] = [
  { href: archHref("eux-avslutt-rinasaker"), title: "Arkitektur", text: "Se eux-avslutt-rinasaker i arkitekturkartet, med alt den snakker med." },
  { href: "/prosesser/automatisk-sletting", title: "Automatisk sletting", text: "Hvordan saker uten sendt SED slettes etter 15 dager." },
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

export default function AutomatiskAvslutningPage() {
  const active = useScrollSpy(SECTION_IDS);
  const reduced = useReducedMotion();
  const [buc, setBuc] = useState("FB_BUC_01");
  const [role, setRole] = useState<Role>("sakseier");
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
  const pickBuc = useCallback(
    (b: string) => {
      setBuc(b);
      scrollTo("simulator");
    },
    [scrollTo],
  );

  return (
    <div className="portal-page--wide arch-page avs-page">
      <header className="portal-hero arch-hero">
        <div className="arch-hero__text">
          <Detail className="arch-eyebrow">Prosess</Detail>
          <Heading level="1" size="xlarge" spacing>
            Automatisk avslutning av RINA-saker
          </Heading>
          <BodyLong size="large" className="arch-hero__lead">
            Saker uten aktivitet skal ikke bli liggende åpne i RINA. eux-avslutt-rinasaker følger hver sak via Kafka, og hver
            natt flytter fem NAIS-jobber sakene ett steg videre: fra uvirksom, via regler per BUC, til lukket og arkivert i
            RINA.
          </BodyLong>
        </div>

        <dl className="arch-stats">
          {[
            { n: BUCS.length, label: "BUC-typer", sub: "med egne regler" },
            { n: JOBS.length, label: "NAIS-jobber", sub: `${NIGHT_JOBS} av dem om natten` },
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
                RINA → eux-all-rina-events → Kafka. Nye saker registreres, og en ny SED vekker en uvirksom sak.
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
                Fra kl. 01.00 til 05.00 flytter hver jobb sakene ett steg. Alt kan skje samme natt.
              </span>
            </span>
            <ArrowRightIcon aria-hidden className="arch-flow-card__arrow" />
          </a>
          <a href="#lokalt-globalt" className="arch-flow-card" data-tone="info">
            <span className="arch-flow-card__icon" aria-hidden>
              <PadlockLockedIcon />
            </span>
            <span>
              <strong>Lukking i RINA</strong>
              <span className="arch-flow-card__text">
                eux-rina-terminator-api lukker saken hos NAV, eller sender X001 slik at den lukkes hos alle.
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
        title="En sak fra første SED til arkiv"
        lead="Velg en BUC og NAVs rolle, og trykk «Spill av» for å se hva som skjer med saken dag for dag. Grensene og reglene er hentet fra Buc.kt i eux-avslutt-rinasaker."
      >
        <CaseJourney buc={buc} role={role} onBuc={setBuc} onRole={setRole} onFocusStatus={focusStatus} />
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
        title="Natten i eux-avslutt-rinasaker"
        lead="Hver NAIS-jobb gjør ett POST-kall mot eux-avslutt-rinasaker og venter til prosessen er ferdig. Jobbene går etter hverandre, så en sak kan gå fra uvirksom til lukket samme natt. Bytt miljø for å se hvordan Q1 og Q2 skiller seg fra prod."
      >
        <NightPipeline onFocusStatus={focusStatus} />
      </Section>

      <Section
        id="statuser"
        eyebrow="Tilstander"
        title="Statusene til en sak"
        lead="Tallene på pilene viser hvilken jobb som flytter saken. Statusene i de stiplede feltene fører til et kall mot RINA neste gang jobben kjører – det er bare der noe kan feile."
      >
        <StatusMachine selected={status} onSelect={setStatus} />
      </Section>

      <Section
        id="regler"
        eyebrow="Regler"
        title="Når lukkes en uvirksom sak?"
        lead="Hver natt vurderer til-avslutning de uvirksomme sakene mot reglene for BUC-en. Kriteriene prøves i fast rekkefølge, og det første som slår til, avgjør. Bygg opp en sak og se hvilket kriterium som slår til."
      >
        <DecisionSimulator buc={buc} role={role} onBuc={setBuc} onRole={setRole} onFocusStatus={focusStatus} />
        <div className="avs-subhead">
          <Heading level="3" size="small">
            Alle BUC-ene
          </Heading>
          <BodyShort size="small" className="arch-subtle">
            «Motparten» betyr at NAV ikke lukker saken i den rollen, og saken får status AVSLUTTES_AV_MOTPART. Klikk på en
            BUC for å prøve den i simulatoren.
          </BodyShort>
        </div>
        <BucTable selected={buc} onPick={pickBuc} />
      </Section>

      <Section
        id="lokalt-globalt"
        eyebrow="Lukking i RINA"
        title="Lokalt eller globalt"
        lead="avslutt kaller eux-rina-terminator-api, som gjør selve jobben i RINA. Om saken lukkes lokalt eller globalt, er bestemt av BUC-en og NAVs rolle."
      >
        <LocalGlobal onFocusStatus={focusStatus} />
      </Section>

      <Section
        id="feil"
        eyebrow="Feilhåndtering"
        title="Når kallet til RINA feiler"
        lead="avslutt, arkiver og slett-dokumentutkast kaller eux-rina-terminator-api for én sak om gangen. Svaret avgjør neste status. Ingen jobb prøver igjen."
      >
        <div className="arch-table avs-errors">
          <Table size="small">
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell scope="col">Svar</Table.HeaderCell>
                <Table.HeaderCell scope="col">Hva skjer</Table.HeaderCell>
                <Table.HeaderCell scope="col">Ny status</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {RESPONSES.map((r) => (
                <Table.Row key={r.code}>
                  <Table.HeaderCell scope="row">
                    <span className="avs-code" data-tone={r.tone}>
                      {r.code}
                    </span>
                  </Table.HeaderCell>
                  <Table.DataCell>{r.what}</Table.DataCell>
                  <Table.DataCell>
                    {r.result === ADVANCES ? (
                      <span className="arch-subtle" style={{ whiteSpace: "nowrap" }}>
                        Neste status for jobben
                      </span>
                    ) : (
                      <StatusChips ids={r.result} onFocusStatus={focusStatus} />
                    )}
                  </Table.DataCell>
                </Table.Row>
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
        lead="Alle jobbene ligger i eux-avslutt-rinasaker-naisjob og kjører i tidssonen Europe/Oslo. Hver jobb gjør ett kall mot samme endepunkt, med prosessnavnet i stien."
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
                        <span className={s ? "" : "arch-subtle"}>{schedLabel(s)}</span>
                        {s && <code className="avs-cron">{s.cron}</code>}
                      </Table.DataCell>
                    );
                  })}
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
        <BodyShort size="small" className="arch-subtle avs-note">
          Uthevede celler avviker fra prod.
        </BodyShort>

        <div className="avs-ops">
          <div className="avs-ops__col">
            <article className="arch-card avs-ops__card" data-tone="accent">
              <Heading level="3" size="xsmall">
                Endepunktet
              </Heading>
              <Snippet>{"POST /api/v1/prosesser/{prosess}/execute"}</Snippet>
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
              <BodyShort size="small">Start en ny kjøring fra CronJob-en, f.eks. avslutt i prod:</BodyShort>
              <Snippet>kubectl create job --from=cronjob/eux-avslutt-rinasaker-avslutt-naisjob avslutt-manuell -n eessibasis</Snippet>
              <BodyShort size="small" className="arch-subtle">
                Bytt ut CronJob-navnet med en av appene i tabellen over (med <code>-q1</code>/<code>-q2</code> i dev). Navnet på
                den nye jobben må være unikt.
              </BodyShort>
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
