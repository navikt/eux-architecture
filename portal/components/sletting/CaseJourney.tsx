"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BodyShort, Button, Chips } from "@navikt/ds-react";
import { ArrowRightIcon, PauseIcon, PlayIcon } from "@navikt/aksel-icons";
import { useReducedMotion } from "@/components/architecture/hooks";
import { TONE } from "@/components/avslutning/tones";
import { STATUS_BY_ID, klokke, type StatusId } from "./data";

/*
 * Tid måles i timer fra første hendelse, som i eksempelet kommer dag 0 kl. 14.00.
 * Aksen er brutt: dag 0–15 er komprimert, dag 15–19 forstørret.
 */
const W = 1140;
const H = 300;
const X0 = 60;
const XB = 407;
const X1 = 1080;
const TRACK_Y = 150;
const START_H = 14;
const BREAK_T = 15 * 24 - START_H; // dag 15 kl. 00.00
const END_T = 19 * 24 - START_H; // dag 19 kl. 00.00
const SA = (XB - X0) / BREAK_T;
const SB = (X1 - XB) / (END_T - BREAK_T);
const CARD_W = 180;
const CARD_H = 62;

const r2 = (n: number) => Math.round(n * 100) / 100;
const xAt = (t: number) => r2(t <= BREAK_T ? X0 + Math.max(0, t) * SA : XB + (Math.min(t, END_T) - BREAK_T) * SB);
const tAtX = (x: number) => (x <= XB ? (x - X0) / SA : BREAK_T + (x - XB) / SB);
/** Timer fra start for et gitt klokkeslett på en gitt dag. */
const at = (day: number, h: number) => day * 24 + h - START_H;
const dayOf = (t: number) => Math.floor((t + START_H) / 24);
const hourOf = (t: number) => (((t + START_H) % 24) + 24) % 24;

const ELIGIBLE_T = at(15, 14);

type ScenarioId = "slettes" | "sed" | "nei" | "borte" | "feil";
type Seg = { from: number; status: StatusId };
type Card = { t: number; title: string; line: string; status?: StatusId; muted?: string; mail?: boolean };
type Scenario = { id: ScenarioId; label: string; segs: Seg[]; cards: Card[]; final?: number };

const til = (line: string, status?: StatusId, muted?: string): Card => ({ t: at(16, 2), title: "☾ Natt til dag 16", line: `02.00 til-sletting${line}`, status, muted });
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
      { from: at(16, 2), status: "TIL_SLETTING" },
      { from: at(17, 1), status: "SLETTET" },
    ],
    cards: [til(" · ja", "TIL_SLETTING"), slett(17, " · 204", "SLETTET")],
    final: at(17, 1),
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
      { from: at(16, 2), status: "KAN_IKKE_SLETTES" },
    ],
    cards: [til(" · nei", "KAN_IKKE_SLETTES"), slett(17, "", undefined, "ser ikke saken")],
    final: at(16, 2),
  },
  {
    id: "borte",
    label: "Borte fra før (404)",
    segs: [
      { from: 0, status: "NY_SAK" },
      { from: at(16, 2), status: "TIL_SLETTING" },
      { from: at(17, 1), status: "NOT_FOUND" },
    ],
    cards: [til(" · ja", "TIL_SLETTING"), slett(17, " · 404", "NOT_FOUND")],
    final: at(17, 1),
  },
  {
    id: "feil",
    label: "Feiler to ganger",
    segs: [
      { from: 0, status: "NY_SAK" },
      { from: at(16, 2), status: "TIL_SLETTING" },
      { from: at(17, 1), status: "SLETTING_FEILET_RETRY" },
      { from: at(18, 1), status: "SLETTING_FEILET" },
    ],
    cards: [til(" · ja", "TIL_SLETTING"), slett(17, " · 500", "SLETTING_FEILET_RETRY"), slett(18, " · 500", "SLETTING_FEILET")],
    final: at(18, 1),
  },
];
const SCENARIO_BY_ID = Object.fromEntries(SCENARIOS.map((s) => [s.id, s])) as Record<ScenarioId, Scenario>;

