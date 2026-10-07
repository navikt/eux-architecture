import type { ReactNode } from "react";

/** Inline code as Slack renders it. */
const C = ({ children }: { children: ReactNode }) => <code className="avs-slack__code">{children}</code>;

/** Mock of the monthly Slack message from RapportService in eux-slett-usendte-rinasaker. The numbers are made up. */
export function SlackReport() {
  return (
    <figure className="avs-slack">
      <div className="avs-slack__msg">
        <span className="avs-slack__avatar" aria-hidden>
          EUX
        </span>
        <div className="avs-slack__body">
          <div className="avs-slack__meta">
            <strong>eux-slett-usendte-rinasaker</strong>
            <span className="avs-slack__app">APP</span>
            <span className="arch-subtle">06.00</span>
          </div>
          <p>
            <C>[prod]</C> <C>[slett-usendte-rinasaker]</C> <strong>Månedlig rapport</strong>
            <br />
            <em>mars 2026</em>
          </p>
          <p>
            <strong>Forrige måned:</strong>
          </p>
          <ul>
            <li>Slettet: 2318</li>
            <li>Not found: 41</li>
            <li>Sletting feilet: 3</li>
            <li>Kan ikke slettes: 187</li>
            <li>Dokument mottatt: 5902</li>
          </ul>
          <p>
            <strong>Nåværende kø:</strong>
          </p>
          <ul>
            <li>Nye saker: 1264</li>
            <li>Til sletting: 74</li>
            <li>Venter på retry: 2</li>
          </ul>
        </div>
      </div>
      <figcaption className="arch-subtle">
        Eksempel – tallene er oppdiktet. «Slettet» vises alltid. De andre linjene for forrige måned vises bare når tallet er
        større enn 0. Månedstallene teller saker med statusen og endretTidspunkt i forrige måned.
      </figcaption>
    </figure>
  );
}
