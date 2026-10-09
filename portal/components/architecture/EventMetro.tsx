"use client";

import { useState } from "react";
import { BodyShort, Button, Detail, HStack } from "@navikt/ds-react";
import { onActivate, rounded } from "./svg";

type LineId = "doc" | "case" | "notif" | "mottatt" | "sendt";

const W = 1140;
const H = 410;

const LINES: Record<LineId, { name: string; color: string; y: number; desc: string }> = {
  doc: {
    name: "eux-rina-document-events-v1",
    color: "var(--ax-border-meta-purple)",
    y: 130,
    desc: "Dokumenthendelser – en SED er opprettet, sendt, mottatt osv. Har egne retry-, DLT- og DLQ-topics for konsumentene som trenger det.",
  },
  case: {
    name: "eux-rina-case-events-v1",
    color: "var(--ax-border-accent)",
    y: 170,
    desc: "Sakshendelser – en RINA-sak er opprettet, endret eller lukket.",
  },
  notif: {
    name: "eux-rina-notification-events-v1",
    color: "var(--ax-border-success)",
    y: 210,
    desc: "Varslingshendelser fra RINA. Kun eux-rina-case-search leser dem.",
  },
  sendt: {
    name: "sedsendt-v1",
    color: "var(--ax-border-brand-magenta, var(--ax-border-danger))",
    y: 300,
    desc: "Sendte SED-er i det eldre formatet. En offentlig kontrakt som andre team leser.",
  },
  mottatt: {
    name: "sedmottatt-v1",
    color: "var(--ax-border-warning)",
    y: 340,
    desc: "Mottatte SED-er i det eldre formatet. En offentlig kontrakt som andre team leser.",
  },
};

const LINE_ORDER: LineId[] = ["doc", "case", "notif", "sendt", "mottatt"];

const SRC_X = 290;
const LEG_X = 1000;
const SENDT_TURN = 1050;
const MOTTATT_TURN = 1080;
const LOW_END = 300;

const LINE_PATH: Record<LineId, string> = {
  doc: `M ${SRC_X} ${LINES.doc.y} L ${LEG_X} ${LINES.doc.y}`,
  case: `M ${SRC_X} ${LINES.case.y} L 800 ${LINES.case.y}`,
  notif: `M ${SRC_X} ${LINES.notif.y} L 560 ${LINES.notif.y}`,
  sendt: rounded(
    [
      [LEG_X, 150],
      [SENDT_TURN, 150],
      [SENDT_TURN, LINES.sendt.y],
      [LOW_END, LINES.sendt.y],
    ],
    22,
  ),
  mottatt: rounded(
    [
      [LEG_X, 130],
      [MOTTATT_TURN, 130],
      [MOTTATT_TURN, LINES.mottatt.y],
      [LOW_END, LINES.mottatt.y],
    ],
    22,
  ),
};

type Station = {
  id: string;
  label: string;
  x: number;
  lines: LineId[];
  /** Label above (top lines) or below (bottom lines), with stagger offset. */
  labelY: number;
  text: string;
  focus?: string;
  href?: string;
  ghost?: boolean;
  team?: boolean;
};

