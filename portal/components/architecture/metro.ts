/**
 * Lines and stations for the event metro on /architecture. Each line is a Kafka topic in data.ts, and which lines
 * a station sits on is read from the event edges there. Only the positions and the copy live here.
 */

import { GRENSE_DAGER } from "@/components/sletting/data";
import { EDGES } from "./data";

export type LineId = "doc" | "case" | "notif" | "mottatt" | "sendt";

/** `name` is the topic's node id in data.ts. */
export const LINES: Record<LineId, { name: string; color: string; y: number; desc: string }> = {
  doc: {
    name: "eux-rina-document-events-v1",
    color: "var(--ax-border-meta-purple)",
    y: 130,
    desc: "Dokumenthendelser – en SED er opprettet, sendt, mottatt osv. Har egne retry-, DLT- og DLQ-topics for konsumentene som trenger det.",
  },
  case: {
    name: "eux-rina-case-events-v1",
    color: "var(--ax-border-accent)",
    y: 170,
    desc: "Sakshendelser – en RINA-sak er opprettet, endret eller lukket.",
  },
  notif: {
    name: "eux-rina-notification-events-v1",
    color: "var(--ax-border-success)",
    y: 210,
    desc: "Varslingshendelser fra RINA. Kun eux-rina-case-search leser dem.",
  },
  sendt: {
    name: "sedsendt-v1",
    color: "var(--ax-border-brand-magenta, var(--ax-border-danger))",
    y: 300,
    desc: "Sendte SED-er i det eldre formatet. En offentlig kontrakt som andre team leser.",
  },
  mottatt: {
    name: "sedmottatt-v1",
    color: "var(--ax-border-warning)",
    y: 340,
    desc: "Mottatte SED-er i det eldre formatet. En offentlig kontrakt som andre team leser.",
  },
};

export const LINE_ORDER: LineId[] = ["doc", "case", "notif", "sendt", "mottatt"];

/** The service that publishes the three RINA topics; drawn as the source, not as a station. */
export const SOURCE = "eux-all-rina-events";

/** x of eux-legacy-rina-events, where sedsendt-v1 and sedmottatt-v1 start. */
export const LEG_X = 1000;

export type Station = {
  id: string;
  label: string;
  x: number;
  lines: LineId[];
  /** Label above (top lines) or below (bottom lines), with stagger offset. */
  labelY: number;
  text: string;
  focus?: string;
  href?: string;
  ghost?: boolean;
  team?: boolean;
};

/** The lines whose topic the node reads or writes, in line order. */
export const linesOf = (id: string): LineId[] =>
  LINE_ORDER.filter((l) =>
    EDGES.some((e) => e.kind === "event" && ((e.from === LINES[l].name && e.to === id) || (e.from === id && e.to === LINES[l].name))),
  );

/** A station for a node in data.ts: `focus` opens it, and its lines come from the edges. */
const station = (s: Omit<Station, "lines" | "focus">): Station => ({ ...s, focus: s.id, lines: linesOf(s.id) });

export const STATIONS: Station[] = [
  station({
    id: "eux-rina-case-search",
    label: "rina-case-search",
    x: 520,
    labelY: 98,
    text: "Bygger søkeindeksen over RINA-saker fra alle tre topics. Dokumenthendelser som ikke kan behandles, havner på en DLQ.",
  }),
  station({
    id: "eux-avslutt-rinasaker",
    label: "avslutt-rinasaker",
    x: 640,
    labelY: 80,
    text: "Følger sakene via sak- og dokumenthendelser for å vite når de har vært inaktive lenge nok til å avsluttes.",
  }),
  station({
    id: "eux-slett-usendte-rinasaker",
    label: "slett-usendte-rinasaker",
    x: 760,
    labelY: 98,
    text: `Følger nye saker og om det er sendt eller mottatt en SED i dem. Saker uten SED etter ${GRENSE_DAGER} dager slettes hvis RINA tillater det.`,
  }),
  station({
    id: "eux-adresse-oppdatering",
    label: "adresse-oppdatering",
    x: 880,
    labelY: 80,
    text: "Oppdaterer utenlandske adresser i PDL. Feilede meldinger prøves 3 ganger med 15 sekunders mellomrom før de havner på en DLT.",
  }),
  station({
    id: "eux-legacy-rina-events",
    label: "legacy-rina-events",
    x: LEG_X,
    labelY: 98,
    text: "Overgangen mellom nytt og gammelt format: beriker dokumenthendelser med data fra RINA CPI og publiserer dem på sedsendt-v1 og sedmottatt-v1.",
  }),
  station({
    id: "eux-fagmodul-journalfoering",
    label: "fagmodul-journalfoering",
    x: 880,
    labelY: 374,
    text: "Journalfører sendte og mottatte SED-er automatisk og oppretter oppgaver via eux-oppgave ved behov.",
  }),
  station({
    id: "eux-person-oppdatering",
    label: "person-oppdatering",
    x: 740,
    labelY: 394,
    text: "Leser bare mottatte SED-er og sender utenlandske identifikasjonsnumre til PDL via PDL-Mottak.",
  }),
  station({
    id: "eessi-pensjon",
    label: "eessi-pensjon",
    x: 600,
    labelY: 374,
    text: "Pensjonsområdets EESSI-applikasjoner (annet team) leser begge topicene.",
    team: true,
  }),
  station({
    id: "melosys-eessi",
    label: "melosys-eessi",
    x: 460,
    labelY: 374,
    text: "Melosys (annet team) leser begge topicene.",
    team: true,
  }),
  {
    id: "eux-portal-core",
    label: "portal-core (kun dev)",
    x: 340,
    lines: ["sendt", "mottatt"],
    labelY: 374,
    text: "Backenden til denne portalen leser dev-utgaven av topicene og viser SED-hendelser live.",
    href: "/kafka/sed-hendelser",
    ghost: true,
  },
];
