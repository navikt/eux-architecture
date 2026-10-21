"use client";

import { BodyLong } from "@navikt/ds-react";
import { rounded } from "@/components/architecture/svg";
import { DetailHint, DetailPanel } from "@/components/process/FlowPanel";
import { ActorList, JobBadge, Lane, StateCanvas, StateEdges, StateNode, UnusedStatuses, stateFocus, toActors, type StateEdge } from "@/components/process/StateMachine";
import { JOB_BY_ID, STATUSES, STATUS_BY_ID, type JobId, type StatusId } from "./data";
import { StatusChips } from "./StatusChips";

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
const ERRORS: StatusId[] = ["HANDLING_MANGLER", "HANDLING_FEILET"];

const EDGES: StateEdge<StatusId>[] = [
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

const BADGES: { job: JobId; x: number; y: number }[] = [
  { job: "sett-uvirksom", x: 214, y: 176 },
  { job: "til-avslutning", x: 412, y: 176 },
  { job: "til-avslutning", x: 363, y: 230 },
  { job: "avslutt", x: 610, y: 134 },
  { job: "avslutt", x: 610, y: 218 },
  { job: "til-arkivering", x: 808, y: 176 },
  { job: "arkiver", x: 1006, y: 176 },
  { job: "slett-dokumentutkast", x: 268, y: 247 },
];

const LANES = [
  { x: 426, y: 100, w: 170, h: 152 },
  { x: 822, y: 142, w: 170, h: 68 },
  { x: 228, y: 284, w: 170, h: 68 },
];

export function StatusMachine({ selected, onSelect }: { selected: StatusId | null; onSelect: (s: StatusId | null) => void }) {
  const focus = stateFocus(EDGES, selected);
  const toggle = (id: StatusId) => onSelect(selected === id ? null : id);
  const info = selected ? STATUS_BY_ID[selected] : null;
  const errorsDim = !!selected && !ERRORS.includes(selected) && !EDGES.some((e) => e.kind === "error" && focus.lit(e.id));

  return (
    <div>
      <StateCanvas width={W} height={H} minWidth={820} label="Statusene til en sak i eux-avslutt-rinasaker">
        {/* Feilgruppe */}
        <g className={`arch-rf__group ${errorsDim ? "is-dim" : ""}`}>
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

        {LANES.map((l) => (
          <Lane key={`${l.x}-${l.y}`} {...l} label="kaller RINA" />
        ))}

        <StateEdges focus={focus} />

        {/* Kantetiketter */}
        <text x={197} y={97} textAnchor="middle" fontSize={10.5} fontWeight={700} className={`arch-halo arch-rf__edge ${focus.edgeState("back")}`} fill="var(--ax-text-warning)">
          ny SED (Kafka)
        </text>
        <g className={`arch-rf__edge ${focus.edgeState("loop")}`}>
          <text x={363} y={256} textAnchor="middle" fontSize={10.5} fontWeight={700} className="arch-halo" fill="var(--ax-text-warning)">
            ingen treff
          </text>
          <text x={363} y={269} textAnchor="middle" fontSize={9.5} className="arch-halo" fill="var(--ax-text-neutral-subtle)">
            ny vurdering neste natt
          </text>
        </g>
        <text x={146} y={309} textAnchor="middle" fontSize={10} fontStyle="italic" className={`arch-halo arch-rf__edge ${focus.edgeState("manual")}`} fill="var(--ax-text-neutral-subtle)">
          settes utenfor appen
        </text>

        {BADGES.map((b) => (
          <JobBadge key={`${b.x}-${b.y}`} x={b.x} y={b.y} label={JOB_BY_ID[b.job].no} title={`${JOB_BY_ID[b.job].no} · ${b.job}`} />
        ))}

        {DRAWN.map((n) => (
          <StateNode key={n.id} status={STATUS_BY_ID[n.id]} x={n.x} cy={n.cy} w={NW} h={NH} focus={focus} pressed={selected === n.id} onToggle={() => toggle(n.id)} />
        ))}
      </StateCanvas>

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
        <DetailPanel tone={info.tone} eyebrow={info.label} title={info.id} onClose={() => onSelect(null)}>
          <BodyLong size="small">{info.text}</BodyLong>
          <dl className="avs-job__meta">
            {info.into.length > 0 && (
              <div>
                <dt>Kommer fra</dt>
                <dd>
                  <ActorList actors={toActors(info.into, JOB_BY_ID)} />
                </dd>
              </div>
            )}
            {info.next.length > 0 && (
              <div>
                <dt>Går videre til</dt>
                <dd>
                  <StatusChips ids={info.next} onFocusStatus={onSelect} />
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
        </DetailPanel>
      ) : (
        <DetailHint>Velg en status for å se hvor saken kommer fra og hvor den kan gå videre.</DetailHint>
      )}

      <UnusedStatuses ids={STATUSES.filter((s) => s.unused).map((s) => s.id)} selected={selected} onToggle={toggle} />
    </div>
  );
}
