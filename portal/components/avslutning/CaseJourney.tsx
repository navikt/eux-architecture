"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BodyShort, Button, Chips, Detail, HStack, ToggleGroup } from "@navikt/ds-react";
import { ArrowRightIcon, PauseIcon, PlayIcon } from "@navikt/aksel-icons";
import { useReducedMotion } from "@/components/architecture/hooks";
import { BUCS, BUC_BY_NAME, FAMILIES, STATUS_BY_ID, scopeFor, type Role, type StatusId } from "./data";
import { TONE } from "./tones";

const W = 1140;
const H = 262;
const X0 = 70;
const X1 = 1110;
const MAX_DAY = 800;
const TRACK_Y = 132;
const xAt = (d: number) => X0 + (Math.min(d, MAX_DAY) / MAX_DAY) * (X1 - X0);

type Scenario = "treff" | "ingen";

type Seg = { from: number; to: number; status: StatusId; open?: boolean };
type Night = { day: number; title: string; steps: { t: string; label: string; status?: StatusId }[] };
type Journey = { segs: Seg[]; nights: Night[]; end: number; open: boolean; endNote: string };

function buildJourney(bucName: string, role: Role, scenario: Scenario): Journey {
  const b = BUC_BY_NAME[bucName];
  const scope = scopeFor(b, role);
  const U = b.uvirksom;
  const A = b.arkivering;

  if (scope === null) {
    return {
      segs: [
        { from: 0, to: U, status: "NY_SAK" },
        { from: U, to: U + 110, status: "AVSLUTTES_AV_MOTPART", open: true },
      ],
      nights: [
        {
          day: U,
          title: `Natt etter dag ${U}`,
          steps: [
            { t: "01.00", label: "UVIRKSOM", status: "UVIRKSOM" },
            { t: "02.00", label: "AVSLUTTES_AV_MOTPART", status: "AVSLUTTES_AV_MOTPART" },
          ],
        },
      ],
      end: U + 110,
      open: true,
      endNote: "NAV gjør ikke mer – motparten må lukke saken",
    };
  }

  const tilAvs = `TIL_AVSLUTNING_${scope}` as StatusId;
  const avsluttet = `AVSLUTTET_${scope}` as StatusId;
  const archiveNight = (day: number): Night => ({
    day,
    title: `Natt etter dag ${day}`,
    steps: [
      { t: "04.00", label: "TIL_ARKIVERING", status: "TIL_ARKIVERING" },
      { t: "05.00", label: "ARKIVERT", status: "ARKIVERT" },
    ],
  });

  if (scenario === "treff") {
    return {
      segs: [
        { from: 0, to: U, status: "NY_SAK" },
        { from: U, to: U + A, status: avsluttet },
      ],
      nights: [
        {
          day: U,
          title: `Natt etter dag ${U}`,
          steps: [
            { t: "01.00", label: "UVIRKSOM", status: "UVIRKSOM" },
            { t: "02.00", label: tilAvs, status: tilAvs },
            { t: "03.00", label: avsluttet, status: avsluttet },
          ],
        },
        archiveNight(U + A),
      ],
      end: U + A,
      open: false,
      endNote: "Arkivert i RINA",
    };
  }

  if (b.fallback !== null) {
    const F = U + b.fallback;
    return {
      segs: [
        { from: 0, to: U, status: "NY_SAK" },
        { from: U, to: F, status: "UVIRKSOM" },
        { from: F, to: F + A, status: avsluttet },
      ],
      nights: [
        {
          day: U,
          title: `Natt etter dag ${U}`,
          steps: [
            { t: "01.00", label: "UVIRKSOM", status: "UVIRKSOM" },
            { t: "02.00", label: "ingen treff – prøv igjen" },
          ],
        },
        {
          day: F,
          title: `Natt etter dag ${F} · reserveregel`,
          steps: [
            { t: "02.00", label: tilAvs, status: tilAvs },
            { t: "03.00", label: avsluttet, status: avsluttet },
          ],
        },
        archiveNight(F + A),
      ],
      end: F + A,
      open: false,
      endNote: "Arkivert i RINA",
    };
  }

  return {
    segs: [
      { from: 0, to: U, status: "NY_SAK" },
      { from: U, to: MAX_DAY, status: "UVIRKSOM", open: true },
    ],
    nights: [
      {
        day: U,
        title: `Natt etter dag ${U}`,
        steps: [
          { t: "01.00", label: "UVIRKSOM", status: "UVIRKSOM" },
          { t: "02.00", label: "ingen treff – prøv igjen" },
        ],
      },
    ],
    end: MAX_DAY,
    open: true,
    endNote: "Blir stående som UVIRKSOM og vurderes hver natt til en ny SED kommer",
  };
}

