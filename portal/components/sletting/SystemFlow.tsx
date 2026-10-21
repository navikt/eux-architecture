"use client";

import { useState } from "react";
import { useReducedMotion } from "@/components/architecture/hooks";
import { rounded } from "@/components/architecture/svg";
import { ArrowPath, EdgeLabel, FlowCanvas, FlowEdge, Packets, Port, Topic, Zone, type Packet } from "@/components/process/FlowCanvas";
import { FlowToolbar, NodeDetail, type NodeInfo } from "@/components/process/FlowPanel";
import { flowFilter, useNodeSelection } from "@/components/process/useNodeSelection";
import { klokke } from "@/components/process/time";
import { TONE } from "@/lib/tones";
import { JOBS } from "./data";

const W = 1140;
const H = 400;

type FlowId = "alle" | "inn" | "jobber" | "rina" | "rapport";
type NodeId = "rina" | "events" | "topic-case" | "topic-doc" | "app" | "naisjob" | "terminator" | "slack";

const JOB_ROWS = JOBS.map((j, i) => ({
  no: j.no,
  name: j.id,
  when: j.sched.prod.freq === "daily" ? `hver natt ${klokke(j.sched.prod.h, j.sched.prod.m)}` : "månedlig · bare prod",
  cy: 112 + i * 46,
}));
const rowY = (no: number) => JOB_ROWS[no - 1].cy;

const jobFlows = (no: number): FlowId[] => {
  const f: FlowId[] = ["jobber"];
  if (no === 1 || no === 2) f.push("rina");
  if (no === 3) f.push("rapport");
  return f;
};

const EDGES: { id: string; d: string; flows: FlowId[] }[] = [
  { id: "nie", d: "M 150 130 L 200 130", flows: ["inn"] },
  { id: "f-case", d: rounded([[380, 130], [410, 130], [410, 100], [446, 100]], 8), flows: ["inn"] },
  { id: "f-doc", d: rounded([[380, 130], [410, 130], [410, 160], [446, 160]], 8), flows: ["inn"] },
  { id: "case-in", d: "M 684 100 L 752 100", flows: ["inn"] },
  { id: "doc-in", d: "M 684 160 L 752 160", flows: ["inn"] },
  ...JOB_ROWS.map((j) => ({ id: `job-${j.no}`, d: `M 1000 ${j.cy} L 930 ${j.cy}`, flows: jobFlows(j.no) })),
  { id: "term", d: rounded([[790, 270], [790, 345], [690, 345]], 12), flows: ["rina"] },
  { id: "cpi", d: "M 420 345 L 150 345", flows: ["rina"] },
  { id: "slack", d: rounded([[900, 270], [900, 345], [990, 345]], 12), flows: ["rapport"] },
];

const flowsOf = (edge: string) => EDGES.find((e) => e.id === edge)!.flows;

const EDGE_LABELS: { edge: string; x: number; y: number; text: string }[] = [
  { edge: "nie", x: 175, y: 121, text: "HTTP" },
  { edge: "case-in", x: 718, y: 91, text: "sak" },
  { edge: "doc-in", x: 718, y: 151, text: "SED" },
  { edge: "term", x: 740, y: 336, text: "Azure AD" },
  { edge: "cpi", x: 285, y: 336, text: "tjenestebruker + CAS" },
  { edge: "slack", x: 945, y: 336, text: "webhook" },
];

const PACKETS: Record<FlowId, Packet[]> = {
  alle: [],
  inn: [
    { d: rounded([[150, 130], [410, 130], [410, 100], [752, 100]], 8), dur: 2.8 },
    { d: rounded([[150, 130], [410, 130], [410, 160], [752, 160]], 8), dur: 2.8, begin: -1.4 },
  ],
  jobber: JOB_ROWS.map((j, i) => ({ d: `M 1000 ${j.cy} L 930 ${j.cy}`, dur: 1.4, begin: -i * 0.3 })),
  rina: [
    ...[1, 2].map((no, i) => ({ d: `M 1000 ${rowY(no)} L 930 ${rowY(no)}`, dur: 1.4, begin: -i * 0.4 })),
    { d: rounded([[790, 270], [790, 345], [150, 345]], 12), dur: 3 },
  ],
  rapport: [
    { d: `M 1000 ${rowY(3)} L 930 ${rowY(3)}`, dur: 1.4 },
    { d: rounded([[900, 270], [900, 345], [990, 345]], 12), dur: 1.8 },
  ],
};

