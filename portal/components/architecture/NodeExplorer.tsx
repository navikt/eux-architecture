"use client";

import { BodyLong, BodyShort, Button, Detail, Heading, HStack, Link as DsLink, Tag } from "@navikt/ds-react";
import { ExternalLinkIcon } from "@navikt/aksel-icons";
import {
  KIND_COLOR,
  NODE_BY_ID,
  ZONE_LABEL,
  edgeLabel,
  incoming,
  outgoing,
  type ArchEdge,
  type EdgeKind,
} from "./data";

const QUICK_PICKS = ["eux-rina-api", "eux-neessi", "eux-legacy-rina-events", "eux-avslutt-rinasaker", "sedmottatt-v1", "pdl"];

const KIND_ORDER: Record<EdgeKind, number> = { cron: 0, event: 1, rest: 2 };

const COUNT_LABEL: Record<EdgeKind, (n: number) => string> = {
  rest: () => "REST-kall",
  event: (n) => (n === 1 ? "hendelsesstrøm" : "hendelsesstrømmer"),
  cron: (n) => (n === 1 ? "planlagt kjøring" : "planlagte kjøringer"),
};
const KIND_RANK: Record<string, number> = { app: 0, job: 0, topic: 1, team: 2, person: 2, external: 3 };

const sortEdges = (edges: ArchEdge[], side: "from" | "to") =>
  [...edges].sort((a, b) => {
    const na = NODE_BY_ID[a[side]];
    const nb = NODE_BY_ID[b[side]];
    return (
      KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
      KIND_RANK[na.kind] - KIND_RANK[nb.kind] ||
      na.name.localeCompare(nb.name, "no")
    );
  });

/** Splits a long hyphenated name into at most two balanced lines. */
function wrapName(name: string, max = 20): string[] {
  if (name.length <= max) return [name];
  const parts = name.split("-");
  let best: string[] = [name];
  let bestScore = Infinity;
  for (let i = 1; i < parts.length; i++) {
    const a = parts.slice(0, i).join("-") + "-";
    const b = parts.slice(i).join("-");
    const score = Math.max(a.length, b.length);
    if (score < bestScore) {
      bestScore = score;
      best = [a, b];
    }
  }
  return best;
}

