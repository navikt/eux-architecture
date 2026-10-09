"use client";

import { useState } from "react";
import { BodyLong, BodyShort, Button, HStack, Switch, ToggleGroup } from "@navikt/ds-react";
import { ArrowsCirclepathIcon } from "@navikt/aksel-icons";
import { useReducedMotion } from "@/components/architecture/hooks";
import { onActivate } from "@/components/architecture/svg";
import { TONE } from "@/components/avslutning/tones";
import type { StatusId, Tone } from "./data";
import { StatusChips } from "./StatusChips";

type Flow = "journalfoer" | "feilregistrer";
type LaneId = "web" | "neessi" | "fagmodul" | "journal" | "navrinasak" | "saf" | "dokarkiv" | "oppgave" | "rinaapi";

const LANE_INFO: Record<LaneId, { title: string; sub: string; tone: Tone }> = {
  web: { title: "nEESSI", sub: "eux-web-app", tone: "meta-purple" },
  neessi: { title: "eux-neessi", sub: "BFF", tone: "info" },
  fagmodul: { title: "Fagmodulen", sub: "eux-fagmodul-journalfoering", tone: "accent" },
  journal: { title: "eux-journal", sub: "ferdigstill og avbryt", tone: "accent" },
  navrinasak: { title: "eux-nav-rinasak", sub: "saken og dokumentene", tone: "info" },
  saf: { title: "SAF", sub: "journalposter", tone: "neutral" },
  dokarkiv: { title: "Dokarkiv", sub: "skriver journalposter", tone: "neutral" },
  oppgave: { title: "eux-oppgave", sub: "oppgaver", tone: "info" },
  rinaapi: { title: "eux-rina-api", sub: "RINA-saken", tone: "info" },
};

const FLOW_LANES: Record<Flow, LaneId[]> = {
  journalfoer: ["web", "neessi", "fagmodul", "navrinasak", "saf", "dokarkiv", "oppgave", "rinaapi"],
  feilregistrer: ["web", "neessi", "journal", "navrinasak", "saf", "dokarkiv", "oppgave"],
};

type Step =
  | { kind: "msg"; from: LaneId; to: LaneId; label: string; text: string; reply?: boolean; tone?: "danger" | "success" }
  | { kind: "note"; on: LaneId; label: string; text: string; tone?: Tone };

