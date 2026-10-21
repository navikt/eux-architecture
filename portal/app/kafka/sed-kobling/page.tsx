"use client";

import { useCallback, useMemo, useState } from "react";
import { ToggleGroup } from "@navikt/ds-react";
import { formatDateTime, formatTime } from "@/lib/datetime";
import { archHref } from "@/lib/links";
import { ENVS, type EnvId } from "@/components/miljoer/data";
import { KoblingArt } from "@/components/live/art";
import { matchesAll, ms, rememberFirstSeen, tokens, useLiveFeed, useNow, useUrlState } from "@/components/live/hooks";
import { LiveTable, type LiveColumn, type LiveRowProps } from "@/components/live/LiveTable";
import {
  SED_HENDELSE_MAX_ROWS as MAX_ROWS,
  SED_HENDELSE_SNAPSHOT_URL,
  SED_HENDELSE_STREAM_URL,
  recordKey,
  type SedHendelseRecord,
} from "@/components/live/sedHendelse";
import {
  DetailCard,
  DetailLinks,
  EnvPill,
  Field,
  Hl,
  Institution,
  LiveAbout,
  LiveFurther,
  LiveHero,
  LiveToolbar,
  PortalLink,
  RinaSak,
  SedType,
} from "@/components/live/ui";

type Flow = "q1-to-q2" | "q2-to-q1";
type PairStatus = "complete" | "waiting" | "source-missing";

interface SedPair {
  key: string;
  flow: Flow;
  from: EnvId;
  to: EnvId;
  sedType?: string;
  bucType?: string;
  rinaDokumentId: string;
  versjon: string;
  source: SedHendelseRecord | null;
  destination: SedHendelseRecord | null;
  transitMs: number | null;
  status: PairStatus;
  newestAt: string;
}

const FLASH_MS = 1600;

/* ---------- Kobling ---------- */

/**
 * Pairs events on RINA document ID and version: sent from one environment and
 * received in the other. A lone event only becomes a pair when its counterpart
 * is our other test institution, so SEDs to and from other countries are left
 * out instead of waiting forever.
 */
function buildPairs(records: SedHendelseRecord[]): SedPair[] {
  const groups = new Map<string, SedHendelseRecord[]>();
  for (const r of records) {
    const { rinaDokumentId: id, rinaDokumentVersjon: v } = r.hendelse;
    if (!id || !v) continue;
    const k = `${id}|${v}`;
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }

  const earliest = (recs: SedHendelseRecord[], env: EnvId, direction: string) =>
    recs
      .filter((r) => r.environment === env && r.direction === direction)
      .sort((a, b) => ms(a.receivedAt) - ms(b.receivedAt))[0] ?? null;

  const pairs: SedPair[] = [];
  for (const [k, recs] of groups) {
    for (const [from, to] of [
      ["q1", "q2"],
      ["q2", "q1"],
    ] as [EnvId, EnvId][]) {
      const source = earliest(recs, from, "sendt");
      const destination = earliest(recs, to, "mottatt");
      if (!source && !destination) continue;

      if (source && !destination) {
        const target = source.hendelse.mottakerId;
        if (target && target !== ENVS[to].institution) continue;
        if (!target && earliest(recs, from, "mottatt") && !recs.some((r) => r.environment === to)) continue;
      }
      if (destination && !source) {
        const sender = destination.hendelse.avsenderId;
        if (sender && sender !== ENVS[from].institution) continue;
      }

      const raw = source && destination ? ms(destination.receivedAt) - ms(source.receivedAt) : null;
      const any = (source ?? destination)!.hendelse;
      pairs.push({
        key: `${from}${to}:${k}`,
        flow: from === "q1" ? "q1-to-q2" : "q2-to-q1",
        from,
        to,
        sedType: source?.hendelse.sedType ?? destination?.hendelse.sedType,
        bucType: source?.hendelse.bucType ?? destination?.hendelse.bucType,
        rinaDokumentId: any.rinaDokumentId ?? "",
        versjon: any.rinaDokumentVersjon ?? "",
        source,
        destination,
        transitMs: raw !== null && raw >= 0 ? raw : null,
        status: !source ? "source-missing" : !destination ? "waiting" : "complete",
        newestAt: [source, destination]
          .filter((r): r is SedHendelseRecord => r !== null)
          .map((r) => r.receivedAt)
          .sort((a, b) => ms(b) - ms(a))[0],
      });
    }
  }
  return pairs.sort((a, b) => ms(b.newestAt) - ms(a.newestAt));
}

/* ---------- Tid ---------- */

