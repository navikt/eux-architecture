"use client";

import { useState } from "react";
import { BodyLong, BodyShort, Button, Detail, Heading, ToggleGroup } from "@navikt/ds-react";
import { XMarkIcon } from "@navikt/aksel-icons";
import { useReducedMotion } from "@/components/architecture/hooks";
import { onActivate, rounded } from "@/components/architecture/svg";
import { TONE } from "@/components/avslutning/tones";
import { JOB_BY_ID, STATUS_BY_ID, type JobId, type StatusId } from "./data";
import { StatusChips } from "./StatusChips";

const W = 1090;
const H = 500;
const NW = 184;
const NH = 52;

const POS: Record<StatusId, { cx: number; cy: number }> = {
  UKJENT: { cx: 200, cy: 250 },
  MANUELL_JOURNALFOERING: { cx: 200, cy: 360 },
  MELOSYS_JOURNALFOERER: { cx: 200, cy: 452 },
  FEILET_FERDIGSTILL: { cx: 580, cy: 120 },
  KORRUPT: { cx: 580, cy: 250 },
  FEILET_FEILREGISTRER: { cx: 580, cy: 380 },
  JOURNALFOERT: { cx: 980, cy: 120 },
  FEILREGISTRERT: { cx: 980, cy: 250 },
};
const DRAWN = (Object.keys(POS) as StatusId[]).map((id) => ({ id, ...POS[id] }));

/** F = fagmodulen, 1 = ferdigstill, 2 = feilregistrer, M = melosys-eessi */
type Actor = "F" | "1" | "2" | "M";
type Edge = { id: string; from: StatusId[]; to: StatusId[]; d: string; by: Actor[]; kind?: "error" | "entry"; main?: boolean };

const EDGES: Edge[] = [
  { id: "in-u", from: [], to: ["UKJENT"], d: "M 16 250 L 108 250", by: ["F"], kind: "entry" },
  { id: "in-mel", from: [], to: ["MELOSYS_JOURNALFOERER"], d: "M 16 452 L 108 452", by: ["M"], kind: "entry" },
  { id: "u-j", from: ["UKJENT"], to: ["JOURNALFOERT"], d: rounded([[200, 224], [200, 40], [980, 40], [980, 94]], 14), by: ["F", "1"], main: true },
  { id: "u-m", from: ["UKJENT"], to: ["MANUELL_JOURNALFOERING"], d: "M 200 276 L 200 334", by: ["F"] },
  { id: "u-ff", from: ["UKJENT"], to: ["FEILET_FERDIGSTILL"], d: rounded([[292, 236], [360, 236], [360, 120], [488, 120]], 12), by: ["1"], kind: "error" },
  { id: "u-fr", from: ["UKJENT"], to: ["FEILET_FEILREGISTRER"], d: rounded([[292, 250], [380, 250], [380, 380], [488, 380]], 12), by: ["2"], kind: "error" },
  { id: "u-r", from: ["UKJENT"], to: ["FEILREGISTRERT"], d: rounded([[292, 264], [340, 264], [340, 470], [1020, 470], [1020, 276]], 14), by: ["1", "2"] },
  { id: "ff-j", from: ["FEILET_FERDIGSTILL"], to: ["JOURNALFOERT"], d: "M 672 106 L 888 106", by: ["1"] },
  { id: "ff-r", from: ["FEILET_FERDIGSTILL"], to: ["FEILREGISTRERT"], d: rounded([[672, 120], [800, 120], [800, 240], [888, 240]], 10), by: ["1"] },
  { id: "r-ff", from: ["FEILREGISTRERT"], to: ["FEILET_FERDIGSTILL"], d: rounded([[888, 260], [780, 260], [780, 134], [672, 134]], 10), by: ["1"], kind: "error" },
  { id: "ff-k", from: ["FEILET_FERDIGSTILL"], to: ["KORRUPT"], d: "M 580 146 L 580 224", by: ["1"], kind: "error" },
  { id: "fr-k", from: ["FEILET_FEILREGISTRER"], to: ["KORRUPT"], d: "M 580 354 L 580 276", by: ["2"], kind: "error" },
  { id: "fr-r", from: ["FEILET_FEILREGISTRER"], to: ["FEILREGISTRERT"], d: rounded([[672, 380], [940, 380], [940, 276]], 12), by: ["2"] },
  { id: "r-j", from: ["FEILREGISTRERT"], to: ["JOURNALFOERT"], d: "M 980 224 L 980 146", by: ["1"] },
];
const EDGE_BY_ID = Object.fromEntries(EDGES.map((e) => [e.id, e])) as Record<string, Edge>;