function statusAt(j: Journey, day: number): StatusId {
  if (day >= j.end && !j.open) return "ARKIVERT";
  for (const s of j.segs) if (day < s.to || s.open) if (day >= s.from) return s.status;
  return j.segs[j.segs.length - 1].status;
}

const CARD_W = 214;

export function CaseJourney({
  buc,
  role,
  onBuc,
  onRole,
  onFocusStatus,
}: {
  buc: string;
  role: Role;
  onBuc: (b: string) => void;
  onRole: (r: Role) => void;
  onFocusStatus: (s: StatusId) => void;
}) {
  const [scenario, setScenario] = useState<Scenario>("treff");
  const b = BUC_BY_NAME[buc];
  const scope = scopeFor(b, role);
  const effective: Scenario = scope === null ? "treff" : scenario;
  const journey = useMemo(() => buildJourney(buc, role, effective), [buc, role, effective]);
  const reduced = useReducedMotion();

  const [day, setDay] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const shown = day ?? journey.end;
  const raf = useRef<number | null>(null);
  const startDay = useRef(0);
  const key = `${buc}-${role}-${effective}`;
  const [lastKey, setLastKey] = useState(key);
  if (lastKey !== key) {
    setLastKey(key);
    setDay(null);
    setPlaying(false);
  }

  useEffect(() => {
    if (!playing) return;
    const total = journey.end;
    const duration = 6500;
    let start: number | null = null;
    const from = startDay.current;
    const step = (ts: number) => {
      if (start === null) start = ts - (from / total) * duration;
      const d = Math.min(total, ((ts - start) / duration) * total);
      setDay(Math.round(d));
      if (d < total) raf.current = requestAnimationFrame(step);
      else setPlaying(false);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, [playing, journey.end]);

  const status = statusAt(journey, shown);
  const info = STATUS_BY_ID[status];
  const milestones = [0, ...journey.nights.map((n) => n.day), ...(journey.open ? [] : [journey.end])];
  const ticks = [90, 180, 270, 360, 450, 540, 630, 720].filter((t) => milestones.every((m) => Math.abs(xAt(m) - xAt(t)) > 34));

  const play = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (reduced) {
      setDay(null);
      return;
    }
    const from = day === null || day >= journey.end ? 0 : day;
    startDay.current = from;
    setDay(from);
    setPlaying(true);
  };

  return (
    <div className="avs-journey">
      <div className="avs-journey__controls">
        <div className="avs-bucpicker" role="group" aria-label="Velg BUC">
          {FAMILIES.map((f) => (
            <div key={f.id} className="avs-bucpicker__family" data-tone={f.tone}>
              <Detail className="avs-bucpicker__label">{f.label}</Detail>
              <Chips size="small">
                {BUCS.filter((x) => x.family === f.id).map((x) => (
                  <Chips.Toggle key={x.navn} selected={x.navn === buc} checkmark={false} onClick={() => onBuc(x.navn)}>
                    {x.navn}
                  </Chips.Toggle>
                ))}
              </Chips>
            </div>
          ))}
        </div>
        <HStack gap="space-16" wrap align="end">
          <ToggleGroup size="small" value={role} onChange={(v) => onRole(v as Role)} label="NAVs rolle">
            <ToggleGroup.Item value="sakseier" label="Sakseier" />
            <ToggleGroup.Item value="motpart" label="Motpart" />
          </ToggleGroup>
          <ToggleGroup size="small" value={effective} onChange={(v) => setScenario(v as Scenario)} label="Når saken vurderes">
            <ToggleGroup.Item value="treff" label="Regelen slår til" disabled={scope === null} />
            <ToggleGroup.Item value="ingen" label="Ingen treff" disabled={scope === null} />
          </ToggleGroup>
        </HStack>
      </div>

      <div className="portal-diagram avs-surface avs-journey__surface">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", minWidth: 760, height: "auto", display: "block" }}
          role="img"
          aria-label={`Livsløpet til en ${buc}-sak der NAV er ${role}. Dag ${shown}: ${status}.`}
        >
          <defs>
            <linearGradient id="avs-open-fade" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="var(--ax-border-warning)" stopOpacity={1} />
              <stop offset="1" stopColor="var(--ax-border-warning)" stopOpacity={0} />
            </linearGradient>
            <clipPath id="avs-journey-progress">
              <rect x={0} y={0} width={xAt(shown)} height={H} />
            </clipPath>
          </defs>

          {/* Akse */}
          <line x1={X0} x2={X1} y1={TRACK_Y} y2={TRACK_Y} stroke="var(--ax-border-neutral-subtle)" strokeWidth={2} />
          {ticks.map((t) => (
            <g key={t}>
              <line x1={xAt(t)} x2={xAt(t)} y1={TRACK_Y + 9} y2={TRACK_Y + 15} stroke="var(--ax-border-neutral)" />
              <text x={xAt(t)} y={TRACK_Y + 30} textAnchor="middle" fontSize={10.5} className="arch-mono" fill="var(--ax-text-neutral-subtle)">
                {t} d
              </text>
              {(t === 360 || t === 720) && (
                <text x={xAt(t)} y={TRACK_Y + 43} textAnchor="middle" fontSize={9.5} fill="var(--ax-text-neutral-subtle)">
                  ≈ {t / 360} år
                </text>
              )}
            </g>
          ))}

          {/* Segmenter */}
          {journey.segs.map((s, i) => {
            const t = TONE[STATUS_BY_ID[s.status].tone];
            const x = xAt(s.from);
            const w = Math.max(4, xAt(s.to) - x);
            const fill = s.open ? "url(#avs-open-fade)" : t.stroke;
            return (
              <g key={`${key}-${i}`} className="avs-journey__seg" style={{ animationDelay: `${i * 120}ms` }}>
                <rect x={x} y={TRACK_Y - 7} width={w} height={14} rx={7} fill={fill} opacity={0.3} />
                <rect x={x} y={TRACK_Y - 7} width={w} height={14} rx={7} fill={fill} opacity={s.open ? 0.6 : 0.95} clipPath="url(#avs-journey-progress)" />
                {s.open && <rect x={x} y={TRACK_Y - 7} width={w} height={14} rx={7} fill="none" stroke={t.stroke} strokeDasharray="4 5" opacity={0.7} />}
                {w > s.status.length * 6.4 + 16 && (
                  <text x={x + w / 2} y={TRACK_Y - 13} textAnchor="middle" fontSize={10} fontWeight={700} className="arch-mono arch-halo" fill={t.text}>
                    {s.status}
                  </text>
                )}
              </g>
            );
          })}

          {/* Start */}
          <g>
            <circle cx={X0} cy={TRACK_Y} r={8} fill="var(--ax-bg-default)" stroke="var(--ax-border-accent)" strokeWidth={2.5} />
            <text x={X0} y={TRACK_Y + 30} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--ax-text-neutral)">
              Siste SED
            </text>
            <text x={X0} y={TRACK_Y + 44} textAnchor="middle" fontSize={10} fill="var(--ax-text-neutral-subtle)">
              dag 0
            </text>
          </g>

          {/* Netter */}
          {journey.nights.map((n, i) => {
            const above = i % 2 === 0;
            const x = xAt(n.day);
            const h = 30 + n.steps.length * 17;
            const anchorEnd = x + CARD_W - 18 > W - 4;
            const cx = anchorEnd ? x - CARD_W + 18 : x - 18;
            const cy = above ? TRACK_Y - 26 - h : TRACK_Y + 56;
            const lit = shown >= n.day;
            return (
              <g key={`${key}-n${i}`} className="avs-journey__night" opacity={lit ? 1 : 0.5} style={{ transition: "opacity 220ms ease" }}>
                <line
                  x1={x}
                  x2={x}
                  y1={above ? cy + h : TRACK_Y + 10}
                  y2={above ? TRACK_Y - 10 : cy}
                  stroke="var(--ax-border-neutral-strong)"
                  strokeDasharray="2 3"
                />
                <rect x={cx} y={cy} width={CARD_W} height={h} rx={10} fill="var(--ax-bg-default)" stroke={lit ? "var(--ax-border-accent)" : "var(--ax-border-neutral-subtle)"} strokeWidth={1.3} />
                <text x={cx + 12} y={cy + 18} fontSize={10.5} fontWeight={700} fill="var(--ax-text-neutral)">
                  ☾ {n.title}
                </text>
                {n.steps.map((s, k) => (
                  <g key={k}>
                    <text x={cx + 12} y={cy + 36 + k * 17} fontSize={10} className="arch-mono" fill="var(--ax-text-neutral-subtle)">
                      {s.t}
                    </text>
                    <text
                      x={cx + 52}
                      y={cy + 36 + k * 17}
                      fontSize={10}
                      fontWeight={s.status ? 700 : 400}
                      fontStyle={s.status ? undefined : "italic"}
                      className="arch-mono"
                      fill={s.status ? TONE[STATUS_BY_ID[s.status].tone].text : "var(--ax-text-neutral-subtle)"}
                    >
                      {s.label}
                    </text>
                  </g>
                ))}
                <circle cx={x} cy={TRACK_Y} r={6} fill="var(--ax-bg-default)" stroke="var(--ax-border-neutral-strong)" strokeWidth={2} />
              </g>
            );
          })}

          {/* Slutt */}
          {journey.open ? (
            <text x={X1} y={TRACK_Y - 30} textAnchor="end" fontSize={11} fontStyle="italic" className="arch-halo" fill="var(--ax-text-neutral-subtle)">
              {journey.endNote} →
            </text>
          ) : (
            <g>
              <circle cx={xAt(journey.end)} cy={TRACK_Y} r={9} fill="var(--ax-bg-success-strong)" />
              <path
                d={`M ${xAt(journey.end) - 4} ${TRACK_Y} l 3 3 l 5 -6`}
                stroke="var(--ax-text-success-contrast)"
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
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
        <Button
          size="small"
          variant="primary"
          icon={playing ? <PauseIcon aria-hidden /> : <PlayIcon aria-hidden />}
          onClick={play}
        >
          {playing ? "Pause" : "Spill av"}
        </Button>
        <label className="avs-journey__range">
          <span className="aksel-sr-only">Dag i saken</span>
          <input
            type="range"
            min={0}
            max={journey.end}
            value={shown}
            onChange={(e) => {
              setPlaying(false);
              setDay(Number(e.target.value));
            }}
            aria-valuetext={`Dag ${shown}`}
          />
        </label>
        <div className="avs-journey__now" data-tone={info.tone} aria-live="polite">
          <span className="avs-journey__day arch-mono">dag {shown}</span>
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
