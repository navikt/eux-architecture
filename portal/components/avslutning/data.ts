/**
 * Verified model of the automatic closing process, used by
 * /prosesser/automatisk-avslutning. Checked against eux-avslutt-rinasaker
 * (Buc.kt, services, Kafka listener, terminator client), the .nais files in
 * eux-avslutt-rinasaker-naisjob and the RINA actions in eux-rina-terminator-api.
 */

export type Scope = "LOKALT" | "GLOBALT";
export type Role = "sakseier" | "motpart";
export type Family = "FB" | "H" | "UB" | "S";
export type Env = "prod" | "q1" | "q2";
export type Tone = "accent" | "warning" | "info" | "success" | "neutral" | "danger" | "meta-purple";

export type StatusId =
  | "NY_SAK"
  | "UVIRKSOM"
  | "TIL_AVSLUTNING_LOKALT"
  | "TIL_AVSLUTNING_GLOBALT"
  | "AVSLUTTET_LOKALT"
  | "AVSLUTTET_GLOBALT"
  | "TIL_ARKIVERING"
  | "ARKIVERT"
  | "AVSLUTTES_AV_MOTPART"
  | "SLETT_DOKUMENTUTKAST"
  | "HANDLING_MANGLER"
  | "HANDLING_FEILET"
  | "DOKUMENT_SENT"
  | "KAN_IKKE_AVSLUTTES"
  | "OPPRETT_OPPGAVE";

/* ------------------------------------------------------------------ */
/* BUC-regler (Buc.kt)                                                 */
/* ------------------------------------------------------------------ */

export interface BucRule {
  navn: string;
  family: Family;
  /** antallDagerBeforeUvirksom */
  uvirksom: number;
  /** antallDagerBeforeArkivering */
  arkivering: number;
  /** sisteSedForAvslutningAutomatisk */
  sisteSed: string[];
  /** sisteSedForAvslutningAutomatiskKrevesSendtFraNav */
  krevesSendtFraNav: boolean;
  /** sedExistsForAvslutningAutomatisk */
  sedExists: string[];
  /** mottattSedExistsForAvslutningAutomatisk */
  mottatt: string[];
  /** sentSedExistsForAvslutningAutomatisk */
  sendt: string[];
  /** avsluttUvirksomBucEtterAntallDager */
  fallback: number | null;
  sakseier: Scope | null;
  motpart: Scope | null;
}

export const FAMILIES: { id: Family; label: string; tone: Tone }[] = [
  { id: "FB", label: "Familieytelser", tone: "meta-purple" },
  { id: "H", label: "Horisontal", tone: "info" },
  { id: "UB", label: "Arbeidsledighet", tone: "warning" },
  { id: "S", label: "Sykdom", tone: "success" },
];

export const FAMILY_BY_ID = Object.fromEntries(FAMILIES.map((f) => [f.id, f])) as Record<
  Family,
  (typeof FAMILIES)[number]
>;

const buc = (navn: string, family: Family, uvirksom: number, r: Partial<BucRule>): BucRule => ({
  navn,
  family,
  uvirksom,
  arkivering: 180,
  sisteSed: [],
  krevesSendtFraNav: false,
  sedExists: [],
  mottatt: [],
  sendt: [],
  fallback: null,
  sakseier: null,
  motpart: null,
  ...r,
});