const LABELS: { edge: string; x: number; y: number; text: string; anchor?: "start" | "middle"; tone?: string }[] = [
  { edge: "in-u", x: 60, y: 240, text: "ny SED", tone: "var(--ax-text-accent)" },
  { edge: "in-mel", x: 60, y: 442, text: "melosys-eessi", tone: "var(--ax-text-meta-purple)" },
  { edge: "u-j", x: 640, y: 31, text: "journalført" },
  { edge: "u-m", x: 214, y: 309, text: "UB_BUC_04", anchor: "start" },
  { edge: "u-ff", x: 424, y: 111, text: "feil", tone: "var(--ax-text-danger)" },
  { edge: "u-fr", x: 434, y: 371, text: "feil", tone: "var(--ax-text-danger)" },
  { edge: "u-r", x: 700, y: 461, text: "feilregistrert eller avbrutt" },
  { edge: "ff-j", x: 744, y: 97, text: "journalført" },
  { edge: "ff-k", x: 594, y: 189, text: "feil igjen", anchor: "start", tone: "var(--ax-text-danger)" },
  { edge: "fr-k", x: 594, y: 319, text: "feil igjen", anchor: "start", tone: "var(--ax-text-danger)" },
  { edge: "fr-r", x: 866, y: 371, text: "avbrutt" },
  { edge: "r-j", x: 994, y: 189, text: "journalført", anchor: "start" },
];

const BADGES: { edge: string; by: Actor; x: number; y: number }[] = [
  { edge: "u-j", by: "F", x: 300, y: 40 },
  { edge: "u-j", by: "1", x: 324, y: 40 },
  { edge: "u-m", by: "F", x: 200, y: 305 },
  { edge: "u-ff", by: "1", x: 360, y: 178 },
  { edge: "u-fr", by: "2", x: 380, y: 318 },
  { edge: "u-r", by: "1", x: 480, y: 470 },
  { edge: "u-r", by: "2", x: 504, y: 470 },
  { edge: "ff-j", by: "1", x: 846, y: 106 },
  { edge: "ff-r", by: "1", x: 800, y: 172 },
  { edge: "r-ff", by: "1", x: 780, y: 214 },
  { edge: "ff-k", by: "1", x: 580, y: 185 },
  { edge: "fr-k", by: "2", x: 580, y: 315 },
  { edge: "fr-r", by: "2", x: 800, y: 380 },
  { edge: "r-j", by: "1", x: 980, y: 185 },
];

/** Statuser der en nattjobb kan la SED-en stå urørt. */
const STAYS: Partial<Record<StatusId, string>> = {
  UKJENT: "Blir stående så lenge ingen journalpost i saken er ferdigstilt, og feilregistrer ikke tar den.",
  FEILET_FERDIGSTILL: "Blir stående hvis saken fortsatt ikke har en ferdigstilt journalpost å kopiere fra.",
  FEILET_FEILREGISTRER: "Blir stående hvis journalposten er inngående eller har bruker.",
  FEILREGISTRERT: "Blir stående hvis SAF fortsatt viser feilregistrert, eller saken ikke har en ferdigstilt journalpost.",
};

const LANE = { x: 466, y: 72, w: 228, h: 356, label: "feil i nattjobb" };

const ACTOR_TEXT: Record<Actor, string> = {
  F: "eux-fagmodul-journalfoering",
  "1": "ferdigstill kl. 01.00",
  "2": "feilregistrer kl. 02.00",
  M: "melosys-eessi",
};

