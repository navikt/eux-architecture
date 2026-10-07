"use client";

import { useState } from "react";
import { BodyLong, Button, Chips, HStack, Label, ToggleGroup } from "@navikt/ds-react";
import { ArrowsCirclepathIcon } from "@navikt/aksel-icons";
import { useReducedMotion } from "@/components/architecture/hooks";
import { onActivate } from "@/components/architecture/svg";
import { TONE } from "@/components/avslutning/tones";
import { STATUS_BY_ID, type StatusId, type Tone } from "./data";

const W = 1040;
const H = 440;
const ROW0 = 104;
const ROW = 46;
const LANES = {
  app: { x: 150, title: "eux-slett-usendte-rinasaker", sub: "jobben" },
  term: { x: 520, title: "eux-rina-terminator-api", sub: "Azure AD inn" },
  rina: { x: 890, title: "RINA CPI", sub: "tjenestebruker + CAS" },
} as const;
type Lane = keyof typeof LANES;

type Call = "status" | "slett";
type Rina = "tilbys" | "mangler" | "borte" | "feil";
type Attempt = "forste" | "andre";

type Step =
  | { kind: "msg"; from: Lane; to: Lane; label: string; reply?: boolean; tone?: "danger" | "success" }
  | { kind: "note"; on: Lane; text: string; tone?: Tone; mono?: boolean };

const RINA_OPTIONS: { id: Rina; label: string }[] = [
  { id: "tilbys", label: "Delete_Case tilbys" },
  { id: "mangler", label: "Delete_Case mangler" },
  { id: "borte", label: "Saken finnes ikke (404)" },
  { id: "feil", label: "Annen feil" },
];

