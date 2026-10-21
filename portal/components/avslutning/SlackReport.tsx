import { SlackCode as C, SlackFigure, SlackMessage } from "@/components/process/Slack";

/** Mock of the monthly Slack message from RapportService. The numbers are made up. */
export function SlackReport() {
  return (
    <SlackFigure
      caption={
        <>
          Eksempel – tallene er oppdiktet. Linjer med 0 (feilet, avsluttes av motpart og nåværende status) utelates, og
          listen over feilede saker viser maks 10.
        </>
      }
    >
      <SlackMessage app="eux-avslutt-rinasaker" time="00.05">
        <p>
          <C>[prod]</C> <C>[avslutt-rinasaker]</C>
        </p>
        <p>
          <strong>Månedlig rapport — Avslutt Rinasaker</strong>
          <br />
          <em>Mars 2026</em>
        </p>
        <p>
          📊 <strong>Oppsummering forrige måned:</strong>
        </p>
        <ul>
          <li>
            Nye saker mottatt: <C>4 812</C>
          </li>
          <li>
            Avsluttet globalt: <C>1 207</C>
          </li>
          <li>
            Avsluttet lokalt: <C>2 361</C>
          </li>
          <li>
            Arkivert: <C>3 095</C>
          </li>
          <li>
            Feilet: <C>14</C>
          </li>
          <li>
            Avsluttes av motpart: <C>388</C>
          </li>
        </ul>
        <p>
          📈 <strong>Topp 3 BUC-typer — Avsluttet:</strong>
        </p>
        <ul>
          <li>
            <C>S_BUC_24</C>: <C>0</C> globalt · <C>1 044</C> lokalt
          </li>
          <li>
            <C>UB_BUC_01</C>: <C>702</C> globalt · <C>0</C> lokalt
          </li>
          <li>
            <C>H_BUC_01</C>: <C>0</C> globalt · <C>611</C> lokalt
          </li>
          <li>
            <em>
              Øvrige: <C>1 211</C> avsluttet totalt
            </em>
          </li>
        </ul>
        <p>
          ❌ <strong>Feilede saker:</strong>
        </p>
        <ul>
          <li>
            <C>1446032</C> — <C>FB_BUC_01</C> — HANDLING_FEILET
          </li>
          <li>
            <C>1449170</C> — <C>S_BUC_14</C> — HANDLING_MANGLER
          </li>
          <li className="arch-subtle">…</li>
          <li>
            <em>
              Totalt: <C>14</C> feilede saker denne måneden
            </em>
          </li>
        </ul>
        <p>
          📋 <strong>Nåværende status:</strong>
        </p>
        <ul>
          <li>
            Nye saker (NY_SAK): <C>61 530</C>
          </li>
          <li>
            Uvirksomme: <C>2 904</C>
          </li>
          <li>
            Til arkivering: <C>12</C>
          </li>
          <li>
            Feilet: <C>129</C>
          </li>
        </ul>
      </SlackMessage>
    </SlackFigure>
  );
}