/** Same order as bucList in Buc.kt (fb + h + ub + s), which is the order the jobs process them in. */
export const BUCS: BucRule[] = [
  buc("FB_BUC_01", "FB", 120, {
    arkivering: 400,
    sisteSed: ["F002"],
    krevesSendtFraNav: true,
    fallback: 270,
    sakseier: "GLOBALT",
  }),
  buc("FB_BUC_02", "FB", 90, { sisteSed: ["F017"], sakseier: "GLOBALT" }),
  buc("FB_BUC_04", "FB", 90, { sedExists: ["F003"], sakseier: "LOKALT", motpart: "LOKALT" }),
  buc("H_BUC_01", "H", 180, { sisteSed: ["H002"], sakseier: "LOKALT", motpart: "LOKALT" }),
  buc("UB_BUC_01", "UB", 90, { mottatt: ["U002", "U004", "U017"], sakseier: "GLOBALT" }),
  buc("UB_BUC_02", "UB", 180, { mottatt: ["U008", "U014", "H070"], sendt: ["U009", "H070"], sakseier: "GLOBALT" }),
  buc("UB_BUC_03", "UB", 90, { mottatt: ["U019", "H070"], sendt: ["H070"], sakseier: "GLOBALT" }),
  buc("UB_BUC_04", "UB", 90, { sedExists: ["U024"], sakseier: "GLOBALT" }),
  buc("S_BUC_12", "S", 90, { sisteSed: ["S055"], motpart: "LOKALT" }),
  buc("S_BUC_14", "S", 90, { sisteSed: ["S046"], sakseier: "LOKALT", motpart: "LOKALT" }),
  buc("S_BUC_14a", "S", 90, { sisteSed: ["S047"], sakseier: "LOKALT", motpart: "LOKALT" }),
  buc("S_BUC_14b", "S", 90, { sisteSed: ["S048"], sakseier: "LOKALT", motpart: "LOKALT" }),
  buc("S_BUC_15", "S", 90, { sisteSed: ["S057"], sakseier: "LOKALT" }),
  buc("S_BUC_17", "S", 90, { sisteSed: ["S003"], sakseier: "LOKALT" }),
  buc("S_BUC_17a", "S", 90, { sisteSed: ["S005"], motpart: "LOKALT" }),
  buc("S_BUC_24", "S", 90, { sisteSed: ["S041"], sakseier: "LOKALT", motpart: "LOKALT" }),
];

export const BUC_BY_NAME: Record<string, BucRule> = Object.fromEntries(BUCS.map((b) => [b.navn, b]));

export const scopeFor = (b: BucRule, role: Role): Scope | null => (role === "sakseier" ? b.sakseier : b.motpart);

/** SED types the rule for a BUC mentions, in a stable order. */
export const sedTypesFor = (b: BucRule): string[] =>
  Array.from(new Set([...b.sisteSed, ...b.sedExists, ...b.mottatt, ...b.sendt]));

/* ------------------------------------------------------------------ */
/* Kriteriene i til-avslutning (TilAvslutningService)                  */
/* ------------------------------------------------------------------ */

export type CriterionId = "sisteSedFraNav" | "sisteSed" | "sedExists" | "mottatt" | "sendt" | "fallback";

export const CRITERIA: { id: CriterionId; title: string; field: string; text: string }[] = [
  {
    id: "sisteSedFraNav",
    title: "Siste SED er sendt fra NAV",
    field: "sisteSedForAvslutningAutomatisk + …KrevesSendtFraNav",
    text: "Den nyeste SED-en i saken har riktig type og er sendt fra NAV.",
  },
  {
    id: "sisteSed",
    title: "Siste SED",
    field: "sisteSedForAvslutningAutomatisk",
    text: "Den nyeste SED-en i saken har riktig type, uansett retning.",
  },
  {
    id: "sedExists",
    title: "SED finnes",
    field: "sedExistsForAvslutningAutomatisk",
    text: "Minst én SED av riktig type finnes i saken.",
  },
  {
    id: "mottatt",
    title: "«Mottatt» SED finnes",
    field: "mottattSedExistsForAvslutningAutomatisk",
    text: "Minst én SED av riktig type finnes i saken. Koden sjekker ikke om den er mottatt.",
  },
  {
    id: "sendt",
    title: "«Sendt» SED finnes",
    field: "sentSedExistsForAvslutningAutomatisk",
    text: "Minst én SED av riktig type finnes i saken. Koden sjekker ikke om den er sendt.",
  },
  {
    id: "fallback",
    title: "Reserve: lenge nok uten endring",
    field: "avsluttUvirksomBucEtterAntallDager",
    text: "Saken er ikke endret på et gitt antall dager. Siden statusen settes når saken blir uvirksom, telles det i praksis fra da.",
  },
];

