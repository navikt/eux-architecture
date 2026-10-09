"use client";

import { useEffect, useState } from "react";
import { BodyLong, BodyShort, ToggleGroup } from "@navikt/ds-react";
import { ArrowRightIcon } from "@navikt/aksel-icons";
import { useReducedMotion } from "@/components/architecture/hooks";
import { TONE } from "@/components/avslutning/tones";
import { ENVS, JOBS, cronjobName, type Env, type Job, type JobId, type StatusId } from "./data";
import { StatusChips } from "./StatusChips";

const W = 1100;
const H = 246;
const X0 = 40;
const X1 = 1060;
const TY = 164;
const LANE_Y = 64;
const START = 12;
const SPAN = 24;
const r2 = (n: number) => Math.round(n * 100) / 100;
/** Timer fra kl. 12 i dag (12) til kl. 12 i morgen (36). */
const xh = (h: number) => r2(X0 + ((h - START) / SPAN) * (X1 - X0));

const SEDS = [12.7, 13.3, 14.2, 14.9, 15.6, 18.4, 21.1, 23.6, 27.2, 31.9, 32.6, 33.4, 34.1, 34.8, 35.5];
const LANE_PILL_W = 262;

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

const klokke = (h: number, m = 0) => `${String(h).padStart(2, "0")}.${String(m).padStart(2, "0")}`;

const until = (mins: number) => {
  if (mins >= 48 * 60) return `om ${Math.round(mins / 1440)} dager`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `om ${m} min`;
  return m === 0 ? `om ${h} t` : `om ${h} t ${m} min`;
};

const MONTHS = ["januar", "februar", "mars", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "desember"];

/** Neste kjøring i Oslo-tid. Støtter daglige og årlige cron-uttrykk. */
function nextRun(job: Job, env: Env, now: Oslo): { mins: number; label: string } {
  const [mm, hh, dom, mon] = job.sched[env].cron.split(" ");
  const m = Number(mm);
  const h = Number(hh);
  if (dom === "*" && mon === "*") {
    const nowMin = now.h * 60 + now.m;
    const mins = (h * 60 + m - nowMin + 1440) % 1440 || 1440;
    return { mins, label: `${mins > 1440 - nowMin ? "i morgen" : "i dag"} kl. ${klokke(h, m)}` };
  }
  const base = Date.UTC(now.y, now.mo - 1, now.d, now.h, now.m);
  const thisYear = Date.UTC(now.y, Number(mon) - 1, Number(dom), h, m);
  const target = thisYear > base ? thisYear : Date.UTC(now.y + 1, Number(mon) - 1, Number(dom), h, m);
  return { mins: Math.round((target - base) / 60000), label: `${Number(dom)}. ${MONTHS[Number(mon) - 1]} kl. ${klokke(h, m)}` };
}

const APP: Record<Env, string> = { prod: "eux-journalarkivar", q1: "eux-journalarkivar-q1", q2: "eux-journalarkivar-q2" };

