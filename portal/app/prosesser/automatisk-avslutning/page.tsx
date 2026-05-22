"use client";

import {
  Heading,
  BodyLong,
  BodyShort,
  VStack,
  Box,
  Accordion,
  GuidePanel,
  Detail,
  Link as DsLink,
} from "@navikt/ds-react";

const subtle = { color: "var(--ax-text-subtle, #555)" };
const eyebrow = {
  ...subtle,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  fontSize: 12,
};

/* ---------- Diagram: lifecycle (functional) ---------- */

function LifecycleDiagram() {
  // Light, calm palette
  const cardFill = "#f5f8fc";
  const cardStroke = "#9ec5ec";
  const accent = "#0067c5";
  const muted = "#7a7a7a";
  const w = 920;
  const h = 270;

  const steps = [
    { x: 20, label: "Ny sak", sub: "RINA oppretter sak", color: "#e6f0fa", stroke: "#0067c5" },
    { x: 195, label: "Uvirksom", sub: "Ingen aktivitet i X dager", color: "#fff4e1", stroke: "#c77300" },
    { x: 370, label: "Til avslutning", sub: "Kriterier oppfylt", color: "#fff4e1", stroke: "#c77300" },
    { x: 545, label: "Avsluttet", sub: "Lukket i RINA", color: "#e3f5e8", stroke: "#067a3a" },
    { x: 720, label: "Arkivert", sub: "Tatt ut av portefølje", color: "#e3f5e8", stroke: "#067a3a" },
  ];
  const cardW = 160;
  const cardH = 70;
  const y = 90;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Livsløp for en RINA-sak" style={{ width: "100%", height: "auto" }}>
      <defs>
        <marker id="arr-life" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill={muted} />
        </marker>
      </defs>

      {steps.map((s, i) => (
        <g key={s.label}>
          <rect
            x={s.x}
            y={y}
            width={cardW}
            height={cardH}
            rx={12}
            ry={12}
            fill={s.color}
            stroke={s.stroke}
            strokeWidth={1.5}
          />
          <text x={s.x + cardW / 2} y={y + 28} textAnchor="middle" fontSize={14} fontWeight={600} fill="#1a1a1a">
            {s.label}
          </text>
          <text x={s.x + cardW / 2} y={y + 50} textAnchor="middle" fontSize={11} fill="#444">
            {s.sub}
          </text>
          {i < steps.length - 1 && (
            <line
              x1={s.x + cardW + 4}
              y1={y + cardH / 2}
              x2={steps[i + 1].x - 6}
              y2={y + cardH / 2}
              stroke={muted}
              strokeWidth={1.5}
              markerEnd="url(#arr-life)"
            />
          )}
        </g>
      ))}

      {/* timing labels above arrows */}
      <text x={195 - 8} y={y - 8} textAnchor="middle" fontSize={11} fill={muted}>
        90–180 dager
      </text>
      <text x={370 - 8} y={y - 8} textAnchor="middle" fontSize={11} fill={muted}>
        regler treffer
      </text>
      <text x={545 - 8} y={y - 8} textAnchor="middle" fontSize={11} fill={muted}>
        via RINA-API
      </text>
      <text x={720 - 8} y={y - 8} textAnchor="middle" fontSize={11} fill={muted}>
        ~180 dager senere
      </text>

      {/* Legend */}
      <g transform={`translate(20, ${y + cardH + 50})`}>
        <rect x={0} y={0} width={14} height={14} rx={3} fill="#e6f0fa" stroke="#0067c5" />
        <text x={22} y={11} fontSize={11} fill="#333">Aktiv</text>
        <rect x={90} y={0} width={14} height={14} rx={3} fill="#fff4e1" stroke="#c77300" />
        <text x={112} y={11} fontSize={11} fill="#333">Venter</text>
        <rect x={195} y={0} width={14} height={14} rx={3} fill="#e3f5e8" stroke="#067a3a" />
        <text x={217} y={11} fontSize={11} fill="#333">Avsluttet / arkivert</text>
      </g>
    </svg>
  );
}

/* ---------- Diagram: state machine (technical) ---------- */

