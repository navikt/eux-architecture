"use client";

import { useEffect, useState } from "react";
import { BodyLong, Button, Heading, HStack } from "@navikt/ds-react";
import { ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon } from "@navikt/aksel-icons";
import { useReducedMotion } from "./hooks";
import { onActivate, rounded } from "./svg";

const W = 1140;
const H = 392;
const TOP_Y = 24;
const TOP_H = 72;
const MID = TOP_Y + TOP_H / 2;
const BOX_W = 140;
const LOW_Y = 180;
const LOW_H = 200;

type TopBox = { id: string; x: number; title: string; sub: string; tone: Tone };
type Tone = "neutral" | "accent" | "info" | "success" | "warning";

const TONES: Record<Tone, { fill: string; stroke: string }> = {
  neutral: { fill: "var(--ax-bg-neutral-soft)", stroke: "var(--ax-border-neutral)" },
  accent: { fill: "var(--ax-bg-accent-soft)", stroke: "var(--ax-border-accent)" },
  info: { fill: "var(--ax-bg-info-soft)", stroke: "var(--ax-border-info)" },
  success: { fill: "var(--ax-bg-success-soft)", stroke: "var(--ax-border-success)" },
  warning: { fill: "var(--ax-bg-warning-soft)", stroke: "var(--ax-border-warning)" },
};

const TOP: TopBox[] = [
  { id: "saksbehandler", x: 0, title: "Saksbehandler", sub: "Nettleser", tone: "neutral" },
  { id: "eux-web-app", x: 250, title: "eux-web-app", sub: "nEESSI · Node-BFF", tone: "accent" },
  { id: "eux-neessi", x: 500, title: "eux-neessi", sub: "Orkestrering", tone: "accent" },
  { id: "eux-rina-api", x: 750, title: "eux-rina-api", sub: "Mellomvare mot RINA", tone: "info" },
  { id: "rina", x: 1000, title: "RINA", sub: "CPI (REST)", tone: "info" },
];

const HOPS = [
  { id: "a0", from: 0, labels: ["Azure AD", "Wonderwall"] },
  { id: "a1", from: 1, labels: ["Azure AD", "on-behalf-of"] },
  { id: "a2", from: 2, labels: ["Azure AD", "on-behalf-of"] },
  { id: "a3", from: 3, labels: ["JWT → CAS", "JSESSIONID"] },
].map((h) => {
  const x1 = TOP[h.from].x + BOX_W;
  const x2 = TOP[h.from + 1].x;
  return { ...h, x1, x2, d: `M ${x1} ${MID} L ${x2} ${MID}` };
});

type LowItem = { id: string; name: string; desc?: string };
type LowBox = { id: string; x: number; w: number; title: string; sub: string; tone: Tone; cols: number; items: LowItem[] };

const LOW: LowBox[] = [
  {
    id: "A",
    x: 0,
    w: 360,
    title: "EUX-tjenester",
    sub: "Kalles av eux-neessi",
    tone: "success",
    cols: 1,
    items: [
      { id: "eux-nav-rinasak", name: "eux-nav-rinasak", desc: "fagsak ↔ RINA-sak" },
      { id: "eux-journal", name: "eux-journal", desc: "journalposter" },
      { id: "eux-fagmodul-journalfoering", name: "eux-fagmodul-journalfoering", desc: "journalfør sak" },
      { id: "eux-relaterte-rinasaker", name: "eux-relaterte-rinasaker", desc: "relaterte saker" },
      { id: "eux-saksbehandler", name: "eux-saksbehandler", desc: "innstillinger" },
    ],
  },
  {
    id: "B",
    x: 390,
    w: 360,
    title: "NAV-systemer",
    sub: "Kalles direkte av eux-neessi",
    tone: "neutral",
    cols: 2,
    items: [
      { id: "pdl", name: "PDL" },
      { id: "saf", name: "SAF" },
      { id: "dokarkiv", name: "Dokarkiv" },
      { id: "sak", name: "Sak" },
      { id: "aareg", name: "Aa-registeret" },
      { id: "inntekt", name: "Inntekt" },
      { id: "norg2", name: "NORG2" },
      { id: "dokdist", name: "Dokdistfordeling" },
      { id: "nom", name: "NOM" },
      { id: "graph", name: "Microsoft Graph" },
      { id: "slack", name: "Slack" },
    ],
  },
  {
    id: "C",
    x: 780,
    w: 360,
    title: "Bak eux-rina-api",
    sub: "Kalles av eux-rina-api",
    tone: "info",
    cols: 1,
    items: [
      { id: "eux-rina-case-search", name: "eux-rina-case-search", desc: "saker for en person" },
      { id: "eux-pdf", name: "eux-pdf", desc: "PDF for U020 og U029" },
      { id: "pdl", name: "PDL", desc: "persondata" },
      { id: "eux-all-rina-events", name: "eux-all-rina-events", desc: "republisering" },
    ],
  },
];

