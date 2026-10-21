"use client";

import { useState } from "react";
import { BodyLong } from "@navikt/ds-react";
import { rounded } from "@/components/architecture/svg";
import { DetailHint, DetailPanel, FlowToolbar } from "@/components/process/FlowPanel";
import {
  ActorList,
  JobBadge,
  Lane,
  StateCanvas,
  StateEdges,
  StateLabels,
  StateNode,
  stateFocus,
  toActors,
  type EdgeLabel,
  type StateEdge,
} from "@/components/process/StateMachine";
import { TONE } from "@/lib/tones";
import { JOB_BY_ID, STATUS_BY_ID, type StatusId } from "./data";
import { StatusChips } from "./StatusChips";

const W = 1090;
const H = 500;
const NW = 184;
const NH = 52;

const POS: Record<StatusId, { x: number; cy: number }> = {
  UKJENT: { x: 108, cy: 250 },
  MANUELL_JOURNALFOERING: { x: 108, cy: 360 },
  MELOSYS_JOURNALFOERER: { x: 108, cy: 452 },
  FEILET_FERDIGSTILL: { x: 488, cy: 120 },
  KORRUPT: { x: 488, cy: 250 },
  FEILET_FEILREGISTRER: { x: 488, cy: 380 },
  JOURNALFOERT: { x: 888, cy: 120 },
  FEILREGISTRERT: { x: 888, cy: 250 },
};
const DRAWN = (Object.keys(POS) as StatusId[]).map((id) => ({ id, ...POS[id] }));

/** Who moves the SED. The nightly jobs are numbered like in the job list. */
type ActorId = "F" | "1" | "2" | "M";

const ACTORS: Record<ActorId, { name: string; title: string }> = {
  F: { name: "eux-fagmodul-journalfoering", title: "eux-fagmodul-journalfoering" },
  "1": { name: "ferdigstill", title: "ferdigstill kl. 01.00" },
  "2": { name: "feilregistrer", title: "feilregistrer kl. 02.00" },
  M: { name: "melosys-eessi", title: "melosys-eessi" },
};

type Edge = StateEdge<StatusId> & { by: ActorId[] };

/** A transition caused by a failure in a nightly job. */
const FAILED = { kind: "error", dash: "6 4" } as const;

const EDGES: Edge[] = [
  { id: "in-u", from: [], to: ["UKJENT"], d: "M 16 250 L 108 250", by: ["F"], kind: "event" },
  { id: "in-mel", from: [], to: ["MELOSYS_JOURNALFOERER"], d: "M 16 452 L 108 452", by: ["M"], kind: "event" },
  { id: "u-j", from: ["UKJENT"], to: ["JOURNALFOERT"], d: rounded([[200, 224], [200, 40], [980, 40], [980, 94]], 14), by: ["F", "1"], main: true },
  { id: "u-m", from: ["UKJENT"], to: ["MANUELL_JOURNALFOERING"], d: "M 200 276 L 200 334", by: ["F"] },
  { id: "u-ff", from: ["UKJENT"], to: ["FEILET_FERDIGSTILL"], d: rounded([[292, 236], [360, 236], [360, 120], [488, 120]], 12), by: ["1"], ...FAILED },
  { id: "u-fr", from: ["UKJENT"], to: ["FEILET_FEILREGISTRER"], d: rounded([[292, 250], [380, 250], [380, 380], [488, 380]], 12), by: ["2"], ...FAILED },
  { id: "u-r", from: ["UKJENT"], to: ["FEILREGISTRERT"], d: rounded([[292, 264], [340, 264], [340, 470], [1020, 470], [1020, 276]], 14), by: ["1", "2"] },
  { id: "ff-j", from: ["FEILET_FERDIGSTILL"], to: ["JOURNALFOERT"], d: "M 672 106 L 888 106", by: ["1"] },
  { id: "ff-r", from: ["FEILET_FERDIGSTILL"], to: ["FEILREGISTRERT"], d: rounded([[672, 120], [800, 120], [800, 240], [888, 240]], 10), by: ["1"] },
  { id: "r-ff", from: ["FEILREGISTRERT"], to: ["FEILET_FERDIGSTILL"], d: rounded([[888, 260], [780, 260], [780, 134], [672, 134]], 10), by: ["1"], ...FAILED },
  { id: "ff-k", from: ["FEILET_FERDIGSTILL"], to: ["KORRUPT"], d: "M 580 146 L 580 224", by: ["1"], ...FAILED },
  { id: "fr-k", from: ["FEILET_FEILREGISTRER"], to: ["KORRUPT"], d: "M 580 354 L 580 276", by: ["2"], ...FAILED },
  { id: "fr-r", from: ["FEILET_FEILREGISTRER"], to: ["FEILREGISTRERT"], d: rounded([[672, 380], [940, 380], [940, 276]], 12), by: ["2"] },
  { id: "r-j", from: ["FEILREGISTRERT"], to: ["JOURNALFOERT"], d: "M 980 224 L 980 146", by: ["1"] },
];
const LABELS: EdgeLabel[] = [
  { edge: "in-u", x: 60, y: 240, text: "ny SED", color: "var(--ax-text-accent)" },
  { edge: "in-mel", x: 60, y: 442, text: "melosys-eessi", color: "var(--ax-text-meta-purple)" },
  { edge: "u-j", x: 640, y: 31, text: "journalført" },
  { edge: "u-m", x: 214, y: 309, text: "UB_BUC_04", anchor: "start" },
  { edge: "u-ff", x: 424, y: 111, text: "feil", color: "var(--ax-text-danger)" },
  { edge: "u-fr", x: 434, y: 371, text: "feil", color: "var(--ax-text-danger)" },
  { edge: "u-r", x: 700, y: 461, text: "feilregistrert eller avbrutt" },
  { edge: "ff-j", x: 744, y: 97, text: "journalført" },
  { edge: "ff-k", x: 594, y: 189, text: "feil igjen", anchor: "start", color: "var(--ax-text-danger)" },
  { edge: "fr-k", x: 594, y: 319, text: "feil igjen", anchor: "start", color: "var(--ax-text-danger)" },
  { edge: "fr-r", x: 866, y: 371, text: "avbrutt" },
  { edge: "r-j", x: 994, y: 189, text: "journalført", anchor: "start" },
];

