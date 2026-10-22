"use client";

import { useMemo, useState } from "react";
import { Chips } from "@navikt/ds-react";
import { useSvgIds } from "@/components/architecture/hooks";
import { JourneyBar, JourneyToken } from "@/components/process/Journey";
import { klokke, r2 } from "@/components/process/time";
import { useJourneyPlayer, type JourneyScale } from "@/components/process/useJourneyPlayer";
import { TONE } from "@/lib/tones";
import { GRENSE_DAGER, STATUS_BY_ID, type StatusId } from "./data";

/*
 * Tid måles i timer fra første hendelse, som i eksempelet kommer dag 0 kl. 14.00.
 * Aksen er brutt: dag 0–D er komprimert, dag D–D+4 forstørret, der D er GRENSE_DAGER.
 * Nettene i eksempelet regnes fra D, så de følger grensen.
 */
const D = GRENSE_DAGER;
const W = 1140;
const H = 300;
const X0 = 60;
const XB = 407;
const X1 = 1080;
const TRACK_Y = 150;
const START_H = 14;
const BREAK_T = D * 24 - START_H; // dag D kl. 00.00
const END_T = (D + 4) * 24 - START_H; // dag D+4 kl. 00.00
const SA = (XB - X0) / BREAK_T;
const SB = (X1 - XB) / (END_T - BREAK_T);
const CARD_W = 180;
const CARD_H = 62;

const xAt = (t: number) => r2(t <= BREAK_T ? X0 + Math.max(0, t) * SA : XB + (Math.min(t, END_T) - BREAK_T) * SB);
const tAtX = (x: number) => (x <= XB ? (x - X0) / SA : BREAK_T + (x - XB) / SB);
/** Timer fra start for et gitt klokkeslett på en gitt dag. */
const at = (day: number, h: number) => day * 24 + h - START_H;
const dayOf = (t: number) => Math.floor((t + START_H) / 24);
const hourOf = (t: number) => (((t + START_H) % 24) + 24) % 24;
/** Avspillingen går med jevn fart langs x-aksen, så den komprimerte delen går fortere. */
const SCALE: JourneyScale = {
  toProgress: (t) => (xAt(t) - X0) / (X1 - X0),
  fromProgress: (p) => tAtX(X0 + p * (X1 - X0)),
};

const ELIGIBLE_T = at(D, START_H);

type ScenarioId = "slettes" | "sed" | "nei" | "borte" | "feil";
type Seg = { from: number; status: StatusId };
type Card = { t: number; title: string; line: string; status?: StatusId; muted?: string; mail?: boolean };
type Scenario = { id: ScenarioId; label: string; segs: Seg[]; cards: Card[]; final?: number };

const til = (line: string, status?: StatusId, muted?: string): Card => ({ t: at(D + 1, 2), title: `☾ Natt til dag ${D + 1}`, line: `02.00 til-sletting${line}`, status, muted });
const slett = (day: number, line: string, status?: StatusId, muted?: string): Card => ({
  t: at(day, 1),
  title: `☾ Natt til dag ${day}`,
  line: `01.00 slett${line}`,
  status,
  muted,
});

