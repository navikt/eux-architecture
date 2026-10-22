import type { ReactNode } from "react";
import { Accordion, BodyLong, Heading } from "@navikt/ds-react";

export type Pitfall = { title: string; body: ReactNode };
export type PitfallGroup = { group: string; items: Pitfall[] };

/** The "Fallgruver" accordions, one column per group. */
export function Pitfalls({ groups, className }: { groups: readonly PitfallGroup[]; className?: string }) {
  return (
    <div className={className ? `arch-pitfalls ${className}` : "arch-pitfalls"}>
      {groups.map((g) => (
        <div key={g.group}>
          <Heading level="3" size="small" spacing>
            {g.group}
          </Heading>
          <Accordion size="small">
            {g.items.map((p) => (
              <Accordion.Item key={p.title}>
                <Accordion.Header>{p.title}</Accordion.Header>
                <Accordion.Content>
                  <BodyLong as="div" size="small">
                    {p.body}
                  </BodyLong>
                </Accordion.Content>
              </Accordion.Item>
            ))}
          </Accordion>
        </div>
      ))}
    </div>
  );
}
