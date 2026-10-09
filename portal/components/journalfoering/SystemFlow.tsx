"use client";

import { useState } from "react";
import NextLink from "next/link";
import { BodyLong, BodyShort, Button, Detail, Heading, HStack, Link as DsLink, ToggleGroup } from "@navikt/ds-react";
import { ArrowRightIcon, ExternalLinkIcon, XMarkIcon } from "@navikt/aksel-icons";
import { useReducedMotion } from "@/components/architecture/hooks";
import { onActivate, rounded } from "@/components/architecture/svg";
import { TONE, archHref, ghHref } from "@/components/avslutning/tones";
import type { Tone } from "./data";

const W = 1240;
const H = 630;

type FlowId = "alle" | "inn" | "ut" | "manuelt" | "natten";
type NodeId =
  | "rina"
  | "events"
  | "doctopic"
  | "legacy"
  | "mottatt"
  | "sendt"
  | "neessi"
  | "fagmodul"
  | "rinaapi"
  | "navrinasak"
  | "pdl"
  | "saf"
  | "norg2"
  | "dokarkiv"
  | "oppgave"
  | "slack"
  | "journal"
  | "arkivar"
  | "naisjob";

/* Kolonne D: tjenestene fagmodulen og arkivaren kaller. */
const D_X = 776;
const D_W = 200;
const ROWS: { no: number; id: NodeId; title: string; cy: number; f?: string; a?: string }[] = [
  { no: 1, id: "rinaapi", title: "eux-rina-api", cy: 100, f: "SED · vedlegg · sakseier", a: "motpartens navn" },
  { no: 2, id: "navrinasak", title: "eux-nav-rinasak", cy: 146, f: "rinasak · dokumenter · status", a: "statuser · dokumenter" },
  { no: 3, id: "pdl", title: "PDL", cy: 192, f: "person · adresse · geografi" },
  { no: 4, id: "saf", title: "SAF", cy: 238, f: "fagsak fra journalposter", a: "journalposter" },
  { no: 5, id: "norg2", title: "NORG2", cy: 284, f: "behandlende enhet" },
  { no: 6, id: "dokarkiv", title: "Dokarkiv", cy: 330, f: "journalpost", a: "oppdater journalpost" },
  { no: 7, id: "oppgave", title: "eux-oppgave", cy: 376, f: "oppgave", a: "ferdigstill · BEH_SED" },
  { no: 8, id: "slack", title: "Slack", cy: 422, f: "feilvarsel" },
  { no: 9, id: "journal", title: "eux-journal", cy: 488, a: "ferdigstill · avbryt" },
];
const rowY = (no: number) => ROWS[no - 1].cy;

const F_ROWS: Record<Exclude<FlowId, "alle" | "natten">, number[]> = {
  inn: [1, 2, 3, 4, 5, 6, 7, 8],
  ut: [1, 2, 3, 4, 6, 8],
  manuelt: [1, 2, 4, 6, 7],
};
const A_ROWS = [1, 2, 4, 6, 7, 9];

const fFlows = (no: number): FlowId[] => (["inn", "ut", "manuelt"] as const).filter((f) => F_ROWS[f].includes(no));

const PATH_INN = rounded([[130, 128], [130, 307], [248, 307], [248, 284], [494, 284]], 8);
const PATH_UT = rounded([[130, 128], [130, 307], [248, 307], [248, 330], [494, 330]], 8);
const PATH_CPI = rounded([[876, 83], [876, 18], [61, 18], [61, 40]], 12);

