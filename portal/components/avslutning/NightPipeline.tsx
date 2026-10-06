"use client";

import { useEffect, useState } from "react";
import { BodyLong, BodyShort, Detail, ToggleGroup } from "@navikt/ds-react";
import { ArrowRightIcon } from "@navikt/aksel-icons";
import { ENVS, JOBS, STATUS_BY_ID, differsFromProd, klokke, schedLabel, type Env, type JobId, type StatusId } from "./data";
import { TONE } from "./tones";

const S = 360;
const C = S / 2;
const R = 128;

const ang = (h: number, m: number) => ((h + m / 60) / 24) * Math.PI * 2 - Math.PI / 2;
// Rounded so server- and client-rendered SVG attributes match exactly
const r2 = (n: number) => Math.round(n * 100) / 100;
const pt = (h: number, m: number, r: number): [number, number] => [r2(C + r * Math.cos(ang(h, m))), r2(C + r * Math.sin(ang(h, m)))];

function arc(t1: number, t2: number, r: number): string {
  const [x1, y1] = pt(t1, 0, r);
  const [x2, y2] = pt(t2, 0, r);
  const large = t2 - t1 > 12 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

function osloNow(): { h: number; m: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Oslo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { h: get("hour"), m: get("minute") };
}

const until = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `om ${m} min`;
  return m === 0 ? `om ${h} t` : `om ${h} t ${m} min`;
};

const ENV_NOTES: Record<Env, string> = {
  prod: "Nattjobbene går i rekkefølge fra 01.00 til 05.00, så en sak kan gå fra UVIRKSOM til AVSLUTTET samme natt. Rapporten sendes den 1. hver måned.",
  q1: "Som i prod, men uten rapportjobb. slett-dokumentutkast kjører bare 1. juni.",
  q2: "til-avslutning kjører kl. 12.05 – etter avslutt. Saker som blir klare for avslutning, lukkes derfor først natten etter. Rapportjobben er satt til 31. februar og kjører aldri.",
};