function StateMachineDiagram() {
  // Wide viewBox + generous column spacing so edge labels never collide with boxes.
  const w = 1480;
  const h = 320;
  const muted = "#5a6470";

  const boxW = 168;
  const boxH = 42;

  // Six columns spaced ~260px apart → ~92px gap between boxes for labels.
  const COL = { c0: 20, c1: 280, c2: 540, c3: 800, c4: 1060, c5: 1300 };
  const ROW = { top: 40, mid: 130, low: 220, deep: 290 };

  type Tone = "blue" | "amber" | "green" | "red";
  type N = { id: string; x: number; y: number; label: string; tone: Tone };

  const nodes: N[] = [
    { id: "NY", x: COL.c0, y: ROW.mid, label: "NY_SAK", tone: "blue" },
    { id: "UV", x: COL.c1, y: ROW.mid, label: "UVIRKSOM", tone: "amber" },
    { id: "TAL", x: COL.c2, y: ROW.top, label: "TIL_AVSLUTNING_LOKALT", tone: "amber" },
    { id: "TAG", x: COL.c2, y: ROW.mid, label: "TIL_AVSLUTNING_GLOBALT", tone: "amber" },
    { id: "AAM", x: COL.c2, y: ROW.low, label: "AVSLUTTES_AV_MOTPART", tone: "red" },
    { id: "AL", x: COL.c3, y: ROW.top, label: "AVSLUTTET_LOKALT", tone: "green" },
    { id: "AG", x: COL.c3, y: ROW.mid, label: "AVSLUTTET_GLOBALT", tone: "green" },
    { id: "TAR", x: COL.c4, y: (ROW.top + ROW.mid) / 2, label: "TIL_ARKIVERING", tone: "amber" },
    { id: "AR", x: COL.c5, y: (ROW.top + ROW.mid) / 2, label: "ARKIVERT", tone: "green" },
  ];

  const tone = (t: Tone) => {
    switch (t) {
      case "blue": return { fill: "#e6f0fa", stroke: "#0067c5" };
      case "amber": return { fill: "#fff4e1", stroke: "#c77300" };
      case "green": return { fill: "#e3f5e8", stroke: "#067a3a" };
      case "red": return { fill: "#fde8e8", stroke: "#b32525" };
    }
  };

  const find = (id: string) => nodes.find((n) => n.id === id)!;

  // Anchor points on a box. yFrac lets us place several arrows on the same side
  // without overlap (e.g. three lines leaving UVIRKSOM).
  type Side = "left" | "right" | "top" | "bottom";
  const anchor = (id: string, side: Side, yFrac = 0.5, xFrac = 0.5) => {
    const n = find(id);
    switch (side) {
      case "right": return { x: n.x + boxW, y: n.y + boxH * yFrac };
      case "left": return { x: n.x, y: n.y + boxH * yFrac };
      case "top": return { x: n.x + boxW * xFrac, y: n.y };
      case "bottom": return { x: n.x + boxW * xFrac, y: n.y + boxH };
    }
  };

  // Build an orthogonal (right-angle) path between two anchor points.
  // bendAt is the x of the vertical segment; defaults to the midpoint.
  const ortho = (
    a: { x: number; y: number },
    b: { x: number; y: number },
    bendAt?: number,
  ) => {
    const bx = bendAt ?? (a.x + b.x) / 2;
    return `M ${a.x} ${a.y} H ${bx} V ${b.y} H ${b.x}`;
  };

  // Each edge is a pre-shaped path so we can place labels precisely.
  type Edge = {
    d: string;
    label?: string;
    labelAt: { x: number; y: number };
    dashed?: boolean;
  };

  const edges: Edge[] = (() => {
    const list: Edge[] = [];

    // NY → UV (straight, mid row)
    {
      const a = anchor("NY", "right");
      const b = anchor("UV", "left");
      list.push({
        d: `M ${a.x} ${a.y} L ${b.x} ${b.y}`,
        label: "sett-uvirksom",
        labelAt: { x: (a.x + b.x) / 2, y: a.y - 8 },
      });
    }

    // UV → TAL  (up-right; uses upper third of UV.right)
    {
      const a = anchor("UV", "right", 0.25);
      const b = anchor("TAL", "left");
      const bend = a.x + 24;
      list.push({
        d: ortho(a, b, bend),
        label: "lokal",
        labelAt: { x: (bend + b.x) / 2, y: b.y - 8 },
      });
    }

    // UV → TAG  (straight)
    {
      const a = anchor("UV", "right", 0.5);
      const b = anchor("TAG", "left");
      list.push({
        d: `M ${a.x} ${a.y} L ${b.x} ${b.y}`,
        label: "global",
        labelAt: { x: (a.x + b.x) / 2, y: a.y - 8 },
      });
    }

    // UV → AAM  (down-right; uses lower third of UV.right)
    {
      const a = anchor("UV", "right", 0.75);
      const b = anchor("AAM", "left");
      const bend = a.x + 24;
      list.push({
        d: ortho(a, b, bend),
        label: "ingen scope",
        labelAt: { x: (bend + b.x) / 2, y: b.y - 8 },
      });
    }

    // TAL → AL
    {
      const a = anchor("TAL", "right");
      const b = anchor("AL", "left");
      list.push({
        d: `M ${a.x} ${a.y} L ${b.x} ${b.y}`,
        label: "avslutt",
        labelAt: { x: (a.x + b.x) / 2, y: a.y - 8 },
      });
    }

    // TAG → AG
    {
      const a = anchor("TAG", "right");
      const b = anchor("AG", "left");
      list.push({
        d: `M ${a.x} ${a.y} L ${b.x} ${b.y}`,
        label: "avslutt",
        labelAt: { x: (a.x + b.x) / 2, y: a.y - 8 },
      });
    }

    // AL → TAR  (down-right into TAR's top-left)
    {
      const a = anchor("AL", "right");
      const b = anchor("TAR", "left", 0.25);
      const bend = a.x + 24;
      list.push({
        d: ortho(a, b, bend),
        labelAt: { x: 0, y: 0 },
      });
    }

    // AG → TAR (up-right into TAR's bottom-left)
    {
      const a = anchor("AG", "right");
      const b = anchor("TAR", "left", 0.75);
      const bend = a.x + 24;
      list.push({
        d: ortho(a, b, bend),
        labelAt: { x: 0, y: 0 },
      });
    }

    // Single shared label for the AL/AG → TAR fan-in
    list.push({
      d: "",
      label: "etter ~180 dager",
      labelAt: { x: anchor("TAR", "left").x - 24, y: anchor("TAR", "left").y - 32 },
    });

    // TAR → AR
    {
      const a = anchor("TAR", "right");
      const b = anchor("AR", "left");
      list.push({
        d: `M ${a.x} ${a.y} L ${b.x} ${b.y}`,
        label: "arkiver",
        labelAt: { x: (a.x + b.x) / 2, y: a.y - 8 },
      });
    }

    return list;
  })();

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label="Statusmaskin for eux-avslutt-rinasaker"
      style={{ width: "100%", height: "auto", display: "block" }}
    >
      <defs>
        <marker id="arr-state" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill={muted} />
        </marker>
      </defs>

      {/* Edges first so boxes sit on top */}
      {edges.map((e, i) =>
        e.d ? (
          <path
            key={`e${i}`}
            d={e.d}
            fill="none"
            stroke={muted}
            strokeWidth={1.4}
            strokeLinejoin="round"
            strokeLinecap="round"
            markerEnd="url(#arr-state)"
          />
        ) : null
      )}

      {/* Nodes */}
      {nodes.map((n) => {
        const c = tone(n.tone);
        return (
          <g key={n.id}>
            <rect
              x={n.x}
              y={n.y}
              width={boxW}
              height={boxH}
              rx={10}
              ry={10}
              fill={c.fill}
              stroke={c.stroke}
              strokeWidth={1.4}
            />
            <text
              x={n.x + boxW / 2}
              y={n.y + boxH / 2 + 4}
              textAnchor="middle"
              fontSize={11.5}
              fontWeight={600}
              fill="#1a1a1a"
            >
              {n.label}
            </text>
          </g>
        );
      })}

      {/* Edge labels — rendered AFTER nodes so the white halo sits on top */}
      {edges.map((e, i) =>
        e.label ? (
          <text
            key={`l${i}`}
            x={e.labelAt.x}
            y={e.labelAt.y}
            textAnchor="middle"
            fontSize={11}
            fill={muted}
            style={{ paintOrder: "stroke", stroke: "#ffffff", strokeWidth: 5 }}
          >
            {e.label}
          </text>
        ) : null
      )}

      {/* Note about error status (no edge — keeps the diagram readable) */}
      <g transform={`translate(${COL.c4 - 6}, ${ROW.low + 32})`}>
        <rect
          x={0}
          y={0}
          width={340}
          height={36}
          rx={8}
          ry={8}
          fill="#fde8e8"
          stroke="#b32525"
          strokeDasharray="4 3"
          strokeWidth={1.2}
        />
        <text x={14} y={15} fontSize={11} fontWeight={600} fill="#7a1414">
          Hvis et kall mot RINA feiler
        </text>
        <text x={14} y={29} fontSize={11} fill="#7a1414">
          ⇒ saken settes til <tspan fontFamily="var(--ax-font-mono, monospace)">HANDLING_FEILET</tspan>
        </text>
      </g>

      {/* Legend */}
      <g transform={`translate(20, ${h - 18})`}>
        <rect x={0} y={-10} width={12} height={12} rx={3} fill="#e6f0fa" stroke="#0067c5" />
        <text x={18} y={0} fontSize={11} fill="#333">start</text>
        <rect x={70} y={-10} width={12} height={12} rx={3} fill="#fff4e1" stroke="#c77300" />
        <text x={88} y={0} fontSize={11} fill="#333">overgang</text>
        <rect x={170} y={-10} width={12} height={12} rx={3} fill="#e3f5e8" stroke="#067a3a" />
        <text x={188} y={0} fontSize={11} fill="#333">avsluttet / arkivert</text>
        <rect x={320} y={-10} width={12} height={12} rx={3} fill="#fde8e8" stroke="#b32525" />
        <text x={338} y={0} fontSize={11} fill="#333">terminal / feil</text>
      </g>
    </svg>
  );
}

