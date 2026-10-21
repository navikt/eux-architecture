"use client";

import type { CSSProperties, ReactNode } from "react";
import { BodyShort, Detail, Heading } from "@navikt/ds-react";
import {
  CheckmarkCircleIcon,
  CircleSlashIcon,
  ExclamationmarkTriangleIcon,
  MinusCircleIcon,
  XMarkOctagonIcon,
} from "@navikt/aksel-icons";
import { deepEqual } from "@/lib/equal";
import type { Tone } from "@/lib/tones";

/*
 * Building blocks for the process-page simulators: example buttons, the form card,
 * the ladder of steps or criteria, and the sticky result card. Lay them out as
 *
 *   <div className="proc-sim">
 *     <SimPresets … />
 *     <div className="proc-sim__grid">
 *       <SimForm>…</SimForm>  <Ladder>…</Ladder>  <SimResult>…</SimResult>
 *     </div>
 *   </div>
 */

export type SimPreset<I> = { id: string; label: string; input: I };

/** "Prøv" buttons that load an example input. The one matching the current input is pressed. */
export function SimPresets<I>({ presets, value, onPick }: { presets: readonly SimPreset<I>[]; value: I; onPick: (input: I) => void }) {
  return (
    <div className="proc-presets" role="group" aria-label="Eksempler">
      <Detail className="arch-eyebrow">Prøv</Detail>
      {presets.map((p) => (
        <button key={p.id} type="button" className="proc-preset" aria-pressed={deepEqual(p.input, value)} onClick={() => onPick(p.input)}>
          {p.label}
        </button>
      ))}
    </div>
  );
}

/** The input card on the left. */
export function SimForm({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={className ? `arch-card proc-sim__form ${className}` : "arch-card proc-sim__form"} data-tone="accent">
      {children}
    </div>
  );
}

/** A titled group of inputs in `SimForm`. */
export function SimGroup({ legend, disabled, children }: { legend: string; disabled?: boolean; children: ReactNode }) {
  return (
    <fieldset className="proc-sim__group" disabled={disabled}>
      <legend>{legend}</legend>
      {children}
    </fieldset>
  );
}

/**
 * How a rung turned out. Criteria (avslutning) are `hit`, `miss`, `skip` or `na`.
 * Steps (journalføring, adresse) are `done`, `warn`, `stop`, `skip` or `off`.
 */
export type RungState = "hit" | "miss" | "done" | "warn" | "stop" | "skip" | "off" | "na";

const RUNG_ICON: Record<RungState, ReactNode> = {
  hit: <CheckmarkCircleIcon aria-hidden />,
  done: <CheckmarkCircleIcon aria-hidden />,
  warn: <ExclamationmarkTriangleIcon aria-hidden />,
  miss: <XMarkOctagonIcon aria-hidden />,
  stop: <XMarkOctagonIcon aria-hidden />,
  skip: <MinusCircleIcon aria-hidden />,
  off: <CircleSlashIcon aria-hidden />,
  na: <CircleSlashIcon aria-hidden />,
};

/** The default status text for the step states. */
export const STEP_STATUS: Record<"done" | "warn" | "stop" | "skip" | "off", string> = {
  done: "OK",
  warn: "Merk",
  stop: "Stopp",
  skip: "Nås ikke",
  off: "Ikke aktuelt",
};

/** The ordered list of rungs. Changes are announced politely. */
export function Ladder({ label, children }: { label: string; children: ReactNode }) {
  return (
    <ol className="proc-ladder" aria-label={label} aria-live="polite">
      {children}
    </ol>
  );
}

/**
 * One rung. With `no`, the rung is a numbered step that rises in after the ones above it.
 * `value` is shown as a pill (and pops when it changes); otherwise `status` is shown.
 */
export function Rung({
  state,
  title,
  no,
  value,
  status,
  children,
}: {
  state: RungState;
  title: ReactNode;
  no?: number;
  value?: string;
  status?: string;
  children?: ReactNode;
}) {
  return (
    <li
      className={no ? "proc-rung proc-rung--step" : "proc-rung"}
      data-state={state}
      style={no ? ({ "--arch-delay": `${(no - 1) * 30}ms` } as CSSProperties) : undefined}
    >
      <span className="proc-rung__icon">{RUNG_ICON[state]}</span>
      <div className="proc-rung__body">
        <div className="proc-rung__head">
          <strong>
            {no && <span className="proc-rung__no">{no}</span>}
            {title}
          </strong>
          {value ? (
            <span key={value} className="proc-rung__value arch-mono">
              {value}
            </span>
          ) : (
            <span className="proc-rung__state">{status}</span>
          )}
        </div>
        {children}
      </div>
    </li>
  );
}

/** The explanation under a rung's title. */
export function RungText({ children }: { children: ReactNode }) {
  return (
    <BodyShort size="small" className="proc-rung__text">
      {children}
    </BodyShort>
  );
}

/** The sticky result card on the right, in the outcome's tone. The headline rises in when it changes. */
export function SimResult({ tone, eyebrow, headline, children }: { tone: Tone; eyebrow: string; headline?: string; children: ReactNode }) {
  return (
    <div className="proc-result" data-tone={tone} aria-live="polite">
      <Detail className="arch-eyebrow">{eyebrow}</Detail>
      {headline && (
        <Heading key={headline} level="3" size="medium" className="proc-result__headline">
          {headline}
        </Heading>
      )}
      {children}
    </div>
  );
}

/**
 * The resulting status in a pill. With `onClick` it is a button that shows the status in the diagram.
 * Give it a `key` so it pops when the status changes.
 */
export function ResultStatus({ mono = true, onClick, children }: { mono?: boolean; onClick?: () => void; children: ReactNode }) {
  const className = mono ? "proc-result__status arch-mono" : "proc-result__status";
  return onClick ? (
    <button type="button" className={className} onClick={onClick} title="Vis i statusdiagrammet">
      {children}
    </button>
  ) : (
    <span className={className}>{children}</span>
  );
}

/** The bold line under the status. */
export function ResultLabel({ children }: { children: ReactNode }) {
  return (
    <BodyShort size="small" className="proc-result__label">
      {children}
    </BodyShort>
  );
}

/** Key facts about the result, as a two-column list. */
export function ResultFacts({ facts }: { facts: readonly { k: string; v: string }[] }) {
  return (
    <dl className="proc-result__facts">
      {facts.map((f) => (
        <div key={f.k}>
          <dt>{f.k}</dt>
          <dd className="arch-mono">{f.v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A small italic note at the end of the result card. */
export function ResultCaveat({ children }: { children: ReactNode }) {
  return (
    <BodyShort size="small" className="arch-subtle proc-result__caveat">
      {children}
    </BodyShort>
  );
}
