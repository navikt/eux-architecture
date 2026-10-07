"use client";

import { BodyLong, BodyShort, Detail, Heading, HStack } from "@navikt/ds-react";
import { useReducedMotion } from "@/components/architecture/hooks";
import { onActivate, rounded } from "@/components/architecture/svg";
import { TONE } from "@/components/avslutning/tones";
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

type Kind = "kafka" | "error";
type Edge = { id: string; from: StatusId[]; to: StatusId[]; d: string; kind?: Kind; arrow?: boolean; main?: boolean };

const EDGES: Edge[] = [
  { id: "in-sak", from: [], to: ["NY_SAK"], d: "M 30 200 L 80 200", kind: "kafka" },
  { id: "in-sed", from: [], to: ["DOKUMENT_SENT"], d: "M 30 316 L 80 316", kind: "kafka" },
  { id: "sed", from: ["NY_SAK"], to: ["DOKUMENT_SENT"], d: "M 110 224 L 110 292", kind: "kafka" },
  { id: "ja", from: ["NY_SAK"], to: ["TIL_SLETTING"], d: "M 252 200 L 360 200", main: true },
  { id: "nei", from: ["NY_SAK"], to: ["KAN_IKKE_SLETTES"], d: rounded([[110, 176], [110, 66], [360, 66]], 12) },
  { id: "feil1", from: ["TIL_SLETTING"], to: ["SLETTING_FEILET_RETRY"], d: "M 446 224 L 446 292", kind: "error" },
  { id: "til-j", from: ["TIL_SLETTING"], to: ["SLETTET", "NOT_FOUND"], d: "M 532 200 L 640 200", arrow: false, main: true },
  { id: "retry-j", from: ["SLETTING_FEILET_RETRY"], to: ["SLETTET", "NOT_FOUND"], d: rounded([[532, 316], [640, 316], [640, 200]], 12), arrow: false },
  { id: "ok", from: ["TIL_SLETTING", "SLETTING_FEILET_RETRY"], to: ["SLETTET"], d: "M 640 200 L 880 200", main: true },
  { id: "nf", from: ["TIL_SLETTING", "SLETTING_FEILET_RETRY"], to: ["NOT_FOUND"], d: rounded([[640, 200], [700, 200], [700, 90], [880, 90]], 12) },
  { id: "feil2", from: ["SLETTING_FEILET_RETRY"], to: ["SLETTING_FEILET"], d: "M 640 316 L 880 316", kind: "error" },
];
const EDGE_BY_ID = Object.fromEntries(EDGES.map((e) => [e.id, e])) as Record<string, Edge>;

const LABELS: { edge: string; x: number; y: number; text: string; anchor?: "start" | "middle"; tone?: string }[] = [
  { edge: "in-sak", x: 46, y: 191, text: "sak", tone: "var(--ax-text-meta-purple)" },
  { edge: "in-sed", x: 46, y: 307, text: "SED", tone: "var(--ax-text-meta-purple)" },
  { edge: "sed", x: 122, y: 262, text: "SED sendt eller mottatt", anchor: "start", tone: "var(--ax-text-meta-purple)" },
  { edge: "ja", x: 306, y: 184, text: "kan slettes" },
  { edge: "nei", x: 235, y: 57, text: "nei, 404 eller feil" },
  { edge: "feil1", x: 462, y: 262, text: "annen feil", anchor: "start", tone: "var(--ax-text-danger)" },
  { edge: "ok", x: 790, y: 191, text: "204" },
  { edge: "nf", x: 790, y: 81, text: "404" },
  { edge: "feil2", x: 760, y: 307, text: "annen feil igjen", tone: "var(--ax-text-danger)" },
];