export function NightPipeline({ onFocusStatus }: { onFocusStatus: (s: StatusId) => void }) {
  const [env, setEnv] = useState<Env>("prod");
  const [selected, setSelected] = useState<JobId>("sett-uvirksom");
  const [hover, setHover] = useState<JobId | null>(null);
  const [now, setNow] = useState<{ h: number; m: number } | null>(null);

  useEffect(() => {
    const tick = () => setNow(osloNow());
    const first = window.setTimeout(tick, 0);
    const t = window.setInterval(tick, 30_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(t);
    };
  }, []);

  const daily = JOBS.flatMap((j) => {
    const s = j.sched[env];
    return s && s.freq === "daily" ? [{ j, s, t: s.h * 60 + s.m }] : [];
  });
  const rare = JOBS.filter((j) => j.sched[env] === null || j.sched[env]!.freq !== "daily");
  const nowMin = now ? now.h * 60 + now.m : null;
  const next =
    nowMin === null
      ? null
      : [...daily].sort((a, b) => ((a.t - nowMin + 1440) % 1440 || 1440) - ((b.t - nowMin + 1440) % 1440 || 1440))[0];
  const nextIn = next && nowMin !== null ? (next.t - nowMin + 1440) % 1440 || 1440 : null;

  const night = daily.filter((d) => d.s.h < 6).sort((a, b) => a.t - b.t);
  const chainFrom = night[0]?.t ?? 60;
  const chainTo = night[night.length - 1]?.t ?? 300;
  const focus = hover ?? selected;

  return (
    <div className="avs-night">
      <div className="avs-toolbar">
        <ToggleGroup size="small" value={env} onChange={(v) => setEnv(v as Env)} label="Miljø">
          {ENVS.map((e) => (
            <ToggleGroup.Item key={e.id} value={e.id} label={e.label} />
          ))}
        </ToggleGroup>
        <BodyShort size="small" className="avs-toolbar__text" aria-live="polite">
          {ENV_NOTES[env]}
        </BodyShort>
      </div>

      <div className="avs-night__grid">
        <div className="portal-diagram avs-surface avs-night__dial">
          <svg viewBox={`0 0 ${S} ${S}`} style={{ width: "100%", maxWidth: 420, height: "auto", display: "block", margin: "0 auto" }} role="img" aria-label={`Døgnklokke for ${env}: ${daily.map((d) => `${d.j.id} ${klokke(d.s.h, d.s.m)}`).join(", ")}`}>
            <circle cx={C} cy={C} r={R} fill="none" stroke="var(--ax-border-neutral-subtle)" strokeWidth={14} opacity={0.5} />
            {/* Natt (mørk halvdel) */}
            <path d={arc(18, 30, R)} fill="none" stroke="var(--ax-bg-neutral-strong)" strokeOpacity={0.22} strokeWidth={14} />
            {night.length > 1 && (
              <>
                <path d={arc(chainFrom / 60, chainTo / 60, R)} fill="none" stroke="var(--ax-bg-accent-moderate)" strokeWidth={14} strokeLinecap="round" />
                <path d={arc(chainFrom / 60, chainTo / 60, R)} fill="none" stroke="var(--ax-border-accent)" strokeWidth={2.5} className="arch-flow arch-flow--slow" />
              </>
            )}
            {Array.from({ length: 24 }, (_, h) => {
              const major = h % 3 === 0;
              const [x1, y1] = pt(h, 0, R - 15);
              const [x2, y2] = pt(h, 0, R - (major ? 25 : 20));
              const [lx, ly] = pt(h, 0, R + 24);
              return (
                <g key={h}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--ax-border-neutral)" strokeWidth={major ? 1.6 : 1} />
                  {major && (
                    <text x={lx} y={ly + 4} textAnchor="middle" fontSize={11} className="arch-mono" fill="var(--ax-text-neutral-subtle)">
                      {String(h).padStart(2, "0")}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Nå */}
            {now && (
              <g className="arch-night__now">
                {(() => {
                  const [x1, y1] = pt(now.h, now.m, 62);
                  const [x2, y2] = pt(now.h, now.m, R - 30);
                  return (
                    <>
                      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--ax-border-danger)" strokeWidth={2} strokeLinecap="round" />
                      <circle cx={x2} cy={y2} r={3.5} fill="var(--ax-border-danger)" />
                    </>
                  );
                })()}
              </g>
            )}

            {/* Jobber */}
            {daily.map(({ j, s }) => {
              const [x, y] = pt(s.h, s.m, R);
              const on = focus === j.id;
              const isNext = next?.j.id === j.id;
              return (
                <g
                  key={j.id}
                  className="avs-night__dot"
                  aria-hidden="true"
                  onMouseEnter={() => setHover(j.id)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => setSelected(j.id)}
                >
                  {isNext && <circle cx={x} cy={y} r={15} fill="none" stroke={TONE.warning.stroke} strokeWidth={2} className="arch-night__next" />}
                  <circle cx={x} cy={y} r={on ? 14 : 11.5} fill={on ? TONE.accent.strong : TONE.warning.strong} stroke="var(--ax-bg-default)" strokeWidth={2.5} style={{ transition: "r 160ms ease, fill 160ms ease" }} />
                  <text x={x} y={y + 4} textAnchor="middle" fontSize={11} fontWeight={800} fill={on ? "var(--ax-text-accent-contrast)" : "var(--ax-text-warning-contrast)"} pointerEvents="none">
                    {j.no}
                  </text>
                </g>
              );
            })}

            {/* Senter */}
            <circle cx={C} cy={C} r={58} fill="var(--ax-bg-neutral-soft)" />
            {now && next && nextIn !== null ? (
              <g aria-live="polite">
                <text x={C} y={C - 22} textAnchor="middle" fontSize={9.5} className="arch-eyebrow-svg" fill="var(--ax-text-neutral-subtle)">
                  NESTE KJØRING
                </text>
                <text x={C} y={C - 2} textAnchor="middle" fontSize={next.j.id.length > 15 ? 11 : 13} fontWeight={800} className="arch-mono" fill="var(--ax-text-neutral)">
                  {next.j.id}
                </text>
                <text x={C} y={C + 16} textAnchor="middle" fontSize={11.5} fill="var(--ax-text-accent)" fontWeight={700}>
                  {until(nextIn)}
                </text>
                <text x={C} y={C + 32} textAnchor="middle" fontSize={10} className="arch-mono" fill="var(--ax-text-neutral-subtle)">
                  nå {klokke(now.h, now.m)}
                </text>
              </g>
            ) : (
              <text x={C} y={C + 4} textAnchor="middle" fontSize={11} fill="var(--ax-text-neutral-subtle)">
                Europe/Oslo
              </text>
            )}
          </svg>
          {rare.length > 0 && (
            <div className="avs-night__rare">
              <Detail className="arch-eyebrow">Sjeldnere</Detail>
              <ul>
                {rare.map((j) => (
                  <li key={j.id}>
                    <span className="avs-night__no" aria-hidden>
                      {j.no}
                    </span>
                    <span className="arch-mono">{j.id}</span>
                    <span className="arch-subtle">{schedLabel(j.sched[env])}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <ol className="avs-jobs" aria-label="Jobbene i eux-avslutt-rinasaker-naisjob">
          {JOBS.map((j) => {
            const s = j.sched[env];
            const open = selected === j.id;
            return (
              <li key={j.id} className={`avs-job ${open ? "is-open" : ""} ${focus === j.id ? "is-focus" : ""}`}>
                <button
                  type="button"
                  className="avs-job__btn"
                  aria-expanded={open}
                  onClick={() => setSelected(j.id)}
                  onMouseEnter={() => setHover(j.id)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(j.id)}
                  onBlur={() => setHover(null)}
                >
                  <span className="avs-night__no">{j.no}</span>
                  <span className="avs-job__name">
                    <strong>{j.title}</strong>
                    <span className="arch-mono">{j.id}</span>
                  </span>
                  <span className="avs-job__when">
                    <span className={`arch-mono ${s ? "" : "arch-subtle"}`}>{s && s.freq === "daily" ? klokke(s.h, s.m) : schedLabel(s)}</span>
                    {differsFromProd(j, env) && <span className="avs-job__diff">avviker fra prod</span>}
                  </span>
                </button>
                {open && (
                  <div className="avs-job__body">
                    <BodyLong size="small">{j.text}</BodyLong>
                    {(j.from.length > 0 || j.to.length > 0) && (
                      <div className="avs-job__flow">
                        <StatusChips ids={j.from} onFocusStatus={onFocusStatus} />
                        <ArrowRightIcon aria-hidden className="arch-subtle" />
                        <StatusChips ids={j.to} onFocusStatus={onFocusStatus} />
                      </div>
                    )}
                    <dl className="avs-job__meta">
                      <div>
                        <dt>Tidsplan</dt>
                        <dd>
                          {schedLabel(s)} {s && <code>{s.cron}</code>}
                        </dd>
                      </div>
                      {j.rina && (
                        <div>
                          <dt>RINA</dt>
                          <dd className="arch-mono">{j.rina}</dd>
                        </div>
                      )}
                      {j.limit && (
                        <div>
                          <dt>Grense</dt>
                          <dd>{j.limit}</dd>
                        </div>
                      )}
                      <div>
                        <dt>App</dt>
                        <dd className="arch-mono">{j.app}</dd>
                      </div>
                    </dl>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

export function StatusChips({ ids, onFocusStatus }: { ids: StatusId[]; onFocusStatus: (s: StatusId) => void }) {
  return (
    <span className="arch-chips">
      {ids.map((id) => (
        <button
          key={id}
          type="button"
          className="avs-chip arch-mono"
          data-tone={STATUS_BY_ID[id].tone}
          onClick={() => onFocusStatus(id)}
          title={`${STATUS_BY_ID[id].label} – vis i statusdiagrammet`}
        >
          {id}
        </button>
      ))}
    </span>
  );
}
