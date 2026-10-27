"use client";

import { useState, type CSSProperties, type PointerEvent } from "react";
import { BodyLong, Detail } from "@navikt/ds-react";
import { useReducedMotion } from "@/components/architecture/hooks";
import { useInView } from "@/components/ny-i-teamet/hooks";
import { TOKEN_SYNC_HISTORY, TOKEN_SYNC_STEPS } from "./data";

const TEETH = 12;
const STEP = 360 / TEETH;
const OUTER = 44;
const ROOT = 35;
const A = { x: 104, y: 96 };
const B = { x: A.x + OUTER + ROOT + 2, y: A.y };
const MESH = (A.x + B.x) / 2;
/* Rett over inngrepet, der tannhjulene skilles. */
const BEAT_Y = A.y - 22;

const polar = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`;
};

/** Tannhjul rundt origo, med en tann som peker mot 0°. */
const GEAR = (() => {
  let d = `M ${polar(ROOT, -STEP * 0.3)}`;
  for (let k = 0; k < TEETH; k++) {
    const c = k * STEP;
    d += ` L ${polar(OUTER, c - STEP * 0.17)}`;
    d += ` A ${OUTER} ${OUTER} 0 0 1 ${polar(OUTER, c + STEP * 0.17)}`;
    d += ` L ${polar(ROOT, c + STEP * 0.3)}`;
    d += ` A ${ROOT} ${ROOT} 0 0 1 ${polar(ROOT, c + STEP * 0.7)}`;
  }
  return `${d} Z`;
})();

const HOLES = Array.from({ length: 5 }, (_, i) => polar(22, i * 72 - 90).split(" ").map(Number));

function Gear({ tone, phase }: { tone: string; phase: number }) {
  return (
    <g transform={`rotate(${phase})`} data-tone={tone}>
      <path d={GEAR} className="avh-gear__body" />
      {HOLES.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={5} className="avh-gear__hole" />
      ))}
      <circle r={12} className="avh-gear__hub" />
      <circle r={4} className="avh-gear__axle" />
    </g>
  );
}

/**
 * Spring Boot-versjonen i eux-parent-pom følger den token-support er bygget med.
 * To tannhjul i inngrep: de går i takt, følger pekeren og tar én tann per
 * historikkpunkt.
 */
export function TokenSync() {
  const [ref, inView] = useInView<HTMLDivElement>(0.3);
  const reduced = useReducedMotion();
  const [active, setActive] = useState(TOKEN_SYNC_HISTORY.length - 1);

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (reduced || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--tx", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
  };

  return (
    <div ref={ref} className="avh-sync" data-in={inView || undefined}>
      <div
        className="avh-sync__art"
        style={{ "--tick": `${active * STEP}deg` } as CSSProperties}
        onPointerMove={onMove}
        onPointerLeave={(e) => e.currentTarget.style.setProperty("--tx", "0")}
      >
        <svg viewBox="0 0 290 190" aria-hidden className="avh-sync__svg">
          <line x1={MESH} x2={MESH} y1={30} y2={BEAT_Y} className="avh-sync__beam" />
          <text x={MESH} y={22} textAnchor="middle" className="avh-tag">
            SPRING BOOT
          </text>

          <g transform={`translate(${A.x} ${A.y})`}>
            <g className="avh-gear avh-gear--a">
              <g className="avh-gear__spin">
                <Gear tone="meta-purple" phase={0} />
              </g>
            </g>
          </g>
          <g transform={`translate(${B.x} ${B.y})`}>
            <g className="avh-gear avh-gear--b">
              <g className="avh-gear__spin">
                <Gear tone="accent" phase={STEP / 2} />
              </g>
            </g>
          </g>

          <circle cx={MESH} cy={BEAT_Y} r={3} className="avh-sync__beat" />

          <text x={A.x - 14} y={166} textAnchor="middle" className="avh-sync__label">
            token-support
          </text>
          <text x={B.x + 14} y={166} textAnchor="middle" className="avh-sync__label">
            eux-parent-pom
          </text>
        </svg>

        <div className="avh-sync__eq">
          <span>
            <small>token-support · pom.xml</small>
            <code>&lt;spring-boot.version&gt;</code>
          </span>
          <b aria-label="er lik">=</b>
          <span>
            <small>eux-parent-pom · pom.xml</small>
            <code>&lt;spring.boot.version&gt;</code>
          </span>
        </div>
      </div>

      <div className="avh-sync__body">
        <BodyLong size="small" className="arch-subtle">
          token-support validerer og henter tokens fra Azure AD og TokenX – det er det som slipper brukere og andre apper
          inn. Biblioteket bygges og testes mot én bestemt Spring Boot-versjon. Bruker vi den samme, kjører innloggingen
          vår på akkurat det oppsettet den er testet på.
        </BodyLong>
        <ol className="avh-sync__steps">
          {TOKEN_SYNC_STEPS.map((s, i) => (
            <li key={s.title}>
              <span aria-hidden>{i + 1}</span>
              <strong>{s.title}</strong>
              <BodyLong size="small">{s.text}</BodyLong>
            </li>
          ))}
        </ol>
      </div>

      <div className="avh-sync__history">
        <Detail className="arch-eyebrow">Historikk · eux-parent-pom og token-support</Detail>
        <ol>
          {TOKEN_SYNC_HISTORY.map((h, i) => (
            <li
              key={h.date}
              data-active={i === active || undefined}
              onPointerEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              tabIndex={0}
            >
              <time>{h.date}</time>
              <span className="avh-sync__pair">
                <span>Spring Boot {h.boot}</span>
                <span>
                  <i aria-hidden>⇄</i> token-support {h.token}
                </span>
              </span>
              <small>{h.note}</small>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
