"use client";

import { useState } from "react";
import NextLink from "next/link";
import { BodyLong, BodyShort, Button, Detail, Heading, HStack, Link as DsLink, ToggleGroup } from "@navikt/ds-react";
import { ArrowRightIcon, ExternalLinkIcon, XMarkIcon } from "@navikt/aksel-icons";
import { useReducedMotion } from "@/components/architecture/hooks";
import { onActivate, rounded } from "@/components/architecture/svg";
import { TONE, archHref, ghHref } from "./tones";
import type { Tone } from "./data";

const W = 1140;
const H = 400;

type FlowId = "alle" | "inn" | "jobber" | "rina" | "rapport";
type NodeId = "rina" | "events" | "topic-case" | "topic-doc" | "avslutt" | "naisjob" | "terminator" | "slack";

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

const jobFlows = (no: number): FlowId[] => {
  const f: FlowId[] = ["jobber"];
  if (no === 3 || no === 5 || no === 6) f.push("rina");
  if (no === 7) f.push("rapport");
  return f;
};

const EDGES: { id: string; d: string; flows: FlowId[] }[] = [
  { id: "nie", d: "M 150 130 L 200 130", flows: ["inn"] },
  { id: "f-case", d: rounded([[380, 130], [410, 130], [410, 100], [446, 100]], 8), flows: ["inn"] },
  { id: "f-doc", d: rounded([[380, 130], [410, 130], [410, 160], [446, 160]], 8), flows: ["inn"] },
  { id: "case-in", d: "M 684 100 L 752 100", flows: ["inn"] },
  { id: "doc-in", d: "M 684 160 L 752 160", flows: ["inn"] },
  ...JOB_ROWS.map((j) => ({ id: `job-${j.no}`, d: `M 990 ${j.cy} L 930 ${j.cy}`, flows: jobFlows(j.no) })),
  { id: "term", d: rounded([[790, 270], [790, 345], [690, 345]], 12), flows: ["rina"] },
  { id: "cpi", d: "M 420 345 L 150 345", flows: ["rina"] },
  { id: "slack", d: rounded([[900, 270], [900, 345], [990, 345]], 12), flows: ["rapport"] },
];

const EDGE_LABELS: { edge: string; x: number; y: number; text: string; mono?: boolean }[] = [
  { edge: "nie", x: 175, y: 121, text: "HTTP" },
  { edge: "case-in", x: 718, y: 91, text: "sak" },
  { edge: "doc-in", x: 718, y: 151, text: "SED" },
  { edge: "term", x: 740, y: 336, text: "Azure AD" },
  { edge: "cpi", x: 285, y: 336, text: "tjenestebruker + CAS" },
  { edge: "slack", x: 945, y: 336, text: "webhook" },
];

const PACKETS: Record<FlowId, { d: string; dur: number; begin?: number }[]> = {
  alle: [],
  inn: [
    { d: rounded([[150, 130], [410, 130], [410, 100], [752, 100]], 8), dur: 2.8 },
    { d: rounded([[150, 130], [410, 130], [410, 160], [752, 160]], 8), dur: 2.8, begin: -1.4 },
  ],
  jobber: JOB_ROWS.map((j, i) => ({ d: `M 990 ${j.cy} L 930 ${j.cy}`, dur: 1.4, begin: -i * 0.2 })),
  rina: [
    ...[3, 5, 6].map((no, i) => ({ d: `M 990 ${rowY(no)} L 930 ${rowY(no)}`, dur: 1.4, begin: -i * 0.3 })),
    { d: rounded([[790, 270], [790, 345], [150, 345]], 12), dur: 3 },
  ],
  rapport: [
    { d: `M 990 ${rowY(7)} L 930 ${rowY(7)}`, dur: 1.4 },
    { d: rounded([[900, 270], [900, 345], [990, 345]], 12), dur: 1.8 },
  ],
};

const FLOW_NODES: Record<FlowId, NodeId[] | null> = {
  alle: null,
  inn: ["rina", "events", "topic-case", "topic-doc", "avslutt"],
  jobber: ["naisjob", "avslutt"],
  rina: ["naisjob", "avslutt", "terminator", "rina"],
  rapport: ["naisjob", "avslutt", "slack"],
};

