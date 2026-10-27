"use client";

import type { CSSProperties } from "react";
import { RobotSmileIcon, ShieldCheckmarkIcon } from "@navikt/aksel-icons";
import { useReducedMotion, useSvgIds } from "@/components/architecture/hooks";
import type { Tone } from "@/lib/tones";

const BASE = { x: 220, y: 292 };
const TOP = { x: 220, y: 196 };

/** Bladklynger – hver er en app. Navnløse med vilje: siden handler om mønsteret, ikke om hvem som står hvor. */
const CROWNS: { x: number; y: number; r: number; tone: Tone }[] = [
  { x: 132, y: 168, r: 30, tone: "success" },
  { x: 176, y: 108, r: 34, tone: "meta-lime" },
  { x: 240, y: 74, r: 36, tone: "success" },
  { x: 304, y: 120, r: 32, tone: "meta-lime" },
  { x: 314, y: 182, r: 26, tone: "success" },
  { x: 218, y: 142, r: 30, tone: "accent" },
];

const ROOTS = [
  "M 220 292 C 205 318 160 326 112 352",
  "M 220 292 C 214 330 186 352 168 382",
  "M 220 292 C 222 332 222 360 224 392",
  "M 220 292 C 232 326 262 346 282 380",
  "M 220 292 C 240 314 286 322 336 344",
];
const ROOT_TIPS = [
  { x: 112, y: 352 },
  { x: 168, y: 382 },
  { x: 224, y: 392 },
  { x: 282, y: 380 },
  { x: 336, y: 344 },
];

const branch = (c: { x: number; y: number }) =>
  `M ${TOP.x} ${TOP.y} Q ${((TOP.x + c.x) / 2).toFixed(1)} ${(TOP.y - 6).toFixed(1)} ${c.x} ${c.y}`;

/** Savbaner: fra en rotspiss, opp stammen og ut til et bladklynge. */
const SAP = CROWNS.map((c, i) => {
  const r = ROOT_TIPS[i % ROOT_TIPS.length];
  return `M ${r.x} ${r.y} Q ${((r.x + BASE.x) / 2).toFixed(1)} ${BASE.y + 14} ${BASE.x} ${BASE.y} L ${TOP.x} ${TOP.y} Q ${((TOP.x + c.x) / 2).toFixed(1)} ${TOP.y - 6} ${c.x} ${c.y}`;
});

const POLLEN = Array.from({ length: 16 }, (_, i) => ({
  x: 40 + ((i * 97) % 360),
  y: 60 + ((i * 53) % 220),
  r: 1.2 + (i % 3) * 0.7,
  i,
}));

const depth = (d: number) => ({ "--depth": d }) as CSSProperties;

/**
 * Treet i toppen: Spring Boot er røttene, eux-parent-pom er stammen og appene
 * er bladverket. Versjonene stiger som sevje fra røttene og ut i bladene.
 * Kronen bøyer seg litt mot pekeren, som i vind.
 */
