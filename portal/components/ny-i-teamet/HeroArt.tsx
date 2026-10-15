"use client";

import type { CSSProperties } from "react";
import { CloudIcon, CheckmarkIcon } from "@navikt/aksel-icons";
import { useReducedMotion } from "@/components/architecture/hooks";
import { ring, starPath } from "./hooks";

const C = { x: 220, y: 200 };
const STARS = ring(12, 150, C.x, C.y);
const STAR = starPath(9);
/** Every other star sends and receives SED-er. */
const ROUTES = STARS.filter((_, i) => i % 2 === 1).map((s, i) => {
  const mx = (s.x + C.x) / 2 + (s.y - C.y) * 0.28;
  const my = (s.y + C.y) / 2 - (s.x - C.x) * 0.28;
  return { d: `M ${s.x.toFixed(1)} ${s.y.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${C.x} ${C.y}`, i };
});
const TEAM = ring(8, 62, 0, 0);

const depth = (d: number) => ({ "--depth": d }) as CSSProperties;

/**
 * Fire lag som beveger seg i ulik fart når siden rulles og når pekeren flyttes:
 * baner bakerst, EU-stjernene, Nav i midten med SED-er inn og ut, og løse kort foran.
 */
export function HeroArt() {
  const reduced = useReducedMotion();

  return (
    <div className="ny-hero__art" aria-hidden>
      <svg className="ny-layer" style={depth(0.1)} viewBox="0 0 440 400">
        <g className="ny-orbits">
          <ellipse cx={C.x} cy={C.y} rx={205} ry={120} className="ny-orbit" />
          <ellipse cx={C.x} cy={C.y} rx={175} ry={175} className="ny-orbit ny-orbit--b" />
          <ellipse cx={C.x} cy={C.y} rx={120} ry={205} className="ny-orbit ny-orbit--c" />
        </g>
      </svg>

      <svg className="ny-layer" style={depth(0.35)} viewBox="0 0 440 400">
        {STARS.map((s, i) => (
          <g key={i} transform={`translate(${s.x.toFixed(1)} ${s.y.toFixed(1)})`}>
            <path d={STAR} className="ny-star" style={{ "--i": i } as CSSProperties} />
          </g>
        ))}
      </svg>

      <svg className="ny-layer" style={depth(0.6)} viewBox="0 0 440 400">
        {ROUTES.map((r) => (
          <path key={r.i} id={`ny-route-${r.i}`} d={r.d} className="ny-route" style={{ "--i": r.i } as CSSProperties} />
        ))}
        {!reduced &&
          ROUTES.map((r) => (
            <g key={r.i} className="ny-sed">
              <rect x={-9} y={-6} width={18} height={12} rx={2} />
              <path d="M -8.5 -5 L 0 1.5 L 8.5 -5" />
              <animateMotion
                dur={`${5 + (r.i % 3)}s`}
                begin={`${-r.i * 0.9}s`}
                repeatCount="indefinite"
                keyPoints={r.i % 4 === 1 ? "0;1" : "1;0"}
                keyTimes="0;1"
                calcMode="linear"
              >
                <mpath href={`#ny-route-${r.i}`} />
              </animateMotion>
            </g>
          ))}
        <g transform={`translate(${C.x} ${C.y})`}>
          <circle r={86} className="ny-core__halo" />
          <circle r={46} className="ny-core" />
          <g className="ny-core__team">
            {TEAM.map((p, i) => (
              <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r={5} style={{ "--i": i } as CSSProperties} />
            ))}
          </g>
          <text y={-2} textAnchor="middle" className="ny-core__name">
            Nav
          </text>
          <text y={15} textAnchor="middle" className="ny-core__sub">
            EESSI
          </text>
        </g>
      </svg>

      <div className="ny-layer ny-layer--chips" style={depth(1)}>
        <div className="ny-chip ny-chip--slack" style={{ "--i": 0 } as CSSProperties}>
          <span className="ny-chip__hash">#</span>
          <span>
            <strong>team-eessi-nav-intern</strong>
            <span className="ny-chip__msg">
              Velkommen! <span className="ny-wave">👋</span>
            </span>
          </span>
        </div>
        <div className="ny-chip ny-chip--jira" style={{ "--i": 1 } as CSSProperties}>
          <span className="ny-chip__key">TEN</span>
          <span className="ny-chip__lines">
            <span />
            <span />
          </span>
          <CheckmarkIcon className="ny-chip__ok" />
        </div>
        <div className="ny-chip ny-chip--sed" style={{ "--i": 2 } as CSSProperties}>
          <span className="ny-chip__doc">SED</span>
          <span className="ny-chip__lines">
            <span />
            <span />
            <span />
          </span>
        </div>
        <div className="ny-chip ny-chip--nais" style={{ "--i": 3 } as CSSProperties}>
          <CloudIcon />
          <span>NAIS</span>
        </div>
      </div>
    </div>
  );
}
