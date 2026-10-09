"use client";

import { useEffect, useState } from "react";
import { BodyLong, BodyShort, Button, Detail, Heading, ToggleGroup } from "@navikt/ds-react";
import { ChevronLeftIcon, ChevronRightIcon, CogIcon, EnvelopeClosedIcon, MoonIcon, PauseIcon, PersonIcon, PlayIcon } from "@navikt/aksel-icons";
import { useReducedMotion } from "@/components/architecture/hooks";
import { STATUS_BY_ID, type StatusId } from "./data";

type Variant = "neessi" | "gosys";
type Actor = "fagmodul" | "natt" | "saksbehandler";
type Jp = { state: "midlertidig" | "journalført"; note: string };
type Oppgave = { type: "JFR" | "BEH_SED"; done?: boolean; note?: string };
type Row = { mottatt?: string; jp?: Jp; oppgaver: Oppgave[]; status?: StatusId };
type Board = { rows: [Row, Row, Row]; dokumenter: number };
type StoryStep = { id: string; when: string; actor: Actor; who: string; title: string; text: string; board: Board; focus: number[] };

const VENTER: Row = { oppgaver: [] };

const r1: Row = {
  mottatt: "mandag 10.14",
  jp: { state: "midlertidig", note: "uten sak" },
  oppgaver: [{ type: "JFR", note: "4303" }],
  status: "UKJENT",
};
const r2: Row = {
  mottatt: "mandag 15.40",
  jp: { state: "midlertidig", note: "uten sak" },
  oppgaver: [{ type: "JFR", note: "4303" }],
  status: "UKJENT",
};

function steps(variant: Variant): StoryStep[] {
  const start: StoryStep[] = [
    {
      id: "s1",
      when: "Mandag 10.14",
      actor: "fagmodul",
      who: "eux-fagmodul-journalfoering",
      title: "Første SED kommer inn",
      text: "Saken finnes ikke i nav-rinasak. For sektor S og H leter ikke fagmodulen etter fagsak på personen, så journalposten får ingen sak og blir midlertidig. JFR-oppgaven går til 4303. Til slutt oppretter fagmodulen saken i nav-rinasak og legger til dokumentet.",
      board: { rows: [r1, VENTER, VENTER], dokumenter: 1 },
      focus: [0],
    },
    {
      id: "s2",
      when: "Mandag 15.40",
      actor: "fagmodul",
      who: "eux-fagmodul-journalfoering",
      title: "Andre SED – fortsatt ingen fagsak",
      text: "Nå finnes saken i nav-rinasak, men uten fagsak. Journalposten til første SED har heller ingen sak i SAF. Ingen SED i saken er journalført, så fagmodulen ber ikke om ferdigstilling. Enda en midlertidig journalpost og enda en JFR-oppgave.",
      board: { rows: [r1, r2, VENTER], dokumenter: 2 },
      focus: [1],
    },
    {
      id: "s3",
      when: "Natt til tirsdag 01.00",
      actor: "natt",
      who: "ferdigstill",
      title: "Natten – ingenting å kopiere fra",
      text: "ferdigstill leser begge UKJENT. Ingen journalpost i saken er ferdigstilt, så jobben har ingen sak og bruker å kopiere. Statusene blir stående. feilregistrer kl. 02.00 rører dem ikke: de er inngående og yngre enn 30 dager.",
      board: { rows: [r1, r2, VENTER], dokumenter: 2 },
      focus: [0, 1],
    },
  ];

  const a4: Row[] = [
    { ...r1, jp: { state: "journalført", note: "på valgt fagsak" }, oppgaver: [{ type: "JFR", done: true }] },
    { ...r2, jp: { state: "journalført", note: "på valgt fagsak" }, oppgaver: [{ type: "JFR", done: true }] },
  ];
  const b4: Row = { ...r1, jp: { state: "journalført", note: "i Gosys" } };
  const b5r2: Row = {
    ...r2,
    jp: { state: "journalført", note: "sak og bruker fra SED 1" },
    oppgaver: [{ type: "JFR", done: true }, { type: "BEH_SED" }],
    status: "JOURNALFOERT",
  };

  const middle: StoryStep[] =
    variant === "neessi"
      ? [
          {
            id: "a4",
            when: "Tirsdag 09.30",
            actor: "saksbehandler",
            who: "Saksbehandler i nEESSI",
            title: "Saksbehandler journalfører fra nEESSI",
            text: "Saksbehandler velger fagsak og journalfører saken i nEESSI. Fagmodulen oppdaterer og ferdigstiller begge journalpostene og ferdigstiller oppgavene. sed_journalstatus endres ikke – begge står fortsatt som UKJENT.",
            board: { rows: [a4[0], a4[1], VENTER], dokumenter: 2 },
            focus: [0, 1],
          },
          {
            id: "a5",
            when: "Natt til onsdag 01.00",
            actor: "natt",
            who: "ferdigstill",
            title: "Natten rydder statusen",
            text: "SAF viser at begge journalpostene er journalført. ferdigstill setter JOURNALFOERT uten å endre noe i Dokarkiv.",
            board: { rows: [{ ...a4[0], status: "JOURNALFOERT" }, { ...a4[1], status: "JOURNALFOERT" }, VENTER], dokumenter: 2 },
            focus: [0, 1],
          },
        ]
      : [
          {
            id: "b4",
            when: "Tirsdag 09.30",
            actor: "saksbehandler",
            who: "Saksbehandler i Gosys",
            title: "Saksbehandler journalfører én SED i Gosys",
            text: "Saksbehandler åpner JFR-oppgaven for SED 1 i Gosys og journalfører journalposten på en fagsak. SED 2 blir liggende. sed_journalstatus endres ikke.",
            board: { rows: [b4, r2, VENTER], dokumenter: 2 },
            focus: [0],
          },
          {
            id: "b5",
            when: "Natt til onsdag 01.00",
            actor: "natt",
            who: "ferdigstill",
            title: "Natten fullfører resten",
            text: "SED 1 er journalført i SAF og får JOURNALFOERT. SED 2 er fortsatt midlertidig, men nå finnes en ferdigstilt journalpost i saken. ferdigstill kopierer sak, bruker og tema fra SED 1, ferdigstiller via eux-journal, lukker oppgavene til journalposten og lager en BEH_SED-oppgave.",
            board: { rows: [{ ...b4, status: "JOURNALFOERT" }, b5r2, VENTER], dokumenter: 2 },
            focus: [0, 1],
          },
        ];

  const last = middle[middle.length - 1].board.rows;
  const end: StoryStep = {
    id: "s6",
    when: "Torsdag 11.02",
    actor: "fagmodul",
    who: "eux-fagmodul-journalfoering",
    title: "Tredje SED går rett igjennom",
    text: "Saken i nav-rinasak har fortsatt ingen fagsak, så fagmodulen henter den fra journalposten til det første dokumentet i saken – SED 1 – i SAF. En SED i saken er journalført, så fagmodulen ber om ferdigstilling. Journalposten har sak og bruker og blir ferdigstilt med en gang. Oppgaven blir BEH_SED, og statusen JOURNALFOERT.",
    board: {
      rows: [
        last[0],
        last[1],
        { mottatt: "torsdag 11.02", jp: { state: "journalført", note: "ferdigstilt med en gang" }, oppgaver: [{ type: "BEH_SED" }], status: "JOURNALFOERT" },
      ],
      dokumenter: 3,
    },
    focus: [2],
  };
  return [...start, ...middle, end];
}

