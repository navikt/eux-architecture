/**
 * Clock and schedule helpers shared by the process pages and the night
 * timeline. Everything here is pure, so server components may import it; the
 * ticking clock hook lives in `useOsloNow.ts`.
 */

/** Wall-clock time in Europe/Oslo. Months are 1-based. */
export type OsloTime = { y: number; mo: number; d: number; h: number; m: number };

/** The next run of a job: minutes from now and a label such as "i morgen kl. 01.00". */
export type NextRun = { mins: number; label: string };

const DAY_MINS = 24 * 60;

export const MONTHS = ["januar", "februar", "mars", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "desember"];

/** Rounds to two decimals, so server- and client-rendered SVG attributes match exactly. */
export const r2 = (n: number) => Math.round(n * 100) / 100;

const pad = (n: number) => String(n).padStart(2, "0");

/** 24-hour clock, e.g. "01:00". */
export const hhmm = (h: number, m = 0) => `${pad(h)}:${pad(m)}`;

/** Norwegian clock format, e.g. "01.00". */
export const klokke = (h: number, m = 0) => `${pad(h)}.${pad(m)}`;

/**
 * When a cron with a fixed time runs: hour, minute, and whether it is limited to one day of the month.
 * Takes the five-field NAIS form ("5 0 1 * *") and Spring's six-field form, which starts with seconds ("0 0 22 * * ?").
 */
export function cronTime(cron: string): { h: number; m: number; monthly: boolean } {
  const fields = cron.trim().split(/\s+/);
  const [m, h, dom] = fields.length === 6 ? fields.slice(1) : fields;
  return { h: Number(h), m: Number(m), monthly: dom !== "*" && dom !== "?" };
}

/** Relative time in Norwegian, e.g. "om 2 t 5 min" or "om 12 dager". */
export function until(mins: number): string {
  if (mins >= 2 * DAY_MINS) return `om ${Math.round(mins / DAY_MINS)} dager`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `om ${m} min`;
  return m === 0 ? `om ${h} t` : `om ${h} t ${m} min`;
}

const OSLO_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Oslo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function osloNow(date = new Date()): OsloTime {
  const parts = OSLO_FORMAT.formatToParts(date);
  const get = (t: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { y: get("year"), mo: get("month"), d: get("day"), h: get("hour"), m: get("minute") };
}

/** Next run of a daily job at h:m. A job due right now counts as tomorrow's run. */
export function nextDaily(now: OsloTime, h: number, m: number): NextRun {
  const nowMin = now.h * 60 + now.m;
  const mins = (h * 60 + m - nowMin + DAY_MINS) % DAY_MINS || DAY_MINS;
  return { mins, label: `${mins > DAY_MINS - nowMin ? "i morgen" : "i dag"} kl. ${klokke(h, m)}` };
}

/**
 * Next run on a fixed day of the month at h:m. With `month` (1-based) the job
 * runs once a year, otherwise every month.
 */
export function nextOnDay(now: OsloTime, at: { day: number; month?: number; h: number; m: number }): NextRun {
  const { day, month, h, m } = at;
  const base = Date.UTC(now.y, now.mo - 1, now.d, now.h, now.m);
  const run =
    month === undefined
      ? (step: number) => Date.UTC(now.y, now.mo - 1 + step, day, h, m)
      : (step: number) => Date.UTC(now.y + step, month - 1, day, h, m);
  const target = run(0) > base ? run(0) : run(1);
  return {
    mins: Math.round((target - base) / 60_000),
    label: `${day}. ${MONTHS[new Date(target).getUTCMonth()]} kl. ${klokke(h, m)}`,
  };
}
