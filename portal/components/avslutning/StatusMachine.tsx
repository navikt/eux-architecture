"use client";

import { BodyLong, BodyShort, Detail, Heading, HStack } from "@navikt/ds-react";
import { useReducedMotion } from "@/components/architecture/hooks";
import { onActivate, rounded } from "@/components/architecture/svg";
import { JOB_BY_ID, STATUSES, STATUS_BY_ID, type JobId, type StatusId } from "./data";
import { StatusChips } from "./NightPipeline";
import { TONE } from "./tones";

const W = 1190;
const H = 366;
const NW = 150;
const NH = 48;

const POS: Partial<Record<StatusId, { x: number; cy: number }>> = {
  NY_SAK: { x: 40, cy: 176 },
  UVIRKSOM: { x: 238, cy: 176 },
  AVSLUTTES_AV_MOTPART: { x: 436, cy: 52 },
  TIL_AVSLUTNING_LOKALT: { x: 436, cy: 134 },
  TIL_AVSLUTNING_GLOBALT: { x: 436, cy: 218 },
  AVSLUTTET_LOKALT: { x: 634, cy: 134 },
  AVSLUTTET_GLOBALT: { x: 634, cy: 218 },
  TIL_ARKIVERING: { x: 832, cy: 176 },
  ARKIVERT: { x: 1030, cy: 176 },
  SLETT_DOKUMENTUTKAST: { x: 238, cy: 318 },
  HANDLING_MANGLER: { x: 560, cy: 318 },
  HANDLING_FEILET: { x: 730, cy: 318 },
};
const DRAWN = (Object.keys(POS) as StatusId[]).map((id) => ({ id, ...POS[id]! }));
const FINAL = new Set<StatusId>(["AVSLUTTES_AV_MOTPART", "ARKIVERT", "HANDLING_MANGLER", "HANDLING_FEILET"]);
const ERRORS: StatusId[] = ["HANDLING_MANGLER", "HANDLING_FEILET"];

type Edge = { id: string; from: StatusId[]; to: StatusId[]; d: string; kind?: "back" | "error" | "manual"; main?: boolean };

const EDGES: Edge[] = [
  { id: "e1", from: ["NY_SAK"], to: ["UVIRKSOM"], d: rounded([[190, 176], [238, 176]]), main: true },
  { id: "back", from: ["UVIRKSOM"], to: ["NY_SAK"], d: rounded([[280, 152], [280, 104], [115, 104], [115, 152]], 12), kind: "back" },
  { id: "loop", from: ["UVIRKSOM"], to: ["UVIRKSOM"], d: "M 344 200 C 344 240, 382 240, 382 200", kind: "back" },
  { id: "eM", from: ["UVIRKSOM"], to: ["AVSLUTTES_AV_MOTPART"], d: rounded([[388, 176], [412, 176], [412, 52], [436, 52]], 8) },
  { id: "eL", from: ["UVIRKSOM"], to: ["TIL_AVSLUTNING_LOKALT"], d: rounded([[388, 176], [412, 176], [412, 134], [436, 134]], 8) },
  { id: "eG", from: ["UVIRKSOM"], to: ["TIL_AVSLUTNING_GLOBALT"], d: rounded([[388, 176], [412, 176], [412, 218], [436, 218]], 8), main: true },
  { id: "e3L", from: ["TIL_AVSLUTNING_LOKALT"], to: ["AVSLUTTET_LOKALT"], d: rounded([[586, 134], [634, 134]]) },
  { id: "e3G", from: ["TIL_AVSLUTNING_GLOBALT"], to: ["AVSLUTTET_GLOBALT"], d: rounded([[586, 218], [634, 218]]), main: true },
  { id: "e4L", from: ["AVSLUTTET_LOKALT"], to: ["TIL_ARKIVERING"], d: rounded([[784, 134], [808, 134], [808, 176], [832, 176]], 8) },
  { id: "e4G", from: ["AVSLUTTET_GLOBALT"], to: ["TIL_ARKIVERING"], d: rounded([[784, 218], [808, 218], [808, 176], [832, 176]], 8), main: true },
  { id: "e5", from: ["TIL_ARKIVERING"], to: ["ARKIVERT"], d: rounded([[982, 176], [1030, 176]]), main: true },
  { id: "e6", from: ["SLETT_DOKUMENTUTKAST"], to: ["UVIRKSOM"], d: rounded([[268, 294], [268, 200]]) },
  { id: "manual", from: [], to: ["SLETT_DOKUMENTUTKAST"], d: rounded([[54, 318], [238, 318]]), kind: "manual" },
  { id: "errAvs", from: ["TIL_AVSLUTNING_LOKALT", "TIL_AVSLUTNING_GLOBALT"], to: ERRORS, d: rounded([[511, 242], [511, 280]]), kind: "error" },
  { id: "errArk", from: ["TIL_ARKIVERING"], to: ERRORS, d: rounded([[907, 200], [907, 280]]), kind: "error" },
  { id: "errSlett", from: ["SLETT_DOKUMENTUTKAST"], to: ERRORS, d: rounded([[388, 318], [436, 318]]), kind: "error" },
];

