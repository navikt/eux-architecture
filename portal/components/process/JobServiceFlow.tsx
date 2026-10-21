"use client";

import { useState, type ReactNode, type SVGProps } from "react";
import { rounded } from "@/components/architecture/svg";
import { TONE } from "@/lib/tones";
import { ArrowPath, EdgeLabel, FlowCanvas, FlowEdge, Port, Topic, Zone, type Packet } from "./FlowCanvas";
import { flowFilter, useNodeSelection } from "./useNodeSelection";

/*
 * The system figure shared by automatisk avslutning and automatisk sletting. RINA events reach a
 * Kotlin service over Kafka, NAIS jobs call the service, and the service changes RINA through
 * eux-rina-terminator-api and reports to Slack. Only the service, the job rows, the terminator
 * calls and the RINA documents differ, so those are passed in. Coordinates are viewBox units.
 */

export type JobFlowId = "alle" | "inn" | "jobber" | "rina" | "rapport";
export type JobNodeId = "rina" | "events" | "topic-case" | "topic-doc" | "app" | "naisjob" | "terminator" | "slack";
export type JobEdge = { id: string; d: string; flows: JobFlowId[] };

type NodeProps = (id: JobNodeId, label: string) => SVGProps<SVGGElement>;

/** A job edge from a row in the jobs box at `fromX` to the service's REST-API strip. */
export const jobPath = (fromX: number, cy: number) => `M ${fromX} ${cy} L 930 ${cy}`;

const LIT_NODES: Record<JobFlowId, JobNodeId[] | null> = {
  alle: null,
  inn: ["rina", "events", "topic-case", "topic-doc", "app"],
  jobber: ["naisjob", "app"],
  rina: ["naisjob", "app", "terminator", "rina"],
  rapport: ["naisjob", "app", "slack"],
};

const INTAKE_EDGES: JobEdge[] = [
  { id: "nie", d: "M 150 130 L 200 130", flows: ["inn"] },
  { id: "f-case", d: rounded([[380, 130], [410, 130], [410, 100], [446, 100]], 8), flows: ["inn"] },
  { id: "f-doc", d: rounded([[380, 130], [410, 130], [410, 160], [446, 160]], 8), flows: ["inn"] },
  { id: "case-in", d: "M 684 100 L 752 100", flows: ["inn"] },
  { id: "doc-in", d: "M 684 160 L 752 160", flows: ["inn"] },
];

const OUT_EDGES: JobEdge[] = [
  { id: "term", d: rounded([[790, 270], [790, 345], [690, 345]], 12), flows: ["rina"] },
  { id: "cpi", d: "M 420 345 L 150 345", flows: ["rina"] },
  { id: "slack", d: rounded([[900, 270], [900, 345], [990, 345]], 12), flows: ["rapport"] },
];

const EDGE_LABELS: { edge: string; x: number; y: number; text: string }[] = [
  { edge: "nie", x: 175, y: 121, text: "HTTP" },
  { edge: "case-in", x: 718, y: 91, text: "sak" },
  { edge: "doc-in", x: 718, y: 151, text: "SED" },
  { edge: "term", x: 740, y: 336, text: "Azure AD" },
  { edge: "cpi", x: 285, y: 336, text: "tjenestebruker + CAS" },
  { edge: "slack", x: 945, y: 336, text: "webhook" },
];

/** Every edge in the figure, with the job edges between the intake and the outgoing calls. */
export const jobFlowEdges = (jobEdges: JobEdge[]): JobEdge[] => [...INTAKE_EDGES, ...jobEdges, ...OUT_EDGES];

export const JOB_PACKETS = {
  inn: [
    { d: rounded([[150, 130], [410, 130], [410, 100], [752, 100]], 8), dur: 2.8 },
    { d: rounded([[150, 130], [410, 130], [410, 160], [752, 160]], 8), dur: 2.8, begin: -1.4 },
  ],
  terminator: { d: rounded([[790, 270], [790, 345], [150, 345]], 12), dur: 3 },
  slack: { d: rounded([[900, 270], [900, 345], [990, 345]], 12), dur: 1.8 },
} satisfies Record<string, Packet | Packet[]>;

/** The picked flow, the selected box and the lit/dim state for the figure. */
export function useJobFlow() {
  const [flow, setFlow] = useState<JobFlowId>("alle");
  const lit = LIT_NODES[flow];
  const { selected, clear, nodeProps } = useNodeSelection<JobNodeId>((id) => !!lit && !lit.includes(id));
  return { flow, setFlow, selected, clear, nodeProps, edges: flowFilter(flow, "alle") };
}

export type JobFlow = ReturnType<typeof useJobFlow>;

