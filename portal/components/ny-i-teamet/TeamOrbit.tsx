"use client";

import { useState, type CSSProperties } from "react";
import { ROLES, TEAM_SIZE, type RoleId } from "./data";
import { ring, useInView } from "./hooks";

const SEATS = ROLES.flatMap((r) => Array.from({ length: r.count }, () => r));
const POS = ring(SEATS.length, 116, 160, 160);
const DOTS = ring(12, 64, 160, 160);

/** Teamet som en konstellasjon. Pek på en rolle for å se hvem som har den. */
export function TeamOrbit() {
  const [hover, setHover] = useState<RoleId | null>(null);
  const [pinned, setPinned] = useState<RoleId | null>(null);
  const focus = hover ?? pinned;
  const [ref, inView] = useInView<HTMLDivElement>();

  return (
    <div ref={ref} className="ny-team" data-in={inView || undefined} data-focus={focus ?? undefined}>
      <svg viewBox="0 0 320 320" className="ny-team__svg" role="img" aria-label={`${TEAM_SIZE} personer i teamet`}>
        <circle cx={160} cy={160} r={116} className="ny-team__orbit" />
        <circle cx={160} cy={160} r={146} className="ny-team__orbit ny-team__orbit--outer" />
        <g className="ny-team__dots">
          {DOTS.map((d, i) => (
            <circle key={i} cx={d.x.toFixed(1)} cy={d.y.toFixed(1)} r={2.2} />
          ))}
        </g>
        <text x={160} y={166} textAnchor="middle" className="ny-team__n">
          {TEAM_SIZE}
        </text>
        <text x={160} y={188} textAnchor="middle" className="ny-team__label">
          i teamet
        </text>
        <g className="ny-team__spin">
          {SEATS.map((r, i) => (
            <g
              key={i}
              className="ny-seat"
              data-tone={r.tone}
              data-role={r.id}
              style={{ "--i": i, "--x": `${POS[i].x.toFixed(1)}px`, "--y": `${POS[i].y.toFixed(1)}px` } as CSSProperties}
            >
              <g className="ny-seat__body">
                <circle r={24} className="ny-seat__bg" />
                <circle cy={-6} r={7} className="ny-seat__head" />
                <path d="M -12 14 Q -12 3 0 3 Q 12 3 12 14 Z" className="ny-seat__head" />
              </g>
            </g>
          ))}
        </g>
      </svg>

      <ul className="ny-team__legend">
        {ROLES.map((r, i) => (
          <li key={r.id}>
            <button
              type="button"
              className="ny-role"
              data-tone={r.tone}
              aria-pressed={pinned === r.id}
              style={{ "--i": i } as CSSProperties}
              onMouseEnter={() => setHover(r.id)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(r.id)}
              onBlur={() => setHover(null)}
              onClick={() => {
                setHover(null);
                setPinned((p) => (p === r.id ? null : r.id));
              }}
            >
              <span className="ny-role__n">{r.count}</span>
              <span className="ny-role__body">
                <strong>{r.plural}</strong>
                <span>{r.text}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
