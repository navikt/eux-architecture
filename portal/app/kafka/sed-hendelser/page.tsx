"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Heading,
  BodyShort,
  Box,
  VStack,
  HStack,
  Table,
  ToggleGroup,
  Tag,
  Alert,
  Detail,
  Loader,
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

/* ── Helpers ────────────────────────────────────────── */

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

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("nb-NO", {
      day: "2-digit",
      month: "2-digit",
    });
  } catch {
    return "";
  }
}

function maskFnr(value: string | undefined): string {
  if (!value) return "–";
  if (value.length >= 6) return "••••••" + value.slice(6);
  return "••••••";
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

/* ── Page component ─────────────────────────────────── */

export default function SedHendelserPage() {
  const [records, setRecords] = useState<SedHendelseRecord[]>([]);
  const [envFilter, setEnvFilter] = useState<string>("alle");
  const [dirFilter, setDirFilter] = useState<string>("alle");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial snapshot
  useEffect(() => {
    fetch("/api/kafka/sed-hendelser")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: SedHendelseRecord[]) => {
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
    setRecords((prev) => [record, ...prev].slice(0, 500));
  }, []);

  const sseStatus = useSedHendelserSSE(handleNewRecord);

  // Filter
  const filtered = records.filter((r) => {
    if (envFilter !== "alle" && r.environment !== envFilter) return false;
    if (dirFilter !== "alle" && r.direction !== dirFilter) return false;
    return true;
  });

  return (
    <VStack gap="space-6">
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
      ) : filtered.length === 0 ? (
        <Alert variant="info" size="small">
          Ingen SED-hendelser mottatt ennå. Nye meldinger vises automatisk.
        </Alert>
      ) : (
        <Box
          style={{
            overflowX: "auto",
            borderRadius: 8,
            border: "1px solid var(--ax-border-subtle, rgba(0,0,0,0.08))",
          }}
        >
          <Table size="small" zebraStripes>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Tid</Table.HeaderCell>
                <Table.HeaderCell>Miljø</Table.HeaderCell>
                <Table.HeaderCell>Retning</Table.HeaderCell>
                <Table.HeaderCell>SED-type</Table.HeaderCell>
                <Table.HeaderCell>BUC-type</Table.HeaderCell>
                <Table.HeaderCell>RINA-sak</Table.HeaderCell>
                <Table.HeaderCell>Avsender</Table.HeaderCell>
                <Table.HeaderCell>Mottaker</Table.HeaderCell>
                <Table.HeaderCell>Bruker</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {filtered.map((r, i) => (
                <Table.Row key={`${r.topic}-${r.partition}-${r.offset}-${i}`}>
                  <Table.DataCell>
                    <Detail>
                      {formatDate(r.receivedAt)}{" "}
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
                    <span title={r.hendelse.avsenderId ?? ""}>
                      {r.hendelse.avsenderNavn ?? r.hendelse.avsenderId ?? "–"}
                      {r.hendelse.avsenderLand && (
                        <Detail as="span" style={{ marginLeft: 4 }}>
                          ({r.hendelse.avsenderLand})
                        </Detail>
                      )}
                    </span>
                  </Table.DataCell>
                  <Table.DataCell>
                    <span title={r.hendelse.mottakerId ?? ""}>
                      {r.hendelse.mottakerNavn ?? r.hendelse.mottakerId ?? "–"}
                      {r.hendelse.mottakerLand && (
                        <Detail as="span" style={{ marginLeft: 4 }}>
                          ({r.hendelse.mottakerLand})
                        </Detail>
                      )}
                    </span>
                  </Table.DataCell>
                  <Table.DataCell>
                    {maskFnr(r.hendelse.navBruker)}
                  </Table.DataCell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </Box>
      )}

      <Detail style={{ color: "var(--ax-text-subtle, #555)" }}>
        Viser siste {filtered.length} av maks 500 hendelser. Oppdateres automatisk via
        SSE.
      </Detail>
    </VStack>
  );
}
