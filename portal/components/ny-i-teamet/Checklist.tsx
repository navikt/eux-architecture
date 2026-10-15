"use client";

import { useSyncExternalStore, type CSSProperties } from "react";
import NextLink from "next/link";
import { ArrowRightIcon, CheckmarkIcon, ExternalLinkIcon } from "@navikt/aksel-icons";
import { CHECKLIST } from "./data";
import { ring, starPath } from "./hooks";

const KEY = "eux-portal-ny-i-teamet";
const EVENT = "ny-i-teamet-sjekkliste";
const EMPTY = "[]";

const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
};

const read = () => {
  try {
    return localStorage.getItem(KEY) ?? EMPTY;
  } catch {
    return EMPTY;
  }
};

const write = (ids: string[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* privat modus o.l. – sjekklisten huskes bare ikke */
  }
  window.dispatchEvent(new Event(EVENT));
};

const parse = (raw: string): string[] => {
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
};

const STARS = ring(12, 74, 0, 0);
const STAR = starPath(6);

/** Sjekkliste for de første dagene. Huskes i nettleseren. */
export function Checklist() {
  const raw = useSyncExternalStore(subscribe, read, () => EMPTY);
  const done = new Set(parse(raw));
  const count = CHECKLIST.filter((c) => done.has(c.id)).length;
  const all = count === CHECKLIST.length;
  const pct = count / CHECKLIST.length;

  const toggle = (id: string) => {
    const next = new Set(done);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    write([...next]);
  };

  return (
    <div className="ny-check" data-all={all || undefined}>
      <div className="ny-check__progress">
        <svg viewBox="-90 -90 180 180" className="ny-check__ring" aria-hidden>
          <circle r={56} className="ny-check__track" pathLength={100} />
          <circle r={56} className="ny-check__fill" pathLength={100} style={{ "--p": pct } as CSSProperties} />
          <g className="ny-check__stars">
            {STARS.map((s, i) => (
              <g key={i} transform={`translate(${s.x.toFixed(1)} ${s.y.toFixed(1)})`}>
                <path d={STAR} style={{ "--i": i } as CSSProperties} />
              </g>
            ))}
          </g>
          <text y={6} textAnchor="middle" className="ny-check__n">
            {count}/{CHECKLIST.length}
          </text>
        </svg>
        <p className="ny-check__status" aria-live="polite">
          {all ? "Sånn. Da er du godt i gang." : count === 0 ? "Huk av etter hvert. Listen huskes i nettleseren din." : `${count} av ${CHECKLIST.length} gjort.`}
        </p>
        {count > 0 && (
          <button type="button" className="ny-check__reset" onClick={() => write([])}>
            Nullstill
          </button>
        )}
      </div>

      <ul className="ny-check__list">
        {CHECKLIST.map((c, i) => {
          const checked = done.has(c.id);
          return (
            <li key={c.id} data-done={checked || undefined} style={{ "--i": i } as CSSProperties}>
              <label className="ny-check__item">
                <input type="checkbox" checked={checked} onChange={() => toggle(c.id)} />
                <span className="ny-check__box" aria-hidden>
                  <CheckmarkIcon />
                </span>
                <span className="ny-check__text">{c.text}</span>
              </label>
              {c.href &&
                (c.external ? (
                  <a href={c.href} target="_blank" rel="noreferrer" className="ny-check__go">
                    Åpne <ExternalLinkIcon title="åpnes i ny fane" />
                  </a>
                ) : (
                  <NextLink href={c.href} className="ny-check__go">
                    Gå til <ArrowRightIcon aria-hidden />
                  </NextLink>
                ))}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
