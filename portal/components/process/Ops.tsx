import type { ReactNode } from "react";
import { Heading } from "@navikt/ds-react";
import type { Tone } from "@/lib/tones";

/** The two-column «Drift» layout at the end of each process page. */
export function OpsGrid({ children }: { children: ReactNode }) {
  return <div className="proc-ops">{children}</div>;
}

export function OpsColumn({ children }: { children: ReactNode }) {
  return <div className="proc-ops__col">{children}</div>;
}

/** A toned card with a small heading, e.g. «Endepunktet» or «Kjøre en jobb manuelt». */
export function OpsCard({ tone, title, children }: { tone: Tone; title: string; children: ReactNode }) {
  return (
    <article className="arch-card proc-ops__card" data-tone={tone}>
      <Heading level="3" size="xsmall">
        {title}
      </Heading>
      {children}
    </article>
  );
}

/** Inline monospace pills, e.g. the valid process names of an endpoint. */
export function OpsValues({ values }: { values: readonly string[] }) {
  return (
    <ul className="proc-ops__values">
      {values.map((v) => (
        <li key={v} className="arch-mono">
          {v}
        </li>
      ))}
    </ul>
  );
}