function build(call: Call, rina: Rina, attempt: Attempt): { steps: Step[]; result: StatusId; text: string } {
  const fail: StatusId = attempt === "forste" ? "SLETTING_FEILET_RETRY" : "SLETTING_FEILET";
  const failText =
    attempt === "forste"
      ? "Første forsøk: saken får SLETTING_FEILET_RETRY, og slett prøver igjen neste natt."
      : "Andre forsøk: saken får SLETTING_FEILET, og ingen jobb prøver mer.";
  const get: Step = { kind: "msg", from: "term", to: "rina", label: "GET /eessiRest/Cases/{id}" };
  const svar: Record<Rina, Step> = {
    tilbys: { kind: "msg", from: "rina", to: "term", label: "200 · handlingene inkluderer Delete_Case", reply: true },
    mangler: { kind: "msg", from: "rina", to: "term", label: "200 · ingen Delete_Case", reply: true },
    borte: { kind: "msg", from: "rina", to: "term", label: "404 Not Found", reply: true, tone: "danger" },
    feil: { kind: "msg", from: "rina", to: "term", label: "5xx eller tidsavbrudd", reply: true, tone: "danger" },
  };
  const feilSvar: Step = { kind: "msg", from: "term", to: "app", label: "500 eller 422", reply: true, tone: "danger" };

  if (call === "status") {
    const head: Step[] = [{ kind: "msg", from: "app", to: "term", label: "GET /api/v1/rinasaker/{id}/status" }, get, svar[rina]];
    switch (rina) {
      case "tilbys":
        return {
          steps: [...head, { kind: "note", on: "term", text: "kanSlettes = true", mono: true }, { kind: "msg", from: "term", to: "app", label: "200 { kanSlettes: true }", reply: true }],
          result: "TIL_SLETTING",
          text: "RINA tilbyr Delete_Case, så saken merkes TIL_SLETTING. Den slettes når slett kjører kl. 01.00 neste natt.",
        };
      case "mangler":
        return {
          steps: [...head, { kind: "note", on: "term", text: "kanSlettes = false", mono: true }, { kind: "msg", from: "term", to: "app", label: "200 { kanSlettes: false }", reply: true }],
          result: "KAN_IKKE_SLETTES",
          text: "RINA tilbyr ikke Delete_Case. Saken får KAN_IKKE_SLETTES og blir aldri sjekket igjen.",
        };
      case "borte":
        return {
          steps: [...head, { kind: "msg", from: "term", to: "app", label: "404 sendes videre", reply: true, tone: "danger" }, { kind: "note", on: "app", text: "alle feil gir KAN_IKKE_SLETTES", tone: "neutral" }],
          result: "KAN_IKKE_SLETTES",
          text: "Statussjekken skiller ikke på feil. Også 404 gir KAN_IKKE_SLETTES – ikke NOT_FOUND, som bare settes av slett.",
        };
      case "feil":
        return {
          steps: [...head, feilSvar, { kind: "note", on: "app", text: "alle feil gir KAN_IKKE_SLETTES", tone: "neutral" }],
          result: "KAN_IKKE_SLETTES",
          text: "En midlertidig feil i statussjekken gir KAN_IKKE_SLETTES med en gang. Saken sjekkes ikke på nytt.",
        };
    }
  }

  const head: Step[] = [{ kind: "msg", from: "app", to: "term", label: "DELETE /api/v1/rinasaker/{id}" }, get, svar[rina]];
  switch (rina) {
    case "tilbys":
      return {
        steps: [
          ...head,
          { kind: "msg", from: "term", to: "rina", label: "PUT …/Cases/{id}/Actions/{actionId}/Document" },
          { kind: "msg", from: "rina", to: "term", label: "2xx · saken er slettet", reply: true },
          { kind: "msg", from: "term", to: "app", label: "204 No Content", reply: true, tone: "success" },
        ],
        result: "SLETTET",
        text: "Terminator-API-et henter saken på nytt, plukker ut Delete_Case-handlingen og utfører den. Saken er borte fra RINA.",
      };
    case "mangler":
      return {
        steps: [
          ...head,
          { kind: "note", on: "term", text: "«Det er ikke tillatt å fjerne denne Rinasaken.»" },
          { kind: "msg", from: "term", to: "app", label: "400 Bad Request", reply: true, tone: "danger" },
        ],
        result: fail,
        text: `Handlingen er borte siden statussjekken – for eksempel fordi noen har sendt en SED. ${failText}`,
      };
    case "borte":
      return {
        steps: [...head, { kind: "msg", from: "term", to: "app", label: "404 Not Found", reply: true, tone: "danger" }],
        result: "NOT_FOUND",
        text: "Saken var allerede borte fra RINA. Den får NOT_FOUND, og ingen jobb ser på den igjen.",
      };
    case "feil":
      return {
        steps: [...head, feilSvar],
        result: fail,
        text: failText,
      };
  }
}

