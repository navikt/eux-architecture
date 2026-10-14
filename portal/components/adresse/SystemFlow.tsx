"use client";

import { useState, type SVGProps } from "react";
import NextLink from "next/link";
import { BodyLong, BodyShort, Button, Detail, Heading, HStack, Link as DsLink, ToggleGroup } from "@navikt/ds-react";
import { ArrowRightIcon, ExternalLinkIcon, XMarkIcon } from "@navikt/aksel-icons";
import { useReducedMotion } from "@/components/architecture/hooks";
import { onActivate, rounded } from "@/components/architecture/svg";
import { TONE, archHref, ghHref } from "@/components/avslutning/tones";
import { CONSUMER_GROUP, ENVS, type Tone } from "./data";

const W = 1060;
const H = 470;

type Mode = "vanlig" | "feil";
type NodeId = "rina" | "events" | "topic" | "app" | "rinaapi" | "pdlapi" | "pdlmottak" | "retry" | "dlt";

const APP_X = 330;
const APP_W = 300;
const D_X = 790;
const D_W = 230;

/* Stegene inne i appen. cy er felles med kantene ut til tjenestene. */
const PIPE: { no: number; t: string; sub: string; cy: number; to?: NodeId }[] = [
  { no: 1, t: "Kafka-lytter", sub: "retning, sektor, unntak", cy: 112 },
  { no: 2, t: "Hent SED og sak", sub: "to kall", cy: 162, to: "rinaapi" },
  { no: 3, t: "Finn ident", sub: "norsk PIN eller fnr fra saken", cy: 212 },
  { no: 4, t: "Plukk og vask", sub: "per person og adresse", cy: 262 },
  { no: 5, t: "Sjekk mot PDL", sub: "for hver adresse", cy: 312, to: "pdlapi" },
  { no: 6, t: "Send og verifiser", sub: "endringsmelding", cy: 362, to: "pdlmottak" },
];
const cyOf = (to: NodeId) => PIPE.find((p) => p.to === to)!.cy;

const TOPIC_CY = 252;
const RETRY_CY = 352;
const DLT_CY = 418;

const P_TOPIC = rounded([[230, TOPIC_CY], [280, TOPIC_CY], [280, 112], [APP_X + 14, 112]], 10);
const P_CPI = rounded([[D_X + D_W / 2, cyOf("rinaapi") - 17], [D_X + D_W / 2, 16], [70, 16], [70, 34]], 12);
const P_RETRY_OUT = rounded([[APP_X + 14, 100], [296, 100], [296, RETRY_CY - 8], [230, RETRY_CY - 8]], 10);
const P_RETRY_IN = rounded([[230, RETRY_CY + 8], [312, RETRY_CY + 8], [312, 124], [APP_X + 14, 124]], 10);
const P_DLT = `M 130 ${RETRY_CY + 15} L 130 ${DLT_CY - 15}`;

const EDGES: { id: string; d: string; mode: Mode | "begge"; dashed?: boolean }[] = [
  { id: "nie", d: "M 130 122 L 130 158", mode: "vanlig" },
  { id: "pub", d: `M 130 204 L 130 ${TOPIC_CY - 15}`, mode: "vanlig" },
  { id: "topic", d: P_TOPIC, mode: "begge" },
  ...PIPE.filter((p) => p.to).map((p) => ({ id: `to-${p.to}`, d: `M ${APP_X + APP_W} ${p.cy} L ${D_X} ${p.cy}`, mode: "vanlig" as const })),
  { id: "cpi", d: P_CPI, mode: "vanlig", dashed: true },
  { id: "retry-out", d: P_RETRY_OUT, mode: "feil" },
  { id: "retry-in", d: P_RETRY_IN, mode: "feil" },
  { id: "dlt", d: P_DLT, mode: "feil" },
];

const EDGE_LABELS: { edge: string; x: number; y: number; text: string; mono?: boolean }[] = [
  { edge: "cpi", x: 470, y: 11, text: "CPI-kall via eux-rina-api" },
  { edge: "nie", x: 140, y: 144, text: "NIE" },
  { edge: `to-rinaapi`, x: (APP_X + APP_W + D_X) / 2, y: cyOf("rinaapi") - 7, text: "GET sed · GET oversikt", mono: true },
  { edge: `to-pdlapi`, x: (APP_X + APP_W + D_X) / 2, y: cyOf("pdlapi") - 7, text: "hentPerson", mono: true },
  { edge: `to-pdlmottak`, x: (APP_X + APP_W + D_X) / 2, y: cyOf("pdlmottak") - 7, text: "POST · GET status", mono: true },
  { edge: "retry-out", x: 238, y: RETRY_CY - 15, text: "feil", mono: false },
  { edge: "retry-in", x: 238, y: RETRY_CY + 25, text: "etter 15 s", mono: false },
  { edge: "dlt", x: 140, y: (RETRY_CY + DLT_CY) / 2 + 4, text: "etter 3 forsøk" },
];

