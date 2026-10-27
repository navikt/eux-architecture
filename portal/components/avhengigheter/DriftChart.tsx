"use client";

import { useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { useSvgIds } from "@/components/architecture/hooks";
import { useInView } from "@/components/ny-i-teamet/hooks";
import { DRIFT } from "./data";

const W = 640;
const H = 250;
const X0 = 44;
const X1 = 620;
const Y0 = 196;
const YTOP = 48;
const MAX = 12;

const START = Date.parse("2025-11-01");
const END = Date.parse("2026-11-15");
const MONTHS = ["jan.", "feb.", "mar.", "apr.", "mai", "jun.", "jul.", "aug.", "sep.", "okt.", "nov.", "des."];

const x = (date: string) => X0 + ((Date.parse(date) - START) / (END - START)) * (X1 - X0);
const y = (n: number) => Y0 - (n / MAX) * (Y0 - YTOP);

const POINTS = DRIFT.map((d) => ({ ...d, x: x(d.date), y: y(d.n) }));

const LINE =
  `M ${X0} ${POINTS[0].y.toFixed(1)} ` +
  POINTS.map((p) => `H ${p.x.toFixed(1)} V ${p.y.toFixed(1)}`).join(" ") +
  ` H ${X1}`;
const AREA = `${LINE} V ${Y0} H ${X0} Z`;

const TICKS = Array.from({ length: 13 }, (_, i) => {
  const d = new Date(Date.UTC(2025, 10 + i, 1));
  return { x: x(d.toISOString().slice(0, 10)), label: MONTHS[d.getUTCMonth()], year: d.getUTCMonth() === 0 ? d.getUTCFullYear() : null };
});

const formatDate = (iso: string) => {
  const [yy, mm, dd] = iso.split("-").map(Number);
  return `${dd}. ${MONTHS[mm - 1]} ${yy}`;
};

/**
 * Historikk: avstanden fra Spring i eux-parent-pom, målt som antall
 * overstyrte artefakter. Flate partier på null er målet.
 */
export function DriftChart() {
  const [ref, inView] = useInView<HTMLDivElement>(0.35);
  const [active, setActive] = useState(POINTS.length - 1);
  const svg = useSvgIds();
  const p = POINTS[active];

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    let best = 0;
    POINTS.forEach((q, i) => {
      if (Math.abs(q.x - px) < Math.abs(POINTS[best].x - px)) best = i;
    });
    setActive(best);
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") setActive((i) => Math.min(POINTS.length - 1, i + 1));
    else if (e.key === "ArrowLeft") setActive((i) => Math.max(0, i - 1));
    else return;
    e.preventDefault();
  };

  return (
    <div
      ref={ref}
      className="avh-drift"
      data-in={inView || undefined}
      tabIndex={0}
      role="group"
      aria-label="Historikk: antall overstyrte Spring-versjoner i eux-parent-pom. Bruk piltastene for å bla."
      onKeyDown={onKey}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="avh-drift__svg" onPointerMove={onMove} aria-hidden>
        <defs>
          <linearGradient id={svg.id("area")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--ax-bg-warning-moderate)" />
            <stop offset="100%" stopColor="var(--ax-bg-warning-soft)" stopOpacity="0.15" />
          </linearGradient>
        </defs>

        {[0, 6, 12].map((n) => (
          <g key={n}>
            <line x1={X0} x2={X1} y1={y(n)} y2={y(n)} className={n === 0 ? "avh-drift__base" : "avh-drift__grid"} />
            <text x={X0 - 10} y={y(n) + 4} textAnchor="end" className="avh-drift__axis">
              {n}
            </text>
          </g>
        ))}
        <text x={X1} y={Y0 - 8} textAnchor="end" className="avh-drift__calm">
          Følger Spring
        </text>

        {TICKS.map((t, i) => (
          <g key={i}>
            <line x1={t.x} x2={t.x} y1={Y0} y2={Y0 + 5} className="avh-drift__grid" />
            {i % 2 === 0 && (
              <text x={t.x} y={Y0 + 20} textAnchor="middle" className="avh-drift__axis">
                {t.label}
              </text>
            )}
            {t.year && (
              <text x={t.x} y={Y0 + 36} textAnchor="middle" className="avh-drift__axis avh-drift__year">
                {t.year}
              </text>
            )}
          </g>
        ))}

        <path d={AREA} fill={svg.url("area")} className="avh-drift__area" />
        <path d={LINE} pathLength={1} className="avh-drift__line" />

        {POINTS.filter((q) => q.boot).map((q) => (
          <g key={q.date} transform={`translate(${q.x.toFixed(1)} ${Y0})`} className="avh-drift__boot">
            <circle r={4.5} />
            {q.boot?.endsWith(".0") && (
              <text y={-20} textAnchor="middle">
                {q.boot.slice(0, 3)}
              </text>
            )}
          </g>
        ))}

        <g className="avh-drift__cursor" style={{ "--cx": `${p.x}px` } as CSSProperties}>
          <line x1={0} x2={0} y1={YTOP - 18} y2={Y0} />
          <circle cy={p.y} r={6} />
        </g>
      </svg>

      <div
        className="avh-drift__tip"
        style={{ "--left": `${(p.x / W) * 100}%` } as CSSProperties}
        data-side={p.x > W * 0.62 ? "left" : "right"}
        aria-live="polite"
      >
        <time dateTime={p.date}>{formatDate(p.date)}</time>
        <strong>
          {p.n === 0 ? "Følger Spring" : `${p.n} ${p.n === 1 ? "overstyring" : "overstyringer"}`}
          {p.boot && <span className="avh-drift__ver">Spring Boot {p.boot}</span>}
        </strong>
        <span>{p.text}</span>
      </div>
    </div>
  );
}
