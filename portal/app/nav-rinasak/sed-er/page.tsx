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
  sedId: string;
  sedVersjon: number;
  sedType: string;
  dokumentInfoId?: string;
  opprettetBruker?: string;
  opprettetTidspunkt?: string;
  navRinasakOpprettetBruker?: string;
  navRinasakOpprettetTidspunkt?: string;
  fagsak?: FagsakInfo;
  initiellFagsak?: InitiellFagsakInfo;
}

type SentStatus = "SENDT" | "IKKE_SENDT" | "UKJENT";

interface NavRinasakSedRecord {
  sed: NavRinasakSed;
  environment: string;
  receivedAt: string;
  sentStatus: SentStatus;
}

/* ── Neessi deep link ──────────────────────────────── */

function neessiSakUrl(env: string, rinasakId: number | string) {
  return `https://eux-neessi-${env}.intern.dev.nav.no/svarsed/view/sak/${rinasakId}`;
}

/* ── Helpers ─────────────────────────────────────────── */

/** Business time of a SED: when it was created in nEESSI. */
function sedTime(r: NavRinasakSedRecord): string {
  return (
    r.sed.opprettetTidspunkt ??
    r.sed.navRinasakOpprettetTidspunkt ??
    r.receivedAt
  );
}

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

function formatDateTime(iso?: string) {
  if (!iso) return "–";
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

function isToday(iso: string) {
  try {
    const d = new Date(iso);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  } catch {
    return false;
  }
}

/** Unique key for a single created SED (env + sedId + version). */
function recordKey(r: NavRinasakSedRecord): string {
  return `${r.environment}|${r.sed.sedId}|${r.sed.sedVersjon}`;
}

/* ── Flash / tint constants ─────────────────────────── */

const HIGHLIGHT_WINDOW_MS = 60 * 1000;
const FLASH_DURATION_MS = 1100;
const SENT_FLASH_MS = 1600;
const TICK_MS = 3000;
const CREATED_TINT = "#a7f3d0"; // mint — "created in nEESSI"

/** Eased alpha: starts vivid, fades to 0 at 1 min. */
function tintAlpha(ageMs: number): number {
  if (ageMs <= 0) return 1;
  if (ageMs >= HIGHLIGHT_WINDOW_MS) return 0;
  const remaining = 1 - ageMs / HIGHLIGHT_WINDOW_MS;
  return Math.pow(remaining, 0.7);
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
      <Tag size="xsmall" variant="success">
        ✓ Sendt
      </Tag>
    );
  }
  if (status === "IKKE_SENDT") {
    return (
      <Tag size="xsmall" variant="warning">
        ● Ikke sendt
      </Tag>
    );
  }
  return (
    <Tag size="xsmall" variant="neutral">
      Ukjent
    </Tag>
  );
}

/* ── SSE hook ───────────────────────────────────────── */