/* ---------- Section eyebrow ---------- */

function SectionEyebrow({ kind }: { kind: "funksjonell" | "teknisk" }) {
  const label = kind === "funksjonell" ? "For alle" : "For utviklere";
  return <div style={eyebrow}>{label}</div>;
}

/* ---------- BUC rules data (from Buc.kt in eux-avslutt-rinasaker) ---------- */

const bucFamilies = [
  {
    id: "h",
    label: "H-BUC-er",
    bucs: [
      { navn: "H_BUC_01", uvirksom: 180, kriterium: "Siste SED er H002", sakseier: "Lokal", motpart: "Lokal", merknad: "" },
    ],
  },
  {
    id: "fb",
    label: "FB-BUC-er",
    bucs: [
      { navn: "FB_BUC_01", uvirksom: 120, kriterium: "Siste SED er F002, sendt fra NAV", sakseier: "Global", motpart: "—", merknad: "Fallback: avslutt etter 270 d uten aktivitet. Arkivering etter 400 d." },
      { navn: "FB_BUC_02", uvirksom: 90, kriterium: "Siste SED er F017", sakseier: "Global", motpart: "—", merknad: "" },
      { navn: "FB_BUC_04", uvirksom: 90, kriterium: "F003 finnes i saken", sakseier: "Lokal", motpart: "Lokal", merknad: "" },
    ],
  },
  {
    id: "ub",
    label: "UB-BUC-er",
    bucs: [
      { navn: "UB_BUC_01", uvirksom: 90, kriterium: "Mottatt U002, U004 eller U017", sakseier: "Global", motpart: "—", merknad: "" },
      { navn: "UB_BUC_02", uvirksom: 180, kriterium: "Mottatt U008, U014 eller H070, eller sendt U009 eller H070", sakseier: "Global", motpart: "—", merknad: "" },
      { navn: "UB_BUC_03", uvirksom: 90, kriterium: "Mottatt U019 eller H070, eller sendt H070", sakseier: "Global", motpart: "—", merknad: "" },
      { navn: "UB_BUC_04", uvirksom: 90, kriterium: "U024 finnes i saken", sakseier: "Global", motpart: "—", merknad: "" },
    ],
  },
  {
    id: "s",
    label: "S-BUC-er",
    bucs: [
      { navn: "S_BUC_12", uvirksom: 90, kriterium: "Siste SED er S055", sakseier: "—", motpart: "Lokal", merknad: "" },
      { navn: "S_BUC_14", uvirksom: 90, kriterium: "Siste SED er S046", sakseier: "Lokal", motpart: "Lokal", merknad: "" },
      { navn: "S_BUC_14a", uvirksom: 90, kriterium: "Siste SED er S047", sakseier: "Lokal", motpart: "Lokal", merknad: "" },
      { navn: "S_BUC_14b", uvirksom: 90, kriterium: "Siste SED er S048", sakseier: "Lokal", motpart: "Lokal", merknad: "" },
      { navn: "S_BUC_15", uvirksom: 90, kriterium: "Siste SED er S057", sakseier: "Lokal", motpart: "—", merknad: "" },
      { navn: "S_BUC_17", uvirksom: 90, kriterium: "Siste SED er S003", sakseier: "Lokal", motpart: "—", merknad: "" },
      { navn: "S_BUC_17a", uvirksom: 90, kriterium: "Siste SED er S005", sakseier: "—", motpart: "Lokal", merknad: "" },
      { navn: "S_BUC_24", uvirksom: 90, kriterium: "Siste SED er S041", sakseier: "Lokal", motpart: "Lokal", merknad: "" },
    ],
  },
];

