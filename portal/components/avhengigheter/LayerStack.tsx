"use client";

import { useState, type CSSProperties } from "react";
import { BodyLong, Detail, Heading } from "@navikt/ds-react";
import { LAYERS, type LayerId } from "./data";
import { useInView } from "@/components/ny-i-teamet/hooks";

/**
 * Tre lag oppå hverandre: Spring Boot nederst, eux-parent-pom i midten og
 * app-POM-en øverst. Velg et lag for å se hva det eier.
 *
 * Alle detaljpanelene ligger i samme rutenettcelle, så høyden er stabil og
 * lagene flytter seg aldri under markøren.
 */
export function LayerStack() {
  const [active, setActive] = useState<LayerId>("parent");
  const [ref, inView] = useInView<HTMLDivElement>(0.3);

  return (
    <div ref={ref} className="avh-stack" data-in={inView || undefined}>
      <div className="avh-stack__pile" role="group" aria-label="Velg et lag">
        {LAYERS.map((l, i) => (
          <button
            key={l.id}
            type="button"
            className="avh-slab"
            data-tone={l.tone}
            aria-pressed={active === l.id}
            onClick={() => setActive(l.id)}
            onPointerEnter={(e) => e.pointerType === "mouse" && setActive(l.id)}
            style={{ "--i": LAYERS.length - 1 - i } as CSSProperties}
          >
            <span className="avh-slab__role">{l.role}</span>
            <span className="avh-slab__name">{l.name}</span>
            <code className="avh-slab__code">{l.code}</code>
          </button>
        ))}
      </div>

      <div className="avh-stack__details" aria-live="polite">
        {LAYERS.map((l) => {
          const on = l.id === active;
          return (
            <div key={l.id} className="avh-stack__detail" data-tone={l.tone} data-on={on || undefined} inert={!on}>
              <Detail className="arch-eyebrow">{l.role}</Detail>
              <Heading level="3" size="medium" spacing>
                {l.name}
              </Heading>
              <BodyLong spacing>{l.text}</BodyLong>
              <Detail className="avh-stack__owns-title">Eier</Detail>
              <ul className="avh-stack__owns">
                {l.owns.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
