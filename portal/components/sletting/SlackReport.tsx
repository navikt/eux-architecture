import { SlackCode as C, SlackFigure, SlackMessage } from "@/components/process/Slack";

/** Mock of the monthly Slack message from RapportService in eux-slett-usendte-rinasaker. The numbers are made up. */
export function SlackReport() {
  return (
    <SlackFigure
      caption={
        <>
          Eksempel – tallene er oppdiktet. «Slettet» vises alltid. De andre linjene for forrige måned vises bare når tallet er
          større enn 0. Månedstallene teller saker med statusen og endretTidspunkt i forrige måned.
        </>
      }
    >
      <SlackMessage app="eux-slett-usendte-rinasaker" time="06.00">
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
      </SlackMessage>
    </SlackFigure>
  );
}
