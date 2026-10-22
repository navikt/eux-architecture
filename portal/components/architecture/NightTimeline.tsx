"use client";

import { useState } from "react";
import { BodyShort, Detail } from "@navikt/ds-react";
import { onActivate } from "./svg";
import { hhmm, type OsloTime } from "@/components/process/time";
import { useOsloNow } from "@/components/process/useOsloNow";
import { useSvgIds } from "./hooks";

type Job<N extends string = string> = {
  name: N;
  h: number;
  m: number;
  monthly?: boolean;
  note?: string;
  /** Jobben i samme gruppe som må ha kjørt først. Tegnes som en pil fra den. */
  after?: NoInfer<N>;
};
type Group = { id: string; title: string; target: string; kind: "naisjob" | "scheduled"; jobs: Job[] };

/** Lar TypeScript sjekke at hver `after` peker på en jobb i samme liste. */
const jobs = <N extends string>(list: Job<N>[]): Job[] => list;

const GROUPS: Group[] = [
  {
    id: "eux-journalarkivar-naisjob",
    title: "eux-journalarkivar-naisjob",
    target: "eux-journalarkivar",
    kind: "naisjob",
    jobs: jobs([
      { name: "ferdigstill", h: 1, m: 0 },
      { name: "feilregistrer", h: 2, m: 0 },
    ]),
  },
  {
    id: "eux-avslutt-rinasaker-naisjob",
    title: "eux-avslutt-rinasaker-naisjob",
    target: "eux-avslutt-rinasaker",
    kind: "naisjob",
    jobs: jobs([
      { name: "rapport", h: 0, m: 5, monthly: true },
      { name: "sett-uvirksom", h: 1, m: 0 },
      { name: "til-avslutning", h: 2, m: 0, after: "sett-uvirksom" },
      { name: "avslutt", h: 3, m: 0, after: "til-avslutning" },
      { name: "til-arkivering", h: 4, m: 0, after: "avslutt" },
      { name: "arkiver", h: 5, m: 0, after: "til-arkivering" },
      { name: "slett-dokumentutkast", h: 14, m: 42 },
    ]),
  },
  {
    id: "eux-slett-usendte-rinasaker-naisjob",
    title: "eux-slett-usendte-rinasaker-naisjob",
    target: "eux-slett-usendte-rinasaker",
    kind: "naisjob",
    jobs: jobs([
      { name: "slett", h: 1, m: 0 },
      { name: "til-sletting", h: 2, m: 0 },
      { name: "rapport", h: 6, m: 0, monthly: true },
    ]),
  },
  {
    id: "eux-barnetrygd",
    title: "eux-barnetrygd",
    target: "eux-barnetrygd",
    kind: "scheduled",
    jobs: jobs([{ name: "@Scheduled", h: 22, m: 0, note: "innebygd i appen" }]),
  },
];

const W = 1140;
const LABEL_W = 290;
const X0 = LABEL_W + 10;
const X1 = W - 16;
const AXIS_H = 34;
const GROUP_H = 30;
const ROW_H = 24;

const xAt = (h: number, m = 0) => X0 + ((h + m / 60) / 24) * (X1 - X0);

type Row =
  | { type: "group"; g: Group; y: number }
  | { type: "job"; g: Group; j: Job; y: number };

const ROWS: Row[] = (() => {
  const rows: Row[] = [];
  let y = AXIS_H + 6;
  for (const g of GROUPS) {
    rows.push({ type: "group", g, y });
    y += GROUP_H;
    for (const j of g.jobs) {
      rows.push({ type: "job", g, j, y });
      y += ROW_H;
    }
    y += 8;
  }
  return rows;
})();

const H = ROWS[ROWS.length - 1].y + ROW_H + 10;

function nextJob(now: OsloTime) {
  const nowMin = now.h * 60 + now.m;
  const all = GROUPS.flatMap((g) => g.jobs.filter((j) => !j.monthly).map((j) => ({ g, j, t: j.h * 60 + j.m })));
  all.sort((a, b) => a.t - b.t);
  return all.find((x) => x.t > nowMin) ?? all[0];
}