const SCENARIOS: Scenario[] = [
  {
    id: "slettes",
    label: "Slettes",
    segs: [
      { from: 0, status: "NY_SAK" },
      { from: at(D + 1, 2), status: "TIL_SLETTING" },
      { from: at(D + 2, 1), status: "SLETTET" },
    ],
    cards: [til(" · ja", "TIL_SLETTING"), slett(D + 2, " · 204", "SLETTET")],
    final: at(D + 2, 1),
  },
  {
    id: "sed",
    label: "SED kommer",
    segs: [
      { from: 0, status: "NY_SAK" },
      { from: at(7, 10), status: "DOKUMENT_SENT" },
    ],
    cards: [
      { t: at(7, 10), title: "✉ Dag 7 kl. 10.00", line: "SENT_DOCUMENT", status: "DOKUMENT_SENT", mail: true },
      til("", undefined, "ser ikke saken"),
    ],
    final: at(7, 10),
  },
  {
    id: "nei",
    label: "Kan ikke slettes",
    segs: [
      { from: 0, status: "NY_SAK" },
      { from: at(D + 1, 2), status: "KAN_IKKE_SLETTES" },
    ],
    cards: [til(" · nei", "KAN_IKKE_SLETTES"), slett(D + 2, "", undefined, "ser ikke saken")],
    final: at(D + 1, 2),
  },
  {
    id: "borte",
    label: "Borte fra før (404)",
    segs: [
      { from: 0, status: "NY_SAK" },
      { from: at(D + 1, 2), status: "TIL_SLETTING" },
      { from: at(D + 2, 1), status: "NOT_FOUND" },
    ],
    cards: [til(" · ja", "TIL_SLETTING"), slett(D + 2, " · 404", "NOT_FOUND")],
    final: at(D + 2, 1),
  },
  {
    id: "feil",
    label: "Feiler to ganger",
    segs: [
      { from: 0, status: "NY_SAK" },
      { from: at(D + 1, 2), status: "TIL_SLETTING" },
      { from: at(D + 2, 1), status: "SLETTING_FEILET_RETRY" },
      { from: at(D + 3, 1), status: "SLETTING_FEILET" },
    ],
    cards: [til(" · ja", "TIL_SLETTING"), slett(D + 2, " · 500", "SLETTING_FEILET_RETRY"), slett(D + 3, " · 500", "SLETTING_FEILET")],
    final: at(D + 3, 1),
  },
];
const SCENARIO_BY_ID = Object.fromEntries(SCENARIOS.map((s) => [s.id, s])) as Record<ScenarioId, Scenario>;

const statusAt = (s: Scenario, t: number): StatusId => {
  let cur = s.segs[0].status;
  for (const seg of s.segs) if (t >= seg.from) cur = seg.status;
  return cur;
};

/** Netter (22–06) i den forstørrede delen. */
const NIGHTS = [D - 1, D, D + 1, D + 2, D + 3]
  .map((d) => ({ d, from: Math.max(at(d, 22), BREAK_T), to: Math.min(at(d + 1, 6), END_T) }))
  .filter((n) => n.to > n.from);

const DAY_LABELS = [
  { d: 5, t: at(5, 12) },
  { d: 10, t: at(10, 12) },
  ...[D, D + 1, D + 2, D + 3].map((d) => ({ d, t: at(d, 12) })),
];
const MIDNIGHTS = [D + 1, D + 2, D + 3].map((d) => at(d, 0));

