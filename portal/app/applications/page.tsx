"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import NextLink from "next/link";
import { BodyLong, BodyShort, Button, Chips, Detail, Heading, Search, Tag } from "@navikt/ds-react";
import { ArrowRightIcon, BranchingIcon, ChevronDownIcon, ExternalLinkIcon, GlobeIcon, LightningIcon } from "@navikt/aksel-icons";
import { useReducedMotion, useScrollSpy } from "@/components/architecture/hooks";
import {
  JOB_COUNT,
  NODES,
  NODE_BY_ID,
  SERVICE_COUNT,
  TOPIC_COUNT,
  edgeLabel,
  incoming,
  outgoing,
  type ArchEdge,
  type ArchNode,
  type Lang,
  type Zone,
} from "@/components/architecture/data";
import { archHref, ghHref } from "@/components/avslutning/tones";
import { ENV_IDS, ENVS, ENV_SERVICE_BY_ID, hostUrl, swaggerUrl } from "@/components/miljoer/data";

/* ---------- Innhold ---------- */

type Tone = "accent" | "success" | "info" | "meta-purple" | "meta-lime" | "warning";

const LAYERS: { id: string; short: string; title: string; zones: Zone[]; tone: Tone; lead: string }[] = [
  {
    id: "frontend",
    short: "Frontend",
    title: "Frontend og orkestrering",
    zones: ["frontend", "orkestrering"],
    tone: "accent",
    lead: "nEESSI er det saksbehandlerne ser. eux-neessi står bak og setter sammen data fra resten av EUX og NAV.",
  },
  {
    id: "domene",
    short: "Domene",
    title: "Domenetjenester",
    zones: ["domene"],
    tone: "success",
    lead: "Små tjenester som eier hver sin del av domenet, alle med egen PostgreSQL-database.",
  },
  {
    id: "rina",
    short: "RINA",
    title: "RINA-integrasjon",
    zones: ["rina-integrasjon"],
    tone: "info",
    lead: "Tjenestene som er bygget rundt RINA: mellomvaren mot CPI, avslutning og sletting, søk og PDF.",
  },
  {
    id: "hendelser",
    short: "Hendelser",
    title: "Hendelsesinfrastruktur",
    zones: ["hendelser"],
    tone: "meta-purple",
    lead: "Tar imot hendelser fra RINA og legger dem på Kafka, i nytt og gammelt format.",
  },
  {
    id: "bakgrunn",
    short: "Bakgrunn",
    title: "Bakgrunnstjenester",
    zones: ["bakgrunn"],
    tone: "meta-lime",
    lead: "Tjenester uten brukerflate. De lytter på Kafka eller kjøres på tidsplan.",
  },
  {
    id: "jobber",
    short: "Jobber",
    title: "NAIS-jobber",
    zones: ["jobber"],
    tone: "warning",
    lead: "Cron-utløsere uten forretningslogikk. De kaller et endepunkt i tjenesten de hører til.",
  },
];

const LIBRARIES = [
  { repo: "eux-parent-pom", tech: "Maven-parent", text: "Felles avhengighetsversjoner for Spring Boot, Kotlin, Java, token-validering og PostgreSQL." },
  { repo: "eux-logging", tech: "Kotlin-bibliotek", text: "MDC-filter for sporing av request-id og EUX-spesifikk loggkontekst." },
  { repo: "eux-versions-maven-plugin", tech: "Maven-plugin", text: "Øker patch-versjonen automatisk ut fra git-tagger. Brukes i CI/CD." },
];

const FURTHER: { href: string; title: string; text: string }[] = [
  { href: "/architecture", title: "Arkitektur", text: "Hele plattformen i ett kart, med flyter, mønstre og eksterne systemer." },
  { href: "/environments", title: "Miljøer", text: "Q1 og Q2: RINA, institusjoner, adresser, Swagger og helse." },
  { href: "/kafka/sed-hendelser", title: "SED-hendelser", text: "Hendelser fra RINA, live fra Kafka i Q1 og Q2." },
  { href: "/prosesser/journalfoering", title: "Journalføring", text: "Hvordan SED-er havner i arkivet, steg for steg." },
  { href: "/prosesser/automatisk-avslutning", title: "Automatisk avslutning", text: "Hvordan RINA-saker lukkes og arkiveres." },
  { href: "/nytt-i-neessi", title: "Nytt i nEESSI", text: "Siste endringer i nEESSI." },
];

