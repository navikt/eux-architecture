"use client";

import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { useInView } from "@/components/ny-i-teamet/hooks";
import {
  BOOT_LINES,
  BOOT_RELEASES,
  OVERRIDE_END,
  OVERRIDE_LANES,
  OVERRIDE_WINDOW,
  type OverridePeriod,
} from "./data";

const START = Date.parse(OVERRIDE_WINDOW.start);
const END = Date.parse(OVERRIDE_WINDOW.end);
const DAY = 86_400_000;
const MONTHS = [
  "jan.",
  "feb.",
  "mar.",
  "apr.",
  "mai",
  "jun.",
  "jul.",
  "aug.",
  "sep.",
  "okt.",
  "nov.",
  "des.",
];

const pct = (iso: string) =>
  Math.min(100, Math.max(0, ((Date.parse(iso) - START) / (END - START)) * 100));

const AXIS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(Date.UTC(2025, 10 + i, 1));
  const m = d.getUTCMonth();
  return {
    left: pct(d.toISOString().slice(0, 10)),
    label: MONTHS[m],
    year: i === 0 || m === 0 ? d.getUTCFullYear() : null,
  };
});

const formatDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d}. ${MONTHS[m - 1]} ${y}`;
};

const duration = (p: OverridePeriod) => {
  const days = Math.round((Date.parse(p.end) - Date.parse(p.start)) / DAY);
  if (days < 60) return `${days} dager`;
  const months = Math.round(days / 30.44);
  if (months < 12) return `${months} måneder`;
  const y = Math.floor(months / 12);
  const rest = months % 12;
  return `${y} år${rest ? ` og ${rest} ${rest === 1 ? "måned" : "måneder"}` : ""}`;
};

let counter = 0;
const LANES = OVERRIDE_LANES.map((lane) => ({
  ...lane,
  periods: lane.periods.map((p) => ({ ...p, lib: lane.lib, i: counter++ })),
}));
const PERIODS = LANES.flatMap((lane) => lane.periods);

/**
 * Historikk: når eux-parent-pom satte versjoner selv i stedet for å følge
 * Spring Boot. Én rad per bibliotek, én stolpe per periode.
 */
export function OverrideTimeline() {
  const [ref, inView] = useInView<HTMLDivElement>(0.3);
  const [active, setActive] = useState(PERIODS.length - 2);
  const [hover, setHover] = useState<{ left: number; label: string } | null>(
    null,
  );
  const guides = useRef<HTMLDivElement>(null);
  const sel = PERIODS[active];
  const end = OVERRIDE_END[sel.kind];

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = guides.current?.getBoundingClientRect();
    if (!r) return;
    const f = (e.clientX - r.left) / r.width;
    if (f < 0 || f > 1) return setHover(null);
    const iso = new Date(START + f * (END - START)).toISOString().slice(0, 10);
    const [y, m] = iso.split("-").map(Number);
    setHover({ left: f * 100, label: `${MONTHS[m - 1]} ${y}` });
  };

  return (
    <div ref={ref} className="avh-ot" data-in={inView || undefined}>
      <div className="avh-ot__scroll">
        <div
          className="avh-ot__grid"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          <div ref={guides} className="avh-ot__guides" aria-hidden>
            {AXIS.map((t) => (
              <i key={t.left} style={{ left: `${t.left}%` }} />
            ))}
            <span
              className="avh-ot__band"
              style={{
                left: `${pct(sel.start)}%`,
                width: `${pct(sel.end) - pct(sel.start)}%`,
              }}
            />
            {hover && (
              <span className="avh-ot__hair" style={{ left: `${hover.left}%` }}>
                <b>{hover.label}</b>
              </span>
            )}
          </div>

          <span className="avh-ot__corner" aria-hidden />
          <div className="avh-ot__axis" aria-hidden>
            {AXIS.map((t) => (
              <span key={t.left} style={{ left: `${t.left}%` }}>
                {t.label}
                {t.year && <em>{t.year}</em>}
              </span>
            ))}
          </div>

          <div className="avh-ot__label avh-ot__label--boot">
            <strong>Spring Boot</strong>
            <span>i eux-parent-pom</span>
          </div>
          <div className="avh-ot__track avh-ot__track--boot">
            {BOOT_LINES.map((b) => (
              <span
                key={b.line}
                className="avh-ot__line"
                data-short={pct(b.end) - pct(b.start) < 10 || undefined}
                style={{
                  left: `${pct(b.start)}%`,
                  width: `${pct(b.end) - pct(b.start)}%`,
                }}
              >
                {b.line}
              </span>
            ))}
            {BOOT_RELEASES.map((r) => (
              <span
                key={r.version}
                className="avh-ot__release"
                data-on={r.date === sel.end || undefined}
                style={{ left: `${pct(r.date)}%` }}
                title={`Spring Boot ${r.version} · ${formatDate(r.date)}`}
              >
                <span className="aksel-sr-only">
                  Spring Boot {r.version}, {formatDate(r.date)}
                </span>
              </span>
            ))}
          </div>

          <div className="avh-ot__divider" aria-hidden>
            Overstyrt i eux-parent-pom
          </div>

          {LANES.map((lane) => (
            <div key={lane.lib} className="avh-ot__row">
              <div className="avh-ot__label">
                <strong>{lane.lib}</strong>
                <span>{lane.note}</span>
              </div>
              <div className="avh-ot__track">
                {lane.periods.map(({ i, ...p }) => {
                  const left = pct(p.start);
                  return (
                    <button
                      key={p.start}
                      type="button"
                      className="avh-ot__bar"
                      data-kind={p.kind}
                      data-since={p.since ? true : undefined}
                      aria-pressed={i === active}
                      aria-label={`${lane.lib}, ${p.since ? `fra ${p.since}` : formatDate(p.start)} til ${formatDate(p.end)}`}
                      style={
                        {
                          left: `${left}%`,
                          width: `${pct(p.end) - left}%`,
                          "--i": i,
                        } as CSSProperties
                      }
                      onPointerEnter={() => setActive(i)}
                      onFocus={() => setActive(i)}
                      onClick={() => setActive(i)}
                    >
                      {p.since && (
                        <span className="avh-ot__since">siden {p.since}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="avh-ot__detail" data-tone={end.tone} aria-live="polite">
        <div key={active} className="avh-ot__swap">
          <div className="avh-ot__when">
            <strong>{sel.lib}</strong>
            <span>
              {sel.since
                ? `${MONTHS[Number(sel.start.slice(5, 7)) - 1]} ${sel.since}`
                : formatDate(sel.start)}{" "}
              – {formatDate(sel.end)}
            </span>
            <span className="avh-ot__meta">
              <code>{sel.versions}</code> · {duration(sel)}
            </span>
          </div>
          <dl>
            <div>
              <dt>Hvorfor</dt>
              <dd>{sel.why}</dd>
            </div>
            <div>
              <dt>
                Slutten <span className="avh-ot__kind">{end.label}</span>
              </dt>
              <dd>{sel.ended}</dd>
            </div>
          </dl>
        </div>
      </div>

      <ul
        className="avh-ot__legend"
        aria-label="Hvordan overstyringene tok slutt"
      >
        {Object.entries(OVERRIDE_END).map(([k, v]) => (
          <li key={k} data-kind={k}>
            <i aria-hidden />
            {v.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
