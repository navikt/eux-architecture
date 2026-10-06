"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { BodyShort, Button, ToggleGroup } from "@navikt/ds-react";
import { EDGES, KIND_COLOR, NODE_BY_ID, type ArchEdge, type EdgeKind, type Zone } from "./data";
import { NodeExplorer } from "./NodeExplorer";

export type MapView = "alle" | EdgeKind;

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

type Rect = { x: number; y: number; w: number; h: number };
type Tone = "accent" | "success" | "info" | "purple" | "magenta" | "lime" | "warning" | "neutral" | "beige" | "eu";

const W = 1280;
const H = 880;
const CHIP_H = 30;
const HEADER = 48;

const right = (r: Rect) => r.x + r.w;
const bottom = (r: Rect) => r.y + r.h;
const cx = (r: Rect) => r.x + r.w / 2;
const cy = (r: Rect) => r.y + r.h / 2;

const TONE: Record<Tone, { fill: string; stroke: string; text: string }> = {
  accent: { fill: "var(--ax-bg-accent-soft)", stroke: "var(--ax-border-accent-subtle)", text: "var(--ax-text-accent)" },
  success: { fill: "var(--ax-bg-success-soft)", stroke: "var(--ax-border-success-subtle)", text: "var(--ax-text-success)" },
  info: { fill: "var(--ax-bg-info-soft)", stroke: "var(--ax-border-info-subtle)", text: "var(--ax-text-info)" },
  purple: { fill: "var(--ax-bg-meta-purple-soft)", stroke: "var(--ax-border-meta-purple-subtle)", text: "var(--ax-text-meta-purple)" },
  magenta: { fill: "var(--ax-bg-brand-magenta-soft)", stroke: "var(--ax-border-brand-magenta-subtle)", text: "var(--ax-text-brand-magenta)" },
  lime: { fill: "var(--ax-bg-meta-lime-soft)", stroke: "var(--ax-border-meta-lime-subtle)", text: "var(--ax-text-meta-lime)" },
  warning: { fill: "var(--ax-bg-warning-soft)", stroke: "var(--ax-border-warning-subtle)", text: "var(--ax-text-warning)" },
  neutral: { fill: "var(--ax-bg-neutral-soft)", stroke: "var(--ax-border-neutral-subtle)", text: "var(--ax-text-neutral-subtle)" },
  beige: { fill: "var(--ax-bg-brand-beige-soft)", stroke: "var(--ax-border-brand-beige-subtle)", text: "var(--ax-text-neutral-subtle)" },
  eu: { fill: "var(--ax-bg-brand-blue-soft)", stroke: "var(--ax-border-brand-blue-subtle)", text: "var(--ax-text-neutral)" },
};

type ZoneDef = {
  zone: Zone;
  title: string;
  sub: string;
  tone: Tone;
  rect: Rect;
  members: string[];
  cols?: number;
  flow?: boolean;
};