const SECTIONS = [...LAYERS.map((l) => ({ id: l.id, label: l.short })), { id: "biblioteker", label: "Biblioteker" }, { id: "videre", label: "Videre" }];
const SECTION_IDS = SECTIONS.map((s) => s.id);

const APPS = NODES.filter((n) => n.kind === "app" || n.kind === "job");
const APP_IDS = new Set(APPS.map((n) => n.id));
const TONE_BY_ID: Record<string, Tone> = Object.fromEntries(
  APPS.map((n) => [n.id, LAYERS.find((l) => l.zones.includes(n.zone))?.tone ?? "accent"]),
);
const LANGS: Lang[] = ["Kotlin", "Java", "TypeScript"];
const LANG_COUNT = Object.fromEntries(LANGS.map((l) => [l, APPS.filter((n) => n.kind === "app" && n.lang === l).length]));
const DB_COUNT = APPS.filter((n) => n.db).length;

const usesKafka = (id: string) =>
  [...incoming(id), ...outgoing(id)].some((e) => e.kind === "event" && (NODE_BY_ID[e.from].kind === "topic" || NODE_BY_ID[e.to].kind === "topic"));

const haystack = (n: ArchNode) =>
  [n.name, n.summary, ...(n.facts ?? []), n.lang ?? "", ...[...incoming(n.id), ...outgoing(n.id)].map((e) => `${NODE_BY_ID[e.from].name} ${NODE_BY_ID[e.to].name}`)]
    .join(" ")
    .toLowerCase();
const HAYSTACK: Record<string, string> = Object.fromEntries(APPS.map((n) => [n.id, haystack(n)]));

type Filter = { q: string; langs: Lang[]; db: boolean; kafka: boolean };
const NO_FILTER: Filter = { q: "", langs: [], db: false, kafka: false };

const matches = (n: ArchNode, f: Filter) =>
  (f.langs.length === 0 || (n.lang && f.langs.includes(n.lang))) &&
  (!f.db || n.db) &&
  (!f.kafka || usesKafka(n.id)) &&
  f.q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((t) => HAYSTACK[n.id].includes(t));

const KIND_RANK: Record<string, number> = { app: 0, job: 0, topic: 1, team: 2, person: 2, external: 3 };

function group(title: string, edges: ArchEdge[], side: "from" | "to") {
  const items = edges
    .map((e) => ({ id: e[side], label: edgeLabel(e) }))
    .sort((a, b) => {
      const na = NODE_BY_ID[a.id];
      const nb = NODE_BY_ID[b.id];
      return KIND_RANK[na.kind] - KIND_RANK[nb.kind] || na.name.localeCompare(nb.name, "no");
    });
  return { title, items };
}

function relations(id: string) {
  const ins = incoming(id);
  const outs = outgoing(id);
  return [
    group("Startes av", ins.filter((e) => e.kind === "cron"), "from"),
    group("Kalles av", ins.filter((e) => e.kind === "rest"), "from"),
    group("Hendelser inn", ins.filter((e) => e.kind === "event"), "from"),
    group("Kaller", outs.filter((e) => e.kind === "rest"), "to"),
    group("Hendelser ut", outs.filter((e) => e.kind === "event"), "to"),
    group("Starter", outs.filter((e) => e.kind === "cron"), "to"),
  ].filter((g) => g.items.length > 0);
}

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

/** Lagene i plattformen som en stabel. Ved rulling glir lagene fra hverandre. */
function HeroArt() {
  const cx = 186;
  const w = 146;
  const h = 44;
  const box = "0 0 420 380";
  return (
    <div className="lite-hero__art" aria-hidden>
      {LAYERS.map((l, li) => {
        const cy = 78 + li * 46;
        const nodes = APPS.filter((n) => l.zones.includes(n.zone));
        const cols = Math.min(nodes.length, 4);
        const rows = Math.ceil(nodes.length / cols);
        const at = (a: number, b: number) => [cx + (a - b) * w, cy - h + (a + b) * h] as const;
        const depth = 0.9 - li * 0.16;
        return (
          <svg key={l.id} className="lite-layer" style={{ "--depth": depth } as CSSProperties} viewBox={box}>
            <g data-tone={l.tone} className="apps-plane" style={{ "--i": li } as CSSProperties}>
              <path d={`M ${cx} ${cy - h} L ${cx + w} ${cy} L ${cx} ${cy + h} L ${cx - w} ${cy} Z`} className="apps-plane__face" />
              {nodes.map((n, i) => {
                const [x, y] = at((((i % cols) + 1) / (cols + 1)) * 0.9 + 0.05, ((Math.floor(i / cols) + 1) / (rows + 1)) * 0.9 + 0.05);
                return <circle key={n.id} cx={x} cy={y} r={4.2} className="apps-plane__dot" style={{ "--j": i + li * 3 } as CSSProperties} />;
              })}
              <text x={cx + w + 10} y={cy + 4} className="apps-plane__label">
                {l.short}
              </text>
            </g>
          </svg>
        );
      })}
    </div>
  );
}

