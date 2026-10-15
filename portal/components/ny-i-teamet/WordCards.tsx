"use client";

import { useState, type CSSProperties } from "react";
import { GLOSSARY_BY_TERM } from "@/components/architecture/glossary";
import { WORDS } from "./data";

/** Ordkort som snus når du klikker på dem. */
export function WordCards() {
  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  const entries = WORDS.map((w) => GLOSSARY_BY_TERM[w]).filter(Boolean);

  const toggle = (term: string) =>
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(term)) next.delete(term);
      else next.add(term);
      return next;
    });

  return (
    <ul className="ny-words">
      {entries.map((g, i) => {
        const on = flipped.has(g.term);
        return (
          <li key={g.term} style={{ "--i": i } as CSSProperties}>
            <button type="button" className="ny-word" aria-pressed={on} data-flipped={on || undefined} onClick={() => toggle(g.term)}>
              <span className="ny-word__face ny-word__front">
                <strong>{g.term}</strong>
                {g.full && <span>{g.full}</span>}
                <small aria-hidden>Snu kortet</small>
              </span>
              <span className="ny-word__face ny-word__back">{g.text}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