export const CRITERION_BY_ID = Object.fromEntries(CRITERIA.map((c) => [c.id, c])) as Record<
  CriterionId,
  (typeof CRITERIA)[number]
>;

export type Dir = "SENT" | "MOTTATT";
export interface SimDoc {
  key: number;
  type: string;
  dir: Dir;
}
export type CritState = "na" | "hit" | "miss" | "skip";

export interface Evaluation {
  scope: Scope | null;
  result: StatusId;
  rows: { id: CriterionId; state: CritState; list: string[]; note?: string }[];
}

/** Mirrors TilAvslutningService: the first criterion that matches decides. */
export function evaluate(b: BucRule, role: Role, docs: SimDoc[], dagerSidenEndret: number): Evaluation {
  const scope = scopeFor(b, role);
  const last = docs.at(-1);
  const types = new Set(docs.map((d) => d.type));
  const some = (list: string[]) => list.some((t) => types.has(t));

  const defs: {
    id: CriterionId;
    list: string[];
    applies: boolean;
    hit: () => boolean;
    note?: () => string | undefined;
  }[] = [
    {
      id: "sisteSedFraNav",
      list: b.sisteSed,
      applies: b.krevesSendtFraNav && b.sisteSed.length > 0,
      hit: () => !!last && last.dir === "SENT" && b.sisteSed.includes(last.type),
      note: () =>
        last && b.sisteSed.includes(last.type) && last.dir !== "SENT"
          ? "Riktig type, men mottatt – ikke sendt fra NAV."
          : undefined,
    },
    {
      id: "sisteSed",
      list: b.sisteSed,
      applies: !b.krevesSendtFraNav && b.sisteSed.length > 0,
      hit: () => !!last && b.sisteSed.includes(last.type),
      note: () =>
        !last || b.sisteSed.includes(last.type) || !some(b.sisteSed)
          ? undefined
          : "SED-en finnes, men er ikke den nyeste.",
    },
    { id: "sedExists", list: b.sedExists, applies: b.sedExists.length > 0, hit: () => some(b.sedExists) },
    {
      id: "mottatt",
      list: b.mottatt,
      applies: b.mottatt.length > 0,
      hit: () => some(b.mottatt),
      note: () =>
        docs.some((d) => b.mottatt.includes(d.type) && d.dir === "SENT")
          ? "Treff selv om SED-en er sendt – retningen sjekkes ikke."
          : undefined,
    },
    {
      id: "sendt",
      list: b.sendt,
      applies: b.sendt.length > 0,
      hit: () => some(b.sendt),
      note: () =>
        docs.some((d) => b.sendt.includes(d.type) && d.dir === "MOTTATT")
          ? "Treff selv om SED-en er mottatt – retningen sjekkes ikke."
          : undefined,
    },
    {
      id: "fallback",
      list: [],
      applies: b.fallback !== null,
      hit: () => b.fallback !== null && dagerSidenEndret > b.fallback,
    },
  ];

  if (scope === null) {
    return {
      scope,
      result: "AVSLUTTES_AV_MOTPART",
      rows: defs.map((d) => ({ id: d.id, list: d.list, state: d.applies ? "skip" : "na" })),
    };
  }

  let found = false;
  const rows = defs.map((d) => {
    if (!d.applies) return { id: d.id, list: d.list, state: "na" as CritState };
    if (found) return { id: d.id, list: d.list, state: "skip" as CritState };
    const hit = d.hit();
    if (hit) found = true;
    return { id: d.id, list: d.list, state: (hit ? "hit" : "miss") as CritState, note: d.note?.() };
  });

  return { scope, result: found ? (`TIL_AVSLUTNING_${scope}` as StatusId) : "UVIRKSOM", rows };
}

/* ------------------------------------------------------------------ */
/* Statuser (Rinasak.Status)                                           */
/* ------------------------------------------------------------------ */

export type JobId =
  | "sett-uvirksom"
  | "til-avslutning"
  | "avslutt"
  | "til-arkivering"
  | "arkiver"
  | "slett-dokumentutkast"
  | "rapport";

