"use client";

import { useCallback, useMemo, useState, type CSSProperties } from "react";
import { ToggleGroup } from "@navikt/ds-react";
import { formatDateTime, formatTime, isToday } from "@/lib/datetime";
import { neessiSakUrl } from "@/lib/neessi";
import { archHref } from "@/lib/links";
import { HendelserArt } from "@/components/live/art";
import {
  fadeAlpha,
  matchesAll,
  ms,
  rememberFirstSeen,
  tokens,
  useLiveFeed,
  useNow,
  useUrlState,
} from "@/components/live/hooks";
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
  Direction,
  EnvPill,
  EnvToggle,
  ExtLink,
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
  ShortId,
} from "@/components/live/ui";

/* ---------- Parfarger ---------- */

/**
 * Pastels for paired events (same RINA document and version). Dark text keeps
 * a contrast ratio above 7:1 on every tint; dark mode caps the mix lower.
 */
const PAIR_PALETTE = [
  "#fbcfe8",
  "#ddd6fe",
  "#bfdbfe",
  "#a7f3d0",
  "#fde68a",
  "#fecaca",
  "#c7d2fe",
  "#bbf7d0",
  "#fed7aa",
  "#e9d5ff",
] as const;

const HIGHLIGHT_WINDOW_MS = 60_000;
const FLASH_MS = 1100;
const TICK_MS = 3000;

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pairKey(r: SedHendelseRecord): string {
  const { rinaDokumentId: id, rinaDokumentVersjon: v } = r.hendelse;
  return id && v ? `doc:${id}|${v}` : `rec:${recordKey(r)}`;
}

interface RowTint {
  color: string;
  alpha: number;
  flash: boolean;
}

/**
 * One colour per pair, driven by the newest member's age, so an older partner
 * lights up again when its counterpart arrives. Rows from the initial snapshot
 * are seeded with their own receivedAt and do not flash on page load.
 */
function computePairTints(records: SedHendelseRecord[], firstSeenAt: Map<string, number>, now: number) {
  const newest = new Map<string, number>();
  for (const r of records) {
    const k = pairKey(r);
    newest.set(k, Math.max(newest.get(k) ?? 0, ms(r.receivedAt)));
  }
  const out = new Map<string, RowTint>();
  for (const r of records) {
    const k = pairKey(r);
    const alpha = fadeAlpha(now - (newest.get(k) ?? 0), HIGHLIGHT_WINDOW_MS);
    if (alpha <= 0) continue;
    const seen = firstSeenAt.get(recordKey(r));
    out.set(recordKey(r), {
      color: PAIR_PALETTE[hashString(k) % PAIR_PALETTE.length],
      alpha,
      flash: seen !== undefined && now - seen < FLASH_MS,
    });
  }
  return out;
}

/* ---------- Detaljer ---------- */

const topicNode = (direction: string) => (direction === "sendt" ? "sedsendt-v1" : "sedmottatt-v1");

function HendelseDetails({ r }: { r: SedHendelseRecord }) {
  const h = r.hendelse;
  const env = r.environment;
  return (
    <div className="live-details">
      <div className="live-details__grid">
        <DetailCard title="SED">
          <Field label="SED-type" value={h.sedType} />
          <Field label="BUC" value={h.bucType} />
          <Field label="Sektor" value={h.sektorKode} />
          <Field label="SED-ID" value={h.sedId} mono />
          <Field label="RINA-dokument" value={h.rinaDokumentId} mono />
          <Field label="Versjon" value={h.rinaDokumentVersjon} />
        </DetailCard>
        <DetailCard title="Sak og bruker">
          <Field label="RINA-sak">
            <RinaSak env={env} id={h.rinaSakId} />
          </Field>
          <Field label="NAV-bruker" value={h.navBruker} mono />
          <Field label="Hendelse-ID" value={h.id} mono />
        </DetailCard>
        <DetailCard title="Avsender">
          <Field label="Navn" value={h.avsenderNavn} />
          <Field label="ID" value={h.avsenderId} mono />
          <Field label="Land" value={h.avsenderLand} />
        </DetailCard>
        <DetailCard title="Mottaker">
          <Field label="Navn" value={h.mottakerNavn} />
          <Field label="ID" value={h.mottakerId} mono />
          <Field label="Land" value={h.mottakerLand} />
        </DetailCard>
        <DetailCard title="Kafka">
          <Field label="Topic" value={r.topic} mono />
          <Field label="Partisjon / offset" value={`${r.partition} / ${r.offset}`} mono />
          <Field label="Mottatt" value={formatDateTime(r.receivedAt)} />
        </DetailCard>
      </div>
      <DetailLinks>
        {h.rinaDokumentId && (
          <PortalLink href={`/kafka/sed-kobling?q=${encodeURIComponent(h.rinaDokumentId)}`}>
            Se paret i SED-kobling
          </PortalLink>
        )}
        {h.rinaSakId && (
          <PortalLink href={`/nav-rinasak/sed-er?q=${encodeURIComponent(h.rinaSakId)}&miljo=${env}`}>
            Saken i SED-er i nEESSI
          </PortalLink>
        )}
        <PortalLink href={archHref(topicNode(r.direction))}>{topicNode(r.direction)} i arkitekturkartet</PortalLink>
        <PortalLink href={`/environments#miljo-${env}`}>Om {env.toUpperCase()}</PortalLink>
        {h.rinaSakId && <ExtLink href={neessiSakUrl(env, h.rinaSakId)}>Åpne i nEESSI</ExtLink>}
      </DetailLinks>
    </div>
  );
}

