"use client";

import { useState } from "react";
import { BodyLong, BodyShort, Button, Detail, Heading, Select, ToggleGroup } from "@navikt/ds-react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowsCirclepathIcon,
  CheckmarkCircleIcon,
  CircleSlashIcon,
  MinusCircleIcon,
  PlusIcon,
  XMarkIcon,
  XMarkOctagonIcon,
} from "@navikt/aksel-icons";
import {
  BUCS,
  BUC_BY_NAME,
  CRITERION_BY_ID,
  FAMILIES,
  STATUS_BY_ID,
  evaluate,
  type BucRule,
  type CritState,
  type Dir,
  type Role,
  type SimDoc,
  type StatusId,
} from "./data";

const OTHER = "ANNEN";

function preset(b: BucRule): SimDoc[] {
  const first = b.sisteSed[0] ?? b.sedExists[0] ?? b.mottatt[0] ?? b.sendt[0];
  const dir: Dir = b.krevesSendtFraNav || (b.sendt.length > 0 && b.mottatt.length === 0) ? "SENT" : "MOTTATT";
  return [
    { key: 1, type: OTHER, dir: "SENT" },
    { key: 2, type: first ?? OTHER, dir },
  ];
}

const STATE_ICON: Record<CritState, React.ReactNode> = {
  hit: <CheckmarkCircleIcon aria-hidden />,
  miss: <XMarkOctagonIcon aria-hidden />,
  skip: <MinusCircleIcon aria-hidden />,
  na: <CircleSlashIcon aria-hidden />,
};
const STATE_TEXT: Record<CritState, string> = {
  hit: "Treff",
  miss: "Ikke treff",
  skip: "Vurderes ikke",
  na: "Ikke i bruk for BUC-en",
};

const label = (t: string) => (t === OTHER ? "Annen SED" : t);

