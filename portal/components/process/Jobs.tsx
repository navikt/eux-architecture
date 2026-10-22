import type { ReactNode } from "react";
import { BodyLong, BodyShort } from "@navikt/ds-react";
import { ArrowRightIcon } from "@navikt/aksel-icons";
import { until, type NextRun } from "./time";

/** The small round job number used in job lists, tables, legends and actor lists. */
export function JobNo({ children, inline, tone, hidden }: { children: ReactNode; inline?: boolean; tone?: "accent"; hidden?: boolean }) {
  return (
    <span className={inline ? "proc-jobno proc-jobno--inline" : "proc-jobno"} data-tone={tone} aria-hidden={hidden || undefined}>
      {children}
    </span>
  );
}

/** «these statuses → those statuses», with the feature's own status chips on each side. */
export function JobFlow({ from, to }: { from: ReactNode; to: ReactNode }) {
  return (
    <div className="proc-jobflow">
      {from}
      <ArrowRightIcon aria-hidden className="arch-subtle" />
      {to}
    </div>
  );
}

type JobCardProps = {
  no: number;
  title: string;
  /** The job or CronJob name, shown in monospace under the title. */
  name: string;
  /** The schedule in short form, e.g. «01.00». */
  time: string;
  /** The next run, or null while the clock is not known yet. `where` goes in front of the countdown, e.g. «i prod ». */
  run: NextRun | null;
  where?: string;
  text: string;
  focused: boolean;
  onFocusChange: (focused: boolean) => void;
  className?: string;
  /** Dashed and greyed out, for a job that does not run in the selected environment. */
  off?: boolean;
  children?: ReactNode;
};

/** One card in a night-job list: number, name, schedule, a live countdown to the next run and a description. */
export function JobCard({ no, title, name, time, run, where = "", text, focused, onFocusChange, className, off, children }: JobCardProps) {
  return (
    <li
      className={["proc-job", className, focused && "is-focus"].filter(Boolean).join(" ")}
      data-off={off || undefined}
      onMouseEnter={() => onFocusChange(true)}
      onMouseLeave={() => onFocusChange(false)}
      onFocus={() => onFocusChange(true)}
      onBlur={() => onFocusChange(false)}
    >
      <div className="proc-job__head">
        <JobNo>{no}</JobNo>
        <span className="proc-job__name">
          <strong>{title}</strong>
          <span className="arch-mono">{name}</span>
        </span>
        <span className="proc-job__time arch-mono">{time}</span>
      </div>
      <BodyShort size="small" className="proc-job__next" aria-live="polite">
        <span className="proc-job__dot" aria-hidden />
        {run ? (
          <>
            Neste kjøring {where}
            <strong>{until(run.mins)}</strong> <span className="arch-subtle">· {run.label}</span>
          </>
        ) : (
          <span className="arch-subtle">Regner ut neste kjøring …</span>
        )}
      </BodyShort>
      <BodyLong size="small">{text}</BodyLong>
      {children}
    </li>
  );
}