function build(flow: Flow, oppgave: boolean): Step[] {
  if (flow === "journalfoer") {
    return [
      {
        kind: "msg",
        from: "web",
        to: "neessi",
        label: "POST journalfoer",
        text: "POST /api/rina/sak/{id}/journalfoer?enhetNr&opprettOppgave, med fagsaken saksbehandler har valgt.",
      },
      { kind: "note", on: "neessi", label: "fnr → aktørId", text: "eux-neessi slår opp aktørId i PDL. Uten fnr svarer den 400." },
      {
        kind: "msg",
        from: "neessi",
        to: "fagmodul",
        label: "PUT …/fagsak",
        text: "PUT /api/journalposter/rinasak/{id}/fagsak. Mangler fagsak eller aktørId, svarer fagmodulen 400.",
      },
      { kind: "msg", from: "fagmodul", to: "navrinasak", label: "dokumenter", text: "Henter dokumentene i saken. Uten dokumenter svarer fagmodulen 404." },
      {
        kind: "msg",
        from: "fagmodul",
        to: "saf",
        label: "nyeste journalpost",
        text: "For hvert dokument: nyeste journalpost. UKJENT, AVBRUTT, UTGAAR og UKJENT_BRUKER hoppes over. Er den journalført fra før, sjekkes bare at fagsaken stemmer.",
      },
      {
        kind: "msg",
        from: "fagmodul",
        to: "dokarkiv",
        label: "oppdater + ferdigstill",
        text: "Setter bruker, sak og tema fra fagsaken og ferdigstiller. Journalførende enhet er enhetNr, eller 9999 hvis den mangler.",
      },
      { kind: "msg", from: "fagmodul", to: "oppgave", label: "ferdigstill oppgaver", text: "Lukker oppgavene til journalpostene som ble journalført." },
      ...(oppgave
        ? ([
            { kind: "msg", from: "fagmodul", to: "rinaapi", label: "oversikt", text: "Henter BUC-type og om NAV er sakseier, for å velge behandlingstema og behandlingstype." },
            { kind: "msg", from: "fagmodul", to: "oppgave", label: "opprett BEH_SED", text: "Lager én BEH_SED-oppgave for saken til enhetNr." },
            {
              kind: "msg",
              from: "fagmodul",
              to: "navrinasak",
              label: "overstyrtEnhetsnummer",
              text: "Er enhetNr ny for saken, lagres den som overstyrtEnhetsnummer. Fagmodulen bruker den når den velger enhet for senere S- og H-SED-er i saken.",
            },
          ] satisfies Step[])
        : []),
      { kind: "msg", from: "fagmodul", to: "neessi", label: "logg", reply: true, tone: "success", text: "Svarer med en logg: hva som ble journalført, hva som ikke ble det, og hvilke oppgaver som ble lukket." },
      {
        kind: "msg",
        from: "neessi",
        to: "web",
        label: "200",
        reply: true,
        tone: "success",
        text: "eux-neessi bytter SED-id-ene i loggen med SED-type og tittel fra saksoversikten. Saksbehandler ser resultatet i nEESSI.",
      },
    ];
  }
  return [
    { kind: "msg", from: "web", to: "neessi", label: "POST feilregistrer", text: "POST /api/rina/sak/{id}/feilregistrerjournalposter." },
    { kind: "msg", from: "neessi", to: "journal", label: "POST …/feilregistrer", text: "POST /api/v1/rinasaker/{id}/journalposter/feilregistrer." },
    { kind: "msg", from: "journal", to: "navrinasak", label: "dokumenter", text: "Henter dokumentene i saken." },
    { kind: "msg", from: "journal", to: "saf", label: "journalposter", text: "Første tilknyttede journalpost per dokument. Journalposter som er journalført, hoppes over." },
    { kind: "msg", from: "journal", to: "dokarkiv", label: "utgående: avbryt", text: "Utgående journalposter får status avbrutt." },
    {
      kind: "msg",
      from: "journal",
      to: "oppgave",
      label: "inngående: flytt til 2950",
      text: "For inngående flyttes oppgaven til journalposten til enhet 2950 med kommentaren «Den mottatte SEDen kan ikke journalføres. Dokumentet skal derfor settes til 'utgått' i Joark.»",
    },
    {
      kind: "note",
      on: "journal",
      label: "lagrer resultatet",
      text: "Hvert dokument lagres i databasen til eux-journal: SATT_TIL_STATUS_AVBRYT, OPPGAVE_FLYTTET, FEILREGISTRERING_FEILET eller OPPGAVEFLYTT_FEILET.",
    },
    { kind: "msg", from: "journal", to: "neessi", label: "resultat", reply: true, tone: "success", text: "Svarer med én feilregistrering per dokument." },
    {
      kind: "msg",
      from: "neessi",
      to: "web",
      label: "200",
      reply: true,
      tone: "success",
      text: "eux-neessi deler svaret i feilregistrert og ikke feilregistrert. Bare FEILREGISTRERING_FEILET regnes som ikke feilregistrert.",
    },
  ];
}

const W = 1240;
const GUTTER = 44;
const MARGIN = 86;
const ROW0 = 108;
const ROW = 42;
const r2 = (n: number) => Math.round(n * 100) / 100;