const STATIONS: Station[] = [
  {
    id: "eux-rina-case-search",
    label: "rina-case-search",
    x: 520,
    lines: ["doc", "case", "notif"],
    labelY: 98,
    text: "Bygger søkeindeksen over RINA-saker fra alle tre topics. Dokumenthendelser som ikke kan behandles, havner på en DLQ.",
    focus: "eux-rina-case-search",
  },
  {
    id: "eux-avslutt-rinasaker",
    label: "avslutt-rinasaker",
    x: 640,
    lines: ["doc", "case"],
    labelY: 80,
    text: "Følger sakene via sak- og dokumenthendelser for å vite når de har vært inaktive lenge nok til å avsluttes.",
    focus: "eux-avslutt-rinasaker",
  },
  {
    id: "eux-slett-usendte-rinasaker",
    label: "slett-usendte-rinasaker",
    x: 760,
    lines: ["doc", "case"],
    labelY: 98,
    text: "Følger nye saker og om noe er sendt. Saker uten sendt SED etter 15 dager slettes.",
    focus: "eux-slett-usendte-rinasaker",
  },
  {
    id: "eux-adresse-oppdatering",
    label: "adresse-oppdatering",
    x: 880,
    lines: ["doc"],
    labelY: 80,
    text: "Oppdaterer utenlandske adresser i PDL. Feilede meldinger prøves 3 ganger med 15 sekunders mellomrom før de havner på en DLT.",
    focus: "eux-adresse-oppdatering",
  },
  {
    id: "eux-legacy-rina-events",
    label: "legacy-rina-events",
    x: LEG_X,
    lines: ["doc", "sendt", "mottatt"],
    labelY: 98,
    text: "Overgangen mellom nytt og gammelt format: beriker dokumenthendelser med data fra RINA CPI og publiserer dem på sedsendt-v1 og sedmottatt-v1.",
    focus: "eux-legacy-rina-events",
  },
  {
    id: "eux-fagmodul-journalfoering",
    label: "fagmodul-journalfoering",
    x: 880,
    lines: ["sendt", "mottatt"],
    labelY: 374,
    text: "Journalfører sendte og mottatte SED-er automatisk og oppretter oppgaver via eux-oppgave ved behov.",
    focus: "eux-fagmodul-journalfoering",
  },
  {
    id: "eux-person-oppdatering",
    label: "person-oppdatering",
    x: 740,
    lines: ["mottatt"],
    labelY: 394,
    text: "Leser bare mottatte SED-er og sender utenlandske identifikasjonsnumre til PDL via PDL-Mottak.",
    focus: "eux-person-oppdatering",
  },
  {
    id: "eessi-pensjon",
    label: "eessi-pensjon",
    x: 600,
    lines: ["sendt", "mottatt"],
    labelY: 374,
    text: "Pensjonsområdets EESSI-applikasjoner (annet team) leser begge topicene.",
    focus: "eessi-pensjon",
    team: true,
  },
  {
    id: "melosys-eessi",
    label: "melosys-eessi",
    x: 460,
    lines: ["sendt", "mottatt"],
    labelY: 374,
    text: "Melosys (annet team) leser begge topicene.",
    focus: "melosys-eessi",
    team: true,
  },
  {
    id: "eux-portal-core",
    label: "portal-core (kun dev)",
    x: 340,
    lines: ["sendt", "mottatt"],
    labelY: 374,
    text: "Backenden til denne portalen leser dev-utgaven av topicene og viser SED-hendelser live.",
    href: "/kafka/sed-hendelser",
    ghost: true,
  },
];

const STATION_R = 8;

function stationSpan(s: Station) {
  const ys = s.lines.map((l) => (s.id === "eux-legacy-rina-events" && l !== "doc" ? (l === "sendt" ? 150 : 130) : LINES[l].y));
  return { top: Math.min(...ys), bottom: Math.max(...ys) };
}

