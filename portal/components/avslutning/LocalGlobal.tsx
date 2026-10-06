"use client";

import { BodyLong, BodyShort, Detail, Heading } from "@navikt/ds-react";
import { useReducedMotion } from "@/components/architecture/hooks";
import { rounded } from "@/components/architecture/svg";
import { BUCS, type Scope, type StatusId } from "./data";
import { StatusChips } from "./NightPipeline";
import { TONE } from "./tones";

const W = 440;
const H = 152;
const BW = 128;
const BH = 46;
const DUR = "5s";

const NAV = { x: 20, cy: 76, label: "NAV" };
const OTHERS = [
  { x: 292, cy: 36, label: "Deltaker A" },
  { x: 292, cy: 116, label: "Deltaker B" },
];
const pathTo = (cy: number) =>
  rounded(
    [
      [NAV.x + BW, NAV.cy],
      [220, NAV.cy],
      [220, cy],
      [292, cy],
    ],
    10,
  );

/** Opacity keyframes that switch at t (0–1) and switch back just before the loop restarts. */
const switchAt = (t: number, on: boolean) => ({
  values: on ? "0;0;1;1;0" : "1;1;0;0;1",
  keyTimes: `0;${t};${Math.min(t + 0.04, 0.9)};0.94;1`,
});

function Party({ x, cy, label, closeAt, reduced }: { x: number; cy: number; label: string; closeAt: number | null; reduced: boolean }) {
  const y = cy - BH / 2;
  const closedStatic = reduced && closeAt !== null;
  return (
    <g>
      <rect x={x} y={y} width={BW} height={BH} rx={10} fill={TONE.accent.fill} stroke={TONE.accent.stroke} strokeWidth={1.4} />
      {closeAt !== null && (
        <rect x={x} y={y} width={BW} height={BH} rx={10} fill={TONE.success.fill} stroke={TONE.success.stroke} strokeWidth={1.4} opacity={closedStatic ? 1 : 0}>
          {!reduced && <animate attributeName="opacity" dur={DUR} repeatCount="indefinite" {...switchAt(closeAt, true)} />}
        </rect>
      )}
      <text x={x + 12} y={cy - 4} fontSize={11.5} fontWeight={700} fill="var(--ax-text-neutral)">
        {label}
      </text>
      <text x={x + 12} y={cy + 12} fontSize={10} className="arch-mono" fill="var(--ax-text-neutral-subtle)">
        RINA-sak
      </text>
      {/* Status: åpen / lukket */}
      <g opacity={closedStatic ? 0 : 1}>
        {!reduced && closeAt !== null && <animate attributeName="opacity" dur={DUR} repeatCount="indefinite" {...switchAt(closeAt, false)} />}
        <rect x={x + BW - 52} y={cy - 9} width={42} height={18} rx={9} fill="var(--ax-bg-default)" stroke={TONE.accent.stroke} />
        <text x={x + BW - 31} y={cy + 4} textAnchor="middle" fontSize={10} fontWeight={700} fill={TONE.accent.text}>
          åpen
        </text>
      </g>
      {closeAt !== null && (
        <g opacity={closedStatic ? 1 : 0}>
          {!reduced && <animate attributeName="opacity" dur={DUR} repeatCount="indefinite" {...switchAt(closeAt, true)} />}
          <rect x={x + BW - 58} y={cy - 9} width={48} height={18} rx={9} fill={TONE.success.strong} />
          {/* hengelås */}
          <rect x={x + BW - 52} y={cy - 2} width={8} height={6.5} rx={1.4} fill="var(--ax-text-success-contrast)" />
          <path d={`M ${x + BW - 50.5} ${cy - 2} v -2 a 2.5 2.5 0 0 1 5 0 v 2`} fill="none" stroke="var(--ax-text-success-contrast)" strokeWidth={1.3} />
          <text x={x + BW - 25} y={cy + 4} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--ax-text-success-contrast)">
            lukket
          </text>
        </g>
      )}
    </g>
  );
}

function Mini({ scope }: { scope: Scope }) {
  const reduced = useReducedMotion();
  const global = scope === "GLOBALT";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="avs-lg__svg" role="img" aria-label={global ? "NAV sender X001, og saken lukkes hos alle deltakerne" : "Saken lukkes bare hos NAV – de andre deltakerne har den fortsatt åpen"}>
      {OTHERS.map((o) => (
        <path key={o.label} d={pathTo(o.cy)} fill="none" stroke="var(--ax-border-neutral)" strokeWidth={1.4} strokeDasharray="4 4" />
      ))}
      {global &&
        !reduced &&
        OTHERS.map((o) => (
          <g key={o.label} opacity={0}>
            <animate attributeName="opacity" dur={DUR} repeatCount="indefinite" values="0;0;1;1;0;0" keyTimes="0;0.12;0.16;0.5;0.54;1" />
            <animateMotion dur={DUR} repeatCount="indefinite" path={pathTo(o.cy)} keyPoints="0;0;1;1" keyTimes="0;0.16;0.5;1" calcMode="linear" />
            <rect x={-17} y={-10} width={34} height={20} rx={4} fill={TONE.warning.strong} stroke="var(--ax-bg-default)" strokeWidth={1.5} />
            <text x={0} y={4} textAnchor="middle" fontSize={9.5} fontWeight={800} className="arch-mono" fill="var(--ax-text-warning-contrast)">
              X001
            </text>
          </g>
        ))}
      {!global && (
        <text x={220} y={H - 4} textAnchor="middle" fontSize={10} fontStyle="italic" fill="var(--ax-text-neutral-subtle)">
          ingen melding til de andre
        </text>
      )}
      <Party {...NAV} closeAt={global ? 0.14 : 0.3} reduced={reduced} />
      {OTHERS.map((o) => (
        <Party key={o.label} {...o} closeAt={global ? 0.52 : null} reduced={reduced} />
      ))}
    </svg>
  );
}

