"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import NextLink from "next/link";
import { Table, ToggleGroup } from "@navikt/ds-react";
import { formatDateTime, formatTime, isToday, safeDate } from "@/lib/datetime";
import { neessiSakUrl } from "@/lib/neessi";
import { archHref } from "@/components/avslutning/tones";
import { NeessiArt } from "@/components/live/art";
import {
  fadeAlpha,
  groupByDay,
  matchesAll,
  ms,
  rememberFirstSeen,
  tokens,
  useLiveStream,
  useNow,
  useSnapshot,
  useUrlState,
} from "@/components/live/hooks";
import {
  DayRow,
  DetailCard,
  DetailLinks,
  EmptyValue,
  EnvPill,
  ExtLink,
  Field,
  Hl,
  LiveAbout,
  LiveFurther,
  LiveHero,
  LiveMessage,
  LiveTable,
  LiveToolbar,
  PortalLink,
  RinaSak,
  SedType,
  ShortId,
  TableSkeleton,
  rowStyle,
} from "@/components/live/ui";

interface FagsakInfo {
  tema?: string;
  type?: string;
  system?: string;
  nr?: string;
  fnr?: string;
  opprettetTidspunkt?: string;
  endretTidspunkt?: string;
}

interface InitiellFagsakInfo {
  id?: string;
  tema?: string;
  type?: string;
  system?: string;
  nr?: string;
  arkiv?: string;
  fnr?: string;
  opprettetTidspunkt?: string;
}

interface NavRinasakSed {
  rinasakId: number;
  overstyrtEnhetsnummer?: string;
  sedId?: string | null;
  sedVersjon?: number | null;
  sedType?: string | null;
  dokumentInfoId?: string;
  opprettetBruker?: string;
  opprettetTidspunkt?: string;
  navRinasakOpprettetBruker?: string;
  navRinasakOpprettetTidspunkt?: string;
  fagsak?: FagsakInfo;
  initiellFagsak?: InitiellFagsakInfo;
  bucType?: string | null;
}

type SentStatus = "SENDT" | "IKKE_SENDT" | "UKJENT";

interface NavRinasakSedRecord {
  sed: NavRinasakSed;
  environment: string;
  receivedAt: string;
  sentStatus: SentStatus;
}

/** Same cap as NavRinasakSedStore in eux-portal-core. */
const MAX_ROWS = 1000;
/** Data columns, not counting the expand toggle. */
const COLS = 9;
const HIGHLIGHT_WINDOW_MS = 60_000;
const FLASH_MS = 1100;
const SENT_FLASH_MS = 1600;
const TICK_MS = 3000;
const CREATED_TINT = "#a7f3d0";

/** When the SED was created in nEESSI, falling back through the known timestamps. */
function sedTime(r: NavRinasakSedRecord): string {
  return (
    [r.sed.opprettetTidspunkt, r.sed.navRinasakOpprettetTidspunkt, r.receivedAt].find((c) => safeDate(c) !== null) ??
    r.receivedAt
  );
}

const recordKey = (r: NavRinasakSedRecord) =>
  `${r.environment}|${r.sed.rinasakId}|${r.sed.sedId ?? "∅"}|${r.sed.sedVersjon ?? "∅"}`;

/** A case created in nEESSI whose SED is not registered in eux-nav-rinasak yet. */
const isPlaceholder = (r: NavRinasakSedRecord) => r.sed.sedId == null;

const fmtDate = (iso?: string | null) => (safeDate(iso) ? formatDateTime(iso) : undefined);

function SentTag({ status }: { status: SentStatus }) {
  const s = { SENDT: "sendt", IKKE_SENDT: "ikke-sendt", UKJENT: "ukjent" }[status];
  return (
    <span className="live-state" data-state={s}>
      <span className="live-state__icon" aria-hidden>
        {status === "SENDT" ? "✓" : status === "UKJENT" ? "?" : ""}
      </span>
      {{ SENDT: "Sendt", IKKE_SENDT: "Ikke sendt", UKJENT: "Ukjent" }[status]}
    </span>
  );
}

