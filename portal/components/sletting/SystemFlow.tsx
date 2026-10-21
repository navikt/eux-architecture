"use client";

import { useReducedMotion } from "@/components/architecture/hooks";
import { Packets, type Packet } from "@/components/process/FlowCanvas";
import { FlowToolbar, NodeDetail, type NodeInfo } from "@/components/process/FlowPanel";
import {
  JOB_PACKETS,
  JobFlowCanvas,
  JobsBox,
  KafkaIntake,
  RinaSystem,
  ServiceBox,
  SlackBox,
  TerminatorBox,
  jobFlowEdges,
  jobPath,
  useJobFlow,
  type JobFlowId,
  type JobNodeId,
} from "@/components/process/JobServiceFlow";
import { klokke } from "@/components/process/time";
import { TONE } from "@/lib/tones";
import { JOBS } from "./data";

const JOB_ROWS = JOBS.map((j, i) => ({
  no: j.no,
  name: j.id,
  when: j.sched.prod.freq === "daily" ? `hver natt ${klokke(j.sched.prod.h, j.sched.prod.m)}` : "månedlig · bare prod",
  cy: 112 + i * 46,
}));
const rowY = (no: number) => JOB_ROWS[no - 1].cy;

const jobFlows = (no: number): JobFlowId[] => {
  const f: JobFlowId[] = ["jobber"];
  if (no === 1 || no === 2) f.push("rina");
  if (no === 3) f.push("rapport");
  return f;
};

const EDGES = jobFlowEdges(JOB_ROWS.map((j) => ({ id: `job-${j.no}`, d: jobPath(1000, j.cy), flows: jobFlows(j.no) })));

const PACKETS: Record<JobFlowId, Packet[]> = {
  alle: [],
  inn: JOB_PACKETS.inn,
  jobber: JOB_ROWS.map((j, i) => ({ d: jobPath(1000, j.cy), dur: 1.4, begin: -i * 0.3 })),
  rina: [...[1, 2].map((no, i) => ({ d: jobPath(1000, rowY(no)), dur: 1.4, begin: -i * 0.4 })), JOB_PACKETS.terminator],
  rapport: [{ d: jobPath(1000, rowY(3)), dur: 1.4 }, JOB_PACKETS.slack],
};

const CALLS = [
  { y: 333, no: 2, verb: "GET", t: "…/{id}/status → kanSlettes" },
  { y: 360, no: 1, verb: "DELETE", t: "…/{id} → Delete_Case" },
];

const FLOWS: { id: JobFlowId; label: string; text: string }[] = [
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

const INFO: Record<JobNodeId, NodeInfo> = {
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
  const flow = useJobFlow();
  const { nodeProps, edges } = flow;
  const reduced = useReducedMotion();

  return (
    <div>
      <FlowToolbar label="Vis flyt" value={flow.flow} onChange={flow.setFlow} options={FLOWS} />

      <JobFlowCanvas label="Systemene rundt automatisk sletting" flow={flow} edges={EDGES}>
        <RinaSystem nodeProps={nodeProps} crossed={{ index: 1, className: flow.flow === "rina" && !reduced ? "sl-sys__x" : "" }} />
        <KafkaIntake nodeProps={nodeProps} />
        <ServiceBox nodeProps={nodeProps} name="eux-slett-usendte-rinasaker" nameSize={12} listeners={["leggTilSak", "leggTilDokument"]} tables="rinasak_status" />

        <JobsBox nodeProps={nodeProps} name="eux-slett-usendte-rinasaker-naisjob">
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
        </JobsBox>

        <TerminatorBox nodeProps={nodeProps}>
          {CALLS.map((c) => {
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
        </TerminatorBox>

        <SlackBox nodeProps={nodeProps} />

        <Packets key={flow.flow} packets={PACKETS[flow.flow]} />
      </JobFlowCanvas>

      <NodeDetail info={flow.selected ? INFO[flow.selected] : null} onClose={flow.clear} />
    </div>
  );
}
