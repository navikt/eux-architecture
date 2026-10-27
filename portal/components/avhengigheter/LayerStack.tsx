"use client";

import { useState, type CSSProperties } from "react";
import { BodyLong, Detail, Heading } from "@navikt/ds-react";
import { LAYERS, type LayerId } from "./data";
import { useInView } from "@/components/ny-i-teamet/hooks";

/**
 * Tre lag oppå hverandre: Spring Boot nederst, eux-parent-pom i midten og
 * app-POM-en øverst. Versjoner stiger opp gjennom lagene. Velg et lag for å se
 * hva det eier.
 */
export function LayerStack() {
  const [active, setActive] = useState<LayerId>("parent");
  const [ref, inView] = useInView<HTMLDivElement>(0.3);
  const layer = LAYERS.find((l) => l.id === active) ?? LAYERS[1];

  return (
    <div ref={ref} className="avh-stack" data-in={inView || undefined}>
      <div className="avh-stack__pile" role="group" aria-label="Velg et lag">
        <span className="avh-stack__stream" aria-hidden>
          {Array.from({ length: 5 }, (_, i) => (
            <i key={i} style={{ "--i": i } as CSSProperties} />
          ))}
        </span>
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

      <div className="avh-stack__detail" data-tone={layer.tone} aria-live="polite" key={layer.id}>
        <Detail className="arch-eyebrow">{layer.role}</Detail>
        <Heading level="3" size="medium" spacing>
          {layer.name}
        </Heading>
        <BodyLong spacing>{layer.text}</BodyLong>
        <Detail className="avh-stack__owns-title">Eier</Detail>
        <ul className="avh-stack__owns">
          {layer.owns.map((o, i) => (
            <li key={o} style={{ "--i": i } as CSSProperties}>
              {o}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
