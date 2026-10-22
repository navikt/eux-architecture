import { CopyButton } from "@navikt/ds-react";

/** A one-line command, query or log phrase with a copy button. */
export function Snippet({ children }: { children: string }) {
  return (
    <div className="proc-snippet">
      <code>{children}</code>
      <CopyButton copyText={children} size="xsmall" />
    </div>
  );
}