const FLOWS: { id: FlowId; label: string; text: string }[] = [
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

type NodeInfo = {
  title: string;
  kind: string;
  tone: Tone;
  text: string;
  facts: string[];
  arch?: string;
  repo?: string;
};

const INFO: Record<NodeId, NodeInfo> = {
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
  avslutt: {
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
  const [flow, setFlow] = useState<FlowId>("alle");
  const [selected, setSelected] = useState<NodeId | null>(null);
  const reduced = useReducedMotion();

  const litNodes = FLOW_NODES[flow];
  const nodeState = (id: NodeId) => {
    const cls = [];
    if (selected === id) cls.push("is-active");
    if (litNodes && !litNodes.includes(id)) cls.push("is-dim");
    return cls.join(" ");
  };
  const edgeOn = (flows: FlowId[]) => flow === "alle" || flows.includes(flow);
  const edgeState = (flows: FlowId[]) => (flow === "alle" ? "" : edgeOn(flows) ? "is-lit" : "is-dim");

  const toggle = (id: NodeId) => setSelected((s) => (s === id ? null : id));
  const nodeProps = (id: NodeId, label: string) => ({
    className: `arch-node ${nodeState(id)}`,
    role: "button" as const,
    tabIndex: 0,
    "aria-pressed": selected === id,
    "aria-label": `${label}: vis detaljer`,
    onClick: () => toggle(id),
    onKeyDown: onActivate(() => toggle(id)),
  });

  const current = FLOWS.find((f) => f.id === flow)!;
  const info = selected ? INFO[selected] : null;

  return (
    <div className="avs-sys">
      <div className="avs-toolbar">
        <ToggleGroup size="small" value={flow} onChange={(v) => setFlow(v as FlowId)} label="Vis flyt">
          {FLOWS.map((f) => (
            <ToggleGroup.Item key={f.id} value={f.id} label={f.label} />
          ))}
        </ToggleGroup>
        <BodyShort size="small" className="avs-toolbar__text" aria-live="polite">
          {current.text}
        </BodyShort>
      </div>

      <div className="portal-diagram avs-surface">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", minWidth: 760, height: "auto", display: "block" }}
          role="group"
          aria-label="Systemene rundt automatisk avslutning"
        >
          <defs>
            <marker id="avs-sys-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="var(--ax-border-neutral-strong)" />
            </marker>
          </defs>

          {/* Kafka-sone */}
          <g className={`arch-rf__group ${flow !== "alle" && flow !== "inn" ? "is-dim" : ""}`}>
            <rect x={430} y={60} width={270} height={140} rx={14} fill="var(--ax-bg-meta-purple-soft)" fillOpacity={0.45} stroke="var(--ax-border-meta-purple)" strokeOpacity={0.5} strokeDasharray="5 5" />
            <text x={444} y={77} fontSize={10} className="arch-eyebrow-svg" fill="var(--ax-text-meta-purple)">
              KAFKA
            </text>
          </g>

          {/* Kanter */}
          {EDGES.map((e) => (
            <g key={e.id} className={`arch-rf__edge ${edgeState(e.flows)}`}>
              <path d={e.d} stroke="var(--ax-border-neutral-strong)" strokeOpacity={0.75} strokeWidth={1.6} fill="none" markerEnd="url(#avs-sys-arrow)" />
              <path d={e.d} stroke="var(--ax-border-accent)" strokeWidth={2.6} fill="none" className="arch-flow arch-flow--slow" />
            </g>
          ))}
          {EDGE_LABELS.map((l) => {
            const e = EDGES.find((x) => x.id === l.edge)!;
            return (
              <text
                key={l.edge}
                x={l.x}
                y={l.y}
                textAnchor="middle"
                fontSize={10.5}
                fontWeight={600}
                className={`arch-halo arch-rf__edge ${edgeState(e.flows)}`}
                fill="var(--ax-text-neutral-subtle)"
              >
                {l.text}
              </text>
            );
          })}

          {/* RINA */}
          <g {...nodeProps("rina", "RINA")}>
            <rect x={0} y={30} width={150} height={360} rx={16} fill={TONE.info.fill} stroke={TONE.info.stroke} strokeWidth={1.5} className="arch-box" />
            <text x={75} y={60} textAnchor="middle" fontSize={17} fontWeight={800} fill="var(--ax-text-neutral)">
              RINA
            </text>
            <text x={75} y={77} textAnchor="middle" fontSize={10.5} fill="var(--ax-text-neutral-subtle)">
              saker og SED-er
            </text>
            {[0, 1, 2].map((i) => (
              <g key={i} opacity={1 - i * 0.22}>
                <rect x={20} y={176 + i * 38} width={110} height={28} rx={7} fill="var(--ax-bg-default)" stroke={TONE.info.stroke} strokeOpacity={0.5} />
                <circle cx={33} cy={190 + i * 38} r={4} fill={TONE.info.stroke} />
                <rect x={43} y={185 + i * 38} width={60 - i * 12} height={4} rx={2} fill="var(--ax-border-neutral-subtle)" />
                <rect x={43} y={193 + i * 38} width={38 + i * 8} height={3} rx={1.5} fill="var(--ax-border-neutral-subtle)" />
              </g>
            ))}
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
          <Topic cy={100} name="eux-rina-case-events-v1" props={nodeProps("topic-case", "eux-rina-case-events-v1")} />
          <Topic cy={160} name="eux-rina-document-events-v1" props={nodeProps("topic-doc", "eux-rina-document-events-v1")} />

          {/* eux-avslutt-rinasaker */}
          <g {...nodeProps("avslutt", "eux-avslutt-rinasaker")}>
            <rect x={740} y={30} width={200} height={240} rx={16} fill={TONE.accent.fill} stroke={TONE.accent.stroke} strokeWidth={1.8} className="arch-box" />
            <rect x={740} y={30} width={200} height={240} rx={16} fill="none" stroke={TONE.accent.stroke} className="arch-pulse" />
            <text x={840} y={55} textAnchor="middle" fontSize={13.5} fontWeight={800} fill="var(--ax-text-neutral)">
              eux-avslutt-rinasaker
            </text>
            <text x={840} y={72} textAnchor="middle" fontSize={10.5} fill="var(--ax-text-neutral-subtle)">
              Kotlin · Spring Boot
            </text>
            {[
              { cy: 100, t: "leggTilRinasak" },
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
            <path d="M 819 172 L 819 192" stroke={TONE.accent.stroke} strokeWidth={1.3} strokeDasharray="3 3" markerEnd="url(#avs-sys-arrow)" />
            {/* Database */}
            <path d="M 762 202 L 762 250 A 58 8 0 0 0 878 250 L 878 202" fill="var(--ax-bg-default)" stroke={TONE.accent.stroke} strokeWidth={1.3} />
            <ellipse cx={820} cy={202} rx={58} ry={8} fill="var(--ax-bg-accent-moderate)" stroke={TONE.accent.stroke} strokeWidth={1.3} />
            <text x={820} y={228} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--ax-text-neutral)">
              PostgreSQL
            </text>
            <text x={820} y={243} textAnchor="middle" fontSize={9.5} className="arch-mono" fill="var(--ax-text-neutral-subtle)">
              rinasak · dokument
            </text>
            {/* REST-API */}
            <rect x={898} y={86} width={30} height={168} rx={8} fill="var(--ax-bg-default)" stroke={TONE.accent.stroke} strokeOpacity={0.55} />
            <text x={913} y={170} textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700} letterSpacing="0.12em" fill="var(--ax-text-accent)" transform="rotate(-90 913 170)">
              REST-API
            </text>
            <path d="M 898 226 L 880 226" stroke={TONE.accent.stroke} strokeWidth={1.3} strokeDasharray="3 3" markerEnd="url(#avs-sys-arrow)" />
          </g>

          {/* NAIS-jobber */}
          <g {...nodeProps("naisjob", "eux-avslutt-rinasaker-naisjob")}>
            <rect x={990} y={30} width={150} height={240} rx={16} fill={TONE.warning.fill} stroke={TONE.warning.stroke} strokeWidth={1.5} className="arch-box" />
            <text x={1065} y={55} textAnchor="middle" fontSize={13.5} fontWeight={800} fill="var(--ax-text-neutral)">
              NAIS-jobber
            </text>
            <text x={1065} y={72} textAnchor="middle" fontSize={10.5} fill="var(--ax-text-neutral-subtle)">
              CronJob · uten token
            </text>
            {JOB_ROWS.map((j) => {
              const on = edgeOn(jobFlows(j.no));
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
          </g>

          {/* eux-rina-terminator-api */}
          <g {...nodeProps("terminator", "eux-rina-terminator-api")}>
            <rect x={420} y={300} width={270} height={90} rx={14} fill={TONE.info.fill} stroke={TONE.info.stroke} strokeWidth={1.5} className="arch-box" />
            <text x={555} y={322} textAnchor="middle" fontSize={13} fontWeight={800} fill="var(--ax-text-neutral)">
              eux-rina-terminator-api
            </text>
            {[
              { x: 432, y: 333, t: "avsluttLokalt" },
              { x: 559, y: 333, t: "avsluttGlobalt" },
              { x: 432, y: 360, t: "arkiver" },
              { x: 559, y: 360, t: "slettDokumentutkast" },
            ].map((c) => (
              <g key={c.t}>
                <rect x={c.x} y={c.y} width={119} height={21} rx={6} fill="var(--ax-bg-default)" stroke={TONE.info.stroke} strokeOpacity={0.5} />
                <text x={c.x + 59.5} y={c.y + 14} textAnchor="middle" fontSize={9.5} className="arch-mono" fill="var(--ax-text-neutral)">
                  {c.t}
                </text>
              </g>
            ))}
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

          {!reduced &&
            PACKETS[flow].map((p, i) => (
              <circle key={`${flow}-${i}`} r={5} fill="var(--ax-bg-accent-strong)" className="arch-packet">
                <animateMotion dur={`${p.dur}s`} begin={`${p.begin ?? 0}s`} repeatCount="indefinite" path={p.d} />
              </circle>
            ))}
        </svg>
      </div>

      {info ? (
        <div className="avs-detail" data-tone={info.tone} aria-live="polite">
          <div className="avs-detail__head">
            <div>
              <Detail className="arch-eyebrow">{info.kind}</Detail>
              <Heading level="3" size="small" className="arch-mono">
                {info.title}
              </Heading>
            </div>
            <Button size="xsmall" variant="tertiary-neutral" icon={<XMarkIcon aria-hidden />} onClick={() => setSelected(null)}>
              Lukk
            </Button>
          </div>
          <BodyLong size="small">{info.text}</BodyLong>
          <ul className="arch-facts">
            {info.facts.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <HStack gap="space-16" wrap>
            {info.arch && (
              <DsLink as={NextLink} href={archHref(info.arch)}>
                Vis i arkitekturkartet <ArrowRightIcon aria-hidden />
              </DsLink>
            )}
            {info.repo && (
              <DsLink href={ghHref(info.repo)} target="_blank" rel="noreferrer">
                navikt/{info.repo} <ExternalLinkIcon aria-hidden />
              </DsLink>
            )}
          </HStack>
        </div>
      ) : (
        <BodyShort size="small" className="avs-hint">
          Velg en boks i figuren for å se hva den gjør.
        </BodyShort>
      )}
    </div>
  );
}

function Port({ x, cy, label }: { x: number; cy: number; label: string }) {
  return (
    <g>
      <rect x={x} y={cy - 11} width={46} height={22} rx={11} fill="var(--ax-bg-info-strong)" />
      <text x={x + 23} y={cy + 4} textAnchor="middle" fontSize={10.5} fontWeight={800} letterSpacing="0.06em" fill="var(--ax-text-info-contrast)">
        {label}
      </text>
    </g>
  );
}

function Topic({
  cy,
  name,
  props,
}: {
  cy: number;
  name: string;
  props: React.SVGProps<SVGGElement>;
}) {
  const t = TONE["meta-purple"];
  return (
    <g {...props}>
      <rect x={446} y={cy - 16} width={238} height={32} rx={16} fill="var(--ax-bg-default)" stroke={t.stroke} strokeWidth={1.5} className="arch-box" />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={458 + i * 6} y={cy - 7} width={3.5} height={14} rx={1.5} fill={t.stroke} opacity={0.35 + i * 0.2} />
      ))}
      <text x={488} y={cy + 4} fontSize={10.8} className="arch-mono" fill="var(--ax-text-neutral)">
        {name}
      </text>
    </g>
  );
}
