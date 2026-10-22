import type { ReactNode } from "react";

/** A two-column list of labelled facts, used in detail panels, job cards and operations cards. */
export function Facts({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={className ? `proc-facts ${className}` : "proc-facts"}>{children}</dl>;
}

export function Fact({ term, mono, children }: { term: ReactNode; mono?: boolean; children: ReactNode }) {
  return (
    <div>
      <dt>{term}</dt>
      <dd className={mono ? "arch-mono" : undefined}>{children}</dd>
    </div>
  );
}