const PACKETS: Record<Mode, { d: string; dur: number; begin?: number }[]> = {
  vanlig: [
    { d: "M 130 122 L 130 158", dur: 0.9 },
    { d: `M 130 204 L 130 ${TOPIC_CY - 15}`, dur: 0.9, begin: -0.4 },
    { d: P_TOPIC, dur: 2.2, begin: -0.8 },
    ...PIPE.filter((p) => p.to).map((p, i) => ({ d: `M ${APP_X + APP_W} ${p.cy} L ${D_X} ${p.cy}`, dur: 1.5, begin: -i * 0.45 })),
    { d: P_CPI, dur: 3.4, begin: -1.2 },
  ],
  feil: [
    { d: P_RETRY_OUT, dur: 2.2 },
    { d: P_RETRY_IN, dur: 2.2, begin: -1.1 },
    { d: P_DLT, dur: 1.3, begin: -0.6 },
  ],
};

const MODE_NODES: Record<Mode, NodeId[]> = {
  vanlig: ["rina", "events", "topic", "app", "rinaapi", "pdlapi", "pdlmottak"],
  feil: ["topic", "app", "retry", "dlt"],
};

const MODES: { id: Mode; label: string; text: string }[] = [
  {
    id: "vanlig",
    label: "Vanlig vei",
    text: "RINA varsler om en ny SED. Hendelsen går via Kafka til appen, som henter SED-en og saken, slår opp personen i PDL og sender endringsmeldingen til PDL-mottak.",
  },
  {
    id: "feil",
    label: "Når SED-en feiler",
    text: "Kaster behandlingen en feil, legges meldingen på en retry-topic og prøves igjen etter 15 sekunder. Etter tre forsøk havner den på DLT, og appen logger en feil.",
  },
];

const prod = ENVS.find((e) => e.env === "prod")!;
const q2 = ENVS.find((e) => e.env === "q2")!;

