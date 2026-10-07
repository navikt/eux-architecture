/**
 * Verified model of the automatic deletion process, used by
 * /prosesser/automatisk-sletting. Checked against eux-slett-usendte-rinasaker
 * (SlettUsendteRinasakerService, Kafka listeners, RapportService), the .nais
 * files in eux-slett-usendte-rinasaker-naisjob and RinasakService in
 * eux-rina-terminator-api.
 */

import type { Tone } from "@/components/avslutning/data";

export type { Tone };
export type Env = "prod" | "q1" | "q2";
export type JobId = "slett" | "til-sletting" | "rapport";

export type StatusId =
  | "NY_SAK"
  | "TIL_SLETTING"
  | "SLETTING_FEILET_RETRY"
  | "SLETTET"
  | "NOT_FOUND"
  | "SLETTING_FEILET"
  | "KAN_IKKE_SLETTES"
  | "DOKUMENT_SENT"
  | "KORRUPT";

/** Days a case must have existed in the app before til-sletting looks at it. */
export const GRENSE_DAGER = 15;

/* ------------------------------------------------------------------ */
/* Statuser (RinasakStatus.Status)                                     */
/* ------------------------------------------------------------------ */

export interface StatusInfo {
  id: StatusId;
  label: string;
  tone: Tone;
  text: string;
  /** Jobs or events that set the status. */
  into: string[];
  next: StatusId[];
  /** No job picks the case up again. */
  final?: boolean;
  unused?: boolean;
}

export const STATUSES: StatusInfo[] = [
  {
    id: "NY_SAK",
    label: "Ny sak uten SED",
    tone: "accent",
    text: "Saken ble lagret da den første sakshendelsen kom. Etter 15 dager spør til-sletting RINA om saken kan slettes. Nye sakshendelser oppdaterer bare endretTidspunkt – statusen og 15-dagersklokken står.",
    into: ["sakshendelse"],
    next: ["TIL_SLETTING", "KAN_IKKE_SLETTES", "DOKUMENT_SENT"],
  },
  {
    id: "TIL_SLETTING",
    label: "Klar for sletting",
    tone: "warning",
    text: "RINA tilbyr handlingen Delete_Case på saken. Neste kjøring av slett (kl. 01.00) sletter den via eux-rina-terminator-api.",
    into: ["til-sletting"],
    next: ["SLETTET", "NOT_FOUND", "SLETTING_FEILET_RETRY", "DOKUMENT_SENT"],
  },
  {
    id: "SLETTING_FEILET_RETRY",
    label: "Nytt forsøk neste natt",
    tone: "warning",
    text: "Første forsøk på å slette feilet med noe annet enn 404. slett prøver én gang til neste natt.",
    into: ["slett"],
    next: ["SLETTET", "NOT_FOUND", "SLETTING_FEILET", "DOKUMENT_SENT"],
  },
  {
    id: "SLETTET",
    label: "Slettet i RINA",
    tone: "success",
    text: "eux-rina-terminator-api utførte Delete_Case i RINA og svarte 204. Saken finnes ikke lenger i RINA.",
    into: ["slett"],
    next: [],
    final: true,
  },
  {
    id: "NOT_FOUND",
    label: "Fantes ikke i RINA",
    tone: "info",
    text: "RINA svarte 404 da slett skulle slette saken – den var allerede borte. Ingen jobb ser på saken igjen.",
    into: ["slett"],
    next: [],
    final: true,
  },
  {
    id: "SLETTING_FEILET",
    label: "Ga opp",
    tone: "danger",
    text: "Også det andre forsøket feilet. Ingen jobb plukker opp saken igjen, men den telles i månedsrapporten.",
    into: ["slett"],
    next: [],
    final: true,
  },
  {
    id: "KAN_IKKE_SLETTES",
    label: "Skal ikke slettes",
    tone: "neutral",
    text: "RINA tilbød ikke Delete_Case, eller statussjekken feilet – også ved 404. Saken sjekkes bare én gang og blir liggende med denne statusen.",
    into: ["til-sletting"],
    next: [],
    final: true,
  },
  {
    id: "DOKUMENT_SENT",
    label: "Har SED",
    tone: "meta-purple",
    text: "Det er sendt eller mottatt en SED i saken (SENT_DOCUMENT eller RECEIVE_DOCUMENT). Hendelsen setter denne statusen uansett hva saken hadde fra før – også SLETTET og de andre endelige statusene. Ingen jobb ser på saken etterpå.",
    into: ["dokumenthendelse"],
    next: [],
    final: true,
  },
  {
    id: "KORRUPT",
    label: "Ubrukt",
    tone: "neutral",
    text: "Finnes i enumen, men ingen kode setter eller leser statusen.",
    into: [],
    next: [],
    unused: true,
  },
];

export const STATUS_BY_ID = Object.fromEntries(STATUSES.map((s) => [s.id, s])) as Record<StatusId, StatusInfo>;

/* ------------------------------------------------------------------ */
/* NAIS-jobber (eux-slett-usendte-rinasaker-naisjob/.nais)             */
/* ------------------------------------------------------------------ */

export type Freq = "daily" | "monthly" | "never";
export interface Sched {
  cron: string;
  h: number;
  m: number;
  freq: Freq;
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
  sched: Record<Env, Sched>;
}

const daily = (h: number): Sched => ({ cron: `0 ${h} * * *`, h, m: 0, freq: "daily" });
const all = (s: Sched): Record<Env, Sched> => ({ prod: s, q1: s, q2: s });
const never: Sched = { cron: "0 0 31 2 *", h: 0, m: 0, freq: "never", label: "aldri (31. februar)" };

export const JOBS: Job[] = [
  {
    id: "slett",
    no: 1,
    app: "eux-slett-usendte-rinasaker-slett-naisjob",
    title: "Slett i RINA",
    from: ["TIL_SLETTING", "SLETTING_FEILET_RETRY"],
    to: ["SLETTET", "NOT_FOUND", "SLETTING_FEILET_RETRY", "SLETTING_FEILET"],
    text: "Sletter alle saker med TIL_SLETTING eller SLETTING_FEILET_RETRY, én om gangen. Kjører før til-sletting, så saker som merkes i natt, slettes neste natt.",
    rina: "DELETE /api/v1/rinasaker/{id}",
    sched: all(daily(1)),
  },
  {
    id: "til-sletting",
    no: 2,
    app: "eux-slett-usendte-rinasaker-til-sletting-naisjob",
    title: "Finn usendte saker",
    from: ["NY_SAK"],
    to: ["TIL_SLETTING", "KAN_IKKE_SLETTES"],
    text: "Finner saker som fortsatt er NY_SAK 15 dager etter at de ble lagret, og spør RINA om hver av dem kan slettes.",
    rina: "GET /api/v1/rinasaker/{id}/status",
    sched: all(daily(2)),
  },
  {
    id: "rapport",
    no: 3,
    app: "eux-slett-usendte-rinasaker-rapport-naisjob",
    title: "Månedsrapport",
    from: [],
    to: [],
    text: "Teller opp forrige måned og køen nå, og sender en melding til Slack.",
    sched: {
      prod: { cron: "0 6 1 * *", h: 6, m: 0, freq: "monthly", label: "den 1. kl. 06.00" },
      q1: never,
      q2: never,
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

export const schedLabel = (s: Sched): string => {
  if (s.freq === "daily") return `hver dag kl. ${klokke(s.h, s.m)}`;
  return s.label ?? s.cron;
};

export const differsFromProd = (j: Job, env: Env): boolean => j.sched.prod.cron !== j.sched[env].cron;
