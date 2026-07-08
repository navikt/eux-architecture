"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Heading,
  BodyShort,
  Box,
  VStack,
  HStack,
  HGrid,
  Table,
  ToggleGroup,
  Search,
  Tag,
  Alert,
  Detail,
  Label,
  Loader,
  CopyButton,
  Link as DsLink,
} from "@navikt/ds-react";
import {
  safeDate,
  formatTime,
  formatDateTime,
  formatDayHeading,
  dayKey,
  isToday,
} from "@/lib/datetime";
import { neessiSakUrl } from "@/lib/neessi";
import { StatusDot, type ConnectionStatus } from "@/components/StatusDot";

/* ── Types ─────────────────────────────────────────── */

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

/* ── Helpers ─────────────────────────────────────────── */

/** Business time of a SED: when it was created in nEESSI. Falls back through the
 *  available timestamps, skipping any that are missing or unparseable. */
function sedTime(r: NavRinasakSedRecord): string {
  return (
    [
      r.sed.opprettetTidspunkt,
      r.sed.navRinasakOpprettetTidspunkt,
      r.receivedAt,
    ].find((c) => safeDate(c) !== null) ?? r.receivedAt
  );
}

/** Epoch millis for a SED's business time, or 0 when unparseable (used for
 *  sorting / "seen at" bookkeeping). */
function sedTimeMs(r: NavRinasakSedRecord): number {
  return safeDate(sedTime(r))?.getTime() ?? 0;
}

/** Unique key for a table row: a case placeholder (no SED yet) or a single SED. */
function recordKey(r: NavRinasakSedRecord): string {
  return `${r.environment}|${r.sed.rinasakId}|${r.sed.sedId ?? "∅"}|${r.sed.sedVersjon ?? "∅"}`;
}

/** True when the row is a case created in nEESSI whose SED is not yet
 *  registered in eux-nav-rinasak (no SED-ID yet). */
function isPlaceholder(r: NavRinasakSedRecord): boolean {
  return r.sed.sedId == null;
}

/* ── Flash / tint constants ─────────────────────────── */

const HIGHLIGHT_WINDOW_MS = 60 * 1000;
const FLASH_DURATION_MS = 1100;
const SENT_FLASH_MS = 1600;
const TICK_MS = 3000;
const RECONNECT_MS = 5000;
const MAX_ROWS = 500;
const FIRST_SEEN_CAP = 2000;
const CREATED_TINT = "#a7f3d0"; // mint — "created in nEESSI"

/** Eased alpha: starts vivid, fades to 0 at 1 min. */
function tintAlpha(ageMs: number): number {
  if (ageMs <= 0) return 1;
  if (ageMs >= HIGHLIGHT_WINDOW_MS) return 0;
  const remaining = 1 - ageMs / HIGHLIGHT_WINDOW_MS;
  return Math.pow(remaining, 0.7);
}

/* ── Badges ─────────────────────────────────────────── */

function EnvBadge({ env }: { env: string }) {
  return (
    <Tag size="xsmall" variant="neutral">
      {env.toUpperCase()}
    </Tag>
  );
}

function SentStatusTag({ status }: { status: SentStatus }) {
  if (status === "SENDT") {
    return (
      <Tag size="xsmall" variant="success-moderate">
        ✓ Sendt
      </Tag>
    );
  }
  if (status === "IKKE_SENDT") {
    return (
      <Tag size="xsmall" variant="warning-moderate">
        Ikke sendt
      </Tag>
    );
  }
  return (
    <Tag size="xsmall" variant="neutral-moderate">
      Ukjent
    </Tag>
  );
}

/* ── SSE hook ───────────────────────────────────────── */