/* ---------- Detaljer ---------- */

function SedDetails({ r }: { r: NavRinasakSedRecord }) {
  const s = r.sed;
  const f = s.fagsak;
  const inf = s.initiellFagsak;
  const env = r.environment;
  return (
    <div className="live-details">
      {isPlaceholder(r) && (
        <p className="live-note">
          Saken er opprettet i nEESSI, men SED-en er ikke registrert i eux-nav-rinasak ennå
          {s.sedType ? <>. SED-type og BUC er hentet fra RINA-hendelsene</> : null}. Raden oppdateres av seg selv når
          SED-en kommer.
        </p>
      )}
      <div className="live-details__grid">
        <DetailCard title="SED" aside={<SentTag status={r.sentStatus} />}>
          <Field label="SED-type" value={s.sedType} />
          <Field label="BUC" value={s.bucType} />
          <Field label="SED-ID" value={s.sedId} mono />
          <Field label="Versjon" value={s.sedVersjon} />
          <Field label="Dokument-info-ID" value={s.dokumentInfoId} mono />
          <Field label="Opprettet av" value={s.opprettetBruker} />
          <Field label="Opprettet" value={fmtDate(s.opprettetTidspunkt)} />
        </DetailCard>
        <DetailCard title="RINA-sak" aside={<EnvPill env={env} />}>
          <Field label="RINA-sak">
            <RinaSak env={env} id={s.rinasakId} />
          </Field>
          <Field label="Overstyrt enhet" value={s.overstyrtEnhetsnummer} />
          <Field label="Opprettet av" value={s.navRinasakOpprettetBruker} />
          <Field label="Opprettet" value={fmtDate(s.navRinasakOpprettetTidspunkt)} />
        </DetailCard>
        {f && (
          <DetailCard title="Fagsak">
            <Field label="Tema" value={f.tema} />
            <Field label="Type" value={f.type} />
            <Field label="System" value={f.system} />
            <Field label="Fagsaknr" value={f.nr} mono />
            <Field label="Fnr" value={f.fnr} mono />
            <Field label="Opprettet" value={fmtDate(f.opprettetTidspunkt)} />
            <Field label="Endret" value={fmtDate(f.endretTidspunkt)} />
          </DetailCard>
        )}
        {inf && (
          <DetailCard title="Initiell fagsak">
            <Field label="Tema" value={inf.tema} />
            <Field label="Type" value={inf.type} />
            <Field label="System" value={inf.system} />
            <Field label="Fagsaknr" value={inf.nr} mono />
            <Field label="Arkiv" value={inf.arkiv} />
            <Field label="Fnr" value={inf.fnr} mono />
            <Field label="Opprettet" value={fmtDate(inf.opprettetTidspunkt)} />
          </DetailCard>
        )}
      </div>
      <DetailLinks>
        <PortalLink href={`/kafka/sed-hendelser?q=${s.rinasakId}&miljo=${env}`}>Hendelsene i SED-hendelser</PortalLink>
        {r.sentStatus === "SENDT" && (
          <PortalLink href={`/kafka/sed-kobling?q=${s.rinasakId}`}>Kom den fram? Se SED-kobling</PortalLink>
        )}
        <PortalLink href="/applications#eux-nav-rinasak">Om eux-nav-rinasak</PortalLink>
        <ExtLink href={neessiSakUrl(env, s.rinasakId)}>Åpne sak {s.rinasakId} i nEESSI</ExtLink>
        <span className="arch-subtle live-small live-links__meta">Sett av portalen {formatDateTime(r.receivedAt)}</span>
      </DetailLinks>
    </div>
  );
}

/* ---------- Side ---------- */