const EDGES: { id: string; d: string; flows: FlowId[]; dashed?: boolean }[] = [
  { id: "p1", d: "M 130 128 L 130 158", flows: ["inn", "ut"] },
  { id: "p2", d: "M 130 204 L 130 230", flows: ["inn", "ut"] },
  { id: "p3", d: "M 130 258 L 130 284", flows: ["inn", "ut"] },
  { id: "legacy-cpi", d: rounded([[30, 307], [14, 307], [14, 62], [30, 62]], 10), flows: ["inn", "ut"], dashed: true },
  { id: "fork-m", d: rounded([[230, 307], [248, 307], [248, 284], [266, 284]], 8), flows: ["inn"] },
  { id: "fork-s", d: rounded([[230, 307], [248, 307], [248, 330], [266, 330]], 8), flows: ["ut"] },
  { id: "m-in", d: "M 448 284 L 494 284", flows: ["inn"] },
  { id: "s-in", d: "M 448 330 L 494 330", flows: ["ut"] },
  ...ROWS.filter((r) => r.f).map((r) => ({ id: `f-${r.no}`, d: `M 706 ${r.cy} L ${D_X} ${r.cy}`, flows: fFlows(r.no) })),
  ...A_ROWS.map((no) => ({ id: `a-${no}`, d: `M 1046 ${rowY(no)} L ${D_X + D_W} ${rowY(no)}`, flows: ["natten"] as FlowId[] })),
  { id: "cpi", d: PATH_CPI, flows: ["inn", "ut", "manuelt", "natten"], dashed: true },
  { id: "ne-f", d: "M 230 450 L 494 450", flows: ["manuelt"] },
  { id: "ne-j", d: `M 230 488 L ${D_X} 488`, flows: ["manuelt"] },
  { id: "nj-a", d: "M 1134 540 L 1134 512", flows: ["natten"] },
];

const EDGE_LABELS: { edge: string; x: number; y: number; text: string; anchor?: "start" | "middle"; mono?: boolean }[] = [
  { edge: "cpi", x: 470, y: 13, text: "CPI-kall via eux-rina-api" },
  { edge: "ne-f", x: 362, y: 441, text: "PUT …/rinasak/{id}/fagsak", mono: true },
  { edge: "ne-j", x: 362, y: 479, text: "POST …/journalposter/feilregistrer", mono: true },
  { edge: "nj-a", x: 1142, y: 530, text: "Azure AD", anchor: "start" },
];

const stagger = (rows: number[], from: number, to: number) =>
  rows.map((no, i) => ({ d: `M ${from} ${rowY(no)} L ${to} ${rowY(no)}`, dur: 1.3, begin: -i * 0.22 }));

const PACKETS: Record<FlowId, { d: string; dur: number; begin?: number }[]> = {
  alle: [],
  inn: [{ d: PATH_INN, dur: 3.2 }, ...stagger(F_ROWS.inn, 706, D_X), { d: PATH_CPI, dur: 3.4, begin: -1.2 }],
  ut: [{ d: PATH_UT, dur: 3.2 }, ...stagger(F_ROWS.ut, 706, D_X), { d: PATH_CPI, dur: 3.4, begin: -1.2 }],
  manuelt: [
    { d: "M 230 450 L 494 450", dur: 1.8 },
    { d: `M 230 488 L ${D_X} 488`, dur: 2.6, begin: -1.1 },
    ...stagger(F_ROWS.manuelt, 706, D_X),
  ],
  natten: [{ d: "M 1134 540 L 1134 512", dur: 0.9 }, ...stagger(A_ROWS, 1046, D_X + D_W), { d: PATH_CPI, dur: 3.4, begin: -0.6 }],
};

const FLOW_NODES: Record<FlowId, NodeId[] | null> = {
  alle: null,
  inn: ["rina", "events", "doctopic", "legacy", "mottatt", "fagmodul", "rinaapi", "navrinasak", "pdl", "saf", "norg2", "dokarkiv", "oppgave", "slack"],
  ut: ["rina", "events", "doctopic", "legacy", "sendt", "fagmodul", "rinaapi", "navrinasak", "pdl", "saf", "dokarkiv", "slack"],
  manuelt: ["rina", "neessi", "fagmodul", "rinaapi", "navrinasak", "saf", "dokarkiv", "oppgave", "journal"],
  natten: ["rina", "naisjob", "arkivar", "rinaapi", "navrinasak", "saf", "dokarkiv", "oppgave", "journal"],
};