function useNavRinasakSSE(
  onCreated: (record: NavRinasakSedRecord) => void,
  onStatus: (record: NavRinasakSedRecord) => void,
  onRemoved: (environment: string, rinasakId: number) => void,
) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const onCreatedRef = useRef(onCreated);
  const onStatusRef = useRef(onStatus);
  const onRemovedRef = useRef(onRemoved);

  useEffect(() => {
    onCreatedRef.current = onCreated;
    onStatusRef.current = onStatus;
    onRemovedRef.current = onRemoved;
  });

  useEffect(() => {
    let source: EventSource | null = null;
    let closed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      if (closed) return;
      setStatus("connecting");
      source = new EventSource("/api/nav-rinasak/sed-er/stream");

      source.addEventListener("nav-rinasak-sed", (e) => {
        try {
          onCreatedRef.current(JSON.parse(e.data) as NavRinasakSedRecord);
        } catch {
          /* ignore malformed */
        }
      });

      source.addEventListener("nav-rinasak-sed-status", (e) => {
        try {
          onStatusRef.current(JSON.parse(e.data) as NavRinasakSedRecord);
        } catch {
          /* ignore malformed */
        }
      });

      source.addEventListener("nav-rinasak-sed-removed", (e) => {
        try {
          const { environment, rinasakId } = JSON.parse(e.data) as {
            environment: string;
            rinasakId: number;
          };
          onRemovedRef.current(environment, rinasakId);
        } catch {
          /* ignore malformed */
        }
      });

      source.addEventListener("heartbeat", () => {
        setStatus("connected");
      });

      source.onopen = () => setStatus("connected");

      source.onerror = () => {
        setStatus("disconnected");
        source?.close();
        if (!closed) {
          reconnectTimer = setTimeout(connect, RECONNECT_MS);
        }
      };
    }

    connect();

    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      source?.close();
    };
  }, []);

  return status;
}

/* ── Small presentational helpers ───────────────────── */

const MONO_FONT = "var(--ax-font-family-mono, ui-monospace, monospace)";

/** Formats a timestamp, or returns undefined when missing/unparseable so that
 *  <Field> renders the subtle empty state instead of a literal dash. */
function fmtDate(iso?: string | null): string | undefined {
  return safeDate(iso) ? formatDateTime(iso) : undefined;
}

/** Subtle stand-in for a missing value — quieter and prettier than a bare "-". */
function EmptyValue() {
  return (
    <span
      aria-label="ingen verdi"
      style={{ color: "var(--ax-text-subtle, #767676)", opacity: 0.4 }}
    >
      —
    </span>
  );
}

/** SED type shown as a compact, calm mono chip (falls back to a muted hint). */
function SedTypeChip({ type }: { type?: string | null }) {
  if (!type) {
    return (
      <BodyShort
        size="small"
        style={{ color: "var(--ax-text-subtle, #767676)", opacity: 0.7 }}
      >
        ukjent
      </BodyShort>
    );
  }
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        fontFamily: MONO_FONT,
        fontSize: "0.8rem",
        fontWeight: 600,
        letterSpacing: "0.02em",
        padding: "0.1rem 0.45rem",
        borderRadius: 6,
        background: "var(--ax-bg-neutral-soft, #f1f3f5)",
        border: "1px solid var(--ax-border-subtle, rgba(0,0,0,0.08))",
        color: "var(--ax-text-default, #1a1a1a)",
      }}
    >
      {type}
    </span>
  );
}

/** Low-key inline stat for the page header — no boxes, no loud colours. */
function StatInline({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: boolean;
}) {
  return (
    <HStack gap="space-2" align="baseline">
      <span
        style={{
          fontSize: "1.25rem",
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
          color: "var(--ax-text-default, #1a1a1a)",
        }}
      >
        {value}
      </span>
      <HStack gap="space-1" align="center">
        {hint && (
          <span
            aria-hidden="true"
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "var(--ax-border-warning, #c77300)",
              opacity: 0.45,
            }}
          />
        )}
        <Detail style={{ color: "var(--ax-text-subtle, #555)" }}>{label}</Detail>
      </HStack>
    </HStack>
  );
}

