"use client";

import { Fragment, useRef, type CSSProperties, type ReactNode } from "react";
import NextLink from "next/link";
import { BodyLong, BodyShort, Button, CopyButton, Detail, Heading, Search, Skeleton, Table } from "@navikt/ds-react";
import { ArrowRightIcon, ExternalLinkIcon, FilesIcon, LinkIcon, WavesIcon } from "@navikt/aksel-icons";
import { ENVS, type EnvId } from "@/components/miljoer/data";
import { neessiSakUrl } from "@/lib/neessi";
import { formatTime } from "@/lib/datetime";
import { RECONNECT_MS, useSlashFocus, type ConnectionStatus } from "./hooks";
import { FurtherReading, type FurtherLink } from "@/components/page/FurtherReading";

/* ---------- De tre sanntidssidene ---------- */

export type LivePageId = "hendelser" | "kobling" | "neessi";

export const LIVE_PAGES: { id: LivePageId; href: string; label: string; text: string; Icon: typeof WavesIcon }[] = [
  {
    id: "hendelser",
    href: "/kafka/sed-hendelser",
    label: "SED-hendelser",
    text: "Hver melding på sedsendt og sedmottatt i Q1 og Q2.",
    Icon: WavesIcon,
  },
  {
    id: "kobling",
    href: "/kafka/sed-kobling",
    label: "SED-kobling",
    text: "Samme SED sendt fra det ene miljøet og mottatt i det andre, med transporttid.",
    Icon: LinkIcon,
  },
  {
    id: "neessi",
    href: "/nav-rinasak/sed-er",
    label: "SED-er i nEESSI",
    text: "Saker og SED-er opprettet i nEESSI, og om de er sendt.",
    Icon: FilesIcon,
  },
];

function LiveSwitcher({ current }: { current: LivePageId }) {
  return (
    <nav className="live-switch" aria-label="Sanntidssider">
      <span className="live-switch__label">Sanntid</span>
      {LIVE_PAGES.map((p) => (
        <NextLink
          key={p.id}
          href={p.href}
          className="live-switch__link"
          aria-current={p.id === current ? "page" : undefined}
        >
          <p.Icon aria-hidden />
          {p.label}
        </NextLink>
      ))}
    </nav>
  );
}

/* ---------- Status ---------- */

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connecting: "Kobler til",
  connected: "Live",
  disconnected: "Frakoblet",
};

export function LiveStatus({ status, lastEventAt }: { status: ConnectionStatus; lastEventAt: number | null }) {
  const title =
    status === "disconnected"
      ? `Mistet forbindelsen til portal-core. Prøver igjen om ${RECONNECT_MS / 1000} sekunder.`
      : lastEventAt
        ? `Siste melding kom ${formatTime(new Date(lastEventAt).toISOString())}`
        : "Venter på nye meldinger";
  return (
    <span className="live-status" data-status={status} title={title} role="status">
      <span className="live-status__dot" aria-hidden />
      {STATUS_LABEL[status]}
      <span className="live-status__ping" key={lastEventAt ?? 0} aria-hidden />
    </span>
  );
}

/** Animates briefly when the value changes. */
export function Count({ value }: { value: ReactNode }) {
  return (
    <span className="live-count" key={String(value)}>
      {value}
    </span>
  );
}

/* ---------- Hero ---------- */

export interface LiveStat {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: string;
}

export function LiveHero({
  page,
  title,
  lead,
  status,
  lastEventAt,
  art,
  stats,
}: {
  page: LivePageId;
  title: string;
  lead: ReactNode;
  status: ConnectionStatus;
  lastEventAt: number | null;
  art: ReactNode;
  stats: LiveStat[];
}) {
  return (
    <header className="portal-hero arch-hero lite-hero live-hero">
      {art}
      <div className="arch-hero__text">
        <LiveSwitcher current={page} />
        <div className="live-hero__title">
          <Heading level="1" size="xlarge">
            {title}
          </Heading>
          <LiveStatus status={status} lastEventAt={lastEventAt} />
        </div>
        <BodyLong className="arch-hero__lead">{lead}</BodyLong>
      </div>
      <dl className="live-stats">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className="live-stat"
            data-tone={s.tone}
            style={{ ["--arch-delay" as string]: `${120 + i * 70}ms` }}
          >
            <dt>{s.label}</dt>
            <dd>
              <span className="live-stat__n">
                <Count value={s.value} />
              </span>
              {s.sub && <span className="live-stat__sub">{s.sub}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </header>
  );
}

/* ---------- Verktøylinje ---------- */

export function LiveToolbar({
  query,
  onQuery,
  placeholder,
  shown,
  total,
  unit,
  onReset,
  children,
}: {
  query: string;
  onQuery: (q: string) => void;
  placeholder: string;
  shown: number;
  total: number;
  unit: string;
  onReset?: () => void;
  children?: ReactNode;
}) {
  const searchRef = useRef<HTMLDivElement>(null);
  useSlashFocus(searchRef);
  return (
    <div className="live-toolbar" role="search">
      <div className="live-toolbar__search" ref={searchRef}>
        <Search
          label="Søk"
          hideLabel
          variant="simple"
          size="small"
          placeholder={placeholder}
          value={query}
          onChange={onQuery}
          onClear={() => onQuery("")}
        />
        {!query && (
          <kbd className="live-toolbar__kbd" aria-hidden title="Trykk / for å søke">
            /
          </kbd>
        )}
      </div>
      {children}
      <span className="live-toolbar__end">
        <BodyShort size="small" className="arch-subtle live-toolbar__count" aria-live="polite">
          <Count value={shown} /> av {total} {unit}
        </BodyShort>
        {onReset && (
          <Button size="xsmall" variant="tertiary-neutral" onClick={onReset}>
            Nullstill
          </Button>
        )}
      </span>
    </div>
  );
}

/* ---------- Tabell ---------- */

export function LiveTable({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`arch-table live-table${className ? ` ${className}` : ""}`}>
      <Table size="small">{children}</Table>
    </div>
  );
}

