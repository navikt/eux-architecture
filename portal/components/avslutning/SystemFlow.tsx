"use client";

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
import { TONE } from "@/lib/tones";

const JOB_ROWS = [
  "sett-uvirksom",
  "til-avslutning",
  "avslutt",
  "til-arkivering",
  "arkiver",
  "slett-dok-utkast",
  "rapport",
].map((name, i) => ({ no: i + 1, name, cy: 96 + i * 25 }));
const rowY = (no: number) => JOB_ROWS[no - 1].cy;

const jobFlows = (no: number): JobFlowId[] => {
  const f: JobFlowId[] = ["jobber"];
  if (no === 3 || no === 5 || no === 6) f.push("rina");
  if (no === 7) f.push("rapport");
  return f;
};

const EDGES = jobFlowEdges(JOB_ROWS.map((j) => ({ id: `job-${j.no}`, d: jobPath(990, j.cy), flows: jobFlows(j.no) })));

const PACKETS: Record<JobFlowId, Packet[]> = {
  alle: [],
  inn: JOB_PACKETS.inn,
  jobber: JOB_ROWS.map((j, i) => ({ d: jobPath(990, j.cy), dur: 1.4, begin: -i * 0.2 })),
  rina: [...[3, 5, 6].map((no, i) => ({ d: jobPath(990, rowY(no)), dur: 1.4, begin: -i * 0.3 })), JOB_PACKETS.terminator],
  rapport: [{ d: jobPath(990, rowY(7)), dur: 1.4 }, JOB_PACKETS.slack],
};

const CALLS = [
  { x: 432, y: 333, t: "avsluttLokalt" },
  { x: 559, y: 333, t: "avsluttGlobalt" },
  { x: 432, y: 360, t: "arkiver" },
  { x: 559, y: 360, t: "slettDokumentutkast" },
];

const FLOWS: { id: JobFlowId; label: string; text: string }[] = [
  {
    id: "alle",
    label: "Alt",
    text: "Hendelser kommer inn fra RINA, jobbene driver sakene videre, og kallene går ut til RINA og Slack. Velg en flyt for å følge den, eller en boks for detaljer.",
  },
  {
    id: "inn",
    label: "Hendelser inn",
    text: "RINA varsler eux-all-rina-events via NIE. Hendelsene publiseres på to Kafka-topics, og eux-avslutt-rinasaker lagrer sak og SED i egen database. Slik vet appen når den siste SED-en kom, uten å spørre RINA.",
  },
  {
    id: "jobber",
    label: "Jobber",
    text: "Sju CronJobs i eux-avslutt-rinasaker-naisjob kaller hvert sitt prosessendepunkt. Jobbene har ingen logikk selv. Alt arbeidet gjøres i eux-avslutt-rinasaker, synkront i kallet.",
  },
  {
    id: "rina",
    label: "Kall til RINA",
    text: "Tre av jobbene endrer saker i RINA: avslutt, arkiver og slett-dokumentutkast. eux-avslutt-rinasaker kaller eux-rina-terminator-api med Azure AD-token, og terminator-API-et utfører handlingen i RINA CPI.",
  },
  {
    id: "rapport",
    label: "Rapport",
    text: "Den 1. hver måned kl. 00.05 sender rapport-jobben en oppsummering av forrige måned til Slack. Jobben kjører bare i prod.",
  },
];