export function CaseJourney({ onFocusStatus }: { onFocusStatus: (s: StatusId) => void }) {
  const [id, setId] = useState<ScenarioId>("slettes");
  const sc = SCENARIO_BY_ID[id];
  const svg = useSvgIds();
  const player = useJourneyPlayer({ end: END_T, durationMs: 7000, resetKey: id, scale: SCALE });
  const { shown, playing } = player;

  const status = statusAt(sc, shown);
  const finalTone = sc.final === undefined ? null : TONE[STATUS_BY_ID[statusAt(sc, sc.final)].tone];
  const info = STATUS_BY_ID[status];
  const segs = useMemo(
    () => sc.segs.map((s, i) => ({ ...s, to: sc.segs[i + 1]?.from ?? END_T, open: i === sc.segs.length - 1 })),
    [sc],
  );

  const day = dayOf(shown);
  const when = `dag ${day} kl. ${klokke(hourOf(shown), 0)}`;

  return (
    <div className="proc-journey">
      <div className="proc-journey__controls">
        <Chips size="small" aria-label="Velg hva som skjer med saken">
          {SCENARIOS.map((s) => (
            <Chips.Toggle key={s.id} selected={s.id === id} checkmark={false} onClick={() => setId(s.id)}>
              {s.label}
            </Chips.Toggle>
          ))}
        </Chips>
      </div>

      <div className="portal-diagram proc-surface proc-journey__surface">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", minWidth: 760, height: "auto", display: "block" }}
          role="img"
          aria-label={`Livsløpet til en sak uten SED – ${sc.label}. ${when}: ${status}.`}
        >
          <defs>
            <clipPath id={svg.id("progress")}>
              <rect x={0} y={0} width={xAt(shown)} height={H} />
            </clipPath>
            <linearGradient id={svg.id("zoom-fade")} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="var(--ax-bg-accent-soft)" stopOpacity={0} />
              <stop offset="0.06" stopColor="var(--ax-bg-accent-soft)" stopOpacity={0.55} />
              <stop offset="1" stopColor="var(--ax-bg-accent-soft)" stopOpacity={0.55} />
            </linearGradient>
          </defs>

          {/* Forstørret område og netter */}
          <rect x={XB} y={26} width={X1 - XB + 30} height={H - 34} rx={12} fill={svg.url("zoom-fade")} />
          <text x={X0} y={18} fontSize={10} fontWeight={700} className="arch-eyebrow-svg" fill="var(--ax-text-neutral-subtle)">
            DAG 0–{D} · KOMPRIMERT
          </text>
          <text x={XB + 14} y={18} fontSize={10} fontWeight={700} className="arch-eyebrow-svg" fill="var(--ax-text-accent)">
            DAG {D}–{D + 4} · FORSTØRRET
          </text>
          {NIGHTS.map((n) => (
            <g key={n.d}>
              <rect x={xAt(n.from)} y={30} width={r2(xAt(n.to) - xAt(n.from))} height={H - 42} fill="var(--ax-bg-neutral-moderate)" opacity={0.45} />
              {n.to - n.from >= 8 && (
                <text x={xAt((n.from + n.to) / 2)} y={44} textAnchor="middle" fontSize={11} fill="var(--ax-text-neutral-subtle)">
                  ☾
                </text>
              )}
            </g>
          ))}

          {/* Akse */}
          <line x1={X0} x2={X1} y1={TRACK_Y} y2={TRACK_Y} stroke="var(--ax-border-neutral-subtle)" strokeWidth={2} />
          {MIDNIGHTS.map((m) => (
            <line key={m} x1={xAt(m)} x2={xAt(m)} y1={TRACK_Y + 9} y2={TRACK_Y + 15} stroke="var(--ax-border-neutral)" />
          ))}
          {DAY_LABELS.map((l) => (
            <text key={l.d} x={xAt(l.t)} y={TRACK_Y + 30} textAnchor="middle" fontSize={10.5} className="arch-mono" fill="var(--ax-text-neutral-subtle)">
              dag {l.d}
            </text>
          ))}

          {/* Grensen */}
          <g className="sl-journey__limit">
            <line x1={xAt(ELIGIBLE_T)} x2={xAt(ELIGIBLE_T)} y1={TRACK_Y - 10} y2={TRACK_Y - 70} stroke="var(--ax-border-warning)" strokeWidth={1.5} strokeDasharray="3 3" />
            <circle cx={xAt(ELIGIBLE_T)} cy={TRACK_Y - 70} r={3} fill="var(--ax-border-warning)" />
            <text x={xAt(ELIGIBLE_T) - 8} y={TRACK_Y - 66} textAnchor="end" fontSize={10.5} fontWeight={700} fill="var(--ax-text-warning)">
              {D} dager
            </text>
            <text x={xAt(ELIGIBLE_T) - 8} y={TRACK_Y - 53} textAnchor="end" fontSize={9.5} fill="var(--ax-text-neutral-subtle)">
              dag {D} kl. {klokke(START_H)}
            </text>
          </g>

          {/* Segmenter */}
          {segs.map((s, i) => {
            const tone = TONE[STATUS_BY_ID[s.status].tone];
            const x = xAt(s.from);
            const w = Math.max(4, r2(xAt(s.to) - x));
            return (
              <g key={`${id}-${i}`} className="proc-journey__seg" style={{ animationDelay: `${i * 120}ms` }}>
                <rect x={x} y={TRACK_Y - 7} width={w} height={14} rx={7} fill={tone.stroke} opacity={0.3} />
                <rect x={x} y={TRACK_Y - 7} width={w} height={14} rx={7} fill={tone.stroke} opacity={s.open ? 0.75 : 0.95} clipPath={svg.url("progress")} />
                {s.open && <rect x={x} y={TRACK_Y - 7} width={w} height={14} rx={7} fill="none" stroke={tone.stroke} strokeDasharray="4 5" opacity={0.7} />}
                {w > s.status.length * 6.4 + 16 && (
                  <text x={r2(x + w / 2)} y={TRACK_Y - 13} textAnchor="middle" fontSize={10} fontWeight={700} className="arch-mono arch-halo" fill={tone.text}>
                    {s.status}
                  </text>
                )}
              </g>
            );
          })}

          {/* Brudd i aksen */}
          <g aria-hidden>
            <path d={`M ${XB - 7} ${TRACK_Y + 12} L ${XB - 1} ${TRACK_Y - 12} M ${XB + 1} ${TRACK_Y + 12} L ${XB + 7} ${TRACK_Y - 12}`} stroke="var(--ax-bg-default)" strokeWidth={5} />
            <path d={`M ${XB - 7} ${TRACK_Y + 12} L ${XB - 1} ${TRACK_Y - 12} M ${XB + 1} ${TRACK_Y + 12} L ${XB + 7} ${TRACK_Y - 12}`} stroke="var(--ax-border-neutral-strong)" strokeWidth={1.3} />
          </g>

          {/* Start */}
          <circle cx={X0} cy={TRACK_Y} r={8} fill="var(--ax-bg-default)" stroke="var(--ax-border-accent)" strokeWidth={2.5} />
          <text x={X0} y={TRACK_Y + 30} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--ax-text-neutral)">
            Første hendelse
          </text>
          <text x={X0} y={TRACK_Y + 44} textAnchor="middle" fontSize={10} fill="var(--ax-text-neutral-subtle)">
            dag 0 kl. 14.00
          </text>

          {/* Hendelser */}
          {sc.cards.map((c, i) => {
            const above = i % 2 === 0;
            const x = xAt(c.t);
            const anchorEnd = x + CARD_W - 18 > W - 4;
            const cx = anchorEnd ? x - CARD_W + 18 : x - 18;
            const cy = above ? TRACK_Y - 26 - CARD_H : TRACK_Y + 56;
            const lit = shown >= c.t;
            const tone = c.status ? TONE[STATUS_BY_ID[c.status].tone] : null;
            return (
              <g key={`${id}-c${i}`} className="proc-journey__seg" style={{ animationDelay: `${200 + i * 140}ms` }}>
                <g opacity={lit ? 1 : 0.5} style={{ transition: "opacity 220ms ease" }}>
                  <line
                    x1={x}
                    x2={x}
                    y1={above ? cy + CARD_H : TRACK_Y + 10}
                    y2={above ? TRACK_Y - 10 : cy}
                    stroke={c.mail ? "var(--ax-border-meta-purple)" : "var(--ax-border-neutral-strong)"}
                    strokeDasharray="2 3"
                  />
                  <rect
                    x={cx}
                    y={cy}
                    width={CARD_W}
                    height={CARD_H}
                    rx={10}
                    fill="var(--ax-bg-default)"
                    stroke={lit ? (c.mail ? "var(--ax-border-meta-purple)" : "var(--ax-border-accent)") : "var(--ax-border-neutral-subtle)"}
                    strokeWidth={1.3}
                  />
                  <text x={cx + 12} y={cy + 18} fontSize={10.5} fontWeight={700} fill="var(--ax-text-neutral)">
                    {c.title}
                  </text>
                  <text x={cx + 12} y={cy + 35} fontSize={10} className="arch-mono" fill="var(--ax-text-neutral-subtle)">
                    {c.line}
                  </text>
                  {tone ? (
                    <text x={cx + 12} y={cy + 51} fontSize={10} fontWeight={700} className="arch-mono" fill={tone.text}>
                      → {c.status}
                    </text>
                  ) : (
                    <text x={cx + 12} y={cy + 51} fontSize={10} fontStyle="italic" fill="var(--ax-text-neutral-subtle)">
                      {c.muted}
                    </text>
                  )}
                  <circle
                    cx={x}
                    cy={TRACK_Y}
                    r={6}
                    fill="var(--ax-bg-default)"
                    stroke={c.mail ? "var(--ax-border-meta-purple)" : "var(--ax-border-neutral-strong)"}
                    strokeWidth={2}
                  />
                </g>
              </g>
            );
          })}

          {/* Endelig status */}
          {sc.final !== undefined && finalTone && (
            <g className="proc-journey__seg" style={{ animationDelay: "500ms" }} opacity={shown >= sc.final ? 1 : 0.4}>
              <circle cx={xAt(sc.final)} cy={TRACK_Y} r={9} fill="var(--ax-bg-default)" stroke={finalTone.stroke} strokeWidth={2} />
              <circle cx={xAt(sc.final)} cy={TRACK_Y} r={4.5} fill={finalTone.strong} />
            </g>
          )}

          {/* Markør */}
          <JourneyToken x={xAt(shown)} y={TRACK_Y} tone={info.tone} playing={playing} />
        </svg>
      </div>

      <JourneyBar
        player={player}
        end={END_T}
        rangeLabel="Tidspunkt i saken"
        when={when}
        whenClassName="sl-journey__when"
        status={info}
        onFocusStatus={() => onFocusStatus(status)}
      />
    </div>
  );
}