const BRANCHES = [
  { id: "bA", d: rounded([[540, TOP_Y + TOP_H], [540, 140], [180, 140], [180, LOW_Y]]) },
  { id: "bB", d: `M 570 ${TOP_Y + TOP_H} L 570 ${LOW_Y}` },
  { id: "bC", d: rounded([[820, TOP_Y + TOP_H], [820, 140], [960, 140], [960, LOW_Y]]) },
];

const RETURN_PATH = `M ${TOP[4].x} ${MID} L ${TOP[0].x + BOX_W} ${MID}`;

const STEPS: { title: string; lit: string[]; text: string }[] = [
  {
    title: "Innlogging",
    lit: ["a0"],
    text: "Saksbehandleren åpner nEESSI. Wonderwall-sidecaren foran eux-web-app håndterer innloggingen mot Azure AD, så BFF-en alltid har brukerens token.",
  },
  {
    title: "BFF og tokenveksling",
    lit: ["a1"],
    text: "Node-BFF-en i eux-web-app veksler brukertokenet til et on-behalf-of-token for eux-neessi og videresender kall på /api og /v2–/v5. Kall som tar mer enn 60 sekunder, avbrytes.",
  },
  {
    title: "Orkestrering",
    lit: ["bA", "bB"],
    text: "eux-neessi avgjør tilgang ut fra saksbehandlerens Azure AD-grupper og henter det som trengs fra EUX-tjenestene og NAV-systemene. Den kaller ikke eux-oppgave – oppgaver opprettes av andre tjenester.",
  },
  {
    title: "eux-rina-api",
    lit: ["a2", "bC"],
    text: "Alt som gjelder RINA går til eux-rina-api, også fra andre team. Her oversettes SED-er mellom NAV-format og EU-format (EessiAcl), og handlingen sjekkes mot RINA før den utføres. Finnes ikke handlingen, svarer API-et 404, 409 eller 412.",
  },
  {
    title: "RINA CPI",
    lit: ["a3"],
    text: "eux-rina-api logger inn i CPI med en shared-secret JWT, bytter den mot en CAS-billett og får en JSESSIONID. Sesjonen bufres i 29 minutter.",
  },
  {
    title: "Svaret tilbake",
    lit: ["a0", "a1", "a2", "a3", "ret"],
    text: "Svaret går samme vei tilbake til nettleseren. Endringer i RINA kommer i tillegg som hendelser via NIE – se hendelsesflyten lenger ned.",
  },
];

const BOXES_FOR: Record<string, string[]> = {
  a0: ["saksbehandler", "eux-web-app"],
  a1: ["eux-web-app", "eux-neessi"],
  a2: ["eux-neessi", "eux-rina-api"],
  a3: ["eux-rina-api", "rina"],
  bA: ["eux-neessi", "A"],
  bB: ["eux-neessi", "B"],
  bC: ["eux-rina-api", "C"],
  ret: [],
};

const PATH_FOR: Record<string, string> = {
  ...Object.fromEntries(HOPS.map((h) => [h.id, h.d])),
  ...Object.fromEntries(BRANCHES.map((b) => [b.id, b.d])),
};

