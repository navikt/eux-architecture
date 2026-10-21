"use client";

import { createContext, useContext, type ReactNode } from "react";
import { BodyShort, HStack } from "@navikt/ds-react";
import { useReducedMotion, useSvgIds } from "@/components/architecture/hooks";
import { onActivate } from "@/components/architecture/svg";
import { TONE, type Tone } from "@/lib/tones";
import { StatusChip } from "./StatusChips";

/*
 * Building blocks for the status-machine figures on the process pages.
 * Coordinates are in the figure's viewBox units.
 */

/**
 * How a transition is drawn: `back` when the case goes back to an earlier status, `event` for a
 * Kafka event (dashed purple), and `manual` for a status set outside the app (thin, dashed, never animated).
 */
export type EdgeKind = "plain" | "back" | "error" | "event" | "manual";

const KIND: Record<EdgeKind, { stroke: string; flow?: string; packet?: string; dash?: string; width?: number; dot?: number }> = {
  plain: { stroke: "var(--ax-border-neutral-strong)", flow: "var(--ax-border-accent)", packet: "var(--ax-bg-accent-strong)" },
  back: { stroke: "var(--ax-border-warning)", flow: "var(--ax-border-accent)", packet: "var(--ax-bg-accent-strong)" },
  error: { stroke: "var(--ax-border-danger)", flow: "var(--ax-border-danger)", packet: "var(--ax-bg-danger-strong)" },
  event: { stroke: "var(--ax-border-meta-purple)", flow: "var(--ax-border-meta-purple)", packet: "var(--ax-bg-meta-purple-strong)", dash: "5 4" },
  manual: { stroke: "var(--ax-border-neutral-strong)", dash: "4 4", width: 1.4, dot: 4 },
};
const KINDS = Object.keys(KIND) as EdgeKind[];

/** A transition between statuses. An edge with no `from` comes from outside the figure and starts with a dot. */
export type StateEdge<S extends string> = {
  id: string;
  from: S[];
  to: S[];
  d: string;
  kind?: EdgeKind;
  /** Animated while nothing is selected. */
  main?: boolean;
  /** False for a segment that ends in a junction instead of a status. */
  arrow?: boolean;
  /** Overrides the kind's dash pattern. */
  dash?: string;
};

/** Which edges and statuses to light up or dim for the selected status and an optional edge filter. */
export type StateFocus<S extends string> = ReturnType<typeof stateFocus<S>>;

export function stateFocus<S extends string, E extends StateEdge<S> = StateEdge<S>>(edges: readonly E[], selected: S | null, filter?: (e: E) => boolean) {
  const byId = new Map(edges.map((e) => [e.id, e]));
  const edge = (id: string) => byId.get(id)!;
  const match = (e: E) => !filter || filter(e);
  const touches = (e: E) => !!selected && (e.from.includes(selected) || e.to.includes(selected));
  const isLit = (e: E) => match(e) && (selected ? touches(e) : !!filter);
  const isDim = (e: E) => (selected ? !touches(e) || !match(e) : !match(e));

  const near = new Set<S>(selected ? [selected] : []);
  edges.filter(isLit).forEach((e) => [...e.from, ...e.to].forEach((s) => near.add(s)));
  const focusing = !!selected || !!filter;

  return {
    focusing,
    lit: (id: string) => isLit(edge(id)),
    dim: (id: string) => isDim(edge(id)),
    /** "is-lit", "is-dim" or "" for an edge and the labels that belong to it. */
    edgeState: (id: string) => (isLit(edge(id)) ? "is-lit" : isDim(edge(id)) ? "is-dim" : ""),
    nodeState: (id: S) =>
      id === selected ? "is-active" : near.has(id) ? "is-neighbour" : focusing ? "is-dim" : "",
    /** Lit edges last, so they are drawn on top where paths share a segment. */
    ordered: [...edges].sort((a, b) => Number(isLit(a)) - Number(isLit(b))),
  };
}

const MarkerUrl = createContext<(kind: EdgeKind) => string>(() => "");