const FLOWS: { id: FlowId; label: string; text: string }[] = [
  {
    id: "alle",
    label: "Alt",
    text: "SED-hendelser kommer fra RINA via Kafka. Fagmodulen journalfører, saksbehandler kan rette fra nEESSI, og nattjobbene rydder opp. Velg en flyt for å følge den, eller en boks for detaljer.",
  },
  {
    id: "inn",
    label: "Inngående",
    text: "En mottatt SED går via eux-all-rina-events og eux-legacy-rina-events til sedmottatt-v1. Fagmodulen leser én melding om gangen og bruker alle åtte tjenestene.",
  },
  {
    id: "ut",
    label: "Utgående",
    text: "En sendt SED går samme vei til sedsendt-v1. Fagmodulen finner verken enhet eller lager oppgave – NORG2 og eux-oppgave brukes ikke.",
  },
  {
    id: "manuelt",
    label: "Fra nEESSI",
    text: "Saksbehandler kan journalføre hele RINA-saken på en fagsak (via fagmodulen) eller feilregistrere journalpostene i saken (via eux-journal).",
  },
  {
    id: "natten",
    label: "Natten",
    text: "Kl. 01.00 og 02.00 kaller hver sin CronJob eux-journalarkivar. Arkivaren fullfører midlertidige journalposter og avbryter gamle utgående uten bruker.",
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
    text: "EU-kommisjonens saksbehandlingssystem for EESSI. Sakene og SED-ene ligger her.",
    facts: [
      "NIE: RINA varsler eux-all-rina-events om nye og endrede dokumenter.",
      "CPI: eux-rina-api henter SED-er, vedlegg og saksoversikt for fagmodulen og arkivaren.",
      "eux-legacy-rina-events henter også fra CPI for å fylle ut hendelsene.",
    ],
    arch: "rina",
  },
  events: {
    title: "eux-all-rina-events",
    kind: "RINA → Kafka",
    tone: "meta-purple",
    text: "Tar imot hendelsene fra RINA via NIE og publiserer dokumenthendelsene på eux-rina-document-events-v1.",
    facts: ["Gjør ingen journalføring selv. Er kilden til alle SED-hendelsene lenger ned."],
    arch: "eux-all-rina-events",
    repo: "eux-all-rina-events",
  },
  doctopic: {
    title: "eux-rina-document-events-v1",
    kind: "Kafka-topic · dokumenthendelser",
    tone: "meta-purple",
    text: "Alle dokumenthendelser fra RINA. eux-legacy-rina-events lytter her og lager SED-hendelsene som fagmodulen leser.",
    facts: ["Fagmodulen leser ikke dette topicet direkte."],
    arch: "eux-rina-document-events-v1",
  },
  legacy: {
    title: "eux-legacy-rina-events",
    kind: "Formatbro",
    tone: "meta-purple",
    text: "Gjør dokumenthendelsene om til SED-hendelser i formatet som fagmodulen, eessi-pensjon og melosys-eessi leser. Henter det som mangler fra RINA CPI.",
    facts: [
      "Sektor er BUC-typen fram til første «_», for eksempel FB for FB_BUC_01.",
      "Inngående RECEIVE_DOCUMENT og UPDATE_DOCUMENT går til sedmottatt-v1.",
      "Utgående SENT_DOCUMENT går til sedsendt-v1.",
    ],
    arch: "eux-legacy-rina-events",
    repo: "eux-legacy-rina-events",
  },
  mottatt: {
    title: "eessibasis.sedmottatt-v1",
    kind: "Kafka-topic · inngående SED",
    tone: "meta-purple",
    text: "En melding per mottatt eller oppdatert SED. Leses av fagmodulen, eux-person-oppdatering, eessi-pensjon og melosys-eessi.",
    facts: [
      "Konsumentgruppe: eux-fagmodul-journalfoering.",
      "Én melding om gangen, earliest, read_committed.",
      "I q1 og q2 har topicet endelsen -q1 eller -q2.",
    ],
    arch: "sedmottatt-v1",
  },
  sendt: {
    title: "eessibasis.sedsendt-v1",
    kind: "Kafka-topic · utgående SED",
    tone: "meta-purple",
    text: "En melding per sendt SED. Leses av fagmodulen, eessi-pensjon og melosys-eessi.",
    facts: ["Samme konsumentgruppe og innstillinger som sedmottatt-v1.", "I q1 og q2 har topicet endelsen -q1 eller -q2."],
    arch: "sedsendt-v1",
  },
  neessi: {
    title: "eux-neessi",
    kind: "BFF for nEESSI",
    tone: "success",
    text: "Backend for eux-web-app. Herfra kan saksbehandler journalføre en hel RINA-sak på en fagsak, eller feilregistrere journalpostene i saken.",
    facts: [
      "POST /api/rina/sak/{id}/journalfoer: gjør fnr om til aktørId i PDL og kaller fagmodulen.",
      "POST /api/rina/sak/{id}/feilregistrerjournalposter: kaller eux-journal.",
      "Den eneste appen som har tilgang til fagmodulens REST-API.",
    ],
    arch: "eux-neessi",
    repo: "eux-neessi",
  },
  fagmodul: {
    title: "eux-fagmodul-journalfoering",
    kind: "Java · Spring Boot",
    tone: "accent",
    text: "Journalfører hver SED fra Kafka: finner person, fagsak, tema og enhet, lager journalpost i Dokarkiv og oppgave i Gosys. Har ingen database – statusen lagres i eux-nav-rinasak.",
    facts: [
      "Behandler bare sektorene FB, UB, H, S, M, R, AW og AD – og ikke R_BUC_02.",
      "Én melding om gangen. Feiler en melding, varsles Slack og meldingen hoppes over.",
      "Oppslag prøves på nytt inntil fem ganger, med dobbel ventetid hver gang.",
      "2–4 instanser i prod.",
    ],
    arch: "eux-fagmodul-journalfoering",
    repo: "eux-fagmodul-journalfoering",
  },
  rinaapi: {
    title: "eux-rina-api",
    kind: "Mellomvare mot RINA",
    tone: "neutral",
    text: "Henter SED-er, vedlegg og saksoversikt fra RINA CPI, og markerer saker som sensitive.",
    facts: [
      "Fagmodulen: SED med vedlegg, sakseier (bare UB) og sensitiv sak.",
      "Arkivaren: navnet på motparten når journalposten mangler avsender eller mottaker.",
    ],
    arch: "eux-rina-api",
    repo: "eux-rina-api",
  },
  navrinasak: {
    title: "eux-nav-rinasak",
    kind: "NAVs data om RINA-saker",
    tone: "neutral",
    text: "Holder fagsak, overstyrt enhet, dokumenter og journalstatus for hver RINA-sak.",
    facts: [
      "sed_journalstatus: én rad per SED-versjon (sedId + sedVersjon).",
      "dokument: kobler dokumentInfoId i Joark til sedId, versjon og SED-type.",
      "Fagmodulen oppretter nav-rinasaken hvis den ikke finnes.",
    ],
    arch: "eux-nav-rinasak",
    repo: "eux-nav-rinasak",
  },
  pdl: {
    title: "PDL",
    kind: "Persondata",
    tone: "neutral",
    text: "Gir aktørId, fnr, adressebeskyttelse og geografisk tilknytning.",
    facts: ["Strengt fortrolig adresse (også utland) sender SED-en til 2103 Vikafossen.", "Uten ident spør ikke fagmodulen om geografisk tilknytning."],
    arch: "pdl",
  },
  saf: {
    title: "SAF",
    kind: "Søk i arkivet",
    tone: "neutral",
    text: "Fagmodulen finner fagsaken via journalpostene i saken, og sjekker om noen av dem er journalført. Arkivaren leser status på journalpostene.",
    facts: ["Ny NEESSI-fagsak for UB får nummer ut fra personens eksisterende fagsaker i SAF."],
    arch: "saf",
  },
  norg2: {
    title: "NORG2",
    kind: "Arbeidsfordeling",
    tone: "neutral",
    text: "Velger behandlende enhet ut fra tema, geografisk tilknytning og behandlingstype. Brukes bare for inngående SED-er som ingen fast regel dekker.",
    facts: ["Kalles uten autentisering."],
    arch: "norg2",
  },
  dokarkiv: {
    title: "Dokarkiv",
    kind: "Journalposter",
    tone: "neutral",
    text: "Fagmodulen oppretter journalposter her, med SED og vedlegg som dokumenter. Arkivaren og manuell journalføring oppdaterer dem.",
    facts: ["Kanal EESSI, og RINA-saksnummeret som tilleggsopplysning.", "Journalførende enhet 9999 når fagmodulen ber om ferdigstilling."],
    arch: "dokarkiv",
  },
  oppgave: {
    title: "eux-oppgave",
    kind: "Oppgaver i Gosys",
    tone: "neutral",
    text: "Oppretter og ferdigstiller oppgaver. Fagmodulen lager JFR, FDR eller BEH_SED for inngående SED-er.",
    facts: ["Frist neste virkedag, prioritet NORM og RINA-saksnummeret som metadata.", "Svarer eux-oppgave 409, regnes oppgaven som opprettet."],
    arch: "eux-oppgave",
    repo: "eux-oppgave",
  },
  slack: {
    title: "Slack",
    kind: "Varsling",
    tone: "success",
    text: "Fagmodulen varsler driftskanalen når en SED ikke kan behandles eller journalposten ikke blir opprettet.",
    facts: ["Meldingen starter med [prod], [q1] eller [q2].", "Webhooken ligger i NAIS-hemmeligheten slack-team-eessi-nav-driftsoppfolging-webhook."],
    arch: "slack",
  },
  journal: {
    title: "eux-journal",
    kind: "Ferdigstill og avbryt",
    tone: "info",
    text: "Ferdigstiller journalposter og setter status avbrutt i Dokarkiv. Brukes av arkivaren, og av feilregistrering fra nEESSI.",
    facts: [
      "PATCH /api/v1/journalposter/{id}/ferdigstill",
      "POST /api/v1/journalposter/settStatusAvbryt",
      "POST /api/v1/rinasaker/{id}/journalposter/feilregistrer",
      "Feilregistrering: utgående journalposter får status avbrutt. For inngående flyttes oppgaven til 2950.",
      "Fagmodulen kaller ikke eux-journal.",
    ],
    arch: "eux-journal",
    repo: "eux-journal",
  },
  arkivar: {
    title: "eux-journalarkivar",
    kind: "Kotlin · nattlig opprydding",
    tone: "warning",
    text: "Går gjennom journalstatusene i eux-nav-rinasak hver natt. Fullfører midlertidige journalposter og avbryter gamle utgående uten bruker.",
    facts: ["POST /api/v1/arkivarprosess/{ferdigstill|feilregistrer}/execute svarer 204.", "Ukjent prosess gir 400."],
    arch: "eux-journalarkivar",
    repo: "eux-journalarkivar",
  },
  naisjob: {
    title: "eux-journalarkivar-naisjob",
    kind: "NAIS-jobber",
    tone: "warning",
    text: "To CronJobs som hver gjør ett kall til eux-journalarkivar og avslutter.",
    facts: ["Tidssone Europe/Oslo.", "backoffLimit 0: feiler kallet, logges bare en advarsel.", "Azure AD-token mot arkivaren."],
    arch: "eux-journalarkivar-naisjob",
    repo: "eux-journalarkivar-naisjob",
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
  const kafkaOn = flow === "alle" || flow === "inn" || flow === "ut";
  const fRowOn = (no: number) => edgeOn(fFlows(no));
  const aRowOn = () => edgeOn(["natten"]);

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
          style={{ width: "100%", minWidth: 900, height: "auto", display: "block" }}
          role="group"
          aria-label="Systemene rundt automatisk journalføring"
        >
          <defs>
            <marker id="jfr-sys-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="var(--ax-border-neutral-strong)" />
            </marker>
          </defs>

          {/* Kafka-sone */}
          <g className={`arch-rf__group ${kafkaOn ? "" : "is-dim"}`}>
            <rect x={252} y={246} width={210} height={110} rx={14} fill="var(--ax-bg-meta-purple-soft)" fillOpacity={0.45} stroke="var(--ax-border-meta-purple)" strokeOpacity={0.5} strokeDasharray="5 5" />
            <text x={266} y={261} fontSize={10} className="arch-eyebrow-svg" fill="var(--ax-text-meta-purple)">
              KAFKA · eessibasis
            </text>
          </g>

          {/* Kanter */}
          {EDGES.map((e) => (
            <g key={e.id} className={`arch-rf__edge ${edgeState(e.flows)}`}>
              <path
                d={e.d}
                stroke="var(--ax-border-neutral-strong)"
                strokeOpacity={0.75}
                strokeWidth={1.6}
                strokeDasharray={e.dashed ? "5 4" : undefined}
                fill="none"
                markerEnd="url(#jfr-sys-arrow)"
              />
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
                textAnchor={l.anchor ?? "middle"}
                fontSize={l.mono ? 10 : 10.5}
                fontWeight={600}
                className={`arch-halo arch-rf__edge ${edgeState(e.flows)} ${l.mono ? "arch-mono" : ""}`}
                fill="var(--ax-text-neutral-subtle)"
              >
                {l.text}
              </text>
            );
          })}

          {/* Pakker – tegnes før boksene, så de glir bak dem */}
          {!reduced &&
            PACKETS[flow].map((p, i) => (
              <circle key={`${flow}-${i}`} r={5} fill="var(--ax-bg-accent-strong)" className="arch-packet">
                <animateMotion dur={`${p.dur}s`} begin={`${p.begin ?? 0}s`} repeatCount="indefinite" path={p.d} />
              </circle>
            ))}

          {/* RINA */}
          <g {...nodeProps("rina", "RINA")}>
            <rect x={30} y={40} width={200} height={88} rx={14} fill={TONE.info.fill} stroke={TONE.info.stroke} strokeWidth={1.5} className="arch-box" />
            <text x={130} y={66} textAnchor="middle" fontSize={17} fontWeight={800} fill="var(--ax-text-neutral)">
              RINA
            </text>
            <text x={130} y={83} textAnchor="middle" fontSize={10.5} fill="var(--ax-text-neutral-subtle)">
              saker og SED-er
            </text>
            <Port x={38} cy={62} label="CPI" />
            <Port x={107} cy={109} label="NIE" />
          </g>

          {/* eux-all-rina-events */}
          <Box x={30} y={158} w={200} h={46} title="eux-all-rina-events" sub="NIE → Kafka" tone="meta-purple" props={nodeProps("events", "eux-all-rina-events")} />

          {/* eux-rina-document-events-v1 */}
          <g {...nodeProps("doctopic", "eux-rina-document-events-v1")}>
            <rect x={30} y={230} width={200} height={28} rx={14} fill="var(--ax-bg-default)" stroke={TONE["meta-purple"].stroke} strokeWidth={1.5} className="arch-box" />
            {[0, 1, 2, 3].map((i) => (
              <rect key={i} x={40 + i * 5} y={237} width={3} height={14} rx={1.5} fill={TONE["meta-purple"].stroke} opacity={0.35 + i * 0.2} />
            ))}
            <text x={64} y={248} fontSize={9.2} className="arch-mono" fill="var(--ax-text-neutral)">
              eux-rina-document-events-v1
            </text>
          </g>

          {/* eux-legacy-rina-events */}
          <Box x={30} y={284} w={200} h={46} title="eux-legacy-rina-events" sub="beriker fra CPI" tone="meta-purple" props={nodeProps("legacy", "eux-legacy-rina-events")} />

          {/* SED-topics */}
          <Topic cy={284} name="sedmottatt-v1" tag="inn" props={nodeProps("mottatt", "eessibasis.sedmottatt-v1")} />
          <Topic cy={330} name="sedsendt-v1" tag="ut" props={nodeProps("sendt", "eessibasis.sedsendt-v1")} />

          {/* eux-neessi */}
          <g {...nodeProps("neessi", "eux-neessi")}>
            <rect x={30} y={380} width={200} height={132} rx={14} fill={TONE.success.fill} stroke={TONE.success.stroke} strokeWidth={1.5} className="arch-box" />
            <text x={130} y={403} textAnchor="middle" fontSize={13.5} fontWeight={800} fill="var(--ax-text-neutral)">
              eux-neessi
            </text>
            <text x={130} y={419} textAnchor="middle" fontSize={10.5} fill="var(--ax-text-neutral-subtle)">
              saksbehandler i nEESSI
            </text>
            {[
              { cy: 450, t: "journalfør på fagsak" },
              { cy: 488, t: "feilregistrer journalposter" },
            ].map((c) => (
              <g key={c.t}>
                <rect x={44} y={c.cy - 12} width={172} height={24} rx={7} fill="var(--ax-bg-default)" stroke={TONE.success.stroke} strokeOpacity={0.55} />
                <text x={130} y={c.cy + 4} textAnchor="middle" fontSize={10.5} fill="var(--ax-text-neutral)">
                  {c.t}
                </text>
              </g>
            ))}
          </g>

          {/* eux-fagmodul-journalfoering */}
          <g {...nodeProps("fagmodul", "eux-fagmodul-journalfoering")}>
            <rect x={486} y={40} width={220} height={430} rx={16} fill={TONE.accent.fill} stroke={TONE.accent.stroke} strokeWidth={1.8} className="arch-box" />
            <rect x={486} y={40} width={220} height={430} rx={16} fill="none" stroke={TONE.accent.stroke} className="arch-pulse" />
            <text x={596} y={62} textAnchor="middle" fontSize={12.5} fontWeight={800} fill="var(--ax-text-neutral)">
              eux-fagmodul-journalfoering
            </text>
            <text x={596} y={78} textAnchor="middle" fontSize={10.5} fill="var(--ax-text-neutral-subtle)">
              Java · ingen database
            </text>
            {ROWS.filter((r) => r.f).map((r) => (
              <text
                key={r.no}
                x={696}
                y={r.cy + 3.6}
                textAnchor="end"
                fontSize={10.2}
                fill="var(--ax-text-neutral)"
                opacity={fRowOn(r.no) ? 1 : 0.32}
                style={{ transition: "opacity 220ms ease" }}
              >
                {r.f}
              </text>
            ))}
            <rect x={494} y={268} width={84} height={78} rx={9} fill="var(--ax-bg-default)" stroke={TONE.accent.stroke} strokeOpacity={0.6} />
            <text x={536} y={300} textAnchor="middle" fontSize={10.5} fontWeight={700} fill="var(--ax-text-neutral)">
              Kafka-lytter
            </text>
            <text x={536} y={315} textAnchor="middle" fontSize={9.5} fill="var(--ax-text-neutral-subtle)">
              én om gangen
            </text>
            <rect x={494} y={438} width={84} height={24} rx={12} fill="var(--ax-bg-default)" stroke={TONE.accent.stroke} strokeOpacity={0.6} />
            <text x={536} y={454} textAnchor="middle" fontSize={9.5} fontWeight={700} letterSpacing="0.1em" fill="var(--ax-text-accent)">
              REST-API
            </text>
          </g>

          {/* Kolonne D */}
          {ROWS.map((r) => {
            const tall = r.id === "journal";
            const h = tall ? 44 : 34;
            const t = TONE[INFO[r.id].tone];
            return (
              <g key={r.id} {...nodeProps(r.id, r.title)}>
                <rect x={D_X} y={r.cy - h / 2} width={D_W} height={h} rx={10} fill={t.fill} stroke={t.stroke} strokeWidth={1.4} className="arch-box" />
                <text x={D_X + D_W / 2} y={tall ? r.cy - 3 : r.cy + 4.5} textAnchor="middle" fontSize={12.5} fontWeight={700} fill="var(--ax-text-neutral)">
                  {r.title}
                </text>
                {tall && (
                  <text x={D_X + D_W / 2} y={r.cy + 13} textAnchor="middle" fontSize={10} fill="var(--ax-text-neutral-subtle)">
                    ferdigstill og avbryt
                  </text>
                )}
              </g>
            );
          })}

          {/* eux-journalarkivar */}
          <g {...nodeProps("arkivar", "eux-journalarkivar")}>
            <rect x={1046} y={40} width={176} height={472} rx={16} fill={TONE.warning.fill} stroke={TONE.warning.stroke} strokeWidth={1.6} className="arch-box" />
            <text x={1134} y={62} textAnchor="middle" fontSize={13} fontWeight={800} fill="var(--ax-text-neutral)">
              eux-journalarkivar
            </text>
            <text x={1134} y={78} textAnchor="middle" fontSize={10.5} fill="var(--ax-text-neutral-subtle)">
              Kotlin · om natten
            </text>
            {ROWS.filter((r) => r.a).map((r) => (
              <text
                key={r.no}
                x={1058}
                y={r.cy + 3.6}
                fontSize={10.2}
                fill="var(--ax-text-neutral)"
                opacity={aRowOn() ? 1 : 0.32}
                style={{ transition: "opacity 220ms ease" }}
              >
                {r.a}
              </text>
            ))}
            <Moon cx={1134} cy={284} />
          </g>

          {/* eux-journalarkivar-naisjob */}
          <g {...nodeProps("naisjob", "eux-journalarkivar-naisjob")}>
            <rect x={978} y={540} width={248} height={76} rx={14} fill={TONE.warning.fill} stroke={TONE.warning.stroke} strokeWidth={1.5} className="arch-box" />
            <text x={1102} y={560} textAnchor="middle" fontSize={12.5} fontWeight={800} fill="var(--ax-text-neutral)">
              eux-journalarkivar-naisjob
            </text>
            {[
              { no: 1, cy: 579, t: "ferdigstill", k: "01.00" },
              { no: 2, cy: 599, t: "feilregistrer", k: "02.00" },
            ].map((j) => (
              <g key={j.no}>
                <circle cx={998} cy={j.cy} r={7.5} fill={TONE.warning.strong} />
                <text x={998} y={j.cy + 3.5} textAnchor="middle" fontSize={9.5} fontWeight={800} fill="var(--ax-text-warning-contrast)">
                  {j.no}
                </text>
                <text x={1012} y={j.cy + 3.8} fontSize={10.5} className="arch-mono" fill="var(--ax-text-neutral)">
                  {j.t}
                </text>
                <text x={1212} y={j.cy + 3.8} textAnchor="end" fontSize={10.5} fontWeight={700} className="arch-mono" fill="var(--ax-text-warning)">
                  kl. {j.k}
                </text>
              </g>
            ))}
          </g>
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

function Box({
  x,
  y,
  w,
  h,
  title,
  sub,
  tone,
  props,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  sub: string;
  tone: Tone;
  props: React.SVGProps<SVGGElement>;
}) {
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

function Topic({ cy, name, tag, props }: { cy: number; name: string; tag: string; props: React.SVGProps<SVGGElement> }) {
  const t = TONE["meta-purple"];
  return (
    <g {...props}>
      <rect x={266} y={cy - 15} width={182} height={30} rx={15} fill="var(--ax-bg-default)" stroke={t.stroke} strokeWidth={1.5} className="arch-box" />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={278 + i * 6} y={cy - 7} width={3.5} height={14} rx={1.5} fill={t.stroke} opacity={0.35 + i * 0.2} />
      ))}
      <text x={308} y={cy + 4} fontSize={10.8} className="arch-mono" fill="var(--ax-text-neutral)">
        {name}
      </text>
      <text x={436} y={cy + 3.5} textAnchor="end" fontSize={9} fontWeight={800} letterSpacing="0.08em" fill={t.text}>
        {tag.toUpperCase()}
      </text>
    </g>
  );
}

function Moon({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g opacity={0.5} aria-hidden>
      <path
        d={`M ${cx + 6} ${cy - 15} A 16 16 0 1 0 ${cx + 6} ${cy + 15} A 12.5 12.5 0 1 1 ${cx + 6} ${cy - 15} Z`}
        fill="var(--ax-bg-warning-moderate)"
        stroke={TONE.warning.stroke}
        strokeWidth={1.2}
      />
      <circle cx={cx + 20} cy={cy - 14} r={1.6} fill={TONE.warning.stroke} />
      <circle cx={cx + 28} cy={cy - 2} r={1.1} fill={TONE.warning.stroke} />
    </g>
  );
}
