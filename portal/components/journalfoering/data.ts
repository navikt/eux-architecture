/**
 * Verified model of automatic journaling, used by /prosesser/journalfoering.
 * Checked against eux-fagmodul-journalfoering (InngaaendeSedFacade,
 * UtgaaendeSedFacade, TemaMapping, BestemEnhetService, FagsakService,
 * OppgaveService, JournalpostService), eux-journalarkivar (ferdigstill and
 * feilregistrer services), eux-journalarkivar-naisjob (.nais), eux-journal,
 * eux-nav-rinasak and eux-neessi.
 */

import type { Tone } from "@/components/avslutning/data";

export type { Tone };
export type Env = "prod" | "q1" | "q2";

/* ------------------------------------------------------------------ */
/* Journalstatuser (sed_journalstatus i eux-nav-rinasak)               */
/* ------------------------------------------------------------------ */

export type StatusId =
  | "UKJENT"
  | "JOURNALFOERT"
  | "MANUELL_JOURNALFOERING"
  | "MELOSYS_JOURNALFOERER"
  | "FEILREGISTRERT"
  | "FEILET_FERDIGSTILL"
  | "FEILET_FEILREGISTRER"
  | "KORRUPT";

export interface Status {
  id: StatusId;
  tone: Tone;
  label: string;
  text: string;
  setBy: string[];
  next: StatusId[];
  /** Ingen nattjobb ser på statusen igjen. */
  final?: boolean;
}

export const STATUSES: Status[] = [
  {
    id: "UKJENT",
    tone: "warning",
    label: "Ikke ferdig journalført",
    text: "Fagmodulen setter UKJENT før den lager journalposten. Statusen blir stående hvis journalposten er midlertidig, eller hvis den ikke ble opprettet. Begge nattjobbene leser UKJENT.",
    setBy: ["eux-fagmodul-journalfoering"],
    next: ["JOURNALFOERT", "MANUELL_JOURNALFOERING", "FEILREGISTRERT", "FEILET_FERDIGSTILL", "FEILET_FEILREGISTRER"],
  },
  {
    id: "JOURNALFOERT",
    tone: "success",
    label: "Ferdig journalført",
    text: "Journalposten er journalført. Fagmodulen setter statusen når Dokarkiv ferdigstilte journalposten med en gang. Arkivaren setter den når SAF viser at journalposten er journalført, eller når den har ferdigstilt den selv.",
    setBy: ["eux-fagmodul-journalfoering", "ferdigstill"],
    next: [],
    final: true,
  },
  {
    id: "MANUELL_JOURNALFOERING",
    tone: "info",
    label: "Journalføres av saksbehandler",
    text: "Gjelder UB_BUC_04. Fagmodulen lager ingen journalpost, men lager en BEH_SED-oppgave for inngående SED-er. Saksbehandler journalfører selv.",
    setBy: ["eux-fagmodul-journalfoering"],
    next: [],
    final: true,
  },
  {
    id: "MELOSYS_JOURNALFOERER",
    tone: "meta-purple",
    label: "Melosys journalfører",
    text: "Settes av melosys-eessi. Fagmodulen ser på journalstatusen til første SED i saken. Er den MELOSYS_JOURNALFOERER, gjør fagmodulen ingenting med SED-en.",
    setBy: ["melosys-eessi"],
    next: [],
    final: true,
  },
  {
    id: "FEILREGISTRERT",
    tone: "neutral",
    label: "Feilregistrert eller avbrutt",
    text: "ferdigstill setter statusen når SAF viser at journalposten er feilregistrert. feilregistrer setter den når en utgående journalpost uten bruker er avbrutt. ferdigstill går gjennom FEILREGISTRERT hver natt og kan flytte den videre.",
    setBy: ["ferdigstill", "feilregistrer"],
    next: ["JOURNALFOERT", "FEILET_FERDIGSTILL"],
  },
  {
    id: "FEILET_FERDIGSTILL",
    tone: "danger",
    label: "Ferdigstilling feilet",
    text: "ferdigstill kastet en feil. Feilmeldingen lagres på statusen, og jobben prøver én gang til neste natt. Feiler den igjen, blir statusen KORRUPT.",
    setBy: ["ferdigstill"],
    next: ["JOURNALFOERT", "FEILREGISTRERT", "KORRUPT"],
  },
  {
    id: "FEILET_FEILREGISTRER",
    tone: "danger",
    label: "Feilregistrering feilet",
    text: "feilregistrer kastet en feil. Feilmeldingen lagres, og jobben prøver én gang til neste natt. Feiler den igjen, blir statusen KORRUPT.",
    setBy: ["feilregistrer"],
    next: ["FEILREGISTRERT", "KORRUPT"],
  },
  {
    id: "KORRUPT",
    tone: "danger",
    label: "Gitt opp",
    text: "To feil på rad i samme nattjobb. Ingen jobb ser på SED-en igjen, så den må følges opp manuelt.",
    setBy: ["ferdigstill", "feilregistrer"],
    next: [],
    final: true,
  },
];

