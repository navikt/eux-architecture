"use client";

import { BodyLong } from "@navikt/ds-react";
import { rounded } from "@/components/architecture/svg";
import { DetailHint, DetailPanel } from "@/components/process/FlowPanel";
import {
  ActorList,
  JobBadge,
  Lane,
  StateCanvas,
  StateEdges,
  StateLabels,
  StateNode,
  UnusedStatuses,
  stateFocus,
  toActors,
  type EdgeLabel,
  type StateEdge,
} from "@/components/process/StateMachine";
import { JOB_BY_ID, STATUSES, STATUS_BY_ID, type JobId, type StatusId } from "./data";
import { StatusChips } from "./StatusChips";

const W = 1080;
const H = 372;
const NW = 172;
const NH = 48;

const POS: Partial<Record<StatusId, { x: number; cy: number }>> = {
  NY_SAK: { x: 80, cy: 200 },
  DOKUMENT_SENT: { x: 80, cy: 316 },
  KAN_IKKE_SLETTES: { x: 360, cy: 66 },
  TIL_SLETTING: { x: 360, cy: 200 },
  SLETTING_FEILET_RETRY: { x: 360, cy: 316 },
  NOT_FOUND: { x: 880, cy: 90 },
  SLETTET: { x: 880, cy: 200 },
  SLETTING_FEILET: { x: 880, cy: 316 },
};
const DRAWN = (Object.keys(POS) as StatusId[]).map((id) => ({ id, ...POS[id]! }));

const EDGES: StateEdge<StatusId>[] = [
  { id: "in-sak", from: [], to: ["NY_SAK"], d: "M 30 200 L 80 200", kind: "event" },
  { id: "in-sed", from: [], to: ["DOKUMENT_SENT"], d: "M 30 316 L 80 316", kind: "event" },
  { id: "sed", from: ["NY_SAK"], to: ["DOKUMENT_SENT"], d: "M 110 224 L 110 292", kind: "event" },
  { id: "ja", from: ["NY_SAK"], to: ["TIL_SLETTING"], d: "M 252 200 L 360 200", main: true },
  { id: "nei", from: ["NY_SAK"], to: ["KAN_IKKE_SLETTES"], d: rounded([[110, 176], [110, 66], [360, 66]], 12) },
  { id: "feil1", from: ["TIL_SLETTING"], to: ["SLETTING_FEILET_RETRY"], d: "M 446 224 L 446 292", kind: "error" },
  { id: "til-j", from: ["TIL_SLETTING"], to: ["SLETTET", "NOT_FOUND"], d: "M 532 200 L 640 200", arrow: false, main: true },
  { id: "retry-j", from: ["SLETTING_FEILET_RETRY"], to: ["SLETTET", "NOT_FOUND"], d: rounded([[532, 316], [640, 316], [640, 200]], 12), arrow: false },
  { id: "ok", from: ["TIL_SLETTING", "SLETTING_FEILET_RETRY"], to: ["SLETTET"], d: "M 640 200 L 880 200", main: true },
  { id: "nf", from: ["TIL_SLETTING", "SLETTING_FEILET_RETRY"], to: ["NOT_FOUND"], d: rounded([[640, 200], [700, 200], [700, 90], [880, 90]], 12) },
  { id: "feil2", from: ["SLETTING_FEILET_RETRY"], to: ["SLETTING_FEILET"], d: "M 640 316 L 880 316", kind: "error" },
];
const LABELS: EdgeLabel[] = [
  { edge: "in-sak", x: 46, y: 191, text: "sak", color: "var(--ax-text-meta-purple)" },
  { edge: "in-sed", x: 46, y: 307, text: "SED", color: "var(--ax-text-meta-purple)" },
  { edge: "sed", x: 122, y: 262, text: "SED sendt eller mottatt", anchor: "start", color: "var(--ax-text-meta-purple)" },
  { edge: "ja", x: 306, y: 184, text: "kan slettes" },
  { edge: "nei", x: 235, y: 57, text: "nei, 404 eller feil" },
  { edge: "feil1", x: 462, y: 262, text: "annen feil", anchor: "start", color: "var(--ax-text-danger)" },
  { edge: "ok", x: 790, y: 191, text: "204" },
  { edge: "nf", x: 790, y: 81, text: "404" },
  { edge: "feil2", x: 760, y: 307, text: "annen feil igjen", color: "var(--ax-text-danger)" },
];

const BADGES: { job: JobId; x: number; y: number }[] = [
  { job: "til-sletting", x: 306, y: 200 },
  { job: "til-sletting", x: 110, y: 118 },
  { job: "slett", x: 446, y: 258 },
  { job: "slett", x: 590, y: 200 },
  { job: "slett", x: 590, y: 316 },
];

