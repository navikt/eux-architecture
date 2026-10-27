"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { BodyLong, Detail, Heading } from "@navikt/ds-react";
import { useReducedMotion } from "@/components/architecture/hooks";
import { ring, useInView } from "@/components/ny-i-teamet/hooks";
import { CYCLE } from "./data";

const N = CYCLE.length;
const SPOTS = ring(N, 40, 50, 50);

/**
 * Rytmen fra Spring Boot-slipp til skannet image, som en sirkel. Kometen
 * vandrer rolig fra steg til steg; pek på et steg for å stoppe ved det.
 */
export function Cycle() {
  const reduced = useReducedMotion();
  const [ref, inView] = useInView<HTMLDivElement>(0.4);
  const [turn, setTurn] = useState(0);
  const [held, setHeld] = useState(false);
  const active = turn % N;

  useEffect(() => {
    if (reduced || held || !inView) return;
    const t = window.setInterval(() => setTurn((v) => v + 1), 5200);
    return () => window.clearInterval(t);
  }, [reduced, held, inView]);

  const pick = (i: number) => setTurn((v) => v + ((i - (v % N) + N) % N));
  const step = CYCLE[active];

  return (
    <div
      ref={ref}
      className="avh-cycle"
      data-in={inView || undefined}
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
    >
      <div className="avh-cycle__orbit">
        <svg viewBox="0 0 100 100" aria-hidden>
          <circle cx={50} cy={50} r={40} className="avh-cycle__track" />
          <circle cx={50} cy={50} r={40} className="avh-cycle__dash" />
          <g className="avh-cycle__comet" style={{ "--turn": turn } as CSSProperties}>
            <circle cx={50} cy={10} r={4.5} className="avh-cycle__halo" />
            <circle cx={50} cy={10} r={2.2} />
          </g>
        </svg>
        <div className="avh-cycle__core" aria-hidden>
          <span className="avh-cycle__n">
            {active + 1}
            <small>/{N}</small>
          </span>
          <span className="avh-cycle__who">{step.who}</span>
        </div>
        <ol className="avh-cycle__steps">
          {CYCLE.map((c, i) => (
            <li
              key={c.title}
              data-tone={c.tone}
              style={{ left: `${SPOTS[i].x}%`, top: `${SPOTS[i].y}%`, "--i": i } as CSSProperties}
            >
              <button
                type="button"
                aria-pressed={active === i}
                onClick={() => pick(i)}
                onPointerEnter={(e) => e.pointerType === "mouse" && pick(i)}
              >
                <span className="avh-cycle__dot" aria-hidden>
                  {i + 1}
                </span>
                <span className="avh-cycle__label">{c.title}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="avh-cycle__detail" data-tone={step.tone} aria-live="polite" key={active}>
        <Detail className="arch-eyebrow">
          Steg {active + 1} · {step.who}
        </Detail>
        <Heading level="3" size="medium" spacing>
          {step.title}
        </Heading>
        <BodyLong>{step.text}</BodyLong>
      </div>
    </div>
  );
}