export const STATUS_BY_ID = Object.fromEntries(STATUSES.map((s) => [s.id, s])) as Record<StatusId, Status>;

/* ------------------------------------------------------------------ */
/* Sektorer, BUC-er og SED-er                                          */
/* ------------------------------------------------------------------ */

export type SektorId = "FB" | "UB" | "H" | "S" | "M" | "R" | "AW" | "AD" | "P" | "LA";

export const ANNEN = "ANNEN";

export interface Sektor {
  id: SektorId;
  label: string;
  behandles: boolean;
  /** BUC-er med egne regler. «Annen BUC» kommer i tillegg. */
  bucs: string[];
  /** SED-er med egne regler. «Annen SED» kommer i tillegg. */
  seds: string[];
}

export const SEKTORER: Sektor[] = [
  { id: "FB", label: "Familieytelser", behandles: true, bucs: ["FB_BUC_01", "FB_BUC_04"], seds: ["X001"] },
  { id: "UB", label: "Arbeidsledighet", behandles: true, bucs: ["UB_BUC_01", "UB_BUC_02", "UB_BUC_03", "UB_BUC_04"], seds: ["U001", "U001CB", "U003", "U005", "X001"] },
  { id: "H", label: "Horisontal", behandles: true, bucs: ["H_BUC_07"], seds: ["H001", "H020", "H021", "H070", "H121", "X001"] },
  { id: "S", label: "Sykdom", behandles: true, bucs: [], seds: ["S005", "S055", "X001"] },
  { id: "M", label: "Diverse", behandles: true, bucs: [], seds: ["M030", "X001"] },
  { id: "R", label: "Tilbakekreving", behandles: true, bucs: ["R_BUC_02"], seds: ["X001"] },
  { id: "AW", label: "Yrkesskade", behandles: true, bucs: [], seds: ["X001"] },
  { id: "AD", label: "Administrativ", behandles: true, bucs: [], seds: ["X001"] },
  { id: "P", label: "Pensjon", behandles: false, bucs: [], seds: [] },
  { id: "LA", label: "Lovvalg", behandles: false, bucs: [], seds: [] },
];

export const SEKTOR_BY_ID = Object.fromEntries(SEKTORER.map((s) => [s.id, s])) as Record<SektorId, Sektor>;
export const BEHANDLES = SEKTORER.filter((s) => s.behandles).map((s) => s.id);

export const bucAnnen = (sektor: SektorId) => `${sektor}_${ANNEN}`;
export const bucLabel = (b: string) => (b.endsWith(`_${ANNEN}`) ? "Annen BUC" : b);
export const sedLabel = (s: string) => (s === ANNEN ? "Annen SED" : s);

/** BUC-er der fagmodulen alltid ber Dokarkiv om å ferdigstille inngående SED-er. */
export const ALLTID_FERDIGSTILL = ["UB_BUC_01", "FB_BUC_01", "FB_BUC_04"];
/** SED-er som gir ny NEESSI-fagsak i UB uten nav-rinasak. */
export const UB_NY_FAGSAK = ["U001", "U001CB", "U003", "U005"];

export const TEMAER = ["BAR", "KON", "ENF", "DAG", "GEN", "SYK", "PEN", "AAP", "SYM", "GRA", "GRU", "YRK"];

/* ------------------------------------------------------------------ */
/* Tema (TemaMapping.finnGyldigTema)                                   */
/* ------------------------------------------------------------------ */

/** Tema fra sektor, SED og fagsakens tema. Tom streng og null behandles likt. */
export function finnGyldigTema(sektor: SektorId, sed: string | null, tema: string | null): string {
  const t = tema || null;
  switch (sektor) {
    case "FB":
      return t && ["BAR", "KON", "ENF"].includes(t) ? t : "BAR";
    case "UB":
      return t && ["DAG", "GEN"].includes(t) ? t : "DAG";
    case "H":
      return t ?? (sed === "H070" ? "PEN" : "GEN");
    case "R":
      return t ?? "BAR";
    case "AW":
      return "YRK";
    case "M":
      return t ?? (sed === "M030" ? "GRA" : "GEN");
    case "S":
      return t ?? (sed === "S005" ? "AAP" : sed === "S055" ? "SYM" : "GEN");
    case "AD":
      return t ?? "GEN";
    case "P":
      return "PEN";
    case "LA":
      return "MED";
  }
}