/** The canvas with the Kafka zone, every edge and the edge labels. The boxes go in `children`. */
export function JobFlowCanvas({ label, flow, edges, children }: { label: string; flow: JobFlow; edges: JobEdge[]; children: ReactNode }) {
  const flowsOf = (edge: string) => edges.find((e) => e.id === edge)!.flows;
  return (
    <FlowCanvas width={1140} height={400} minWidth={760} label={label}>
      <Zone x={430} y={60} w={270} h={140} tone="meta-purple" label="KAFKA" dim={!flow.edges.on(["inn"])} />

      {edges.map((e) => (
        <FlowEdge key={e.id} d={e.d} state={flow.edges.state(e.flows)} />
      ))}
      {EDGE_LABELS.map((l) => (
        <EdgeLabel key={l.edge} x={l.x} y={l.y} state={flow.edges.state(flowsOf(l.edge))}>
          {l.text}
        </EdgeLabel>
      ))}

      {children}
    </FlowCanvas>
  );
}

/** RINA with its NIE and CPI ports and a stack of three cases. `crossed` marks one case as deleted. */
export function RinaSystem({ nodeProps, crossed }: { nodeProps: NodeProps; crossed?: { index: number; className?: string } }) {
  return (
    <g {...nodeProps("rina", "RINA")}>
      <rect x={0} y={30} width={150} height={360} rx={16} fill={TONE.info.fill} stroke={TONE.info.stroke} strokeWidth={1.5} className="arch-box" />
      <text x={75} y={60} textAnchor="middle" fontSize={17} fontWeight={800} fill="var(--ax-text-neutral)">
        RINA
      </text>
      <text x={75} y={77} textAnchor="middle" fontSize={10.5} fill="var(--ax-text-neutral-subtle)">
        saker og SED-er
      </text>
      {[0, 1, 2].map((i) => {
        const gone = crossed?.index === i;
        const stroke = gone ? TONE.danger.stroke : TONE.info.stroke;
        const y = 176 + i * 38;
        return (
          <g key={i} opacity={1 - i * 0.22}>
            <rect x={20} y={y} width={110} height={28} rx={7} fill="var(--ax-bg-default)" stroke={stroke} strokeOpacity={0.5} strokeDasharray={gone ? "3 3" : undefined} />
            <circle cx={33} cy={y + 14} r={4} fill={stroke} />
            <rect x={43} y={y + 9} width={60 - i * 12} height={4} rx={2} fill="var(--ax-border-neutral-subtle)" />
            <rect x={43} y={y + 17} width={38 + i * 8} height={3} rx={1.5} fill="var(--ax-border-neutral-subtle)" />
            {gone && (
              <path
                d={`M 110 ${y + 8} l 12 12 M 122 ${y + 8} l -12 12`}
                stroke={TONE.danger.stroke}
                strokeWidth={1.8}
                strokeLinecap="round"
                className={crossed.className ?? ""}
              />
            )}
          </g>
        );
      })}
      <Port x={96} cy={130} label="NIE" />
      <Port x={96} cy={345} label="CPI" />
    </g>
  );
}

/** eux-all-rina-events and the two Kafka topics it publishes on. */
export function KafkaIntake({ nodeProps }: { nodeProps: NodeProps }) {
  return (
    <>
      <g {...nodeProps("events", "eux-all-rina-events")}>
        <rect x={200} y={102} width={180} height={56} rx={12} fill={TONE["meta-purple"].fill} stroke={TONE["meta-purple"].stroke} strokeWidth={1.5} className="arch-box" />
        <text x={290} y={127} textAnchor="middle" fontSize={12.5} fontWeight={700} fill="var(--ax-text-neutral)">
          eux-all-rina-events
        </text>
        <text x={290} y={144} textAnchor="middle" fontSize={10.5} fill="var(--ax-text-neutral-subtle)">
          RINA → Kafka
        </text>
      </g>

      <Topic x={446} cy={100} w={238} h={32} name="eux-rina-case-events-v1" props={nodeProps("topic-case", "eux-rina-case-events-v1")} />
      <Topic x={446} cy={160} w={238} h={32} name="eux-rina-document-events-v1" props={nodeProps("topic-doc", "eux-rina-document-events-v1")} />
    </>
  );
}