const statusAt = (s: Scenario, t: number): StatusId => {
  let cur = s.segs[0].status;
  for (const seg of s.segs) if (t >= seg.from) cur = seg.status;
  return cur;
};

/** Netter (22–06) i den forstørrede delen. */
const NIGHTS = [14, 15, 16, 17, 18]
  .map((d) => ({ d, from: Math.max(at(d, 22), BREAK_T), to: Math.min(at(d + 1, 6), END_T) }))
  .filter((n) => n.to > n.from);

const DAY_LABELS = [
  { d: 5, t: at(5, 12) },
  { d: 10, t: at(10, 12) },
  ...[15, 16, 17, 18].map((d) => ({ d, t: at(d, 12) })),
];
const MIDNIGHTS = [16, 17, 18].map((d) => at(d, 0));

export function CaseJourney({ onFocusStatus }: { onFocusStatus: (s: StatusId) => void }) {
  const [id, setId] = useState<ScenarioId>("slettes");
  const sc = SCENARIO_BY_ID[id];
  const reduced = useReducedMotion();

  const [t, setT] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const shown = t ?? END_T;
  const raf = useRef<number | null>(null);
  const startX = useRef(X0);
  const [lastId, setLastId] = useState(id);
  if (lastId !== id) {
    setLastId(id);
    setT(null);
    setPlaying(false);
  }

  useEffect(() => {
    if (!playing) return;
    const duration = 7000;
    const span = X1 - X0;
    let start: number | null = null;
    const from = startX.current;
    const step = (ts: number) => {
      if (start === null) start = ts - ((from - X0) / span) * duration;
      const x = Math.min(X1, X0 + ((ts - start) / duration) * span);
      setT(Math.round(tAtX(x)));
      if (x < X1) raf.current = requestAnimationFrame(step);
      else setPlaying(false);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, [playing]);

  const status = statusAt(sc, shown);
  const info = STATUS_BY_ID[status];
  const segs = useMemo(
    () => sc.segs.map((s, i) => ({ ...s, to: sc.segs[i + 1]?.from ?? END_T, open: i === sc.segs.length - 1 })),
    [sc],
  );

  const play = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (reduced) {
      setT(null);
      return;
    }
    const from = t === null || t >= END_T ? 0 : t;
    startX.current = xAt(from);
    setT(from);
    setPlaying(true);
  };

  const day = dayOf(shown);
  const when = `dag ${day} kl. ${klokke(hourOf(shown), 0)}`;

  return (
    <div className="avs-journey sl-journey">
      <div className="avs-journey__controls">
        <Chips size="small" aria-label="Velg hva som skjer med saken">
          {SCENARIOS.map((s) => (
            <Chips.Toggle key={s.id} selected={s.id === id} checkmark={false} onClick={() => setId(s.id)}>
              {s.label}
            </Chips.Toggle>
          ))}
        </Chips>
      </div>

      <div className="portal-diagram avs-surface avs-journey__surface">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", minWidth: 760, height: "auto", display: "block" }}
          role="img"
          aria-label={`Livsløpet til en sak uten SED – ${sc.label}. ${when}: ${status}.`}
        >
          <defs>
            <clipPath id="sl-journey-progress">
              <rect x={0} y={0} width={xAt(shown)} height={H} />
            </clipPath>
            <linearGradient id="sl-zoom-fade" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="var(--ax-bg-accent-soft)" stopOpacity={0} />
              <stop offset="0.06" stopColor="var(--ax-bg-accent-soft)" stopOpacity={0.55} />
              <stop offset="1" stopColor="var(--ax-bg-accent-soft)" stopOpacity={0.55} />
            </linearGradient>
          </defs>

          {/* Forstørret område og netter */}
          <rect x={XB} y={26} width={X1 - XB + 30} height={H - 34} rx={12} fill="url(#sl-zoom-fade)" />
          <text x={X0} y={18} fontSize={10} fontWeight={700} className="arch-eyebrow-svg" fill="var(--ax-text-neutral-subtle)">
            DAG 0–15 · KOMPRIMERT
          </text>
          <text x={XB + 14} y={18} fontSize={10} fontWeight={700} className="arch-eyebrow-svg" fill="var(--ax-text-accent)">
            DAG 15–19 · FORSTØRRET
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

          {/* 15-dagersgrensen */}
          <g className="sl-journey__limit">
            <line x1={xAt(ELIGIBLE_T)} x2={xAt(ELIGIBLE_T)} y1={TRACK_Y - 10} y2={TRACK_Y - 70} stroke="var(--ax-border-warning)" strokeWidth={1.5} strokeDasharray="3 3" />
            <circle cx={xAt(ELIGIBLE_T)} cy={TRACK_Y - 70} r={3} fill="var(--ax-border-warning)" />
            <text x={xAt(ELIGIBLE_T) - 8} y={TRACK_Y - 66} textAnchor="end" fontSize={10.5} fontWeight={700} fill="var(--ax-text-warning)">
              15 dager
            </text>
            <text x={xAt(ELIGIBLE_T) - 8} y={TRACK_Y - 53} textAnchor="end" fontSize={9.5} fill="var(--ax-text-neutral-subtle)">
              dag 15 kl. 14.00
            </text>
          </g>

          {/* Segmenter */}
          {segs.map((s, i) => {
            const tone = TONE[STATUS_BY_ID[s.status].tone];
            const x = xAt(s.from);
            const w = Math.max(4, r2(xAt(s.to) - x));
            return (
              <g key={`${id}-${i}`} className="avs-journey__seg" style={{ animationDelay: `${i * 120}ms` }}>
                <rect x={x} y={TRACK_Y - 7} width={w} height={14} rx={7} fill={tone.stroke} opacity={0.3} />
                <rect x={x} y={TRACK_Y - 7} width={w} height={14} rx={7} fill={tone.stroke} opacity={s.open ? 0.75 : 0.95} clipPath="url(#sl-journey-progress)" />
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
              <g key={`${id}-c${i}`} className="avs-journey__seg" style={{ animationDelay: `${200 + i * 140}ms` }}>
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
          {sc.final !== undefined && (
            <g className="avs-journey__seg" style={{ animationDelay: "500ms" }} opacity={shown >= sc.final ? 1 : 0.4}>
              <circle cx={xAt(sc.final)} cy={TRACK_Y} r={9} fill="var(--ax-bg-default)" stroke={TONE[STATUS_BY_ID[statusAt(sc, sc.final)].tone].stroke} strokeWidth={2} />
              <circle cx={xAt(sc.final)} cy={TRACK_Y} r={4.5} fill={TONE[STATUS_BY_ID[statusAt(sc, sc.final)].tone].strong} />
            </g>
          )}

          {/* Markør */}
          <g
            className="avs-journey__token"
            style={{ transform: `translate(${xAt(shown)}px, ${TRACK_Y}px)`, transition: playing ? "none" : "transform 300ms ease" }}
          >
            <circle r={13} fill={TONE[info.tone].strong} opacity={0.2} className={playing ? "" : "avs-breathe"} />
            <circle r={7.5} fill={TONE[info.tone].strong} stroke="var(--ax-bg-default)" strokeWidth={2.5} />
          </g>
        </svg>
      </div>

      <div className="avs-journey__bar">
        <Button size="small" variant="primary" icon={playing ? <PauseIcon aria-hidden /> : <PlayIcon aria-hidden />} onClick={play}>
          {playing ? "Pause" : "Spill av"}
        </Button>
        <label className="avs-journey__range">
          <span className="aksel-sr-only">Tidspunkt i saken</span>
          <input
            type="range"
            min={0}
            max={END_T}
            value={shown}
            onChange={(e) => {
              setPlaying(false);
              setT(Number(e.target.value));
            }}
            aria-valuetext={when}
          />
        </label>
        <div className="avs-journey__now" data-tone={info.tone} aria-live="polite">
          <span className="avs-journey__day sl-journey__when arch-mono">{when}</span>
          <button type="button" className="avs-status-pill" onClick={() => onFocusStatus(status)} title="Vis i statusdiagrammet">
            <span className="arch-mono">{status}</span>
            <ArrowRightIcon aria-hidden />
          </button>
          <BodyShort size="small" className="arch-subtle">
            {info.label}
          </BodyShort>
        </div>
      </div>
    </div>
  );
}