const count = (role: "sakseier" | "motpart", scope: Scope) => BUCS.filter((b) => b[role] === scope).length;

type Card = {
  scope: Scope;
  title: string;
  sub: string;
  when: string;
  steps: React.ReactNode[];
  errors: { cause: string; status: StatusId }[];
  done: StatusId;
};

const CARDS: Card[] = [
  {
    scope: "LOKALT",
    title: "Lokal lukking",
    sub: "Bare NAVs kopi av saken lukkes",
    when: `BUC-en har LOKALT for NAVs rolle: ${count("sakseier", "LOKALT")} BUC-er når NAV er sakseier, ${count("motpart", "LOKALT")} når NAV er motpart.`,
    steps: [
      <>
        avslutt henter inntil 1 000 saker med status <code>TIL_AVSLUTNING_LOKALT</code> per BUC.
      </>,
      <>
        Kaller <code>POST …/rinasaker/{"{id}"}/avsluttLokalt</code> i eux-rina-terminator-api.
      </>,
      <>
        Terminatoren finner handlingen «Close case» (<code>LocalClose</code>) på saken og utfører den i RINA.
      </>,
    ],
    errors: [{ cause: "Saken har ikke handlingen «Close case» (409)", status: "HANDLING_MANGLER" }],
    done: "AVSLUTTET_LOKALT",
  },
  {
    scope: "GLOBALT",
    title: "Global lukking med X001",
    sub: "Saken lukkes for alle deltakerne",
    when: `NAV er sakseier, og BUC-en har GLOBALT: ${count("sakseier", "GLOBALT")} BUC-er. Når NAV er motpart, lukkes en sak aldri globalt.`,
    steps: [
      <>
        avslutt henter inntil 1 000 saker med status <code>TIL_AVSLUTNING_GLOBALT</code> per BUC.
      </>,
      <>
        Kaller <code>POST …/rinasaker/{"{id}"}/avsluttGlobalt</code> i eux-rina-terminator-api.
      </>,
      <>
        Terminatoren oppretter en X001 og fyller inn årsak og avslutningskode. Mangler fornavn, etternavn eller
        fødselsdato, hentes de fra saken. Mangler kjønn, settes kode 98.
      </>,
      <>Terminatoren sender X001, og saken lukkes hos alle deltakerne.</>,
    ],
    errors: [
      { cause: "Saken mangler handlingen for å opprette eller sende X001 (409)", status: "HANDLING_MANGLER" },
      { cause: "Persondata mangler også i saken (500)", status: "HANDLING_FEILET" },
    ],
    done: "AVSLUTTET_GLOBALT",
  },
];

export function LocalGlobal({ onFocusStatus }: { onFocusStatus: (s: StatusId) => void }) {
  return (
    <div className="avs-lg">
      {CARDS.map((c) => (
        <article key={c.scope} className="avs-lg__card" data-tone={c.scope === "GLOBALT" ? "info" : "accent"}>
          <header className="avs-lg__head">
            <span className="avs-scope" data-scope={c.scope}>
              {c.scope}
            </span>
            <div>
              <Heading level="3" size="small">
                {c.title}
              </Heading>
              <BodyShort size="small" className="arch-subtle">
                {c.sub}
              </BodyShort>
            </div>
          </header>
          <div className="avs-lg__stage">
            <Mini scope={c.scope} />
          </div>
          <BodyLong size="small">
            <strong>Brukes når: </strong>
            {c.when}
          </BodyLong>
          <ol className="avs-lg__steps">
            {c.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
            <li>
              Saken får status <StatusChips ids={[c.done]} onFocusStatus={onFocusStatus} />
            </li>
          </ol>
          <div className="avs-lg__errors">
            <Detail className="arch-eyebrow">Kan feile</Detail>
            <ul>
              {c.errors.map((e) => (
                <li key={e.cause}>
                  <span>{e.cause}</span>
                  <StatusChips ids={[e.status]} onFocusStatus={onFocusStatus} />
                </li>
              ))}
            </ul>
            {c.scope === "GLOBALT" && (
              <BodyShort size="small" className="arch-subtle">
                Feiler sendingen etter at X001 er opprettet, blir utkastet liggende i saken. Det er slike utkast
                slett-dokumentutkast kan slette.
              </BodyShort>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
