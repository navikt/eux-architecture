"use client";

import { useState } from "react";
import { BodyShort, Chips, Table, TextField } from "@navikt/ds-react";
import { BUCS, FAMILIES, FAMILY_BY_ID, sedTypesFor, type BucRule, type Family, type Scope } from "./data";

type Part = { label: string; seds?: string[]; days?: number };

function ruleParts(b: BucRule): Part[] {
  const parts: Part[] = [];
  if (b.sisteSed.length) parts.push({ label: b.krevesSendtFraNav ? "Siste SED, sendt fra NAV" : "Siste SED", seds: b.sisteSed });
  if (b.sedExists.length) parts.push({ label: "Finnes", seds: b.sedExists });
  if (b.mottatt.length) parts.push({ label: "«Mottatt»", seds: b.mottatt });
  if (b.sendt.length) parts.push({ label: "«Sendt»", seds: b.sendt });
  if (b.fallback !== null) parts.push({ label: "Ellers etter", days: b.fallback });
  return parts;
}

function ScopeCell({ scope }: { scope: Scope | null }) {
  return (
    <span className="avs-scope" data-scope={scope ?? "none"}>
      {scope ?? "motparten"}
    </span>
  );
}

export function BucTable({ selected, onPick }: { selected: string; onPick: (buc: string) => void }) {
  const [families, setFamilies] = useState<Family[]>([]);
  const [q, setQ] = useState("");
  const query = q.trim().toUpperCase();

  const rows = BUCS.filter(
    (b) =>
      (families.length === 0 || families.includes(b.family)) &&
      (!query || b.navn.includes(query) || sedTypesFor(b).some((t) => t.includes(query))),
  );
  const toggleFamily = (f: Family) => setFamilies((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));

  return (
    <div className="avs-buctable">
      <div className="avs-buctable__filters">
        <Chips size="small" aria-label="Filtrer på familie">
          {FAMILIES.map((f) => (
            <Chips.Toggle key={f.id} selected={families.includes(f.id)} onClick={() => toggleFamily(f.id)}>
              {f.label}
            </Chips.Toggle>
          ))}
        </Chips>
        <TextField
          label="Søk på BUC eller SED"
          hideLabel
          placeholder="Søk på BUC eller SED, f.eks. H070"
          size="small"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="avs-buctable__search"
        />
        <BodyShort size="small" className="arch-subtle" aria-live="polite">
          {rows.length} av {BUCS.length}
        </BodyShort>
      </div>
      <div className="arch-table">
        <Table size="small">
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell scope="col">BUC</Table.HeaderCell>
              <Table.HeaderCell scope="col" align="right">
                Uvirksom etter
              </Table.HeaderCell>
              <Table.HeaderCell scope="col">Hva avslutter saken</Table.HeaderCell>
              <Table.HeaderCell scope="col">NAV er sakseier</Table.HeaderCell>
              <Table.HeaderCell scope="col">NAV er motpart</Table.HeaderCell>
              <Table.HeaderCell scope="col" align="right">
                Arkiveres etter
              </Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.map((b) => (
              <Table.Row key={b.navn} selected={b.navn === selected} className="avs-buctable__row">
                <Table.HeaderCell scope="row">
                  <button type="button" className="avs-buclink" data-tone={FAMILY_BY_ID[b.family].tone} onClick={() => onPick(b.navn)} title="Prøv i simulatoren">
                    <span className="avs-buclink__dot" aria-hidden />
                    <span className="arch-mono">{b.navn}</span>
                  </button>
                </Table.HeaderCell>
                <Table.DataCell align="right" className="arch-mono">
                  {b.uvirksom} d
                </Table.DataCell>
                <Table.DataCell>
                  <span className="avs-rule">
                    {ruleParts(b).map((p) => (
                      <span key={p.label} className="avs-rule__part">
                        <span className="arch-subtle">{p.label}</span>{" "}
                        {p.seds?.map((s) => (
                          <span key={s} className="avs-rung__sed arch-mono">
                            {s}
                          </span>
                        ))}
                        {p.days !== undefined && <span className="arch-mono">{p.days} d</span>}
                      </span>
                    ))}
                  </span>
                </Table.DataCell>
                <Table.DataCell>
                  <ScopeCell scope={b.sakseier} />
                </Table.DataCell>
                <Table.DataCell>
                  <ScopeCell scope={b.motpart} />
                </Table.DataCell>
                <Table.DataCell align="right" className={`arch-mono ${b.arkivering !== 180 ? "avs-buctable__odd" : ""}`}>
                  {b.arkivering} d
                </Table.DataCell>
              </Table.Row>
            ))}
            {rows.length === 0 && (
              <Table.Row>
                <Table.DataCell colSpan={6}>
                  <BodyShort size="small" className="arch-subtle">
                    Ingen BUC-er passer søket.
                  </BodyShort>
                </Table.DataCell>
              </Table.Row>
            )}
          </Table.Body>
        </Table>
      </div>
    </div>
  );
}