export function DayRow({ heading, count, unit, colSpan }: { heading: string; count: number; unit: string; colSpan: number }) {
  const [rel, ...rest] = heading.split(" · ");
  return (
    <Table.Row className="live-day">
      <Table.DataCell colSpan={colSpan}>
        <span className="live-day__inner">
          <strong>{rel}</strong>
          {rest.length > 0 && <span className="arch-subtle">{rest.join(" · ")}</span>}
          <span className="live-day__count">
            {count} {unit}
          </span>
        </span>
      </Table.DataCell>
    </Table.Row>
  );
}

/** Stagger index for row entry animations, capped so long tables do not lag. */
export const rowStyle = (i: number, extra?: CSSProperties): CSSProperties =>
  ({ "--i": Math.min(i, 24), ...extra }) as CSSProperties;

export function TableSkeleton({ cols, rows = 8 }: { cols: number; rows?: number }) {
  return (
    <div className="arch-table live-table live-table--loading" aria-busy="true" aria-label="Laster">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="live-skel" style={{ "--i": r } as CSSProperties}>
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton key={c} variant="text" width={c === 0 ? "60%" : `${50 + ((r * 7 + c * 13) % 40)}%`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function LiveMessage({ tone = "neutral", title, children }: { tone?: string; title: string; children?: ReactNode }) {
  return (
    <div className="live-msg" data-tone={tone} role={tone === "danger" ? "alert" : undefined}>
      <strong>{title}</strong>
      {children && <BodyShort size="small">{children}</BodyShort>}
    </div>
  );
}

/* ---------- Celler ---------- */

/** Highlights the search tokens inside `text`. */
export function Hl({ text, toks }: { text: string | number | null | undefined; toks: string[] }) {
  const s = text === null || text === undefined ? "" : String(text);
  if (!s || toks.length === 0) return <>{s}</>;
  const escaped = toks.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const parts = s.split(new RegExp(`(${escaped.join("|")})`, "gi"));
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="live-mark">
            {p}
          </mark>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

export function EmptyValue() {
  return (
    <span className="live-empty-value" aria-label="ingen verdi">
      —
    </span>
  );
}

const asEnv = (env: string): EnvId | null => (env === "q1" || env === "q2" ? env : null);

export function EnvPill({ env }: { env: string }) {
  const e = asEnv(env);
  return (
    <span className="live-env" data-tone={e ? ENVS[e].tone : undefined}>
      {env.toUpperCase()}
    </span>
  );
}

export function Direction({ direction }: { direction: string }) {
  const sendt = direction === "sendt";
  return (
    <span className="live-dir" data-dir={sendt ? "sendt" : "mottatt"}>
      <span aria-hidden>{sendt ? "↑" : "↓"}</span>
      {sendt ? "Sendt" : "Mottatt"}
    </span>
  );
}

export function SedType({ type, toks = [] }: { type?: string | null; toks?: string[] }) {
  if (!type) return <span className="live-sedtype live-sedtype--unknown">ukjent</span>;
  return (
    <span className="live-sedtype">
      <Hl text={type} toks={toks} />
    </span>
  );
}

export function RinaSak({ env, id, toks = [] }: { env: string; id?: string | number | null; toks?: string[] }) {
  if (id === null || id === undefined || id === "") return <EmptyValue />;
  return (
    <a
      href={neessiSakUrl(env, id)}
      target="_blank"
      rel="noreferrer"
      className="live-sak"
      title={`Åpne sak ${id} i nEESSI ${env.toUpperCase()}`}
      onClick={(e) => e.stopPropagation()}
    >
      <Hl text={id} toks={toks} />
      <ExternalLinkIcon aria-hidden />
    </a>
  );
}

/** An institution; NAV's own test institutions link to their environment. */
export function Institution({
  id,
  name,
  land,
  toks = [],
  max = 22,
}: {
  id?: string;
  name?: string;
  land?: string;
  toks?: string[];
  max?: number;
}) {
  const label = name ?? id;
  if (!label) return <EmptyValue />;
  const env = (["q1", "q2"] as EnvId[]).find((e) => ENVS[e].institution === id);
  const short = label.length > max ? `${label.slice(0, max - 1).trimEnd()}…` : label;
  return (
    <span className="live-inst" title={[label, id, land].filter(Boolean).join(" · ")}>
      <Hl text={short} toks={toks} />
      {env ? (
        <span className="live-env live-env--xs" data-tone={ENVS[env].tone}>
          {ENVS[env].name}
        </span>
      ) : (
        land && <span className="live-inst__land">{land}</span>
      )}
    </span>
  );
}

export function ShortId({ id, toks = [] }: { id?: string | null; toks?: string[] }) {
  if (!id) return <EmptyValue />;
  const hit = toks.some((t) => id.toLowerCase().includes(t));
  return (
    <code className="live-id" title={id}>
      {hit ? <Hl text={id} toks={toks} /> : `${id.slice(0, 8)}…`}
    </code>
  );
}

/* ---------- Detaljpanel ---------- */

export function Field({
  label,
  value,
  mono,
  children,
}: {
  label: string;
  value?: string | number | null;
  mono?: boolean;
  children?: ReactNode;
}) {
  const v = value === null || value === undefined ? "" : String(value);
  return (
    <div className="live-field">
      <dt>{label}</dt>
      <dd>
        {children ??
          (v ? (
            <>
              <span className={mono ? "arch-mono live-field__mono" : undefined}>{v}</span>
              <CopyButton size="xsmall" copyText={v} title={`Kopier ${label.toLowerCase()}`} />
            </>
          ) : (
            <EmptyValue />
          ))}
      </dd>
    </div>
  );
}

export function DetailCard({
  title,
  tone,
  aside,
  children,
}: {
  title: ReactNode;
  tone?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="live-card" data-tone={tone}>
      <header className="live-card__head">
        <Detail as="h3" className="live-card__title">
          {title}
        </Detail>
        {aside}
      </header>
      <dl className="live-card__fields">{children}</dl>
    </section>
  );
}

export function DetailLinks({ children }: { children: ReactNode }) {
  return <div className="live-links">{children}</div>;
}

export function PortalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <NextLink href={href} className="live-link" onClick={(e) => e.stopPropagation()}>
      {children} <ArrowRightIcon aria-hidden />
    </NextLink>
  );
}

export function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="live-link" onClick={(e) => e.stopPropagation()}>
      {children} <ExternalLinkIcon aria-hidden />
    </a>
  );
}