function NodeChip({ id, label, onJump }: { id: string; label: string; onJump: (id: string) => void }) {
  const n = NODE_BY_ID[id];
  const inPage = APP_IDS.has(id);
  const extra = label === "CPI" || label === "NIE" || label === "GraphQL" ? label : null;
  const body = (
    <>
      {n.name}
      {extra && <small>{extra}</small>}
    </>
  );
  if (inPage) {
    return (
      <a
        href={`#${id}`}
        className="apps-chip"
        data-tone={TONE_BY_ID[id]}
        onClick={(e: MouseEvent) => {
          e.preventDefault();
          onJump(id);
        }}
      >
        {body}
      </a>
    );
  }
  return (
    <NextLink href={archHref(id)} className="apps-chip" data-kind={n.kind} title={`${n.summary} Vis i arkitekturkartet.`}>
      {body}
    </NextLink>
  );
}

function EnvLinks({ id }: { id: string }) {
  const s = ENV_SERVICE_BY_ID[id];
  if (!s) return null;
  return (
    <div className="apps-envs">
      {ENV_IDS.map((env) => (
        <div key={env} className="apps-env" data-tone={ENVS[env].tone}>
          <span className="apps-env__badge">{ENVS[env].name}</span>
          {!s.envs.includes(env) ? (
            <span className="arch-subtle">Ikke i {ENVS[env].name}</span>
          ) : !s.health ? (
            <span className="arch-subtle">Ingen åpne endepunkter</span>
          ) : (
            <>
              <a href={hostUrl(s, env)} target="_blank" rel="noreferrer">
                Åpne <ExternalLinkIcon aria-hidden />
              </a>
              {s.swagger.includes(env) && (
                <a href={swaggerUrl(s, env)} target="_blank" rel="noreferrer">
                  Swagger <ExternalLinkIcon aria-hidden />
                </a>
              )}
            </>
          )}
        </div>
      ))}
      <NextLink href="/environments#tjenester" className="apps-envs__all">
        Alle endepunkter <ArrowRightIcon aria-hidden />
      </NextLink>
    </div>
  );
}