const ZONES: ZoneDef[] = [
  {
    zone: "domene",
    title: "Domenetjenester",
    sub: "Kotlin · PostgreSQL",
    tone: "success",
    rect: { x: 616, y: 90, w: 244, h: 254 },
    members: ["eux-nav-rinasak", "eux-journal", "eux-oppgave", "eux-saksbehandler", "eux-relaterte-rinasaker"],
  },
  {
    zone: "rina-integrasjon",
    title: "RINA-integrasjon",
    sub: "Alle logger inn i RINA CPI",
    tone: "info",
    rect: { x: 908, y: 90, w: 220, h: 254 },
    members: ["eux-rina-api", "eux-rina-terminator-api", "eux-rina-case-search", "eux-pdf"],
  },
  {
    zone: "jobber",
    title: "NAIS-jobber",
    sub: "eux-…-naisjob · cron",
    tone: "warning",
    rect: { x: 24, y: 430, w: 200, h: 214 },
    members: ["eux-avslutt-rinasaker-naisjob", "eux-journalarkivar-naisjob", "eux-slett-usendte-rinasaker-naisjob"],
  },
  {
    zone: "bakgrunn",
    title: "Bakgrunnstjenester",
    sub: "Kafka-konsumenter og nattlige prosesser",
    tone: "lime",
    rect: { x: 264, y: 430, w: 416, h: 214 },
    cols: 2,
    members: [
      "eux-fagmodul-journalfoering",
      "eux-journalarkivar",
      "eux-avslutt-rinasaker",
      "eux-slett-usendte-rinasaker",
      "eux-adresse-oppdatering",
      "eux-person-oppdatering",
      "eux-barnetrygd",
    ],
  },
  {
    zone: "kafka",
    title: "Kafka",
    sub: "Topics (uten eux-prefiks)",
    tone: "purple",
    rect: { x: 720, y: 430, w: 200, h: 254 },
    members: [
      "eux-rina-case-events-v1",
      "eux-rina-document-events-v1",
      "eux-rina-notification-events-v1",
      "sedmottatt-v1",
      "sedsendt-v1",
    ],
  },
  {
    zone: "hendelser",
    title: "Hendelsesinfrastruktur",
    sub: "Fra RINA til Kafka",
    tone: "magenta",
    rect: { x: 960, y: 430, w: 176, h: 140 },
    members: ["eux-all-rina-events", "eux-legacy-rina-events"],
  },
  {
    zone: "nav",
    title: "NAV-systemer",
    sub: "Velg et system for å se hvem som bruker det",
    tone: "neutral",
    rect: { x: 24, y: 724, w: 656, h: 132 },
    flow: true,
    members: [
      "pdl",
      "pdl-mottak",
      "saf",
      "dokarkiv",
      "nav-oppgave",
      "norg2",
      "sak",
      "aareg",
      "inntekt",
      "dokdist",
      "nom",
      "graph",
      "slack",
    ],
  },
  {
    zone: "andre",
    title: "Andre team",
    sub: "Bruker EUX direkte",
    tone: "beige",
    rect: { x: 720, y: 724, w: 200, h: 132 },
    members: ["eessi-pensjon", "melosys-eessi"],
  },
];

const HERO: Record<string, Rect> = {
  saksbehandler: { x: 24, y: 173, w: 128, h: 88 },
  "eux-web-app": { x: 192, y: 173, w: 168, h: 88 },
  "eux-neessi": { x: 400, y: 173, w: 168, h: 88 },
  rina: { x: 1176, y: 90, w: 84, h: 494 },
};

const textWidth = (s: string, size = 12) => s.length * size * 0.56;

function layoutZone(z: ZoneDef): Record<string, Rect> {
  const out: Record<string, Rect> = {};
  const { x, y, w, h } = z.rect;
  const pad = 12;
  if (z.flow) {
    let cxp = x + pad;
    let cyp = y + HEADER;
    for (const id of z.members) {
      const cw = Math.round(textWidth(NODE_BY_ID[id].short) + 24);
      if (cxp + cw > x + w - pad) {
        cxp = x + pad;
        cyp += 28 + 8;
      }
      out[id] = { x: cxp, y: cyp, w: cw, h: 28 };
      cxp += cw + 8;
    }
    return out;
  }
  const cols = z.cols ?? 1;
  const rows = Math.ceil(z.members.length / cols);
  const colGap = 10;
  const chipW = (w - pad * 2 - colGap * (cols - 1)) / cols;
  const avail = h - HEADER - 14;
  const gap = rows > 1 ? Math.min(16, (avail - rows * CHIP_H) / (rows - 1)) : 0;
  const block = rows * CHIP_H + (rows - 1) * gap;
  const top = y + HEADER + (avail - block) / 2;
  z.members.forEach((id, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    out[id] = {
      x: x + pad + col * (chipW + colGap),
      y: top + row * (CHIP_H + gap),
      w: chipW,
      h: CHIP_H,
    };
  });
  return out;
}