export function EventMetro({ onFocusNode }: { onFocusNode: (id: string) => void }) {
  const [hoverStation, setHoverStation] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const [hoverLine, setHoverLine] = useState<LineId | null>(null);

  const stationId = hoverStation ?? pinned;
  const station = STATIONS.find((s) => s.id === stationId) ?? null;
  const activeLines = new Set<LineId>(station ? station.lines : hoverLine ? [hoverLine] : []);
  const anyActive = activeLines.size > 0;

  const lineState = (l: LineId) => (!anyActive ? "" : activeLines.has(l) ? "is-lit" : "is-dim");
  const stationState = (s: Station) => {
    if (station) return s.id === station.id ? "is-lit" : "is-dim";
    if (hoverLine) return s.lines.includes(hoverLine) ? "is-lit" : "is-dim";
    return "";
  };

  const sourceLit = !anyActive || ["doc", "case", "notif"].some((l) => activeLines.has(l as LineId));

  return (
    <div className="arch-metro">
      <div className="portal-diagram arch-metro__surface" onMouseLeave={() => setHoverStation(null)}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", minWidth: 760, height: "auto", display: "block" }}
          role="group"
          aria-label="Hendelsesflyt fra RINA gjennom Kafka"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPinned(null);
          }}
        >
          <defs>
            <marker id="metro-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill="var(--ax-border-meta-purple)" />
            </marker>
          </defs>

          {/* Kilde: RINA → eux-all-rina-events */}
          <g className={`arch-metro__source ${sourceLit ? "" : "is-dim"}`}>
            <rect x={0} y={110} width={96} height={120} rx={12} fill="var(--ax-bg-info-soft)" stroke="var(--ax-border-info)" strokeWidth={1.5} />
            <text x={48} y={164} textAnchor="middle" fontSize={15} fontWeight={700} fill="var(--ax-text-neutral)">
              RINA
            </text>
            <text x={48} y={182} textAnchor="middle" fontSize={10.5} fill="var(--ax-text-neutral-subtle)">
              EU
            </text>
            <path d="M 96 170 L 144 170" stroke="var(--ax-border-meta-purple)" strokeWidth={2} markerEnd="url(#metro-arrow)" />
            <text x={120} y={162} textAnchor="middle" fontSize={10} fontWeight={700} className="arch-mono" fill="var(--ax-text-neutral)">
              NIE
            </text>
            <g
              role="button"
              tabIndex={0}
              className="arch-metro__hub"
              aria-label="Vis detaljer om eux-all-rina-events"
              onClick={() => onFocusNode("eux-all-rina-events")}
              onKeyDown={onActivate(() => onFocusNode("eux-all-rina-events"))}
            >
              <rect x={146} y={110} width={144} height={120} rx={14} fill="var(--ax-bg-meta-purple-soft)" stroke="var(--ax-border-meta-purple)" strokeWidth={1.5} />
              <text x={218} y={150} textAnchor="middle" fontSize={13} fontWeight={700} fill="var(--ax-text-neutral)">
                eux-all-
              </text>
              <text x={218} y={166} textAnchor="middle" fontSize={13} fontWeight={700} fill="var(--ax-text-neutral)">
                rina-events
              </text>
              <text x={218} y={188} textAnchor="middle" fontSize={10.5} fill="var(--ax-text-neutral-subtle)">
                HTTP inn
              </text>
              <text x={218} y={202} textAnchor="middle" fontSize={10.5} fill="var(--ax-text-neutral-subtle)">
                → tre topics
              </text>
            </g>
          </g>

          {/* Linjer */}
          {LINE_ORDER.map((l) => (
            <g
              key={l}
              className={`arch-metro__line ${lineState(l)}`}
              onMouseEnter={() => setHoverLine(l)}
              onMouseLeave={() => setHoverLine(null)}
            >
              <path d={LINE_PATH[l]} stroke="transparent" strokeWidth={16} fill="none" />
              <path d={LINE_PATH[l]} stroke={LINES[l].color} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d={LINE_PATH[l]} stroke="var(--ax-bg-default)" strokeWidth={2.5} strokeLinecap="round" fill="none" className="arch-metro__train" />
            </g>
          ))}

          {/* Linjenavn */}
          {(["doc", "case", "notif"] as LineId[]).map((l) => (
            <text key={`lbl-${l}`} x={SRC_X + 12} y={LINES[l].y - 9} fontSize={10.5} className={`arch-mono arch-metro__lname ${lineState(l)}`} fill="var(--ax-text-neutral-subtle)">
              {LINES[l].name}
            </text>
          ))}
          <text x={SENDT_TURN - 22} y={LINES.sendt.y - 9} textAnchor="end" fontSize={10.5} className={`arch-mono arch-metro__lname ${lineState("sendt")}`} fill="var(--ax-text-neutral-subtle)">
            sedsendt-v1
          </text>
          <text x={MOTTATT_TURN - 22} y={LINES.mottatt.y - 9} textAnchor="end" fontSize={10.5} className={`arch-mono arch-metro__lname ${lineState("mottatt")}`} fill="var(--ax-text-neutral-subtle)">
            sedmottatt-v1
          </text>

          {/* Stasjoner */}
          {STATIONS.map((s) => {
            const { top, bottom } = stationSpan(s);
            const above = s.labelY < top;
            const tickFrom = above ? s.labelY + 5 : bottom + STATION_R;
            const tickTo = above ? top - STATION_R : s.labelY - 12;
            const select = () => {
              setPinned((p) => (p === s.id ? null : s.id));
            };
            return (
              <g
                key={s.id}
                className={`arch-metro__station ${stationState(s)} ${s.ghost ? "is-ghost" : ""}`}
                role="button"
                tabIndex={0}
                aria-pressed={pinned === s.id}
                aria-label={`${s.label}: ${s.text}`}
                onMouseEnter={() => setHoverStation(s.id)}
                onMouseLeave={() => setHoverStation(null)}
                onFocus={() => setHoverStation(s.id)}
                onBlur={() => setHoverStation(null)}
                onClick={select}
                onKeyDown={onActivate(select)}
              >
                <line x1={s.x} x2={s.x} y1={tickFrom} y2={tickTo} stroke="var(--ax-border-neutral-subtle)" strokeWidth={1} />
                <rect
                  x={s.x - STATION_R}
                  y={top - STATION_R}
                  width={STATION_R * 2}
                  height={bottom - top + STATION_R * 2}
                  rx={STATION_R}
                  fill="var(--ax-bg-default)"
                  stroke="var(--ax-text-neutral)"
                  strokeWidth={2.5}
                  strokeDasharray={s.ghost ? "4 3" : undefined}
                  className="arch-metro__stop"
                />
                <text
                  x={s.x}
                  y={s.labelY}
                  textAnchor="middle"
                  fontSize={12}
                  fontWeight={s.team ? 500 : 700}
                  fontStyle={s.team ? "italic" : undefined}
                  fill="var(--ax-text-neutral)"
                >
                  {s.label}
                </text>
              </g>
            );
          })}

          <text x={LOW_END} y={260} fontSize={10.5} fill="var(--ax-text-neutral-subtle)" className="arch-eyebrow-svg">
            ELDRE FORMAT · LESES OGSÅ AV ANDRE TEAM
          </text>
        </svg>
      </div>

      <div className="arch-metro__panel">
        <div className="arch-metro__info" aria-live="polite">
        {station ? (
          <>
            <Detail className="arch-eyebrow">{station.team ? "Annet team" : station.ghost ? "Kun dev" : "Konsument"}</Detail>
            <BodyShort weight="semibold" spacing>
              {station.id}
            </BodyShort>
            <BodyShort size="small" spacing>
              {station.text}
            </BodyShort>
            <HStack gap="space-6" wrap>
              {station.lines.map((l) => (
                <span key={l} className="portal-chip" style={{ borderColor: LINES[l].color }}>
                  {LINES[l].name}
                </span>
              ))}
            </HStack>
            {(station.focus || station.href) && (
              <div style={{ marginTop: "0.75rem" }}>
                {station.focus ? (
                  <Button size="small" variant="secondary" onClick={() => onFocusNode(station.focus!)}>
                    Vis detaljer
                  </Button>
                ) : (
                  <Button as="a" size="small" variant="secondary" href={station.href}>
                    Se hendelsene live
                  </Button>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <Detail className="arch-eyebrow">Linjekart</Detail>
            <BodyShort size="small" spacing>
              Hver linje er et Kafka-topic, og hver stasjon er en konsument. Hold over en stasjon eller en linje for å se
              sammenhengen, eller klikk for å feste valget.
            </BodyShort>
          </>
        )}
        </div>
        <ul className="arch-metro__legend" aria-label="Kafka-topics">
          {LINE_ORDER.map((l) => (
            <li
              key={l}
              tabIndex={0}
              onMouseEnter={() => setHoverLine(l)}
              onMouseLeave={() => setHoverLine(null)}
              onFocus={() => setHoverLine(l)}
              onBlur={() => setHoverLine(null)}
              className={lineState(l)}
            >
              <span className="arch-metro__swatch" style={{ background: LINES[l].color }} />
              <span>
                <span className="arch-mono">{LINES[l].name}</span>
                <span className="arch-subtle"> – {LINES[l].desc}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
