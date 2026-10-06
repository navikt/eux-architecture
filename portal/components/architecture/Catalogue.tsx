"use client";

import { useMemo, useState } from "react";
import { BodyShort, Button, Heading, HStack, Link as DsLink, Search, Tag } from "@navikt/ds-react";
import { ExternalLinkIcon } from "@navikt/aksel-icons";
import { NODES, incoming, outgoing, type ArchNode, type Zone } from "./data";

const LAYERS: { title: string; zones: Zone[]; tone: string }[] = [
  { title: "Frontend og orkestrering", zones: ["frontend", "orkestrering"], tone: "accent" },
  { title: "Domenetjenester", zones: ["domene"], tone: "success" },
  { title: "RINA-integrasjon", zones: ["rina-integrasjon"], tone: "info" },
  { title: "Hendelsesinfrastruktur", zones: ["hendelser"], tone: "meta-purple" },
  { title: "Bakgrunnstjenester", zones: ["bakgrunn"], tone: "meta-lime" },
  { title: "NAIS-jobber", zones: ["jobber"], tone: "warning" },
];

const matches = (n: ArchNode, q: string) => {
  if (!q) return true;
  const hay = `${n.name} ${n.summary} ${(n.facts ?? []).join(" ")} ${n.lang ?? ""}`.toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((t) => hay.includes(t));
};

export function Catalogue({ onFocusNode }: { onFocusNode: (id: string) => void }) {
  const [q, setQ] = useState("");
  const groups = useMemo(
    () =>
      LAYERS.map((l) => ({
        ...l,
        nodes: NODES.filter((n) => (n.kind === "app" || n.kind === "job") && l.zones.includes(n.zone) && matches(n, q)),
      })),
    [q],
  );
  const total = groups.reduce((s, g) => s + g.nodes.length, 0);

  return (
    <div className="arch-catalogue">
      <HStack gap="space-16" align="end" wrap>
        <div style={{ flex: "1 1 280px", maxWidth: 420 }}>
          <Search
            label="Filtrer tjenester"
            description="Søk i navn, beskrivelse og fakta, f.eks. «kafka», «pdl» eller «kotlin»."
            variant="simple"
            size="small"
            placeholder="Søk etter navn, teknologi eller system"
            value={q}
            onChange={setQ}
            onClear={() => setQ("")}
          />
        </div>
        <BodyShort size="small" className="arch-subtle" aria-live="polite">
          {total} treff
        </BodyShort>
      </HStack>

      {groups
        .filter((g) => g.nodes.length > 0)
        .map((g) => (
          <section key={g.title} className="arch-catalogue__group" aria-label={g.title}>
            <Heading level="3" size="xsmall" className="arch-catalogue__title" data-tone={g.tone}>
              {g.title}
              <span className="arch-subtle"> · {g.nodes.length}</span>
            </Heading>
            <div className="arch-catalogue__grid">
              {g.nodes.map((n) => {
                const ins = incoming(n.id).length;
                const outs = outgoing(n.id).length;
                return (
                  <article key={n.id} className="arch-card" data-tone={g.tone}>
                    <HStack justify="space-between" align="start" gap="space-8" wrap={false}>
                      <BodyShort weight="semibold" className="arch-mono arch-card__name">
                        {n.name}
                      </BodyShort>
                      <HStack gap="space-4" wrap={false}>
                        {n.lang && (
                          <Tag size="xsmall" variant="moderate" data-color="neutral">
                            {n.lang}
                          </Tag>
                        )}
                        {n.db && (
                          <Tag size="xsmall" variant="moderate" data-color="success">
                            DB
                          </Tag>
                        )}
                      </HStack>
                    </HStack>
                    <BodyShort size="small" className="arch-card__summary">
                      {n.summary}
                    </BodyShort>
                    <HStack justify="space-between" align="center" gap="space-8" className="arch-card__footer">
                      <span className="arch-card__io arch-mono" title="Innkommende og utgående koblinger">
                        ↘ {ins} &nbsp; ↗ {outs}
                      </span>
                      <HStack gap="space-8" align="center">
                        {n.repo && (
                          <DsLink href={`https://github.com/navikt/${n.repo}`} target="_blank" rel="noreferrer" className="arch-card__gh">
                            GitHub <ExternalLinkIcon aria-hidden />
                          </DsLink>
                        )}
                        <Button size="xsmall" variant="tertiary" onClick={() => onFocusNode(n.id)}>
                          Vis i kartet
                        </Button>
                      </HStack>
                    </HStack>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      {total === 0 && (
        <BodyShort className="arch-subtle">
          Ingen tjenester matcher «{q}». <Button size="xsmall" variant="tertiary" onClick={() => setQ("")}>Nullstill filter</Button>
        </BodyShort>
      )}
    </div>
  );
}