const RECTS: Record<string, Rect> = Object.assign({}, HERO, ...ZONES.map(layoutZone));
const ZONE_OF: Record<string, Zone> = Object.fromEntries(
  Object.values(NODE_BY_ID).map((n) => [n.id, n.zone]),
);
const ZONE_RECT = Object.fromEntries(ZONES.map((z) => [z.zone, z.rect])) as Record<Zone, Rect>;

/* ------------------------------------------------------------------ */
/* Trunks: the drawn lines between zones                               */
/* ------------------------------------------------------------------ */

type Trunk = {
  id: string;
  kind: EdgeKind;
  d: string;
  double?: boolean;
  label?: { text: string; x: number; y: number; anchor?: "start" | "middle" | "end" };
};

const TRUNKS: Trunk[] = (() => {
  const U = RECTS.saksbehandler;
  const Wb = RECTS["eux-web-app"];
  const N = RECTS["eux-neessi"];
  const X = RECTS.rina;
  const D = ZONE_RECT.domene;
  const R = ZONE_RECT["rina-integrasjon"];
  const J = ZONE_RECT.jobber;
  const A = ZONE_RECT.bakgrunn;
  const K = ZONE_RECT.kafka;
  const T = ZONE_RECT.andre;
  const all = RECTS["eux-all-rina-events"];
  const leg = RECTS["eux-legacy-rina-events"];
  const topY = 50;
  const arY = 372;
  const krY = 402;

  return [
    { id: "uw", kind: "rest", d: `M ${right(U)} ${cy(U)} H ${Wb.x}` },
    {
      id: "wn",
      kind: "rest",
      d: `M ${right(Wb)} ${cy(Wb)} H ${N.x}`,
      label: { text: "OBO", x: (right(Wb) + N.x) / 2, y: cy(Wb) - 8 },
    },
    {
      id: "nd",
      kind: "rest",
      d: `M ${right(N)} ${cy(N)} H ${D.x}`,
      label: { text: "REST", x: (right(N) + D.x) / 2, y: cy(N) - 8 },
    },
    {
      id: "nr",
      kind: "rest",
      d: `M ${cx(N)} ${N.y} V ${topY} H ${cx(R)} V ${R.y}`,
      label: { text: "alle RINA-operasjoner går via eux-rina-api", x: (cx(N) + cx(R)) / 2, y: topY - 8 },
    },
    {
      id: "rx",
      kind: "rest",
      d: `M ${right(R)} ${cy(N)} H ${X.x}`,
    },
    {
      id: "na",
      kind: "rest",
      d: `M ${cx(N)} ${bottom(N)} V ${A.y}`,
    },
    { id: "ad", kind: "rest", d: `M ${D.x + 24} ${A.y} V ${bottom(D)}` },
    { id: "ar", kind: "rest", d: `M ${right(A) - 12} ${A.y} V ${arY} H ${R.x + 52} V ${bottom(R)}` },
    { id: "kr", kind: "event", d: `M ${K.x + 170} ${K.y} V ${krY} H ${R.x + 132} V ${bottom(R)}` },
    { id: "re", kind: "rest", d: `M ${right(R) - 28} ${bottom(R)} V ${ZONE_RECT.hendelser.y}` },
    { id: "xe", kind: "event", d: `M ${X.x} ${cy(all)} H ${right(all)}` },
    { id: "ex", kind: "rest", d: `M ${right(leg)} ${cy(leg)} H ${X.x}` },
    { id: "ek-all", kind: "event", d: `M ${all.x} ${cy(all)} H ${right(K)}` },
    { id: "ek-leg", kind: "event", d: `M ${leg.x} ${cy(leg)} H ${right(K)}`, double: true },
    { id: "ka", kind: "event", d: `M ${K.x} ${A.y + 170} H ${right(A)}` },
    { id: "kt", kind: "event", d: `M ${cx(K)} ${bottom(K)} V ${T.y}` },
    {
      id: "ja",
      kind: "cron",
      d: `M ${right(J)} ${cy(J)} H ${A.x}`,
    },
  ];
})();