export interface StatusInfo {
  id: StatusId;
  label: string;
  tone: Tone;
  text: string;
  /** What moves a case into this status (job ids or free text). */
  into: string[];
  /** Statuses the case can move on to. */
  next: StatusId[];
  /** Endpoint in eux-rina-terminator-api that is called from this status. */
  rina?: string;
  unused?: boolean;
}

const AVSLUTTET_TEXT =
  "Etter 180 dager uten endringer på saken (400 for FB_BUC_01) setter til-arkivering den til arkivering. Hver sakshendelse fra RINA starter tellingen på nytt.";

const UNUSED_TEXT = "Finnes i enumen, men ingen kode setter eller leser den.";

export const STATUSES: StatusInfo[] = [
  {
    id: "NY_SAK",
    label: "Aktiv sak",
    tone: "accent",
    text: "Saken følges. Hver natt sjekker sett-uvirksom om den nyeste SED-en er eldre enn grensen for BUC-en. Saker uten SED-er blir aldri uvirksomme.",
    into: ["Første sakshendelse for saken", "Ny SED i en uvirksom sak"],
    next: ["UVIRKSOM"],
  },
  {
    id: "UVIRKSOM",
    label: "Ingen aktivitet",
    tone: "warning",
    text: "Ingen SED er sendt eller mottatt innenfor grensen (90, 120 eller 180 dager). til-avslutning vurderer saken hver natt til en regel slår til. Kommer det en ny SED, går saken tilbake til NY_SAK.",
    into: ["sett-uvirksom", "slett-dokumentutkast"],
    next: ["NY_SAK", "TIL_AVSLUTNING_LOKALT", "TIL_AVSLUTNING_GLOBALT", "AVSLUTTES_AV_MOTPART"],
  },
  {
    id: "AVSLUTTES_AV_MOTPART",
    label: "NAV avslutter ikke",
    tone: "neutral",
    text: "BUC-en har ingen avslutningsregel for NAVs rolle i saken, så NAV gjør ingenting. Statusen er endelig – appen rører ikke saken igjen.",
    into: ["til-avslutning"],
    next: [],
  },
  {
    id: "TIL_AVSLUTNING_LOKALT",
    label: "Klar for lokal lukking",
    tone: "info",
    text: "Neste kjøring av avslutt ber eux-rina-terminator-api lukke saken lokalt i RINA. Saken lukkes bare hos NAV.",
    into: ["til-avslutning"],
    next: ["AVSLUTTET_LOKALT", "HANDLING_MANGLER", "HANDLING_FEILET"],
    rina: "avsluttLokalt",
  },
  {
    id: "TIL_AVSLUTNING_GLOBALT",
    label: "Klar for X001",
    tone: "info",
    text: "Neste kjøring av avslutt ber eux-rina-terminator-api opprette og sende en X001, slik at saken lukkes for alle deltakerne.",
    into: ["til-avslutning"],
    next: ["AVSLUTTET_GLOBALT", "HANDLING_MANGLER", "HANDLING_FEILET"],
    rina: "avsluttGlobalt",
  },
  {
    id: "AVSLUTTET_LOKALT",
    label: "Lukket hos NAV",
    tone: "success",
    text: AVSLUTTET_TEXT,
    into: ["avslutt"],
    next: ["TIL_ARKIVERING"],
  },
  {
    id: "AVSLUTTET_GLOBALT",
    label: "Lukket for alle",
    tone: "success",
    text: AVSLUTTET_TEXT,
    into: ["avslutt"],
    next: ["TIL_ARKIVERING"],
  },
  {
    id: "TIL_ARKIVERING",
    label: "Klar for arkivering",
    tone: "info",
    text: "Neste kjøring av arkiver ber eux-rina-terminator-api arkivere saken i RINA.",
    into: ["til-arkivering"],
    next: ["ARKIVERT", "HANDLING_MANGLER", "HANDLING_FEILET"],
    rina: "arkiver",
  },
  {
    id: "ARKIVERT",
    label: "Ferdig",
    tone: "success",
    text: "Saken er arkivert i RINA. Statusen er endelig.",
    into: ["arkiver"],
    next: [],
  },
  {
    id: "SLETT_DOKUMENTUTKAST",
    label: "Slett X001-utkast",
    tone: "meta-purple",
    text: "slett-dokumentutkast sletter X001-utkastet i saken og setter den tilbake til UVIRKSOM. Ingen kode i appen setter denne statusen, så den må settes utenfor appen, for eksempel direkte i databasen.",
    into: ["Settes utenfor appen"],
    next: ["UVIRKSOM", "HANDLING_MANGLER", "HANDLING_FEILET"],
    rina: "slettDokumentutkast",
  },
  {
    id: "HANDLING_MANGLER",
    label: "Handlingen finnes ikke",
    tone: "danger",
    text: "eux-rina-terminator-api svarte 409: handlingen finnes ikke på saken i RINA. Ingen jobb plukker opp saken igjen.",
    into: ["avslutt", "arkiver", "slett-dokumentutkast"],
    next: [],
  },
  {
    id: "HANDLING_FEILET",
    label: "Kallet feilet",
    tone: "danger",
    text: "Kallet til eux-rina-terminator-api feilet med 5xx, nettverksfeil eller en annen exception. Ingen jobb plukker opp saken igjen.",
    into: ["avslutt", "arkiver", "slett-dokumentutkast"],
    next: [],
  },
  { id: "DOKUMENT_SENT", label: "Ubrukt", tone: "neutral", text: UNUSED_TEXT, into: [], next: [], unused: true },
  { id: "KAN_IKKE_AVSLUTTES", label: "Ubrukt", tone: "neutral", text: UNUSED_TEXT, into: [], next: [], unused: true },
  { id: "OPPRETT_OPPGAVE", label: "Ubrukt", tone: "neutral", text: UNUSED_TEXT, into: [], next: [], unused: true },
];