export function HeroArt() {
  const reduced = useReducedMotion();
  const svg = useSvgIds();

  return (
    <div className="avh-hero__art" aria-hidden>
      <svg className="avh-layer" style={depth(0.12)} viewBox="0 0 440 400">
        <defs>
          <radialGradient id={svg.id("sun")}>
            <stop offset="0%" stopColor="var(--ax-bg-warning-moderate)" />
            <stop offset="60%" stopColor="var(--ax-bg-warning-soft)" />
            <stop offset="100%" stopColor="var(--ax-bg-warning-soft)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={330} cy={96} r={84} fill={svg.url("sun")} className="avh-sun" />
        <g className="avh-sunrings">
          <circle cx={330} cy={96} r={58} className="avh-sunring" />
          <circle cx={330} cy={96} r={78} className="avh-sunring avh-sunring--b" />
        </g>
        <path d="M -20 300 C 80 262 150 286 220 280 C 300 272 360 250 460 276 L 460 420 L -20 420 Z" className="avh-hill" />
      </svg>

      <svg className="avh-layer" style={depth(0.3)} viewBox="0 0 440 400">
        <defs>
          <linearGradient id={svg.id("soil")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--ax-bg-brand-beige-moderate)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--ax-bg-brand-beige-soft)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M -20 296 Q 220 284 460 296 L 460 420 L -20 420 Z" fill={svg.url("soil")} />
        <line x1={-20} x2={460} y1={292} y2={292} className="avh-ground" />
        {ROOTS.map((d, i) => (
          <path key={i} d={d} className="avh-root" style={{ "--i": i } as CSSProperties} />
        ))}
        {ROOT_TIPS.map((t, i) => (
          <circle key={i} cx={t.x} cy={t.y} r={3} className="avh-root__tip" style={{ "--i": i } as CSSProperties} />
        ))}
        <text x={BASE.x} y={348} textAnchor="middle" className="avh-tag">
          SPRING BOOT
        </text>
      </svg>

      <svg className="avh-layer avh-layer--tree" style={depth(0.55)} viewBox="0 0 440 400">
        <g className="avh-crown">
          <g className="avh-crown__sway">
            <path d={`M 210 292 C 212 250 214 222 ${TOP.x - 4} ${TOP.y} L ${TOP.x + 4} ${TOP.y} C 226 222 228 250 230 292 Z`} className="avh-trunk" />
            {CROWNS.map((c, i) => (
              <path key={i} d={branch(c)} className="avh-branch" />
            ))}
            {SAP.map((d, i) => (
              <path key={i} id={svg.id(`sap-${i}`)} d={d} className="avh-sap" />
            ))}
            {CROWNS.map((c, i) => (
              <g key={i} transform={`translate(${c.x} ${c.y})`}>
                <g className="avh-leaves" data-tone={c.tone} style={{ "--i": i } as CSSProperties}>
                  <circle r={c.r} />
                  <circle cx={-c.r * 0.55} cy={c.r * 0.25} r={c.r * 0.62} />
                  <circle cx={c.r * 0.55} cy={c.r * 0.3} r={c.r * 0.58} />
                  <circle cx={c.r * 0.1} cy={-c.r * 0.45} r={c.r * 0.6} />
                </g>
                <circle r={3.2} className="avh-bud" style={{ "--i": i } as CSSProperties} />
              </g>
            ))}
            {!reduced &&
              SAP.map((_, i) => (
                <circle key={i} r={2.6} className="avh-drop">
                  <animateMotion dur={`${6.5 + (i % 3) * 0.9}s`} begin={`${-i * 1.15}s`} repeatCount="indefinite" calcMode="paced">
                    <mpath href={svg.href(`sap-${i}`)} />
                  </animateMotion>
                </circle>
              ))}
            <text x={TOP.x} y={252} textAnchor="middle" className="avh-tag avh-tag--trunk" transform={`rotate(-90 ${TOP.x} 252)`}>
              PARENT-POM
            </text>
          </g>
        </g>
        <g className="avh-pollen">
          {POLLEN.map((p) => (
            <circle key={p.i} cx={p.x} cy={p.y} r={p.r} style={{ "--i": p.i } as CSSProperties} />
          ))}
        </g>
      </svg>

      <div className="avh-layer avh-layer--chips" style={depth(1)}>
        <div className="avh-chip avh-chip--version" style={{ "--i": 0 } as CSSProperties}>
          <code>
            <s>&lt;version&gt;</s>
          </code>
          <span>ingen versjon</span>
        </div>
        <div className="avh-chip avh-chip--bot" style={{ "--i": 1 } as CSSProperties}>
          <RobotSmileIcon />
          <span>
            <strong>chore(deps): bump …</strong>
            <span className="avh-chip__sub">Dependabot</span>
          </span>
        </div>
        <div className="avh-chip avh-chip--bom" style={{ "--i": 2 } as CSSProperties}>
          <span className="avh-chip__key">BOM</span>
          <span>spring-boot-dependencies</span>
        </div>
        <div className="avh-chip avh-chip--nais" style={{ "--i": 3 } as CSSProperties}>
          <ShieldCheckmarkIcon />
          <span>NAIS Console</span>
        </div>
      </div>
    </div>
  );
}
