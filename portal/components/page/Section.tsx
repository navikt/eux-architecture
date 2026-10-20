import type { ReactNode } from "react";
import { BodyLong, Detail, Heading } from "@navikt/ds-react";

/*
 * A titled page section. scripts/search-index.mjs indexes every <Section> with
 * literal `id` and `title` props as its own search hit, so keep the tag name
 * and pass those props as string literals.
 */
export function Section({
  id,
  eyebrow,
  title,
  lead,
  aside,
  className,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  lead?: ReactNode;
  /** Shown to the right of the heading, for example a "see all" link. */
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const titleId = `${id}-title`;
  const intro = (
    <>
      <Detail className="arch-eyebrow">{eyebrow}</Detail>
      <Heading level="2" size="large" id={titleId}>
        {title}
      </Heading>
      {lead && <BodyLong className="arch-section__lead">{lead}</BodyLong>}
    </>
  );

  return (
    <section id={id} className={className ? `arch-section ${className}` : "arch-section"} aria-labelledby={titleId}>
      {aside ? (
        <header className="arch-section__head arch-section__head--aside">
          <div>{intro}</div>
          {aside}
        </header>
      ) : (
        <header className="arch-section__head">{intro}</header>
      )}
      {children}
    </section>
  );
}