export const TEMA_ROWS: { sektor: SektorId; medFagsak: string; utenFagsak: string; note?: string }[] = [
  { sektor: "FB", medFagsak: "BAR, KON eller ENF", utenFagsak: "BAR", note: "Andre temaer på fagsaken blir BAR." },
  { sektor: "UB", medFagsak: "DAG eller GEN", utenFagsak: "DAG", note: "Andre temaer på fagsaken blir DAG." },
  { sektor: "H", medFagsak: "fagsakens tema", utenFagsak: "PEN for H070, ellers GEN" },
  { sektor: "S", medFagsak: "fagsakens tema", utenFagsak: "AAP for S005, SYM for S055, ellers GEN", note: "Inngående S005 får alltid GRU." },
  { sektor: "M", medFagsak: "fagsakens tema", utenFagsak: "GRA for M030, ellers GEN" },
  { sektor: "R", medFagsak: "fagsakens tema", utenFagsak: "BAR" },
  { sektor: "AW", medFagsak: "YRK", utenFagsak: "YRK", note: "Alltid YRK." },
  { sektor: "AD", medFagsak: "fagsakens tema", utenFagsak: "GEN" },
];

/* ------------------------------------------------------------------ */
/* Behandlingstema og behandlingstype                                  */
/* ------------------------------------------------------------------ */

export function finnBehandlingstema(tema: string, buc: string, sed: string | null, enhet: string | null, sakseier: boolean): string {
  if (tema === "DAG") {
    if (buc === "UB_BUC_01") return sakseier ? "ab0308" : "ab0309";
    if (buc === "UB_BUC_02") return sakseier ? "ab0307" : "ab0002";
    if (buc === "UB_BUC_04") return sakseier ? "ab0311" : "ab0310";
    return "";
  }
  if (tema === "BAR") return "ab0058";
  if (sed === "H121" && tema === "SYK" && (enhet === "4488" || enhet === "4474")) return "ab0421";
  return "";
}

export function velgBehandlingstype(tema: string, buc: string): string {
  if (buc === "UB_BUC_04") return "ae0106";
  if (["DAG", "SYM", "AAP", "GRA"].includes(tema)) return "ae0106";
  if (tema === "KON") return "ae0120";
  return "";
}

export const BEHANDLINGSTEMA_ROWS: { when: string; sakseier: string; motpart: string; note?: string }[] = [
  { when: "DAG og UB_BUC_01", sakseier: "ab0308", motpart: "ab0309" },
  { when: "DAG og UB_BUC_02", sakseier: "ab0307", motpart: "ab0002" },
  { when: "DAG og UB_BUC_04", sakseier: "ab0311", motpart: "ab0310", note: "Fagmodulen regner aldri NAV som sakseier i UB_BUC_04, så det blir alltid ab0310." },
  { when: "BAR", sakseier: "ab0058", motpart: "ab0058" },
  { when: "Inngående H121, tema SYK og enhet 4488 eller 4474", sakseier: "ab0421", motpart: "ab0421" },
];

export const BEHANDLINGSTYPE_ROWS: { when: string; value: string }[] = [
  { when: "Tema DAG, SYM, AAP eller GRA", value: "ae0106" },
  { when: "Tema KON", value: "ae0120" },
  { when: "UB_BUC_04, uansett tema", value: "ae0106" },
];

/* ------------------------------------------------------------------ */
/* Behandlende enhet (BestemEnhetService) – bare inngående             */
/* ------------------------------------------------------------------ */

export type EnhetRuleId = "beskyttet" | "ub" | "s055" | "h070" | "s005" | "sh" | "norg2" | "fallback";

export interface EnhetRule {
  id: EnhetRuleId;
  when: string;
  enhet: string;
  name?: string;
  text: string;
  preset: Partial<SimInput>;
}

/* ------------------------------------------------------------------ */
/* Simulator                                                           */
/* ------------------------------------------------------------------ */

export type Retning = "inn" | "ut";

export interface SimInput {
  retning: Retning;
  sektor: SektorId;
  buc: string;
  sed: string;
  navRinasak: boolean;
  fagsakISaken: boolean;
  fagsakTema: string;
  journalfoertISaken: boolean;
  melosys: boolean;
  person: boolean;
  fagsakPaaTema: boolean;
  beskyttet: boolean;
  sakseier: boolean;
  overstyrt: Overstyrt;
  dokarkivFeil: boolean;
}

export const OVERSTYRT = [
  { value: "", label: "Ingen" },
  { value: "4488", label: "4488" },
  { value: "4404", label: "4404 (utgått)" },
  { value: "4847", label: "4847 (utgått)" },
] as const;
export type Overstyrt = (typeof OVERSTYRT)[number]["value"];