const BADGES: { edge: string; by: ActorId; x: number; y: number }[] = [
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

type Filter = "alle" | Exclude<ActorId, "M">;

const FILTERS: { id: Filter; label: string; text: string }[] = [
  { id: "alle", label: "Alle", text: "Alle overganger. Velg hvem som flytter SED-en for å se bare deres piler." },
  { id: "F", label: "Fagmodulen", text: "Fagmodulen setter UKJENT før journalposten lages, og JOURNALFOERT hvis den ble ferdigstilt med en gang." },
  { id: "1", label: "ferdigstill", text: "ferdigstill leser UKJENT, FEILET_FERDIGSTILL og FEILREGISTRERT hver natt kl. 01.00." },
  { id: "2", label: "feilregistrer", text: "feilregistrer leser FEILET_FEILREGISTRER og UKJENT eldre enn 30 dager hver natt kl. 02.00." },
];

const setBy = (names: string[]) =>
  toActors(names, JOB_BY_ID, (name) => (name === ACTORS.F.name ? { name, badge: "F", tone: "accent", mono: true } : { name, mono: true }));

export function StatusMachine({ selected, onSelect }: { selected: StatusId | null; onSelect: (s: StatusId | null) => void }) {
  const [filter, setFilter] = useState<Filter>("alle");
  const focus = stateFocus(EDGES, selected, filter === "alle" ? undefined : (e) => e.by.includes(filter));
  const toggle = (id: StatusId) => onSelect(selected === id ? null : id);
  const info = selected ? STATUS_BY_ID[selected] : null;

  return (
    <div>
      <FlowToolbar label="Hvem flytter SED-en?" value={filter} onChange={setFilter} options={FILTERS} />
      <StateCanvas width={W} height={H} minWidth={860} label="Journalstatusene til en SED i eux-nav-rinasak">
        <Lane {...LANE} tone="danger" />

        <StateEdges focus={focus} />

        <StateLabels labels={LABELS} focus={focus} />

        {BADGES.map((b) => (
          <JobBadge
            key={`${b.edge}-${b.by}`}
            x={b.x}
            y={b.y}
            label={b.by}
            title={ACTORS[b.by].title}
            tone={b.by === "F" ? "accent" : "warning"}
            dim={focus.dim(b.edge) || (filter !== "alle" && b.by !== filter)}
          />
        ))}

        {DRAWN.map((n) => (
          <StateNode key={n.id} status={STATUS_BY_ID[n.id]} x={n.x} cy={n.cy} w={NW} h={NH} focus={focus} pressed={selected === n.id} onToggle={() => toggle(n.id)}>
            {STAYS[n.id] && (
              <g className="jfr-sm__stay">
                <title>{STAYS[n.id]}</title>
                <text x={n.x + NW - 11} y={n.cy - NH / 2 + 14} textAnchor="middle" fontSize={11} fontWeight={700} fill={TONE[STATUS_BY_ID[n.id].tone].text}>
                  ↻
                </text>
              </g>
            )}
          </StateNode>
        ))}
      </StateCanvas>

      <div className="avs-legend" aria-hidden>
        <span>
          <i className="avs-legend__badge" data-tone="accent">F</i> fagmodulen
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
        <DetailPanel tone={info.tone} eyebrow={info.label} title={info.id} onClose={() => onSelect(null)}>
          <BodyLong size="small">{info.text}</BodyLong>
          <dl className="avs-job__meta">
            <div>
              <dt>Settes av</dt>
              <dd>
                <ActorList actors={setBy(info.setBy)} />
              </dd>
            </div>
            <div>
              <dt>Går videre til</dt>
              <dd>
                {info.next.length > 0 ? (
                  <StatusChips ids={info.next} onFocusStatus={onSelect} />
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
        </DetailPanel>
      ) : (
        <DetailHint>
          Velg en status for å se hvem som setter den, og hvor SED-en kan gå videre. Statusen ligger i tabellen sed_journalstatus i eux-nav-rinasak,
          én rad per SED-versjon.
        </DetailHint>
      )}
    </div>
  );
}