function ScopeBadge({ value }: { value: string }) {
  if (value === "—") return <span style={{ color: "#999" }}>—</span>;
  const isGlobal = value === "Global";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "1px 8px",
        borderRadius: 4,
        fontSize: 12,
        fontWeight: 500,
        background: isGlobal ? "#e6f0fa" : "#f4f4f4",
        color: isGlobal ? "#0067c5" : "#444",
        border: `1px solid ${isGlobal ? "#b8d4ec" : "#ddd"}`,
      }}
    >
      {value}
    </span>
  );
}

function BucFamilyTable({ bucs }: { bucs: typeof bucFamilies[number]["bucs"] }) {
  const th = { padding: "8px 10px", textAlign: "left" as const, whiteSpace: "nowrap" as const, fontWeight: 600, fontSize: 13 };
  const td = { padding: "7px 10px", verticalAlign: "top" as const };
  const mono = { ...td, fontFamily: "var(--ax-font-mono, monospace)", fontSize: 13, whiteSpace: "nowrap" as const };

  return (
    <div style={{ overflowX: "auto" as const }}>
      <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--ax-border-subtle, #ddd)" }}>
            <th style={th}>BUC</th>
            <th style={{ ...th, textAlign: "right" as const }}>Uvirksom</th>
            <th style={th}>Avslutningskriterium</th>
            <th style={{ ...th, textAlign: "center" as const }}>Sakseier</th>
            <th style={{ ...th, textAlign: "center" as const }}>Motpart</th>
          </tr>
        </thead>
        <tbody>
          {bucs.map((b) => (
            <tr key={b.navn} style={{ borderBottom: "1px solid var(--ax-border-subtle, #eee)" }}>
              <td style={mono}>{b.navn}</td>
              <td style={{ ...mono, textAlign: "right" as const }}>{b.uvirksom}&thinsp;d</td>
              <td style={td}>
                {b.kriterium}
                {b.merknad && (
                  <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>↳ {b.merknad}</div>
                )}
              </td>
              <td style={{ ...td, textAlign: "center" as const }}><ScopeBadge value={b.sakseier} /></td>
              <td style={{ ...td, textAlign: "center" as const }}><ScopeBadge value={b.motpart} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Page ---------- */

export default function Page() {
  return (
    <VStack gap="space-32">
      <header>
        <div style={eyebrow}>Prosess</div>
        <Heading size="xlarge" level="1" spacing>
          Automatisk avslutning
        </Heading>
        <BodyLong size="medium" style={subtle}>
          Slik lukker plattformen RINA-saker som er ferdig behandlet — uten at
          en saksbehandler trenger å gjøre det manuelt. Prosessen utføres av
          applikasjonen{" "}
          <DsLink href="https://github.com/navikt/eux-avslutt-rinasaker" target="_blank" rel="noreferrer">
            eux-avslutt-rinasaker
          </DsLink>
          .
        </BodyLong>
      </header>

      {/* ---------------- Funksjonelt ---------------- */}
      <section id="funksjonelt">
        <VStack gap="space-16">
          <div>
            <SectionEyebrow kind="funksjonell" />
            <Heading size="large" level="2">
              Hvorfor og hvordan
            </Heading>
          </div>

          <BodyLong>
            Når en sak i RINA er ferdig — alle nødvendige SED-er er sendt eller
            mottatt — har den ingen grunn til å ligge åpen lenger. Hvis ingen
            rydder, vokser saksporteføljen og det blir vanskelig å se hva som
            faktisk krever oppfølging. Plattformen gjør derfor jobben
            automatisk i bakgrunnen, hver natt.
          </BodyLong>

          <Box
            style={{ background: "var(--ax-bg-neutral-soft, #f5f7fa)" }}
            borderRadius="12"
            padding="space-16"
            borderColor="neutral-subtle"
            borderWidth="1"
          >
            <LifecycleDiagram />
          </Box>

          <BodyLong>
            For hver type sak (BUC) er det definert regler som beskriver hva
            «ferdig» betyr — typisk at en bestemt avslutnings-SED er sendt
            eller mottatt, at et bestemt skjema finnes i saken, eller — som en
            siste sikkerhet — at saken har ligget urørt veldig lenge.
          </BodyLong>

          <BodyLong>
            En RINA-sak deles ofte mellom flere land. <i>Lokal</i> avslutning
            betyr at NAV lukker saken kun for vår egen del — motparten kan
            fortsatt jobbe videre. <i>Global</i> avslutning betyr at saken
            lukkes for alle parter samtidig. Hvilken type som velges, avhenger
            av BUC-en og om NAV er sakseier eller motpart. Har vi ikke
            grunnlag for å lukke globalt, venter plattformen heller på at
            motparten gjør det.
          </BodyLong>

          <BodyLong>
            Hele løpet — fra siste aktivitet til arkivering — tar typisk flere
            måneder. Det er bevisst, slik at en saksbehandler får god tid til
            å gjenåpne hvis det dukker opp noe nytt. Kommer det en ny SED på
            en sak som er markert som uvirksom, hopper saken automatisk
            tilbake til start og må kvalifisere på nytt før avslutning vurderes
            igjen.
          </BodyLong>

          <Accordion>
            <Accordion.Item>
              <Accordion.Header>Mer om reglene per BUC</Accordion.Header>
              <Accordion.Content>
                <BodyLong>
                  Reglene ligger som kode i applikasjonen og kan justeres per
                  BUC. Det betyr at en H_BUC_01 og en S_BUC_24 kan ha helt
                  ulike kriterier for hva som regnes som avsluttet. Endringer
                  går via en vanlig kodeendring og pull request mot{" "}
                  <code>eux-avslutt-rinasaker</code>.
                </BodyLong>
              </Accordion.Content>
            </Accordion.Item>

            <Accordion.Item>
              <Accordion.Header>Hva med saker som havner i feil?</Accordion.Header>
              <Accordion.Content>
                <BodyLong>
                  Hvis et kall mot RINA feiler underveis, settes saken til en
                  feilstatus og hoppes over av neste jobb. Det går en
                  månedsrapport til Slack med oversikt — disse må undersøkes
                  manuelt og kan ikke ryddes opp i av applikasjonen selv.
                </BodyLong>
              </Accordion.Content>
            </Accordion.Item>
          </Accordion>
        </VStack>
      </section>

      {/* ---------------- Teknisk ---------------- */}
      <section id="teknisk">
        <VStack gap="space-16">
          <div>
            <SectionEyebrow kind="teknisk" />
            <Heading size="large" level="2">
              Teknisk beskrivelse
            </Heading>
          </div>

          <BodyLong>
            <code>eux-avslutt-rinasaker</code> er en Kotlin/Spring Boot-app som
            holder sin egen tilstandsmaskin per RINA-sak i PostgreSQL. Den
            populeres fra Kafka, og driften framover skjer via en samling
            NAIS-jobber (<code>eux-avslutt-rinasaker-naisjob</code>) som hver
            natt kaller HTTP-endepunkter på appen. Selve handlingen mot RINA
            gjøres via <code>eux-rina-api</code> og{" "}
            <code>eux-rina-terminator-api</code>.
          </BodyLong>

          <BodyLong>
            <code>PopulerService</code> lytter på sak- og dokument-events fra
            Kafka og oppretter eller oppdaterer rader i den lokale databasen.
            Når noe skjer på en sak, settes status tilbake til{" "}
            <code>NY_SAK</code> slik at en eventuell uvirksom-vurdering må
            gjøres på nytt. Appen lagrer ikke SED-innhold — kun metadata om
            BUC, eierskap, sist endret og hvilke SED-er som finnes.
          </BodyLong>

          <Box
            style={{ background: "var(--ax-bg-neutral-soft, #f5f7fa)" }}
            borderRadius="12"
            padding="space-16"
            borderColor="neutral-subtle"
            borderWidth="1"
          >
            <StateMachineDiagram />
            <Detail textColor="subtle" style={{ marginTop: 8 }}>
              Status per RINA-sak. Overgangene drives av planlagte
              NAIS-jobber som kaller{" "}
              <code>POST /api/v1/prosesser/&#123;prosess&#125;/execute</code>.
            </Detail>
          </Box>

          <Heading size="small" level="3">
            Prosessene og når de kjøres
          </Heading>
          <BodyLong>
            Hver prosess kjøres som en egen NAIS-jobb med fast cron, og bruker
            tilsvarende service-klasse i applikasjonen.
          </BodyLong>
          <Box
            style={{ background: "var(--ax-bg-default, #fff)" }}
            borderRadius="8"
            padding="space-12"
            borderColor="neutral-subtle"
            borderWidth="1"
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid var(--ax-border-subtle)" }}>
                  <th style={{ padding: "6px 8px" }}>Prosess</th>
                  <th style={{ padding: "6px 8px" }}>Cron (prod)</th>
                  <th style={{ padding: "6px 8px" }}>Hva den gjør</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["sett-uvirksom", "01:00", "Markerer saker som ikke har hatt aktivitet på antallDagerBeforeUvirksom dager"],
                  ["til-avslutning", "02:00", "Evaluerer avslutningsregler på UVIRKSOM-saker"],
                  ["avslutt", "03:00", "Kaller RINA og lukker saken (lokalt eller globalt)"],
                  ["til-arkivering", "04:00", "Markerer avsluttede saker for arkivering etter antallDagerBeforeArkivering"],
                  ["arkiver", "05:00", "Tar saken ut av aktiv portefølje"],
                  ["slett-dokumentutkast", "14:42", "Sletter X001-utkast via eux-rina-terminator-api"],
                  ["rapport", "1. i mnd kl 00:05", "Genererer rapport til Slack via RapportService"],
                ].map(([p, c, d]) => (
                  <tr key={p} style={{ borderBottom: "1px solid var(--ax-border-subtle)" }}>
                    <td style={{ padding: "6px 8px", fontFamily: "var(--ax-font-mono, monospace)" }}>{p}</td>
                    <td style={{ padding: "6px 8px", fontFamily: "var(--ax-font-mono, monospace)" }}>{c}</td>
                    <td style={{ padding: "6px 8px" }}>{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
          <BodyShort size="small" style={subtle}>
            Tidspunktene er hentet fra <code>eux-avslutt-rinasaker-naisjob/.nais/&lt;prosess&gt;/prod.yaml</code>.
          </BodyShort>

          <Heading size="small" level="3">
            Beslutningslogikk for «til avslutning»
          </Heading>
          <BodyLong>
            Når en sak er <code>UVIRKSOM</code> ser{" "}
            <code>TilAvslutningService</code> først på rollen NAV har, og går
            deretter gjennom kriteriene i denne rekkefølgen:
          </BodyLong>
          <ol style={{ margin: 0, paddingInlineStart: "1.5rem" }}>
            <li>Velg scope: <code>bucAvsluttScopeSakseier</code> hvis NAV eier saken, ellers <code>bucAvsluttScopeMotpart</code>.</li>
            <li>Er scope <code>null</code> ⇒ saken settes til <code>AVSLUTTES_AV_MOTPART</code> og rører ikke RINA.</li>
            <li>Ellers evalueres kriteriene (<code>sisteSedForAvslutning</code>, <code>sedExists</code>, <code>mottattSedExists</code>, <code>sentSedExists</code>) — første match vinner.</li>
            <li>Ingen match, men <code>avsluttUvirksomBucEtterAntallDager</code> er passert ⇒ avslutt likevel.</li>
            <li>Resultat: <code>TIL_AVSLUTNING_LOKALT</code> eller <code>TIL_AVSLUTNING_GLOBALT</code>, klar for neste jobb.</li>
          </ol>

          <Heading size="small" level="3">
            API
          </Heading>
          <BodyLong>
            Appen eksponerer ett operasjonelt endepunkt som NAIS-jobbene
            kaller med Azure AD-token:
          </BodyLong>
          <Box
            borderRadius="8"
            padding="space-12"
            borderColor="neutral-subtle"
            borderWidth="1"
            style={{
              background: "var(--ax-bg-default, #fff)",
              fontFamily: "var(--ax-font-mono, monospace)",
              fontSize: 13,
            }}
          >
            POST /api/v1/prosesser/&#123;prosess&#125;/execute
          </Box>
          <BodyShort size="small" style={subtle}>
            Gyldige verdier for <code>prosess</code>: <code>sett-uvirksom</code>,{" "}
            <code>til-avslutning</code>, <code>avslutt</code>,{" "}
            <code>til-arkivering</code>, <code>arkiver</code>,{" "}
            <code>slett-dokumentutkast</code>.
          </BodyShort>

          <Accordion>
            <Accordion.Item>
              <Accordion.Header>BUC-konfigurasjon — alle feltene</Accordion.Header>
              <Accordion.Content>
                <BodyLong spacing>
                  Reglene defineres i <code>Buc.kt</code> som en liste{" "}
                  <code>Buc</code>-data class. Per BUC settes blant annet:
                </BodyLong>
                <ul style={{ margin: 0, paddingInlineStart: "1.5rem" }}>
                  <li><code>antallDagerBeforeUvirksom</code> — terskel før saken blir kandidat for avslutning.</li>
                  <li><code>antallDagerBeforeArkivering</code> — hvor lenge en avsluttet sak ligger før arkivering (default 180).</li>
                  <li><code>sisteSedForAvslutningAutomatisk</code> — listen av SED-typer som, hvis siste SED, kvalifiserer for avslutning.</li>
                  <li><code>sisteSedForAvslutningAutomatiskKrevesSendtFraNav</code> — krever at siste SED faktisk er sendt fra NAV.</li>
                  <li><code>sedExistsForAvslutningAutomatisk</code> — bestemt SED finnes i saken.</li>
                  <li><code>mottattSedExistsForAvslutningAutomatisk</code> / <code>sentSedExistsForAvslutningAutomatisk</code> — typer som må være mottatt eller sendt.</li>
                  <li><code>bucAvsluttScopeSakseier</code> / <code>bucAvsluttScopeMotpart</code> — om avslutning skal være lokal eller global, avhengig av om NAV er sakseier eller motpart. <code>null</code> betyr «ikke avslutt automatisk».</li>
                  <li><code>avsluttUvirksomBucEtterAntallDager</code> — fallback: avslutt uansett etter så mange dager uten aktivitet.</li>
                </ul>
                <BodyLong>
                  Se seksjonen <i>Regler per BUC-type</i> lenger ned for komplett
                  oversikt over alle 16 BUC-typene og deres konfigurasjon.
                </BodyLong>
              </Accordion.Content>
            </Accordion.Item>

            <Accordion.Item>
              <Accordion.Header>Feilhåndtering</Accordion.Header>
              <Accordion.Content>
                <BodyLong>
                  Når et kall mot RINA feiler settes saken til{" "}
                  <code>HANDLING_FEILET</code> (og — avhengig av kontekst —{" "}
                  <code>HANDLING_MANGLER</code>). Saker i feilstatus
                  rapporteres månedlig og må undersøkes manuelt; appen prøver
                  ikke om igjen av seg selv.
                </BodyLong>
              </Accordion.Content>
            </Accordion.Item>
          </Accordion>

          <GuidePanel poster>
            <Heading spacing size="small" level="3">
              Vil du grave dypere?
            </Heading>
            <BodyLong>
              All logikk ligger i{" "}
              <DsLink href="https://github.com/navikt/eux-avslutt-rinasaker" target="_blank" rel="noreferrer">
                navikt/eux-avslutt-rinasaker
              </DsLink>
              . NAIS-jobbene som driver prosessene finner du i{" "}
              <DsLink href="https://github.com/navikt/eux-avslutt-rinasaker-naisjob" target="_blank" rel="noreferrer">
                navikt/eux-avslutt-rinasaker-naisjob
              </DsLink>
              .
            </BodyLong>
          </GuidePanel>
        </VStack>
      </section>

      {/* ---------------- Regler per BUC-type ---------------- */}
      <section id="buc-regler">
        <VStack gap="space-16">
          <div>
            <div style={eyebrow}>Oppslagsverk</div>
            <Heading size="large" level="2">
              Regler per BUC-type
            </Heading>
          </div>

          <BodyLong>
            Tabellene viser gjeldende konfigurasjon for de{" "}
            {bucFamilies.reduce((sum, f) => sum + f.bucs.length, 0)} BUC-typene
            som dekkes av automatisk avslutning. Kilde:{" "}
            <DsLink
              href="https://github.com/navikt/eux-avslutt-rinasaker/blob/main/src/main/kotlin/no/nav/eux/avslutt/rinasaker/model/buc/Buc.kt"
              target="_blank"
              rel="noreferrer"
            >
              Buc.kt
            </DsLink>
          </BodyLong>

          <Detail textColor="subtle">
            <b>Uvirksom</b> = dager uten aktivitet før saken vurderes for avslutning.{" "}
            <b>Sakseier / Motpart</b> = avslutningsscope når NAV har den rollen.{" "}
            Lokal = bare NAVs side lukkes. Global = saken lukkes for alle parter.{" "}
            «—» = ingen automatisk avslutning i den rollen.{" "}
            Arkivering skjer 180 dager etter avslutning, med mindre annet er oppgitt.
          </Detail>

          <Accordion>
            {bucFamilies.map((fam) => (
              <Accordion.Item key={fam.id}>
                <Accordion.Header>
                  {fam.label} ({fam.bucs.length})
                </Accordion.Header>
                <Accordion.Content>
                  <BucFamilyTable bucs={fam.bucs} />
                </Accordion.Content>
              </Accordion.Item>
            ))}
          </Accordion>

          <BodyShort size="small" style={subtle}>
            Hentet fra <code>Buc.kt</code> i{" "}
            <code>eux-avslutt-rinasaker</code>. Verifiser mot kildekoden ved avvik.
          </BodyShort>
        </VStack>
      </section>
    </VStack>
  );
}