/* ---------- Bunnen av siden ---------- */

export interface ChainStop {
  label: string;
  sub: string;
  href?: string;
  tone?: string;
  mono?: boolean;
}

export function LiveAbout({
  title,
  lead,
  chain,
  facts,
}: {
  title: string;
  lead: ReactNode;
  chain: ChainStop[];
  facts: ReactNode[];
}) {
  return (
    <section id="om" className="arch-section live-about" aria-labelledby="om-title">
      <header className="arch-section__head">
        <Detail className="arch-eyebrow">Om siden</Detail>
        <Heading level="2" size="medium" id="om-title">
          {title}
        </Heading>
        <BodyLong size="small" className="arch-section__lead">
          {lead}
        </BodyLong>
      </header>
      <ol className="live-chain">
        {chain.map((s, i) => {
          const body = (
            <>
              <strong className={s.mono ? "arch-mono" : undefined}>{s.label}</strong>
              <span>{s.sub}</span>
            </>
          );
          return (
            <li key={s.label} data-tone={s.tone} style={{ "--i": i } as CSSProperties}>
              {s.href?.startsWith("http") ? (
                <a href={s.href} target="_blank" rel="noreferrer" className="live-chain__stop">
                  {body}
                </a>
              ) : s.href ? (
                <NextLink href={s.href} className="live-chain__stop">
                  {body}
                </NextLink>
              ) : (
                <span className="live-chain__stop live-chain__stop--here">{body}</span>
              )}
            </li>
          );
        })}
      </ol>
      <ul className="live-facts">
        {facts.map((f, i) => (
          <li key={i}>
            <BodyShort size="small">{f}</BodyShort>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function LiveFurther({ current, extra }: { current: LivePageId; extra: FurtherLink[] }) {
  const items = [
    ...LIVE_PAGES.filter((p) => p.id !== current).map((p) => ({ href: p.href, title: p.label, text: p.text })),
    ...extra,
  ];
  return (
    <section id="videre" className="arch-section live-further" aria-labelledby="videre-title">
      <header className="arch-section__head">
        <Detail className="arch-eyebrow">Mer</Detail>
        <Heading level="2" size="medium" id="videre-title">
          Videre
        </Heading>
      </header>
      <FurtherReading links={items} />
    </section>
  );
}