const FLOW_NODES: Record<FlowId, NodeId[] | null> = {
  alle: null,
  inn: ["rina", "events", "topic-case", "topic-doc", "app"],
  jobber: ["naisjob", "app"],
  rina: ["naisjob", "app", "terminator", "rina"],
  rapport: ["naisjob", "app", "slack"],
};

const FLOWS: { id: FlowId; label: string; text: string }[] = [
  {
    id: "alle",
    label: "Alt",
    text: "Hendelser fra RINA forteller appen hvilke saker som finnes og hvilke som har fått en SED. Jobbene om natten finner de usendte sakene og sletter dem via eux-rina-terminator-api. Velg en flyt, eller en boks for detaljer.",
  },
  {
    id: "inn",
    label: "Hendelser inn",
    text: "RINA varsler eux-all-rina-events via NIE, som publiserer på to Kafka-topics. Første sakshendelse lagrer saken som NY_SAK. En SED – sendt eller mottatt – setter DOKUMENT_SENT, og da blir saken aldri slettet.",
  },
  {
    id: "jobber",
    label: "Jobber",
    text: "Tre CronJobs i eux-slett-usendte-rinasaker-naisjob kaller hvert sitt prosessendepunkt uten token. Alt arbeidet gjøres i eux-slett-usendte-rinasaker, synkront i kallet.",
  },
  {
    id: "rina",
    label: "Kall til RINA",
    text: "til-sletting spør om saken kan slettes, og slett sletter den. Begge går gjennom eux-rina-terminator-api med Azure AD-token. Terminator-API-et leser sakens handlinger i RINA CPI og utfører Delete_Case.",
  },
  {
    id: "rapport",
    label: "Rapport",
    text: "Den 1. hver måned kl. 06.00 sender rapport-jobben tallene for forrige måned og køen nå til Slack. Jobben kjører bare i prod.",
  },
];

const INFO: Record<NodeId, NodeInfo> = {
  rina: {
    title: "RINA",
    kind: "Eksternt system",
    tone: "info",
    text: "Saksbehandlingssystemet for EESSI, der sakene og SED-ene ligger. eux-slett-usendte-rinasaker snakker aldri direkte med RINA.",
    facts: [
      "NIE: RINA sender sak- og dokumenthendelser over HTTP til eux-all-rina-events.",
      "CPI: eux-rina-terminator-api logger inn med tjenestebruker og CAS-billett, leser sakens handlinger og utfører Delete_Case.",
      "RINA tilbyr bare Delete_Case på saker som kan slettes.",
    ],
    arch: "rina",
  },
  events: {
    title: "eux-all-rina-events",
    kind: "Hendelser fra RINA",
    tone: "meta-purple",
    text: "Tar imot hendelsene fra RINA og publiserer dem på Kafka. Er ikke en del av selve slettingen, men er kilden til alt eux-slett-usendte-rinasaker vet om sakene.",
    facts: ["Publiserer sakshendelser og dokumenthendelser på hvert sitt topic."],
    arch: "eux-all-rina-events",
    repo: "eux-all-rina-events",
  },
  "topic-case": {
    title: "eux-rina-case-events-v1",
    kind: "Kafka-topic · sakshendelser",
    tone: "meta-purple",
    text: "Første hendelse for en sak lagrer den med status NY_SAK og starter 15-dagersklokken. Senere sakshendelser oppdaterer bare endretTidspunkt – statusen og klokken står.",
    facts: [
      "BUC-typen lagres fra processDefinitionName. Alle BUC-typer behandles likt.",
      "Konsumentgruppe: eux-slett-usendte-rinasaker-case.",
    ],
    arch: "eux-rina-case-events-v1",
  },
  "topic-doc": {
    title: "eux-rina-document-events-v1",
    kind: "Kafka-topic · dokumenthendelser",
    tone: "meta-purple",
    text: "SENT_DOCUMENT og RECEIVE_DOCUMENT setter status DOKUMENT_SENT – uansett hvilken status saken hadde. Andre dokumenthendelser ignoreres.",
    facts: [
      "Finnes ikke saken fra før, lagres den direkte som DOKUMENT_SENT.",
      "Konsumentgruppe: eux-slett-usendte-rinasaker-document.",
    ],
    arch: "eux-rina-document-events-v1",
  },
  app: {
    title: "eux-slett-usendte-rinasaker",
    kind: "Kotlin · Spring Boot",
    tone: "accent",
    text: "Holder oversikt over hver RINA-sak og om den har fått en SED. Lagrer bare saksnummer, BUC-type, status og tidspunkt.",
    facts: [
      "PostgreSQL i Cloud SQL med én tabell: rinasak_status.",
      "POST /api/v1/sletteprosess/{sletteprosess}/execute kjører en prosess synkront og svarer 204.",
      "Ved konflikt i databasen venter lytterne ett sekund og prøver én gang til.",
    ],
    arch: "eux-slett-usendte-rinasaker",
    repo: "eux-slett-usendte-rinasaker",
  },
  naisjob: {
    title: "eux-slett-usendte-rinasaker-naisjob",
    kind: "NAIS-jobber",
    tone: "warning",
    text: "Ett image og tre CronJobs. Hver jobb gjør ett POST-kall til eux-slett-usendte-rinasaker og avslutter.",
    facts: [
      "Kallet sendes uten token. Endepunktet er åpent, men tilgangsreglene slipper bare inn de tre jobbene.",
      "Feiler kallet, logges bare en advarsel, og jobben avslutter som vellykket.",
      "Tidssone Europe/Oslo.",
    ],
    arch: "eux-slett-usendte-rinasaker-naisjob",
    repo: "eux-slett-usendte-rinasaker-naisjob",
  },
  terminator: {
    title: "eux-rina-terminator-api",
    kind: "Handlinger i RINA",
    tone: "info",
    text: "Svarer på om en sak kan slettes, og sletter den. Begge deler avgjøres av om RINA tilbyr handlingen Delete_Case på saken.",
    facts: [
      "GET /api/v1/rinasaker/{id}/status svarer kanSlettes = true eller false.",
      "DELETE /api/v1/rinasaker/{id} utfører Delete_Case og svarer 204. Mangler handlingen, svarer API-et 400.",
      "Finnes ikke saken i RINA, sendes 404 videre.",
    ],
    arch: "eux-rina-terminator-api",
    repo: "eux-rina-terminator-api",
  },
  slack: {
    title: "Slack",
    kind: "Varsling",
    tone: "success",
    text: "Månedsrapporten sendes via en innkommende webhook. Feiler sendingen, logges det bare.",
    facts: ["Bare prod har en rapportjobb som faktisk kjører."],
    arch: "slack",
  },
};

