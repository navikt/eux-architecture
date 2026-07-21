import { HStack, Detail } from "@navikt/ds-react";

/** Live-connection state shared by the SSE-backed monitor pages. */
export type ConnectionStatus = "connecting" | "connected" | "disconnected";

const COLORS: Record<ConnectionStatus, string> = {
  connecting: "var(--ax-text-warning, #c77300)",
  connected: "var(--ax-text-success, #067a3a)",
  disconnected: "var(--ax-text-danger, #ba3a26)",
};

const LABELS: Record<ConnectionStatus, string> = {
  connecting: "Kobler til …",
  connected: "Live",
  disconnected: "Frakoblet",
};

/** A small coloured dot + label reflecting the SSE connection state. */
export function StatusDot({ status }: { status: ConnectionStatus }) {
  return (
    <HStack gap="space-1" align="center">
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: COLORS[status],
          display: "inline-block",
        }}
      />
      <Detail style={{ color: COLORS[status] }}>{LABELS[status]}</Detail>
    </HStack>
  );
}