const SET_BY_ACTOR: Record<string, Actor> = {
  "eux-fagmodul-journalfoering": "F",
  ferdigstill: "1",
  feilregistrer: "2",
  "melosys-eessi": "M",
};

type Filter = "alle" | "F" | "1" | "2";

function Badge({ by, x, y, dim }: { by: Actor; x: number; y: number; dim: boolean }) {
  const fagmodul = by === "F";
  return (
    <g className={`avs-sm__badge jfr-sm__badge ${dim ? "is-dim" : ""}`}>
      <title>{ACTOR_TEXT[by]}</title>
      <circle cx={x} cy={y} r={9} fill={fagmodul ? TONE.accent.strong : TONE.warning.strong} stroke="var(--ax-bg-default)" strokeWidth={2} />
      <text
        x={x}
        y={y + 3.6}
        textAnchor="middle"
        fontSize={fagmodul ? 9.5 : 10}
        fontWeight={800}
        fill={fagmodul ? "var(--ax-text-accent-contrast)" : "var(--ax-text-warning-contrast)"}
      >
        {by}
      </text>
    </g>
  );
}

export function StatusMachine({ selected, onSelect }: { selected: StatusId | null; onSelect: (s: StatusId | null) => void }) {
  const reduced = useReducedMotion();
  const [filter, setFilter] = useState<Filter>("alle");

  const byActor = (e: Edge) => filter === "alle" || e.by.includes(filter);
  const touches = (e: Edge) => !!selected && (e.from.includes(selected) || e.to.includes(selected));
  const lit = (e: Edge) => byActor(e) && (selected ? touches(e) : filter !== "alle");
  const dim = (e: Edge) => (selected ? !touches(e) || !byActor(e) : !byActor(e));

  const near = new Set<StatusId>();
  if (selected) {
    near.add(selected);
    EDGES.filter((e) => touches(e) && byActor(e)).forEach((e) => [...e.from, ...e.to].forEach((s) => near.add(s)));
  } else if (filter !== "alle") {
    EDGES.filter(byActor).forEach((e) => [...e.from, ...e.to].forEach((s) => near.add(s)));
  }
  const focusing = !!selected || filter !== "alle";

  const edgeCls = (e: Edge) => (lit(e) ? "is-lit" : dim(e) ? "is-dim" : "");
  const nodeCls = (id: StatusId) =>
    selected ? (id === selected ? "is-active" : near.has(id) ? "is-neighbour" : "is-dim") : focusing ? (near.has(id) ? "is-neighbour" : "is-dim") : "";
  const toggle = (id: StatusId) => onSelect(selected === id ? null : id);
  const info = selected ? STATUS_BY_ID[selected] : null;

  const ordered = [...EDGES].sort((a, b) => Number(lit(a)) - Number(lit(b)));
  const stroke = (e: Edge) =>
    e.kind === "error" ? "var(--ax-border-danger)" : e.kind === "entry" ? "var(--ax-border-meta-purple)" : "var(--ax-border-neutral-strong)";
  const marker = (e: Edge) => (e.kind === "error" ? "jfr-sm-arrow-error" : e.kind === "entry" ? "jfr-sm-arrow-entry" : "jfr-sm-arrow");
  const flowStroke = (e: Edge) =>
    e.kind === "error" ? "var(--ax-border-danger)" : e.kind === "entry" ? "var(--ax-border-meta-purple)" : "var(--ax-border-accent)";
  const packetFill = (e: Edge) =>
    e.kind === "error" ? "var(--ax-bg-danger-strong)" : e.kind === "entry" ? "var(--ax-bg-meta-purple-strong)" : "var(--ax-bg-accent-strong)";

  const filterText: Record<Filter, string> = {
    alle: "Alle overganger. Velg hvem som flytter SED-en for å se bare deres piler.",
    F: "Fagmodulen setter UKJENT før journalposten lages, og JOURNALFOERT hvis den ble ferdigstilt med en gang.",
    "1": "ferdigstill leser UKJENT, FEILET_FERDIGSTILL og FEILREGISTRERT hver natt kl. 01.00.",
    "2": "feilregistrer leser FEILET_FEILREGISTRER og UKJENT eldre enn 30 dager hver natt kl. 02.00.",
  };

  return (
    <div className="avs-sm jfr-sm">
      <div className="avs-toolbar">
        <ToggleGroup size="small" value={filter} onChange={(v) => setFilter(v as Filter)} label="Hvem flytter SED-en?">
          <ToggleGroup.Item value="alle">Alle</ToggleGroup.Item>
          <ToggleGroup.Item value="F">Fagmodulen</ToggleGroup.Item>
          <ToggleGroup.Item value="1">ferdigstill</ToggleGroup.Item>
          <ToggleGroup.Item value="2">feilregistrer</ToggleGroup.Item>
        </ToggleGroup>
        <BodyShort size="small" className="avs-toolbar__text" aria-live="polite">
          {filterText[filter]}
        </BodyShort>
      </div>
      <div className="portal-diagram avs-surface">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", minWidth: 860, height: "auto", display: "block" }}
          role="group"
          aria-label="Journalstatusene til en SED i eux-nav-rinasak"
        >
          <defs>
            {(
              [
                ["jfr-sm-arrow", "var(--ax-border-neutral-strong)"],
                ["jfr-sm-arrow-entry", "var(--ax-border-meta-purple)"],
                ["jfr-sm-arrow-error", "var(--ax-border-danger)"],
              ] as const
            ).map(([id, fill]) => (
              <marker key={id} id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill={fill} />
              </marker>
            ))}
          </defs>

          {/* Feilbane */}
          {(() => {
            const pw = LANE.label.length * 5.7 + 18;
            return (
              <g className="avs-sm__lane">
                <rect x={LANE.x} y={LANE.y} width={LANE.w} height={LANE.h} rx={14} fill="var(--ax-bg-danger-soft)" fillOpacity={0.35} stroke="var(--ax-border-danger)" strokeOpacity={0.45} strokeDasharray="4 4" />
                <rect x={LANE.x + LANE.w / 2 - pw / 2} y={LANE.y - 8} width={pw} height={16} rx={8} fill="var(--ax-bg-danger-moderate)" />
                <text x={LANE.x + LANE.w / 2} y={LANE.y + 4} textAnchor="middle" fontSize={9.5} fontWeight={700} fill="var(--ax-text-danger)">
                  {LANE.label}
                </text>
              </g>
            );
          })()}

          {/* Kanter */}
          {ordered.map((e) => (
            <g key={e.id} className={`arch-rf__edge ${edgeCls(e)}`}>
              <path
                d={e.d}
                fill="none"
                stroke={stroke(e)}
                strokeWidth={1.8}
                strokeDasharray={e.kind === "entry" ? "5 4" : e.kind === "error" ? "6 4" : undefined}
                markerEnd={`url(#${marker(e)})`}
              />
              {(lit(e) || (!focusing && e.main)) && (
                <path d={e.d} fill="none" stroke={flowStroke(e)} strokeWidth={2.6} className="arch-flow arch-flow--slow" opacity={focusing ? 1 : 0.55} />
              )}
              {!reduced && lit(e) && (
                <circle r={4.5} fill={packetFill(e)} className="arch-packet">
                  <animateMotion dur="1.8s" repeatCount="indefinite" path={e.d} />
                </circle>
              )}
            </g>
          ))}

          {/* Startpunkter */}
          {(["in-u", "in-mel"] as const).map((id) => {
            const e = EDGE_BY_ID[id];
            const y = id === "in-u" ? 250 : 452;
            return <circle key={id} cx={16} cy={y} r={4.5} fill={stroke(e)} className={`arch-rf__edge ${edgeCls(e)}`} />;
          })}

          {/* Kantetiketter */}
          {LABELS.map((l) => (
            <text
              key={l.edge}
              x={l.x}
              y={l.y}
              textAnchor={l.anchor ?? "middle"}
              fontSize={10.5}
              fontWeight={700}
              className={`arch-halo arch-rf__edge ${edgeCls(EDGE_BY_ID[l.edge])}`}
              fill={l.tone ?? "var(--ax-text-neutral-subtle)"}
            >
              {l.text}
            </text>
          ))}

          {/* Hvem flytter */}
          {BADGES.map((b) => (
            <Badge key={`${b.edge}-${b.by}`} by={b.by} x={b.x} y={b.y} dim={dim(EDGE_BY_ID[b.edge]) || (filter !== "alle" && b.by !== filter)} />
          ))}

          {/* Noder */}
          {DRAWN.map((n) => {
            const s = STATUS_BY_ID[n.id];
            const t = TONE[s.tone];
            const x = n.cx - NW / 2;
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
                <rect x={x} y={y} width={NW} height={NH} rx={10} fill={t.fill} stroke={t.stroke} strokeWidth={1.5} className="arch-box" />
                <rect x={x} y={y} width={NW} height={NH} rx={10} fill="none" stroke={t.stroke} className="arch-pulse" />
                {s.final && <rect x={x + 3.5} y={y + 3.5} width={NW - 7} height={NH - 7} rx={7} fill="none" stroke={t.stroke} strokeWidth={1} opacity={0.8} />}
                <text x={n.cx} y={n.cy - 3} textAnchor="middle" fontSize={10} fontWeight={700} className="arch-mono" fill="var(--ax-text-neutral)">
                  {n.id}
                </text>
                <text x={n.cx} y={n.cy + 14} textAnchor="middle" fontSize={10.5} fill={t.text}>
                  {s.label}
                </text>
                {STAYS[n.id] && (
                  <g className="jfr-sm__stay">
                    <title>{STAYS[n.id]}</title>
                    <text x={x + NW - 11} y={y + 14} textAnchor="middle" fontSize={11} fontWeight={700} fill={t.text}>
                      ↻
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="avs-legend" aria-hidden>
        <span>
          <i className="avs-legend__badge jfr-legend__f">F</i> fagmodulen
        </span>
        <span>
          <i className="avs-legend__badge">1</i> ferdigstill 01.00
        </span>
        <span>
          <i className="avs-legend__badge">2</i> feilregistrer 02.00
        </span>
        <span>
          <i className="jfr-legend__stay">↻</i> kan bli stående til neste natt
        </span>
        <span>
          <i className="avs-legend__final" /> ingen jobb ser på SED-en igjen
        </span>
        <span>
          <i className="avs-legend__line" data-kind="error" /> feil i jobben
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
            <Button size="xsmall" variant="tertiary-neutral" icon={<XMarkIcon aria-hidden />} onClick={() => onSelect(null)}>
              Lukk
            </Button>
          </div>
          <BodyLong size="small">{info.text}</BodyLong>
          <dl className="avs-job__meta">
            <div>
              <dt>Settes av</dt>
              <dd>
                {info.setBy.map((x, i) => {
                  const actor = SET_BY_ACTOR[x];
                  return (
                    <span key={x}>
                      {i > 0 && ", "}
                      {x in JOB_BY_ID ? (
                        <>
                          <span className="avs-night__no avs-night__no--inline">{JOB_BY_ID[x as JobId].no}</span> <span className="arch-mono">{x}</span>
                        </>
                      ) : (
                        <>
                          {actor === "F" && <span className="avs-night__no avs-night__no--inline jfr-no--f">F</span>} <span className="arch-mono">{x}</span>
                        </>
                      )}
                    </span>
                  );
                })}
              </dd>
            </div>
            <div>
              <dt>Går videre til</dt>
              <dd>
                {info.next.length > 0 ? (
                  <StatusChips ids={info.next} onFocusStatus={(s) => onSelect(s)} />
                ) : (
                  <span className="arch-subtle">Ingen. Statusen er endelig.</span>
                )}
              </dd>
            </div>
            {STAYS[info.id] && (
              <div>
                <dt>Blir stående</dt>
                <dd>{STAYS[info.id]}</dd>
              </div>
            )}
          </dl>
        </div>
      ) : (
        <BodyShort size="small" className="avs-hint">
          Velg en status for å se hvem som setter den, og hvor SED-en kan gå videre. Statusen ligger i tabellen sed_journalstatus i eux-nav-rinasak,
          én rad per SED-versjon.
        </BodyShort>
      )}
    </div>
  );
}