export function DecisionSimulator({
  buc,
  role,
  onBuc,
  onRole,
  onFocusStatus,
}: {
  buc: string;
  role: Role;
  onBuc: (b: string) => void;
  onRole: (r: Role) => void;
  onFocusStatus: (s: StatusId) => void;
}) {
  const b = BUC_BY_NAME[buc];
  const [docsByBuc, setDocsByBuc] = useState<Record<string, SimDoc[]>>({});
  const [days, setDays] = useState(30);
  const docs = docsByBuc[buc] ?? preset(b);
  const setDocs = (next: SimDoc[]) => setDocsByBuc((m) => ({ ...m, [buc]: next }));
  const nextKey = docs.reduce((k, d) => Math.max(k, d.key), 0) + 1;

  const ev = evaluate(b, role, docs, days);
  const result = STATUS_BY_ID[ev.result];
  const palette = [...new Set([...b.sisteSed, ...b.sedExists, ...b.mottatt, ...b.sendt]), OTHER];

  const resultText = (() => {
    if (ev.scope === null)
      return `${b.navn} har ingen avslutningsregel når NAV er ${role}. Ingen kriterier vurderes – saken blir liggende til motparten lukker den.`;
    if (ev.result === "UVIRKSOM")
      return "Ingen kriterier slår til. Saken blir stående som UVIRKSOM og vurderes igjen neste natt.";
    return ev.scope === "GLOBALT"
      ? "Neste kjøring av avslutt (kl. 03.00 i prod) oppretter og sender en X001, slik at saken lukkes for alle deltakerne."
      : "Neste kjøring av avslutt (kl. 03.00 i prod) lukker saken lokalt i RINA. Hos de andre deltakerne er den fortsatt åpen.";
  })();

  return (
    <div className="avs-sim" id="simulator">
      <div className="avs-sim__controls">
        <Select label="BUC" size="small" value={buc} onChange={(e) => onBuc(e.target.value)} className="avs-sim__select">
          {FAMILIES.map((f) => (
            <optgroup key={f.id} label={f.label}>
              {BUCS.filter((x) => x.family === f.id).map((x) => (
                <option key={x.navn} value={x.navn}>
                  {x.navn}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
        <ToggleGroup size="small" value={role} onChange={(v) => onRole(v as Role)} label="NAVs rolle">
          <ToggleGroup.Item value="sakseier" label="Sakseier" />
          <ToggleGroup.Item value="motpart" label="Motpart" />
        </ToggleGroup>
        <div className="avs-sim__scope">
          <Detail className="arch-eyebrow">Avslutning</Detail>
          <span className="avs-scope" data-scope={ev.scope ?? "none"}>
            {ev.scope ?? "ingen regel"}
          </span>
        </div>
      </div>

      <div className="avs-sim__grid">
        {/* Sakshistorikk */}
        <div className="avs-sim__docs arch-card" data-tone="accent">
          <Heading level="3" size="xsmall">
            SED-ene i saken
          </Heading>
          <BodyShort size="small" className="arch-subtle">
            Eldste først. Klikk på en SED for å bytte mellom sendt og mottatt.
          </BodyShort>
          <ol className="avs-doclist" aria-label="SED-er, eldste først">
            {docs.length === 0 && (
              <li className="avs-doclist__empty">
                <BodyShort size="small" className="arch-subtle">
                  Ingen SED-er. Saker uten SED-er blir aldri uvirksomme.
                </BodyShort>
              </li>
            )}
            {docs.map((d, i) => {
              const newest = i === docs.length - 1;
              return (
                <li key={d.key} className={`avs-doc ${newest ? "is-newest" : ""}`} data-dir={d.dir}>
                  <button
                    type="button"
                    className="avs-doc__main"
                    onClick={() => setDocs(docs.map((x) => (x.key === d.key ? { ...x, dir: x.dir === "SENT" ? "MOTTATT" : "SENT" } : x)))}
                    aria-label={`${label(d.type)}, ${d.dir === "SENT" ? "sendt fra NAV" : "mottatt"}. Klikk for å bytte retning.`}
                  >
                    <span className="avs-doc__dir" aria-hidden>
                      {d.dir === "SENT" ? <ArrowRightIcon /> : <ArrowLeftIcon />}
                    </span>
                    <span className={`avs-doc__type ${d.type === OTHER ? "arch-subtle" : "arch-mono"}`}>{label(d.type)}</span>
                    <span className="avs-doc__dirtext">{d.dir === "SENT" ? "sendt" : "mottatt"}</span>
                    {newest && <span className="avs-doc__newest">nyeste</span>}
                  </button>
                  <button type="button" className="avs-doc__remove" onClick={() => setDocs(docs.filter((x) => x.key !== d.key))} aria-label={`Fjern ${label(d.type)}`}>
                    <XMarkIcon aria-hidden />
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="avs-palette" role="group" aria-label="Legg til SED som nyeste">
            {palette.map((t) => (
              <button key={t} type="button" className="avs-palette__btn" onClick={() => setDocs([...docs, { key: nextKey, type: t, dir: "MOTTATT" }])}>
                <PlusIcon aria-hidden />
                <span className={t === OTHER ? "" : "arch-mono"}>{label(t)}</span>
              </button>
            ))}
            <Button
              size="xsmall"
              variant="tertiary-neutral"
              icon={<ArrowsCirclepathIcon aria-hidden />}
              className="avs-palette__reset"
              onClick={() => setDocsByBuc((m) => ({ ...m, [buc]: preset(b) }))}
            >
              Tilbakestill
            </Button>
          </div>
          {b.fallback !== null && (
            <label className="avs-sim__days">
              <span>
                Dager siden saken sist ble endret: <strong className="arch-mono">{days}</strong>
                <span className="arch-subtle"> (reserve slår til etter {b.fallback})</span>
              </span>
              <input type="range" min={0} max={400} step={5} value={days} onChange={(e) => setDays(Number(e.target.value))} className="avs-range" />
            </label>
          )}
        </div>

        {/* Kriteriestige */}
        <ol className="avs-ladder" aria-label="Kriteriene i til-avslutning, i rekkefølgen de vurderes" aria-live="polite">
          {ev.rows.map((r, i) => {
            const c = CRITERION_BY_ID[r.id];
            return (
              <li key={r.id} className="avs-rung" data-state={r.state} style={{ "--arch-delay": `${i * 40}ms` } as React.CSSProperties}>
                <span className="avs-rung__icon">{STATE_ICON[r.state]}</span>
                <div className="avs-rung__body">
                  <div className="avs-rung__head">
                    <strong>{c.title}</strong>
                    <span className="avs-rung__state">{STATE_TEXT[r.state]}</span>
                  </div>
                  {r.state !== "na" && (
                    <div className="avs-rung__list">
                      {r.id === "fallback" ? (
                        <span className="arch-mono">{b.fallback} dager</span>
                      ) : (
                        r.list.map((t) => (
                          <span key={t} className="avs-rung__sed arch-mono">
                            {t}
                          </span>
                        ))
                      )}
                    </div>
                  )}
                  {r.note && <BodyShort size="small" className="avs-rung__note">{r.note}</BodyShort>}
                </div>
              </li>
            );
          })}
        </ol>

        {/* Resultat */}
        <div className="avs-result" data-tone={result.tone} aria-live="polite">
          <Detail className="arch-eyebrow">Resultat av til-avslutning</Detail>
          <span key={ev.result} className="avs-result__status arch-mono">
            {ev.result}
          </span>
          <BodyShort size="small" className="avs-result__label">
            {result.label}
          </BodyShort>
          <BodyLong size="small">{resultText}</BodyLong>
          <Button size="xsmall" variant="tertiary" icon={<ArrowRightIcon aria-hidden />} iconPosition="right" onClick={() => onFocusStatus(ev.result)}>
            Vis i statusdiagrammet
          </Button>
        </div>
      </div>
    </div>
  );
}