export const ENHET_RULES: EnhetRule[] = [
  {
    id: "beskyttet",
    when: "Strengt fortrolig adresse",
    enhet: "2103",
    name: "Vikafossen",
    text: "Gradering STRENGT_FORTROLIG eller STRENGT_FORTROLIG_UTLAND i PDL. Slår alle andre regler.",
    preset: { sektor: "S", buc: "S_ANNEN", sed: ANNEN, beskyttet: true },
  },
  {
    id: "ub",
    when: "Sektor UB",
    enhet: "4470",
    text: "Alle U-SED-er går til samme enhet. I koden heter den ENHET_ARBEID_KØ.",
    preset: { sektor: "UB", buc: "UB_BUC_01", sed: "U001", sakseier: false },
  },
  { id: "s055", when: "SED S055", enhet: "0393", text: "Fast enhet for S055.", preset: { sektor: "S", buc: "S_ANNEN", sed: "S055" } },
  { id: "h070", when: "SED H070", enhet: "4803", text: "Fast enhet for H070.", preset: { sektor: "H", buc: "H_ANNEN", sed: "H070" } },
  { id: "s005", when: "SED S005", enhet: "4461", text: "Fast enhet for S005.", preset: { sektor: "S", buc: "S_ANNEN", sed: "S005" } },
  {
    id: "sh",
    when: "Sektor S eller H",
    enhet: "4303",
    name: "eller overstyrt enhet",
    text: "overstyrtEnhetsnummer i nav-rinasaken, ellers 4303. Utgåtte enheter byttes ut: 4847 blir 4817, og 4404 blir 4488 i S og 4303 i H.",
    preset: { sektor: "S", buc: "S_ANNEN", sed: ANNEN, navRinasak: true, fagsakISaken: true, fagsakTema: "SYK", overstyrt: "4404" },
  },
  {
    id: "norg2",
    when: "Alle andre",
    enhet: "NORG2",
    text: "NORG2 velger enhet ut fra tema, personens geografiske tilknytning i PDL og behandlingstype.",
    preset: { sektor: "M", buc: "M_ANNEN", sed: "M030" },
  },
  {
    id: "fallback",
    when: "Ingen enhet funnet",
    enhet: "4303",
    name: "NAV ID og fordeling",
    text: "Uten person blir verken PDL eller NORG2 spurt. Svarer ikke NORG2, blir det også 4303.",
    preset: { sektor: "AD", buc: "AD_ANNEN", sed: ANNEN, person: false },
  },
];

export const ENHET_RULE_BY_ID = Object.fromEntries(ENHET_RULES.map((r) => [r.id, r])) as Record<EnhetRuleId, EnhetRule>;

function brukOppdatertEnhet(enhet: string, sektor: SektorId): string {
  if (enhet === "4847") return "4817";
  if (enhet === "4404") return sektor === "S" ? "4488" : "4303";
  return enhet;
}

/* ------------------------------------------------------------------ */
/* Oppgaver (OppgaveService.opprettOppgaveInngaaende)                  */
/* ------------------------------------------------------------------ */

export const OPPGAVE_ROWS: { when: string; oppgave: string; tone: Tone }[] = [
  { when: "SED-en er X001", oppgave: "Ingen", tone: "neutral" },
  { when: "UB_BUC_04", oppgave: "BEH_SED, uten journalpost", tone: "info" },
  { when: "Journalposten ble ikke opprettet, eller fantes fra før", oppgave: "Ingen", tone: "danger" },
  { when: "Journalposten ble ferdigstilt", oppgave: "BEH_SED", tone: "success" },
  { when: "Midlertidig, enhet 4303 og ingen aktørId", oppgave: "FDR", tone: "warning" },
  { when: "Midlertidig ellers", oppgave: "JFR", tone: "warning" },
];

export const OPPGAVETYPER: Record<string, string> = {
  JFR: "Journalføring",
  FDR: "Fordeling",
  BEH_SED: "Behandle SED",
};

/* ------------------------------------------------------------------ */
/* Nattjobbene (eux-journalarkivar-naisjob)                            */
/* ------------------------------------------------------------------ */

export type JobId = "ferdigstill" | "feilregistrer";

export interface Job {
  id: JobId;
  no: number;
  title: string;
  cronjob: string;
  sched: Record<Env, { cron: string; label: string; h: number | null }>;
  reads: StatusId[];
  writes: StatusId[];
  text: string;
  steps: { text: string; to?: StatusId; tone?: Tone }[];
}

