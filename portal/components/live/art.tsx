"use client";

import type { CSSProperties, ReactNode } from "react";
import { useReducedMotion } from "@/components/architecture/hooks";
import { ENVS } from "@/components/miljoer/data";

const depth = (d: number) => ({ "--depth": d }) as CSSProperties;
const BOX = "0 0 420 320";

function Art({ children }: { children: ReactNode }) {
  return (
    <div className="lite-hero__art live-art" aria-hidden>
      {children}
    </div>
  );
}

function Envelope({ tone }: { tone?: string }) {
  return (
    <g className="live-envelope" data-tone={tone}>
      <rect x={-12} y={-8} width={24} height={16} rx={3} />
      <path d="M -11 -6.5 L 0 1.5 L 11 -6.5" />
    </g>
  );
}

function Floaters({ items }: { items: { x: number; y: number; r: number; s: number }[] }) {
  return (
    <svg className="lite-layer" style={depth(0.9)} viewBox={BOX}>
      {items.map((e, i) => (
        <g key={i} transform={`translate(${e.x} ${e.y}) rotate(${e.r}) scale(${e.s})`}>
          <g className="lite-float" style={{ "--i": i } as CSSProperties}>
            <Envelope />
          </g>
        </g>
      ))}
    </svg>
  );
}

function Mover({ path, dur, begin, tone }: { path: string; dur: number; begin: number; tone?: string }) {
  return (
    <g>
      <Envelope tone={tone} />
      <animateMotion dur={`${dur}s`} begin={`${begin}s`} repeatCount="indefinite" path={path} />
      <animate
        attributeName="opacity"
        dur={`${dur}s`}
        begin={`${begin}s`}
        repeatCount="indefinite"
        values="0;1;1;0"
        keyTimes="0;0.12;0.88;1"
      />
    </g>
  );
}

/* ---------- SED-hendelser: to baner med meldinger ---------- */

const LANE_Q1 = "M 40 128 C 140 92, 260 164, 384 118";
const LANE_Q2 = "M 40 206 C 150 242, 270 168, 384 214";

export function HendelserArt() {
  const reduced = useReducedMotion();
  return (
    <Art>
      <svg className="lite-layer" style={depth(0.1)} viewBox={BOX}>
        {[60, 98, 136, 174, 212, 250].map((y) => (
          <line key={y} x1={20} x2={400} y1={y} y2={y} className="live-art__grid" />
        ))}
      </svg>
      <svg className="lite-layer" style={depth(0.45)} viewBox={BOX}>
        {[
          { d: LANE_Q1, env: ENVS.q1, y: 128 },
          { d: LANE_Q2, env: ENVS.q2, y: 206 },
        ].map(({ d, env, y }, i) => (
          <g key={env.id} data-tone={env.tone} className="live-art__lane">
            <path d={d} className="live-art__track" />
            <path d={d} className="live-art__flow" style={{ animationDirection: i ? "reverse" : "normal" }} />
            <g transform={`translate(22 ${y})`}>
              <rect x={-18} y={-12} width={36} height={24} rx={12} className="live-art__pill" />
              <text y={5} textAnchor="middle" className="live-art__pill-text">
                {env.name}
              </text>
            </g>
          </g>
        ))}
        {!reduced && (
          <>
            <Mover path={LANE_Q1} dur={4.2} begin={0} tone={ENVS.q1.tone} />
            <Mover path={LANE_Q1} dur={4.2} begin={2.1} tone={ENVS.q1.tone} />
            <Mover path={LANE_Q2} dur={4.8} begin={1} tone={ENVS.q2.tone} />
            <Mover path={LANE_Q2} dur={4.8} begin={3.4} tone={ENVS.q2.tone} />
          </>
        )}
      </svg>
      <Floaters
        items={[
          { x: 352, y: 284, r: -10, s: 0.85 },
          { x: 96, y: 52, r: 8, s: 0.7 },
          { x: 226, y: 296, r: 4, s: 0.55 },
        ]}
      />
    </Art>
  );
}

/* ---------- SED-kobling: Q1 og Q2 med stoppeklokke ---------- */

const ARC_OUT = "M 122 150 Q 210 54 298 150";
const ARC_BACK = "M 298 182 Q 210 278 122 182";

