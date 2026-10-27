"use client";

import { useState, type CSSProperties } from "react";
import { Detail } from "@navikt/ds-react";
import { POM_CLEAN, POM_MESSY, POM_NOTES, type PomLine } from "./data";

function Pom({
  title,
  kind,
  lines,
  active,
  onNote,
}: {
  title: string;
  kind: "messy" | "clean";
  lines: PomLine[];
  active: number | null;
  onNote: (n: number | null) => void;
}) {
  const notes = [...new Set(lines.map((l) => l.note).filter((n): n is number => n !== undefined))];

  return (
    <figure className="avh-pom" data-kind={kind}>
      <figcaption>
        <span className="avh-pom__dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <Detail as="span">{title}</Detail>
      </figcaption>
      <pre className="avh-code avh-pom__code" onPointerLeave={() => onNote(null)}>
        <code>
          {lines.map((l, i) => (
            <span
              key={i}
              className="avh-pom__line"
              data-note={l.note}
              data-active={l.note !== undefined && l.note === active ? true : undefined}
              data-tone={l.note !== undefined ? POM_NOTES[l.note].tone : undefined}
              onPointerEnter={() => onNote(l.note ?? null)}
            >
              {l.text || " "}
              {l.note !== undefined && lines[i - 1]?.note !== l.note && (
                <span className="avh-pom__mark" aria-hidden>
                  {l.note}
                </span>
              )}
              {"\n"}
            </span>
          ))}
        </code>
      </pre>
      <ol className="avh-pom__notes">
        {notes.map((n, i) => (
          <li
            key={n}
            data-tone={POM_NOTES[n].tone}
            data-active={active === n || undefined}
            tabIndex={0}
            onPointerEnter={() => onNote(n)}
            onPointerLeave={() => onNote(null)}
            onFocus={() => onNote(n)}
            onBlur={() => onNote(null)}
            style={{ "--i": i } as CSSProperties}
          >
            <span className="avh-pom__num" aria-hidden>
              {n}
            </span>
            {POM_NOTES[n].text}
          </li>
        ))}
      </ol>
    </figure>
  );
}

/** Den samme appen to ganger. Hold pekeren over en linje eller et punkt for å se hva det gjelder. */
export function PomCompare() {
  const [active, setActive] = useState<number | null>(null);
  return (
    <div className="avh-poms">
      <Pom title="Rotete" kind="messy" lines={POM_MESSY} active={active} onNote={setActive} />
      <Pom title="Ren" kind="clean" lines={POM_CLEAN} active={active} onNote={setActive} />
    </div>
  );
}