const ZONE_TRUNK: Record<string, string> = {
  "bruker>frontend": "uw",
  "frontend>orkestrering": "wn",
  "orkestrering>domene": "nd",
  "orkestrering>rina-integrasjon": "nr",
  "orkestrering>bakgrunn": "na",
  "bakgrunn>domene": "ad",
  "bakgrunn>rina-integrasjon": "ar",
  "rina-integrasjon>eu": "rx",
  "kafka>bakgrunn": "ka",
  "kafka>rina-integrasjon": "kr",
  "kafka>andre": "kt",
  "jobber>bakgrunn": "ja",
};

function trunkOf(e: ArchEdge): string | null {
  if (e.from === "rina" && e.to === "eux-all-rina-events") return "xe";
  if (e.from === "eux-legacy-rina-events" && e.to === "rina") return "ex";
  if (e.from === "eux-rina-api" && e.to === "eux-all-rina-events") return "re";
  if (e.from === "eux-all-rina-events" && ZONE_OF[e.to] === "kafka") return "ek-all";
  if (e.from === "eux-legacy-rina-events" && ZONE_OF[e.to] === "kafka") return "ek-leg";
  if (ZONE_OF[e.from] === "kafka" && e.to === "eux-legacy-rina-events") return "ek-leg";
  return ZONE_TRUNK[`${ZONE_OF[e.from]}>${ZONE_OF[e.to]}`] ?? null;
}

/** Nodes that belong to a view even without an edge of that kind. */
const EXTRA_IN_VIEW: Partial<Record<EdgeKind, string[]>> = { cron: ["eux-barnetrygd"] };
const SCHEDULED = new Set(["eux-barnetrygd"]);

/* ------------------------------------------------------------------ */
/* Small SVG icons                                                     */
/* ------------------------------------------------------------------ */

function DbIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} aria-hidden>
      <title>PostgreSQL</title>
      <ellipse cx={6} cy={2.5} rx={6} ry={2.5} fill="none" stroke="currentColor" strokeWidth={1.2} />
      <path d="M0 2.5 V 10.5 A 6 2.5 0 0 0 12 10.5 V 2.5" fill="none" stroke="currentColor" strokeWidth={1.2} />
      <path d="M0 6.5 A 6 2.5 0 0 0 12 6.5" fill="none" stroke="currentColor" strokeWidth={1} />
    </g>
  );
}

function ClockIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} aria-hidden>
      <circle cx={6} cy={6} r={5.5} fill="none" stroke="currentColor" strokeWidth={1.2} />
      <path d="M6 3 V6 L8.2 7.4" fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" />
    </g>
  );
}

function TopicIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} aria-hidden stroke="currentColor" strokeWidth={1.3} strokeLinecap="round">
      <path d="M0 2 H12 M0 6 H9 M0 10 H11" />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function ArchitectureMap({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [view, setView] = useState<MapView>("alle");
  const [hovered, setHovered] = useState<string | null>(null);
  const active = hovered ?? selected;

  const visibleEdges = useMemo(
    () => (view === "alle" ? EDGES : EDGES.filter((e) => e.kind === view)),
    [view],
  );

  const viewNodes = useMemo(() => {
    if (view === "alle") return null;
    const s = new Set<string>(EXTRA_IN_VIEW[view] ?? []);
    visibleEdges.forEach((e) => {
      s.add(e.from);
      s.add(e.to);
    });
    return s;
  }, [view, visibleEdges]);

  const { neighbours, litTrunks } = useMemo(() => {
    const nb = new Set<string>();
    const lit = new Set<string>();
    if (active) {
      for (const e of visibleEdges) {
        if (e.from !== active && e.to !== active) continue;
        nb.add(e.from === active ? e.to : e.from);
        const t = trunkOf(e);
        if (t) lit.add(t);
      }
    }
    return { neighbours: nb, litTrunks: lit };
  }, [active, visibleEdges]);

  const nodeState = (id: string): string => {
    if (active) {
      if (id === active) return "is-active";
      if (neighbours.has(id)) return "is-neighbour";
      return "is-dim";
    }
    if (viewNodes && !viewNodes.has(id)) return "is-dim";
    return "";
  };

  const trunkState = (t: Trunk): string => {
    if (view !== "alle" && t.kind !== view) return "is-off";
    if (active) return litTrunks.has(t.id) ? "is-lit" : "is-dim";
    return "is-idle";
  };

  const toggle = (id: string) => onSelect(selected === id ? null : id);
  const nodeProps = (id: string) => ({
    className: `arch-node ${nodeState(id)}`,
    role: "button",
    tabIndex: 0,
    "aria-pressed": selected === id,
    "aria-label": `${NODE_BY_ID[id].name}. ${NODE_BY_ID[id].summary}`,
    onClick: () => toggle(id),
    onKeyDown: (ev: KeyboardEvent<SVGGElement>) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        toggle(id);
      } else if (ev.key === "Escape") {
        onSelect(null);
      }
    },
    onMouseEnter: () => setHovered(id),
    onMouseLeave: () => setHovered(null),
    onFocus: () => setHovered(id),
    onBlur: () => setHovered(null),
  });

  const zoneTone = (z: Zone): Tone => ZONES.find((d) => d.zone === z)?.tone ?? "neutral";

  const renderChip = (id: string) => {
    const n = NODE_BY_ID[id];
    const r = RECTS[id];
    const tone = TONE[zoneTone(n.zone)];
    const icon =
      n.kind === "job" || SCHEDULED.has(id) ? "clock" : n.kind === "topic" ? "topic" : null;
    const textX = r.x + (icon ? 28 : 10);
    return (
      <g key={id} {...nodeProps(id)}>
        <rect className="arch-pulse" x={r.x} y={r.y} width={r.w} height={r.h} rx={8} fill="none" stroke={tone.stroke} />
        <rect
          className="arch-box"
          x={r.x}
          y={r.y}
          width={r.w}
          height={r.h}
          rx={8}
          fill="var(--ax-bg-default)"
          stroke={tone.stroke}
          strokeWidth={1.2}
        />
        {icon === "clock" && (
          <g style={{ color: "var(--ax-text-warning)" }}>
            <ClockIcon x={r.x + 10} y={r.y + r.h / 2 - 6} />
          </g>
        )}
        {icon === "topic" && (
          <g style={{ color: "var(--ax-text-meta-purple)" }}>
            <TopicIcon x={r.x + 10} y={r.y + r.h / 2 - 6} />
          </g>
        )}
        <text
          x={textX}
          y={r.y + r.h / 2 + 4}
          fontSize={n.kind === "topic" ? 11.5 : 12}
          fill="var(--ax-text-neutral)"
          fontFamily={n.kind === "topic" ? "var(--arch-mono)" : undefined}
        >
          {n.short}
        </text>
        {n.db && (
          <g style={{ color: tone.text }}>
            <DbIcon x={right(r) - 22} y={r.y + r.h / 2 - 6.5} />
          </g>
        )}
      </g>
    );
  };

  const renderHero = (id: string, title: string, sub: string, tone: Tone) => {
    const r = RECTS[id];
    const t = TONE[tone];
    return (
      <g key={id} {...nodeProps(id)}>
        <rect className="arch-pulse" x={r.x} y={r.y} width={r.w} height={r.h} rx={16} fill="none" stroke={t.stroke} />
        <rect className="arch-box" x={r.x} y={r.y} width={r.w} height={r.h} rx={16} fill={t.fill} stroke={t.stroke} strokeWidth={1.4} />
        {id === "saksbehandler" ? (
          <g aria-hidden transform={`translate(${cx(r) - 9} ${r.y + 16})`} fill="none" stroke={t.text} strokeWidth={1.6}>
            <circle cx={9} cy={6} r={5} />
            <path d="M0 22 C0 14 18 14 18 22" strokeLinecap="round" />
          </g>
        ) : null}
        <text
          x={cx(r)}
          y={id === "saksbehandler" ? r.y + 60 : r.y + 38}
          textAnchor="middle"
          fontSize={14}
          fontWeight={600}
          fill="var(--ax-text-neutral)"
        >
          {title}
        </text>
        <text
          x={cx(r)}
          y={id === "saksbehandler" ? r.y + 76 : r.y + 58}
          textAnchor="middle"
          fontSize={11}
          fill="var(--ax-text-neutral-subtle)"
        >
          {sub}
        </text>
      </g>
    );
  };

  const rina = RECTS.rina;
  const all = RECTS["eux-all-rina-events"];
  const leg = RECTS["eux-legacy-rina-events"];

  return (
    <div className="arch-map">
      <div className="arch-map__toolbar">
        <ToggleGroup
          size="small"
          value={view}
          onChange={(v) => setView(v as MapView)}
          label="Vis flyt"
        >
          <ToggleGroup.Item value="alle" label="Alt" />
          <ToggleGroup.Item value="rest" label="Forespørsler" />
          <ToggleGroup.Item value="event" label="Hendelser" />
          <ToggleGroup.Item value="cron" label="Planlagt" />
        </ToggleGroup>
        <BodyShort size="small" className="arch-subtle" aria-live="polite">
          {selected
            ? `Valgt: ${NODE_BY_ID[selected].name}`
            : "Hold over eller klikk på en boks. Tab + Enter fungerer også."}
        </BodyShort>
        {selected && (
          <Button size="xsmall" variant="tertiary" onClick={() => onSelect(null)}>
            Nullstill
          </Button>
        )}
      </div>

      <div className="portal-diagram arch-map__surface">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="group"
          aria-label="Arkitekturkart for EUX. Velg en boks for å se detaljer og avhengigheter."
          style={{ width: "100%", height: "auto", display: "block" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onSelect(null);
          }}
        >
          <defs>
            {(["rest", "event", "cron"] as EdgeKind[]).map((k) => (
              <marker
                key={k}
                id={`arch-arrow-${k}`}
                viewBox="0 0 10 10"
                refX={9}
                refY={5}
                markerWidth={7}
                markerHeight={7}
                orient="auto-start-reverse"
              >
                <path d="M0,0 L10,5 L0,10 z" fill={KIND_COLOR[k]} />
              </marker>
            ))}
          </defs>

          {/* Zones */}
          {ZONES.map((z, i) => {
            const t = TONE[z.tone];
            const r = z.rect;
            return (
              <g key={z.zone} className="arch-zone" style={{ ["--arch-delay" as string]: `${80 + i * 60}ms` }}>
                <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={14} fill={t.fill} stroke={t.stroke} strokeWidth={1.2} />
                <text x={r.x + 14} y={r.y + 22} fontSize={13} fontWeight={700} fill="var(--ax-text-neutral)">
                  {z.title}
                </text>
                <text x={r.x + 14} y={r.y + 37} fontSize={11} fill="var(--ax-text-neutral-subtle)">
                  {z.sub}
                </text>
              </g>
            );
          })}

          {/* Trunks (below nodes) */}
          {TRUNKS.map((t) => (
            <g key={t.id} className={`arch-trunk ${trunkState(t)}`}>
              <path
                className="arch-trunk__base"
                d={t.d}
                fill="none"
                stroke={KIND_COLOR[t.kind]}
                strokeWidth={1.8}
                strokeLinejoin="round"
                markerEnd={`url(#arch-arrow-${t.kind})`}
                markerStart={t.double ? `url(#arch-arrow-${t.kind})` : undefined}
              />
              <path className="arch-flow" d={t.d} fill="none" stroke={KIND_COLOR[t.kind]} strokeWidth={3.2} />
              {t.label && (
                <text
                  x={t.label.x}
                  y={t.label.y}
                  textAnchor={t.label.anchor ?? "middle"}
                  fontSize={11}
                  fill="var(--ax-text-neutral-subtle)"
                  className="arch-halo"
                >
                  {t.label.text}
                </text>
              )}
            </g>
          ))}

          {/* Hero nodes */}
          {renderHero("saksbehandler", "Saksbehandler", "nettleser", "neutral")}
          {renderHero("eux-web-app", "eux-web-app", "nEESSI · React + BFF", "accent")}
          {renderHero("eux-neessi", "eux-neessi", "orkestrator for nEESSI", "accent")}

          {/* RINA */}
          <g {...nodeProps("rina")}>
            <rect
              className="arch-box"
              x={rina.x}
              y={rina.y}
              width={rina.w}
              height={rina.h}
              rx={16}
              fill={TONE.eu.fill}
              stroke={TONE.eu.stroke}
              strokeWidth={1.4}
            />
            <g aria-hidden transform={`translate(${cx(rina)} ${rina.y + 36})`}>
              <g className="arch-stars">
                {Array.from({ length: 12 }, (_, i) => {
                  const a = (i / 12) * Math.PI * 2;
                  return <circle key={i} cx={Math.cos(a) * 16} cy={Math.sin(a) * 16} r={2.2} fill="var(--ax-border-warning)" />;
                })}
              </g>
            </g>
            <text x={cx(rina)} y={rina.y + 80} textAnchor="middle" fontSize={16} fontWeight={700} fill="var(--ax-text-neutral)">
              RINA
            </text>
            <text x={cx(rina)} y={rina.y + 96} textAnchor="middle" fontSize={11} fill="var(--ax-text-neutral-subtle)">
              EU-system
            </text>
            {[
              { y: cy(RECTS["eux-neessi"]), text: "CPI" },
              { y: cy(all), text: "NIE" },
              { y: cy(leg), text: "CPI" },
            ].map((p) => (
              <g key={`${p.text}-${p.y}`}>
                <rect x={rina.x + 8} y={p.y - 10} width={36} height={20} rx={6} fill="var(--ax-bg-default)" stroke={TONE.eu.stroke} />
                <text x={rina.x + 26} y={p.y + 4} textAnchor="middle" fontSize={10.5} fontWeight={600} fill="var(--ax-text-neutral)" fontFamily="var(--arch-mono)">
                  {p.text}
                </text>
              </g>
            ))}
          </g>

          {/* Zone members */}
          {ZONES.flatMap((z) => z.members).map(renderChip)}

          {/* Legend */}
          <g transform="translate(960 724)" aria-hidden>
            <rect width={300} height={132} rx={14} fill="none" stroke="var(--ax-border-neutral-subtle)" strokeDasharray="4 4" />
            <text x={16} y={24} fontSize={12} fontWeight={700} fill="var(--ax-text-neutral)">
              Slik leser du kartet
            </text>
            {(
              [
                ["rest", "Synkront kall (REST/GraphQL/CPI)"],
                ["event", "Hendelse (NIE eller Kafka)"],
                ["cron", "Planlagt start (cron)"],
              ] as [EdgeKind, string][]
            ).map(([k, label], i) => (
              <g key={k} transform={`translate(16 ${44 + i * 20})`}>
                <line x1={0} y1={0} x2={28} y2={0} stroke={KIND_COLOR[k]} strokeWidth={2} markerEnd={`url(#arch-arrow-${k})`} />
                <text x={40} y={4} fontSize={11} fill="var(--ax-text-neutral-subtle)">
                  {label}
                </text>
              </g>
            ))}
            <g transform="translate(16 104)" style={{ color: "var(--ax-text-neutral-subtle)" }}>
              <DbIcon x={8} y={-6} />
              <text x={40} y={4} fontSize={11} fill="var(--ax-text-neutral-subtle)">
                PostgreSQL
              </text>
              <ClockIcon x={128} y={-6} />
              <text x={148} y={4} fontSize={11} fill="var(--ax-text-neutral-subtle)">
                Kjører på klokka
              </text>
            </g>
          </g>
        </svg>
      </div>

      <NodeExplorer id={selected} onSelect={onSelect} />
    </div>
  );
}