export const STATUS_BY_ID = Object.fromEntries(STATUSES.map((s) => [s.id, s])) as Record<StatusId, StatusInfo>;

/* ------------------------------------------------------------------ */
/* NAIS-jobber (eux-avslutt-rinasaker-naisjob/.nais)                   */
/* ------------------------------------------------------------------ */

export type Freq = "daily" | "monthly" | "yearly" | "never";
export interface Sched {
  cron: string;
  h: number;
  m: number;
  freq: Freq;
  /** Human-readable form for schedules that are not daily. */
  label?: string;
}

export interface Job {
  id: JobId;
  no: number;
  app: string;
  title: string;
  from: StatusId[];
  to: StatusId[];
  text: string;
  rina?: string;
  limit?: string;
  sched: Record<Env, Sched | null>;
}

const daily = (h: number, m = 0, cron = `${m} ${h} * * *`): Sched => ({ cron, h, m, freq: "daily" });
const all = (s: Sched): Record<Env, Sched> => ({ prod: s, q1: s, q2: s });
const juni: Sched = { cron: "0 0 1 6 *", h: 0, m: 0, freq: "yearly", label: "1. juni kl. 00.00" };

export const JOBS: Job[] = [
  {
    id: "sett-uvirksom",
    no: 1,
    app: "eux-avslutt-rinasaker-sett-uvirksom-naisjob",
    title: "Finn stille saker",
    from: ["NY_SAK"],
    to: ["UVIRKSOM"],
    text: "Finner saker der den nyeste SED-en er eldre enn grensen for BUC-en (90, 120 eller 180 dager), og setter dem uvirksomme. Kaller ikke RINA.",
    limit: "Maks 5 000 saker per BUC per kjøring.",
    sched: all(daily(1)),
  },
  {
    id: "til-avslutning",
    no: 2,
    app: "eux-avslutt-rinasaker-til-avslutning-naisjob",
    title: "Vurder reglene",
    from: ["UVIRKSOM"],
    to: ["TIL_AVSLUTNING_LOKALT", "TIL_AVSLUTNING_GLOBALT", "AVSLUTTES_AV_MOTPART"],
    text: "Vurderer hver uvirksom sak mot reglene for BUC-en og NAVs rolle. Uten treff blir saken stående og vurderes igjen neste natt. Kaller ikke RINA.",
    sched: { prod: daily(2), q1: daily(2), q2: daily(12, 5, "05 12 * * *") },
  },
  {
    id: "avslutt",
    no: 3,
    app: "eux-avslutt-rinasaker-avslutt-naisjob",
    title: "Lukk i RINA",
    from: ["TIL_AVSLUTNING_LOKALT", "TIL_AVSLUTNING_GLOBALT"],
    to: ["AVSLUTTET_LOKALT", "AVSLUTTET_GLOBALT"],
    text: "Lukker sakene i RINA via eux-rina-terminator-api: lokalt med «Close case», eller globalt ved å opprette og sende X001.",
    rina: "avsluttLokalt · avsluttGlobalt",
    limit: "Maks 1 000 lokale og 1 000 globale per BUC per kjøring.",
    sched: all(daily(3)),
  },
  {
    id: "til-arkivering",
    no: 4,
    app: "eux-avslutt-rinasaker-til-arkivering-naisjob",
    title: "Vent på arkivering",
    from: ["AVSLUTTET_LOKALT", "AVSLUTTET_GLOBALT"],
    to: ["TIL_ARKIVERING"],
    text: "Finner avsluttede saker som ikke er endret på 180 dager (400 for FB_BUC_01). Kaller ikke RINA.",
    sched: all(daily(4)),
  },
  {
    id: "arkiver",
    no: 5,
    app: "eux-avslutt-rinasaker-arkiver-naisjob",
    title: "Arkiver i RINA",
    from: ["TIL_ARKIVERING"],
    to: ["ARKIVERT"],
    text: "Arkiverer sakene i RINA via eux-rina-terminator-api.",
    rina: "arkiver",
    sched: all(daily(5)),
  },
  {
    id: "slett-dokumentutkast",
    no: 6,
    app: "eux-avslutt-rinasaker-slett-dok-utkast-naisjob",
    title: "Slett X001-utkast",
    from: ["SLETT_DOKUMENTUTKAST"],
    to: ["UVIRKSOM"],
    text: "Sletter X001-utkast via eux-rina-terminator-api og setter saken tilbake til UVIRKSOM.",
    rina: "slettDokumentutkast",
    sched: { prod: daily(14, 42), q1: juni, q2: juni },
  },
  {
    id: "rapport",
    no: 7,
    app: "eux-avslutt-rinasaker-rapport-naisjob",
    title: "Månedsrapport",
    from: [],
    to: [],
    text: "Sender en oppsummering av forrige måned til Slack: nye, avsluttede, arkiverte og feilede saker, topp 3 BUC-typer og status nå.",
    sched: {
      prod: { cron: "5 0 1 * *", h: 0, m: 5, freq: "monthly", label: "den 1. kl. 00.05" },
      q1: null,
      q2: { cron: "0 0 31 2 *", h: 0, m: 0, freq: "never", label: "aldri (31. februar)" },
    },
  },
];

export const JOB_BY_ID = Object.fromEntries(JOBS.map((j) => [j.id, j])) as Record<JobId, Job>;

export const ENVS: { id: Env; label: string }[] = [
  { id: "prod", label: "Prod" },
  { id: "q1", label: "Q1" },
  { id: "q2", label: "Q2" },
];

export const hhmm = (h: number, m: number) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

/** Norwegian clock format, e.g. "01.00". */
export const klokke = (h: number, m: number) => hhmm(h, m).replace(":", ".");

export const schedLabel = (s: Sched | null): string => {
  if (!s) return "ingen jobb";
  if (s.freq === "daily") return `hver dag kl. ${klokke(s.h, s.m)}`;
  return s.label ?? s.cron;
};

/** True when the schedule in the environment differs from prod. */
export const differsFromProd = (j: Job, env: Env): boolean =>
  (j.sched.prod?.cron ?? null) !== (j.sched[env]?.cron ?? null);