/* ---------- Side ---------- */

const matchesQuery = (r: SedHendelseRecord, toks: string[]) => {
  const h = r.hendelse;
  return matchesAll(
    [
      h.sedType,
      h.bucType,
      h.rinaSakId,
      h.rinaDokumentId,
      h.sedId,
      h.id,
      h.navBruker,
      h.avsenderNavn,
      h.avsenderId,
      h.avsenderLand,
      h.mottakerNavn,
      h.mottakerId,
      h.mottakerLand,
      h.sektorKode,
    ],
    toks,
  );
};

function columns(toks: string[]): LiveColumn<SedHendelseRecord>[] {
  return [
    { header: "Tid", className: "live-time", cell: (r) => formatTime(r.receivedAt) },
    {
      header: "Miljø",
      cell: (r) => (
        <span className="live-envdir">
          <EnvPill env={r.environment} />
          <Direction direction={r.direction} />
        </span>
      ),
    },
    { header: "SED", cell: (r) => <SedType type={r.hendelse.sedType} toks={toks} /> },
    { header: "BUC", cell: (r) => <Hl text={r.hendelse.bucType} toks={toks} /> },
    { header: "RINA-sak", cell: (r) => <RinaSak env={r.environment} id={r.hendelse.rinaSakId} toks={toks} /> },
    {
      header: "Avsender",
      cell: ({ hendelse: h }) => (
        <Institution id={h.avsenderId} name={h.avsenderNavn} land={h.avsenderLand} toks={toks} />
      ),
    },
    {
      header: "Mottaker",
      cell: ({ hendelse: h }) => (
        <Institution id={h.mottakerId} name={h.mottakerNavn} land={h.mottakerLand} toks={toks} />
      ),
    },
    { header: "Bruker", className: "arch-mono live-small", cell: (r) => <Hl text={r.hendelse.navBruker} toks={toks} /> },
    { header: "SED-ID", cell: (r) => <ShortId id={r.hendelse.sedId} toks={toks} /> },
  ];
}

