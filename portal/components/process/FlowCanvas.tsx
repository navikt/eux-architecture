"use client";

import { createContext, useContext, type ReactNode, type Ref, type SVGProps } from "react";
import { useReducedMotion, useSvgIds } from "@/components/architecture/hooks";
import { TONE, type Tone } from "@/lib/tones";

/*
 * SVG building blocks for the system-flow figures on the process pages.
 * Coordinates are in the figure's viewBox units.
 */

type NodeProps = SVGProps<SVGGElement>;

const ArrowUrl = createContext<string | undefined>(undefined);

/** The figure frame: a diagram surface with an SVG that defines the shared arrow head. */
export function FlowCanvas({
  width,
  height,
  minWidth,
  label,
  ref,
  children,
}: {
  width: number;
  height: number;
  minWidth: number;
  label: string;
  ref?: Ref<SVGSVGElement>;
  children: ReactNode;
}) {
  const svg = useSvgIds();
  return (
    <div className="portal-diagram proc-surface">
      <svg
        ref={ref}
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", minWidth, height: "auto", display: "block" }}
        role="group"
        aria-label={label}
      >
        <defs>
          <marker id={svg.id("arrow")} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--ax-border-neutral-strong)" />
          </marker>
        </defs>
        <ArrowUrl.Provider value={svg.url("arrow")}>{children}</ArrowUrl.Provider>
      </svg>
    </div>
  );
}

/** A path that ends in the canvas's arrow head. */
export function ArrowPath(props: SVGProps<SVGPathElement>) {
  return <path {...props} markerEnd={useContext(ArrowUrl)} />;
}

/**
 * A connection between two boxes. `state` is "is-lit", "is-dim" or "". Lit edges get an animated
 * accent line on top; `quiet` draws a thinner line without it.
 */
export function FlowEdge({ d, state, dashed, quiet }: { d: string; state: string; dashed?: boolean; quiet?: boolean }) {
  return (
    <g className={`arch-rf__edge ${state}`}>
      <ArrowPath
        d={d}
        stroke="var(--ax-border-neutral-strong)"
        strokeOpacity={quiet ? 0.55 : 0.75}
        strokeWidth={quiet ? 1.4 : 1.6}
        strokeDasharray={dashed ? "5 4" : undefined}
        fill="none"
      />
      {!quiet && <path d={d} stroke="var(--ax-border-accent)" strokeWidth={2.6} fill="none" className="arch-flow arch-flow--slow" />}
    </g>
  );
}

/** A short label on an edge, dimmed and lit together with it. */
export function EdgeLabel({
  x,
  y,
  state,
  anchor = "middle",
  mono,
  children,
}: {
  x: number;
  y: number;
  state: string;
  anchor?: "start" | "middle";
  mono?: boolean;
  children: ReactNode;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fontSize={mono ? 10 : 10.5}
      fontWeight={600}
      className={`arch-halo arch-rf__edge ${state}${mono ? " arch-mono" : ""}`}
      fill="var(--ax-text-neutral-subtle)"
    >
      {children}
    </text>
  );
}

export type Packet = { d: string; dur: number; begin?: number };

/** Dots that loop along paths. Not drawn when the user prefers reduced motion. */
export function Packets({ packets }: { packets: readonly Packet[] }) {
  const reduced = useReducedMotion();
  if (reduced) return null;
  return packets.map((p, i) => (
    <circle key={i} r={5} fill="var(--ax-bg-accent-strong)" className="arch-packet">
      <animateMotion dur={`${p.dur}s`} begin={`${p.begin ?? 0}s`} repeatCount="indefinite" path={p.d} />
    </circle>
  ));
}

/** A dashed area that groups boxes, such as the Kafka topics. The label sits `labelAt` from the top-left corner. */
export function Zone({
  x,
  y,
  w,
  h,
  tone,
  label,
  fillOpacity = 0.45,
  labelAt = [14, 17],
  dim,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  tone: Tone;
  label: string;
  fillOpacity?: number;
  labelAt?: [number, number];
  dim?: boolean;
}) {
  const t = TONE[tone];
  return (
    <g className={`arch-rf__group${dim ? " is-dim" : ""}`}>
      <rect x={x} y={y} width={w} height={h} rx={14} fill={t.fill} fillOpacity={fillOpacity} stroke={t.stroke} strokeOpacity={0.5} strokeDasharray="5 5" />
      <text x={x + labelAt[0]} y={y + labelAt[1]} fontSize={10} className="arch-eyebrow-svg" fill={t.text}>
        {label}
      </text>
    </g>
  );
}

/** A small pill on a system's edge that names an interface, such as NIE or CPI. */
export function Port({ x, cy, label }: { x: number; cy: number; label: string }) {
  return (
    <g>
      <rect x={x} y={cy - 11} width={46} height={22} rx={11} fill="var(--ax-bg-info-strong)" />
      <text x={x + 23} y={cy + 4} textAnchor="middle" fontSize={10.5} fontWeight={800} letterSpacing="0.06em" fill="var(--ax-text-info-contrast)">
        {label}
      </text>
    </g>
  );
}

/** A Kafka topic: a rounded pill with a stack of bars, the topic name and an optional tag on the right. */
export function Topic({
  x,
  cy,
  w,
  h = 30,
  name,
  tone = "meta-purple",
  tag,
  props,
}: {
  x: number;
  cy: number;
  w: number;
  h?: number;
  name: string;
  tone?: Tone;
  tag?: string;
  props: NodeProps;
}) {
  const t = TONE[tone];
  return (
    <g {...props}>
      <rect x={x} y={cy - h / 2} width={w} height={h} rx={h / 2} fill="var(--ax-bg-default)" stroke={t.stroke} strokeWidth={1.5} className="arch-box" />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={x + 12 + i * 6} y={cy - 7} width={3.5} height={14} rx={1.5} fill={t.stroke} opacity={0.35 + i * 0.2} />
      ))}
      <text x={x + 42} y={cy + 4} fontSize={10.8} className="arch-mono" fill="var(--ax-text-neutral)">
        {name}
      </text>
      {tag && (
        <text x={x + w - 12} y={cy + 3.5} textAnchor="end" fontSize={9} fontWeight={800} letterSpacing="0.08em" fill={t.text}>
          {tag.toUpperCase()}
        </text>
      )}
    </g>
  );
}

/** A small system box with a title and a sub-line. */
export function Box({
  x,
  y,
  w,
  h,
  title,
  sub,
  tone,
  props,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  sub: string;
  tone: Tone;
  props: NodeProps;
}) {
  const t = TONE[tone];
  return (
    <g {...props}>
      <rect x={x} y={y} width={w} height={h} rx={11} fill={t.fill} stroke={t.stroke} strokeWidth={1.5} className="arch-box" />
      <text x={x + w / 2} y={y + 20} textAnchor="middle" fontSize={12.5} fontWeight={700} fill="var(--ax-text-neutral)">
        {title}
      </text>
      <text x={x + w / 2} y={y + 35} textAnchor="middle" fontSize={10} fill="var(--ax-text-neutral-subtle)">
        {sub}
      </text>
    </g>
  );
}