function EgoGraph({ id, onSelect }: { id: string; onSelect: (id: string) => void }) {
  const ins = sortEdges(incoming(id), "from");
  const outs = sortEdges(outgoing(id), "to");

  const W = 760;
  const sideW = 232;
  const centerW = 176;
  const centerX = (W - centerW) / 2;
  const rowH = 32;
  const nodeH = 24;
  const pad = 14;
  const rows = Math.max(ins.length, outs.length, 3);
  const H = rows * rowH + pad * 2;
  const centerH = Math.min(Math.max(64, rows * 12), H - pad * 2);
  const centerY = (H - centerH) / 2;
  const lines = wrapName(NODE_BY_ID[id].name);

  const sideY = (count: number, i: number) => pad + ((rows - count) * rowH) / 2 + i * rowH + (rowH - nodeH) / 2;
  const portY = (count: number, i: number) => {
    const inner = centerH - 20;
    return centerY + 10 + (count === 1 ? inner / 2 : (inner * i) / (count - 1));
  };

  const renderSide = (edges: ArchEdge[], side: "in" | "out") =>
    edges.map((e, i) => {
      const otherId = side === "in" ? e.from : e.to;
      const other = NODE_BY_ID[otherId];
      const x = side === "in" ? 0 : W - sideW;
      const y = sideY(edges.length, i);
      const ny = y + nodeH / 2;
      const py = portY(edges.length, i);
      const color = KIND_COLOR[e.kind];
      const x1 = side === "in" ? sideW : centerX + centerW;
      const x2 = side === "in" ? centerX : W - sideW;
      const y1 = side === "in" ? ny : py;
      const y2 = side === "in" ? py : ny;
      const mid = (x1 + x2) / 2;
      const d = `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
      const label = edgeLabel(e);
      return (
        <g key={`${side}-${otherId}-${e.kind}`}>
          <path d={d} fill="none" stroke={color} strokeWidth={1.6} strokeOpacity={0.55} />
          <path d={d} fill="none" stroke={color} strokeWidth={3} className="arch-flow arch-flow--slow" />
          <g
            className="arch-ego__node"
            role="button"
            tabIndex={0}
            aria-label={`${side === "in" ? "Fra" : "Til"} ${other.name} (${label}). Vis ${other.name}.`}
            onClick={() => onSelect(otherId)}
            onKeyDown={(ev) => {
              if (ev.key === "Enter" || ev.key === " ") {
                ev.preventDefault();
                onSelect(otherId);
              }
            }}
          >
            <rect
              className="arch-box"
              x={x}
              y={y}
              width={sideW}
              height={nodeH}
              rx={7}
              fill="var(--ax-bg-default)"
              stroke="var(--ax-border-neutral-subtle)"
            />
            <rect x={side === "in" ? x : x + sideW - 4} y={y} width={4} height={nodeH} rx={2} fill={color} />
            <text x={x + 12} y={y + nodeH / 2 + 4} fontSize={11.5} fill="var(--ax-text-neutral)">
              {other.name}
            </text>
            <text
              x={x + sideW - 12}
              y={y + nodeH / 2 + 3.5}
              fontSize={9.5}
              textAnchor="end"
              fill="var(--ax-text-neutral-subtle)"
              fontFamily="var(--arch-mono)"
            >
              {label}
            </text>
          </g>
        </g>
      );
    });

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", height: "auto", display: "block" }}
      role="group"
      aria-label={`Avhengigheter for ${NODE_BY_ID[id].name}`}
    >
      <text x={0} y={10} fontSize={10.5} fill="var(--ax-text-neutral-subtle)" className="arch-eyebrow-svg">
        INN ({ins.length})
      </text>
      <text x={W} y={10} fontSize={10.5} textAnchor="end" fill="var(--ax-text-neutral-subtle)" className="arch-eyebrow-svg">
        UT ({outs.length})
      </text>
      {ins.length === 0 && (
        <text x={sideW / 2} y={H / 2 + 4} textAnchor="middle" fontSize={11.5} fill="var(--ax-text-neutral-subtle)">
          Ingen innkommende
        </text>
      )}
      {outs.length === 0 && (
        <text x={W - sideW / 2} y={H / 2 + 4} textAnchor="middle" fontSize={11.5} fill="var(--ax-text-neutral-subtle)">
          Ingen utgående
        </text>
      )}
      {renderSide(ins, "in")}
      {renderSide(outs, "out")}
      <rect
        x={centerX}
        y={centerY}
        width={centerW}
        height={centerH}
        rx={14}
        fill="var(--ax-bg-accent-soft)"
        stroke="var(--ax-border-accent)"
        strokeWidth={1.6}
      />
      {lines.map((l, i) => (
        <text
          key={l}
          x={centerX + centerW / 2}
          y={centerY + centerH / 2 + 5 - ((lines.length - 1) * 16) / 2 + i * 16}
          textAnchor="middle"
          fontSize={13}
          fontWeight={700}
          fill="var(--ax-text-neutral)"
        >
          {l}
        </text>
      ))}
    </svg>
  );
}

export function NodeExplorer({ id, onSelect }: { id: string | null; onSelect: (id: string | null) => void }) {
  if (!id) {
    return (
      <div className="arch-explorer arch-explorer--empty">
        <BodyShort weight="semibold">Utforsk en tjeneste</BodyShort>
        <BodyShort size="small" className="arch-subtle">
          Velg en boks i kartet for å se hva den gjør, hvem som kaller den og hva den avhenger av. Eller start her:
        </BodyShort>
        <HStack gap="space-8" wrap>
          {QUICK_PICKS.map((p) => (
            <Button key={p} size="small" variant="secondary" onClick={() => onSelect(p)}>
              {NODE_BY_ID[p].name}
            </Button>
          ))}
        </HStack>
      </div>
    );
  }

  const n = NODE_BY_ID[id];
  const ins = incoming(id);
  const outs = outgoing(id);
  const kinds = (edges: ArchEdge[]) =>
    (Object.keys(COUNT_LABEL) as EdgeKind[])
      .map((k) => [k, edges.filter((e) => e.kind === k).length] as const)
      .filter(([, c]) => c > 0)
      .map(([k, c]) => `${c} ${COUNT_LABEL[k](c)}`)
      .join(" · ");

  return (
    <div className="arch-explorer" key={id} id="arch-node-details" tabIndex={-1} role="region" aria-labelledby="arch-node-details-title">
      <div className="arch-explorer__info">
        <Detail className="arch-eyebrow">{ZONE_LABEL[n.zone]}</Detail>
        <Heading level="3" size="medium" spacing id="arch-node-details-title">
          {n.name}
        </Heading>
        <HStack gap="space-6" wrap style={{ marginBottom: "0.75rem" }}>
          {n.lang && (
            <Tag size="xsmall" variant="moderate" data-color="neutral">
              {n.lang}
            </Tag>
          )}
          {n.db && (
            <Tag size="xsmall" variant="moderate" data-color="success">
              PostgreSQL
            </Tag>
          )}
          {n.kind === "job" && (
            <Tag size="xsmall" variant="moderate" data-color="warning">
              Naisjob
            </Tag>
          )}
          {n.kind === "topic" && (
            <Tag size="xsmall" variant="moderate" data-color="meta-purple">
              Kafka-topic
            </Tag>
          )}
        </HStack>
        <BodyLong size="small" spacing>
          {n.summary}
        </BodyLong>
        {n.facts && n.facts.length > 0 && (
          <ul className="arch-facts">
            {n.facts.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        )}
        <dl className="arch-counts">
          <div>
            <dt>Inn</dt>
            <dd>{ins.length ? kinds(ins) : "–"}</dd>
          </div>
          <div>
            <dt>Ut</dt>
            <dd>{outs.length ? kinds(outs) : "–"}</dd>
          </div>
        </dl>
        <HStack gap="space-16" wrap style={{ marginTop: "0.75rem" }}>
          {n.repo && (
            <DsLink href={`https://github.com/navikt/${n.repo}`} target="_blank" rel="noreferrer">
              GitHub <ExternalLinkIcon aria-hidden />
            </DsLink>
          )}
          {n.link && <DsLink href={n.link.href}>{n.link.label}</DsLink>}
          <Button size="xsmall" variant="tertiary-neutral" onClick={() => onSelect(null)}>
            Lukk
          </Button>
        </HStack>
      </div>
      <div className="arch-explorer__graph">
        <EgoGraph id={id} onSelect={onSelect} />
      </div>
    </div>
  );
}