function Ring({ cx, cy, env }: { cx: number; cy: number; env: (typeof ENVS)["q1"] }) {
  const r = 36;
  return (
    <g className="env-ring" data-tone={env.tone}>
      <circle cx={cx} cy={cy} r={r + 14} className="env-ring__halo" />
      <g className="env-ring__dots" style={{ transformOrigin: `${cx}px ${cy}px` }}>
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return <circle key={i} cx={cx + Math.cos(a) * r} cy={cy + Math.sin(a) * r} r={i % 3 === 0 ? 4.2 : 3} />;
        })}
      </g>
      <text x={cx} y={cy + 8} textAnchor="middle" className="env-ring__label">
        {env.name}
      </text>
      <text x={cx} y={cy + r + 30} textAnchor="middle" className="env-ring__sub">
        {env.institution}
      </text>
    </g>
  );
}

export function KoblingArt() {
  const reduced = useReducedMotion();
  return (
    <Art>
      <svg className="lite-layer" style={depth(0.1)} viewBox={BOX}>
        {[56, 90, 124].map((r) => (
          <g key={r}>
            <circle cx={88} cy={166} r={r} className="env-orbit" />
            <circle cx={332} cy={166} r={r} className="env-orbit" />
          </g>
        ))}
      </svg>
      <svg className="lite-layer" style={depth(0.45)} viewBox={BOX}>
        <path d={ARC_OUT} className="env-arc" />
        <path d={ARC_BACK} className="env-arc env-arc--back" />
        <Ring cx={88} cy={166} env={ENVS.q1} />
        <Ring cx={332} cy={166} env={ENVS.q2} />
        <g className="live-art__clock" transform="translate(210 166)">
          <circle r={22} className="live-art__clock-face" />
          <line x1={0} y1={-22} x2={0} y2={-28} className="live-art__clock-hand" />
          <line x1={0} y1={0} x2={0} y2={-14} className="live-art__clock-hand live-art__clock-spin" />
          <circle r={2.4} className="live-art__clock-pin" />
        </g>
        {!reduced && (
          <>
            <Mover path={ARC_OUT} dur={3.6} begin={0} tone={ENVS.q1.tone} />
            <Mover path={ARC_BACK} dur={3.6} begin={1.8} tone={ENVS.q2.tone} />
          </>
        )}
      </svg>
      <Floaters
        items={[
          { x: 360, y: 54, r: -10, s: 0.75 },
          { x: 64, y: 288, r: 8, s: 0.7 },
          { x: 236, y: 304, r: 4, s: 0.55 },
        ]}
      />
    </Art>
  );
}

/* ---------- SED-er i nEESSI: en bunke SED-er ---------- */

function Doc({ x, y, rot, label, i }: { x: number; y: number; rot: number; label: string; i: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <g className="live-art__doc" style={{ "--i": i } as CSSProperties}>
        <rect x={-58} y={-74} width={116} height={148} rx={10} className="live-art__doc-face" />
        <text x={-42} y={-46} className="live-art__doc-type">
          {label}
        </text>
        {[-24, -8, 8, 24, 40].map((ly, j) => (
          <line key={ly} x1={-42} x2={j % 2 ? 18 : 38} y1={ly} y2={ly} className="live-art__doc-line" />
        ))}
      </g>
    </g>
  );
}

export function NeessiArt() {
  return (
    <Art>
      <svg className="lite-layer" style={depth(0.1)} viewBox={BOX}>
        {Array.from({ length: 7 }, (_, r) =>
          Array.from({ length: 9 }, (_, c) => (
            <circle key={`${r}-${c}`} cx={50 + c * 40} cy={46 + r * 40} r={1.6} className="live-art__dot" />
          )),
        )}
      </svg>
      <svg className="lite-layer" style={depth(0.45)} viewBox={BOX}>
        <Doc x={160} y={172} rot={-9} label="H001" i={0} />
        <Doc x={214} y={162} rot={3} label="F001" i={1} />
        <Doc x={268} y={168} rot={11} label="A003" i={2} />
        <g transform="translate(316 92)" className="live-art__check" data-tone="success">
          <circle r={22} />
          <path d="M -9 1 L -2 8 L 10 -6" />
        </g>
      </svg>
      <Floaters
        items={[
          { x: 70, y: 70, r: -8, s: 0.75 },
          { x: 360, y: 270, r: 10, s: 0.8 },
          { x: 120, y: 290, r: 4, s: 0.55 },
        ]}
      />
    </Art>
  );
}