const INFO: Record<NodeId, { title: string; kind: string; tone: Tone; text: string; facts: string[]; arch?: string; repo?: string }> = {
  rina: {
    title: "RINA",
    kind: "Saksbehandlingssystem for EESSI",
    tone: "info",
    text: "SED-ene sendes og mottas i RINA. Når noe skjer med et dokument, varsler RINA eux-all-rina-events med en NIE-hendelse.",
    facts: [
      "eux-adresse-oppdatering snakker aldri direkte med RINA.",
      "SED-en og saksoversikten hentes via eux-rina-api, som bruker CPI.",
    ],
    arch: "rina",
  },
  events: {
    title: "eux-all-rina-events",
    kind: "Hendelser",
    tone: "meta-purple",
    text: "Tar imot NIE-hendelser fra RINA og publiserer dem på Kafka. Dokumenthendelser havner på eux-rina-document-events-v1.",
    facts: ["Endepunkt: POST /events/v1/{eventType}.", "Retry- og DLT-topicene til adresseoppdateringen er definert i dette repoet."],
    arch: "eux-all-rina-events",
    repo: "eux-all-rina-events",
  },
  topic: {
    title: prod.topic,
    kind: "Kafka-topic",
    tone: "meta-purple",
    text: "Én melding per dokumenthendelse, med metadata om SED-en: id, type, saksnummer og retning.",
    facts: [
      `Q2: ${q2.topic}.`,
      `Consumer group ${CONSUMER_GROUP}, som er id-en til lytteren.`,
      "Manuell commit: meldingen kvitteres først når hele SED-en er ferdig.",
    ],
    arch: "eux-rina-document-events-v1",
  },
  app: {
    title: "eux-adresse-oppdatering",
    kind: "Applikasjon",
    tone: "accent",
    text: "Leser dokumenthendelsene, finner adressene i SED-en og sender dem som endringsmeldinger til PDL. Den har ingen database: alt hentes på nytt for hver SED.",
    facts: [
      `Kotlin og Spring Boot, i ${prod.cluster} og ${q2.cluster}. I Q2 heter den ${q2.app}.`,
      "2–3 replikaer, skalerer ved 80 % CPU.",
      "Azure AD-token mot eux-rina-api, pdl-api og PDL-mottak.",
    ],
    arch: "eux-adresse-oppdatering",
    repo: "eux-adresse-oppdatering",
  },
  rinaapi: {
    title: "eux-rina-api",
    kind: "RINA-mellomvare",
    tone: "meta-purple",
    text: "Gir SED-en og en oversikt over RINA-saken.",
    facts: [
      "GET /cpi/buc/{rinasakId}/sed/{sedId}?domene=nav gir SED-en.",
      "GET /v3/buc/{rinasakId}/oversikt?domene=nav gir fnr, navn, fødselsdato, sakType og motparter.",
      "Navnet på første motpart blir kilde i endringsmeldingen.",
      "Begge kallene prøves opptil 9 ganger til, med 1 s ventetid som dobles.",
    ],
    arch: "eux-rina-api",
    repo: "eux-rina-api",
  },
  pdlapi: {
    title: "pdl-api",
    kind: "PDL · GraphQL",
    tone: "success",
    text: "Gir adressene personen har i dag og om personen er død. Spørres én gang per adresse.",
    facts: [
      "Spørringen hentPerson henter adressebeskyttelse, bosteds-, opphold- og kontaktadresse og dødsfall.",
      "Headeren Behandlingsnummer settes ut fra sektoren i sakType.",
      "Prøves opptil 9 ganger til, med 1 s ventetid som dobles. Ugyldig ident prøves ikke på nytt.",
    ],
    arch: "pdl",
  },
  pdlmottak: {
    title: "PDL-mottak",
    kind: "PDL · endringer",
    tone: "success",
    text: "Tar imot endringsmeldingen og gir tilbake en Location-header som peker på statusen.",
    facts: [
      "POST /api/v1/endringer, med endringstype OPPRETT.",
      "Statusen hentes hvert sekund, opptil 60 ganger, til den er DONE. ERROR logges bare.",
      "5xx og 404 prøves opptil 9 ganger til. 409 og 422 betyr at PDL ikke godtok endringen, og adressen hoppes over.",
    ],
    arch: "pdl-mottak",
  },
  retry: {
    title: `${prod.topic}-retry`,
    kind: "Retry-topic",
    tone: "warning",
    text: "Feiler behandlingen av en SED, legges meldingen her og leses på nytt etter 15 sekunder. Hele SED-en behandles fra start.",
    facts: ["@RetryableTopic med attempts = 3: ett vanlig forsøk og to nye.", "Lytteren kvitterer ikke en melding som feiler."],
    repo: "eux-all-rina-events",
  },
  dlt: {
    title: `${prod.topic}-dlt`,
    kind: "Dead letter topic",
    tone: "danger",
    text: "Her havner SED-er som har feilet tre ganger. Appen logger en feil og gjør ikke mer.",
    facts: ["Loggmeldingen er «Dokumentet har feilet 3 ganger, sendes til DLT».", "Ingen automatikk tar den opp igjen."],
    repo: "eux-all-rina-events",
  },
};

