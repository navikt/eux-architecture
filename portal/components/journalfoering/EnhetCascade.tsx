"use client";

import { BodyShort, Button } from "@navikt/ds-react";
import { ArrowUpIcon } from "@navikt/aksel-icons";
import { ENHET_RULES, type EnhetRule, type EnhetRuleId, type Retning } from "./data";

type RuleState = "pass" | "hit" | "rest" | "idle";

export function EnhetCascade({
  hit,
  retning,
  onPick,
  onJump,
}: {
  hit?: EnhetRuleId;
  retning: Retning;
  onPick: (rule: EnhetRule) => void;
  onJump: () => void;
}) {
  const hitIndex = hit ? ENHET_RULES.findIndex((r) => r.id === hit) : -1;
  const state = (i: number): RuleState => (hitIndex < 0 ? "idle" : i < hitIndex ? "pass" : i === hitIndex ? "hit" : "rest");
  const current = hitIndex >= 0 ? ENHET_RULES[hitIndex] : null;

  return (
    <div className="jfr-cascade">
      <ol className="jfr-cascade__list">
        {ENHET_RULES.map((r, i) => {
          const s = state(i);
          return (
            <li key={r.id} className="jfr-cascade__rule" data-state={s} style={{ ["--jfr-i" as string]: i }}>
              <button
                type="button"
                className="jfr-cascade__btn"
                aria-pressed={s === "hit"}
                onClick={() => onPick(r)}
                title="Sett simulatoren til et eksempel som treffer denne regelen"
              >
                <span className="jfr-cascade__no" aria-hidden>
                  {i + 1}
                </span>
                <span className="jfr-cascade__when">
                  <strong>{r.when}</strong>
                  <span>{r.text}</span>
                </span>
                <span className="jfr-cascade__verdict" aria-hidden>
                  {s === "pass" ? "nei" : s === "hit" ? "ja" : ""}
                </span>
                <span className="jfr-cascade__enhet">
                  <span className="arch-mono">{r.enhet}</span>
                  {r.name && <small>{r.name}</small>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="jfr-cascade__foot" aria-live="polite">
        <BodyShort size="small">
          {retning === "ut" ? (
            <>Utgående SED-er får ingen behandlende enhet. Journalposten lages med journalførende enhet 9999, og det lages ingen oppgave.</>
          ) : current ? (
            <>
              Simulatoren treffer regel {hitIndex + 1}: <strong>{current.when.toLowerCase()}</strong>. Klikk på en annen regel for å prøve den.
            </>
          ) : (
            <>SED-en i simulatoren kommer ikke så langt at enheten blir valgt. Klikk på en regel for å prøve den.</>
          )}
        </BodyShort>
        <Button size="xsmall" variant="tertiary" icon={<ArrowUpIcon aria-hidden />} onClick={onJump}>
          Se hele løpet i simulatoren
        </Button>
      </div>
    </div>
  );
}
