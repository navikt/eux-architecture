"use client";

import { useState } from "react";
import { BodyLong, Switch, TextField } from "@navikt/ds-react";
import { Ladder, ResultCaveat, Rung, RungText, SimForm, SimGroup, SimPresets, SimResult } from "@/components/process/Simulator";
import { MATCH_PRESETS, samePerson, type EditOp, type MatchCheck, type MatchCheckId, type MatchInput, type Person, type StepState, type Tone } from "./data";

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
    <div className="proc-sim">
      <SimPresets presets={MATCH_PRESETS} value={input} onPick={setInput} />

      <div className="proc-sim__grid">
        <SimForm>
          <Switch size="small" checked={input.norPin} onChange={(e) => setInput((i) => ({ ...i, norPin: e.target.checked }))}>
            SED-en har en PIN med landkode NOR
          </Switch>
          <div className="adr-match__cols" data-off={input.norPin || undefined}>
            {(["sed", "sak"] as const).map((side) => (
              <SimGroup key={side} legend={side === "sed" ? "Bruker i SED-en" : "Bruker i RINA-saken"} disabled={input.norPin}>
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
              </SimGroup>
            ))}
          </div>
        </SimForm>

        <Ladder label="Sjekkene, i rekkefølge">
          {res.checks.map((c, i) => {
            const state = stateOf(c);
            return (
              <Rung
                key={c.id}
                no={i + 1}
                state={state}
                title={TITLE[c.id]}
                value={c.distance === undefined ? undefined : `avstand ${c.distance}`}
                status={state === "skip" ? "Nås ikke" : c.ok ? "Ja" : "Nei"}
              >
                {state !== "skip" && <RungText>{textOf(c, input)}</RungText>}
                {c.ops && c.ops.length > 0 && <Ops ops={c.ops} />}
              </Rung>
            );
          })}
        </Ladder>

        <SimResult tone={result.tone} eyebrow="Bruker får" headline={result.headline}>
          <BodyLong size="small">{result.text}</BodyLong>
          {failed && FAIL_LOG[failed.id] && (
            <div className="adr-log" data-level="INFO">
              <span className="adr-log__level">INFO</span>
              <code>{FAIL_LOG[failed.id]}</code>
            </div>
          )}
          <ResultCaveat>
            Navnene sammenlignes med små bokstaver. Avstanden er antall bokstaver som må byttes, legges til eller fjernes (Levenshtein).
          </ResultCaveat>
        </SimResult>
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
