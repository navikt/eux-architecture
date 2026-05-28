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
  Tag,
  Alert,
  Detail,
  Label,
  Loader,
  CopyButton,
  Link as DsLink,
} from "@navikt/ds-react";

/* ── Types ─────────────────────────────────────────── */

interface SedHendelse {
  id?: string;
  sedId?: string;
  sektorKode?: string;
  bucType?: string;
  rinaSakId?: string;
  avsenderId?: string;
  avsenderNavn?: string;
  avsenderLand?: string;
  mottakerId?: string;
  mottakerNavn?: string;
  mottakerLand?: string;
  rinaDokumentId?: string;
  rinaDokumentVersjon?: string;
  sedType?: string;
  navBruker?: string;
}

interface SedHendelseRecord {
  hendelse: SedHendelse;
  topic: string;
  environment: string;
  direction: string;
  receivedAt: string;
  offset: number;
  partition: number;
}

/* ── Neessi deep link ──────────────────────────────── */

function neessiSakUrl(env: string, rinaSakId: string) {
  return `https://eux-neessi-${env}.intern.dev.nav.no/svarsed/view/sak/${rinaSakId}`;
}

/* ── Helpers ─────────────────────────────────────────── */

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("nb-NO", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

/**
 * Trims `text` to at most `max` characters. Short values like
 * "NAV ACC 06" pass through untouched; long values like
 * "National Social Security Office (NSSO) - LA" get an ellipsis.
 * The full text remains accessible via the title attribute on the cell.
 */
function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("nb-NO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatDayHeading(iso: string) {
  try {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const sameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
    const formatted = d.toLocaleDateString("nb-NO", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    if (sameDay(d, today)) return `I dag · ${formatted}`;
    if (sameDay(d, yesterday)) return `I går · ${formatted}`;
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  } catch {
    return iso;
  }
}

function dayKey(iso: string) {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return iso;
  }
}

/* ── Pair-highlight ─────────────────────────────────── */

/**
 * Light pastel palette used to colour paired SED events. Hues are spread
 * around the wheel so two adjacent palette slots are easy to tell apart, and
 * lightness/saturation are chosen so dark text (#1a1a1a) keeps a contrast
 * ratio well above 7:1 on every tint.
 */
const PAIR_PALETTE = [
  "#fbcfe8", // pink
  "#ddd6fe", // lavender
  "#bfdbfe", // blue
  "#a7f3d0", // mint
  "#fde68a", // amber
  "#fecaca", // rose
  "#c7d2fe", // periwinkle
  "#bbf7d0", // green
  "#fed7aa", // peach
  "#e9d5ff", // purple
] as const;

const HIGHLIGHT_WINDOW_MS = 60 * 1000;
const FLASH_DURATION_MS = 1100;
const TICK_MS = 3000;

/** Stable string → 32-bit hash (FNV-1a-ish), used to pick a palette slot. */
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Returns the pair-key for a record. Two records share a key iff they
 * represent the same RINA document revision (typical Q1→Q2 round-trip).
 * If the document fields are missing we fall back to a per-record key so the
 * row still gets its own colour but never accidentally pairs with another.
 */
function pairKey(r: SedHendelseRecord): string {
  const docId = r.hendelse.rinaDokumentId;
  const docVer = r.hendelse.rinaDokumentVersjon;
  if (docId && docVer) return `doc:${docId}|${docVer}`;
  return `rec:${r.topic}|${r.partition}|${r.offset}`;
}

/** Unique key for a single record (used as Map key for first-seen / render). */
function recordKey(r: SedHendelseRecord): string {
  return `${r.topic}|${r.partition}|${r.offset}`;
}

/** Eased alpha: starts vivid, fades to 0 at 1 min. */
function tintAlpha(ageMs: number): number {
  if (ageMs <= 0) return 1;
  if (ageMs >= HIGHLIGHT_WINDOW_MS) return 0;
  const remaining = 1 - ageMs / HIGHLIGHT_WINDOW_MS;
  return Math.pow(remaining, 0.7);
}

interface RowTint {
  color: string;
  alpha: number;
  flash: boolean;
}

/**
 * Computes per-row tint info for the visible records.
 *
 * - Each pair gets one palette colour, chosen deterministically from the
 *   pair key so the same pair always uses the same colour across reloads.
 * - The pair's tint alpha is driven by the *newest* member's age, so when a
 *   fresh partner arrives the older partner re-lights with it (the "pair
 *   exception" in the spec).
 * - A row's `flash` flag is set for the first ~1.1s after it was first
 *   observed on the client. Backfilled rows are seeded with their original
 *   `receivedAt`, so the page does NOT flash everything on load.
 */
function computePairTints(
  records: SedHendelseRecord[],
  firstSeenAt: Map<string, number>,
  now: number,
): Map<string, RowTint> {
  const newestByPair = new Map<string, number>();
  for (const r of records) {
    const t = new Date(r.receivedAt).getTime();
    const k = pairKey(r);
    const prev = newestByPair.get(k);
    if (prev === undefined || t > prev) newestByPair.set(k, t);
  }

  const out = new Map<string, RowTint>();
  for (const r of records) {
    const k = pairKey(r);
    const newest = newestByPair.get(k) ?? 0;
    const age = now - newest;
    const alpha = tintAlpha(age);
    if (alpha <= 0) continue;

    const color = PAIR_PALETTE[hashString(k) % PAIR_PALETTE.length];
    const rk = recordKey(r);
    const firstSeen = firstSeenAt.get(rk);
    const flash =
      firstSeen !== undefined && now - firstSeen < FLASH_DURATION_MS;
    out.set(rk, { color, alpha, flash });
  }
  return out;
}

/* ── Connection status indicator ────────────────────── */

type ConnectionStatus = "connecting" | "connected" | "disconnected";

function StatusDot({ status }: { status: ConnectionStatus }) {
  const colors: Record<ConnectionStatus, string> = {
    connecting: "#c77300",
    connected: "#067a3a",
    disconnected: "#ba3a26",
  };
  const labels: Record<ConnectionStatus, string> = {
    connecting: "Kobler til …",
    connected: "Live",
    disconnected: "Frakoblet",
  };
  return (
    <HStack gap="space-1" align="center">
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: colors[status],
          display: "inline-block",
        }}
      />
      <Detail style={{ color: colors[status] }}>{labels[status]}</Detail>
    </HStack>
  );
}