const INFO: Record<JobNodeId, NodeInfo> = {
  rina: {
    title: "RINA",
    kind: "Eksternt system",
    tone: "info",
    text: "EU-kommisjonens saksbehandlingssystem for EESSI. Sakene og SED-ene ligger her. eux-avslutt-rinasaker snakker aldri direkte med RINA.",
    facts: [
      "NIE: RINA sender sak- og dokumenthendelser over HTTP til eux-all-rina-events.",
      "CPI: eux-rina-terminator-api logger inn med tjenestebruker og CAS-billett, og utfører handlingene.",
    ],
    arch: "rina",
  },
  events: {
    title: "eux-all-rina-events",
    kind: "Hendelser fra RINA",
    tone: "meta-purple",
    text: "Tar imot hendelsene fra RINA og publiserer dem på Kafka. Er ikke en del av selve avslutningen, men er kilden til alt eux-avslutt-rinasaker vet om sakene.",
    facts: ["Publiserer sakshendelser og dokumenthendelser på hvert sitt topic."],
    arch: "eux-all-rina-events",
    repo: "eux-all-rina-events",
  },
  "topic-case": {
    title: "eux-rina-case-events-v1",
    kind: "Kafka-topic · sakshendelser",
    tone: "meta-purple",
    text: "Første hendelse for en sak oppretter saken med status NY_SAK. Senere hendelser oppdaterer bare endretTidspunkt – statusen endres ikke.",
    facts: [
      "BUC-typen hentes fra processDefinitionName.",
      "Rollen hentes fra applicationRoleId: PO = sakseier, CP = motpart. Rollen settes bare når saken opprettes.",
      "Hver sakshendelse utsetter arkiveringen, fordi tellingen går fra endretTidspunkt.",
      "Konsumentgruppe: eux-avslutt-rinasaker-case.",
    ],
    arch: "eux-rina-case-events-v1",
  },
  "topic-doc": {
    title: "eux-rina-document-events-v1",
    kind: "Kafka-topic · dokumenthendelser",
    tone: "meta-purple",
    text: "SENT_DOCUMENT og RECEIVE_DOCUMENT lagres som sendt eller mottatt SED. Andre dokumenthendelser ignoreres.",
    facts: [
      "En sak med status UVIRKSOM settes tilbake til NY_SAK når det kommer en ny SED.",
      "Sakens endretTidspunkt oppdateres bare når hendelsen vekker en uvirksom sak.",
      "Konsumentgruppe: eux-avslutt-rinasaker-document.",
    ],
    arch: "eux-rina-document-events-v1",
  },
  app: {
    title: "eux-avslutt-rinasaker",
    kind: "Kotlin · Spring Boot",
    tone: "accent",
    text: "Holder oversikt over hver RINA-sak og flytter den gjennom statusene. Lagrer bare metadata – BUC-type, rolle, SED-type, retning og tidspunkt – aldri innholdet i SED-ene.",
    facts: [
      "PostgreSQL i Cloud SQL med tabellene rinasak og dokument.",
      "Lagrer alle BUC-typer, men behandler bare de 16 som har regler.",
      "POST /api/v1/prosesser/{prosess}/execute kjører en prosess synkront og svarer 204.",
    ],
    arch: "eux-avslutt-rinasaker",
    repo: "eux-avslutt-rinasaker",
  },
  naisjob: {
    title: "eux-avslutt-rinasaker-naisjob",
    kind: "NAIS-jobber",
    tone: "warning",
    text: "Ett image og sju CronJobs. Hver jobb gjør ett POST-kall til eux-avslutt-rinasaker og avslutter.",
    facts: [
      "Kallet sendes uten token.",
      "Feiler kallet, logges bare en advarsel. Ingen automatisk omkjøring.",
      "Tidssone Europe/Oslo.",
    ],
    arch: "eux-avslutt-rinasaker-naisjob",
    repo: "eux-avslutt-rinasaker-naisjob",
  },
  terminator: {
    title: "eux-rina-terminator-api",
    kind: "Handlinger i RINA",
    tone: "info",
    text: "Utfører handlingene i RINA på vegne av eux-avslutt-rinasaker. Finnes ikke handlingen på saken, svarer API-et 409.",
    facts: [
      "avsluttLokalt: handlingen «Close case» (LocalClose).",
      "avsluttGlobalt: oppretter X001 og sender den.",
      "arkiver: ArchiveCase.",
      "slettDokumentutkast: sletter X001-utkastet.",
    ],
    arch: "eux-rina-terminator-api",
    repo: "eux-rina-terminator-api",
  },
  slack: {
    title: "Slack",
    kind: "Varsling",
    tone: "success",
    text: "Månedsrapporten sendes via en innkommende webhook. Webhook-adressen ligger i en NAIS-hemmelighet.",
    facts: ["Bare prod har en rapportjobb som faktisk kjører."],
    arch: "slack",
  },
};

export function SystemFlow() {
  const flow = useJobFlow();
  const { nodeProps, edges } = flow;

  return (
    <div>
      <FlowToolbar label="Vis flyt" value={flow.flow} onChange={flow.setFlow} options={FLOWS} />

      <JobFlowCanvas label="Systemene rundt automatisk avslutning" flow={flow} edges={EDGES}>
        <RinaSystem nodeProps={nodeProps} />
        <KafkaIntake nodeProps={nodeProps} />
        <ServiceBox nodeProps={nodeProps} name="eux-avslutt-rinasaker" listeners={["leggTilRinasak", "leggTilDokument"]} tables="rinasak · dokument" />

        <JobsBox nodeProps={nodeProps} name="eux-avslutt-rinasaker-naisjob">
          {JOB_ROWS.map((j) => {
            const on = edges.on(jobFlows(j.no));
            return (
              <g key={j.no} opacity={on ? 1 : 0.35} style={{ transition: "opacity 220ms ease" }}>
                <rect x={1000} y={j.cy - 10.5} width={130} height={21} rx={6} fill="var(--ax-bg-default)" fillOpacity={0.8} />
                <circle cx={1012} cy={j.cy} r={7.5} fill={TONE.warning.strong} />
                <text x={1012} y={j.cy + 3.5} textAnchor="middle" fontSize={9.5} fontWeight={800} fill="var(--ax-text-warning-contrast)">
                  {j.no}
                </text>
                <text x={1025} y={j.cy + 3.8} fontSize={10.5} className="arch-mono" fill="var(--ax-text-neutral)">
                  {j.name}
                </text>
              </g>
            );
          })}
        </JobsBox>

        <TerminatorBox nodeProps={nodeProps}>
          {CALLS.map((c) => (
            <g key={c.t}>
              <rect x={c.x} y={c.y} width={119} height={21} rx={6} fill="var(--ax-bg-default)" stroke={TONE.info.stroke} strokeOpacity={0.5} />
              <text x={c.x + 59.5} y={c.y + 14} textAnchor="middle" fontSize={9.5} className="arch-mono" fill="var(--ax-text-neutral)">
                {c.t}
              </text>
            </g>
          ))}
        </TerminatorBox>

        <SlackBox nodeProps={nodeProps} />

        <Packets key={flow.flow} packets={PACKETS[flow.flow]} />
      </JobFlowCanvas>

      <NodeDetail info={flow.selected ? INFO[flow.selected] : null} onClose={flow.clear} />
    </div>
  );
}
