"use client";

import { useEffect, useState } from "react";
import { BodyLong, BodyShort } from "@navikt/ds-react";
import { ArrowRightIcon } from "@navikt/aksel-icons";
import { useReducedMotion } from "@/components/architecture/hooks";
import { TONE } from "@/components/avslutning/tones";
import { JOBS, klokke, schedLabel, type JobId, type StatusId } from "./data";
import { StatusChips } from "./StatusChips";

const W = 1100;
const H = 236;
const X0 = 40;
const X1 = 1040;
const TY = 132;
const HOURS = 27;
const r2 = (n: number) => Math.round(n * 100) / 100;
const xh = (h: number) => r2(X0 + (h / HOURS) * (X1 - X0));

const MARKERS: { job: JobId; no: number; h: number; side: "end" | "start" }[] = [
  { job: "slett", no: 1, h: 1, side: "end" },
  { job: "til-sletting", no: 2, h: 2, side: "start" },
  { job: "slett", no: 1, h: 25, side: "end" },
  { job: "til-sletting", no: 2, h: 26, side: "start" },
];
const ARC = `M ${xh(2)} ${TY - 12} C ${xh(2)} 56 ${xh(25)} 56 ${xh(25)} ${TY - 12}`;

type Oslo = { y: number; mo: number; d: number; h: number; m: number };

function osloNow(): Oslo {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Oslo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { y: get("year"), mo: get("month"), d: get("day"), h: get("hour"), m: get("minute") };
}

const until = (mins: number) => {
  if (mins >= 48 * 60) return `om ${Math.round(mins / 1440)} dager`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `om ${m} min`;
  return m === 0 ? `om ${h} t` : `om ${h} t ${m} min`;
};

const MONTHS = ["januar", "februar", "mars", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "desember"];

/** Minutter til neste kjøring, regnet i Oslo-tid. */
function nextRun(job: JobId, now: Oslo): { mins: number; label: string } {
  const j = JOBS.find((x) => x.id === job)!;
  const s = j.sched.prod;
  if (s.freq === "daily") {
    const nowMin = now.h * 60 + now.m;
    const t = s.h * 60 + s.m;
    const mins = (t - nowMin + 1440) % 1440 || 1440;
    return { mins, label: mins > (24 * 60 - nowMin) ? `i morgen kl. ${klokke(s.h, s.m)}` : `i dag kl. ${klokke(s.h, s.m)}` };
  }
  const base = Date.UTC(now.y, now.mo - 1, now.d, now.h, now.m);
  const thisMonth = Date.UTC(now.y, now.mo - 1, 1, s.h, s.m);
  const target = thisMonth > base ? thisMonth : Date.UTC(now.y, now.mo, 1, s.h, s.m);
  const month = new Date(target).getUTCMonth();
  return { mins: Math.round((target - base) / 60000), label: `1. ${MONTHS[month]} kl. ${klokke(s.h, s.m)}` };
}