export default function NavRinasakSedPage() {
  const [records, setRecords] = useState<NavRinasakSedRecord[]>([]);
  const [firstSeenAt, setFirstSeenAt] = useState<Map<string, number>>(() => new Map());
  const [sentFlash, setSentFlash] = useState<Set<string>>(() => new Set());
  const [q, setQ] = useUrlState("q", "");
  const [env, setEnv] = useUrlState("miljo", "alle");
  const [status, setStatus] = useUrlState("status", "alle");
  const now = useNow(TICK_MS);

  const flashTimers = useRef(new Set<ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const timers = flashTimers.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  const onCreated = useCallback((data: unknown) => {
    const record = data as NavRinasakSedRecord;
    const k = recordKey(record);
    setFirstSeenAt((prev) => rememberFirstSeen(prev, [[k, Date.now()]]));
    setRecords((prev) => {
      const idx = prev.findIndex((r) => recordKey(r) === k);
      if (idx < 0) return [record, ...prev].slice(0, MAX_ROWS);
      // A placeholder enriched with its SED type: replace in place.
      const next = [...prev];
      next[idx] = record;
      return next;
    });
  }, []);

  const onStatus = useCallback((data: unknown) => {
    const record = data as NavRinasakSedRecord;
    const k = recordKey(record);
    setRecords((prev) => prev.map((r) => (recordKey(r) === k ? { ...r, sentStatus: record.sentStatus } : r)));
    if (record.sentStatus === "SENDT") {
      setSentFlash((prev) => new Set(prev).add(k));
      const timer = setTimeout(() => {
        flashTimers.current.delete(timer);
        setSentFlash((prev) => {
          const next = new Set(prev);
          next.delete(k);
          return next;
        });
      }, SENT_FLASH_MS);
      flashTimers.current.add(timer);
    }
  }, []);

  const onRemoved = useCallback((data: unknown) => {
    const { environment, rinasakId } = data as { environment: string; rinasakId: number };
    setRecords((prev) =>
      prev.filter((r) => !(r.environment === environment && r.sed.rinasakId === rinasakId && r.sed.sedId == null)),
    );
  }, []);

  const live = useLiveStream("/api/nav-rinasak/sed-er/stream", {
    "nav-rinasak-sed": onCreated,
    "nav-rinasak-sed-status": onStatus,
    "nav-rinasak-sed-removed": onRemoved,
  });

  const { loading, error } = useSnapshot<NavRinasakSedRecord[]>(
    "/api/nav-rinasak/sed-er",
    (data) => {
      const capped = [...data].sort((a, b) => ms(sedTime(b)) - ms(sedTime(a))).slice(0, MAX_ROWS);
      setFirstSeenAt((prev) => rememberFirstSeen(prev, capped.map((r) => [recordKey(r), ms(sedTime(r))] as const)));
      setRecords(capped);
    },
    live.reconnects,
  );

  const toks = tokens(q);
  const sorted = useMemo(() => [...records].sort((a, b) => ms(sedTime(b)) - ms(sedTime(a))), [records]);
  const filtered = sorted.filter((r) => {
    if (env !== "alle" && r.environment !== env) return false;
    if (status === "ikke-sendt" && r.sentStatus === "SENDT") return false;
    if (status === "sendt" && r.sentStatus !== "SENDT") return false;
    const s = r.sed;
    return matchesAll(
      [
        s.rinasakId,
        s.sedType,
        s.bucType,
        s.sedId,
        s.dokumentInfoId,
        s.opprettetBruker,
        s.navRinasakOpprettetBruker,
        s.overstyrtEnhetsnummer,
        s.fagsak?.tema,
        s.fagsak?.nr,
        s.fagsak?.fnr,
        s.initiellFagsak?.tema,
        s.initiellFagsak?.nr,
        s.initiellFagsak?.fnr,
      ],
      toks,
    );
  });
  const groups = groupByDay(filtered, sedTime);

  const scoped = records.filter((r) => env === "alle" || r.environment === env);
  const today = scoped.filter((r) => isToday(sedTime(r)));
  const notSent = scoped.filter((r) => r.sentStatus !== "SENDT").length;
  const placeholders = scoped.filter(isPlaceholder).length;
  const filtering = q !== "" || env !== "alle" || status !== "alle";
  let index = 0;

  return (
    <div className="portal-page--wide arch-page lite-page live-page">
      <LiveHero
        page="neessi"
        title="SED-er i nEESSI"
        lead={
          <>
            Saker og SED-er som opprettes i nEESSI, med en gang de lagres i eux-nav-rinasak. Nye saker vises med en
            gang, og SED-type og SED-ID fylles inn når SED-en er registrert.
          </>
        }
        status={live.status}
        lastEventAt={live.lastEventAt}
        art={<NeessiArt />}
        stats={[
          { label: "Opprettet i dag", value: today.length, sub: `av ${scoped.length} i minnet`, tone: "success" },
          { label: "Ikke sendt", value: notSent, sub: "opprettet, men ikke sendt" },
          { label: "Uten SED", value: placeholders, sub: "sak opprettet, SED kommer" },
        ]}
      />

      <LiveToolbar
        query={q}
        onQuery={setQ}
        placeholder="RINA-sak, SED-type, fnr, saksbehandler …"
        shown={filtered.length}
        total={records.length}
        unit="SED-er"
        onReset={filtering ? () => (setQ(""), setEnv("alle"), setStatus("alle")) : undefined}
      >
        <ToggleGroup size="small" value={env} onChange={setEnv} aria-label="Miljø">
          <ToggleGroup.Item value="alle">Alle miljøer</ToggleGroup.Item>
          <ToggleGroup.Item value="q1">Q1</ToggleGroup.Item>
          <ToggleGroup.Item value="q2">Q2</ToggleGroup.Item>
        </ToggleGroup>
        <ToggleGroup size="small" value={status} onChange={setStatus} aria-label="Status">
          <ToggleGroup.Item value="alle">Alle</ToggleGroup.Item>
          <ToggleGroup.Item value="ikke-sendt">Ikke sendt</ToggleGroup.Item>
          <ToggleGroup.Item value="sendt">Sendt</ToggleGroup.Item>
        </ToggleGroup>
      </LiveToolbar>

      {loading ? (
        <TableSkeleton cols={7} />
      ) : error && records.length === 0 ? (
        <LiveMessage tone="danger" title="Fikk ikke kontakt med eux-portal-core">
          {error}. Siden prøver å koble til strømmen igjen av seg selv.
        </LiveMessage>
      ) : records.length === 0 ? (
        <LiveMessage title="Ingen SED-er ennå">Opprett en sak i nEESSI, så dukker den opp her.</LiveMessage>
      ) : filtered.length === 0 ? (
        <LiveMessage title="Ingen treff">Prøv et annet søk, eller nullstill filtrene.</LiveMessage>
      ) : (
        <LiveTable className="live-table--neessi">
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell />
              <Table.HeaderCell>Tid</Table.HeaderCell>
              <Table.HeaderCell>Miljø</Table.HeaderCell>
              <Table.HeaderCell>SED</Table.HeaderCell>
              <Table.HeaderCell>BUC</Table.HeaderCell>
              <Table.HeaderCell>RINA-sak</Table.HeaderCell>
              <Table.HeaderCell>Tema</Table.HeaderCell>
              <Table.HeaderCell>Opprettet av</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>SED-ID</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {groups.flatMap((g) => [
              <DayRow key={`day-${g.key}`} heading={g.heading} count={g.rows.length} unit={g.rows.length === 1 ? "SED" : "SED-er"} colSpan={COLS + 1} />,
              ...g.rows.map((r) => {
                const k = recordKey(r);
                const seen = firstSeenAt.get(k);
                const age = seen !== undefined ? now - seen : Infinity;
                const alpha = fadeAlpha(age, HIGHLIGHT_WINDOW_MS);
                const cls = ["live-row"];
                if (alpha > 0) cls.push("live-row--tint");
                if (age < FLASH_MS) cls.push("live-row--new");
                if (r.sentStatus === "IKKE_SENDT") cls.push("live-row--unsent");
                if (sentFlash.has(k)) cls.push("live-row--sent");
                if (isPlaceholder(r)) cls.push("live-row--placeholder");
                const s = r.sed;
                return (
                  <Table.ExpandableRow
                    key={k}
                    expandOnRowClick
                    togglePlacement="left"
                    content={<SedDetails r={r} />}
                    className={cls.join(" ")}
                    style={rowStyle(
                      index++,
                      alpha > 0 ? ({ "--row-tint": CREATED_TINT, "--row-tint-alpha": alpha } as CSSProperties) : undefined,
                    )}
                  >
                    <Table.DataCell className="live-time">{formatTime(sedTime(r))}</Table.DataCell>
                    <Table.DataCell>
                      <EnvPill env={r.environment} />
                    </Table.DataCell>
                    <Table.DataCell>
                      <SedType type={s.sedType} toks={toks} />
                    </Table.DataCell>
                    <Table.DataCell>
                      {s.bucType ? <Hl text={s.bucType} toks={toks} /> : <EmptyValue />}
                    </Table.DataCell>
                    <Table.DataCell>
                      <RinaSak env={r.environment} id={s.rinasakId} toks={toks} />
                    </Table.DataCell>
                    <Table.DataCell>
                      {s.fagsak?.tema ?? s.initiellFagsak?.tema ? (
                        <Hl text={s.fagsak?.tema ?? s.initiellFagsak?.tema} toks={toks} />
                      ) : (
                        <EmptyValue />
                      )}
                    </Table.DataCell>
                    <Table.DataCell className="live-small">
                      {s.opprettetBruker ?? s.navRinasakOpprettetBruker ? (
                        <Hl text={s.opprettetBruker ?? s.navRinasakOpprettetBruker} toks={toks} />
                      ) : (
                        <EmptyValue />
                      )}
                    </Table.DataCell>
                    <Table.DataCell>
                      <SentTag status={r.sentStatus} />
                    </Table.DataCell>
                    <Table.DataCell>
                      {isPlaceholder(r) ? (
                        <span className="live-pending" title="SED-ID kommer når SED-en registreres i eux-nav-rinasak">
                          avventer
                        </span>
                      ) : (
                        <ShortId id={s.sedId} toks={toks} />
                      )}
                    </Table.DataCell>
                  </Table.ExpandableRow>
                );
              }),
            ])}
          </Table.Body>
        </LiveTable>
      )}

      <LiveAbout
        title="Hvor SED-ene kommer fra"
        lead="Siden spør eux-nav-rinasak, der nEESSI lagrer sakene og SED-ene sine, og blander inn hendelser fra Kafka."
        chain={[
          { label: "nEESSI", sub: "saksbehandler oppretter", href: "/applications#eux-neessi" },
          { label: "eux-nav-rinasak", sub: "lagrer sak og SED", href: "/applications#eux-nav-rinasak", tone: "success" },
          { label: "eux-portal-core", sub: "spør hvert 5. sekund", href: "https://github.com/navikt/eux-architecture/tree/main/portal-core" },
          { label: "Denne siden", sub: "SSE, live" },
        ]}
        facts={[
          <>
            eux-portal-core henter de 200 nyeste sakene i Q1 og Q2 hvert 5. sekund og holder opptil {MAX_ROWS} rader i
            minnet. Det som fantes ved oppstart vises uten grønt blink.
          </>,
          <>
            En sak uten SED vises med «avventer». Mens den venter, hentes SED-type og BUC fra{" "}
            <NextLink href={archHref("eux-rina-document-events-v1")} className="live-inline-link">
              eux-rina-document-events-v1
            </NextLink>
            .
          </>,
          <>
            «Sendt» er beste forsøk. Den settes når en melding på{" "}
            <NextLink href={archHref("sedsendt-v1")} className="live-inline-link">
              sedsendt-v1
            </NextLink>{" "}
            har samme RINA-sak og SED-ID, eller samme RINA-sak og SED-type.
          </>,
        ]}
      />

      <LiveFurther
        current="neessi"
        extra={[
          { href: "/nytt-i-neessi", title: "Nytt i nEESSI", text: "Hva som er endret i nEESSI den siste tiden." },
          { href: "/environments", title: "Miljøer", text: "Hvor du finner nEESSI og Gosys i Q1 og Q2." },
        ]}
      />
    </div>
  );
}
