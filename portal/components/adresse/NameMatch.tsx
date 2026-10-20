"use client";

import { useState } from "react";
import { BodyLong, BodyShort, Detail, Heading, Switch, TextField } from "@navikt/ds-react";
import { CheckmarkCircleIcon, ExclamationmarkTriangleIcon, MinusCircleIcon, XMarkOctagonIcon } from "@navikt/aksel-icons";
import { MATCH_PRESETS, sameInput, samePerson, type EditOp, type MatchCheck, type MatchCheckId, type MatchInput, type Person, type StepState, type Tone } from "./data";

const STATE_ICON: Record<StepState, React.ReactNode> = {
  done: <CheckmarkCircleIcon aria-hidden />,
  warn: <ExclamationmarkTriangleIcon aria-hidden />,
  stop: <XMarkOctagonIcon aria-hidden />,
  skip: <MinusCircleIcon aria-hidden />,
};

const TITLE: Record<MatchCheckId, string> = {
  pin: "Norsk PIN i SED-en?",
  dato: "Lik fødselsdato?",
  etternavn: "Etternavn nesten likt?",
  fornavn: "Fornavn nesten likt?",
};

const FAIL_LOG: Partial<Record<MatchCheckId, string>> = {
  dato: "Fødselsdato stemmer ikke overens mellom dokument og rinasak",
  etternavn: "Etternavn stemmer ikke overens mellom dokument og rinasak",
  fornavn: "Fornavn stemmer ikke overens mellom dokument og rinasak",
};

const FIELDS: { key: keyof Person; label: string }[] = [
  { key: "fornavn", label: "Fornavn" },
  { key: "etternavn", label: "Etternavn" },
  { key: "foedselsdato", label: "Fødselsdato" },
];

function stateOf(c: MatchCheck): StepState {
  if (c.ok === null) return "skip";
  if (c.id === "pin") return c.ok ? "done" : "warn";
  return c.ok ? "done" : "stop";
}

function textOf(c: MatchCheck, input: MatchInput): string {
  if (c.ok === null) return "";
  switch (c.id) {
    case "pin":
      return c.ok ? "Identen hentes rett fra SED-en. Navn og fødselsdato sjekkes ikke." : "Da prøver vi fnr fra RINA-saken, men bare hvis det er samme person.";
    case "dato":
      return c.ok ? "Datoene er like, tegn for tegn." : `${input.sed.foedselsdato || "tom"} er ikke lik ${input.sak.foedselsdato || "tom"}. Her er det ingen toleranse.`;
    default:
      return c.ok
        ? `${c.distance} endring${c.distance === 1 ? "" : "er"} skiller dem. Inntil 2 godtas.`
        : `${c.distance} endringer skiller dem. Det er mer enn 2.`;
  }
}