export function NightJobs({ onFocusStatus }: { onFocusStatus: (s: StatusId) => void }) {
  const reduced = useReducedMotion();
  const [now, setNow] = useState<Oslo | null>(null);
  const [env, setEnv] = useState<Env>("prod");
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

  const nowH = now ? (now.h < START ? now.h + 24 : now.h) + now.m / 60 : null;
  const nightly = JOBS.filter((j) => j.sched[env].h !== null);
  const next = now ? [...JOBS].sort((a, b) => nextRun(a, env, now).mins - nextRun(b, env, now).mins)[0].id : null;
  const both = nightly.length === JOBS.length;
  const [ax, bx] = [xh(25), xh(26)];
  const ARC = `M ${ax} ${TY - 13} C ${ax} 112 ${bx} 112 ${bx} ${TY - 13}`;
  const LANE = `M ${X0 + LANE_PILL_W} ${LANE_Y} L ${X1} ${LANE_Y}`;

  return (
    <div className="jfr-night">
      <div className="avs-toolbar">
        <ToggleGroup size="small" value={env} onChange={(v) => setEnv(v as Env)} label="Miljø">
          {ENVS.map((e) => (
            <ToggleGroup.Item key={e} value={e} label={e} />
          ))}
        </ToggleGroup>
        <BodyShort size="small" className="avs-toolbar__text">
          Tidene er norsk tid. Naisjobbene har <code>timeZone: Europe/Oslo</code>.
        </BodyShort>
      </div>

      <div className="portal-diagram avs-surface">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", minWidth: 760, height: "auto", display: "block" }}
          role="img"
          aria-label={`Døgnet i ${env}: fagmodulen journalfører SED-er hele døgnet. ${nightly.map((j) => `${j.title} kjører kl. ${klokke(j.sched[env].h!)}`).join(". ")}.`}
        >
          <defs>
            <marker id="jfr-night-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="var(--ax-border-warning)" />
            </marker>
          </defs>

          {/* Natten */}
          <rect x={xh(22)} y={28} width={r2(xh(30) - xh(22))} height={H - 36} rx={10} fill="var(--ax-bg-neutral-moderate)" opacity={0.5} />
          <text x={xh(26)} y={20} textAnchor="middle" fontSize={10.5} fontWeight={700} fill="var(--ax-text-neutral-subtle)">
            ☾ natt
          </text>

          {/* Nå-linjen ligger under alt annet */}
          {nowH !== null && (
            <line x1={xh(nowH)} x2={xh(nowH)} y1={47} y2={TY - 8} stroke="var(--ax-border-danger)" strokeWidth={1.5} strokeDasharray="3 3" opacity={0.7} />
          )}

          {/* Fagmodulen hele døgnet */}
          <g className={`jfr-night__lane ${focus ? "is-dim" : ""}`}>
            <path d={LANE} stroke={TONE.accent.stroke} strokeWidth={2} fill="none" opacity={0.55} />
            <path d={LANE} stroke={TONE.accent.stroke} strokeWidth={2.4} fill="none" className="arch-flow arch-flow--slow" />
            {SEDS.filter((h) => xh(h) > X0 + LANE_PILL_W + 8).map((h, i) => (
              <circle
                key={h}
                cx={xh(h)}
                cy={LANE_Y}
                r={4}
                fill={TONE.accent.strong}
                stroke="var(--ax-bg-default)"
                strokeWidth={1.5}
                className="jfr-night__sed"
                style={{ animationDelay: reduced ? undefined : `${(i % 5) * 0.7}s` }}
              />
            ))}
            <rect x={X0} y={LANE_Y - 13} width={LANE_PILL_W} height={26} rx={13} fill={TONE.accent.fill} stroke={TONE.accent.stroke} strokeWidth={1.4} />
            <text x={X0 + 14} y={LANE_Y + 4} fontSize={11} fontWeight={800} fill="var(--ax-text-neutral)">
              Fagmodulen
              <tspan fontWeight={400} fill="var(--ax-text-neutral-subtle)">
                {" "}
                · hver SED, hele døgnet
              </tspan>
            </text>
          </g>

          {/* Buen fra 01 til 02 */}
          {both && (
            <g className={`jfr-night__arc ${focus ? "is-on" : ""}`}>
              <path d={ARC} fill="none" stroke="var(--ax-border-warning)" strokeWidth={1.8} markerEnd="url(#jfr-night-arrow)" />
              <path d={ARC} fill="none" stroke="var(--ax-border-warning)" strokeWidth={2.6} className="arch-flow arch-flow--slow" />
              {!reduced && (
                <circle r={4.5} fill={TONE.warning.strong} className="arch-packet">
                  <animateMotion dur="3.6s" repeatCount="indefinite" path={ARC} />
                </circle>
              )}
              <text x={xh(25.5)} y={100} textAnchor="middle" fontSize={11} fontWeight={800} className="arch-halo" fill="var(--ax-text-warning)">
                fortsatt UKJENT
              </text>
            </g>
          )}

          {/* Akse */}
          <line x1={X0} x2={X1} y1={TY} y2={TY} stroke="var(--ax-border-neutral-subtle)" strokeWidth={2} />
          {Array.from({ length: SPAN + 1 }, (_, i) => {
            const h = START + i;
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

          {/* Jobbene */}
          {JOBS.map((j) => {
            const h = j.id === "ferdigstill" ? 25 : 26;
            const x = xh(h);
            const on = focus === j.id;
            const dim = focus !== null && !on;
            const off = j.sched[env].h === null;
            const side = j.id === "ferdigstill" ? "end" : "start";
            const tx = side === "end" ? x + 4 : x - 4;
            return (
              <g
                key={j.id}
                className="sl-night__job"
                opacity={dim ? 0.35 : 1}
                style={{ transition: "opacity 200ms ease" }}
                onMouseEnter={() => setFocus(j.id)}
                onMouseLeave={() => setFocus(null)}
                aria-hidden
              >
                <line x1={x} x2={x} y1={TY + 11} y2={TY + 46} stroke="var(--ax-border-neutral-strong)" strokeDasharray="2 3" />
                {next === j.id && !off && <circle cx={x} cy={TY} r={14} fill="none" stroke={TONE.warning.stroke} strokeWidth={2} className="arch-night__next" />}
                <circle
                  cx={x}
                  cy={TY}
                  r={on ? 11 : 9}
                  fill={off ? "var(--ax-bg-default)" : on ? TONE.accent.strong : TONE.warning.strong}
                  stroke={off ? "var(--ax-border-neutral)" : "var(--ax-bg-default)"}
                  strokeWidth={2}
                  strokeDasharray={off ? "3 2" : undefined}
                  style={{ transition: "r 160ms ease, fill 160ms ease" }}
                />
                <text
                  x={x}
                  y={TY + 3.6}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={800}
                  fill={off ? "var(--ax-text-neutral-subtle)" : on ? "var(--ax-text-accent-contrast)" : "var(--ax-text-warning-contrast)"}
                >
                  {j.no}
                </text>
                <text x={tx} y={TY + 60} textAnchor={side} fontSize={11} fontWeight={700} className="arch-mono" fill={off ? "var(--ax-text-neutral-subtle)" : "var(--ax-text-neutral)"}>
                  {j.id}
                </text>
                <text x={tx} y={TY + 74} textAnchor={side} fontSize={10} className="arch-mono" fill="var(--ax-text-neutral-subtle)">
                  {off ? `ikke nattlig i ${env}` : klokke(h % 24)}
                </text>
              </g>
            );
          })}

          {/* Nå-merket øverst */}
          {nowH !== null && (
            <g className="sl-night__now">
              <rect x={r2(xh(nowH) - 30)} y={30} width={60} height={17} rx={8.5} fill="var(--ax-bg-danger-strong)" />
              <text x={xh(nowH)} y={42} textAnchor="middle" fontSize={10} fontWeight={700} className="arch-mono" fill="var(--ax-text-danger-contrast)">
                nå {klokke(now!.h, now!.m)}
              </text>
            </g>
          )}
        </svg>
      </div>

      <ol className="sl-jobs jfr-jobs" aria-label="Nattjobbene i eux-journalarkivar">
        {JOBS.map((j) => {
          const s = j.sched[env];
          const run = now ? nextRun(j, env, now) : null;
          const sameAll = ENVS.every((e) => j.sched[e].cron === j.sched.prod.cron);
          return (
            <li
              key={j.id}
              className={`sl-job jfr-job ${focus === j.id ? "is-focus" : ""}`}
              data-off={s.h === null || undefined}
              onMouseEnter={() => setFocus(j.id)}
              onMouseLeave={() => setFocus(null)}
              onFocus={() => setFocus(j.id)}
              onBlur={() => setFocus(null)}
            >
              <div className="sl-job__head">
                <span className="avs-night__no">{j.no}</span>
                <span className="sl-job__name">
                  <strong>{j.title}</strong>
                  <span className="arch-mono">{cronjobName(j, env)}</span>
                </span>
                <span className="sl-job__time arch-mono">{s.h === null ? "25.11" : klokke(s.h)}</span>
              </div>
              <BodyShort size="small" className="sl-job__next" aria-live="polite">
                <span className="sl-job__dot" aria-hidden />
                {run ? (
                  <>
                    Neste kjøring i {env} <strong>{until(run.mins)}</strong> <span className="arch-subtle">· {run.label}</span>
                  </>
                ) : (
                  <span className="arch-subtle">Regner ut neste kjøring …</span>
                )}
              </BodyShort>
              <BodyLong size="small">{j.text}</BodyLong>
              <div className="avs-job__flow">
                <StatusChips ids={j.reads} onFocusStatus={onFocusStatus} />
                <ArrowRightIcon aria-hidden className="arch-subtle" />
                <StatusChips ids={j.writes} onFocusStatus={onFocusStatus} />
              </div>
              <ol className="jfr-job__steps" aria-label={`Slik avgjør ${j.id} hva som skjer`}>
                {j.steps.map((st, i) => (
                  <li key={i} data-tone={st.tone ?? "neutral"} style={{ ["--jfr-i" as string]: i }}>
                    <span className="jfr-job__step-text">{st.text}</span>
                    {st.to ? (
                      <StatusChips ids={[st.to]} onFocusStatus={onFocusStatus} />
                    ) : (
                      <span className="jfr-job__keep arch-mono">uendret</span>
                    )}
                  </li>
                ))}
              </ol>
              <dl className="avs-job__meta">
                <div>
                  <dt>Tidsplan</dt>
                  <dd>
                    {s.label} <code>{s.cron}</code>
                    {sameAll ? " · alle miljøer" : ""}
                  </dd>
                </div>
                <div>
                  <dt>Kaller</dt>
                  <dd className="arch-mono">
                    {APP[env]} POST /api/v1/arkivarprosess/{j.id}/execute
                  </dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ol>

      <BodyShort size="small" className="avs-note">
        Naisjoben gjør bare ett kall. eux-journalarkivar gjør hele jobben før den svarer. Feiler kallet, logger naisjoben bare en advarsel.
      </BodyShort>
    </div>
  );
}