/** The Kotlin service: its two Kafka listeners, the database and the REST-API strip the jobs call. */
export function ServiceBox({
  nodeProps,
  name,
  nameSize = 13.5,
  listeners,
  tables,
}: {
  nodeProps: NodeProps;
  name: string;
  nameSize?: number;
  listeners: [cases: string, documents: string];
  tables: string;
}) {
  const stroke = TONE.accent.stroke;
  return (
    <g {...nodeProps("app", name)}>
      <rect x={740} y={30} width={200} height={240} rx={16} fill={TONE.accent.fill} stroke={stroke} strokeWidth={1.8} className="arch-box" />
      <rect x={740} y={30} width={200} height={240} rx={16} fill="none" stroke={stroke} className="arch-pulse" />
      <text x={840} y={55} textAnchor="middle" fontSize={nameSize} fontWeight={800} fill="var(--ax-text-neutral)">
        {name}
      </text>
      <text x={840} y={72} textAnchor="middle" fontSize={10.5} fill="var(--ax-text-neutral-subtle)">
        Kotlin · Spring Boot
      </text>
      {listeners.map((t, i) => {
        const cy = 100 + i * 60;
        return (
          <g key={t}>
            <rect x={752} y={cy - 12} width={134} height={24} rx={7} fill="var(--ax-bg-default)" stroke={stroke} strokeOpacity={0.55} />
            <text x={819} y={cy + 4} textAnchor="middle" fontSize={10.5} className="arch-mono" fill="var(--ax-text-neutral)">
              {t}
            </text>
          </g>
        );
      })}
      <text x={819} y={132} textAnchor="middle" fontSize={9.5} fill="var(--ax-text-neutral-subtle)">
        Kafka-lyttere
      </text>
      <ArrowPath d="M 819 172 L 819 192" stroke={stroke} strokeWidth={1.3} strokeDasharray="3 3" />
      {/* Database */}
      <path d="M 762 202 L 762 250 A 58 8 0 0 0 878 250 L 878 202" fill="var(--ax-bg-default)" stroke={stroke} strokeWidth={1.3} />
      <ellipse cx={820} cy={202} rx={58} ry={8} fill="var(--ax-bg-accent-moderate)" stroke={stroke} strokeWidth={1.3} />
      <text x={820} y={228} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--ax-text-neutral)">
        PostgreSQL
      </text>
      <text x={820} y={243} textAnchor="middle" fontSize={9.5} className="arch-mono" fill="var(--ax-text-neutral-subtle)">
        {tables}
      </text>
      {/* REST-API */}
      <rect x={898} y={86} width={30} height={168} rx={8} fill="var(--ax-bg-default)" stroke={stroke} strokeOpacity={0.55} />
      <text x={913} y={170} textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700} letterSpacing="0.12em" fill="var(--ax-text-accent)" transform="rotate(-90 913 170)">
        REST-API
      </text>
      <ArrowPath d="M 898 226 L 880 226" stroke={stroke} strokeWidth={1.3} strokeDasharray="3 3" />
    </g>
  );
}

/** The NAIS-jobs box. `children` draws the job rows. */
export function JobsBox({ nodeProps, name, children }: { nodeProps: NodeProps; name: string; children: ReactNode }) {
  return (
    <g {...nodeProps("naisjob", name)}>
      <rect x={990} y={30} width={150} height={240} rx={16} fill={TONE.warning.fill} stroke={TONE.warning.stroke} strokeWidth={1.5} className="arch-box" />
      <text x={1065} y={55} textAnchor="middle" fontSize={13.5} fontWeight={800} fill="var(--ax-text-neutral)">
        NAIS-jobber
      </text>
      <text x={1065} y={72} textAnchor="middle" fontSize={10.5} fill="var(--ax-text-neutral-subtle)">
        CronJob · uten token
      </text>
      {children}
    </g>
  );
}

/** eux-rina-terminator-api. `children` draws the calls the service makes. */
export function TerminatorBox({ nodeProps, children }: { nodeProps: NodeProps; children: ReactNode }) {
  return (
    <g {...nodeProps("terminator", "eux-rina-terminator-api")}>
      <rect x={420} y={300} width={270} height={90} rx={14} fill={TONE.info.fill} stroke={TONE.info.stroke} strokeWidth={1.5} className="arch-box" />
      <text x={555} y={322} textAnchor="middle" fontSize={13} fontWeight={800} fill="var(--ax-text-neutral)">
        eux-rina-terminator-api
      </text>
      {children}
    </g>
  );
}

/** The Slack box for the monthly report. */
export function SlackBox({ nodeProps }: { nodeProps: NodeProps }) {
  return (
    <g {...nodeProps("slack", "Slack")}>
      <rect x={990} y={316} width={150} height={58} rx={12} fill={TONE.success.fill} stroke={TONE.success.stroke} strokeWidth={1.5} className="arch-box" />
      <text x={1065} y={341} textAnchor="middle" fontSize={13} fontWeight={800} fill="var(--ax-text-neutral)">
        Slack
      </text>
      <text x={1065} y={358} textAnchor="middle" fontSize={10.5} fill="var(--ax-text-neutral-subtle)">
        månedsrapport
      </text>
    </g>
  );
}