export function RinaSequence({ onFocusStatus }: { onFocusStatus: (s: StatusId) => void }) {
  const reduced = useReducedMotion();
  const [call, setCall] = useState<Call>("slett");
  const [rina, setRina] = useState<Rina>("tilbys");
  const [attempt, setAttempt] = useState<Attempt>("forste");
  const [run, setRun] = useState(0);
  const retryRelevant = call === "slett" && (rina === "mangler" || rina === "feil");
  const { steps, result, text } = build(call, rina, attempt);
  const info = STATUS_BY_ID[result];
  const key = `${call}-${rina}-${attempt}-${run}`;

  const rowY = (i: number) => ROW0 + i * ROW;
  const resultY = rowY(steps.length);
  const active = (lane: Lane) => {
    const rows = steps.flatMap((s, i) => ((s.kind === "msg" && (s.from === lane || s.to === lane)) || (s.kind === "note" && s.on === lane) ? [i] : []));
    return rows.length ? { from: rowY(Math.min(...rows)) - 12, to: rowY(Math.max(...rows)) + 12 } : null;
  };
  const delay = (i: number) => (reduced ? 0 : i * 280);

  return (
    <div className="sl-seq">
      <HStack gap="space-16" wrap align="end" className="sl-seq__controls">
        <ToggleGroup size="small" value={call} onChange={(v) => setCall(v as Call)} label="Kall">
          <ToggleGroup.Item value="status" label="2 · Statussjekk" />
          <ToggleGroup.Item value="slett" label="1 · Sletting" />
        </ToggleGroup>
        <div className="sl-seq__field">
          <Label as="span" size="small" className="sl-seq__label" id="sl-seq-rina">
            Saken i RINA
          </Label>
          <Chips size="small" aria-labelledby="sl-seq-rina" className="sl-seq__chips">
            {RINA_OPTIONS.map((o) => (
              <Chips.Toggle key={o.id} selected={rina === o.id} checkmark={false} onClick={() => setRina(o.id)}>
                {o.label}
              </Chips.Toggle>
            ))}
          </Chips>
        </div>
        {call === "slett" && (
          <ToggleGroup size="small" value={retryRelevant ? attempt : "forste"} onChange={(v) => setAttempt(v as Attempt)} label="Forsøk">
            <ToggleGroup.Item value="forste" label="Første" disabled={!retryRelevant} />
            <ToggleGroup.Item value="andre" label="Andre" disabled={!retryRelevant} />
          </ToggleGroup>
        )}
        <Button size="small" variant="tertiary" icon={<ArrowsCirclepathIcon aria-hidden />} onClick={() => setRun((r) => r + 1)}>
          Spill av igjen
        </Button>
      </HStack>

      <div className="portal-diagram avs-surface">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", minWidth: 760, height: "auto", display: "block" }}
          role="img"
          aria-label={`Sekvens: ${steps.map((s) => (s.kind === "msg" ? `${s.from} til ${s.to}: ${s.label}` : s.text)).join(". ")}. Resultat: ${result}.`}
        >
          <defs>
            {(
              [
                ["sl-seq-arrow", "var(--ax-border-neutral-strong)"],
                ["sl-seq-arrow-danger", "var(--ax-border-danger)"],
                ["sl-seq-arrow-success", "var(--ax-border-success)"],
              ] as const
            ).map(([id, fill]) => (
              <marker key={id} id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill={fill} />
              </marker>
            ))}
          </defs>

          {/* Livslinjer */}
          {(Object.keys(LANES) as Lane[]).map((id) => {
            const l = LANES[id];
            const tone = id === "app" ? TONE.accent : TONE.info;
            const act = active(id);
            return (
              <g key={id}>
                <line x1={l.x} x2={l.x} y1={62} y2={H - 14} stroke="var(--ax-border-neutral)" strokeDasharray="4 5" />
                <rect x={l.x - 120} y={12} width={240} height={50} rx={12} fill={tone.fill} stroke={tone.stroke} strokeWidth={1.5} />
                <text x={l.x} y={34} textAnchor="middle" fontSize={12.5} fontWeight={800} fill="var(--ax-text-neutral)">
                  {l.title}
                </text>
                <text x={l.x} y={50} textAnchor="middle" fontSize={10} fill="var(--ax-text-neutral-subtle)">
                  {l.sub}
                </text>
                {act && (
                  <rect
                    x={l.x - 5}
                    y={act.from}
                    width={10}
                    height={(id === "app" ? resultY - 18 : act.to) - act.from}
                    rx={3}
                    fill="var(--ax-bg-default)"
                    stroke={tone.stroke}
                    strokeWidth={1.3}
                    className="sl-seq__act"
                  />
                )}
              </g>
            );
          })}

          {/* Steg */}
          {steps.map((s, i) => {
            const y = rowY(i);
            if (s.kind === "note") {
              const x = LANES[s.on].x;
              const w = Math.round(s.text.length * (s.mono ? 6.2 : 5.6) + 26);
              const tone = TONE[s.tone ?? "info"];
              return (
                <g key={`${key}-${i}`} className="sl-seq__step" style={{ animationDelay: `${delay(i)}ms` }}>
                  <rect x={x - w / 2} y={y - 13} width={w} height={26} rx={8} fill={tone.fill} stroke={tone.stroke} strokeWidth={1.2} />
                  <text x={x} y={y + 4} textAnchor="middle" fontSize={10.5} fontWeight={s.mono ? 700 : 400} fontStyle={s.mono ? undefined : "italic"} className={s.mono ? "arch-mono" : ""} fill="var(--ax-text-neutral)">
                    {s.text}
                  </text>
                </g>
              );
            }
            const fx = LANES[s.from].x;
            const tx = LANES[s.to].x;
            const dir = tx > fx ? 1 : -1;
            const x1 = fx + dir * 6;
            const x2 = tx - dir * 7;
            const stroke = s.tone === "danger" ? "var(--ax-border-danger)" : s.tone === "success" ? "var(--ax-border-success)" : "var(--ax-border-neutral-strong)";
            const marker = s.tone ? `sl-seq-arrow-${s.tone}` : "sl-seq-arrow";
            return (
              <g key={`${key}-${i}`} className="sl-seq__step" style={{ animationDelay: `${delay(i)}ms` }}>
                <path d={`M ${x1} ${y} L ${x2} ${y}`} stroke={stroke} strokeWidth={1.6} strokeDasharray={s.reply ? "6 4" : undefined} fill="none" markerEnd={`url(#${marker})`} />
                {!reduced && (
                  <circle
                    cx={x1}
                    cy={y}
                    r={4}
                    fill={s.tone === "danger" ? TONE.danger.strong : s.tone === "success" ? TONE.success.strong : TONE.accent.strong}
                    className="sl-seq__packet"
                    style={{ animationDelay: `${delay(i)}ms`, ["--sl-dx" as string]: `${x2 - x1}px` }}
                  />
                )}
                <text
                  x={(fx + tx) / 2}
                  y={y - 8}
                  textAnchor="middle"
                  fontSize={10.5}
                  fontWeight={s.reply ? 400 : 700}
                  className="arch-mono arch-halo"
                  fill={s.tone === "danger" ? "var(--ax-text-danger)" : s.tone === "success" ? "var(--ax-text-success)" : "var(--ax-text-neutral)"}
                >
                  {s.label}
                </text>
              </g>
            );
          })}

          {/* Resultat */}
          <g
            key={`${key}-res`}
            className="sl-seq__step sl-seq__result arch-node"
            style={{ animationDelay: `${delay(steps.length)}ms` }}
            role="button"
            tabIndex={0}
            aria-label={`Resultat ${result}: vis i statusdiagrammet`}
            onClick={() => onFocusStatus(result)}
            onKeyDown={onActivate(() => onFocusStatus(result))}
          >
            {(() => {
              const tone = TONE[info.tone];
              const w = Math.round(result.length * 6.4 + 50);
              const x = LANES.app.x;
              return (
                <>
                  <rect x={x - w / 2} y={resultY - 15} width={w} height={30} rx={15} fill={tone.fill} stroke={tone.stroke} strokeWidth={1.8} className="arch-box" />
                  <rect x={x - w / 2} y={resultY - 15} width={w} height={30} rx={15} fill="none" stroke={tone.stroke} className="arch-pulse" />
                  <text x={x} y={resultY + 4} textAnchor="middle" fontSize={11} fontWeight={800} className="arch-mono" fill={tone.text}>
                    → {result}
                  </text>
                </>
              );
            })()}
          </g>
        </svg>
      </div>

      <div className="avs-detail" data-tone={info.tone} aria-live="polite">
        <BodyLong size="small">
          <button type="button" className="avs-chip arch-mono" data-tone={info.tone} onClick={() => onFocusStatus(result)}>
            {result}
          </button>{" "}
          {text}
        </BodyLong>
      </div>
    </div>
  );
}