const BADGES: { no: number; x: number; y: number }[] = [
  { no: 1, x: 214, y: 176 },
  { no: 2, x: 412, y: 176 },
  { no: 2, x: 363, y: 230 },
  { no: 3, x: 610, y: 134 },
  { no: 3, x: 610, y: 218 },
  { no: 4, x: 808, y: 176 },
  { no: 5, x: 1006, y: 176 },
  { no: 6, x: 268, y: 247 },
];
const JOB_NO: JobId[] = ["sett-uvirksom", "til-avslutning", "avslutt", "til-arkivering", "arkiver", "slett-dokumentutkast", "rapport"];

const LANES = [
  { x: 426, y: 100, w: 170, h: 152 },
  { x: 822, y: 142, w: 170, h: 68 },
  { x: 228, y: 284, w: 170, h: 68 },
];

export function StatusMachine({ selected, onSelect }: { selected: StatusId | null; onSelect: (s: StatusId | null) => void }) {
  const reduced = useReducedMotion();
  const lit = (e: Edge) => !!selected && (e.from.includes(selected) || e.to.includes(selected));
  const near = new Set<StatusId>();
  if (selected) {
    near.add(selected);
    EDGES.filter(lit).forEach((e) => [...e.from, ...e.to].forEach((s) => near.add(s)));
  }
  const edgeCls = (e: Edge) => (selected ? (lit(e) ? "is-lit" : "is-dim") : "");
  const nodeCls = (id: StatusId) => (selected ? (id === selected ? "is-active" : near.has(id) ? "is-neighbour" : "is-dim") : "");
  const toggle = (id: StatusId) => onSelect(selected === id ? null : id);
  const info = selected ? STATUS_BY_ID[selected] : null;

  const stroke = (e: Edge) =>
    e.kind === "error" ? "var(--ax-border-danger)" : e.kind === "back" ? "var(--ax-border-warning)" : "var(--ax-border-neutral-strong)";

  return (
    <div className="avs-sm">
      <div className="portal-diagram avs-surface">
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", minWidth: 820, height: "auto", display: "block" }} role="group" aria-label="Statusene til en sak i eux-avslutt-rinasaker">
          <defs>
            {(
              [
                ["avs-sm-arrow", "var(--ax-border-neutral-strong)"],
                ["avs-sm-arrow-back", "var(--ax-border-warning)"],
                ["avs-sm-arrow-error", "var(--ax-border-danger)"],
              ] as const
            ).map(([id, fill]) => (
              <marker key={id} id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill={fill} />
              </marker>
            ))}
          </defs>

          {/* Feilgruppe */}
          <g className={`arch-rf__group ${selected && !ERRORS.includes(selected) && !EDGES.some((e) => e.kind === "error" && lit(e)) ? "is-dim" : ""}`}>
            <rect x={436} y={280} width={744} height={76} rx={14} fill="var(--ax-bg-danger-soft)" fillOpacity={0.5} stroke="var(--ax-border-danger)" strokeOpacity={0.55} strokeDasharray="5 5" />
            <text x={1180} y={272} textAnchor="end" fontSize={10} className="arch-eyebrow-svg" fill="var(--ax-text-danger)">
              FEIL I KALLET TIL RINA · ENDELIG
            </text>
            <text x={904} y={306} fontSize={11} fontWeight={700} fill="var(--ax-text-neutral)">
              409 → HANDLING_MANGLER
            </text>
            <text x={904} y={322} fontSize={11} fill="var(--ax-text-neutral-subtle)">
              5xx, nettverk, exception → HANDLING_FEILET
            </text>
            <text x={904} y={338} fontSize={11} fontStyle="italic" fill="var(--ax-text-neutral-subtle)">
              Ingen jobb prøver igjen.
            </text>
          </g>

          {/* RINA-baner */}
          {LANES.map((l) => (
            <g key={`${l.x}-${l.y}`} className="avs-sm__lane">
              <rect x={l.x} y={l.y} width={l.w} height={l.h} rx={12} fill="none" stroke="var(--ax-border-info)" strokeOpacity={0.7} strokeDasharray="4 4" />
              <rect x={l.x + l.w / 2 - 38} y={l.y - 8} width={76} height={16} rx={8} fill="var(--ax-bg-info-moderate)" />
              <text x={l.x + l.w / 2} y={l.y + 4} textAnchor="middle" fontSize={9.5} fontWeight={700} fill="var(--ax-text-info)">
                kaller RINA
              </text>
            </g>
          ))}

          {/* Kanter */}
          {EDGES.map((e) => (
            <g key={e.id} className={`arch-rf__edge ${edgeCls(e)}`}>
              <path
                d={e.d}
                fill="none"
                stroke={stroke(e)}
                strokeWidth={e.kind === "manual" ? 1.4 : 1.8}
                strokeDasharray={e.kind === "manual" ? "4 4" : undefined}
                markerEnd={`url(#${e.kind === "error" ? "avs-sm-arrow-error" : e.kind === "back" ? "avs-sm-arrow-back" : "avs-sm-arrow"})`}
              />
              {(e.main || lit(e)) && e.kind !== "manual" && (
                <path d={e.d} fill="none" stroke={e.kind === "error" ? "var(--ax-border-danger)" : "var(--ax-border-accent)"} strokeWidth={2.6} className="arch-flow arch-flow--slow" opacity={selected ? 1 : 0.55} />
              )}
              {!reduced && lit(e) && e.kind !== "manual" && (
                <circle r={4.5} fill={e.kind === "error" ? "var(--ax-bg-danger-strong)" : "var(--ax-bg-accent-strong)"} className="arch-packet">
                  <animateMotion dur="1.6s" repeatCount="indefinite" path={e.d} />
                </circle>
              )}
            </g>
          ))}

          {/* Kantetiketter */}
          <g className={`arch-rf__edge ${edgeCls(EDGES[1])}`}>
            <text x={197} y={97} textAnchor="middle" fontSize={10.5} fontWeight={700} className="arch-halo" fill="var(--ax-text-warning)">
              ny SED (Kafka)
            </text>
          </g>
          <g className={`arch-rf__edge ${edgeCls(EDGES[2])}`}>
            <text x={363} y={256} textAnchor="middle" fontSize={10.5} fontWeight={700} className="arch-halo" fill="var(--ax-text-warning)">
              ingen treff
            </text>
            <text x={363} y={269} textAnchor="middle" fontSize={9.5} className="arch-halo" fill="var(--ax-text-neutral-subtle)">
              ny vurdering neste natt
            </text>
          </g>
          <g className={`arch-rf__edge ${edgeCls(EDGES[12])}`}>
            <circle cx={54} cy={318} r={4} fill="var(--ax-border-neutral-strong)" />
            <text x={146} y={309} textAnchor="middle" fontSize={10} fontStyle="italic" className="arch-halo" fill="var(--ax-text-neutral-subtle)">
              settes utenfor appen
            </text>
          </g>

          {/* Jobbmerker */}
          {BADGES.map((b) => (
            <g key={`${b.no}-${b.x}-${b.y}`} className="avs-sm__badge">
              <title>{`${b.no} · ${JOB_NO[b.no - 1]}`}</title>
              <circle cx={b.x} cy={b.y} r={9} fill={TONE.warning.strong} stroke="var(--ax-bg-default)" strokeWidth={2} />
              <text x={b.x} y={b.y + 3.6} textAnchor="middle" fontSize={10} fontWeight={800} fill="var(--ax-text-warning-contrast)">
                {b.no}
              </text>
            </g>
          ))}

          {/* Noder */}
          {DRAWN.map((n) => {
            const s = STATUS_BY_ID[n.id];
            const t = TONE[s.tone];
            const y = n.cy - NH / 2;
            return (
              <g
                key={n.id}
                className={`arch-node ${nodeCls(n.id)}`}
                role="button"
                tabIndex={0}
                aria-pressed={selected === n.id}
                aria-label={`${n.id}: ${s.label}`}
                onClick={() => toggle(n.id)}
                onKeyDown={onActivate(() => toggle(n.id))}
              >
                <rect x={n.x} y={y} width={NW} height={NH} rx={10} fill={t.fill} stroke={t.stroke} strokeWidth={1.5} className="arch-box" />
                <rect x={n.x} y={y} width={NW} height={NH} rx={10} fill="none" stroke={t.stroke} className="arch-pulse" />
                {FINAL.has(n.id) && <rect x={n.x + 3.5} y={y + 3.5} width={NW - 7} height={NH - 7} rx={7} fill="none" stroke={t.stroke} strokeWidth={1} opacity={0.8} />}
                <text x={n.x + NW / 2} y={n.cy - 3} textAnchor="middle" fontSize={10} fontWeight={700} className="arch-mono" fill="var(--ax-text-neutral)">
                  {n.id}
                </text>
                <text x={n.x + NW / 2} y={n.cy + 13} textAnchor="middle" fontSize={10.5} fill={t.text}>
                  {s.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="avs-legend" aria-hidden>
        <span>
          <i className="avs-legend__badge">2</i> jobben som flytter saken
        </span>
        <span>
          <i className="avs-legend__lane" /> neste jobb kaller RINA
        </span>
        <span>
          <i className="avs-legend__final" /> endelig status
        </span>
        <span>
          <i className="avs-legend__line" data-kind="back" /> tilbake via Kafka eller ny runde
        </span>
        <span>
          <i className="avs-legend__line" data-kind="error" /> feil
        </span>
      </div>

      {info ? (
        <div className="avs-detail" data-tone={info.tone} aria-live="polite">
          <div className="avs-detail__head">
            <div>
              <Detail className="arch-eyebrow">{info.label}</Detail>
              <Heading level="3" size="small" className="arch-mono">
                {info.id}
              </Heading>
            </div>
          </div>
          <BodyLong size="small">{info.text}</BodyLong>
          <dl className="avs-job__meta">
            {info.into.length > 0 && (
              <div>
                <dt>Kommer fra</dt>
                <dd>
                  {info.into.map((x, i) => (
                    <span key={x}>
                      {i > 0 && ", "}
                      {x in JOB_BY_ID ? (
                        <>
                          <span className="avs-night__no avs-night__no--inline">{JOB_BY_ID[x as JobId].no}</span>{" "}
                          <span className="arch-mono">{x}</span>
                        </>
                      ) : (
                        x
                      )}
                    </span>
                  ))}
                </dd>
              </div>
            )}
            {info.next.length > 0 && (
              <div>
                <dt>Går videre til</dt>
                <dd>
                  <StatusChips ids={info.next} onFocusStatus={(s) => onSelect(s)} />
                </dd>
              </div>
            )}
            {info.rina && (
              <div>
                <dt>RINA</dt>
                <dd>
                  <code>POST /api/v1/rinasaker/{"{id}"}/{info.rina}</code> i eux-rina-terminator-api
                </dd>
              </div>
            )}
          </dl>
        </div>
      ) : (
        <BodyShort size="small" className="avs-hint">
          Velg en status for å se hvor saken kommer fra og hvor den kan gå videre.
        </BodyShort>
      )}

      <HStack gap="space-8" align="center" className="avs-unused">
        <BodyShort size="small" className="arch-subtle">
          Finnes i enumen, men brukes ikke:
        </BodyShort>
        {STATUSES.filter((s) => s.unused).map((s) => (
          <button
            key={s.id}
            type="button"
            className="avs-chip arch-mono"
            data-tone="neutral"
            aria-pressed={selected === s.id}
            onClick={() => toggle(s.id)}
          >
            {s.id}
          </button>
        ))}
      </HStack>
    </div>
  );
}
