"use client";

import { useState, useSyncExternalStore } from "react";
import { BodyLong, BodyShort, CopyButton, Detail, Heading, Select, Switch, TextField } from "@navikt/ds-react";
import { CheckmarkCircleIcon, ExclamationmarkTriangleIcon, MinusCircleIcon, XMarkOctagonIcon } from "@navikt/aksel-icons";
import {
  DEFAULT_INPUT,
  I_PDL,
  LANDKODER,
  PDL_FIELDS,
  PRESETS,
  RULE_TEXT,
  STEP_TITLE,
  sameInput,
  simulate,
  tilAdresse,
  type AdresseType,
  type IPdl,
  type Outcome,
  type SedAdresse,
  type SimInput,
  type StepState,
  type Tone,
} from "./data";

const STATE_ICON: Record<StepState, React.ReactNode> = {
  done: <CheckmarkCircleIcon aria-hidden />,
  warn: <ExclamationmarkTriangleIcon aria-hidden />,
  stop: <XMarkOctagonIcon aria-hidden />,
  skip: <MinusCircleIcon aria-hidden />,
};
const STATE_TEXT: Record<StepState, string> = { done: "OK", warn: "Merk", stop: "Stopp", skip: "Nås ikke" };

const OUTCOME_TONE: Record<Outcome, Tone> = { sendt: "success", stopp: "neutral", feil: "danger" };

const TYPES: { value: AdresseType; label: string }[] = [
  { value: "kontakt", label: "kontakt" },
  { value: "opphold", label: "opphold" },
  { value: "bosted", label: "bosted" },
];

const TEXT_FIELDS: { key: Exclude<keyof SedAdresse, "type" | "landkode">; label: string }[] = [
  { key: "gate", label: "gate" },
  { key: "bygning", label: "bygning" },
  { key: "by", label: "by" },
  { key: "postnummer", label: "postnummer" },
  { key: "region", label: "region" },
];

const noop = () => () => {};
const todayLocal = () => new Date().toLocaleDateString("sv-SE");