/** The figure frame: a diagram surface with an SVG that defines an arrow head per edge kind. */
export function StateCanvas({ width, height, minWidth, label, children }: { width: number; height: number; minWidth: number; label: string; children: ReactNode }) {
  const svg = useSvgIds();
  return (
    <div className="portal-diagram proc-surface">
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", minWidth, height: "auto", display: "block" }} role="group" aria-label={label}>
        <defs>
          {KINDS.map((kind) => (
            <marker key={kind} id={svg.id(kind)} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill={KIND[kind].stroke} />
            </marker>
          ))}
        </defs>
        <MarkerUrl.Provider value={svg.url}>{children}</MarkerUrl.Provider>
      </svg>
    </div>
  );
}

const origin = (d: string) => d.match(/^M\s*(-?[\d.]+)[\s,]+(-?[\d.]+)/)!.slice(1).map(Number);

/** All transitions, with an animated line on main and lit edges and a moving dot on lit ones. */
export function StateEdges<S extends string>({ focus }: { focus: StateFocus<S> }) {
  const reduced = useReducedMotion();
  const markerUrl = useContext(MarkerUrl);
  return focus.ordered.map((e) => {
    const kind = e.kind ?? "plain";
    const k = KIND[kind];
    const lit = focus.lit(e.id);
    const [x, y] = e.from.length ? [] : origin(e.d);
    return (
      <g key={e.id} className={`arch-rf__edge ${focus.edgeState(e.id)}`}>
        <path
          d={e.d}
          fill="none"
          stroke={k.stroke}
          strokeWidth={k.width ?? 1.8}
          strokeDasharray={e.dash ?? k.dash}
          markerEnd={e.arrow === false ? undefined : markerUrl(kind)}
        />
        {k.flow && (lit || (!focus.focusing && e.main)) && (
          <path d={e.d} fill="none" stroke={k.flow} strokeWidth={2.6} className="arch-flow arch-flow--slow" opacity={focus.focusing ? 1 : 0.55} />
        )}
        {k.packet && lit && !reduced && (
          <circle r={4.5} fill={k.packet} className="arch-packet">
            <animateMotion dur="1.6s" repeatCount="indefinite" path={e.d} />
          </circle>
        )}
        {x !== undefined && <circle cx={x} cy={y} r={k.dot ?? 4.5} fill={k.stroke} />}
      </g>
    );
  });
}

export type EdgeLabel = { edge: string; x: number; y: number; text: string; anchor?: "start" | "middle"; color?: string };

/** Short bold labels that dim and light up with their edge. */
export function StateLabels<S extends string>({ labels, focus }: { labels: readonly EdgeLabel[]; focus: StateFocus<S> }) {
  return labels.map((l) => (
    <text
      key={l.edge}
      x={l.x}
      y={l.y}
      textAnchor={l.anchor ?? "middle"}
      fontSize={10.5}
      fontWeight={700}
      className={`arch-halo arch-rf__edge ${focus.edgeState(l.edge)}`}
      fill={l.color ?? "var(--ax-text-neutral-subtle)"}
    >
      {l.text}
    </text>
  ));
}

const LANE = {
  info: { rx: 12, fill: "none", fillOpacity: undefined, strokeOpacity: 0.7, pill: "var(--ax-bg-info-moderate)" },
  danger: { rx: 14, fill: "var(--ax-bg-danger-soft)", fillOpacity: 0.35, strokeOpacity: 0.45, pill: "var(--ax-bg-danger-moderate)" },
};

/** A dashed frame around the statuses a job acts on, with a pill label centred on its top edge. */
export function Lane({ x, y, w, h, label, tone = "info" }: { x: number; y: number; w: number; h: number; label: string; tone?: keyof typeof LANE }) {
  const l = LANE[tone];
  const t = TONE[tone];
  const pw = label.length * 5.7 + 18;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={l.rx} fill={l.fill} fillOpacity={l.fillOpacity} stroke={t.stroke} strokeOpacity={l.strokeOpacity} strokeDasharray="4 4" />
      <rect x={x + w / 2 - pw / 2} y={y - 8} width={pw} height={16} rx={8} fill={l.pill} />
      <text x={x + w / 2} y={y + 4} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={t.text}>
        {label}
      </text>
    </g>
  );
}