export function SystemFlow() {
  const [mode, setMode] = useState<Mode>("vanlig");
  const [selected, setSelected] = useState<NodeId | null>(null);
  const reduced = useReducedMotion();

  const nodeState = (id: NodeId) => {
    const cls = [];
    if (selected === id) cls.push("is-active");
    if (!MODE_NODES[mode].includes(id)) cls.push("is-dim");
    return cls.join(" ");
  };
  const edgeState = (m: Mode | "begge") => (m === "begge" || m === mode ? "is-lit" : "is-dim");
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

  const current = MODES.find((m) => m.id === mode)!;
  const info = selected ? INFO[selected] : null;
  const t = TONE.accent;

  return (
    <div className="avs-sys adr-sys">
      <div className="avs-toolbar">
        <ToggleGroup size="small" value={mode} onChange={(v) => setMode(v as Mode)} label="Vis">
          {MODES.map((m) => (
            <ToggleGroup.Item key={m.id} value={m.id} label={m.label} />
          ))}
        </ToggleGroup>
        <BodyShort key={mode} size="small" className="avs-toolbar__text" aria-live="polite">
          {current.text}
        </BodyShort>
      </div>

      <div className="portal-diagram avs-surface">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", minWidth: 860, height: "auto", display: "block" }}
          role="group"
          aria-label="Systemene rundt adresseoppdateringen"
        >
          <defs>
            <marker id="adr-sys-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="var(--ax-border-neutral-strong)" />
            </marker>
          </defs>

          {/* Kafka-sone */}
          <g className="arch-rf__group">
            <rect
              x={18}
              y={TOPIC_CY - 34}
              width={224}
              height={DLT_CY - TOPIC_CY + 56}
              rx={14}
              fill="var(--ax-bg-meta-purple-soft)"
              fillOpacity={0.4}
              stroke="var(--ax-border-meta-purple)"
              strokeOpacity={0.5}
              strokeDasharray="5 5"
            />
            <text x={30} y={TOPIC_CY - 20} fontSize={10} className="arch-eyebrow-svg" fill="var(--ax-text-meta-purple)">
              KAFKA · eessibasis
            </text>
          </g>

          {/* PDL-sone */}
          <g className="arch-rf__group">
            <rect
              x={D_X - 12}
              y={cyOf("pdlapi") - 46}
              width={D_W + 24}
              height={cyOf("pdlmottak") - cyOf("pdlapi") + 80}
              rx={14}
              fill="var(--ax-bg-success-soft)"
              fillOpacity={0.35}
              stroke="var(--ax-border-success)"
              strokeOpacity={0.5}
              strokeDasharray="5 5"
            />
            <text x={D_X} y={cyOf("pdlapi") - 31} fontSize={10} className="arch-eyebrow-svg" fill="var(--ax-text-success)">
              PDL
            </text>
          </g>

          {/* Kanter */}
          {EDGES.map((e) => (
            <g key={e.id} className={`arch-rf__edge ${edgeState(e.mode)}`}>
              <path
                d={e.d}
                stroke="var(--ax-border-neutral-strong)"
                strokeOpacity={0.75}
                strokeWidth={1.6}
                strokeDasharray={e.dashed ? "5 4" : undefined}
                fill="none"
                markerEnd="url(#adr-sys-arrow)"
              />
              <path
                d={e.d}
                stroke={e.mode === "feil" ? "var(--ax-border-warning)" : "var(--ax-border-accent)"}
                strokeWidth={2.6}
                fill="none"
                className="arch-flow arch-flow--slow"
              />
            </g>
          ))}
          {EDGE_LABELS.map((l) => {
            const e = EDGES.find((x) => x.id === l.edge)!;
            return (
              <text
                key={l.edge}
                x={l.x}
                y={l.y}
                textAnchor={l.edge === "nie" || l.edge === "dlt" || l.edge.startsWith("retry") ? "start" : "middle"}
                fontSize={l.mono ? 10 : 10.5}
                fontWeight={600}
                className={`arch-halo arch-rf__edge ${edgeState(e.mode)} ${l.mono ? "arch-mono" : ""}`}
                fill="var(--ax-text-neutral-subtle)"
              >
                {l.text}
              </text>
            );
          })}

          {!reduced &&
            PACKETS[mode].map((p, i) => (
              <circle
                key={`${mode}-${i}`}
                r={5}
                fill={mode === "feil" ? "var(--ax-bg-warning-strong)" : "var(--ax-bg-accent-strong)"}
                className="arch-packet"
              >
                <animateMotion dur={`${p.dur}s`} begin={`${p.begin ?? 0}s`} repeatCount="indefinite" path={p.d} />
              </circle>
            ))}

          {/* RINA */}
          <g {...nodeProps("rina", "RINA")}>
            <rect x={30} y={34} width={200} height={88} rx={14} fill={TONE.info.fill} stroke={TONE.info.stroke} strokeWidth={1.5} className="arch-box" />
            <text x={130} y={68} textAnchor="middle" fontSize={17} fontWeight={800} fill="var(--ax-text-neutral)">
              RINA
            </text>
            <text x={130} y={86} textAnchor="middle" fontSize={10.5} fill="var(--ax-text-neutral-subtle)">
              SED fra et annet land
            </text>
            <Envelope x={186} y={44} />
          </g>

          <Box x={30} y={158} w={200} h={46} title="eux-all-rina-events" sub="NIE → Kafka" tone="meta-purple" props={nodeProps("events", "eux-all-rina-events")} />

          <Topic cy={TOPIC_CY} name="document-events-v1" tone="meta-purple" props={nodeProps("topic", prod.topic)} />
          <Topic cy={RETRY_CY} name="…-v1-retry" tone="warning" props={nodeProps("retry", "Retry-topic")} />
          <Topic cy={DLT_CY} name="…-v1-dlt" tone="danger" props={nodeProps("dlt", "DLT")} />

          {/* eux-adresse-oppdatering */}
          <g {...nodeProps("app", "eux-adresse-oppdatering")}>
            <rect x={APP_X} y={34} width={APP_W} height={360} rx={16} fill={t.fill} stroke={t.stroke} strokeWidth={1.8} className="arch-box" />
            <rect x={APP_X} y={34} width={APP_W} height={360} rx={16} fill="none" stroke={t.stroke} className="arch-pulse" />
            <text x={APP_X + APP_W / 2} y={58} textAnchor="middle" fontSize={13.5} fontWeight={800} fill="var(--ax-text-neutral)">
              eux-adresse-oppdatering
            </text>
            <text x={APP_X + APP_W / 2} y={75} textAnchor="middle" fontSize={10.5} fill="var(--ax-text-neutral-subtle)">
              Kotlin · ingen database
            </text>
            <line x1={APP_X + 28} y1={112} x2={APP_X + 28} y2={362} stroke={t.stroke} strokeOpacity={0.45} strokeWidth={2} strokeDasharray="2 4" />
            {PIPE.map((p) => {
              const lit = mode === "vanlig" || p.no === 1;
              return (
                <g key={p.no} opacity={lit ? 1 : 0.35} style={{ transition: "opacity 220ms ease" }}>
                  <rect x={APP_X + 14} y={p.cy - 17} width={APP_W - 28} height={34} rx={9} fill="var(--ax-bg-default)" stroke={t.stroke} strokeOpacity={0.45} />
                  <circle cx={APP_X + 28} cy={p.cy} r={9} fill={TONE.accent.strong} />
                  <text x={APP_X + 28} y={p.cy + 3.6} textAnchor="middle" fontSize={10} fontWeight={800} fill="var(--ax-text-accent-contrast)">
                    {p.no}
                  </text>
                  <text x={APP_X + 46} y={p.cy - 1} fontSize={11.5} fontWeight={700} fill="var(--ax-text-neutral)">
                    {p.t}
                  </text>
                  <text x={APP_X + 46} y={p.cy + 11} fontSize={9.5} fill="var(--ax-text-neutral-subtle)">
                    {p.sub}
                  </text>
                </g>
              );
            })}
          </g>

          <Box
            x={D_X}
            y={cyOf("rinaapi") - 23}
            w={D_W}
            h={46}
            title="eux-rina-api"
            sub="SED og saksoversikt"
            tone="meta-purple"
            props={nodeProps("rinaapi", "eux-rina-api")}
          />
          <Box x={D_X} y={cyOf("pdlapi") - 23} w={D_W} h={46} title="pdl-api" sub="adresser og dødsfall" tone="success" props={nodeProps("pdlapi", "pdl-api")} />
          <Box
            x={D_X}
            y={cyOf("pdlmottak") - 23}
            w={D_W}
            h={46}
            title="PDL-mottak"
            sub="endringsmeldinger"
            tone="success"
            props={nodeProps("pdlmottak", "PDL-mottak")}
          />
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

function Box({ x, y, w, h, title, sub, tone, props }: { x: number; y: number; w: number; h: number; title: string; sub: string; tone: Tone; props: SVGProps<SVGGElement> }) {
  const t = TONE[tone];
  return (
    <g {...props}>
      <rect x={x} y={y} width={w} height={h} rx={11} fill={t.fill} stroke={t.stroke} strokeWidth={1.5} className="arch-box" />
      <text x={x + w / 2} y={y + 20} textAnchor="middle" fontSize={12.5} fontWeight={700} fill="var(--ax-text-neutral)">
        {title}
      </text>
      <text x={x + w / 2} y={y + 35} textAnchor="middle" fontSize={10} fill="var(--ax-text-neutral-subtle)">
        {sub}
      </text>
    </g>
  );
}

function Topic({ cy, name, tone, props }: { cy: number; name: string; tone: Tone; props: SVGProps<SVGGElement> }) {
  const t = TONE[tone];
  return (
    <g {...props}>
      <rect x={30} y={cy - 15} width={200} height={30} rx={15} fill="var(--ax-bg-default)" stroke={t.stroke} strokeWidth={1.5} className="arch-box" />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={42 + i * 6} y={cy - 7} width={3.5} height={14} rx={1.5} fill={t.stroke} opacity={0.35 + i * 0.2} />
      ))}
      <text x={72} y={cy + 4} fontSize={10.8} className="arch-mono" fill="var(--ax-text-neutral)">
        {name}
      </text>
    </g>
  );
}

function Envelope({ x, y }: { x: number; y: number }) {
  return (
    <g aria-hidden opacity={0.8}>
      <rect x={x} y={y} width={28} height={20} rx={3} fill="var(--ax-bg-default)" stroke={TONE.info.stroke} strokeWidth={1.2} />
      <path d={`M ${x + 1} ${y + 2} L ${x + 14} ${y + 12} L ${x + 27} ${y + 2}`} fill="none" stroke={TONE.info.stroke} strokeWidth={1.2} />
    </g>
  );
}