const BADGES: { no: number; x: number; y: number }[] = [
  { no: 2, x: 306, y: 200 },
  { no: 2, x: 110, y: 118 },
  { no: 1, x: 446, y: 258 },
  { no: 1, x: 590, y: 200 },
  { no: 1, x: 590, y: 316 },
];
const JOB_NO: JobId[] = ["slett", "til-sletting", "rapport"];

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
  const reduced = useReducedMotion();
  const lit = (e: Edge) => !!selected && (e.from.includes(selected) || e.to.includes(selected));
  const near = new Set<StatusId>();
  if (selected) {
    near.add(selected);
    EDGES.filter(lit).forEach((e) => [...e.from, ...e.to].forEach((s) => near.add(s)));
  }
  const docFocus = selected === "DOKUMENT_SENT";
  const edgeCls = (e: Edge) => (selected ? (lit(e) ? "is-lit" : "is-dim") : "");
  const nodeCls = (id: StatusId) => (selected ? (id === selected ? "is-active" : near.has(id) ? "is-neighbour" : "is-dim") : "");
  const toggle = (id: StatusId) => onSelect(selected === id ? null : id);
  const info = selected ? STATUS_BY_ID[selected] : null;
  // Lit edges last, so they are drawn on top where paths share a segment
  const ordered = [...EDGES].sort((a, b) => Number(lit(a)) - Number(lit(b)));

  const stroke = (e: Edge) =>
    e.kind === "error" ? "var(--ax-border-danger)" : e.kind === "kafka" ? "var(--ax-border-meta-purple)" : "var(--ax-border-neutral-strong)";
  const marker = (e: Edge) => (e.kind === "error" ? "sl-sm-arrow-error" : e.kind === "kafka" ? "sl-sm-arrow-kafka" : "sl-sm-arrow");
  const flowStroke = (e: Edge) =>
    e.kind === "error" ? "var(--ax-border-danger)" : e.kind === "kafka" ? "var(--ax-border-meta-purple)" : "var(--ax-border-accent)";

  return (
    <div className="avs-sm sl-sm">
      <div className="portal-diagram avs-surface">
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", minWidth: 820, height: "auto", display: "block" }} role="group" aria-label="Statusene til en sak i eux-slett-usendte-rinasaker">
          <defs>
            {(
              [
                ["sl-sm-arrow", "var(--ax-border-neutral-strong)"],
                ["sl-sm-arrow-kafka", "var(--ax-border-meta-purple)"],
                ["sl-sm-arrow-error", "var(--ax-border-danger)"],
              ] as const
            ).map(([id, fill]) => (
              <marker key={id} id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill={fill} />
              </marker>
            ))}
          </defs>

          {/* RINA-baner */}
          {LANES.map((l) => {
            const pw = l.label.length * 5.7 + 18;
            return (
              <g key={l.label} className="avs-sm__lane">
                <rect x={l.x} y={l.y} width={l.w} height={l.h} rx={12} fill="none" stroke="var(--ax-border-info)" strokeOpacity={0.7} strokeDasharray="4 4" />
                <rect x={l.x + l.w / 2 - pw / 2} y={l.y - 8} width={pw} height={16} rx={8} fill="var(--ax-bg-info-moderate)" />
                <text x={l.x + l.w / 2} y={l.y + 4} textAnchor="middle" fontSize={9.5} fontWeight={700} fill="var(--ax-text-info)">
                  {l.label}
                </text>
              </g>
            );
          })}

          {/* Kanter */}
          {ordered.map((e) => (
            <g key={e.id} className={`arch-rf__edge ${edgeCls(e)}`}>
              <path
                d={e.d}
                fill="none"
                stroke={stroke(e)}
                strokeWidth={1.8}
                strokeDasharray={e.kind === "kafka" ? "5 4" : undefined}
                markerEnd={e.arrow === false ? undefined : `url(#${marker(e)})`}
              />
              {(e.main || lit(e)) && (
                <path d={e.d} fill="none" stroke={flowStroke(e)} strokeWidth={2.6} className="arch-flow arch-flow--slow" opacity={selected ? 1 : 0.55} />
              )}
              {!reduced && lit(e) && (
                <circle r={4.5} fill={e.kind === "error" ? "var(--ax-bg-danger-strong)" : e.kind === "kafka" ? "var(--ax-bg-meta-purple-strong)" : "var(--ax-bg-accent-strong)"} className="arch-packet">
                  <animateMotion dur="1.6s" repeatCount="indefinite" path={e.d} />
                </circle>
              )}
            </g>
          ))}

          {/* Startpunkter og knutepunkter */}
          {[200, 316].map((y) => (
            <circle key={y} cx={30} cy={y} r={4.5} fill="var(--ax-border-meta-purple)" className={`arch-rf__edge ${edgeCls(EDGE_BY_ID[y === 200 ? "in-sak" : "in-sed"])}`} />
          ))}
          {[
            { y: 200, edges: ["til-j", "retry-j", "ok", "nf"] },
            { y: 316, edges: ["retry-j", "feil2"] },
          ].map((j) => {
            const on = !selected || j.edges.some((id) => lit(EDGE_BY_ID[id]));
            return <circle key={j.y} cx={640} cy={j.y} r={4} fill="var(--ax-border-neutral-strong)" stroke="var(--ax-bg-default)" strokeWidth={2} opacity={on ? 1 : 0.25} style={{ transition: "opacity 220ms ease" }} />;
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
                {s.final && <rect x={n.x + 3.5} y={y + 3.5} width={NW - 7} height={NH - 7} rx={7} fill="none" stroke={t.stroke} strokeWidth={1} opacity={0.8} />}
                <text x={n.x + NW / 2} y={n.cy - 3} textAnchor="middle" fontSize={10} fontWeight={700} className="arch-mono" fill="var(--ax-text-neutral)">
                  {n.id}
                </text>
                <text x={n.x + NW / 2} y={n.cy + 13} textAnchor="middle" fontSize={10.5} fill={t.text}>
                  {s.label}
                </text>
                {n.id !== "DOKUMENT_SENT" && (
                  <g className={`sl-sm__sed ${docFocus ? "is-on" : ""}`}>
                    <title>En dokumenthendelse setter DOKUMENT_SENT</title>
                    <circle cx={n.x + NW - 2} cy={y + 2} r={5.5} fill="var(--ax-bg-meta-purple-strong)" stroke="var(--ax-bg-default)" strokeWidth={2} />
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

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
                <dt>Settes av</dt>
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
                        EVENT_TEXT[x] ?? x
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
            {RINA_CALL[info.id] && (
              <div>
                <dt>RINA</dt>
                <dd>
                  <code>{RINA_CALL[info.id]}</code> i eux-rina-terminator-api
                </dd>
              </div>
            )}
          </dl>
        </div>
      ) : (
        <BodyShort size="small" className="avs-hint">
          Velg en status for å se hvor saken kommer fra og hvor den kan gå videre. Den lilla prikken på hver status betyr at en
          SED flytter saken til DOKUMENT_SENT.
        </BodyShort>
      )}

      <HStack gap="space-8" align="center" className="avs-unused">
        <BodyShort size="small" className="arch-subtle">
          Finnes i enumen, men brukes ikke:
        </BodyShort>
        {STATUSES.filter((s) => s.unused).map((s) => (
          <button key={s.id} type="button" className="avs-chip arch-mono" data-tone="neutral" aria-pressed={selected === s.id} onClick={() => toggle(s.id)}>
            {s.id}
          </button>
        ))}
      </HStack>
    </div>
  );
}