export function NightTimeline({ onFocusNode }: { onFocusNode: (id: string) => void }) {
  const svg = useSvgIds();
  const now = useOsloNow(60_000);
  const [hover, setHover] = useState<string | null>(null);

  const next = now ? nextJob(now) : null;
  const hours = Array.from({ length: 25 }, (_, i) => i);

  return (
    <div className="arch-night">
      <div className="portal-diagram arch-night__surface">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", minWidth: 760, height: "auto", display: "block" }}
          role="group"
          aria-label="Planlagte jobber gjennom døgnet (norsk tid)"
        >
          <defs>
            <linearGradient id={svg.id("shade")} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="var(--ax-bg-accent-moderate)" stopOpacity={0.55} />
              <stop offset="100%" stopColor="var(--ax-bg-accent-moderate)" stopOpacity={0.15} />
            </linearGradient>
          </defs>

          {/* Natt: 22–24 og 00–06 */}
          <rect x={xAt(0)} y={AXIS_H - 6} width={xAt(6) - xAt(0)} height={H - AXIS_H} fill={svg.url("shade")} rx={6} />
          <rect x={xAt(22)} y={AXIS_H - 6} width={xAt(24) - xAt(22)} height={H - AXIS_H} fill="var(--ax-bg-accent-moderate)" fillOpacity={0.4} rx={6} />
          <text x={xAt(0) + 8} y={AXIS_H + 8} fontSize={10.5} fill="var(--ax-text-accent-subtle, var(--ax-text-neutral-subtle))" className="arch-eyebrow-svg">
            NATT
          </text>

          {/* Akse */}
          {hours.map((h) => (
            <g key={h}>
              <line x1={xAt(h)} x2={xAt(h)} y1={AXIS_H - 6} y2={H} stroke="var(--ax-border-neutral-subtle)" strokeOpacity={h % 6 === 0 ? 0.9 : 0.4} />
              {h % 2 === 0 && h < 24 && (!now || Math.abs(xAt(h) - xAt(now.h, now.m)) > 30) && (
                <text x={xAt(h)} y={AXIS_H - 14} textAnchor="middle" fontSize={10.5} className="arch-mono" fill="var(--ax-text-neutral-subtle)">
                  {hhmm(h, 0)}
                </text>
              )}
            </g>
          ))}

          {ROWS.map((r) => {
            if (r.type === "group") {
              const focus = () => onFocusNode(r.g.id);
              return (
                <g
                  key={`g-${r.g.id}`}
                  className="arch-night__group"
                  role="button"
                  tabIndex={0}
                  aria-label={`Vis detaljer om ${r.g.title}`}
                  onClick={focus}
                  onKeyDown={onActivate(focus)}
                >
                  <rect x={0} y={r.y + 3} width={LABEL_W} height={GROUP_H - 6} rx={6} className="arch-night__group-bg" />
                  <circle cx={12} cy={r.y + GROUP_H / 2} r={4} fill={r.g.kind === "scheduled" ? "var(--ax-border-success)" : "var(--ax-border-warning)"} />
                  <text x={24} y={r.y + GROUP_H / 2 + 4.5} fontSize={12.5} fontWeight={700} fill="var(--ax-text-neutral)">
                    {r.g.title}
                  </text>
                </g>
              );
            }
            const { g, j, y } = r;
            const key = `${g.id}-${j.name}`;
            const x = xAt(j.h, j.m);
            const cyy = y + ROW_H / 2;
            const isNext = next && next.g.id === g.id && next.j.name === j.name;
            const lit = hover === key;
            const prev = j.after ? g.jobs.find((p) => p.name === j.after) : undefined;
            const prevX = prev ? xAt(prev.h, prev.m) : x;
            const prevY = prev ? cyy - (g.jobs.indexOf(j) - g.jobs.indexOf(prev)) * ROW_H + 6 : cyy;
            const color = g.kind === "scheduled" ? "var(--ax-border-success)" : "var(--ax-border-warning)";
            const label = `${hhmm(j.h, j.m)}${j.monthly ? " · 1. i mnd." : ""}${j.note ? ` · ${j.note}` : ""}`;
            const labelRight = x + 12 + label.length * 6.2 < X1;
            return (
              <g
                key={key}
                className={`arch-night__job ${lit ? "is-lit" : ""}`}
                onMouseEnter={() => setHover(key)}
                onMouseLeave={() => setHover(null)}
              >
                <rect x={0} y={y} width={W} height={ROW_H} fill="transparent" />
                <text x={24} y={cyy + 4} fontSize={11.5} className="arch-mono" fill="var(--ax-text-neutral-subtle)">
                  {j.name}
                </text>
                <line x1={LABEL_W - 4} x2={prevX - 8} y1={cyy} y2={cyy} stroke="var(--ax-border-neutral-subtle)" strokeDasharray="1 4" />
                {prev && (
                  <path
                    d={`M ${prevX} ${prevY} L ${prevX} ${cyy} L ${x - 7} ${cyy}`}
                    fill="none"
                    stroke={color}
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    className="arch-night__chain"
                  />
                )}
                {isNext && <circle cx={x} cy={cyy} r={11} fill="none" stroke={color} strokeWidth={2} className="arch-night__next" />}
                <rect
                  x={x - 6}
                  y={cyy - 6}
                  width={12}
                  height={12}
                  rx={j.monthly ? 2 : 6}
                  transform={j.monthly ? `rotate(45 ${x} ${cyy})` : undefined}
                  fill={j.monthly ? "var(--ax-bg-default)" : color}
                  stroke={color}
                  strokeWidth={2}
                />
                <text
                  x={labelRight ? x + 14 : x - 14}
                  y={cyy + 4}
                  textAnchor={labelRight ? "start" : "end"}
                  fontSize={11}
                  className="arch-mono"
                  fontWeight={600}
                  fill="var(--ax-text-neutral)"
                >
                  {label}
                </text>
              </g>
            );
          })}

          {now && (
            <g className="arch-night__now">
              <line x1={xAt(now.h, now.m)} x2={xAt(now.h, now.m)} y1={AXIS_H - 6} y2={H} stroke="var(--ax-border-danger)" strokeWidth={1.5} />
              <rect x={xAt(now.h, now.m) - 20} y={AXIS_H - 27} width={40} height={17} rx={8.5} fill="var(--ax-bg-danger-strong)" />
              <text x={xAt(now.h, now.m)} y={AXIS_H - 15} textAnchor="middle" fontSize={10.5} fontWeight={700} fill="var(--ax-text-danger-contrast)" className="arch-mono">
                {hhmm(now.h, now.m)}
              </text>
            </g>
          )}
        </svg>
      </div>
      <div className="arch-night__meta">
        <BodyShort size="small" aria-live="polite">
          {next && now ? (
            <>
              Neste planlagte kjøring: <strong>{next.g.title}</strong> · <span className="arch-mono">{next.j.name}</span> kl.{" "}
              <strong>{hhmm(next.j.h, next.j.m)}</strong>
            </>
          ) : (
            " "
          )}
        </BodyShort>
        <Detail className="arch-subtle">
          ● daglig&nbsp;&nbsp;◇ månedlig (den 1.)&nbsp;&nbsp;Tidene gjelder prod og er norsk tid: NAIS-jobbene har{" "}
          <code>timeZone: Europe/Oslo</code>, og eux-barnetrygd setter <code>TZ=Europe/Oslo</code>. I testmiljøene er rapportjobbene
          slått av med en dato som aldri inntreffer (<code>0 0 31 2 *</code>).
        </Detail>
      </div>
    </div>
  );
}