/* ── Direction badge ────────────────────────────────── */

function DirectionBadge({ direction }: { direction: string }) {
  if (direction === "mottatt") {
    return (
      <Tag size="xsmall" variant="alt1">
        ↓ Mottatt
      </Tag>
    );
  }
  return (
    <Tag size="xsmall" variant="alt2">
      ↑ Sendt
    </Tag>
  );
}

/* ── Environment badge ──────────────────────────────── */

function EnvBadge({ env }: { env: string }) {
  return (
    <Tag size="xsmall" variant="neutral">
      {env.toUpperCase()}
    </Tag>
  );
}

/* ── SSE hook ───────────────────────────────────────── */

function useSedHendelserSSE(onMessage: (record: SedHendelseRecord) => void) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  });

  useEffect(() => {
    let source: EventSource | null = null;
    let closed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      if (closed) return;
      setStatus("connecting");
      source = new EventSource("/api/kafka/sed-hendelser/stream");

      source.addEventListener("sed-hendelse", (e) => {
        try {
          const record = JSON.parse(e.data) as SedHendelseRecord;
          onMessageRef.current(record);
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
          reconnectTimer = setTimeout(connect, 5000);
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

/* ── Expanded row details ───────────────────────────── */

function Field({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  const display = value && value.length > 0 ? value : "–";
  const hasValue = Boolean(value);
  return (
    <VStack gap="space-1">
      <Label size="small" textColor="subtle">
        {label}
      </Label>
      <HStack gap="space-1" align="center" wrap={false}>
        <BodyShort
          size="small"
          style={{
            fontFamily: mono ? "var(--ax-font-family-mono, ui-monospace, monospace)" : undefined,
            wordBreak: "break-all",
          }}
        >
          {display}
        </BodyShort>
        {hasValue && (
          <CopyButton
            size="xsmall"
            copyText={value!}
            variant="action"
            title={`Kopier ${label.toLowerCase()}`}
          />
        )}
      </HStack>
    </VStack>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <VStack gap="space-2">
      <Heading size="xsmall" level="3">
        {title}
      </Heading>
      <HGrid gap="space-4" columns={{ xs: 1, sm: 2, lg: 3 }}>
        {children}
      </HGrid>
    </VStack>
  );
}

function HendelseDetails({ record }: { record: SedHendelseRecord }) {
  const h = record.hendelse;
  return (
    <Box paddingBlock="space-4" paddingInline="space-2">
      <VStack gap="space-6">
        <Section title="SED">
          <Field label="SED-ID" value={h.sedId} mono />
          <Field label="SED-type" value={h.sedType} />
          <Field label="Sektor" value={h.sektorKode} />
          <Field label="BUC-type" value={h.bucType} />
          <Field label="Hendelse-ID" value={h.id} mono />
          <Field label="RINA-dokument-ID" value={h.rinaDokumentId} mono />
          <Field label="Dokumentversjon" value={h.rinaDokumentVersjon} />
        </Section>

        <Section title="Sak og bruker">
          <Field label="RINA-sak" value={h.rinaSakId} mono />
          <Field label="NAV-bruker" value={h.navBruker} mono />
        </Section>

        <Section title="Avsender">
          <Field label="Navn" value={h.avsenderNavn} />
          <Field label="ID" value={h.avsenderId} mono />
          <Field label="Land" value={h.avsenderLand} />
        </Section>

        <Section title="Mottaker">
          <Field label="Navn" value={h.mottakerNavn} />
          <Field label="ID" value={h.mottakerId} mono />
          <Field label="Land" value={h.mottakerLand} />
        </Section>

        <Section title="Kafka-metadata">
          <Field label="Topic" value={record.topic} mono />
          <Field label="Partisjon" value={String(record.partition)} />
          <Field label="Offset" value={String(record.offset)} />
          <Field label="Mottatt" value={formatDateTime(record.receivedAt)} />
          <Field label="Miljø" value={record.environment.toUpperCase()} />
          <Field label="Retning" value={record.direction} />
        </Section>
      </VStack>
    </Box>
  );
}

/* ── Page component ─────────────────────────────────── */

export default function SedHendelserPage() {
  const [records, setRecords] = useState<SedHendelseRecord[]>([]);
  const [envFilter, setEnvFilter] = useState<string>("alle");
  const [dirFilter, setDirFilter] = useState<string>("alle");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Wall-clock timestamp (ms) when each record was first observed in this
  // browser session. Backfilled rows use their original receivedAt so they
  // do NOT flash on page load; SSE-pushed rows use Date.now() so they do.
  const [firstSeenAt, setFirstSeenAt] = useState<Map<string, number>>(
    () => new Map(),
  );

  // Tick state — bumped every TICK_MS so tint alphas re-compute and the
  // flash class falls off after ~1.1s. The CSS `transition` smooths between
  // ticks so the visible fade is continuous, not stepped.
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  // Fetch initial snapshot
  useEffect(() => {
    fetch("/api/kafka/sed-hendelser")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: SedHendelseRecord[]) => {
        setFirstSeenAt((prev) => {
          const next = new Map(prev);
          for (const r of data) {
            const k = recordKey(r);
            if (!next.has(k)) next.set(k, new Date(r.receivedAt).getTime());
          }
          return next;
        });
        setRecords(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message ?? "Kunne ikke hente hendelser");
        setLoading(false);
      });
  }, []);

  // Live SSE updates
  const handleNewRecord = useCallback((record: SedHendelseRecord) => {
    const k = recordKey(record);
    setFirstSeenAt((prev) => {
      if (prev.has(k)) return prev;
      const next = new Map(prev);
      next.set(k, Date.now());
      return next;
    });
    setRecords((prev) => [record, ...prev].slice(0, 500));
  }, []);

  const sseStatus = useSedHendelserSSE(handleNewRecord);

  // Pair-tint info is computed against *all* records (pre-filter) so the
  // colour for a given pair stays stable when the user toggles env/dir
  // filters. The render below looks up the tint by record key.
  const tints = computePairTints(records, firstSeenAt, now);

  // Filter
  const filtered = records.filter((r) => {
    if (envFilter !== "alle" && r.environment !== envFilter) return false;
    if (dirFilter !== "alle" && r.direction !== dirFilter) return false;
    return true;
  });

  // Sort newest first by receivedAt. This guarantees correct ordering
  // both for live SSE updates and for the startup backfill (where records
  // from multiple topics may arrive interleaved into the backend store).
  const sorted = [...filtered].sort(
    (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
  );

  // Group into one table per day, preserving the sorted (newest-first) order.
  const groups: { key: string; heading: string; rows: SedHendelseRecord[] }[] = [];
  for (const r of sorted) {
    const key = dayKey(r.receivedAt);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.rows.push(r);
    } else {
      groups.push({ key, heading: formatDayHeading(r.receivedAt), rows: [r] });
    }
  }

  return (
    <VStack gap="space-6" className="portal-page--wide">
      <Box>
        <HStack gap="space-4" align="center" wrap>
          <Heading size="large" level="1">
            SED-hendelser
          </Heading>
          <StatusDot status={sseStatus} />
        </HStack>
        <BodyShort style={{ color: "var(--ax-text-subtle, #555)", marginTop: 4 }}>
          Sanntidsmonitor for Kafka-meldinger på <code>sedmottatt</code> og{" "}
          <code>sedsendt</code> i Q1 og Q2.
        </BodyShort>
      </Box>

      {/* Filters */}
      <HStack gap="space-4" wrap>
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
          value={dirFilter}
          onChange={(v) => setDirFilter(v)}
          label="Retning"
        >
          <ToggleGroup.Item value="alle">Alle</ToggleGroup.Item>
          <ToggleGroup.Item value="mottatt">Mottatt</ToggleGroup.Item>
          <ToggleGroup.Item value="sendt">Sendt</ToggleGroup.Item>
        </ToggleGroup>
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
          Ingen SED-hendelser mottatt ennå. Nye meldinger vises automatisk.
        </Alert>
      ) : (
        <Box
          className="sed-hendelser-table"
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
                <Table.HeaderCell>Retning</Table.HeaderCell>
                <Table.HeaderCell>SED-type</Table.HeaderCell>
                <Table.HeaderCell>BUC-type</Table.HeaderCell>
                <Table.HeaderCell>RINA-sak</Table.HeaderCell>
                <Table.HeaderCell>Avsender</Table.HeaderCell>
                <Table.HeaderCell>Mottaker</Table.HeaderCell>
                <Table.HeaderCell>Bruker</Table.HeaderCell>
                <Table.HeaderCell>SED-ID</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {groups.flatMap((group) => [
                <Table.Row key={`day-${group.key}`}>
                  <Table.DataCell
                    colSpan={11}
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
                        {group.rows.length === 1 ? "hendelse" : "hendelser"}
                      </Detail>
                    </HStack>
                  </Table.DataCell>
                </Table.Row>,
                ...group.rows.map((r, i) => {
                  const tint = tints.get(recordKey(r));
                  const tintClass = tint
                    ? tint.flash
                      ? "sed-tint sed-tint--flash"
                      : "sed-tint"
                    : undefined;
                  const tintStyle = tint
                    ? ({
                        "--row-tint": tint.color,
                        "--row-tint-alpha": tint.alpha,
                      } as React.CSSProperties)
                    : undefined;
                  return (
                    <Table.ExpandableRow
                      key={`${r.topic}-${r.partition}-${r.offset}-${i}`}
                      expandOnRowClick
                      content={<HendelseDetails record={r} />}
                      className={tintClass}
                      style={tintStyle}
                    >
                    <Table.DataCell>
                      <Detail>
                        <strong>{formatTime(r.receivedAt)}</strong>
                      </Detail>
                    </Table.DataCell>
                    <Table.DataCell>
                      <EnvBadge env={r.environment} />
                    </Table.DataCell>
                    <Table.DataCell>
                      <DirectionBadge direction={r.direction} />
                    </Table.DataCell>
                    <Table.DataCell>
                      <strong>{r.hendelse.sedType ?? "–"}</strong>
                    </Table.DataCell>
                    <Table.DataCell>{r.hendelse.bucType ?? "–"}</Table.DataCell>
                    <Table.DataCell>
                      {r.hendelse.rinaSakId ? (
                        <DsLink
                          href={neessiSakUrl(r.environment, r.hendelse.rinaSakId)}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {r.hendelse.rinaSakId}
                          <span
                            aria-hidden="true"
                            style={{ marginLeft: 4, opacity: 0.6, fontSize: "0.85em" }}
                          >
                            ↗
                          </span>
                        </DsLink>
                      ) : (
                        "–"
                      )}
                    </Table.DataCell>
                    <Table.DataCell>
                      {(() => {
                        const name = r.hendelse.avsenderNavn ?? r.hendelse.avsenderId ?? "–";
                        const fullTitle = [name, r.hendelse.avsenderId, r.hendelse.avsenderLand]
                          .filter(Boolean)
                          .join(" · ");
                        return (
                          <span title={fullTitle} style={{ whiteSpace: "nowrap" }}>
                            {truncate(name, 18)}
                            {r.hendelse.avsenderLand && (
                              <Detail as="span" style={{ marginLeft: 4 }}>
                                ({r.hendelse.avsenderLand})
                              </Detail>
                            )}
                          </span>
                        );
                      })()}
                    </Table.DataCell>
                    <Table.DataCell>
                      {(() => {
                        const name = r.hendelse.mottakerNavn ?? r.hendelse.mottakerId ?? "–";
                        const fullTitle = [name, r.hendelse.mottakerId, r.hendelse.mottakerLand]
                          .filter(Boolean)
                          .join(" · ");
                        return (
                          <span title={fullTitle} style={{ whiteSpace: "nowrap" }}>
                            {truncate(name, 18)}
                            {r.hendelse.mottakerLand && (
                              <Detail as="span" style={{ marginLeft: 4 }}>
                                ({r.hendelse.mottakerLand})
                              </Detail>
                            )}
                          </span>
                        );
                      })()}
                    </Table.DataCell>
                    <Table.DataCell>
                      {r.hendelse.navBruker ?? "–"}
                    </Table.DataCell>
                    <Table.DataCell>
                      <code style={{ fontSize: "0.85em" }}>
                        {r.hendelse.sedId ?? "–"}
                      </code>
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
        Viser {sorted.length} av maks 500 hendelser, gruppert per dag. Oppdateres
        automatisk via SSE.
      </Detail>
    </VStack>
  );
}
