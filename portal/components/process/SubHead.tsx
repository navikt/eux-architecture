import type { ReactNode } from "react";
import { BodyShort, Heading } from "@navikt/ds-react";

/** A level-3 heading inside a section, with an optional subtle line under it. */
export function SubHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="proc-subhead">
      <Heading level="3" size="small">
        {title}
      </Heading>
      {children && (
        <BodyShort size="small" className="arch-subtle">
          {children}
        </BodyShort>
      )}
    </div>
  );
}