export const JOBS: Job[] = [
  {
    id: "ferdigstill",
    no: 1,
    title: "Ferdigstill",
    cronjob: "eux-journalarkivar-ferdigstill-naisjob",
    sched: {
      prod: { cron: "0 1 * * *", label: "hver natt kl. 01.00", h: 1 },
      q1: { cron: "0 1 * * *", label: "hver natt kl. 01.00", h: 1 },
      q2: { cron: "0 1 * * *", label: "hver natt kl. 01.00", h: 1 },
    },
    reads: ["FEILET_FERDIGSTILL", "UKJENT", "FEILREGISTRERT"],
    writes: ["JOURNALFOERT", "FEILREGISTRERT", "FEILET_FERDIGSTILL", "KORRUPT"],
    text: "Fullfører midlertidige journalposter ved å kopiere sak, bruker og tema fra en journalpost i samme RINA-sak som allerede er ferdigstilt.",
    steps: [
      { text: "Journalposten er allerede journalført i SAF", to: "JOURNALFOERT", tone: "success" },
      { text: "Journalposten er feilregistrert i SAF", to: "FEILREGISTRERT", tone: "neutral" },
      { text: "Ingen ferdigstilt journalpost i saken å kopiere fra", tone: "warning" },
      { text: "Kopier sak, bruker og tema og ferdigstill. Inngående: lukk oppgavene og lag BEH_SED", to: "JOURNALFOERT", tone: "success" },
      { text: "Feil – første gang", to: "FEILET_FERDIGSTILL", tone: "danger" },
      { text: "Feil – andre gang", to: "KORRUPT", tone: "danger" },
    ],
  },
  {
    id: "feilregistrer",
    no: 2,
    title: "Feilregistrer",
    cronjob: "eux-journalarkivar-feilregistrer-naisjob",
    sched: {
      prod: { cron: "0 2 * * *", label: "hver natt kl. 02.00", h: 2 },
      q1: { cron: "0 2 * * *", label: "hver natt kl. 02.00", h: 2 },
      q2: { cron: "0 14 25 11 *", label: "25. november kl. 14.00", h: null },
    },
    reads: ["FEILET_FEILREGISTRER", "UKJENT"],
    writes: ["FEILREGISTRERT", "FEILET_FEILREGISTRER", "KORRUPT"],
    text: "Avbryter utgående journalposter uten bruker som har stått som UKJENT i mer enn 30 dager.",
    steps: [
      { text: "UKJENT i under 30 dager", tone: "neutral" },
      { text: "Inngående, eller journalposten har bruker", tone: "warning" },
      { text: "Utgående uten bruker: sett status avbrutt via eux-journal", to: "FEILREGISTRERT", tone: "neutral" },
      { text: "Feil – første gang", to: "FEILET_FEILREGISTRER", tone: "danger" },
      { text: "Feil – andre gang", to: "KORRUPT", tone: "danger" },
    ],
  },
];

export const JOB_BY_ID = Object.fromEntries(JOBS.map((j) => [j.id, j])) as Record<JobId, Job>;

export const ENVS: Env[] = ["prod", "q1", "q2"];

export const cronjobName = (j: Job, env: Env) => (env === "prod" ? j.cronjob : `${j.cronjob}-${env}`);

/* ------------------------------------------------------------------ */
/* Simulering av fagmodulen                                            */
/* ------------------------------------------------------------------ */

export type StepId =
  | "filter"
  | "annet"
  | "ukjent"
  | "person"
  | "fagsak"
  | "tema"
  | "enhet"
  | "journalpost"
  | "oppgave"
  | "sensitiv"
  | "dokument"
  | "status";

export type StepState = "done" | "warn" | "stop" | "skip" | "off";

export interface Step {
  id: StepId;
  state: StepState;
  value?: string;
  text: string;
}

export const STEP_TITLE: Record<StepId, string> = {
  filter: "Skal SED-en behandles?",
  annet: "Journalfører noen andre?",
  ukjent: "Journalstatus UKJENT",
  person: "Person",
  fagsak: "Fagsak",
  tema: "Tema",
  enhet: "Behandlende enhet",
  journalpost: "Journalpost i Dokarkiv",
  oppgave: "Oppgave",
  sensitiv: "Sensitiv sak i RINA",
  dokument: "Dokument i nav-rinasak",
  status: "Journalstatus til slutt",
};

const STEP_ORDER: StepId[] = ["filter", "annet", "ukjent", "person", "fagsak", "tema", "enhet", "journalpost", "oppgave", "sensitiv", "dokument", "status"];

export type Outcome = "filtrert" | "annet" | "ferdigstilt" | "midlertidig" | "feilet" | "manuell";

export interface SimResult {
  steps: Step[];
  outcome: Outcome;
  status: StatusId | null;
  tema?: string;
  behandlingstema?: string;
  behandlingstype?: string;
  enhet?: string;
  enhetRule?: EnhetRuleId;
  oppgave?: string;
  journalpost?: string;
  avbrutt?: boolean;
}

/** Hvilke valg som påvirker resultatet for gitt input. */
export function relevant(i: SimInput) {
  const inn = i.retning === "inn";
  const utenFagsakRegel = i.sektor === "S" || i.sektor === "H" || i.sektor === "UB";
  return {
    fagsakISaken: i.navRinasak,
    fagsakTema: i.navRinasak && i.fagsakISaken && i.sektor !== "AW",
    journalfoertISaken: inn && i.navRinasak && !ALLTID_FERDIGSTILL.includes(i.buc),
    melosys: i.navRinasak,
    fagsakPaaTema: !i.navRinasak && i.person && !utenFagsakRegel,
    beskyttet: i.person,
    sakseier: i.sektor === "UB" && i.buc !== "UB_BUC_04",
    overstyrt: inn && i.navRinasak && (i.sektor === "S" || i.sektor === "H"),
    dokarkivFeil: i.buc !== "UB_BUC_04",
  };
}

