"use client";

import { useMemo, useState, type ComponentType, type ReactNode, type SVGProps } from "react";
import { Accordion, BodyLong, BodyShort, Chips, CopyButton, Detail, Heading, Table, Tag } from "@navikt/ds-react";
import {
  ArchiveIcon,
  ArrowRightIcon,
  CalendarIcon,
  CogIcon,
  DatabaseIcon,
  FilePlusIcon,
  FileTextIcon,
  FolderIcon,
  HouseIcon,
  InformationSquareIcon,
  MonitorIcon,
  PaletteIcon,
  PaperclipIcon,
  PencilIcon,
  PlusCircleIcon,
  SparklesIcon,
} from "@navikt/aksel-icons";
import { useScrollSpy } from "@/components/architecture/hooks";
import {
  CDM44_NOTE,
  CHANGE_KINDS,
  MONTHS,
  NEW_SEDS,
  PERIOD_FROM,
  PROD_DATE,
  REPO_COUNTS,
  SCREENS,
  SED_FAMILIES,
  TECH,
  TIMELINE,
  UPDATED,
  UPDATED_SEDS,
  jiraHref,
  monthLabel,
  monthShort,
  type ChangeKind,
  type ScreenIcon,
  type SedFamily,
} from "./data";
import { Section } from "@/components/page/Section";

const PAGE_URL = "https://eux-docs.intern.dev.nav.no/nytt-i-neessi";

const SECTIONS = [
  { id: "kort", label: "Kort fortalt" },
  { id: "nye-seder", label: "Nye SED-er" },
  { id: "skjermbilder", label: "Skjermbilder" },
  { id: "endrede-seder", label: "Endrede SED-er" },
  { id: "tidslinje", label: "Tidslinje" },
  { id: "teknisk", label: "Teknisk" },
  { id: "om", label: "Om oversikten" },
];
const SECTION_IDS = SECTIONS.map((s) => s.id);

const SCREEN_ICONS: Record<ScreenIcon, ComponentType<SVGProps<SVGSVGElement>>> = {
  house: HouseIcon,
  plus: PlusCircleIcon,
  folder: FolderIcon,
  journal: ArchiveIcon,
  pencil: PencilIcon,
  doc: FileTextIcon,
  paperclip: PaperclipIcon,
  palette: PaletteIcon,
  database: DatabaseIcon,
};

const SEDS_IN_PROD = NEW_SEDS.filter((s) => s.status === "prod");
const SCREEN_CHANGE_COUNT = SCREENS.reduce((n, a) => n + a.changes.length, 0);
const UPDATED_SED_COUNT = new Set(UPDATED_SEDS.flatMap((u) => u.seds)).size;
const TOTAL_PRS = REPO_COUNTS.reduce((n, r) => n + r.prs, 0);
const TOTAL_BOT_PRS = REPO_COUNTS.reduce((n, r) => n + r.dependabot, 0);
const kindMeta = (k: ChangeKind) => CHANGE_KINDS.find((c) => c.id === k)!;
const familyMeta = (f: SedFamily) => SED_FAMILIES.find((x) => x.id === f)!;