const ACTOR_ICON = {
  fagmodul: <CogIcon aria-hidden />,
  natt: <MoonIcon aria-hidden />,
  saksbehandler: <PersonIcon aria-hidden />,
} as const;

const ACTOR_TONE: Record<Actor, string> = { fagmodul: "accent", natt: "warning", saksbehandler: "meta-purple" };

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

const STEP_MS = 4200;

export function CaseStory({ onFocusStatus }: { onFocusStatus: (s: StatusId) => void }) {
  const reduced = useReducedMotion();
  const [variant, setVariant] = useState<Variant>("neessi");
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const list = steps(variant);
  const step = list[index];
  const prev = index > 0 ? list[index - 1].board : null;

  useEffect(() => {
    if (!playing) return;
    if (index >= list.length - 1) {
      const t = setTimeout(() => setPlaying(false), 0);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setIndex((i) => i + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [playing, index, list.length]);

  const go = (i: number) => {
    setPlaying(false);
    setIndex(Math.max(0, Math.min(list.length - 1, i)));
  };
  const changeVariant = (v: Variant) => {
    setVariant(v);
    setPlaying(false);
    if (index > 2) setIndex(3);
  };
  const play = () => {
    if (playing) return setPlaying(false);
    if (index >= list.length - 1) setIndex(0);
    setPlaying(true);
  };

  const changed = (row: number, col: keyof Row) => !!prev && !same(prev.rows[row][col], step.board.rows[row][col]);

  return (
    <div className="jfr-story">
      <div className="jfr-story__top">
        <ToggleGroup size="small" value={variant} onChange={(v) => changeVariant(v as Variant)} label="Hvordan journalfører saksbehandler?">
          <ToggleGroup.Item value="neessi">I nEESSI</ToggleGroup.Item>
          <ToggleGroup.Item value="gosys">I Gosys</ToggleGroup.Item>
        </ToggleGroup>
        <BodyShort size="small" className="arch-subtle">
          En H-sak startet i et annet land. Personen er identifisert og har ikke strengt fortrolig adresse. Tre SED-er kommer inn i løpet av en uke.
        </BodyShort>
      </div>

      <ol className="jfr-story__timeline" aria-label="Steg">
        {list.map((s, i) => (
          <li key={s.id} data-actor={s.actor} data-state={i < index ? "done" : i === index ? "now" : "next"}>
            <button type="button" onClick={() => go(i)} aria-current={i === index ? "step" : undefined}>
              <span className="jfr-story__dot" data-tone={ACTOR_TONE[s.actor]} aria-hidden>
                {ACTOR_ICON[s.actor]}
              </span>
              <span className="jfr-story__when">{s.when}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="jfr-story__stage">
        <div className="jfr-story__narr" key={`${variant}-${step.id}`} data-tone={ACTOR_TONE[step.actor]} aria-live="polite">
          <Detail className="arch-eyebrow">
            <span className="jfr-story__who">
              {ACTOR_ICON[step.actor]} {step.who}
            </span>
          </Detail>
          <Heading level="3" size="small" spacing>
            {step.title}
          </Heading>
          <BodyLong size="small">{step.text}</BodyLong>
        </div>

        <div className="jfr-board" role="table" aria-label="Status for de tre SED-ene">
          <div className="jfr-board__row jfr-board__row--head" role="row">
            <span role="columnheader">SED</span>
            <span role="columnheader">Journalpost</span>
            <span role="columnheader">Oppgave</span>
            <span role="columnheader">sed_journalstatus</span>
          </div>
          {step.board.rows.map((r, i) => {
            const focus = step.focus.includes(i);
            return (
              <div key={i} className="jfr-board__row" role="row" data-focus={focus} data-empty={!r.mottatt}>
                <span role="cell" className="jfr-board__sed" data-changed={changed(i, "mottatt")} key={`m-${r.mottatt ?? "v"}`}>
                  <EnvelopeClosedIcon aria-hidden />
                  <span>
                    <strong>SED {i + 1}</strong>
                    <small>{r.mottatt ? `mottatt ${r.mottatt}` : "venter"}</small>
                  </span>
                </span>
                <span role="cell" data-changed={changed(i, "jp")} key={`j-${index}-${variant}-${changed(i, "jp")}`}>
                  {r.jp ? (
                    <span className="jfr-board__jp" data-tone={r.jp.state === "journalført" ? "success" : "warning"}>
                      <strong>{r.jp.state}</strong>
                      <small>{r.jp.note}</small>
                    </span>
                  ) : (
                    <span className="jfr-board__none">–</span>
                  )}
                </span>
                <span role="cell" className="jfr-board__oppgaver" data-changed={changed(i, "oppgaver")} key={`o-${index}-${variant}-${changed(i, "oppgaver")}`}>
                  {r.oppgaver.length ? (
                    r.oppgaver.map((o, k) => (
                      <span key={k} className="jfr-board__oppgave arch-mono" data-done={!!o.done} data-tone={o.type === "JFR" ? "warning" : "info"}>
                        {o.type}
                        {o.note && <small>{o.note}</small>}
                        {o.done && <small>ferdigstilt</small>}
                      </span>
                    ))
                  ) : (
                    <span className="jfr-board__none">–</span>
                  )}
                </span>
                <span role="cell" data-changed={changed(i, "status")} key={`s-${index}-${variant}-${changed(i, "status")}`}>
                  {r.status ? (
                    <button
                      type="button"
                      className="avs-chip arch-mono"
                      data-tone={STATUS_BY_ID[r.status].tone}
                      onClick={() => onFocusStatus(r.status!)}
                      title={`${STATUS_BY_ID[r.status].label} – vis i statusdiagrammet`}
                    >
                      {r.status}
                    </button>
                  ) : (
                    <span className="jfr-board__none">–</span>
                  )}
                </span>
              </div>
            );
          })}
          <div className="jfr-board__foot">
            <span className="arch-mono">nav-rinasak</span>
            <span className="jfr-board__docs" aria-label={`${step.board.dokumenter} dokumenter`}>
              {[0, 1, 2].map((d) => (
                <i key={d} data-on={d < step.board.dokumenter} />
              ))}
            </span>
            <span className="arch-subtle">
              {step.board.dokumenter} {step.board.dokumenter === 1 ? "dokument" : "dokumenter"} med dokumentInfoId
            </span>
          </div>
        </div>
      </div>

      <div className="jfr-story__controls">
        <Button size="small" variant="tertiary-neutral" icon={<ChevronLeftIcon aria-hidden />} onClick={() => go(index - 1)} disabled={index === 0}>
          Forrige
        </Button>
        <Button size="small" variant="secondary-neutral" icon={playing ? <PauseIcon aria-hidden /> : <PlayIcon aria-hidden />} onClick={play}>
          {playing ? "Pause" : index >= list.length - 1 ? "Spill av på nytt" : "Spill av"}
        </Button>
        <Button
          size="small"
          variant="tertiary-neutral"
          icon={<ChevronRightIcon aria-hidden />}
          iconPosition="right"
          onClick={() => go(index + 1)}
          disabled={index === list.length - 1}
        >
          Neste
        </Button>
        <BodyShort size="small" className="arch-subtle jfr-story__count">
          Steg {index + 1} av {list.length}
        </BodyShort>
        {playing && !reduced && <span className="jfr-story__progress" key={index} style={{ ["--jfr-step" as string]: `${STEP_MS}ms` }} aria-hidden />}
      </div>
    </div>
  );
}