export function RequestFlow({ onFocusNode }: { onFocusNode: (id: string) => void }) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const reduced = useReducedMotion();
  const last = STEPS.length - 1;
  const running = playing && step < last;

  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setStep((s) => Math.min(s + 1, last)), 3800);
    return () => window.clearInterval(t);
  }, [running, last]);

  const current = STEPS[step];
  const lit = new Set(current.lit);
  const litBoxes = new Set(current.lit.flatMap((l) => BOXES_FOR[l]));
  const isReturn = lit.has("ret");
  const boxState = (id: string) => (isReturn || litBoxes.has(id) ? "is-lit" : "is-dim");
  const edgeState = (id: string) => (lit.has(id) ? "is-lit" : "is-dim");

  const go = (s: number) => {
    setPlaying(false);
    setStep(Math.max(0, Math.min(last, s)));
  };

  const togglePlay = () => {
    if (running) {
      setPlaying(false);
    } else {
      if (step >= last) setStep(0);
      setPlaying(true);
    }
  };

  return (
    <div className="arch-rf">
      <div className="portal-diagram arch-rf__surface">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", minWidth: 760, height: "auto", display: "block" }}
          role="img"
          aria-label={`Synkron forespørsel, steg ${step + 1} av ${STEPS.length}: ${current.title}`}
        >
          <defs>
            <marker id="rf-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="var(--ax-border-accent)" />
            </marker>
          </defs>

          {isReturn && !reduced && (
            <circle r={6} fill="var(--ax-bg-success-strong)" className="arch-packet">
              <animateMotion key={`ret-${step}`} dur="2.4s" repeatCount="indefinite" path={RETURN_PATH} />
            </circle>
          )}

          {HOPS.map((h) => (
            <g key={h.id} className={`arch-rf__edge ${edgeState(h.id)}`}>
              <path d={h.d} stroke="var(--ax-border-accent)" strokeWidth={2} fill="none" markerEnd="url(#rf-arrow)" />
              <path d={h.d} stroke="var(--ax-border-accent)" strokeWidth={3} fill="none" className="arch-flow" />
              <text x={(h.x1 + h.x2) / 2} y={MID - 9} textAnchor="middle" fontSize={10.5} fontWeight={600} fill="var(--ax-text-neutral)">
                {h.labels[0]}
              </text>
              <text x={(h.x1 + h.x2) / 2} y={MID + 19} textAnchor="middle" fontSize={10} className="arch-mono" fill="var(--ax-text-neutral-subtle)">
                {h.labels[1]}
              </text>
            </g>
          ))}

          {BRANCHES.map((b) => (
            <g key={b.id} className={`arch-rf__edge ${edgeState(b.id)}`}>
              <path d={b.d} stroke="var(--ax-border-accent)" strokeWidth={2} fill="none" markerEnd="url(#rf-arrow)" />
              <path d={b.d} stroke="var(--ax-border-accent)" strokeWidth={3} fill="none" className="arch-flow" />
            </g>
          ))}

          {TOP.map((b) => {
            const t = TONES[b.tone];
            return (
              <g
                key={b.id}
                className={`arch-rf__box ${boxState(b.id)}`}
                role="button"
                tabIndex={0}
                aria-label={`Vis ${b.title} i kartet`}
                onClick={() => onFocusNode(b.id)}
                onKeyDown={onActivate(() => onFocusNode(b.id))}
              >
                <rect x={b.x} y={TOP_Y} width={BOX_W} height={TOP_H} rx={12} fill={t.fill} stroke={t.stroke} strokeWidth={1.5} />
                <text x={b.x + BOX_W / 2} y={MID - 2} textAnchor="middle" fontSize={14} fontWeight={700} fill="var(--ax-text-neutral)">
                  {b.title}
                </text>
                <text x={b.x + BOX_W / 2} y={MID + 16} textAnchor="middle" fontSize={11} fill="var(--ax-text-neutral-subtle)">
                  {b.sub}
                </text>
              </g>
            );
          })}

          {LOW.map((b) => {
            const t = TONES[b.tone];
            const colW = (b.w - 24) / b.cols;
            const rows = Math.ceil(b.items.length / b.cols);
            return (
              <g key={b.id} className={`arch-rf__group ${boxState(b.id)}`}>
                <rect x={b.x} y={LOW_Y} width={b.w} height={LOW_H} rx={12} fill={t.fill} stroke={t.stroke} strokeWidth={1.2} />
                <text x={b.x + 16} y={LOW_Y + 24} fontSize={13} fontWeight={700} fill="var(--ax-text-neutral)">
                  {b.title}
                </text>
                <text x={b.x + b.w - 16} y={LOW_Y + 24} textAnchor="end" fontSize={11} fill="var(--ax-text-neutral-subtle)">
                  {b.sub}
                </text>
                <line x1={b.x + 12} x2={b.x + b.w - 12} y1={LOW_Y + 36} y2={LOW_Y + 36} stroke={t.stroke} strokeOpacity={0.35} />
                {b.items.map((it, i) => {
                  const col = Math.floor(i / rows);
                  const row = i % rows;
                  const x = b.x + 12 + col * colW;
                  const y = LOW_Y + 46 + row * 24;
                  return (
                    <g
                      key={`${b.id}-${it.id}`}
                      className="arch-rf__item"
                      role="button"
                      tabIndex={0}
                      aria-label={`Vis ${it.name} i kartet`}
                      onClick={() => onFocusNode(it.id)}
                      onKeyDown={onActivate(() => onFocusNode(it.id))}
                    >
                      <rect x={x} y={y} width={colW - (b.cols > 1 ? 8 : 0)} height={21} rx={6} className="arch-rf__item-bg" />
                      <circle cx={x + 10} cy={y + 10.5} r={3} fill={t.stroke} />
                      <text x={x + 20} y={y + 14.5} fontSize={11.5} className="arch-mono" fill="var(--ax-text-neutral)">
                        {it.name}
                      </text>
                      {it.desc && (
                        <text x={x + colW - 8} y={y + 14.5} textAnchor="end" fontSize={10.5} fill="var(--ax-text-neutral-subtle)">
                          {it.desc}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}

          {!reduced &&
            current.lit
              .filter((l) => l !== "ret")
              .map((l) => (
                <circle key={`${step}-${l}`} r={5.5} fill="var(--ax-bg-accent-strong)" className="arch-packet">
                  <animateMotion dur="1.6s" repeatCount="indefinite" path={PATH_FOR[l]} />
                </circle>
              ))}
        </svg>
      </div>

      <div className="arch-rf__stepper">
        <ol className="arch-rf__steps" aria-label="Steg i forespørselen">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <button
                type="button"
                className="arch-rf__step"
                aria-current={i === step ? "step" : undefined}
                data-done={i < step || undefined}
                onClick={() => go(i)}
              >
                <span className="arch-rf__step-no">{i + 1}</span>
                <span>{s.title}</span>
              </button>
            </li>
          ))}
        </ol>
        <div className="arch-rf__caption" aria-live="polite">
          <Heading level="3" size="xsmall" spacing>
            {step + 1}. {current.title}
          </Heading>
          <BodyLong size="small">{current.text}</BodyLong>
        </div>
        <HStack gap="space-8" className="arch-rf__controls">
          <Button size="small" variant="secondary" icon={<ChevronLeftIcon aria-hidden />} onClick={() => go(step - 1)} disabled={step === 0}>
            Forrige
          </Button>
          <Button size="small" variant="primary" icon={running ? <PauseIcon aria-hidden /> : <PlayIcon aria-hidden />} onClick={togglePlay}>
            {running ? "Pause" : step >= last ? "Spill av på nytt" : "Spill av"}
          </Button>
          <Button
            size="small"
            variant="secondary"
            icon={<ChevronRightIcon aria-hidden />}
            iconPosition="right"
            onClick={() => go(step + 1)}
            disabled={step === last}
          >
            Neste
          </Button>
        </HStack>
      </div>
    </div>
  );
}