export function simulate(i: SimInput): SimResult {
  const inn = i.retning === "inn";
  const sed = i.sed === ANNEN ? null : i.sed;
  const steps: Step[] = [];
  const add = (id: StepId, state: StepState, text: string, value?: string) => steps.push({ id, state, text, value });
  const skipRest = () => {
    for (const id of STEP_ORDER.slice(steps.length)) add(id, "skip", "Nås ikke.");
  };

  // 1. Filter (TemaMapping.skalBehandles)
  if (!BEHANDLES.includes(i.sektor) || i.buc === "R_BUC_02") {
    add(
      "filter",
      "stop",
      i.buc === "R_BUC_02"
        ? "R_BUC_02 er unntatt. Kafka-lytteren leser meldingen og hopper over den."
        : `Sektor ${i.sektor} er ikke blant de åtte som behandles. Kafka-lytteren leser meldingen og hopper over den.`,
      "hoppes over",
    );
    skipRest();
    return { steps, outcome: "filtrert", status: null };
  }
  add("filter", "done", `Sektor ${i.sektor} behandles. Sektoren er det som står foran første «_» i BUC-typen.`, "ja");

  // 2. Annet system (haandteresAvAnnetSystem)
  const melosys = i.navRinasak && i.melosys;
  if (melosys) {
    add("annet", "stop", "Første SED i saken har journalstatus MELOSYS_JOURNALFOERER. Melosys journalfører, så fagmodulen stopper her.", "Melosys");
    skipRest();
    return { steps, outcome: "annet", status: null };
  }
  if (i.buc === "H_BUC_07" && !i.navRinasak) {
    add("annet", "stop", "H_BUC_07 uten nav-rinasak er ikke opprettet fra nEESSI. Da journalfører ikke fagmodulen.", "andre");
    skipRest();
    return { steps, outcome: "annet", status: null };
  }
  add(
    "annet",
    "done",
    i.buc === "H_BUC_07" ? "H_BUC_07 med nav-rinasak er opprettet fra nEESSI, så fagmodulen journalfører." : "Nei. Fagmodulen journalfører selv.",
    "nei",
  );

  // 3. UKJENT
  add("ukjent", "done", "Settes før noe annet skjer, slik at nattjobbene finner SED-en selv om resten går galt.", "UKJENT");

  // 4. Person
  if (i.person) {
    add(
      "person",
      "done",
      inn && (sed === "H020" || sed === "H021")
        ? "fnr fra navBruker i hendelsen, eller fra SED-en for H020 og H021. aktørId fra PDL."
        : "fnr fra navBruker i hendelsen, og aktørId fra PDL.",
      "funnet",
    );
  } else {
    add(
      "person",
      "warn",
      inn && i.buc === "UB_BUC_01"
        ? "Ingen aktørId. I UB_BUC_01 uten fnr leter fagmodulen også etter et norsk fnr i SED-en som er feilmerket med litauisk landkode."
        : "Ingen aktørId. Journalposten får ingen bruker hvis ikke fagsaken har en.",
      "ikke funnet",
    );
  }

  // 5. Fagsak
  type Fagsak = { tema: string | null; ny?: boolean };
  let fagsak: Fagsak | null = null;
  let fagsakText: string;
  if (i.navRinasak) {
    if (i.fagsakISaken) {
      fagsak = { tema: i.fagsakTema };
      fagsakText = "Fra nav-rinasaken, fra journalposten til det første dokumentet i saken (SAF) eller fra initiellFagsak – i den rekkefølgen.";
    } else {
      fagsakText = "Verken nav-rinasaken, journalposten i SAF eller initiellFagsak har en fagsak. Fagmodulen leter ikke videre hos personen.";
    }
  } else if (i.sektor === "S" || i.sektor === "H" || (!inn && i.sektor === "UB")) {
    fagsakText = `Uten nav-rinasak får ${inn ? "S- og H-SED-er" : "utgående S-, H- og UB-SED-er"} ingen fagsak.`;
  } else if (i.sektor === "UB") {
    if (sed && UB_NY_FAGSAK.includes(sed) && i.person) {
      fagsak = { tema: null, ny: true };
      fagsakText = "Ny fagsak i system NEESSI, med nummer <høyeste+1>/<år> regnet ut fra personens NEESSI- og AO11-saker i SAF.";
    } else {
      fagsakText = i.person ? "Bare U001, U001CB, U003 og U005 gir ny fagsak når saken mangler nav-rinasak." : "Ny NEESSI-fagsak krever aktørId.";
    }
  } else {
    const tema = finnGyldigTema(i.sektor, sed, null);
    if (i.person && i.fagsakPaaTema) {
      fagsak = { tema };
      fagsakText = `Personens nyeste fagsak på tema ${tema}, fra SAF.`;
    } else {
      fagsakText = i.person ? `Personen har ingen fagsak på tema ${tema}.` : "Uten aktørId kan ikke fagmodulen søke etter fagsaker.";
    }
  }
  add("fagsak", fagsak ? "done" : "warn", fagsakText, fagsak ? (fagsak.ny ? "ny i NEESSI" : "funnet") : "ingen");

  const aktoer = !!fagsak || i.person;
  const sakseier = i.sektor === "UB" && i.buc !== "UB_BUC_04" && i.sakseier;

  // 6. Tema
  let tema: string;
  if (inn && sed === "S005") {
    tema = "GRU";
    add("tema", "done", "Inngående S005 får alltid GRU.", tema);
  } else {
    tema = finnGyldigTema(i.sektor, sed, fagsak?.tema ?? null);
    const fraFagsak = !!fagsak?.tema && fagsak.tema === tema;
    add("tema", "done", i.sektor === "AW" ? "AW gir alltid YRK." : fraFagsak ? "Fagsakens tema er gyldig for sektoren." : "Standardtemaet for sektoren.", tema);
  }

  const behandlingstype = velgBehandlingstype(tema, i.buc);

  // 7. Enhet (bare inngående)
  let enhet: string | undefined;
  let enhetRule: EnhetRuleId | undefined;
  const beskyttet = i.person && i.beskyttet;
  if (inn) {
    if (beskyttet) [enhet, enhetRule] = ["2103", "beskyttet"];
    else if (i.sektor === "UB") [enhet, enhetRule] = ["4470", "ub"];
    else if (sed === "S055") [enhet, enhetRule] = ["0393", "s055"];
    else if (sed === "H070") [enhet, enhetRule] = ["4803", "h070"];
    else if (sed === "S005") [enhet, enhetRule] = ["4461", "s005"];
    else if (i.sektor === "S" || i.sektor === "H") {
      enhetRule = "sh";
      enhet = i.navRinasak && i.overstyrt ? brukOppdatertEnhet(i.overstyrt, i.sektor) : "4303";
    } else if (aktoer) [enhet, enhetRule] = ["NORG2", "norg2"];
    else [enhet, enhetRule] = ["4303", "fallback"];
    const why =
      enhetRule === "sh"
        ? i.navRinasak && i.overstyrt
          ? `overstyrtEnhetsnummer ${i.overstyrt} fra nav-rinasaken${enhet !== i.overstyrt ? `. Den er utgått og byttes med ${enhet}` : ""}.`
          : "Ingen overstyrt enhet i nav-rinasaken, så 4303."
        : enhetRule === "fallback"
          ? "Uten person er det ingen geografisk tilknytning. NORG2 blir ikke spurt, og enheten blir 4303."
          : enhetRule === "norg2"
            ? `NORG2 svarer ut fra tema ${tema} og geografisk tilknytning${behandlingstype ? ` og behandlingstype ${behandlingstype}` : ""}. Uten svar blir det 4303.`
            : ENHET_RULE_BY_ID[enhetRule].text;
    add("enhet", "done", why, enhet === "NORG2" ? "fra NORG2" : enhet);
  } else {
    add("enhet", "off", "Utgående SED-er får ingen behandlende enhet.");
  }

  const behandlingstema = finnBehandlingstema(tema, i.buc, inn ? sed : null, inn ? (enhet ?? null) : null, sakseier);

  // 8. Journalpost
  const ub4 = i.buc === "UB_BUC_04";
  const forsoek = !inn || ALLTID_FERDIGSTILL.includes(i.buc) || (i.navRinasak && i.journalfoertISaken);
  let outcome: Outcome;
  let journalpost: string;
  let avbrutt = false;
  if (ub4) {
    outcome = "manuell";
    journalpost = "ingen";
    add("journalpost", "warn", "UB_BUC_04 journalføres ikke automatisk. Fagmodulen lager ingen journalpost.", "ingen");
  } else if (i.dokarkivFeil) {
    outcome = "feilet";
    journalpost = "feilet";
    add(
      "journalpost",
      "stop",
      "Dokarkiv svarte med feil. Fagmodulen varsler i Slack, men kaster ikke feilen videre. Resten av flyten går som om journalposten ikke finnes.",
      "feilet",
    );
  } else if (forsoek && !!fagsak && aktoer) {
    outcome = "ferdigstilt";
    journalpost = "ferdigstilt";
    add("journalpost", "done", "Fagmodulen ber Dokarkiv ferdigstille, og journalposten har både sak og bruker. Journalførende enhet er 9999.", "ferdigstilt");
  } else {
    outcome = "midlertidig";
    journalpost = "midlertidig";
    const mangler = [!fagsak && "sak", !aktoer && "bruker"].filter(Boolean).join(" og ");
    const why = !forsoek
      ? "Fagmodulen ber ikke om ferdigstilling, fordi ingen SED i saken er journalført ennå."
      : `Fagmodulen ber om ferdigstilling, men journalposten mangler ${mangler}. Den blir midlertidig.`;
    avbrutt = !inn && sed === "H001";
    add("journalpost", "warn", why + (avbrutt ? " Utgående H001 som ikke blir ferdigstilt, avbrytes med en gang." : ""), avbrutt ? "avbrutt" : "midlertidig");
  }

  // 9. Oppgave (bare inngående)
  let oppgave: string | undefined;
  if (inn) {
    if (sed === "X001") oppgave = "ingen";
    else if (ub4) oppgave = "BEH_SED";
    else if (outcome === "feilet") oppgave = "ingen";
    else if (outcome === "ferdigstilt") oppgave = "BEH_SED";
    else oppgave = enhet === "4303" && !aktoer ? "FDR" : "JFR";
    const text =
      sed === "X001"
        ? "X001 gir aldri oppgave."
        : ub4
          ? "Behandle SED, uten journalpost: «Inngående SED ble ikke automatisk journalført.»"
          : outcome === "feilet"
            ? "Ingen journalpost, så ingen oppgave. Feilen varsles bare i Slack."
            : outcome === "ferdigstilt"
              ? "Behandle SED til enheten over. Frist neste virkedag."
              : oppgave === "FDR"
                ? "Fordeling, fordi enheten er 4303 og aktørId mangler."
                : "Journalføring til enheten over. Frist neste virkedag.";
    add("oppgave", sed === "X001" ? "off" : outcome === "feilet" ? "stop" : outcome === "ferdigstilt" || ub4 ? "done" : "warn", text, oppgave);
  } else {
    add("oppgave", "off", "Utgående SED-er får ingen oppgave.");
  }

  // 10. Sensitiv
  if (beskyttet) add("sensitiv", "done", "Fagmodulen markerer RINA-saken som sensitiv via eux-rina-api.", "ja");
  else add("sensitiv", "off", "Ikke strengt fortrolig adresse.");

  // 11. Dokument i nav-rinasak
  if (ub4) {
    add("dokument", "warn", "UB_BUC_04 legges ikke til i nav-rinasak.", "nei");
  } else if (outcome === "feilet") {
    add("dokument", "stop", "Uten journalpost er det ingen dokumentInfoId, så dokumentet legges ikke til.", "nei");
  } else {
    add(
      "dokument",
      "done",
      i.navRinasak
        ? "Dokumentet legges til med dokumentInfoId, sedId, versjon og SED-type."
        : "Saken finnes ikke i nav-rinasak og opprettes. Så legges dokumentet til.",
      i.navRinasak ? "lagt til" : "sak opprettet",
    );
  }

  // 12. Status
  const status: StatusId = ub4 ? "MANUELL_JOURNALFOERING" : outcome === "ferdigstilt" ? "JOURNALFOERT" : "UKJENT";
  add(
    "status",
    status === "UKJENT" ? (outcome === "feilet" ? "stop" : "warn") : "done",
    outcome === "feilet"
      ? "Ukjent. Uten dokument i nav-rinasak feiler ferdigstill to netter på rad: først FEILET_FERDIGSTILL, så KORRUPT."
      : `${STATUS_BY_ID[status].label}.`,
    status,
  );

  return { steps, outcome, status, tema, behandlingstema, behandlingstype, enhet, enhetRule, oppgave, journalpost, avbrutt };
}