export function AddressLab() {
  const [input, setInput] = useState<SimInput>(DEFAULT_INPUT);
  const today = useSyncExternalStore(noop, todayLocal, () => "");
  const res = simulate(input, today);
  const set = (patch: Partial<SimInput>) => setInput((i) => ({ ...i, ...patch }));
  const setAdr = (patch: Partial<SedAdresse>) => setInput((i) => ({ ...i, adresse: { ...i.adresse, ...patch } }));
  const raw = tilAdresse(input.adresse);
  const json = res.melding ? JSON.stringify(res.melding, null, 2) : null;
  const type = input.adresse.type;

  return (
    <div className="avs-sim jfr-sim adr-lab">
      <div className="jfr-presets" role="group" aria-label="Eksempler">
        <Detail className="arch-eyebrow">Prøv</Detail>
        {PRESETS.map((p) => (
          <button key={p.id} type="button" className="jfr-preset" aria-pressed={sameInput(p.input, input)} onClick={() => setInput(p.input)}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="avs-sim__grid">
        <div className="arch-card jfr-sim__form adr-lab__form" data-tone="accent">
          <fieldset className="jfr-sim__group">
            <legend>Adressen i SED-en</legend>
            <div className="adr-lab__fields">
              <Select label="type" size="small" value={type} onChange={(e) => setAdr({ type: e.target.value as AdresseType })} className="arch-mono">
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
              {TEXT_FIELDS.map((f) => (
                <TextField
                  key={f.key}
                  size="small"
                  label={f.label}
                  value={input.adresse[f.key] ?? ""}
                  onChange={(e) => setAdr({ [f.key]: e.target.value === "" ? null : e.target.value })}
                  autoComplete="off"
                  className={`adr-lab__f adr-lab__f--${f.key}`}
                />
              ))}
              <Select label="landkode" size="small" value={input.adresse.landkode ?? ""} onChange={(e) => setAdr({ landkode: e.target.value || null })}>
                {LANDKODER.map((l) => (
                  <option key={l.kode} value={l.kode}>
                    {l.kode} – {l.land}
                  </option>
                ))}
                <option value="">(tom)</option>
              </Select>
            </div>
          </fieldset>

          <fieldset className="jfr-sim__group">
            <legend>RINA-saken</legend>
            <Select
              label="Første motpart"
              description={type === "bosted" ? "Avgjør om bostedsadressen sendes." : "Navnet blir kilde i meldingen."}
              size="small"
              value={input.motpart}
              onChange={(e) => set({ motpart: e.target.value })}
              className="adr-lab__select"
            >
              {LANDKODER.filter((l) => l.kode !== "NOR").map((l) => (
                <option key={l.kode} value={l.kode}>
                  {l.land}
                </option>
              ))}
              <option value="">Ingen motpart</option>
            </Select>
          </fieldset>

          <fieldset className="jfr-sim__group">
            <legend>PDL i dag</legend>
            <Select
              label={`${type[0].toUpperCase()}${type.slice(1)}adresse i PDL`}
              size="small"
              value={input.iPdl}
              onChange={(e) => set({ iPdl: e.target.value as IPdl })}
              className="adr-lab__select"
            >
              {I_PDL.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Switch size="small" checked={input.doed} disabled={type === "kontakt"} onChange={(e) => set({ doed: e.target.checked })}>
              Personen er død
            </Switch>
          </fieldset>
        </div>

        <ol className="avs-ladder jfr-ladder" aria-label="Stegene for én adresse, i rekkefølge" aria-live="polite">
          {res.steps.map((s, i) => (
            <li key={s.id} className="avs-rung" data-state={s.state} style={{ "--arch-delay": `${i * 30}ms` } as React.CSSProperties}>
              <span className="avs-rung__icon">{STATE_ICON[s.state]}</span>
              <div className="avs-rung__body">
                <div className="avs-rung__head">
                  <strong>
                    <span className="jfr-rung__no">{i + 1}</span>
                    {STEP_TITLE[s.id]}
                  </strong>
                  {s.value ? (
                    <span key={s.value} className="jfr-rung__value arch-mono">
                      {s.value}
                    </span>
                  ) : (
                    <span className="avs-rung__state">{STATE_TEXT[s.state]}</span>
                  )}
                </div>
                {s.state !== "skip" && (
                  <BodyShort size="small" className="jfr-rung__text">
                    {s.text}
                  </BodyShort>
                )}
              </div>
            </li>
          ))}
        </ol>

        <div className="avs-result jfr-result" data-tone={OUTCOME_TONE[res.outcome]} aria-live="polite">
          <Detail className="arch-eyebrow">Adressen</Detail>
          <Heading key={res.headline} level="3" size="medium" className="jfr-result__headline">
            {res.headline}
          </Heading>
          {res.opplysningstype && (
            <dl className="jfr-result__facts">
              <div>
                <dt>Opplysning</dt>
                <dd className="arch-mono">{res.opplysningstype}</dd>
              </div>
              <div>
                <dt>Adressetype</dt>
                <dd className="arch-mono">{res.adressetype}</dd>
              </div>
            </dl>
          )}
          <BodyLong size="small">{res.text}</BodyLong>
          <div className="adr-log" data-level={res.log.level}>
            <span className="adr-log__level">{res.log.level}</span>
            <code>{res.log.msg}</code>
          </div>
        </div>
      </div>

      <div className="adr-lab__out">
        <div className="arch-card adr-diff" data-tone={res.vaskesteg.length ? "warning" : "neutral"}>
          <div className="adr-diff__head">
            <Heading level="3" size="xsmall">
              Før og etter vasken
            </Heading>
            <Detail>{res.vaskesteg.length ? `${res.vaskesteg.length} endret` : res.steps[0].state === "stop" ? "ikke vasket" : "ingen endringer"}</Detail>
          </div>
          <dl className="adr-diff__list">
            {PDL_FIELDS.map((f) => {
              const steg = res.vaskesteg.filter((s) => s.field === f || s.moved === f);
              const before = raw[f];
              const after = res.vasket[f];
              const changed = before !== after;
              return (
                <div key={f} className="adr-diff__row" data-changed={changed || undefined}>
                  <dt className="arch-mono">{f}</dt>
                  <dd>
                    {changed ? (
                      <>
                        {before != null && <s>{before}</s>}
                        <em>{after ?? "null"}</em>
                      </>
                    ) : (
                      <span className={before == null ? "adr-diff__null" : undefined}>{before ?? "null"}</span>
                    )}
                    {steg.map((s, i) => (
                      <small key={i}>{s.moved === f ? `flyttet fra ${s.field}: ${RULE_TEXT[s.rule]}` : RULE_TEXT[s.rule]}</small>
                    ))}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>

        <div className="arch-card adr-json" data-tone={json ? "success" : "neutral"}>
          <div className="adr-diff__head">
            <Heading level="3" size="xsmall">
              Endringsmeldingen
            </Heading>
            {json && <CopyButton size="xsmall" copyText={json} text="Kopier" activeText="Kopiert" />}
          </div>
          {json ? (
            <pre className="adr-code adr-json__pre" tabIndex={0} aria-label="Endringsmeldingen som JSON">
              {json}
            </pre>
          ) : (
            <BodyShort size="small" className="arch-subtle adr-json__none">
              Ingen melding blir sendt for denne adressen.
            </BodyShort>
          )}
          {json && (
            <BodyShort size="small" className="arch-subtle">
              POST til PDL-mottak. Ident og motpartens navn er plassholdere.
            </BodyShort>
          )}
        </div>
      </div>
    </div>
  );
}
