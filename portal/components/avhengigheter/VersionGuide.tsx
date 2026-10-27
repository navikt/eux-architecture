"use client";

import { useRef, useState, type CSSProperties } from "react";
import { BodyLong, Detail, Heading } from "@navikt/ds-react";
import { ArrowUndoIcon, CheckmarkIcon, XMarkIcon } from "@navikt/aksel-icons";
import { GUIDE, GUIDE_START, type GuideQuestion } from "./data";

type Answer = { id: string; ja: boolean };

/** Et lite beslutningstre: svar ja eller nei, og få vite hvor versjonen skal stå. */
export function VersionGuide() {
  const [answers, setAnswers] = useState<Answer[]>([]);
  const liveRef = useRef<HTMLDivElement>(null);

  const currentId = answers.reduce((id, a) => {
    const q = GUIDE[id] as GuideQuestion;
    return a.ja ? q.ja : q.nei;
  }, GUIDE_START);
  const step = GUIDE[currentId];

  const answer = (ja: boolean) => {
    setAnswers((prev) => [...prev, { id: currentId, ja }]);
    requestAnimationFrame(() => liveRef.current?.focus({ preventScroll: true }));
  };
  const backTo = (i: number) => setAnswers((prev) => prev.slice(0, i));

  return (
    <div className="avh-guide">
      <ol className="avh-guide__trail" aria-label="Svarene dine">
        {answers.map((a, i) => (
          <li key={a.id} style={{ "--i": i } as CSSProperties}>
            <button type="button" onClick={() => backTo(i)} title="Endre svaret">
              <span className="avh-guide__q">{(GUIDE[a.id] as GuideQuestion).question}</span>
              <span className="avh-guide__a" data-ja={a.ja || undefined}>
                {a.ja ? <CheckmarkIcon aria-hidden /> : <XMarkIcon aria-hidden />}
                {a.ja ? "Ja" : "Nei"}
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div ref={liveRef} tabIndex={-1} className="avh-guide__stage" aria-live="polite">
        {step.kind === "question" ? (
          <div className="avh-guide__card" key={currentId}>
            <Detail className="arch-eyebrow">Spørsmål {answers.length + 1}</Detail>
            <Heading level="3" size="medium" spacing>
              {step.question}
            </Heading>
            <BodyLong className="avh-guide__hint">{step.hint}</BodyLong>
            <div className="avh-guide__buttons">
              <button type="button" className="avh-guide__btn" onClick={() => answer(true)}>
                <CheckmarkIcon aria-hidden /> Ja
              </button>
              <button type="button" className="avh-guide__btn" onClick={() => answer(false)}>
                <XMarkIcon aria-hidden /> Nei
              </button>
            </div>
          </div>
        ) : (
          <div className="avh-guide__card avh-guide__result" data-tone={step.tone} key={currentId}>
            <Detail className="arch-eyebrow">Svaret</Detail>
            <Heading level="3" size="medium" spacing>
              {step.title}
            </Heading>
            <BodyLong spacing>{step.text}</BodyLong>
            <pre className="avh-code">
              <code>{step.snippet}</code>
            </pre>
            <button type="button" className="avh-guide__restart" onClick={() => backTo(0)}>
              <ArrowUndoIcon aria-hidden /> Start på nytt
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
