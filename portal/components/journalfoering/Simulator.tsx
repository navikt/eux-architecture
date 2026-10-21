"use client";

import { BodyLong, Button, Select, Switch, ToggleGroup } from "@navikt/ds-react";
import { ArrowRightIcon } from "@navikt/aksel-icons";
import {
  Ladder,
  ResultCaveat,
  ResultFacts,
  ResultLabel,
  ResultStatus,
  Rung,
  RungText,
  STEP_STATUS,
  SimForm,
  SimGroup,
  SimPresets,
  SimResult,
} from "@/components/process/Simulator";
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
  relevant,
  sedLabel,
  simulate,
  type Outcome,
  type Overstyrt,
  type Retning,
  type SektorId,
  type SimInput,
  type StatusId,
  type Tone,
} from "./data";

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

  const facts = [
    { k: "Tema", v: res.tema },
    { k: "Behandlingstema", v: res.behandlingstema === undefined ? undefined : res.behandlingstema || "–" },
    { k: "Behandlingstype", v: res.behandlingstype === undefined ? undefined : res.behandlingstype || "–" },
    { k: "Enhet", v: res.enhet === "NORG2" ? "fra NORG2" : res.enhet },
    { k: "Oppgave", v: res.oppgave },
  ].filter((f): f is { k: string; v: string } => f.v !== undefined);

  return (
    <div className="proc-sim">
      <SimPresets presets={PRESETS} value={input} onPick={onChange} />

      <div className="proc-sim__grid">
        {/* Valg */}
        <SimForm>
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

          <SimGroup legend="RINA-saken">
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
          </SimGroup>

          <SimGroup legend="Personen">
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
          </SimGroup>

          <SimGroup legend="Dokarkiv">
            <Switch size="small" checked={input.dokarkivFeil} disabled={!rel.dokarkivFeil} onChange={(e) => set({ dokarkivFeil: e.target.checked })}>
              Svarer med feil
            </Switch>
          </SimGroup>
        </SimForm>

        {/* Stegene i fagmodulen */}
        <Ladder label="Stegene i fagmodulen, i rekkefølge">
          {res.steps.map((s, i) => (
            <Rung key={s.id} no={i + 1} state={s.state} title={STEP_TITLE[s.id]} value={s.value} status={STEP_STATUS[s.state]}>
              {s.state !== "skip" && <RungText>{s.text}</RungText>}
            </Rung>
          ))}
        </Ladder>

        {/* Resultat */}
        <SimResult tone={o.tone} eyebrow={o.eyebrow} headline={o.headline}>
          {res.status ? (
            <ResultStatus key={res.status} onClick={() => onFocusStatus(res.status!)}>
              {res.status}
            </ResultStatus>
          ) : (
            <ResultStatus key="ingen" mono={false}>
              ingen journalstatus
            </ResultStatus>
          )}
          {res.status && <ResultLabel>{STATUS_BY_ID[res.status].label}</ResultLabel>}
          {res.tema && <ResultFacts facts={facts} />}
          <BodyLong size="small">{nextText}</BodyLong>
          <div className="proc-result__links">
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
            <ResultCaveat>Forenklet: Det er Dokarkiv som avgjør om journalposten faktisk blir ferdigstilt.</ResultCaveat>
          )}
        </SimResult>
      </div>
    </div>
  );
}