/** Where the answer from RINA decides the next status, and the edges that pass through. */
const JUNCTIONS = [
  { x: 640, y: 200, edges: ["til-j", "retry-j", "ok", "nf"] },
  { x: 640, y: 316, edges: ["retry-j", "feil2"] },
];

const LANES = [
  { x: 66, y: 156, w: 200, h: 88, label: "spør RINA" },
  { x: 346, y: 156, w: 200, h: 200, label: "sletter i RINA" },
];

const RINA_CALL: Partial<Record<StatusId, string>> = {
  NY_SAK: "GET /api/v1/rinasaker/{id}/status",
  TIL_SLETTING: "DELETE /api/v1/rinasaker/{id}",
  SLETTING_FEILET_RETRY: "DELETE /api/v1/rinasaker/{id}",
};

const EVENT_TEXT: Record<string, string> = {
  sakshendelse: "første sakshendelse (Kafka)",
  dokumenthendelse: "dokumenthendelse (Kafka)",
};

export function StatusMachine({ selected, onSelect }: { selected: StatusId | null; onSelect: (s: StatusId | null) => void }) {
  const focus = stateFocus(EDGES, selected);
  const toggle = (id: StatusId) => onSelect(selected === id ? null : id);
  const info = selected ? STATUS_BY_ID[selected] : null;

  return (
    <div>
      <StateCanvas width={W} height={H} minWidth={820} label="Statusene til en sak i eux-slett-usendte-rinasaker">
        {LANES.map((l) => (
          <Lane key={l.label} {...l} />
        ))}

        <StateEdges focus={focus} />

        {JUNCTIONS.map((j) => {
          const on = !selected || j.edges.some(focus.lit);
          return <circle key={j.y} cx={j.x} cy={j.y} r={4} fill="var(--ax-border-neutral-strong)" stroke="var(--ax-bg-default)" strokeWidth={2} opacity={on ? 1 : 0.25} style={{ transition: "opacity 220ms ease" }} />;
        })}

        <StateLabels labels={LABELS} focus={focus} />

        {BADGES.map((b) => (
          <JobBadge key={`${b.x}-${b.y}`} x={b.x} y={b.y} label={JOB_BY_ID[b.job].no} title={`${JOB_BY_ID[b.job].no} · ${b.job}`} />
        ))}

        {DRAWN.map((n) => (
          <StateNode key={n.id} status={STATUS_BY_ID[n.id]} x={n.x} cy={n.cy} w={NW} h={NH} focus={focus} pressed={selected === n.id} onToggle={() => toggle(n.id)}>
            {n.id !== "DOKUMENT_SENT" && (
              <g className={`sl-sm__sed ${selected === "DOKUMENT_SENT" ? "is-on" : ""}`}>
                <title>En dokumenthendelse setter DOKUMENT_SENT</title>
                <circle cx={n.x + NW - 2} cy={n.cy - NH / 2 + 2} r={5.5} fill="var(--ax-bg-meta-purple-strong)" stroke="var(--ax-bg-default)" strokeWidth={2} />
              </g>
            )}
          </StateNode>
        ))}
      </StateCanvas>

      <div className="avs-legend" aria-hidden>
        <span>
          <i className="avs-legend__badge">1</i> jobben som flytter saken
        </span>
        <span>
          <i className="avs-legend__lane" /> neste jobb kaller RINA
        </span>
        <span>
          <i className="avs-legend__final" /> ingen jobb ser på saken igjen
        </span>
        <span>
          <i className="sl-legend__sed" /> en SED setter DOKUMENT_SENT – fra alle statuser
        </span>
        <span>
          <i className="avs-legend__line" data-kind="kafka" /> Kafka-hendelse
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
                <dt>Settes av</dt>
                <dd>
                  <ActorList actors={toActors(info.into, JOB_BY_ID, (name) => ({ name: EVENT_TEXT[name] ?? name }))} />
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
            {RINA_CALL[info.id] && (
              <div>
                <dt>RINA</dt>
                <dd>
                  <code>{RINA_CALL[info.id]}</code> i eux-rina-terminator-api
                </dd>
              </div>
            )}
          </dl>
        </DetailPanel>
      ) : (
        <DetailHint>
          Velg en status for å se hvor saken kommer fra og hvor den kan gå videre. Den lilla prikken på hver status betyr at en
          SED flytter saken til DOKUMENT_SENT.
        </DetailHint>
      )}

      <UnusedStatuses ids={STATUSES.filter((s) => s.unused).map((s) => s.id)} selected={selected} onToggle={toggle} />
    </div>
  );
}