export function NightStrip({ onFocusStatus }: { onFocusStatus: (s: StatusId) => void }) {
  const reduced = useReducedMotion();
  const [now, setNow] = useState<Oslo | null>(null);
  const [focus, setFocus] = useState<JobId | null>(null);

  useEffect(() => {
    const tick = () => setNow(osloNow());
    const first = window.setTimeout(tick, 0);
    const t = window.setInterval(tick, 30_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(t);
    };
  }, []);

  const nowH = now ? now.h + now.m / 60 : null;
  const daily = JOBS.filter((j) => j.sched.prod.freq === "daily");
  const nextDaily = now ? [...daily].sort((a, b) => nextRun(a.id, now).mins - nextRun(b.id, now).mins)[0].id : null;

  return (
    <div className="sl-night">
      <div className="portal-diagram avs-surface">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", minWidth: 760, height: "auto", display: "block" }}
          role="img"
          aria-label="Tidslinje for natten: slett kl. 01.00 og til-sletting kl. 02.00. En sak som merkes TIL_SLETTING kl. 02.00, slettes kl. 01.00 natten etter – omtrent 23 timer senere."
        >
          <defs>
            <marker id="sl-night-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="var(--ax-border-warning)" />
            </marker>
          </defs>

          {/* Netter */}
          {[
            { from: 0, to: 6, label: "☾ natt til i dag", at: 3 },
            { from: 22, to: 27, label: "☾ natt til i morgen", at: 24.5 },
          ].map((n) => (
            <g key={n.from}>
              <rect x={xh(n.from)} y={28} width={r2(xh(n.to) - xh(n.from))} height={H - 36} fill="var(--ax-bg-neutral-moderate)" opacity={0.5} />
              <text x={xh(n.at)} y={20} textAnchor="middle" fontSize={10.5} fontWeight={700} fill="var(--ax-text-neutral-subtle)">
                {n.label}
              </text>
            </g>
          ))}

          {/* Akse */}
          <line x1={X0} x2={X1} y1={TY} y2={TY} stroke="var(--ax-border-neutral-subtle)" strokeWidth={2} />
          {Array.from({ length: HOURS + 1 }, (_, h) => {
            const major = h % 3 === 0;
            const midnight = h === 24;
            return (
              <g key={h}>
                <line
                  x1={xh(h)}
                  x2={xh(h)}
                  y1={midnight ? TY - 8 : TY + 6}
                  y2={TY + (midnight ? 14 : major ? 12 : 9)}
                  stroke={midnight ? "var(--ax-border-neutral-strong)" : "var(--ax-border-neutral)"}
                  strokeWidth={midnight ? 1.6 : 1}
                />
                {major && (
                  <text
                    x={xh(h)}
                    y={TY + 26}
                    textAnchor="middle"
                    fontSize={10.5}
                    fontWeight={midnight ? 700 : 400}
                    className="arch-mono"
                    fill={midnight ? "var(--ax-text-neutral)" : "var(--ax-text-neutral-subtle)"}
                  >
                    {String(h % 24).padStart(2, "0")}
                  </text>
                )}
              </g>
            );
          })}

          {/* Nå */}
          {nowH !== null && (
            <g className="sl-night__now">
              <line x1={xh(nowH)} x2={xh(nowH)} y1={46} y2={TY - 8} stroke="var(--ax-border-danger)" strokeWidth={1.5} strokeDasharray="3 3" opacity={0.7} />
              <rect x={r2(xh(nowH) - 30)} y={30} width={60} height={17} rx={8.5} fill="var(--ax-bg-danger-strong)" />
              <text x={xh(nowH)} y={42} textAnchor="middle" fontSize={10} fontWeight={700} className="arch-mono" fill="var(--ax-text-danger-contrast)">
                nå {klokke(now!.h, now!.m)}
              </text>
            </g>
          )}

          {/* Buen: tiden som TIL_SLETTING */}
          <g className={`sl-night__arc ${focus && focus !== "til-sletting" && focus !== "slett" ? "is-dim" : ""}`}>
            <path d={ARC} fill="none" stroke="var(--ax-border-warning)" strokeWidth={1.8} markerEnd="url(#sl-night-arrow)" />
            <path d={ARC} fill="none" stroke="var(--ax-border-warning)" strokeWidth={2.6} className="arch-flow arch-flow--slow" />
            {!reduced && (
              <circle r={5} fill={TONE.warning.strong} className="arch-packet">
                <animateMotion dur="4.5s" repeatCount="indefinite" path={ARC} />
              </circle>
            )}
            <text x={xh(13.5)} y={66} textAnchor="middle" fontSize={12} fontWeight={800} className="arch-halo" fill="var(--ax-text-warning)">
              ≈ 23 timer som TIL_SLETTING
            </text>
            <text x={xh(13.5)} y={94} textAnchor="middle" fontSize={10.5} className="arch-halo" fill="var(--ax-text-neutral-subtle)">
              saken merkes kl. 02.00 og slettes kl. 01.00 natten etter
            </text>
          </g>

          {/* Jobber */}
          {MARKERS.map((mk, i) => {
            const x = xh(mk.h);
            const on = focus === mk.job;
            const dim = focus !== null && !on;
            const past = nowH !== null && mk.h < 24 && mk.h < nowH;
            const tx = mk.side === "end" ? x + 4 : x - 4;
            return (
              <g
                key={i}
                className="sl-night__job"
                opacity={dim ? 0.35 : 1}
                style={{ transition: "opacity 200ms ease" }}
                onMouseEnter={() => setFocus(mk.job)}
                onMouseLeave={() => setFocus(null)}
                aria-hidden
              >
                <line x1={x} x2={x} y1={TY + 11} y2={TY + 44} stroke="var(--ax-border-neutral-strong)" strokeDasharray="2 3" />
                {nextDaily === mk.job && nowH !== null && mk.h === (mk.h % 24 > nowH ? mk.h % 24 : (mk.h % 24) + 24) && (
                  <circle cx={x} cy={TY} r={14} fill="none" stroke={TONE.warning.stroke} strokeWidth={2} className="arch-night__next" />
                )}
                <circle
                  cx={x}
                  cy={TY}
                  r={on ? 11 : 9}
                  fill={on ? TONE.accent.strong : TONE.warning.strong}
                  stroke="var(--ax-bg-default)"
                  strokeWidth={2}
                  opacity={past ? 0.6 : 1}
                  style={{ transition: "r 160ms ease, fill 160ms ease" }}
                />
                <text x={x} y={TY + 3.6} textAnchor="middle" fontSize={10} fontWeight={800} fill={on ? "var(--ax-text-accent-contrast)" : "var(--ax-text-warning-contrast)"}>
                  {mk.no}
                </text>
                <text x={tx} y={TY + 58} textAnchor={mk.side} fontSize={11} fontWeight={700} className="arch-mono" fill="var(--ax-text-neutral)">
                  {mk.job}
                </text>
                <text x={tx} y={TY + 72} textAnchor={mk.side} fontSize={10} className="arch-mono" fill="var(--ax-text-neutral-subtle)">
                  {klokke(mk.h % 24, 0)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <ol className="sl-jobs" aria-label="Jobbene i eux-slett-usendte-rinasaker-naisjob">
        {JOBS.map((j) => {
          const run = now ? nextRun(j.id, now) : null;
          const s = j.sched.prod;
          const envDiff = j.sched.q1.cron !== s.cron || j.sched.q2.cron !== s.cron;
          return (
            <li
              key={j.id}
              className={`sl-job ${focus === j.id ? "is-focus" : ""}`}
              onMouseEnter={() => setFocus(j.id)}
              onMouseLeave={() => setFocus(null)}
              onFocus={() => setFocus(j.id)}
              onBlur={() => setFocus(null)}
            >
              <div className="sl-job__head">
                <span className="avs-night__no">{j.no}</span>
                <span className="sl-job__name">
                  <strong>{j.title}</strong>
                  <span className="arch-mono">{j.id}</span>
                </span>
                <span className="sl-job__time arch-mono">{s.freq === "daily" ? klokke(s.h, s.m) : "den 1."}</span>
              </div>
              <BodyShort size="small" className="sl-job__next" aria-live="polite">
                <span className="sl-job__dot" aria-hidden />
                {run ? (
                  <>
                    Neste kjøring {j.id === "rapport" ? "i prod " : ""}
                    <strong>{until(run.mins)}</strong> <span className="arch-subtle">· {run.label}</span>
                  </>
                ) : (
                  <span className="arch-subtle">Regner ut neste kjøring …</span>
                )}
              </BodyShort>
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
                    {envDiff ? (
                      <>
                        prod: {schedLabel(s)} <code>{s.cron}</code>
                        <br />
                        q1 og q2: {schedLabel(j.sched.q1)} <code>{j.sched.q1.cron}</code>
                      </>
                    ) : (
                      <>
                        {schedLabel(s)} <code>{s.cron}</code> · alle miljøer
                      </>
                    )}
                  </dd>
                </div>
                {j.rina && (
                  <div>
                    <dt>RINA</dt>
                    <dd className="arch-mono">{j.rina}</dd>
                  </div>
                )}
                <div>
                  <dt>App</dt>
                  <dd className="arch-mono">{j.app}</dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