export function NameMatch() {
  const [input, setInput] = useState<MatchInput>(MATCH_PRESETS[0].input);
  const res = samePerson(input);
  const setPerson = (side: "sed" | "sak", key: keyof Person, v: string) => setInput((i) => ({ ...i, [side]: { ...i[side], [key]: v } }));
  const failed = res.checks.find((c) => c.ok === false && c.id !== "pin");

  const result: { tone: Tone; headline: string; text: string } =
    res.ident === "pin"
      ? { tone: "success", headline: "Identen fra SED-en", text: "Adressene til bruker sendes med den norske PIN-en fra SED-en." }
      : res.ident === "sak"
        ? { tone: "success", headline: "fnr fra RINA-saken", text: "Det er samme person. Adressene til bruker sendes med fnr fra RINA-saken." }
        : {
            tone: "warning",
            headline: "Ingen ident",
            text: "Adressene til bruker blir ikke sendt. Ektefelle og annen person behandles likevel, med sin egen PIN.",
          };

  return (
    <div className="avs-sim adr-match">
      <div className="jfr-presets" role="group" aria-label="Eksempler">
        <Detail className="arch-eyebrow">Prøv</Detail>
        {MATCH_PRESETS.map((p) => (
          <button key={p.id} type="button" className="jfr-preset" aria-pressed={sameInput(p.input, input)} onClick={() => setInput(p.input)}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="avs-sim__grid adr-match__grid">
        <div className="arch-card jfr-sim__form adr-match__form" data-tone="accent">
          <Switch size="small" checked={input.norPin} onChange={(e) => setInput((i) => ({ ...i, norPin: e.target.checked }))}>
            SED-en har en PIN med landkode NOR
          </Switch>
          <div className="adr-match__cols" data-off={input.norPin || undefined}>
            {(["sed", "sak"] as const).map((side) => (
              <fieldset key={side} className="jfr-sim__group" disabled={input.norPin}>
                <legend>{side === "sed" ? "Bruker i SED-en" : "Bruker i RINA-saken"}</legend>
                {FIELDS.map((f) => (
                  <TextField
                    key={f.key}
                    size="small"
                    label={f.label}
                    value={input[side][f.key]}
                    onChange={(e) => setPerson(side, f.key, e.target.value)}
                    autoComplete="off"
                  />
                ))}
              </fieldset>
            ))}
          </div>
        </div>

        <ol className="avs-ladder jfr-ladder" aria-label="Sjekkene, i rekkefølge" aria-live="polite">
          {res.checks.map((c, i) => {
            const state = stateOf(c);
            return (
              <li key={c.id} className="avs-rung" data-state={state} style={{ "--arch-delay": `${i * 30}ms` } as React.CSSProperties}>
                <span className="avs-rung__icon">{STATE_ICON[state]}</span>
                <div className="avs-rung__body">
                  <div className="avs-rung__head">
                    <strong>
                      <span className="jfr-rung__no">{i + 1}</span>
                      {TITLE[c.id]}
                    </strong>
                    {c.distance !== undefined ? (
                      <span key={c.distance} className="jfr-rung__value arch-mono">
                        avstand {c.distance}
                      </span>
                    ) : (
                      <span className="avs-rung__state">{state === "skip" ? "Nås ikke" : c.ok ? "Ja" : "Nei"}</span>
                    )}
                  </div>
                  {state !== "skip" && (
                    <BodyShort size="small" className="jfr-rung__text">
                      {textOf(c, input)}
                    </BodyShort>
                  )}
                  {c.ops && c.ops.length > 0 && <Ops ops={c.ops} />}
                </div>
              </li>
            );
          })}
        </ol>

        <div className="avs-result jfr-result" data-tone={result.tone} aria-live="polite">
          <Detail className="arch-eyebrow">Bruker får</Detail>
          <Heading key={result.headline} level="3" size="medium" className="jfr-result__headline">
            {result.headline}
          </Heading>
          <BodyLong size="small">{result.text}</BodyLong>
          {failed && FAIL_LOG[failed.id] && (
            <div className="adr-log" data-level="INFO">
              <span className="adr-log__level">INFO</span>
              <code>{FAIL_LOG[failed.id]}</code>
            </div>
          )}
          <BodyShort size="small" className="arch-subtle jfr-result__caveat">
            Navnene sammenlignes med små bokstaver. Avstanden er antall bokstaver som må byttes, legges til eller fjernes (Levenshtein).
          </BodyShort>
        </div>
      </div>
    </div>
  );
}

const OP_LABEL: Record<EditOp["op"], string> = { match: "lik", sub: "byttet", ins: "lagt til", del: "fjernet" };

function Ops({ ops }: { ops: EditOp[] }) {
  return (
    <div className="adr-ops" aria-label="Bokstav for bokstav: SED-en øverst, RINA-saken nederst">
      {ops.map((o, i) => (
        <span key={i} className="adr-ops__col" data-op={o.op} title={OP_LABEL[o.op]} style={{ ["--i" as string]: i }}>
          <span>{o.a === " " ? "␣" : (o.a ?? "·")}</span>
          <span>{o.b === " " ? "␣" : (o.b ?? "·")}</span>
        </span>
      ))}
    </div>
  );
}