const HIGHLIGHTS: { tone: string; title: string; text: ReactNode; href: string }[] = [
  {
    tone: "success",
    title: `${SEDS_IN_PROD.length} nye SED-er`,
    text: "H065, H120, H021, H070, hele H_BUC_02a (H003, H005, H006), gjenåpning og institusjoner (X002–X007) og U013.",
    href: "#nye-seder",
  },
  {
    tone: "accent",
    title: "Årlig kontroll fra forsiden",
    text: "Lag en ny F001 for årlig kontroll med ett trykk, basert på den nyeste aktive F001-en.",
    href: "#skjermbilder",
  },
  {
    tone: "meta-purple",
    title: "Datamodell 4.4",
    text: "F-, U-, X- og H001-skjemaene er tilpasset 4.4, som RINA tok i bruk i februar 2026.",
    href: "#endrede-seder",
  },
  {
    tone: "info",
    title: "Færre avvisninger fra RINA",
    text: "Beløp, datoer, valuta og telefonnummer sjekkes før sending. Avviser RINA likevel, vises begrunnelsen.",
    href: "#skjermbilder",
  },
  {
    tone: "meta-lime",
    title: "Søk på internasjonal ID",
    text: "Finn en sak med den internasjonale saks-ID-en, ikke bare saksnummer eller fødselsnummer.",
    href: "#skjermbilder",
  },
  {
    tone: "warning",
    title: "Nytt utseende og mørk modus",
    text: "nEESSI bruker nyeste versjon av Navs designsystem, med knapp for mørk modus.",
    href: "#skjermbilder",
  },
];

/* ---------- Byggeklosser ---------- */

function JiraLinks({ keys }: { keys?: string[] }) {
  if (!keys?.length) return null;
  return (
    <span className="nyt-jira">
      {keys.map((k) => (
        <a key={k} href={jiraHref(k)} target="_blank" rel="noreferrer" className="arch-mono">
          {k}
        </a>
      ))}
    </span>
  );
}

function MonthBadge({ month }: { month: (typeof MONTHS)[number]["id"] }) {
  return (
    <span className="nyt-month" title={monthLabel(month)}>
      <CalendarIcon aria-hidden />
      {monthShort(month)}
    </span>
  );
}

/* ---------- Seksjoner ---------- */

