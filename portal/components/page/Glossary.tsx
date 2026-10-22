export interface GlossaryEntry {
  term: string;
  full?: string;
  text: string;
}

/** The "Ordliste" cards: the term, its full name if any, and a short explanation. */
export function Glossary({ entries }: { entries: readonly GlossaryEntry[] }) {
  return (
    <dl className="arch-glossary">
      {entries.map((g) => (
        <div key={g.term}>
          <dt>
            {g.term}
            {g.full && <span className="arch-glossary__full">{g.full}</span>}
          </dt>
          <dd>{g.text}</dd>
        </div>
      ))}
    </dl>
  );
}
