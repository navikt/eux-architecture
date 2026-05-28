"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
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

type FlowDirection = "q1-to-q2" | "q2-to-q1";

interface SedPair {
  pairKey: string;
  sedType: string;
  bucType: string;
  rinaSakId: string;
  rinaDokumentId: string;
  dokumentVersjon: string;
  flowDirection: FlowDirection;
  source: SedHendelseRecord | null;
  destination: SedHendelseRecord | null;
  transitTimeMs: number | null;
  status: "complete" | "waiting" | "source-missing";
  newestReceivedAt: string;
}

/* ── Helpers ─────────────────────────────────────────── */

function neessiSakUrl(env: string, rinaSakId: string) {
  return `https://eux-neessi-${env}.intern.dev.nav.no/svarsed/view/sak/${rinaSakId}`;
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

function formatDuration(ms: number): string {
  if (ms < 0) return "–";
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return `${minutes} min ${seconds} s`;
}

function formatAvgDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return `${minutes} min ${seconds} s`;
}

function durationVariant(
  ms: number | null,
): "success" | "info" | "warning" | "error" | "neutral" {
  if (ms === null || ms < 0) return "neutral";
  if (ms < 5000) return "success";
  if (ms < 30_000) return "info";
  if (ms < 120_000) return "warning";
  return "error";
}

function recordKey(r: SedHendelseRecord): string {
  return `${r.topic}|${r.partition}|${r.offset}`;
}

/* ── Pairing logic ──────────────────────────────────── */

function buildPairs(records: SedHendelseRecord[]): SedPair[] {
  const pairable = records.filter(
    (r) => r.hendelse.rinaDokumentId && r.hendelse.rinaDokumentVersjon,
  );

  const groups = new Map<string, SedHendelseRecord[]>();
  for (const r of pairable) {
    const key = `${r.hendelse.rinaDokumentId}|${r.hendelse.rinaDokumentVersjon}`;
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }

  const pairs: SedPair[] = [];
  const byTime = (a: SedHendelseRecord, b: SedHendelseRecord) =>
    new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime();

  for (const [key, recs] of groups) {
    const q1Sendt = recs
      .filter((r) => r.environment === "q1" && r.direction === "sendt")
      .sort(byTime);
    const q1Mottatt = recs
      .filter((r) => r.environment === "q1" && r.direction === "mottatt")
      .sort(byTime);
    const q2Sendt = recs
      .filter((r) => r.environment === "q2" && r.direction === "sendt")
      .sort(byTime);
    const q2Mottatt = recs
      .filter((r) => r.environment === "q2" && r.direction === "mottatt")
      .sort(byTime);

    const firstRecord = recs[0];
    const sedType = firstRecord.hendelse.sedType ?? "–";
    const bucType = firstRecord.hendelse.bucType ?? "–";
    const rinaSakId = firstRecord.hendelse.rinaSakId ?? "";
    const rinaDokumentId = firstRecord.hendelse.rinaDokumentId ?? "";
    const dokumentVersjon = firstRecord.hendelse.rinaDokumentVersjon ?? "";

    // Q1→Q2 pair: q1-sendt as source, q2-mottatt as destination
    const hasQ1ToQ2 = q1Sendt.length > 0 || q2Mottatt.length > 0;
    const isOnlyQ1Internal =
      q1Sendt.length > 0 &&
      q1Mottatt.length > 0 &&
      q2Sendt.length === 0 &&
      q2Mottatt.length === 0;

    if (hasQ1ToQ2 && !isOnlyQ1Internal) {
      const source = q1Sendt[0] ?? null;
      const destination = q2Mottatt[0] ?? null;
      const rawTransit =
        source && destination
          ? new Date(destination.receivedAt).getTime() -
            new Date(source.receivedAt).getTime()
          : null;

      let status: SedPair["status"] = "complete";
      if (!source) status = "source-missing";
      else if (!destination) status = "waiting";

      const newestReceivedAt = [source, destination]
        .filter(Boolean)
        .map((r) => r!.receivedAt)
        .sort()
        .pop()!;

      pairs.push({
        pairKey: `q1q2:${key}`,
        sedType,
        bucType,
        rinaSakId,
        rinaDokumentId,
        dokumentVersjon,
        flowDirection: "q1-to-q2",
        source,
        destination,
        transitTimeMs: rawTransit !== null && rawTransit >= 0 ? rawTransit : null,
        status,
        newestReceivedAt,
      });
    }

    // Q2→Q1 pair: q2-sendt as source, q1-mottatt as destination
    const hasQ2ToQ1 = q2Sendt.length > 0 || q1Mottatt.length > 0;
    const isOnlyQ2Internal =
      q2Sendt.length > 0 &&
      q2Mottatt.length > 0 &&
      q1Sendt.length === 0 &&
      q1Mottatt.length === 0;

    if (hasQ2ToQ1 && !isOnlyQ2Internal) {
      const source = q2Sendt[0] ?? null;
      const destination = q1Mottatt[0] ?? null;
      const rawTransit =
        source && destination
          ? new Date(destination.receivedAt).getTime() -
            new Date(source.receivedAt).getTime()
          : null;

      let status: SedPair["status"] = "complete";
      if (!source) status = "source-missing";
      else if (!destination) status = "waiting";

      const isOnlyQ2Internal2 =
        q2Sendt.length > 0 &&
        q2Mottatt.length > 0 &&
        q1Sendt.length === 0 &&
        q1Mottatt.length === 0;

      if (!isOnlyQ2Internal2) {
        const newestReceivedAt = [source, destination]
          .filter(Boolean)
          .map((r) => r!.receivedAt)
          .sort()
          .pop()!;

        pairs.push({
          pairKey: `q2q1:${key}`,
          sedType,
          bucType,
          rinaSakId,
          rinaDokumentId,
          dokumentVersjon,
          flowDirection: "q2-to-q1",
          source,
          destination,
          transitTimeMs:
            rawTransit !== null && rawTransit >= 0 ? rawTransit : null,
          status,
          newestReceivedAt,
        });
      }
    }
  }

  pairs.sort(
    (a, b) =>
      new Date(b.newestReceivedAt).getTime() -
      new Date(a.newestReceivedAt).getTime(),
  );

  return pairs;
}

