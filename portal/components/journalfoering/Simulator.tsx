"use client";

import { BodyLong, BodyShort, Button, Detail, Heading, Select, Switch, ToggleGroup } from "@navikt/ds-react";
import {
  ArrowRightIcon,
  CheckmarkCircleIcon,
  CircleSlashIcon,
  ExclamationmarkTriangleIcon,
  MinusCircleIcon,
  XMarkOctagonIcon,
} from "@navikt/aksel-icons";
import {
  ANNEN,
  OVERSTYRT,
  PRESETS,
  SEKTORER,
  SEKTOR_BY_ID,
  STATUS_BY_ID,
  STEP_TITLE,
  TEMAER,
  bucAnnen,
  bucLabel,
  presetInput,
  relevant,
  sameInput,
  sedLabel,
  simulate,
  type Outcome,
  type Overstyrt,
  type Retning,
  type SektorId,
  type SimInput,
  type StatusId,
  type StepState,
  type Tone,
} from "./data";

const STATE_ICON: Record<StepState, React.ReactNode> = {
  done: <CheckmarkCircleIcon aria-hidden />,
  warn: <ExclamationmarkTriangleIcon aria-hidden />,
  stop: <XMarkOctagonIcon aria-hidden />,
  skip: <MinusCircleIcon aria-hidden />,
  off: <CircleSlashIcon aria-hidden />,
};
const STATE_TEXT: Record<StepState, string> = {
  done: "OK",
  warn: "Merk",
  stop: "Stopp",
  skip: "Nås ikke",
  off: "Ikke aktuelt",
};

const OUTCOME: Record<Outcome, { tone: Tone; eyebrow: string; headline: string }> = {
  ferdigstilt: { tone: "success", eyebrow: "Journalposten blir", headline: "Ferdigstilt" },
  midlertidig: { tone: "warning", eyebrow: "Journalposten blir", headline: "Midlertidig" },
  feilet: { tone: "danger", eyebrow: "Journalposten blir", headline: "Ikke opprettet" },
  manuell: { tone: "info", eyebrow: "Journalposten blir", headline: "Ikke laget" },
  filtrert: { tone: "neutral", eyebrow: "SED-en blir", headline: "Hoppet over" },
  annet: { tone: "meta-purple", eyebrow: "SED-en blir", headline: "Journalført av andre" },
};