function formatDuration(d: number): string {
  if (d < 1000) return `${Math.round(d)} ms`;
  if (d < 60_000) return `${(d / 1000).toFixed(1).replace(".", ",")} s`;
  const s = Math.round(d / 1000);
  return `${Math.floor(s / 60)} min ${s % 60} s`;
}

function speedTone(d: number): string {
  if (d < 5000) return "success";
  if (d < 30_000) return "info";
  if (d < 120_000) return "warning";
  return "danger";
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function Transit({ d }: { d: number | null }) {
  if (d === null) return <span className="arch-subtle">–</span>;
  return (
    <span className="live-transit" data-tone={speedTone(d)}>
      <span className="live-transit__dot" aria-hidden />
      {formatDuration(d)}
    </span>
  );
}

function FlowPills({ from, to }: { from: EnvId; to: EnvId }) {
  return (
    <span className="live-flow" aria-label={`${from.toUpperCase()} til ${to.toUpperCase()}`}>
      <EnvPill env={from} />
      <span className="live-flow__arrow" aria-hidden>
        →
      </span>
      <EnvPill env={to} />
    </span>
  );
}

function StatusTag({ status }: { status: PairStatus }) {
  const label = { complete: "Koblet", waiting: "Venter", "source-missing": "Kilde ukjent" }[status];
  return (
    <span className="live-state" data-state={status}>
      <span className="live-state__icon" aria-hidden>
        {status === "complete" ? "✓" : status === "waiting" ? "" : "?"}
      </span>
      {label}
    </span>
  );
}

function Side({ r, env, toks }: { r: SedHendelseRecord | null; env: EnvId; toks: string[] }) {
  if (!r) return null;
  return (
    <span className="live-side">
      <span className="live-time">{formatTime(r.receivedAt)}</span>
      <RinaSak env={env} id={r.hendelse.rinaSakId} toks={toks} />
    </span>
  );
}

/* ---------- Detaljer ---------- */

function SideCard({ r, env, role }: { r: SedHendelseRecord | null; env: EnvId; role: "sendt" | "mottatt" }) {
  const title = (
    <>
      {role === "sendt" ? "Sendt fra" : "Mottatt i"} <EnvPill env={env} />
    </>
  );
  if (!r) {
    return (
      <section className="live-card live-card--missing" data-tone={ENVS[env].tone}>
        <header className="live-card__head">
          <span className="live-card__title">{title}</span>
        </header>
        <p className="live-card__note">
          {role === "mottatt"
            ? "Ikke mottatt ennå. Raden oppdateres med en gang hendelsen kommer."
            : `Sendingen er ikke i minnet. Den kan være eldre enn de ${MAX_ROWS} nyeste hendelsene.`}
        </p>
      </section>
    );
  }
  const h = r.hendelse;
  return (
    <DetailCard title={title} tone={ENVS[env].tone} aside={<span className="arch-subtle live-small">{formatDateTime(r.receivedAt)}</span>}>
      <Field label="RINA-sak">
        <RinaSak env={env} id={h.rinaSakId} />
      </Field>
      <Field label="SED-ID" value={h.sedId} mono />
      <Field label="Avsender">
        <Institution id={h.avsenderId} name={h.avsenderNavn} land={h.avsenderLand} max={40} />
      </Field>
      <Field label="Mottaker">
        <Institution id={h.mottakerId} name={h.mottakerNavn} land={h.mottakerLand} max={40} />
      </Field>
      <Field label="NAV-bruker" value={h.navBruker} mono />
      <Field label="Topic" value={r.topic} mono />
    </DetailCard>
  );
}

function PairDetails({ p }: { p: SedPair }) {
  const src = p.source?.hendelse.rinaSakId;
  const dst = p.destination?.hendelse.rinaSakId;
  return (
    <div className="live-details">
      <div className="live-pair">
        <SideCard r={p.source} env={p.from} role="sendt" />
        <div className="live-pair__link" data-state={p.status}>
          <span className="live-pair__line" aria-hidden />
          <Transit d={p.transitMs} />
          <span className="live-pair__sub">
            {p.status === "complete" ? "transporttid" : p.status === "waiting" ? "venter" : "ukjent start"}
          </span>
        </div>
        <SideCard r={p.destination} env={p.to} role="mottatt" />
      </div>
      <dl className="live-card__fields live-pair__meta">
        <Field label="SED-type" value={p.sedType} />
        <Field label="BUC" value={p.bucType} />
        <Field label="RINA-dokument" value={p.rinaDokumentId} mono />
        <Field label="Versjon" value={p.versjon} />
      </dl>
      <DetailLinks>
        <PortalLink href={`/kafka/sed-hendelser?q=${encodeURIComponent(p.rinaDokumentId)}`}>
          Hendelsene i SED-hendelser
        </PortalLink>
        {src && (
          <PortalLink href={`/nav-rinasak/sed-er?q=${encodeURIComponent(src)}&miljo=${p.from}`}>
            Saken i SED-er i nEESSI
          </PortalLink>
        )}
        {dst && dst !== src && (
          <PortalLink href={`/nav-rinasak/sed-er?q=${encodeURIComponent(dst)}&miljo=${p.to}`}>
            Mottakersaken i SED-er i nEESSI
          </PortalLink>
        )}
        <PortalLink href="/environments#samspill">Slik snakker Q1 og Q2 sammen</PortalLink>
      </DetailLinks>
    </div>
  );
}

/* ---------- Side ---------- */

const matchesQuery = (p: SedPair, toks: string[]) => {
  const s = p.source?.hendelse;
  const d = p.destination?.hendelse;
  return matchesAll(
    [
      p.sedType,
      p.bucType,
      p.rinaDokumentId,
      s?.rinaSakId,
      d?.rinaSakId,
      s?.sedId,
      d?.sedId,
      s?.navBruker,
      d?.navBruker,
      `${p.from}→${p.to}`,
    ],
    toks,
  );
};

const matchesFlow = (p: SedPair, flow: string) =>
  flow === "q1-to-q2" || flow === "q2-to-q1" ? p.flow === flow : flow !== "venter" || p.status !== "complete";

function columns(toks: string[]): LiveColumn<SedPair>[] {
  return [
    { header: "SED", cell: (p) => <SedType type={p.sedType} toks={toks} /> },
    { header: "BUC", cell: (p) => <Hl text={p.bucType} toks={toks} /> },
    { header: "Retning", cell: (p) => <FlowPills from={p.from} to={p.to} /> },
    {
      header: "Sendt · RINA-sak",
      cell: (p) =>
        p.source ? <Side r={p.source} env={p.from} toks={toks} /> : <span className="arch-subtle">Ikke i minnet</span>,
    },
    {
      header: "Mottatt · RINA-sak",
      cell: (p) =>
        p.destination ? <Side r={p.destination} env={p.to} toks={toks} /> : <span className="live-waiting">Venter</span>,
    },
    { header: "Transporttid", cell: (p) => <Transit d={p.transitMs} /> },
    { header: "Status", cell: (p) => <StatusTag status={p.status} /> },
  ];
}

export default function SedKoblingPage() {
  const [records, setRecords] = useState<SedHendelseRecord[]>([]);
  const [liveSeen, setLiveSeen] = useState<Map<string, number>>(() => new Map());
  const [q, setQ] = useUrlState("q", "");
  const [flow, setFlow] = useUrlState("flyt", "alle");
  const now = useNow(1000);

  const onRecord = useCallback((data: unknown) => {
    const record = data as SedHendelseRecord;
    const k = recordKey(record);
    setLiveSeen((prev) => rememberFirstSeen(prev, [[k, Date.now()]]));
    setRecords((prev) => (prev.some((r) => recordKey(r) === k) ? prev : [record, ...prev].slice(0, MAX_ROWS)));
  }, []);

  const feed = useLiveFeed<SedHendelseRecord[]>({
    streamUrl: SED_HENDELSE_STREAM_URL,
    snapshotUrl: SED_HENDELSE_SNAPSHOT_URL,
    events: { "sed-hendelse": onRecord },
    onSnapshot: (data) => {
      const unique = new Map(data.map((r) => [recordKey(r), r] as const));
      setRecords([...unique.values()].slice(0, MAX_ROWS));
    },
  });

  const pairs = useMemo(() => buildPairs(records), [records]);
  const toks = tokens(q);
  const filtered = pairs.filter((p) => matchesFlow(p, flow) && matchesQuery(p, toks));

  const timesFor = (f: Flow) => filtered.filter((p) => p.flow === f && p.transitMs !== null).map((p) => p.transitMs!);
  const q1q2 = timesFor("q1-to-q2");
  const q2q1 = timesFor("q2-to-q1");
  const waiting = filtered.filter((p) => p.status !== "complete").length;
  const avg = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
  const speedStat = (label: string, v: number[], tone: string) => {
    const m = median(v);
    return {
      label,
      value: m === null ? "–" : formatDuration(m),
      sub: m === null ? "ingen målinger" : `snitt ${formatDuration(avg(v))} · ${v.length} målt`,
      tone,
    };
  };

  const flash = (r: SedHendelseRecord | null) => {
    const t = r ? liveSeen.get(recordKey(r)) : undefined;
    return t !== undefined && now - t < FLASH_MS;
  };
  const rowProps = (p: SedPair): LiveRowProps => {
    const state = `live-row--${p.status}`;
    if (flash(p.destination) && p.status === "complete") return { className: `${state} live-row--done` };
    if (flash(p.source)) return { className: `${state} live-row--new` };
    return { className: state };
  };
  const filtering = q !== "" || flow !== "alle";

  return (
    <div className="portal-page--wide arch-page lite-page live-page">
      <LiveHero
        page="kobling"
        title="SED-kobling"
        lead={
          <>
            Følg en SED fra det ene miljøet til det andre. Når en SED sendes fra Q1 til Q2, eller omvendt, kobles
            sendingen og mottaket sammen, og du ser hvor lang tid det tok.
          </>
        }
        status={feed.status}
        lastEventAt={feed.lastEventAt}
        art={<KoblingArt />}
        filtered={filtering}
        stats={[
          { label: "Par", value: filtered.length, sub: `${filtered.length - waiting} koblet` },
          speedStat("Median Q1 → Q2", q1q2, ENVS.q1.tone),
          speedStat("Median Q2 → Q1", q2q1, ENVS.q2.tone),
          { label: "Venter", value: waiting, sub: waiting ? "uten partner" : "alt er koblet", tone: waiting ? "warning" : "success" },
        ]}
      />

      <LiveToolbar
        query={q}
        onQuery={setQ}
        filters={[flow]}
        placeholder="SED-type, RINA-sak, dokument-ID …"
        shown={filtered.length}
        total={pairs.length}
        unit="par"
        onReset={filtering ? () => (setQ(""), setFlow("alle")) : undefined}
      >
        <ToggleGroup size="small" value={flow} onChange={setFlow} aria-label="Retning">
          <ToggleGroup.Item value="alle">Alle</ToggleGroup.Item>
          <ToggleGroup.Item value="q1-to-q2">Q1 → Q2</ToggleGroup.Item>
          <ToggleGroup.Item value="q2-to-q1">Q2 → Q1</ToggleGroup.Item>
          <ToggleGroup.Item value="venter">Venter</ToggleGroup.Item>
        </ToggleGroup>
      </LiveToolbar>

      <LiveTable
        className="live-table--kobling"
        feed={feed}
        rows={filtered}
        all={pairs}
        rowKey={(p) => p.key}
        time={(p) => p.newestAt}
        columns={columns(toks)}
        details={(p) => <PairDetails p={p} />}
        rowProps={rowProps}
        unit={["par", "par"]}
        newUnit={["nytt par", "nye par"]}
        empty={{ title: "Ingen par ennå", text: "Send en SED mellom Q1 og Q2, så dukker den opp her med en gang." }}
      />

      <LiveAbout
        title="Slik kobles SED-ene"
        lead="Siden bruker de samme hendelsene som SED-hendelser, og ser etter samme dokument på begge sider."
        chain={[
          { label: "Sendt fra Q1 eller Q2", sub: "sedsendt-v1", href: archHref("sedsendt-v1"), tone: "info" },
          { label: "Mottatt i det andre", sub: "sedmottatt-v1", href: archHref("sedmottatt-v1"), tone: "info" },
          { label: "eux-portal-core", sub: `holder de ${MAX_ROWS} nyeste`, href: "https://github.com/navikt/eux-architecture/tree/main/portal-core" },
          { label: "Denne siden", sub: "kobler i nettleseren" },
        ]}
        facts={[
          <>
            En sending og et mottak hører sammen når de har samme RINA-dokument-ID og dokumentversjon. RINA-saken har
            ofte et eget nummer hos mottakeren, så siden viser saken på begge sider.
          </>,
          <>
            Transporttiden er tiden mellom de to Kafka-meldingene, ikke tiden i RINA. Median sier mest, siden én treg
            sending kan dra snittet langt opp.
          </>,
          <>
            Bare SED-er mellom NAV ACC 06 (Q1) og NAV ACC 07 (Q2) tas med. SED-er til og fra andre land finner du i
            SED-hendelser.
          </>,
          <>
            «Kilde ukjent» betyr at mottaket er i minnet, men ikke sendingen. Den kan være eldre enn de {MAX_ROWS}
            nyeste hendelsene.
          </>,
        ]}
      />

      <LiveFurther
        current="kobling"
        extra={[
          { href: "/environments", title: "Miljøer", text: "Q1 og Q2, institusjonene og RINA-versjonene." },
          { href: "/prosesser/journalfoering", title: "Journalføring", text: "Hva som skjer når en SED er sendt eller mottatt." },
        ]}
      />
    </div>
  );
}