const OUTRO: Record<Flow, { text: string; status: StatusId[] }> = {
  journalfoer: {
    text: "Ingen av kallene endrer sed_journalstatus. SED-ene står som UKJENT til ferdigstill kjører kl. 01.00, ser at journalpostene er journalført i SAF og setter JOURNALFOERT.",
    status: ["UKJENT", "JOURNALFOERT"],
  },
  feilregistrer: {
    text: "Heller ikke feilregistreringen endrer sed_journalstatus. En avbrutt journalpost har status AVBRUTT i SAF, ikke FEILREGISTRERT. SED-ene blir derfor stående som UKJENT, og nattjobbene tar dem opp igjen.",
    status: ["UKJENT"],
  },
};

export function ManualFlows({ onFocusStatus }: { onFocusStatus: (s: StatusId) => void }) {
  const reduced = useReducedMotion();
  const [flow, setFlow] = useState<Flow>("journalfoer");
  const [oppgave, setOppgave] = useState(true);
  const [run, setRun] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  const lanes = FLOW_LANES[flow];
  const spacing = (W - GUTTER - 2 * MARGIN) / (lanes.length - 1);
  const laneX = Object.fromEntries(lanes.map((id, i) => [id, r2(GUTTER + MARGIN + i * spacing)])) as Record<LaneId, number>;
  const boxW = Math.min(150, spacing - 10);
  const steps = build(flow, oppgave);
  const rowY = (i: number) => ROW0 + i * ROW;
  const lifeEnd = rowY(steps.length - 1) + 24;
  const H = rowY(steps.length) + 34;
  const key = `${flow}-${oppgave}-${run}`;
  const delay = (i: number) => (reduced ? 0 : 200 + i * 260);

  // Lanes that wait for or send a reply hold one bar for the whole call; the rest get one short bar per call.
  const activations = (lane: LaneId) => {
    const rows = steps.flatMap((s, i) => ((s.kind === "msg" && (s.from === lane || s.to === lane)) || (s.kind === "note" && s.on === lane) ? [i] : []));
    if (!rows.length) return [];
    const sync = steps.some((s) => s.kind === "msg" && s.reply && (s.from === lane || s.to === lane));
    const spans = sync ? [[Math.min(...rows), Math.max(...rows)]] : rows.map((r) => [r, r]);
    return spans.map(([a, b]) => ({ from: rowY(a) - 12, to: rowY(b) + 12 }));
  };

  // Centre each label in a lifeline gap (nearest the source on long arrows) so it never sits on a lifeline.
  const labelX = (from: LaneId, to: LaneId) => {
    const a = lanes.indexOf(from);
    const b = lanes.indexOf(to);
    const dir = b > a ? 1 : -1;
    const gaps = Math.abs(b - a);
    const g = a + dir * Math.floor((gaps - 1) / 2);
    return r2((laneX[lanes[g]] + laneX[lanes[g + dir]]) / 2);
  };
  const labelSize = (label: string) => Math.min(10.5, (spacing - 22) / (label.length * 0.6));

  return (
    <div className="jfr-seq">
      <HStack gap="space-16" wrap align="end" className="sl-seq__controls">
        <ToggleGroup size="small" value={flow} onChange={(v) => setFlow(v as Flow)} label="Hva gjør saksbehandler?">
          <ToggleGroup.Item value="journalfoer" label="Journalfør saken" />
          <ToggleGroup.Item value="feilregistrer" label="Feilregistrer journalpostene" />
        </ToggleGroup>
        {flow === "journalfoer" && (
          <Switch size="small" checked={oppgave} onChange={(e) => setOppgave(e.target.checked)}>
            Lag BEH_SED-oppgave
          </Switch>
        )}
        <Button size="small" variant="tertiary" icon={<ArrowsCirclepathIcon aria-hidden />} onClick={() => setRun((r) => r + 1)}>
          Spill av igjen
        </Button>
      </HStack>

      <div className="portal-diagram avs-surface">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", minWidth: 900, height: "auto", display: "block" }}
          role="img"
          aria-label={`Sekvens: ${steps.map((s, i) => `${i + 1}. ${s.kind === "msg" ? `${LANE_INFO[s.from].title} til ${LANE_INFO[s.to].title}: ${s.label}` : s.label}`).join(". ")}.`}
        >
          <defs>
            {(
              [
                ["jfr-seq-arrow", "var(--ax-border-neutral-strong)"],
                ["jfr-seq-arrow-success", "var(--ax-border-success)"],
                ["jfr-seq-arrow-danger", "var(--ax-border-danger)"],
              ] as const
            ).map(([id, fill]) => (
              <marker key={id} id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill={fill} />
              </marker>
            ))}
          </defs>

          {/* Radmarkering */}
          {hover !== null && (
            <rect x={6} y={rowY(hover) - 20} width={W - 12} height={36} rx={10} fill="var(--ax-bg-accent-soft)" className="jfr-seq__band" />
          )}

          {/* Livslinjer */}
          {lanes.map((id) => {
            const l = LANE_INFO[id];
            const x = laneX[id];
            const tone = TONE[l.tone];
            return (
              <g key={`${flow}-${id}`} className="jfr-seq__lane">
                <line x1={x} x2={x} y1={62} y2={lifeEnd} stroke="var(--ax-border-neutral)" strokeDasharray="4 5" />
                <rect x={r2(x - boxW / 2)} y={12} width={boxW} height={50} rx={12} fill={tone.fill} stroke={tone.stroke} strokeWidth={1.5} />
                <text x={x} y={33} textAnchor="middle" fontSize={12} fontWeight={800} fill="var(--ax-text-neutral)">
                  {l.title}
                </text>
                <text x={x} y={49} textAnchor="middle" fontSize={id === "fagmodul" ? 8.6 : 9.5} fill="var(--ax-text-neutral-subtle)">
                  {l.sub}
                </text>
                {activations(id).map((act) => (
                  <rect
                    key={`${key}-${act.from}`}
                    x={x - 5}
                    y={act.from}
                    width={10}
                    height={act.to - act.from}
                    rx={3}
                    fill="var(--ax-bg-default)"
                    stroke={tone.stroke}
                    strokeWidth={1.3}
                    className="sl-seq__act"
                  />
                ))}
              </g>
            );
          })}

          {/* Steg */}
          {steps.map((s, i) => {
            const y = rowY(i);
            const on = hover === i;
            const num = (
              <g className="jfr-seq__no">
                <circle cx={22} cy={y} r={10} fill={on ? TONE.accent.strong : "var(--ax-bg-neutral-moderate)"} />
                <text x={22} y={y + 3.8} textAnchor="middle" fontSize={10.5} fontWeight={800} fill={on ? "var(--ax-text-accent-contrast)" : "var(--ax-text-neutral)"}>
                  {i + 1}
                </text>
              </g>
            );
            const handlers = {
              onMouseEnter: () => setHover(i),
              onMouseLeave: () => setHover(null),
            };
            if (s.kind === "note") {
              const x = laneX[s.on];
              const w = Math.round(s.label.length * 6.1 + 28);
              const tone = TONE[s.tone ?? "info"];
              return (
                <g key={`${key}-${i}`} className="sl-seq__step" style={{ animationDelay: `${delay(i)}ms` }} {...handlers}>
                  {num}
                  <rect x={r2(x - w / 2)} y={y - 13} width={w} height={26} rx={8} fill={tone.fill} stroke={tone.stroke} strokeWidth={1.2} />
                  <text x={x} y={y + 4} textAnchor="middle" fontSize={10.5} fontWeight={700} className="arch-mono" fill="var(--ax-text-neutral)">
                    {s.label}
                  </text>
                </g>
              );
            }
            const fx = laneX[s.from];
            const tx = laneX[s.to];
            const dir = tx > fx ? 1 : -1;
            const x1 = fx + dir * 6;
            const x2 = tx - dir * 7;
            const stroke = s.tone === "danger" ? "var(--ax-border-danger)" : s.tone === "success" ? "var(--ax-border-success)" : "var(--ax-border-neutral-strong)";
            const marker = s.tone ? `jfr-seq-arrow-${s.tone}` : "jfr-seq-arrow";
            return (
              <g key={`${key}-${i}`} className="sl-seq__step" style={{ animationDelay: `${delay(i)}ms` }} {...handlers}>
                {num}
                <rect x={Math.min(fx, tx)} y={y - 20} width={Math.abs(tx - fx)} height={28} fill="transparent" />
                <path
                  d={`M ${x1} ${y} L ${x2} ${y}`}
                  stroke={on ? "var(--ax-border-accent)" : stroke}
                  strokeWidth={on ? 2.4 : 1.6}
                  strokeDasharray={s.reply ? "6 4" : undefined}
                  fill="none"
                  markerEnd={`url(#${marker})`}
                />
                {!reduced && (
                  <circle
                    cx={x1}
                    cy={y}
                    r={4}
                    fill={s.tone === "success" ? TONE.success.strong : TONE.accent.strong}
                    className="sl-seq__packet"
                    style={{ animationDelay: `${delay(i)}ms`, ["--sl-dx" as string]: `${x2 - x1}px` }}
                  />
                )}
                <text
                  x={labelX(s.from, s.to)}
                  y={y - 8}
                  textAnchor="middle"
                  fontSize={r2(labelSize(s.label))}
                  fontWeight={s.reply ? 400 : 700}
                  className="arch-mono arch-halo"
                  fill={s.tone === "success" ? "var(--ax-text-success)" : "var(--ax-text-neutral)"}
                >
                  {s.label}
                </text>
              </g>
            );
          })}

          {/* Utfall */}
          <g
            key={`${key}-res`}
            className="sl-seq__step sl-seq__result arch-node"
            style={{ animationDelay: `${delay(steps.length)}ms` }}
            role="button"
            tabIndex={0}
            aria-label="sed_journalstatus endres ikke: vis UKJENT i statusdiagrammet"
            onClick={() => onFocusStatus("UKJENT")}
            onKeyDown={onActivate(() => onFocusStatus("UKJENT"))}
          >
            {(() => {
              const text = "sed_journalstatus endres ikke";
              const w = Math.round(text.length * 6.4 + 40);
              const x = r2(GUTTER + (W - GUTTER) / 2);
              const y = rowY(steps.length) + 4;
              return (
                <>
                  <rect x={r2(x - w / 2)} y={y - 14} width={w} height={28} rx={14} fill={TONE.warning.fill} stroke={TONE.warning.stroke} strokeWidth={1.6} className="arch-box" />
                  <rect x={r2(x - w / 2)} y={y - 14} width={w} height={28} rx={14} fill="none" stroke={TONE.warning.stroke} className="arch-pulse" />
                  <text x={x} y={y + 4} textAnchor="middle" fontSize={11} fontWeight={800} className="arch-mono" fill={TONE.warning.text}>
                    {text}
                  </text>
                </>
              );
            })()}
          </g>
        </svg>
      </div>

      <ol className="jfr-seq__list" aria-label="Stegene forklart">
        {steps.map((s, i) => (
          <li
            key={`${flow}-${i}`}
            className={hover === i ? "is-on" : undefined}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <span className="jfr-seq__n" aria-hidden>
              {i + 1}
            </span>
            <div>
              <BodyShort size="small" weight="semibold">
                {s.kind === "msg" ? (
                  <>
                    {LANE_INFO[s.from].title} → {LANE_INFO[s.to].title}
                  </>
                ) : (
                  <>{LANE_INFO[s.on].title}</>
                )}{" "}
                <span className="arch-mono arch-subtle">{s.label}</span>
              </BodyShort>
              <BodyShort size="small" className="arch-subtle">
                {s.text}
              </BodyShort>
            </div>
          </li>
        ))}
      </ol>

      <div className="avs-detail" data-tone="warning" aria-live="polite">
        <BodyLong size="small">{OUTRO[flow].text}</BodyLong>
        <StatusChips ids={OUTRO[flow].status} onFocusStatus={onFocusStatus} />
      </div>
    </div>
  );
}