/* ── Connection status ──────────────────────────────── */

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

function FlowBadge({ direction }: { direction: FlowDirection }) {
  if (direction === "q1-to-q2") {
    return (
      <Tag size="xsmall" variant="alt1">
        Q1 → Q2
      </Tag>
    );
  }
  return (
    <Tag size="xsmall" variant="alt2">
      Q2 → Q1
    </Tag>
  );
}

function StatusBadge({ status }: { status: SedPair["status"] }) {
  if (status === "complete") {
    return (
      <Tag size="xsmall" variant="success">
        ✓ Komplett
      </Tag>
    );
  }
  if (status === "waiting") {
    return (
      <Tag size="xsmall" variant="warning" className="sed-kobling-pulse">
        ⏳ Venter
      </Tag>
    );
  }
  return (
    <Tag size="xsmall" variant="neutral">
      ◌ Kilde ukjent
    </Tag>
  );
}

/* ── Summary card ───────────────────────────────────── */

function SummaryCard({
  label,
  value,
  detail,
  variant = "neutral",
}: {
  label: string;
  value: string;
  detail?: string;
  variant?: "neutral" | "success" | "info" | "warning";
}) {
  const bgMap: Record<string, string> = {
    neutral: "var(--ax-bg-neutral-soft, #f1f3f5)",
    success: "var(--ax-bg-success-soft, #e0f1e3)",
    info: "var(--ax-bg-info-soft, #e6f0fa)",
    warning: "var(--ax-bg-warning-soft, #fcecd6)",
  };
  return (
    <Box
      padding="space-4"
      borderRadius="8"
      style={{
        background: bgMap[variant],
        border: "1px solid var(--ax-border-subtle, rgba(0,0,0,0.08))",
        minWidth: 140,
      }}
    >
      <VStack gap="space-1">
        <Detail
          style={{
            color: "var(--ax-text-subtle, #555)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            fontWeight: 600,
          }}
        >
          {label}
        </Detail>
        <Heading size="medium" level="3" style={{ margin: 0 }}>
          {value}
        </Heading>
        {detail && (
          <Detail style={{ color: "var(--ax-text-subtle, #555)" }}>
            {detail}
          </Detail>
        )}
      </VStack>
    </Box>
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

/* ── Expanded pair details ──────────────────────────── */

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string;
  mono?: boolean;
}) {
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
            fontFamily: mono
              ? "var(--ax-font-family-mono, ui-monospace, monospace)"
              : undefined,
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

function RecordSection({
  title,
  record,
  env,
}: {
  title: string;
  record: SedHendelseRecord | null;
  env: string;
}) {
  if (!record) {
    return (
      <Box
        padding="space-4"
        borderRadius="4"
        style={{
          background: "var(--ax-bg-warning-soft, #fcecd6)",
          border: "1px dashed var(--ax-border-warning, #c77300)",
        }}
      >
        <VStack gap="space-2">
          <HStack gap="space-2" align="center">
            <Heading size="xsmall" level="4">
              {title}
            </Heading>
            <Tag size="xsmall" variant="neutral">
              {env.toUpperCase()}
            </Tag>
          </HStack>
          <BodyShort
            size="small"
            style={{ color: "var(--ax-text-subtle, #555)" }}
          >
            Ikke registrert i nåværende vindu. Hendelsen kan ha falt ut av
            bufferen eller er ikke mottatt ennå.
          </BodyShort>
        </VStack>
      </Box>
    );
  }

  const h = record.hendelse;
  return (
    <Box
      padding="space-4"
      borderRadius="4"
      style={{
        background: "var(--ax-bg-neutral-soft, #f7f7f7)",
        border: "1px solid var(--ax-border-subtle, rgba(0,0,0,0.08))",
      }}
    >
      <VStack gap="space-4">
        <HStack gap="space-2" align="center">
          <Heading size="xsmall" level="4">
            {title}
          </Heading>
          <Tag size="xsmall" variant="neutral">
            {env.toUpperCase()}
          </Tag>
          <Detail style={{ color: "var(--ax-text-subtle, #555)" }}>
            {formatDateTime(record.receivedAt)}
          </Detail>
        </HStack>

        <HGrid gap="space-4" columns={{ xs: 1, sm: 2, lg: 3 }}>
          <Field label="SED-ID" value={h.sedId} mono />
          <Field label="SED-type" value={h.sedType} />
          <Field label="Sektor" value={h.sektorKode} />
          <Field label="BUC-type" value={h.bucType} />
          <Field label="RINA-dokument-ID" value={h.rinaDokumentId} mono />
          <Field label="Dokumentversjon" value={h.rinaDokumentVersjon} />
          <Field label="RINA-sak" value={h.rinaSakId} mono />
          <Field label="NAV-bruker" value={h.navBruker} mono />
          <Field label="Hendelse-ID" value={h.id} mono />
        </HGrid>

        <HGrid gap="space-4" columns={{ xs: 1, sm: 2 }}>
          <VStack gap="space-2">
            <Label size="small" textColor="subtle">
              Avsender
            </Label>
            <BodyShort size="small">
              {h.avsenderNavn ?? h.avsenderId ?? "–"}
              {h.avsenderLand ? ` (${h.avsenderLand})` : ""}
            </BodyShort>
          </VStack>
          <VStack gap="space-2">
            <Label size="small" textColor="subtle">
              Mottaker
            </Label>
            <BodyShort size="small">
              {h.mottakerNavn ?? h.mottakerId ?? "–"}
              {h.mottakerLand ? ` (${h.mottakerLand})` : ""}
            </BodyShort>
          </VStack>
        </HGrid>

        <HGrid gap="space-4" columns={{ xs: 1, sm: 2, lg: 3 }}>
          <Field label="Topic" value={record.topic} mono />
          <Field label="Partisjon" value={String(record.partition)} />
          <Field label="Offset" value={String(record.offset)} />
          <Field label="Miljø" value={record.environment.toUpperCase()} />
          <Field label="Retning" value={record.direction} />
        </HGrid>
      </VStack>
    </Box>
  );
}

function PairDetails({ pair }: { pair: SedPair }) {
  const sourceLabel =
    pair.flowDirection === "q1-to-q2" ? "Sendt fra Q1" : "Sendt fra Q2";
  const destLabel =
    pair.flowDirection === "q1-to-q2" ? "Mottatt i Q2" : "Mottatt i Q1";
  const sourceEnv = pair.flowDirection === "q1-to-q2" ? "q1" : "q2";
  const destEnv = pair.flowDirection === "q1-to-q2" ? "q2" : "q1";

  return (
    <Box paddingBlock="space-4" paddingInline="space-2">
      <VStack gap="space-4">
        {pair.transitTimeMs !== null && (
          <Box
            padding="space-4"
            borderRadius="4"
            style={{
              background: "var(--ax-bg-success-soft, #e0f1e3)",
              border: "1px solid var(--ax-border-success, #067a3a)",
              textAlign: "center",
            }}
          >
            <Detail style={{ fontWeight: 600 }}>
              Observert transporttid: {formatDuration(pair.transitTimeMs)}
            </Detail>
          </Box>
        )}

        <HGrid gap="space-4" columns={{ xs: 1, lg: 2 }}>
          <RecordSection
            title={sourceLabel}
            record={pair.source}
            env={sourceEnv}
          />
          <RecordSection
            title={destLabel}
            record={pair.destination}
            env={destEnv}
          />
        </HGrid>
      </VStack>
    </Box>
  );
}

/* ── Page component ─────────────────────────────────── */

export default function SedKoblingPage() {
  const [records, setRecords] = useState<SedHendelseRecord[]>([]);
  const [flowFilter, setFlowFilter] = useState<string>("alle");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const seenKeys = useRef(new Set<string>());

  useEffect(() => {
    fetch("/api/kafka/sed-hendelser")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: SedHendelseRecord[]) => {
        const deduped: SedHendelseRecord[] = [];
        for (const r of data) {
          const k = recordKey(r);
          if (!seenKeys.current.has(k)) {
            seenKeys.current.add(k);
            deduped.push(r);
          }
        }
        setRecords(deduped);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message ?? "Kunne ikke hente hendelser");
        setLoading(false);
      });
  }, []);

  const handleNewRecord = useCallback((record: SedHendelseRecord) => {
    const k = recordKey(record);
    if (seenKeys.current.has(k)) return;
    seenKeys.current.add(k);
    setRecords((prev) => [record, ...prev].slice(0, 500));
  }, []);

  const sseStatus = useSedHendelserSSE(handleNewRecord);

  const allPairs = useMemo(() => buildPairs(records), [records]);

  const filteredPairs = useMemo(() => {
    return allPairs.filter((p) => {
      if (flowFilter === "q1-to-q2") return p.flowDirection === "q1-to-q2";
      if (flowFilter === "q2-to-q1") return p.flowDirection === "q2-to-q1";
      if (flowFilter === "venter") return p.status !== "complete";
      return true;
    });
  }, [allPairs, flowFilter]);

  const stats = useMemo(() => {
    const complete = allPairs.filter((p) => p.status === "complete");
    const q1ToQ2 = complete.filter(
      (p) => p.flowDirection === "q1-to-q2" && p.transitTimeMs !== null,
    );
    const q2ToQ1 = complete.filter(
      (p) => p.flowDirection === "q2-to-q1" && p.transitTimeMs !== null,
    );
    const waiting = allPairs.filter((p) => p.status !== "complete");

    const avgQ1Q2 =
      q1ToQ2.length > 0
        ? q1ToQ2.reduce((sum, p) => sum + p.transitTimeMs!, 0) / q1ToQ2.length
        : null;
    const avgQ2Q1 =
      q2ToQ1.length > 0
        ? q2ToQ1.reduce((sum, p) => sum + p.transitTimeMs!, 0) / q2ToQ1.length
        : null;

    return {
      total: allPairs.length,
      complete: complete.length,
      waiting: waiting.length,
      avgQ1Q2,
      avgQ2Q1,
    };
  }, [allPairs]);

  const groups: { key: string; heading: string; rows: SedPair[] }[] = [];
  for (const p of filteredPairs) {
    const key = dayKey(p.newestReceivedAt);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.rows.push(p);
    } else {
      groups.push({
        key,
        heading: formatDayHeading(p.newestReceivedAt),
        rows: [p],
      });
    }
  }

  return (
    <VStack gap="space-6" className="portal-page--wide">
      <Box>
        <HStack gap="space-4" align="center" wrap>
          <Heading size="large" level="1">
            SED-kobling
          </Heading>
          <StatusDot status={sseStatus} />
        </HStack>
        <BodyShort
          style={{ color: "var(--ax-text-subtle, #555)", marginTop: 4 }}
        >
          Kobler SED-hendelser mellom Q1 og Q2 basert på RINA-dokument-ID og
          dokumentversjon. Viser observert transporttid mellom miljøene.
        </BodyShort>
      </Box>

      {!loading && !error && allPairs.length > 0 && (
        <HGrid gap="space-4" columns={{ xs: 2, md: 4 }}>
          <SummaryCard
            label="Totalt par"
            value={String(stats.total)}
            detail={`${stats.complete} komplett`}
          />
          <SummaryCard
            label="Snitt Q1 → Q2"
            value={
              stats.avgQ1Q2 !== null ? formatAvgDuration(stats.avgQ1Q2) : "–"
            }
            detail={
              stats.avgQ1Q2 !== null
                ? `${allPairs.filter((p) => p.flowDirection === "q1-to-q2" && p.transitTimeMs !== null).length} målinger`
                : "Ingen data"
            }
            variant="info"
          />
          <SummaryCard
            label="Snitt Q2 → Q1"
            value={
              stats.avgQ2Q1 !== null ? formatAvgDuration(stats.avgQ2Q1) : "–"
            }
            detail={
              stats.avgQ2Q1 !== null
                ? `${allPairs.filter((p) => p.flowDirection === "q2-to-q1" && p.transitTimeMs !== null).length} målinger`
                : "Ingen data"
            }
            variant="info"
          />
          <SummaryCard
            label="Venter"
            value={String(stats.waiting)}
            detail={stats.waiting === 0 ? "Alt koblet" : "Ufullstendige par"}
            variant={stats.waiting > 0 ? "warning" : "success"}
          />
        </HGrid>
      )}

      <HStack gap="space-4" wrap>
        <ToggleGroup
          size="small"
          value={flowFilter}
          onChange={(v) => setFlowFilter(v)}
          label="Flyt"
        >
          <ToggleGroup.Item value="alle">Alle</ToggleGroup.Item>
          <ToggleGroup.Item value="q1-to-q2">Q1 → Q2</ToggleGroup.Item>
          <ToggleGroup.Item value="q2-to-q1">Q2 → Q1</ToggleGroup.Item>
          <ToggleGroup.Item value="venter">Venter</ToggleGroup.Item>
        </ToggleGroup>
      </HStack>

      {loading ? (
        <HStack justify="center" style={{ padding: "2rem" }}>
          <Loader size="xlarge" />
        </HStack>
      ) : error ? (
        <Alert variant="error" size="small">
          Kunne ikke koble til portal-core: {error}
        </Alert>
      ) : filteredPairs.length === 0 ? (
        <Alert variant="info" size="small">
          {allPairs.length === 0
            ? "Ingen SED-par funnet ennå. Nye par vises automatisk når hendelser med matchende RINA-dokument-ID ankommer begge miljøer."
            : "Ingen par matcher filteret."}
        </Alert>
      ) : (
        <Box
          className="sed-kobling-table"
          style={{
            borderRadius: 8,
            border: "1px solid var(--ax-border-subtle, rgba(0,0,0,0.08))",
          }}
        >
          <Table size="small">
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell />
                <Table.HeaderCell>SED</Table.HeaderCell>
                <Table.HeaderCell>BUC</Table.HeaderCell>
                <Table.HeaderCell>RINA-sak</Table.HeaderCell>
                <Table.HeaderCell>Flyt</Table.HeaderCell>
                <Table.HeaderCell>Sendt</Table.HeaderCell>
                <Table.HeaderCell>Mottatt</Table.HeaderCell>
                <Table.HeaderCell>Transporttid</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
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
                        {group.rows.length === 1 ? "par" : "par"}
                      </Detail>
                    </HStack>
                  </Table.DataCell>
                </Table.Row>,
                ...group.rows.map((pair) => {
                  const rowClass =
                    pair.status === "waiting"
                      ? "sed-kobling-row sed-kobling-row--waiting"
                      : pair.status === "source-missing"
                        ? "sed-kobling-row sed-kobling-row--missing"
                        : "sed-kobling-row";

                  return (
                    <Table.ExpandableRow
                      key={pair.pairKey}
                      expandOnRowClick
                      content={<PairDetails pair={pair} />}
                      className={rowClass}
                    >
                      <Table.DataCell>
                        <strong>{pair.sedType}</strong>
                      </Table.DataCell>
                      <Table.DataCell>{pair.bucType}</Table.DataCell>
                      <Table.DataCell>
                        {pair.rinaSakId ? (
                          <DsLink
                            href={neessiSakUrl(
                              pair.source?.environment ??
                                pair.destination?.environment ??
                                "q1",
                              pair.rinaSakId,
                            )}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {pair.rinaSakId}
                            <span
                              aria-hidden="true"
                              style={{
                                marginLeft: 4,
                                opacity: 0.6,
                                fontSize: "0.85em",
                              }}
                            >
                              ↗
                            </span>
                          </DsLink>
                        ) : (
                          "–"
                        )}
                      </Table.DataCell>
                      <Table.DataCell>
                        <FlowBadge direction={pair.flowDirection} />
                      </Table.DataCell>
                      <Table.DataCell>
                        {pair.source ? (
                          <Detail>
                            <strong>{formatTime(pair.source.receivedAt)}</strong>
                            <span
                              style={{
                                marginLeft: 4,
                                opacity: 0.6,
                              }}
                            >
                              {pair.source.environment.toUpperCase()}
                            </span>
                          </Detail>
                        ) : (
                          <Detail
                            style={{ color: "var(--ax-text-subtle, #555)" }}
                          >
                            Ikke i vindu
                          </Detail>
                        )}
                      </Table.DataCell>
                      <Table.DataCell>
                        {pair.destination ? (
                          <Detail>
                            <strong>
                              {formatTime(pair.destination.receivedAt)}
                            </strong>
                            <span
                              style={{
                                marginLeft: 4,
                                opacity: 0.6,
                              }}
                            >
                              {pair.destination.environment.toUpperCase()}
                            </span>
                          </Detail>
                        ) : (
                          <Detail className="sed-kobling-waiting-text">
                            ⏳ Venter …
                          </Detail>
                        )}
                      </Table.DataCell>
                      <Table.DataCell>
                        {pair.transitTimeMs !== null ? (
                          <Tag
                            size="xsmall"
                            variant={durationVariant(pair.transitTimeMs)}
                          >
                            {formatDuration(pair.transitTimeMs)}
                          </Tag>
                        ) : (
                          <Detail
                            style={{ color: "var(--ax-text-subtle, #555)" }}
                          >
                            –
                          </Detail>
                        )}
                      </Table.DataCell>
                      <Table.DataCell>
                        <StatusBadge status={pair.status} />
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
        Viser {filteredPairs.length} par (av {allPairs.length} totalt). Par
        kobles basert på matchende RINA-dokument-ID og dokumentversjon.
        Transporttid er observert tid mellom Kafka-hendelser.
      </Detail>
    </VStack>
  );
}