/* ── Expanded row details ───────────────────────────── */

function Field({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  const hasValue = Boolean(value && value.length > 0);
  return (
    <VStack gap="space-1">
      <Detail
        textColor="subtle"
        style={{ textTransform: "uppercase", letterSpacing: "0.04em", fontSize: "0.7rem" }}
      >
        {label}
      </Detail>
      <HStack gap="space-1" align="center" wrap={false}>
        {hasValue ? (
          <>
            <BodyShort
              size="small"
              style={{
                fontFamily: mono ? MONO_FONT : undefined,
                wordBreak: "break-all",
              }}
            >
              {value}
            </BodyShort>
            <CopyButton
              size="xsmall"
              copyText={value!}
              variant="action"
              title={`Kopier ${label.toLowerCase()}`}
            />
          </>
        ) : (
          <EmptyValue />
        )}
      </HStack>
    </VStack>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box
      paddingBlock="space-4"
      paddingInline="space-4"
      style={{
        borderRadius: 10,
        background: "var(--ax-bg-default, #fff)",
        border: "1px solid var(--ax-border-subtle, rgba(0,0,0,0.08))",
      }}
    >
      <VStack gap="space-2">
        <Detail
          textColor="subtle"
          style={{ textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}
        >
          {title}
        </Detail>
        <HGrid gap="space-4" columns={{ xs: 1, sm: 2 }}>
          {children}
        </HGrid>
      </VStack>
    </Box>
  );
}

function SedDetails({ record }: { record: NavRinasakSedRecord }) {
  const s = record.sed;
  const f = s.fagsak;
  const inf = s.initiellFagsak;
  const placeholder = s.sedId == null;
  return (
    <Box
      paddingBlock="space-4"
      paddingInline="space-4"
      style={{ background: "var(--ax-bg-subtle, #f7f8fa)" }}
    >
      <VStack gap="space-4">
        {/* Header: identity chips on the left, jump-to-nEESSI on the right */}
        <HStack justify="space-between" align="center" gap="space-4" wrap>
          <HStack gap="space-2" align="center" wrap>
            <SedTypeChip type={s.sedType} />
            {s.bucType && (
              <Tag size="xsmall" variant="neutral-moderate">
                BUC {s.bucType}
              </Tag>
            )}
            <SentStatusTag status={record.sentStatus} />
          </HStack>
          <DsLink
            href={neessiSakUrl(record.environment, s.rinasakId)}
            target="_blank"
            rel="noreferrer"
          >
            Åpne sak {s.rinasakId} i nEESSI
            <span aria-hidden="true" style={{ marginLeft: 4, opacity: 0.6 }}>
              ↗
            </span>
          </DsLink>
        </HStack>

        {placeholder && (
          <Alert variant="info" size="small" inline>
            {s.sedType ? (
              <>
                SED-typen {s.sedType}
                {s.bucType ? ` (BUC ${s.bucType})` : ""} er hentet fra
                RINA-hendelser. Saken er opprettet i nEESSI, men SED-en er ennå
                ikke registrert i eux-nav-rinasak, så SED-ID og dokument-info
                mangler fortsatt. Raden oppdateres automatisk når SED-en
                registreres.
              </>
            ) : (
              <>
                Saken er opprettet i nEESSI, men SED-en er ennå ikke registrert i
                eux-nav-rinasak, så SED-type, SED-ID og dokument-info mangler.
                Raden oppdateres automatisk når SED-en registreres.
              </>
            )}
          </Alert>
        )}

        <HGrid gap="space-4" columns={{ xs: 1, lg: 2 }}>
          <Section title="SED">
            <Field label="SED-ID (setId i RINA)" value={s.sedId} mono />
            <Field
              label="SED-versjon"
              value={s.sedVersjon != null ? String(s.sedVersjon) : undefined}
            />
            <Field label="Dokument-info-ID" value={s.dokumentInfoId} mono />
            <Field label="Opprettet av" value={s.opprettetBruker} />
            <Field label="Opprettet" value={fmtDate(s.opprettetTidspunkt)} />
          </Section>

          <Section title="RINA-sak">
            <Field label="RINA-sak-ID" value={String(s.rinasakId)} mono />
            <Field label="Overstyrt enhet" value={s.overstyrtEnhetsnummer} />
            <Field label="Opprettet av (sak)" value={s.navRinasakOpprettetBruker} />
            <Field label="Opprettet (sak)" value={fmtDate(s.navRinasakOpprettetTidspunkt)} />
          </Section>

          {f && (
            <Section title="Fagsak">
              <Field label="Tema" value={f.tema} />
              <Field label="Type" value={f.type} />
              <Field label="System" value={f.system} />
              <Field label="Fagsaknr" value={f.nr} mono />
              <Field label="Fnr" value={f.fnr} mono />
              <Field label="Opprettet" value={fmtDate(f.opprettetTidspunkt)} />
              <Field label="Endret" value={fmtDate(f.endretTidspunkt)} />
            </Section>
          )}

          {inf && (
            <Section title="Initiell fagsak">
              <Field label="Tema" value={inf.tema} />
              <Field label="Type" value={inf.type} />
              <Field label="System" value={inf.system} />
              <Field label="Fagsaknr" value={inf.nr} mono />
              <Field label="Arkiv" value={inf.arkiv} />
              <Field label="Fnr" value={inf.fnr} mono />
              <Field label="Opprettet" value={fmtDate(inf.opprettetTidspunkt)} />
            </Section>
          )}
        </HGrid>

        <HStack gap="space-2" align="center" wrap>
          <Detail style={{ color: "var(--ax-text-subtle, #767676)" }}>
            {record.environment.toUpperCase()}
          </Detail>
          <span aria-hidden="true" style={{ color: "var(--ax-text-subtle, #767676)", opacity: 0.5 }}>
            ·
          </span>
          <Detail style={{ color: "var(--ax-text-subtle, #767676)" }}>
            Observert av portal {formatDateTime(record.receivedAt)}
          </Detail>
        </HStack>
      </VStack>
    </Box>
  );
}

/* ── Page component ─────────────────────────────────── */

export default function NavRinasakSedPage() {
  const [records, setRecords] = useState<NavRinasakSedRecord[]>([]);
  const [envFilter, setEnvFilter] = useState<string>("alle");
  const [statusFilter, setStatusFilter] = useState<string>("alle");
  const [search, setSearch] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Wall-clock ms when each record was first observed in this browser session.
  // Snapshot rows use their creation time (no flash); SSE rows use now (flash).
  const [firstSeenAt, setFirstSeenAt] = useState<Map<string, number>>(
    () => new Map(),
  );
  // Keys of rows that just flipped to "Sendt" — drives a transient green flash.
  const [sentFlashKeys, setSentFlashKeys] = useState<Set<string>>(
    () => new Set(),
  );

  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  // Initial snapshot
  useEffect(() => {
    fetch("/api/nav-rinasak/sed-er")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: NavRinasakSedRecord[]) => {
        setFirstSeenAt((prev) => {
          const next = new Map(prev);
          for (const r of data) {
            const k = recordKey(r);
            if (!next.has(k)) next.set(k, sedTimeMs(r));
          }
          return next;
        });
        setRecords(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message ?? "Kunne ikke hente SED-er");
        setLoading(false);
      });
  }, []);

  const handleCreated = useCallback((record: NavRinasakSedRecord) => {
    const k = recordKey(record);
    setFirstSeenAt((prev) => {
      if (prev.has(k)) return prev;
      const next = new Map(prev);
      next.set(k, Date.now());
      // Bound growth over long-lived sessions: the oldest-seen entries are well
      // past the highlight window, so dropping them never affects a visible tint.
      while (next.size > FIRST_SEEN_CAP) {
        const oldest = next.keys().next().value;
        if (oldest === undefined) break;
        next.delete(oldest);
      }
      return next;
    });
    setRecords((prev) => {
      const idx = prev.findIndex((r) => recordKey(r) === k);
      if (idx >= 0) {
        // Same row (e.g. a placeholder enriched with its SED type from the RINA
        // document-events stream) — replace it in place, keeping its position so
        // the "new row" flash does not re-trigger.
        const next = [...prev];
        next[idx] = record;
        return next;
      }
      return [record, ...prev].slice(0, MAX_ROWS);
    });
  }, []);

  const handleStatus = useCallback((record: NavRinasakSedRecord) => {
    const k = recordKey(record);
    setRecords((prev) =>
      prev.map((r) =>
        recordKey(r) === k ? { ...r, sentStatus: record.sentStatus } : r,
      ),
    );
    if (record.sentStatus === "SENDT") {
      setSentFlashKeys((prev) => {
        const next = new Set(prev);
        next.add(k);
        return next;
      });
      setTimeout(() => {
        setSentFlashKeys((prev) => {
          const next = new Set(prev);
          next.delete(k);
          return next;
        });
      }, SENT_FLASH_MS);
    }
  }, []);

  // A case's SED got journalført → drop the "no SED yet" placeholder row.
  const handleRemoved = useCallback((environment: string, rinasakId: number) => {
    setRecords((prev) =>
      prev.filter(
        (r) =>
          !(
            r.environment === environment &&
            r.sed.rinasakId === rinasakId &&
            r.sed.sedId == null
          ),
      ),
    );
  }, []);

  const sseStatus = useNavRinasakSSE(handleCreated, handleStatus, handleRemoved);

  // Filter
  const query = search.trim().toLowerCase();
  const filtered = records.filter((r) => {
    if (envFilter !== "alle" && r.environment !== envFilter) return false;
    if (statusFilter === "ikke-sendt" && r.sentStatus === "SENDT") return false;
    if (statusFilter === "sendt" && r.sentStatus !== "SENDT") return false;
    if (query) {
      const haystack = [
        String(r.sed.rinasakId),
        r.sed.sedType,
        r.sed.bucType,
        r.sed.sedId,
        r.sed.opprettetBruker,
        r.sed.navRinasakOpprettetBruker,
        r.sed.fagsak?.tema,
        r.sed.fagsak?.fnr,
        r.sed.initiellFagsak?.tema,
        r.sed.initiellFagsak?.fnr,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  // Newest created first
  const sorted = [...filtered].sort((a, b) => sedTimeMs(b) - sedTimeMs(a));

  // Header stats (computed over env-filtered set, ignoring search/status)
  const envScoped = records.filter(
    (r) => envFilter === "alle" || r.environment === envFilter,
  );
  const antallIkkeSendt = envScoped.filter(
    (r) => r.sentStatus !== "SENDT",
  ).length;
  const antallIDag = envScoped.filter((r) => isToday(sedTime(r))).length;

  // Group into one table per day
  const groups: { key: string; heading: string; rows: NavRinasakSedRecord[] }[] = [];
  for (const r of sorted) {
    const t = sedTime(r);
    const key = dayKey(t);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.rows.push(r);
    } else {
      groups.push({ key, heading: formatDayHeading(t), rows: [r] });
    }
  }

  return (
    <VStack gap="space-6" className="portal-page--wide">
      <Box>
        <HStack gap="space-4" align="center" wrap>
          <Heading size="large" level="1">
            SED-er i nEESSI
          </Heading>
          <StatusDot status={sseStatus} />
        </HStack>
        <BodyShort style={{ color: "var(--ax-text-subtle, #555)", marginTop: 6, maxWidth: "56rem" }}>
          Sanntidsmonitor for saker og SED-er som opprettes i nEESSI og
          registreres i eux-nav-rinasak. Nye saker dukker opp umiddelbart –
          SED-type og SED-ID fylles inn når SED-en registreres.
        </BodyShort>
      </Box>

      {/* Stats — deliberately low-key: an at-a-glance summary, not an alarm */}
      <HStack gap="space-6" align="center" wrap>
        <StatInline label="opprettet i dag" value={antallIDag} />
        <span
          aria-hidden="true"
          style={{
            width: 1,
            height: 26,
            background: "var(--ax-border-subtle, rgba(0,0,0,0.12))",
          }}
        />
        <StatInline label="venter på sending" value={antallIkkeSendt} hint />
      </HStack>

      {/* Filters */}
      <HStack gap="space-4" wrap align="end">
        <ToggleGroup
          size="small"
          value={envFilter}
          onChange={(v) => setEnvFilter(v)}
          label="Miljø"
        >
          <ToggleGroup.Item value="alle">Alle</ToggleGroup.Item>
          <ToggleGroup.Item value="q1">Q1</ToggleGroup.Item>
          <ToggleGroup.Item value="q2">Q2</ToggleGroup.Item>
        </ToggleGroup>

        <ToggleGroup
          size="small"
          value={statusFilter}
          onChange={(v) => setStatusFilter(v)}
          label="Status"
        >
          <ToggleGroup.Item value="alle">Alle</ToggleGroup.Item>
          <ToggleGroup.Item value="ikke-sendt">Kun ikke sendt</ToggleGroup.Item>
          <ToggleGroup.Item value="sendt">Kun sendt</ToggleGroup.Item>
        </ToggleGroup>

        <Box style={{ minWidth: 240 }}>
          <Search
            label="Søk"
            size="small"
            variant="simple"
            placeholder="RINA-sak, SED-type, fnr, bruker …"
            value={search}
            onChange={(v) => setSearch(v)}
            onClear={() => setSearch("")}
          />
        </Box>
      </HStack>

      {/* Table */}
      {loading ? (
        <HStack justify="center" style={{ padding: "2rem" }}>
          <Loader size="xlarge" />
        </HStack>
      ) : error ? (
        <Alert variant="error" size="small">
          Kunne ikke koble til portal-core: {error}
        </Alert>
      ) : sorted.length === 0 ? (
        <Alert variant="info" size="small">
          Ingen SED-er å vise{records.length > 0 ? " for gjeldende filter" : " ennå"}.
          Nye SED-er vises automatisk.
        </Alert>
      ) : (
        <Box
          className="sed-hendelser-table nav-rinasak-table"
          style={{
            borderRadius: 8,
            border: "1px solid var(--ax-border-subtle, rgba(0,0,0,0.08))",
          }}
        >
          <Table size="small">
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell />
                <Table.HeaderCell>Tid</Table.HeaderCell>
                <Table.HeaderCell>Miljø</Table.HeaderCell>
                <Table.HeaderCell>SED-type</Table.HeaderCell>
                <Table.HeaderCell>RINA-sak</Table.HeaderCell>
                <Table.HeaderCell>Tema</Table.HeaderCell>
                <Table.HeaderCell>Opprettet av</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell>SED-ID</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {groups.flatMap((group) => [
                <Table.Row key={`day-${group.key}`}>
                  <Table.DataCell
                    colSpan={9}
                    style={{
                      background: "var(--ax-bg-neutral-soft, #f1f3f5)",
                      borderTop:
                        "1px solid var(--ax-border-subtle, rgba(0,0,0,0.08))",
                      padding: "0.5rem 1rem",
                    }}
                  >
                    <HStack gap="space-2" align="center" wrap>
                      <Label size="small" style={{ textTransform: "none" }}>
                        {group.heading}
                      </Label>
                      <Detail style={{ color: "var(--ax-text-subtle, #555)" }}>
                        {group.rows.length}{" "}
                        {group.rows.length === 1 ? "SED" : "SED-er"}
                      </Detail>
                    </HStack>
                  </Table.DataCell>
                </Table.Row>,
                ...group.rows.map((r, i) => {
                  const rk = recordKey(r);
                  const firstSeen = firstSeenAt.get(rk);
                  const age = firstSeen !== undefined ? now - firstSeen : Infinity;
                  const alpha = tintAlpha(age);
                  const isNew = firstSeen !== undefined && age < FLASH_DURATION_MS;
                  const classNames: string[] = [];
                  if (alpha > 0) classNames.push("sed-tint");
                  if (isNew) classNames.push("sed-tint--flash");
                  if (r.sentStatus === "IKKE_SENDT")
                    classNames.push("nav-rinasak-row--ikke-sendt");
                  if (sentFlashKeys.has(rk))
                    classNames.push("nav-rinasak-row--sent-flash");
                  const rowStyle =
                    alpha > 0
                      ? ({
                          "--row-tint": CREATED_TINT,
                          "--row-tint-alpha": alpha,
                        } as React.CSSProperties)
                      : undefined;
                  const fagsakTema =
                    r.sed.fagsak?.tema ?? r.sed.initiellFagsak?.tema;
                  return (
                    <Table.ExpandableRow
                      key={`${rk}-${i}`}
                      expandOnRowClick
                      content={<SedDetails record={r} />}
                      className={classNames.join(" ") || undefined}
                      style={rowStyle}
                    >
                      <Table.DataCell>
                        <Detail>
                          <strong>{formatTime(sedTime(r))}</strong>
                        </Detail>
                      </Table.DataCell>
                      <Table.DataCell>
                        <EnvBadge env={r.environment} />
                      </Table.DataCell>
                      <Table.DataCell>
                        <SedTypeChip type={r.sed.sedType} />
                      </Table.DataCell>
                      <Table.DataCell>
                        <DsLink
                          href={neessiSakUrl(r.environment, r.sed.rinasakId)}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {r.sed.rinasakId}
                          <span
                            aria-hidden="true"
                            style={{ marginLeft: 4, opacity: 0.6, fontSize: "0.85em" }}
                          >
                            ↗
                          </span>
                        </DsLink>
                      </Table.DataCell>
                      <Table.DataCell>{fagsakTema ?? <EmptyValue />}</Table.DataCell>
                      <Table.DataCell>
                        {r.sed.opprettetBruker ??
                          r.sed.navRinasakOpprettetBruker ?? <EmptyValue />}
                      </Table.DataCell>
                      <Table.DataCell>
                        <SentStatusTag status={r.sentStatus} />
                      </Table.DataCell>
                      <Table.DataCell>
                        {isPlaceholder(r) ? (
                          <BodyShort
                            size="small"
                            title="SED-ID registreres i eux-nav-rinasak når SED-en behandles"
                            style={{
                              color: "var(--ax-text-subtle, #767676)",
                              fontStyle: "italic",
                              opacity: 0.8,
                            }}
                          >
                            avventer
                          </BodyShort>
                        ) : (
                          <code
                            style={{
                              fontSize: "0.8em",
                              color: "var(--ax-text-subtle, #555)",
                            }}
                          >
                            {r.sed.sedId!.slice(0, 8)}…
                          </code>
                        )}
                      </Table.DataCell>
                    </Table.ExpandableRow>
                  );
                }),
              ])}
            </Table.Body>
          </Table>
        </Box>
      )}

      <Detail style={{ color: "var(--ax-text-subtle, #555)" }}>
        Viser {sorted.length} av maks {MAX_ROWS} SED-er, gruppert per dag.
        Portal-core poller <code>eux-nav-rinasak</code> og oppdaterer via SSE.
        Sendt-status utledes fra <code>sedsendt</code>-hendelser og er beste
        forsøk.
      </Detail>
    </VStack>
  );
}
