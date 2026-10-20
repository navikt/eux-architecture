import type { ReactNode } from "react";
import { ExternalLinkIcon } from "@navikt/aksel-icons";

/** An inline link that opens in a new tab, marked with an icon that screen readers announce. */
export function ExtLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      {children} <ExternalLinkIcon title="åpnes i ny fane" />
    </a>
  );
}