function AppCard({
  n,
  tone,
  open,
  flash,
  onToggle,
  onJump,
}: {
  n: ArchNode;
  tone: Tone;
  open: boolean;
  flash: boolean;
  onToggle: () => void;
  onJump: (id: string) => void;
}) {
  const ins = incoming(n.id).length;
  const outs = outgoing(n.id).length;
  const env = ENV_SERVICE_BY_ID[n.id];
  const q2Only = env && env.envs.length === 1 && env.envs[0] === "q2";
  const rels = relations(n.id);

  return (
    <article id={n.id} className={`apps-card${flash ? " is-flash" : ""}`} data-tone={tone} data-open={open || undefined}>
      <button type="button" className="apps-card__toggle" aria-expanded={open} aria-controls={`${n.id}-mer`} onClick={onToggle}>
        <span className="apps-card__top">
          <span className="apps-card__name arch-mono">{n.name}</span>
          <ChevronDownIcon aria-hidden className="apps-card__chev" />
        </span>
        <span className="apps-card__tags">
          {n.lang && (
            <Tag size="xsmall" variant="moderate" data-color="neutral">
              {n.lang}
            </Tag>
          )}
          {n.db && (
            <Tag size="xsmall" variant="moderate" data-color="success">
              PostgreSQL
            </Tag>
          )}
          {n.kind === "job" && (
            <Tag size="xsmall" variant="moderate" data-color="warning">
              Naisjob
            </Tag>
          )}
          {q2Only && (
            <Tag size="xsmall" variant="moderate" data-color="meta-purple">
              Bare i Q2
            </Tag>
          )}
        </span>
        <span className="apps-card__summary">{n.summary}</span>
        <span className="apps-card__meta arch-mono">
          {ins} inn · {outs} ut
        </span>
      </button>

      <div className="apps-card__more" id={`${n.id}-mer`} inert={!open}>
        <div className="apps-card__inner">
          {n.facts && n.facts.length > 0 && (
            <ul className="apps-card__facts">
              {n.facts.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          )}
          {rels.length > 0 && (
            <dl className="apps-rels">
              {rels.map((r) => (
                <div key={r.title}>
                  <dt>{r.title}</dt>
                  <dd>
                    {r.items.map((it) => (
                      <NodeChip key={`${r.title}-${it.id}`} id={it.id} label={it.label} onJump={onJump} />
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          <EnvLinks id={n.id} />
          <div className="apps-card__links">
            <NextLink href={archHref(n.id)}>
              Vis i arkitekturkartet <ArrowRightIcon aria-hidden />
            </NextLink>
            {n.link && (
              <NextLink href={n.link.href}>
                {n.link.label} <ArrowRightIcon aria-hidden />
              </NextLink>
            )}
            {n.repo && (
              <a href={ghHref(n.repo)} target="_blank" rel="noreferrer">
                GitHub <ExternalLinkIcon aria-hidden />
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

/* ---------- Side ---------- */

export default function ApplicationsPage() {
  const active = useScrollSpy(SECTION_IDS);
  const reduced = useReducedMotion();
  const [filter, setFilter] = useState<Filter>(NO_FILTER);
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const [flash, setFlash] = useState<string | null>(null);

  const visible = useMemo(() => new Set(APPS.filter((n) => matches(n, filter)).map((n) => n.id)), [filter]);
  const filtered = filter.q !== "" || filter.langs.length > 0 || filter.db || filter.kafka;
  const allOpen = open.size > 0 && [...visible].every((id) => open.has(id));

  const jump = useCallback(
    (id: string) => {
      if (!APP_IDS.has(id)) return;
      setFilter((f) => (matches(NODE_BY_ID[id], f) ? f : NO_FILTER));
      setOpen((prev) => new Set(prev).add(id));
      setFlash(id);
      if (window.location.hash !== `#${id}`) window.history.pushState(null, "", `#${id}`);
      requestAnimationFrame(() => {
        const el = document.getElementById(id);
        el?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
        el?.querySelector<HTMLButtonElement>(".apps-card__toggle")?.focus({ preventScroll: true });
      });
    },
    [reduced],
  );

  useEffect(() => {
    const onHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (APP_IDS.has(id)) jump(id);
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [jump]);

  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), 1800);
    return () => window.clearTimeout(t);
  }, [flash]);

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleLang = (l: Lang) =>
    setFilter((f) => ({ ...f, langs: f.langs.includes(l) ? f.langs.filter((x) => x !== l) : [...f.langs, l] }));

  return (
    <div className="portal-page--wide arch-page lite-page apps-page">
      <header className="portal-hero arch-hero lite-hero">
        <HeroArt />
        <div className="arch-hero__text">
          <Detail className="arch-eyebrow">Applikasjoner</Detail>
          <Heading level="1" size="xlarge" spacing>
            Tjenestene i EUX
          </Heading>
          <BodyLong size="large" className="arch-hero__lead">
            Alle tjenester og jobber i plattformen, lag for lag. Åpne et kort for å se hvem som kaller tjenesten, hva den
            kaller, og hvor den kjører i Q1 og Q2.
          </BodyLong>
        </div>

        <dl className="arch-stats">
          {[
            { n: SERVICE_COUNT, label: "tjenester", sub: LANGS.map((l) => `${LANG_COUNT[l]} ${l}`).join(" · ") },
            { n: JOB_COUNT, label: "NAIS-jobber", sub: "cron-utløsere" },
            { n: DB_COUNT, label: "med database", sub: "PostgreSQL i Cloud SQL" },
            { n: TOPIC_COUNT, label: "Kafka-topics", sub: "mellom tjenestene" },
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
          <NextLink href="/architecture#kart" className="arch-flow-card" data-tone="accent">
            <span className="arch-flow-card__icon" aria-hidden>
              <BranchingIcon />
            </span>
            <span>
              <strong>Arkitekturkartet</strong>
              <span className="arch-flow-card__text">Se hvordan tjenestene henger sammen, med flyter og eksterne systemer.</span>
            </span>
            <ArrowRightIcon aria-hidden className="arch-flow-card__arrow" />
          </NextLink>
          <NextLink href="/environments#tjenester" className="arch-flow-card" data-tone="meta-purple">
            <span className="arch-flow-card__icon" aria-hidden>
              <GlobeIcon />
            </span>
            <span>
              <strong>Miljøer</strong>
              <span className="arch-flow-card__text">Adresser, Swagger og helsesjekk for hver tjeneste i Q1 og Q2.</span>
            </span>
            <ArrowRightIcon aria-hidden className="arch-flow-card__arrow" />
          </NextLink>
          <NextLink href="/kafka/sed-hendelser" className="arch-flow-card" data-tone="info">
            <span className="arch-flow-card__icon" aria-hidden>
              <LightningIcon />
            </span>
            <span>
              <strong>Hendelser live</strong>
              <span className="arch-flow-card__text">Det eux-all-rina-events legger på Kafka, akkurat nå.</span>
            </span>
            <ArrowRightIcon aria-hidden className="arch-flow-card__arrow" />
          </NextLink>
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

      <div className="apps-toolbar" role="search">
        <div className="apps-toolbar__search">
          <Search
            label="Filtrer tjenester"
            hideLabel
            variant="simple"
            size="small"
            placeholder="Søk i navn, beskrivelse eller avhengighet, f.eks. «pdl»"
            value={filter.q}
            onChange={(q) => setFilter((f) => ({ ...f, q }))}
            onClear={() => setFilter((f) => ({ ...f, q: "" }))}
          />
        </div>
        <Chips size="small" aria-label="Filtrer på egenskaper">
          {LANGS.map((l) => (
            <Chips.Toggle key={l} selected={filter.langs.includes(l)} onClick={() => toggleLang(l)}>
              {l}
            </Chips.Toggle>
          ))}
          <Chips.Toggle selected={filter.db} onClick={() => setFilter((f) => ({ ...f, db: !f.db }))}>
            PostgreSQL
          </Chips.Toggle>
          <Chips.Toggle selected={filter.kafka} onClick={() => setFilter((f) => ({ ...f, kafka: !f.kafka }))}>
            Kafka
          </Chips.Toggle>
        </Chips>
        <BodyShort size="small" className="arch-subtle apps-toolbar__count" aria-live="polite">
          {visible.size} av {APPS.length}
        </BodyShort>
        <span className="apps-toolbar__actions">
          {filtered && (
            <Button size="xsmall" variant="tertiary-neutral" onClick={() => setFilter(NO_FILTER)}>
              Nullstill
            </Button>
          )}
          <Button
            size="xsmall"
            variant="tertiary-neutral"
            onClick={() => setOpen(allOpen ? new Set() : new Set(visible))}
          >
            {allOpen ? "Lukk alle" : "Åpne alle"}
          </Button>
        </span>
      </div>

      {LAYERS.map((l, li) => {
        const nodes = APPS.filter((n) => l.zones.includes(n.zone));
        const shown = nodes.filter((n) => visible.has(n.id));
        return (
          <Section key={l.id} id={l.id} eyebrow={`Lag ${li + 1} · ${shown.length} av ${nodes.length}`} title={l.title} lead={l.lead}>
            {shown.length === 0 ? (
              <BodyShort size="small" className="arch-subtle apps-empty">
                Ingen treff i dette laget.
              </BodyShort>
            ) : (
              <div className="apps-grid">
                {shown.map((n) => (
                  <AppCard
                    key={n.id}
                    n={n}
                    tone={l.tone}
                    open={open.has(n.id)}
                    flash={flash === n.id}
                    onToggle={() => toggle(n.id)}
                    onJump={jump}
                  />
                ))}
              </div>
            )}
          </Section>
        );
      })}

      <Section
        id="biblioteker"
        eyebrow="Felles kode"
        title="Biblioteker og verktøy"
        lead="Ikke tjenester, men delt kode som de fleste backendene bygger på."
      >
        <div className="apps-libs">
          {LIBRARIES.map((lib) => (
            <a key={lib.repo} href={ghHref(lib.repo)} target="_blank" rel="noreferrer" className="apps-lib">
              <span className="apps-lib__name arch-mono">
                {lib.repo} <ExternalLinkIcon aria-hidden />
              </span>
              <span className="apps-lib__tech">{lib.tech}</span>
              <span className="apps-lib__text">{lib.text}</span>
            </a>
          ))}
        </div>
      </Section>

      <Section id="videre" eyebrow="Mer" title="Videre lesing">
        <div className="arch-further">
          {FURTHER.map((f) => (
            <NextLink key={f.href} href={f.href} className="arch-further__card">
              <strong>
                {f.title} <ArrowRightIcon aria-hidden />
              </strong>
              <span>{f.text}</span>
            </NextLink>
          ))}
        </div>
      </Section>
    </div>
  );
}