export function SystemFlow() {
  const [flow, setFlow] = useState<FlowId>("alle");
  const lit = FLOW_NODES[flow];
  const { selected, clear, nodeProps } = useNodeSelection<NodeId>((id) => !!lit && !lit.includes(id));
  const edges = flowFilter(flow, "alle");
  const reduced = useReducedMotion();

  return (
    <div>
      <FlowToolbar label="Vis flyt" value={flow} onChange={setFlow} options={FLOWS} />

      <FlowCanvas width={W} height={H} minWidth={760} label="Systemene rundt automatisk sletting">
        <Zone x={430} y={60} w={270} h={140} tone="meta-purple" label="KAFKA" dim={!edges.on(["inn"])} />

        {EDGES.map((e) => (
          <FlowEdge key={e.id} d={e.d} state={edges.state(e.flows)} />
        ))}
        {EDGE_LABELS.map((l) => (
          <EdgeLabel key={l.edge} x={l.x} y={l.y} state={edges.state(flowsOf(l.edge))}>
            {l.text}
          </EdgeLabel>
        ))}

        {/* RINA */}
        <g {...nodeProps("rina", "RINA")}>
          <rect x={0} y={30} width={150} height={360} rx={16} fill={TONE.info.fill} stroke={TONE.info.stroke} strokeWidth={1.5} className="arch-box" />
          <text x={75} y={60} textAnchor="middle" fontSize={17} fontWeight={800} fill="var(--ax-text-neutral)">
            RINA
          </text>
          <text x={75} y={77} textAnchor="middle" fontSize={10.5} fill="var(--ax-text-neutral-subtle)">
            saker og SED-er
          </text>
          {[0, 1, 2].map((i) => {
            const gone = i === 1;
            return (
              <g key={i} opacity={1 - i * 0.22}>
                <rect
                  x={20}
                  y={176 + i * 38}
                  width={110}
                  height={28}
                  rx={7}
                  fill="var(--ax-bg-default)"
                  stroke={gone ? TONE.danger.stroke : TONE.info.stroke}
                  strokeOpacity={0.5}
                  strokeDasharray={gone ? "3 3" : undefined}
                />
                <circle cx={33} cy={190 + i * 38} r={4} fill={gone ? TONE.danger.stroke : TONE.info.stroke} />
                <rect x={43} y={185 + i * 38} width={60 - i * 12} height={4} rx={2} fill="var(--ax-border-neutral-subtle)" />
                <rect x={43} y={193 + i * 38} width={38 + i * 8} height={3} rx={1.5} fill="var(--ax-border-neutral-subtle)" />
                {gone && (
                  <path
                    d={`M 110 ${184 + i * 38} l 12 12 M 122 ${184 + i * 38} l -12 12`}
                    stroke={TONE.danger.stroke}
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    className={flow === "rina" && !reduced ? "sl-sys__x" : ""}
                  />
                )}
              </g>
            );
          })}
          <Port x={96} cy={130} label="NIE" />
          <Port x={96} cy={345} label="CPI" />
        </g>

        {/* eux-all-rina-events */}
        <g {...nodeProps("events", "eux-all-rina-events")}>
          <rect x={200} y={102} width={180} height={56} rx={12} fill={TONE["meta-purple"].fill} stroke={TONE["meta-purple"].stroke} strokeWidth={1.5} className="arch-box" />
          <text x={290} y={127} textAnchor="middle" fontSize={12.5} fontWeight={700} fill="var(--ax-text-neutral)">
            eux-all-rina-events
          </text>
          <text x={290} y={144} textAnchor="middle" fontSize={10.5} fill="var(--ax-text-neutral-subtle)">
            RINA → Kafka
          </text>
        </g>

        {/* Topics */}
        <Topic x={446} cy={100} w={238} h={32} name="eux-rina-case-events-v1" props={nodeProps("topic-case", "eux-rina-case-events-v1")} />
        <Topic x={446} cy={160} w={238} h={32} name="eux-rina-document-events-v1" props={nodeProps("topic-doc", "eux-rina-document-events-v1")} />

        {/* eux-slett-usendte-rinasaker */}
        <g {...nodeProps("app", "eux-slett-usendte-rinasaker")}>
          <rect x={740} y={30} width={200} height={240} rx={16} fill={TONE.accent.fill} stroke={TONE.accent.stroke} strokeWidth={1.8} className="arch-box" />
          <rect x={740} y={30} width={200} height={240} rx={16} fill="none" stroke={TONE.accent.stroke} className="arch-pulse" />
          <text x={840} y={55} textAnchor="middle" fontSize={12} fontWeight={800} fill="var(--ax-text-neutral)">
            eux-slett-usendte-rinasaker
          </text>
          <text x={840} y={72} textAnchor="middle" fontSize={10.5} fill="var(--ax-text-neutral-subtle)">
            Kotlin · Spring Boot
          </text>
          {[
            { cy: 100, t: "leggTilSak" },
            { cy: 160, t: "leggTilDokument" },
          ].map((p) => (
            <g key={p.t}>
              <rect x={752} y={p.cy - 12} width={134} height={24} rx={7} fill="var(--ax-bg-default)" stroke={TONE.accent.stroke} strokeOpacity={0.55} />
              <text x={819} y={p.cy + 4} textAnchor="middle" fontSize={10.5} className="arch-mono" fill="var(--ax-text-neutral)">
                {p.t}
              </text>
            </g>
          ))}
          <text x={819} y={132} textAnchor="middle" fontSize={9.5} fill="var(--ax-text-neutral-subtle)">
            Kafka-lyttere
          </text>
          <ArrowPath d="M 819 172 L 819 192" stroke={TONE.accent.stroke} strokeWidth={1.3} strokeDasharray="3 3" />
          {/* Database */}
          <path d="M 762 202 L 762 250 A 58 8 0 0 0 878 250 L 878 202" fill="var(--ax-bg-default)" stroke={TONE.accent.stroke} strokeWidth={1.3} />
          <ellipse cx={820} cy={202} rx={58} ry={8} fill="var(--ax-bg-accent-moderate)" stroke={TONE.accent.stroke} strokeWidth={1.3} />
          <text x={820} y={228} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--ax-text-neutral)">
            PostgreSQL
          </text>
          <text x={820} y={243} textAnchor="middle" fontSize={9.5} className="arch-mono" fill="var(--ax-text-neutral-subtle)">
            rinasak_status
          </text>
          {/* REST-API */}
          <rect x={898} y={86} width={30} height={168} rx={8} fill="var(--ax-bg-default)" stroke={TONE.accent.stroke} strokeOpacity={0.55} />
          <text x={913} y={170} textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700} letterSpacing="0.12em" fill="var(--ax-text-accent)" transform="rotate(-90 913 170)">
            REST-API
          </text>
          <ArrowPath d="M 898 226 L 880 226" stroke={TONE.accent.stroke} strokeWidth={1.3} strokeDasharray="3 3" />
        </g>

        {/* NAIS-jobber */}
        <g {...nodeProps("naisjob", "eux-slett-usendte-rinasaker-naisjob")}>
          <rect x={990} y={30} width={150} height={240} rx={16} fill={TONE.warning.fill} stroke={TONE.warning.stroke} strokeWidth={1.5} className="arch-box" />
          <text x={1065} y={55} textAnchor="middle" fontSize={13.5} fontWeight={800} fill="var(--ax-text-neutral)">
            NAIS-jobber
          </text>
          <text x={1065} y={72} textAnchor="middle" fontSize={10.5} fill="var(--ax-text-neutral-subtle)">
            CronJob · uten token
          </text>
          {JOB_ROWS.map((j) => {
            const on = edges.on(jobFlows(j.no));
            return (
              <g key={j.no} opacity={on ? 1 : 0.35} style={{ transition: "opacity 220ms ease" }}>
                <rect x={1000} y={j.cy - 17} width={130} height={34} rx={8} fill="var(--ax-bg-default)" fillOpacity={0.85} />
                <circle cx={1014} cy={j.cy} r={8} fill={TONE.warning.strong} />
                <text x={1014} y={j.cy + 3.5} textAnchor="middle" fontSize={10} fontWeight={800} fill="var(--ax-text-warning-contrast)">
                  {j.no}
                </text>
                <text x={1029} y={j.cy - 2} fontSize={11} fontWeight={600} className="arch-mono" fill="var(--ax-text-neutral)">
                  {j.name}
                </text>
                <text x={1029} y={j.cy + 11} fontSize={9.5} fill="var(--ax-text-neutral-subtle)">
                  {j.when}
                </text>
              </g>
            );
          })}
          <text x={1065} y={256} textAnchor="middle" fontSize={9.5} fill="var(--ax-text-neutral-subtle)">
            tidssone Europe/Oslo
          </text>
        </g>

        {/* eux-rina-terminator-api */}
        <g {...nodeProps("terminator", "eux-rina-terminator-api")}>
          <rect x={420} y={300} width={270} height={90} rx={14} fill={TONE.info.fill} stroke={TONE.info.stroke} strokeWidth={1.5} className="arch-box" />
          <text x={555} y={322} textAnchor="middle" fontSize={13} fontWeight={800} fill="var(--ax-text-neutral)">
            eux-rina-terminator-api
          </text>
          {[
            { y: 333, no: 2, verb: "GET", t: "…/{id}/status → kanSlettes" },
            { y: 360, no: 1, verb: "DELETE", t: "…/{id} → Delete_Case" },
          ].map((c) => {
            const on = edges.on(jobFlows(c.no));
            return (
              <g key={c.verb} opacity={on ? 1 : 0.4} style={{ transition: "opacity 220ms ease" }}>
                <rect x={432} y={c.y} width={246} height={21} rx={6} fill="var(--ax-bg-default)" stroke={TONE.info.stroke} strokeOpacity={0.5} />
                <circle cx={444} cy={c.y + 10.5} r={6.5} fill={TONE.warning.strong} />
                <text x={444} y={c.y + 13.6} textAnchor="middle" fontSize={8.5} fontWeight={800} fill="var(--ax-text-warning-contrast)">
                  {c.no}
                </text>
                <text x={457} y={c.y + 14} fontSize={9.5} fontWeight={700} className="arch-mono" fill="var(--ax-text-info)">
                  {c.verb}
                </text>
                <text x={c.verb === "GET" ? 481 : 499} y={c.y + 14} fontSize={9.5} className="arch-mono" fill="var(--ax-text-neutral)">
                  {c.t}
                </text>
              </g>
            );
          })}
        </g>

        {/* Slack */}
        <g {...nodeProps("slack", "Slack")}>
          <rect x={990} y={316} width={150} height={58} rx={12} fill={TONE.success.fill} stroke={TONE.success.stroke} strokeWidth={1.5} className="arch-box" />
          <text x={1065} y={341} textAnchor="middle" fontSize={13} fontWeight={800} fill="var(--ax-text-neutral)">
            Slack
          </text>
          <text x={1065} y={358} textAnchor="middle" fontSize={10.5} fill="var(--ax-text-neutral-subtle)">
            månedsrapport
          </text>
        </g>

        <Packets key={flow} packets={PACKETS[flow]} />
      </FlowCanvas>

      <NodeDetail info={selected ? INFO[selected] : null} onClose={clear} />
    </div>
  );
}