export default function SedHendelserPage() {
  const [records, setRecords] = useState<SedHendelseRecord[]>([]);
  const [firstSeenAt, setFirstSeenAt] = useState<Map<string, number>>(() => new Map());
  const [q, setQ] = useUrlState("q", "");
  const [env, setEnv] = useUrlState("miljo", "alle");
  const [dir, setDir] = useUrlState("retning", "alle");
  const now = useNow(TICK_MS);

  const onRecord = useCallback((data: unknown) => {
    const record = data as SedHendelseRecord;
    const k = recordKey(record);
    setFirstSeenAt((prev) => rememberFirstSeen(prev, [[k, Date.now()]]));
    setRecords((prev) => [record, ...prev.filter((r) => recordKey(r) !== k)].slice(0, MAX_ROWS));
  }, []);

  const feed = useLiveFeed<SedHendelseRecord[]>({
    streamUrl: SED_HENDELSE_STREAM_URL,
    snapshotUrl: SED_HENDELSE_SNAPSHOT_URL,
    events: { "sed-hendelse": onRecord },
    onSnapshot: (data) => {
      setFirstSeenAt((prev) => rememberFirstSeen(prev, data.map((r) => [recordKey(r), ms(r.receivedAt)] as const)));
      setRecords(data.slice(0, MAX_ROWS));
    },
  });

  const tints = computePairTints(records, firstSeenAt, now);
  const toks = tokens(q);

  const sorted = useMemo(() => [...records].sort((a, b) => ms(b.receivedAt) - ms(a.receivedAt)), [records]);
  const filtered = sorted.filter(
    (r) =>
      (env === "alle" || r.environment === env) && (dir === "alle" || r.direction === dir) && matchesQuery(r, toks),
  );

  const today = filtered.filter((r) => isToday(r.receivedAt));
  const sent = today.filter((r) => r.direction === "sendt").length;
  const latest = filtered[0];
  const filtering = q !== "" || env !== "alle" || dir !== "alle";

  const rowProps = (r: SedHendelseRecord): LiveRowProps => {
    const tint = tints.get(recordKey(r));
    if (!tint) return {};
    return {
      className: tint.flash ? "live-row--tint live-row--new" : "live-row--tint",
      style: { "--row-tint": tint.color, "--row-tint-alpha": tint.alpha } as CSSProperties,
    };
  };

  return (
    <div className="portal-page--wide arch-page lite-page live-page">
      <LiveHero
        page="hendelser"
        title="SED-hendelser"
        lead={
          <>
            Alle SED-er som sendes og mottas i Q1 og Q2, rett fra Kafka. Søk etter SED-type, RINA-sak eller
            dokument-ID for å finne din. Sendt og mottatt for samme dokument får samme farge i ett minutt.
          </>
        }
        status={feed.status}
        lastEventAt={feed.lastEventAt}
        art={<HendelserArt />}
        filtered={filtering}
        stats={[
          { label: "I dag", value: today.length, sub: `av ${filtered.length} ${filtering ? "i utvalget" : "i minnet"}` },
          { label: "Sendt i dag", value: sent, sub: `${today.length - sent} mottatt`, tone: "info" },
          {
            label: "Siste",
            value: latest ? formatTime(latest.receivedAt) : "–",
            sub: latest ? `${latest.hendelse.sedType ?? "SED"} · ${latest.environment.toUpperCase()}` : "ingen ennå",
          },
        ]}
      />

      <LiveToolbar
        query={q}
        onQuery={setQ}
        filters={[env, dir]}
        placeholder="SED-type, RINA-sak, dokument-ID, institusjon …"
        shown={filtered.length}
        total={records.length}
        unit="hendelser"
        onReset={filtering ? () => (setQ(""), setEnv("alle"), setDir("alle")) : undefined}
      >
        <EnvToggle value={env} onChange={setEnv} />
        <ToggleGroup size="small" value={dir} onChange={setDir} aria-label="Retning">
          <ToggleGroup.Item value="alle">Begge retninger</ToggleGroup.Item>
          <ToggleGroup.Item value="sendt">↑ Sendt</ToggleGroup.Item>
          <ToggleGroup.Item value="mottatt">↓ Mottatt</ToggleGroup.Item>
        </ToggleGroup>
      </LiveToolbar>

      <LiveTable
        className="live-table--hendelser"
        feed={feed}
        rows={filtered}
        all={records}
        rowKey={recordKey}
        time={(r) => r.receivedAt}
        columns={columns(toks)}
        details={(r) => <HendelseDetails r={r} />}
        rowProps={rowProps}
        unit={["hendelse", "hendelser"]}
        newUnit={["ny hendelse", "nye hendelser"]}
        empty={{ title: "Ingen SED-hendelser ennå", text: "Nye meldinger dukker opp her med en gang de kommer." }}
      />

      <LiveAbout
        title="Hvor hendelsene kommer fra"
        lead="RINA sier fra når en SED sendes eller mottas. Meldingen går gjennom to tjenester før den havner på Kafka og hos oss."
        chain={[
          { label: "RINA", sub: "Q1 og Q2", href: "/environments" },
          { label: "eux-all-rina-events", sub: "tar imot via NIE", href: "/applications#eux-all-rina-events", tone: "info" },
          { label: "eux-legacy-rina-events", sub: "beriker fra RINA CPI", href: "/applications#eux-legacy-rina-events", tone: "info" },
          { label: "sedsendt-v1 · sedmottatt-v1", sub: "Kafka", href: archHref("sedsendt-v1"), tone: "meta-lime", mono: true },
          { label: "eux-portal-core", sub: `holder de ${MAX_ROWS} nyeste`, href: "https://github.com/navikt/eux-architecture/tree/main/portal-core" },
          { label: "Denne siden", sub: "SSE, live" },
        ]}
        facts={[
          <>
            eux-portal-core leser <code>eessibasis.sedsendt-v1-q1/-q2</code> og <code>eessibasis.sedmottatt-v1-q1/-q2</code>.
            Miljø og retning hentes fra navnet på topicen.
          </>,
          <>
            Ved oppstart henter den de 10 siste meldingene fra hver topic. Deretter holdes de {MAX_ROWS} nyeste i minnet,
            så listen starter på nytt når tjenesten startes på nytt.
          </>,
          <>
            Rader med samme RINA-dokument og versjon får samme farge. Fargen blekner i løpet av ett minutt, og lyser opp
            igjen når partneren kommer.
          </>,
        ]}
      />

      <LiveFurther
        current="hendelser"
        extra={[
          { href: "/prosesser/journalfoering", title: "Journalføring", text: "Hva som skjer når en SED er sendt eller mottatt." },
          { href: "/environments", title: "Miljøer", text: "Q1 og Q2, institusjonene og hvordan de snakker sammen." },
          { href: archHref("eux-legacy-rina-events"), title: "Arkitekturkartet", text: "Følg hendelsene fra RINA til konsumentene." },
        ]}
      />
    </div>
  );
}