/** A round badge that names the job that moves a case along an edge: a job number, or a slightly smaller letter. */
export function JobBadge({ x, y, label, title, tone = "warning", dim }: { x: number; y: number; label: string | number; title: string; tone?: "warning" | "accent"; dim?: boolean }) {
  return (
    <g className={`proc-sm__badge${dim ? " is-dim" : ""}`}>
      <title>{title}</title>
      <circle cx={x} cy={y} r={9} fill={TONE[tone].strong} stroke="var(--ax-bg-default)" strokeWidth={2} />
      <text x={x} y={y + 3.6} textAnchor="middle" fontSize={/^\d+$/.test(String(label)) ? 10 : 9.5} fontWeight={800} fill={`var(--ax-text-${tone}-contrast)`}>
        {label}
      </text>
    </g>
  );
}

/**
 * A status box that selects the status when clicked. Final statuses get a double border.
 * `children` are drawn on top, for markers in the box's corner.
 */
export function StateNode<S extends string>({
  status: { id, label, tone, final },
  x,
  cy,
  w,
  h,
  focus,
  pressed,
  onToggle,
  children,
}: {
  status: { id: S; label: string; tone: Tone; final?: boolean };
  x: number;
  cy: number;
  w: number;
  h: number;
  focus: StateFocus<S>;
  pressed: boolean;
  onToggle: () => void;
  children?: ReactNode;
}) {
  const t = TONE[tone];
  const y = cy - h / 2;
  return (
    <g
      className={`arch-node ${focus.nodeState(id)}`}
      role="button"
      tabIndex={0}
      aria-pressed={pressed}
      aria-label={`${id}: ${label}`}
      onClick={onToggle}
      onKeyDown={onActivate(onToggle)}
    >
      <rect x={x} y={y} width={w} height={h} rx={10} fill={t.fill} stroke={t.stroke} strokeWidth={1.5} className="arch-box" />
      <rect x={x} y={y} width={w} height={h} rx={10} fill="none" stroke={t.stroke} className="arch-pulse" />
      {final && <rect x={x + 3.5} y={y + 3.5} width={w - 7} height={h - 7} rx={7} fill="none" stroke={t.stroke} strokeWidth={1} opacity={0.8} />}
      <text x={x + w / 2} y={cy - 3} textAnchor="middle" fontSize={10} fontWeight={700} className="arch-mono" fill="var(--ax-text-neutral)">
        {id}
      </text>
      <text x={x + w / 2} y={cy + Math.round(h * 0.27)} textAnchor="middle" fontSize={10.5} fill={t.text}>
        {label}
      </text>
      {children}
    </g>
  );
}

/** Who moves a case into a status: a job (with its number badge), another system, or a free-text event. */
export type Actor = { name: string; badge?: string | number; tone?: "accent"; mono?: boolean };

/** Jobs become numbered, monospaced actors; anything else goes through `other`. */
export const toActors = (names: readonly string[], jobs: Record<string, { no: number }>, other: (name: string) => Actor = (name) => ({ name })): Actor[] =>
  names.map((name) => (name in jobs ? { name, badge: jobs[name].no, mono: true } : other(name)));

/** A comma-separated list of actors for the detail panel. */
export function ActorList({ actors }: { actors: readonly Actor[] }) {
  return actors.map((a, i) => (
    <span key={a.name}>
      {i > 0 && ", "}
      {a.badge !== undefined && (
        <>
          <span className="avs-night__no avs-night__no--inline" data-tone={a.tone}>
            {a.badge}
          </span>{" "}
        </>
      )}
      {a.mono ? <span className="arch-mono">{a.name}</span> : a.name}
    </span>
  ));
}

/** Statuses that exist in the enum but are never set, as chips that open their explanation. */
export function UnusedStatuses<S extends string>({ ids, selected, onToggle }: { ids: readonly S[]; selected: S | null; onToggle: (id: S) => void }) {
  return (
    <HStack gap="space-8" align="center" className="proc-unused">
      <BodyShort size="small" className="arch-subtle">
        Finnes i enumen, men brukes ikke:
      </BodyShort>
      {ids.map((id) => (
        <StatusChip key={id} id={id} tone="neutral" pressed={selected === id} onClick={() => onToggle(id)} />
      ))}
    </HStack>
  );
}
