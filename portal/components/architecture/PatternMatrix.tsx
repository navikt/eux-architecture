"use client";

import { useState } from "react";
import { BodyShort } from "@navikt/ds-react";
import { NODES, NODE_BY_ID, incoming, outgoing, type ArchNode } from "./data";

const OPENAPI = new Set([
  "eux-nav-rinasak",
  "eux-journal",
  "eux-oppgave",
  "eux-relaterte-rinasaker",
  "eux-journalarkivar",
  "eux-rina-terminator-api",
]);

const CAFFEINE = new Set(["eux-neessi", "eux-rina-api", "eux-fagmodul-journalfoering", "eux-rina-terminator-api"]);

const RETRY: Record<string, string> = {
  "eux-rina-api": "@Retryable",
  "eux-rina-case-search": "@Retryable",
  "eux-legacy-rina-events": "@Retryable",
  "eux-fagmodul-journalfoering": "@Retryable",
  "eux-journalarkivar": "@Retryable",
  "eux-barnetrygd": "@Retryable",
  "eux-adresse-oppdatering": "@Retryable",
  "eux-person-oppdatering": "@Retryable",
  "eux-oppgave": "Spring Retry",
  "eux-neessi": "Resilience4j",
};

const STARTER_PARENT = new Set(["eux-all-rina-events", "eux-legacy-rina-events", "eux-rina-case-search"]);
const LOGGING_JOBS = new Set(["eux-journalarkivar-naisjob", "eux-slett-usendte-rinasaker-naisjob"]);

type Cell = boolean | string | null;

const COLUMNS: { id: string; label: string; title: string; value: (n: ArchNode) => Cell }[] = [
  { id: "lang", label: "Språk", title: "Programmeringsspråk", value: (n) => n.lang ?? null },
  { id: "db", label: "PostgreSQL", title: "PostgreSQL (Cloud SQL) med Flyway", value: (n) => !!n.db },
  { id: "openapi", label: "OpenAPI", title: "OpenAPI-kodegenerering og flermodul-Maven", value: (n) => OPENAPI.has(n.id) },
  {
    id: "kin",
    label: "Kafka inn",
    title: "Konsumerer Kafka",
    value: (n) => incoming(n.id).some((e) => e.kind === "event" && NODE_BY_ID[e.from].kind === "topic"),
  },
  {
    id: "kout",
    label: "Kafka ut",
    title: "Produserer til Kafka",
    value: (n) => outgoing(n.id).some((e) => e.kind === "event" && NODE_BY_ID[e.to].kind === "topic"),
  },
  {
    id: "gql",
    label: "GraphQL",
    title: "GraphQL-klient mot PDL og/eller SAF",
    value: (n) => outgoing(n.id).some((e) => e.to === "pdl" || e.to === "saf"),
  },
  { id: "cache", label: "Caffeine", title: "Caching i minnet med Caffeine", value: (n) => CAFFEINE.has(n.id) },
  { id: "retry", label: "Retry", title: "Mekanisme for nye forsøk", value: (n) => RETRY[n.id] ?? false },
  {
    id: "log",
    label: "eux-logging",
    title: "MDC-basert sporing med eux-logging",
    value: (n) => (n.kind === "app" && n.lang === "Kotlin") || LOGGING_JOBS.has(n.id),
  },
  {
    id: "parent",
    label: "Parent POM",
    title: "Maven-parent",
    value: (n) => (n.lang === "TypeScript" ? null : STARTER_PARENT.has(n.id) ? "starter-parent" : "eux-parent-pom"),
  },
];

const ROWS = NODES.filter((n) => n.kind === "app" || n.kind === "job");

const truthy = (c: Cell) => c !== false && c !== null;

export function PatternMatrix({ onFocusNode }: { onFocusNode: (id: string) => void }) {
  const [col, setCol] = useState<string | null>(null);
  const column = COLUMNS.find((c) => c.id === col) ?? null;
  const count = column ? ROWS.filter((n) => truthy(column.value(n)) && column.id !== "lang").length : 0;

  return (
    <div className="arch-matrix">
      <BodyShort size="small" className="arch-subtle" aria-live="polite" spacing>
        {column && column.id !== "lang" && column.id !== "parent"
          ? `${column.title}: ${count} av ${ROWS.length}.`
          : "Klikk på en kolonne for å se hvilke tjenester som bruker mønsteret."}
      </BodyShort>
      <div className="arch-matrix__scroll">
        <table>
          <thead>
            <tr>
              <th scope="col" className="arch-matrix__name">
                Tjeneste
              </th>
              {COLUMNS.map((c) => (
                <th key={c.id} scope="col" className={col === c.id ? "is-col" : undefined}>
                  <button type="button" title={c.title} aria-pressed={col === c.id} onClick={() => setCol(col === c.id ? null : c.id)}>
                    {c.label}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((n) => {
              const dim = column && column.id !== "lang" && column.id !== "parent" && !truthy(column.value(n));
              return (
                <tr key={n.id} className={dim ? "is-dim" : undefined}>
                  <th scope="row" className="arch-matrix__name">
                    <button type="button" className="arch-mono" onClick={() => onFocusNode(n.id)} title="Vis detaljer">
                      {n.name}
                    </button>
                  </th>
                  {COLUMNS.map((c) => {
                    const v = c.value(n);
                    return (
                      <td key={c.id} className={col === c.id ? "is-col" : undefined}>
                        {v === true ? (
                          <span className="arch-matrix__dot" aria-label="Ja" role="img" />
                        ) : v === false || v === null ? (
                          <span className="arch-matrix__none" aria-label="Nei">
                            ·
                          </span>
                        ) : (
                          <span className={c.id === "lang" ? "arch-matrix__lang" : "arch-matrix__text arch-mono"} data-lang={c.id === "lang" ? v : undefined}>
                            {v}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