function NewSeds() {
  const [family, setFamily] = useState<SedFamily | null>(null);
  const shown = family ? NEW_SEDS.filter((s) => s.family === family) : NEW_SEDS;

  return (
    <>
      <Chips className="nyt-filter" aria-label="Filtrer på SED-type">
        <Chips.Toggle selected={family === null} onClick={() => setFamily(null)} checkmark={false}>
          {`Alle (${NEW_SEDS.length})`}
        </Chips.Toggle>
        {SED_FAMILIES.map((f) => (
          <Chips.Toggle key={f.id} selected={family === f.id} onClick={() => setFamily(family === f.id ? null : f.id)} checkmark={false}>
            {`${f.id} – ${f.label} (${NEW_SEDS.filter((s) => s.family === f.id).length})`}
          </Chips.Toggle>
        ))}
      </Chips>

      <ul className="nyt-sed-grid" aria-live="polite">
        {shown.map((s) => {
          const fam = familyMeta(s.family);
          return (
            <li key={s.code} className="arch-card nyt-sed" data-tone={s.status === "prod" ? fam.tone : undefined} data-status={s.status}>
              <div className="nyt-sed__top">
                <span className="nyt-sed__code arch-mono">{s.code}</span>
                {s.status === "prod" ? (
                  <Tag size="xsmall" variant="moderate" data-color="success">
                    I bruk
                  </Tag>
                ) : (
                  <Tag size="xsmall" variant="outline" data-color="warning">
                    Laget, ikke slått på
                  </Tag>
                )}
              </div>
              <Heading level="3" size="xsmall" className="nyt-sed__name">
                {s.name}
              </Heading>
              <BodyShort size="small" className="arch-card__summary">
                {s.what}
              </BodyShort>
              <dl className="nyt-sed__meta">
                <div>
                  <dt>BUC</dt>
                  <dd className="arch-mono">{s.buc}</dd>
                </div>
                <div>
                  <dt>Hvor</dt>
                  <dd>{s.how}</dd>
                </div>
              </dl>
              <div className="nyt-sed__foot">
                <MonthBadge month={s.month} />
                <JiraLinks keys={s.jira} />
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Screens() {
  const [kind, setKind] = useState<ChangeKind | null>(null);
  const areas = useMemo(
    () =>
      SCREENS.map((a) => ({ ...a, changes: kind ? a.changes.filter((c) => c.kind === kind) : a.changes })).filter((a) => a.changes.length > 0),
    [kind],
  );

  return (
    <>
      <Chips className="nyt-filter" aria-label="Filtrer på type endring">
        <Chips.Toggle selected={kind === null} onClick={() => setKind(null)} checkmark={false}>
          {`Alle (${SCREEN_CHANGE_COUNT})`}
        </Chips.Toggle>
        {CHANGE_KINDS.map((k) => (
          <Chips.Toggle key={k.id} selected={kind === k.id} onClick={() => setKind(kind === k.id ? null : k.id)} checkmark={false}>
            {`${k.label} (${SCREENS.reduce((n, a) => n + a.changes.filter((c) => c.kind === k.id).length, 0)})`}
          </Chips.Toggle>
        ))}
      </Chips>

      <div className="nyt-areas">
        {areas.map((a) => {
          const Icon = SCREEN_ICONS[a.icon];
          return (
            <article key={a.id} className="nyt-area" aria-labelledby={`area-${a.id}`}>
              <header className="nyt-area__head">
                <span className="nyt-area__icon" aria-hidden>
                  <Icon />
                </span>
                <div>
                  <Heading level="3" size="small" id={`area-${a.id}`}>
                    {a.title}
                  </Heading>
                  <BodyShort size="small" className="arch-subtle">
                    {a.intro}
                  </BodyShort>
                </div>
              </header>
              <ul className="nyt-changes">
                {a.changes.map((c) => {
                  const k = kindMeta(c.kind);
                  return (
                    <li key={c.title} className="nyt-change" data-kind={c.kind}>
                      <div className="nyt-change__head">
                        <Tag size="xsmall" variant="moderate" data-color={k.color}>
                          {k.label}
                        </Tag>
                        <BodyShort weight="semibold">{c.title}</BodyShort>
                        <MonthBadge month={c.month} />
                      </div>
                      <BodyShort size="small" className="nyt-change__text">
                        {c.text}
                      </BodyShort>
                      {c.note && (
                        <BodyShort size="small" className="nyt-note">
                          <InformationSquareIcon aria-hidden />
                          {c.note}
                        </BodyShort>
                      )}
                      <JiraLinks keys={c.jira} />
                    </li>
                  );
                })}
              </ul>
            </article>
          );
        })}
      </div>
    </>
  );
}

function UpdatedSeds() {
  return (
    <>
      <div className="arch-card nyt-callout" data-tone="meta-purple">
        <BodyShort weight="semibold">RINA over på datamodell 4.4</BodyShort>
        <BodyShort size="small">{CDM44_NOTE}</BodyShort>
      </div>
      <div className="arch-table">
        <Table size="small">
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell scope="col">SED</Table.HeaderCell>
              <Table.HeaderCell scope="col">Endring</Table.HeaderCell>
              <Table.HeaderCell scope="col">Når</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {UPDATED_SEDS.map((u) => (
              <Table.Row key={u.title}>
                <Table.DataCell>
                  <span className="nyt-sedlist">
                    {u.seds.map((s) => (
                      <Tag key={s} size="xsmall" variant="outline" data-color="neutral" className="arch-mono">
                        {s}
                      </Tag>
                    ))}
                  </span>
                </Table.DataCell>
                <Table.DataCell>
                  <BodyShort weight="semibold" size="small">
                    {u.title}
                  </BodyShort>
                  <BodyShort size="small" className="arch-subtle">
                    {u.text}
                  </BodyShort>
                  <JiraLinks keys={u.jira} />
                </Table.DataCell>
                <Table.DataCell className="nyt-nowrap">{monthShort(u.month)}</Table.DataCell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </div>
    </>
  );
}

function TimelineView() {
  return (
    <ol className="nyt-timeline">
      {TIMELINE.map((t) => (
        <li key={t.month} className="nyt-timeline__month">
          <span className="nyt-timeline__dot" aria-hidden />
          <Detail weight="semibold" className="nyt-timeline__label">
            {monthLabel(t.month)}
          </Detail>
          <ul>
            {t.items.map((i) =>
              i.startsWith("Ny SED: ") ? (
                <li key={i} className="nyt-timeline__sed">
                  <FilePlusIcon aria-hidden />
                  <span>
                    Ny SED: <strong className="arch-mono">{i.slice(8)}</strong>
                  </span>
                </li>
              ) : (
                <li key={i}>{i}</li>
              ),
            )}
          </ul>
        </li>
      ))}
    </ol>
  );
}

function Tech() {
  return (
    <>
      <dl className="nyt-repo-stats">
        {REPO_COUNTS.map((r) => (
          <div key={r.repo}>
            <dt className="arch-mono">{r.repo}</dt>
            <dd>
              <strong>{r.prs}</strong> sammenslåtte PR-er, hvorav {r.dependabot} fra Dependabot
            </dd>
          </div>
        ))}
      </dl>
      <Accordion size="small" className="nyt-tech">
        {TECH.map((g) => (
          <Accordion.Item key={g.id}>
            <Accordion.Header>
              {g.title} <span className="nyt-tech__repos arch-mono">{g.repos}</span>
            </Accordion.Header>
            <Accordion.Content>
              <ul className="nyt-tech__list">
                {g.items.map((i) => (
                  <li key={i.text}>
                    <span>{i.text}</span>
                    <span className="nyt-tech__meta">
                      {i.pending && (
                        <Tag size="xsmall" variant="outline" data-color="warning">
                          Ikke i prod ennå
                        </Tag>
                      )}
                      {i.month && <span className="arch-subtle">{monthShort(i.month)}</span>}
                      <JiraLinks keys={i.jira} />
                    </span>
                  </li>
                ))}
              </ul>
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion>
    </>
  );
}

/* ---------- Side ---------- */

export function NyttINeessi() {
  const active = useScrollSpy(SECTION_IDS);

  return (
    <div className="portal-page--wide arch-page nyt-page">
      <header className="portal-hero arch-hero">
        <div className="arch-hero__text">
          <Detail className="arch-eyebrow">nEESSI · oppdatert {UPDATED}</Detail>
          <Heading level="1" size="xlarge" spacing>
            Nytt i nEESSI siden desember 2025
          </Heading>
          <BodyLong size="large" className="arch-hero__lead">
            Dette har skjedd i nEESSI fra {PERIOD_FROM}: nye SED-er, endringer i skjermbildene og feil som er rettet. Alt
            er i bruk i produksjon, med mindre noe annet står.
          </BodyLong>
          <div className="nyt-share">
            <CopyButton copyText={PAGE_URL} size="small" text="Kopier lenke til siden" activeText="Lenken er kopiert" />
          </div>
        </div>

        <dl className="arch-stats">
          {[
            { n: SEDS_IN_PROD.length, label: "nye SED-er", sub: "i bruk i produksjon" },
            { n: SCREEN_CHANGE_COUNT, label: "endringer i skjermbilder", sub: "nytt, forbedret og rettet" },
            { n: UPDATED_SED_COUNT, label: "SED-er tilpasset", sub: "bl.a. datamodell 4.4" },
            { n: MONTHS.length, label: "måneder", sub: "desember 2025 – oktober 2026" },
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
          <a href="#nye-seder" className="arch-flow-card" data-tone="success">
            <span className="arch-flow-card__icon" aria-hidden>
              <FilePlusIcon />
            </span>
            <span>
              <strong>Nye SED-er</strong>
              <span className="arch-flow-card__text">Hva de brukes til, og hvor saksbehandler finner dem.</span>
            </span>
            <ArrowRightIcon aria-hidden className="arch-flow-card__arrow" />
          </a>
          <a href="#skjermbilder" className="arch-flow-card" data-tone="accent">
            <span className="arch-flow-card__icon" aria-hidden>
              <MonitorIcon />
            </span>
            <span>
              <strong>Skjermbilder</strong>
              <span className="arch-flow-card__text">Det som er nytt, forbedret eller rettet – ordnet etter skjermbilde.</span>
            </span>
            <ArrowRightIcon aria-hidden className="arch-flow-card__arrow" />
          </a>
          <a href="#tidslinje" className="arch-flow-card" data-tone="info">
            <span className="arch-flow-card__icon" aria-hidden>
              <SparklesIcon />
            </span>
            <span>
              <strong>Måned for måned</strong>
              <span className="arch-flow-card__text">Det viktigste fra hver måned i en tidslinje.</span>
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

      <Section id="kort" eyebrow="Oppsummert" title="Kort fortalt" lead="De største endringene for saksbehandlerne. Trykk på et kort for detaljer.">
        <ul className="nyt-highlights">
          {HIGHLIGHTS.map((h) => (
            <li key={h.title}>
              <a href={h.href} className="arch-card nyt-highlight" data-tone={h.tone}>
                <strong>{h.title}</strong>
                <BodyShort size="small" className="arch-card__summary">
                  {h.text}
                </BodyShort>
              </a>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        id="nye-seder"
        eyebrow="For saksbehandler"
        title="Nye SED-er"
        lead={`${SEDS_IN_PROD.length} SED-er kan nå lages og sendes fra nEESSI uten å gå via RINA. I tillegg er X013 laget, men ikke slått på ennå.`}
      >
        <NewSeds />
      </Section>

      <Section
        id="skjermbilder"
        eyebrow="For saksbehandler"
        title="Endringer i skjermbildene"
        lead="Ordnet etter hvor i nEESSI endringen er. Filtrer for å se bare det som er nytt, forbedret eller rettet."
      >
        <Screens />
      </Section>

      <Section
        id="endrede-seder"
        eyebrow="For saksbehandler"
        title="SED-er som er endret"
        lead="SED-er som fantes fra før, men har fått nye felter eller er rettet."
      >
        <UpdatedSeds />
      </Section>

      <Section id="tidslinje" eyebrow="Måned for måned" title="Tidslinje" lead="Måneden endringen ble ferdig. Prodsetting skjer normalt samme eller neste uke.">
        <TimelineView />
      </Section>

      <Section
        id="teknisk"
        eyebrow="For de spesielt interesserte"
        title="Tekniske endringer"
        lead="Endringer under panseret som saksbehandlerne normalt ikke merker. Åpne en gruppe for detaljer."
        className="nyt-muted"
      >
        <Tech />
      </Section>

      <Section id="om" eyebrow="Kilder" title="Om oversikten" className="nyt-muted">
        <ul className="nyt-about">
          <li>
            <CogIcon aria-hidden />
            <BodyShort size="small">
              Bygget på {TOTAL_PRS} sammenslåtte pull requests ({TOTAL_BOT_PRS} av dem automatiske
              avhengighetsoppdateringer) og commits i <span className="arch-mono">eux-web-app</span> og{" "}
              <span className="arch-mono">eux-neessi</span>, sammen med JIRA-sakene i TEN-prosjektet.
            </BodyShort>
          </li>
          <li>
            <CalendarIcon aria-hidden />
            <BodyShort size="small">
              Måned er når endringen ble ferdig i koden. Alt på siden var i produksjon per {PROD_DATE}, med unntak av
              det som er merket «Laget, ikke slått på» eller «Ikke i prod ennå».
            </BodyShort>
          </li>
          <li>
            <InformationSquareIcon aria-hidden />
            <BodyShort size="small">
              JIRA-lenkene krever innlogging i Navs Atlassian. Sist oppdatert {UPDATED}.
            </BodyShort>
          </li>
        </ul>
      </Section>
    </div>
  );
}