export const DEFAULT_INPUT: SimInput = {
  retning: "inn",
  sektor: "FB",
  buc: "FB_BUC_01",
  sed: ANNEN,
  navRinasak: false,
  fagsakISaken: true,
  fagsakTema: "BAR",
  journalfoertISaken: true,
  melosys: false,
  person: true,
  fagsakPaaTema: true,
  beskyttet: false,
  sakseier: true,
  overstyrt: "",
  dokarkivFeil: false,
};

export const PRESETS: { id: string; label: string; input: Partial<SimInput> }[] = [
  { id: "fb", label: "Ny FB-sak", input: {} },
  { id: "u001", label: "U001 i ny sak", input: { sektor: "UB", buc: "UB_BUC_01", sed: "U001", sakseier: false } },
  { id: "h-forste", label: "Første H-SED", input: { sektor: "H", buc: "H_ANNEN", sed: "H001" } },
  {
    id: "h-senere",
    label: "H121 i journalført sak",
    input: { sektor: "H", buc: "H_ANNEN", sed: "H121", navRinasak: true, fagsakISaken: true, fagsakTema: "SYK", journalfoertISaken: true, overstyrt: "4488" },
  },
  { id: "fortrolig", label: "Strengt fortrolig", input: { sektor: "S", buc: "S_ANNEN", sed: ANNEN, beskyttet: true } },
  { id: "ub4", label: "UB_BUC_04", input: { sektor: "UB", buc: "UB_BUC_04", sed: ANNEN } },
  { id: "melosys", label: "Melosys-sak", input: { sektor: "H", buc: "H_ANNEN", sed: ANNEN, navRinasak: true, melosys: true } },
  { id: "dokarkiv", label: "Dokarkiv feiler", input: { dokarkivFeil: true } },
  { id: "ut-h001", label: "Utgående H001", input: { retning: "ut", sektor: "H", buc: "H_ANNEN", sed: "H001" } },
  { id: "pensjon", label: "Pensjon", input: { sektor: "P", buc: "P_ANNEN", sed: ANNEN } },
];

export const presetInput = (p: Partial<SimInput>): SimInput => ({ ...DEFAULT_INPUT, ...p });

export const sameInput = (a: SimInput, b: SimInput) => (Object.keys(a) as (keyof SimInput)[]).every((k) => a[k] === b[k]);