export function Simulator({
  input,
  onChange,
  onFocusStatus,
  onJump,
}: {
  input: SimInput;
  onChange: (i: SimInput) => void;
  onFocusStatus: (s: StatusId) => void;
  onJump: (id: string) => void;
}) {
  const res = simulate(input);
  const rel = relevant(input);
  const inn = input.retning === "inn";
  const sektor = SEKTOR_BY_ID[input.sektor];
  const set = (patch: Partial<SimInput>) => onChange({ ...input, ...patch });
  const o = OUTCOME[res.outcome];

  const setSektor = (id: SektorId) => set({ sektor: id, buc: bucAnnen(id), sed: ANNEN });

  const nextText = (() => {
    switch (res.outcome) {
      case "filtrert":
        return "Fagmodulen leser meldingen og går videre uten å gjøre noe. Ingen journalstatus og ingen varsel. eessi-pensjon og melosys-eessi leser de samme topicene og har egne regler.";
      case "annet":
        return input.melosys
          ? "melosys-eessi journalfører SED-ene i denne saken. Fagmodulen setter ingen status."
          : "H_BUC_07 som ikke er opprettet fra nEESSI, journalføres ikke av fagmodulen. Ingen status blir satt.";
      case "manuell":
        return inn
          ? "Ingen journalpost. Saksbehandler journalfører fra BEH_SED-oppgaven. Nattjobbene ser ikke på SED-en."
          : "Ingen journalpost og ingen oppgave. Nattjobbene ser ikke på SED-en.";
      case "feilet":
        return "Statusen står som UKJENT, og dokumentet finnes ikke i nav-rinasak. Første natt setter ferdigstill FEILET_FERDIGSTILL, andre natt KORRUPT. SED-en må følges opp manuelt.";
      case "ferdigstilt":
        return inn
          ? "Ferdig. Saksbehandler får en BEH_SED-oppgave, og nattjobbene har ingenting å gjøre."
          : "Ferdig. Utgående SED-er får ingen oppgave, og nattjobbene har ingenting å gjøre.";
      case "midlertidig":
        if (res.avbrutt) return "Journalposten er avbrutt i Dokarkiv, men statusen står fortsatt som UKJENT.";
        return inn
          ? "Saksbehandler kan journalføre fra oppgaven i Gosys eller fra nEESSI. Ellers prøver ferdigstill kl. 01.00 å kopiere sak, bruker og tema fra en journalpost i saken som er ferdigstilt."
          : "ferdigstill kl. 01.00 prøver å kopiere sak, bruker og tema fra en ferdigstilt journalpost i saken. Har journalposten fortsatt ingen bruker etter 30 dager, avbryter feilregistrer kl. 02.00 den.";
    }
  })();

  const facts: { k: string; v?: string; jump?: string }[] = [
    { k: "Tema", v: res.tema, jump: "regler" },
    { k: "Behandlingstema", v: res.behandlingstema === undefined ? undefined : res.behandlingstema || "–" },
    { k: "Behandlingstype", v: res.behandlingstype === undefined ? undefined : res.behandlingstype || "–" },
    { k: "Enhet", v: res.enhet === "NORG2" ? "fra NORG2" : res.enhet, jump: "regler" },
    { k: "Oppgave", v: res.oppgave },
  ];

  return (
    <div className="avs-sim jfr-sim">
      <div className="jfr-presets" role="group" aria-label="Eksempler">
        <Detail className="arch-eyebrow">Prøv</Detail>
        {PRESETS.map((p) => {
          const on = sameInput(presetInput(p.input), input);
          return (
            <button key={p.id} type="button" className="jfr-preset" aria-pressed={on} onClick={() => onChange(presetInput(p.input))}>
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="avs-sim__grid">
        {/* Valg */}
        <div className="arch-card jfr-sim__form" data-tone="accent">
          <ToggleGroup size="small" value={input.retning} onChange={(v) => set({ retning: v as Retning })} label="Retning" fill>
            <ToggleGroup.Item value="inn" label="Inngående" />
            <ToggleGroup.Item value="ut" label="Utgående" />
          </ToggleGroup>

          <div className="jfr-sim__selects">
            <Select label="Sektor" size="small" value={input.sektor} onChange={(e) => setSektor(e.target.value as SektorId)}>
              <optgroup label="Behandles">
                {SEKTORER.filter((s) => s.behandles).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} – {s.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Hoppes over">
                {SEKTORER.filter((s) => !s.behandles).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} – {s.label}
                  </option>
                ))}
              </optgroup>
            </Select>
            <Select label="BUC" size="small" value={input.buc} onChange={(e) => set({ buc: e.target.value })}>
              {[...sektor.bucs, bucAnnen(sektor.id)].map((b) => (
                <option key={b} value={b}>
                  {bucLabel(b)}
                </option>
              ))}
            </Select>
            <Select label="SED" size="small" value={input.sed} onChange={(e) => set({ sed: e.target.value })}>
              {[...sektor.seds, ANNEN].map((s) => (
                <option key={s} value={s}>
                  {sedLabel(s)}
                </option>
              ))}
            </Select>
          </div>

          <fieldset className="jfr-sim__group">
            <legend>RINA-saken</legend>
            <Switch size="small" checked={input.navRinasak} onChange={(e) => set({ navRinasak: e.target.checked })}>
              Finnes i nav-rinasak
            </Switch>
            <Switch size="small" checked={input.melosys} disabled={!rel.melosys} onChange={(e) => set({ melosys: e.target.checked })}>
              Melosys journalfører saken
            </Switch>
            <Switch size="small" checked={input.fagsakISaken} disabled={!rel.fagsakISaken} onChange={(e) => set({ fagsakISaken: e.target.checked })}>
              Saken har en fagsak
            </Switch>
            {rel.fagsakTema && (
              <Select label="Tema på fagsaken" size="small" value={input.fagsakTema} onChange={(e) => set({ fagsakTema: e.target.value })} className="jfr-sim__inline">
                {TEMAER.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            )}
            <Switch
              size="small"
              checked={input.journalfoertISaken}
              disabled={!rel.journalfoertISaken}
              onChange={(e) => set({ journalfoertISaken: e.target.checked })}
            >
              En SED i saken er journalført
            </Switch>
            {rel.overstyrt && (
              <Select
                label="Overstyrt enhet"
                size="small"
                value={input.overstyrt}
                onChange={(e) => set({ overstyrt: e.target.value as Overstyrt })}
                className="jfr-sim__inline"
              >
                {OVERSTYRT.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </Select>
            )}
          </fieldset>

          <fieldset className="jfr-sim__group">
            <legend>Personen</legend>
            <Switch size="small" checked={input.person} onChange={(e) => set({ person: e.target.checked })}>
              Finnes i PDL
            </Switch>
            <Switch size="small" checked={input.fagsakPaaTema} disabled={!rel.fagsakPaaTema} onChange={(e) => set({ fagsakPaaTema: e.target.checked })}>
              Har fagsak på temaet
            </Switch>
            <Switch size="small" checked={input.beskyttet} disabled={!rel.beskyttet} onChange={(e) => set({ beskyttet: e.target.checked })}>
              Strengt fortrolig adresse
            </Switch>
            <Switch size="small" checked={input.sakseier} disabled={!rel.sakseier} onChange={(e) => set({ sakseier: e.target.checked })}>
              NAV er sakseier
            </Switch>
          </fieldset>

          <fieldset className="jfr-sim__group">
            <legend>Dokarkiv</legend>
            <Switch size="small" checked={input.dokarkivFeil} disabled={!rel.dokarkivFeil} onChange={(e) => set({ dokarkivFeil: e.target.checked })}>
              Svarer med feil
            </Switch>
          </fieldset>
        </div>

        {/* Stegene i fagmodulen */}
        <ol className="avs-ladder jfr-ladder" aria-label="Stegene i fagmodulen, i rekkefølge" aria-live="polite">
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

        {/* Resultat */}
        <div className="avs-result jfr-result" data-tone={o.tone} aria-live="polite">
          <Detail className="arch-eyebrow">{o.eyebrow}</Detail>
          <Heading key={res.outcome} level="3" size="medium" className="jfr-result__headline">
            {o.headline}
          </Heading>
          {res.status ? (
            <button
              key={res.status}
              type="button"
              className="avs-result__status arch-mono jfr-result__status"
              onClick={() => onFocusStatus(res.status!)}
              title="Vis i statusdiagrammet"
            >
              {res.status}
            </button>
          ) : (
            <span key="ingen" className="avs-result__status jfr-result__status">
              ingen journalstatus
            </span>
          )}
          {res.status && (
            <BodyShort size="small" className="avs-result__label">
              {STATUS_BY_ID[res.status].label}
            </BodyShort>
          )}
          {res.tema && (
            <dl className="jfr-result__facts">
              {facts
                .filter((f) => f.v !== undefined)
                .map((f) => (
                  <div key={f.k}>
                    <dt>{f.k}</dt>
                    <dd className="arch-mono">{f.v}</dd>
                  </div>
                ))}
            </dl>
          )}
          <BodyLong size="small">{nextText}</BodyLong>
          <div className="jfr-result__links">
            {(res.outcome === "midlertidig" || res.outcome === "feilet") && (
              <Button size="xsmall" variant="tertiary" icon={<ArrowRightIcon aria-hidden />} iconPosition="right" onClick={() => onJump("natten")}>
                Hva skjer i natt?
              </Button>
            )}
            {res.enhetRule && (
              <Button size="xsmall" variant="tertiary" icon={<ArrowRightIcon aria-hidden />} iconPosition="right" onClick={() => onJump("regler")}>
                Se enhetsregelen
              </Button>
            )}
          </div>
          {(res.outcome === "ferdigstilt" || res.outcome === "midlertidig") && (
            <BodyShort size="small" className="arch-subtle jfr-result__caveat">
              Forenklet: Det er Dokarkiv som avgjør om journalposten faktisk blir ferdigstilt.
            </BodyShort>
          )}
        </div>
      </div>
    </div>
  );
}