function useNavRinasakSSE(
  onCreated: (record: NavRinasakSedRecord) => void,
  onStatus: (record: NavRinasakSedRecord) => void,
) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const onCreatedRef = useRef(onCreated);
  const onStatusRef = useRef(onStatus);

  useEffect(() => {
    onCreatedRef.current = onCreated;
    onStatusRef.current = onStatus;
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

function SedDetails({ record }: { record: NavRinasakSedRecord }) {
  const s = record.sed;
  const f = s.fagsak;
  const inf = s.initiellFagsak;
  return (
    <Box paddingBlock="space-4" paddingInline="space-2">
      <VStack gap="space-6">
        <Section title="SED">
          <Field label="SED-type" value={s.sedType} />
          <Field label="SED-ID (setId i RINA)" value={s.sedId} mono />
          <Field label="SED-versjon" value={String(s.sedVersjon)} />
          <Field label="Dokument-info-ID" value={s.dokumentInfoId} mono />
          <Field label="Opprettet av" value={s.opprettetBruker} />
          <Field label="Opprettet" value={formatDateTime(s.opprettetTidspunkt)} />
        </Section>

        <Section title="RINA-sak">
          <Field label="RINA-sak-ID" value={String(s.rinasakId)} mono />
          <Field label="Overstyrt enhet" value={s.overstyrtEnhetsnummer} />
          <Field label="Opprettet av (sak)" value={s.navRinasakOpprettetBruker} />
          <Field label="Opprettet (sak)" value={formatDateTime(s.navRinasakOpprettetTidspunkt)} />
        </Section>

        {f && (
          <Section title="Fagsak">
            <Field label="Tema" value={f.tema} />
            <Field label="Type" value={f.type} />
            <Field label="System" value={f.system} />
            <Field label="Fagsaknr" value={f.nr} mono />
            <Field label="Fnr" value={f.fnr} mono />
            <Field label="Opprettet" value={formatDateTime(f.opprettetTidspunkt)} />
            <Field label="Endret" value={formatDateTime(f.endretTidspunkt)} />
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
            <Field label="Opprettet" value={formatDateTime(inf.opprettetTidspunkt)} />
          </Section>
        )}

        <Section title="Status og lenker">
          <Field label="Miljø" value={record.environment.toUpperCase()} />
          <Field
            label="Sendt-status"
            value={
              record.sentStatus === "SENDT"
                ? "Sendt"
                : record.sentStatus === "IKKE_SENDT"
                  ? "Ikke sendt"
                  : "Ukjent"
            }
          />
          <Field label="Observert av portal" value={formatDateTime(record.receivedAt)} />
          <VStack gap="space-1">
            <Label size="small" textColor="subtle">
              Åpne i nEESSI
            </Label>
            <DsLink
              href={neessiSakUrl(record.environment, s.rinasakId)}
              target="_blank"
              rel="noreferrer"
            >
              Sak {s.rinasakId} ({record.environment.toUpperCase()})
              <span aria-hidden="true" style={{ marginLeft: 4, opacity: 0.6 }}>
                ↗
              </span>
            </DsLink>
          </VStack>
        </Section>
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
            if (!next.has(k)) next.set(k, new Date(sedTime(r)).getTime());
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
      return next;
    });
    setRecords((prev) => {
      if (prev.some((r) => recordKey(r) === k)) return prev;
      return [record, ...prev].slice(0, 500);
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

  const sseStatus = useNavRinasakSSE(handleCreated, handleStatus);

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
  const sorted = [...filtered].sort(
    (a, b) => new Date(sedTime(b)).getTime() - new Date(sedTime(a)).getTime(),
  );

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
        <BodyShort style={{ color: "var(--ax-text-subtle, #555)", marginTop: 4 }}>
          Sanntidsmonitor for SED-er som er <strong>opprettet i nEESSI</strong> og
          har fått en journal i <code>eux-nav-rinasak</code> — med fokus på SED-er
          som er opprettet, men <strong>ikke sendt ennå</strong>. Q1 og Q2.
        </BodyShort>
      </Box>

      {/* Stats */}
      <HStack gap="space-4" wrap>
        <Box
          style={{
            borderRadius: 8,
            padding: "0.75rem 1rem",
            border: "1px solid var(--ax-border-subtle, rgba(0,0,0,0.08))",
            minWidth: 140,
          }}
        >
          <Detail style={{ color: "var(--ax-text-subtle, #555)" }}>Opprettet i dag</Detail>
          <Heading size="medium" level="2">
            {antallIDag}
          </Heading>
        </Box>
        <Box
          style={{
            borderRadius: 8,
            padding: "0.75rem 1rem",
            border: "1px solid var(--ax-border-warning, rgba(199,115,0,0.4))",
            background: "var(--ax-bg-warning-soft, #fef5e7)",
            minWidth: 140,
          }}
        >
          <Detail style={{ color: "var(--ax-text-warning, #a06a00)" }}>Ikke sendt</Detail>
          <Heading size="medium" level="2">
            {antallIkkeSendt}
          </Heading>
        </Box>
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
                        <strong>{r.sed.sedType ?? "–"}</strong>
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
                      <Table.DataCell>{fagsakTema ?? "–"}</Table.DataCell>
                      <Table.DataCell>
                        {r.sed.opprettetBruker ?? r.sed.navRinasakOpprettetBruker ?? "–"}
                      </Table.DataCell>
                      <Table.DataCell>
                        <SentStatusTag status={r.sentStatus} />
                      </Table.DataCell>
                      <Table.DataCell>
                        <code style={{ fontSize: "0.8em" }}>
                          {r.sed.sedId.slice(0, 8)}…
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
        Viser {sorted.length} av maks 500 SED-er, gruppert per dag. Portal-core
        poller <code>eux-nav-rinasak</code> og oppdaterer via SSE. Sendt-status
        utledes fra <code>sedsendt</code>-hendelser og er beste forsøk.
      </Detail>
    </VStack>
  );
}
