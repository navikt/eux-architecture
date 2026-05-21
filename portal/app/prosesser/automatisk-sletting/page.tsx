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
  const muted = "#7a7a7a";
  const w = 800;
  const h = 280;
  const cardW = 155;
  const cardH = 70;
  const mainY = 55;

  const steps = [
    { x: 10, label: "Ny sak", sub: "Opprettet i RINA", color: "#e6f0fa", stroke: "#0067c5" },
    { x: 215, label: "Ingen SED", sub: "15 dager uten dokument", color: "#fff4e1", stroke: "#c77300" },
    { x: 420, label: "Sjekkes", sub: "Kan den slettes?", color: "#fff4e1", stroke: "#c77300" },
    { x: 625, label: "Slettet", sub: "Fjernet fra RINA", color: "#e3f5e8", stroke: "#067a3a" },
  ];

  const branchY = 180;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Livsløp for sletting av usendte RINA-saker" style={{ width: "100%", height: "auto" }}>
      <defs>
        <marker id="arr-life-slett" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill={muted} />
        </marker>
      </defs>

      {/* Main flow */}
      {steps.map((s, i) => (
        <g key={s.label}>
          <rect x={s.x} y={mainY} width={cardW} height={cardH} rx={12} ry={12} fill={s.color} stroke={s.stroke} strokeWidth={1.5} />
          <text x={s.x + cardW / 2} y={mainY + 28} textAnchor="middle" fontSize={14} fontWeight={600} fill="#1a1a1a">
            {s.label}
          </text>
          <text x={s.x + cardW / 2} y={mainY + 50} textAnchor="middle" fontSize={11} fill="#444">
            {s.sub}
          </text>
          {i < steps.length - 1 && (
            <line
              x1={s.x + cardW + 4}
              y1={mainY + cardH / 2}
              x2={steps[i + 1].x - 6}
              y2={mainY + cardH / 2}
              stroke={muted}
              strokeWidth={1.5}
              markerEnd="url(#arr-life-slett)"
            />
          )}
        </g>
      ))}

      {/* Timing label above first arrow */}
      <text x={(10 + cardW + 215) / 2} y={mainY - 8} textAnchor="middle" fontSize={11} fill={muted}>
        15 dager
      </text>
      <text x={(420 + cardW + 625) / 2} y={mainY - 8} textAnchor="middle" fontSize={11} fill={muted}>
        via RINA
      </text>

      {/* Branch: Beholdes */}
      <rect x={10} y={branchY} width={cardW} height={cardH} rx={12} ry={12} fill="#e3f5e8" stroke="#067a3a" strokeWidth={1.5} />
      <text x={10 + cardW / 2} y={branchY + 28} textAnchor="middle" fontSize={14} fontWeight={600} fill="#1a1a1a">
        Beholdes
      </text>
      <text x={10 + cardW / 2} y={branchY + 50} textAnchor="middle" fontSize={11} fill="#444">
        Har fått dokument
      </text>

      {/* Arrow: Ny sak ↓ Beholdes */}
      <line
        x1={10 + cardW / 2}
        y1={mainY + cardH + 4}
        x2={10 + cardW / 2}
        y2={branchY - 6}
        stroke={muted}
        strokeWidth={1.5}
        markerEnd="url(#arr-life-slett)"
      />

      {/* Branch label */}
      <text x={10 + cardW / 2 + 14} y={(mainY + cardH + branchY) / 2 + 5} fontSize={11} fill={muted} textAnchor="start">
        SED sendt/mottatt
      </text>

      {/* Legend */}
      <g transform={`translate(10, ${h - 18})`}>
        <rect x={0} y={-10} width={14} height={14} rx={3} fill="#e6f0fa" stroke="#0067c5" />
        <text x={22} y={1} fontSize={11} fill="#333">Ny</text>
        <rect x={60} y={-10} width={14} height={14} rx={3} fill="#fff4e1" stroke="#c77300" />
        <text x={82} y={1} fontSize={11} fill="#333">Venter</text>
        <rect x={145} y={-10} width={14} height={14} rx={3} fill="#e3f5e8" stroke="#067a3a" />
        <text x={167} y={1} fontSize={11} fill="#333">Ferdig / trygg</text>
      </g>
    </svg>
  );
}

/* ---------- Diagram: state machine (technical) ---------- */

function StateMachineDiagram() {
  const w = 1080;
  const h = 330;
  const muted = "#5a6470";
  const boxW = 170;
  const boxH = 42;

  const COL = { c0: 20, c1: 270, c2: 540, c3: 810 };
  const ROW = { top: 40, mid: 130, low: 220 };

  type Tone = "blue" | "amber" | "green" | "red";
  type N = { id: string; x: number; y: number; label: string; tone: Tone };

  const nodes: N[] = [
    { id: "NY", x: COL.c0, y: ROW.mid, label: "NY_SAK", tone: "blue" },
    { id: "DS", x: COL.c1, y: ROW.top, label: "DOKUMENT_SENT", tone: "green" },
    { id: "TS", x: COL.c1, y: ROW.mid, label: "TIL_SLETTING", tone: "amber" },
    { id: "KIS", x: COL.c1, y: ROW.low, label: "KAN_IKKE_SLETTES", tone: "red" },
    { id: "SL", x: COL.c2, y: ROW.top, label: "SLETTET", tone: "green" },
    { id: "SFR", x: COL.c2, y: ROW.mid, label: "SLETTING_FEILET_RETRY", tone: "amber" },
    { id: "NF", x: COL.c2, y: ROW.low, label: "NOT_FOUND", tone: "green" },
    { id: "SF", x: COL.c3, y: ROW.mid, label: "SLETTING_FEILET", tone: "red" },
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

  const ortho = (
    a: { x: number; y: number },
    b: { x: number; y: number },
    bendAt?: number,
  ) => {
    const bx = bendAt ?? (a.x + b.x) / 2;
    return `M ${a.x} ${a.y} H ${bx} V ${b.y} H ${b.x}`;
  };

  type Edge = {
    d: string;
    label?: string;
    labelAt: { x: number; y: number };
    dashed?: boolean;
  };

  const edges: Edge[] = (() => {
    const list: Edge[] = [];

    // NY → DS (up-right)
    {
      const a = anchor("NY", "right", 0.25);
      const b = anchor("DS", "left");
      const bend = a.x + 24;
      list.push({
        d: ortho(a, b, bend),
        label: "SED sendt/mottatt",
        labelAt: { x: bend - 14, y: (a.y + b.y) / 2 },
      });
    }

    // NY → TS (straight)
    {
      const a = anchor("NY", "right", 0.5);
      const b = anchor("TS", "left");
      list.push({
        d: `M ${a.x} ${a.y} L ${b.x} ${b.y}`,
        label: "15d + kanSlettes",
        labelAt: { x: (a.x + b.x) / 2, y: a.y - 8 },
      });
    }

    // NY → KIS (down-right)
    {
      const a = anchor("NY", "right", 0.75);
      const b = anchor("KIS", "left");
      const bend = a.x + 24;
      list.push({
        d: ortho(a, b, bend),
        label: "ikke slettbar",
        labelAt: { x: (bend + b.x) / 2, y: b.y - 8 },
      });
    }

    // TS → DS (up, dashed — late document event)
    {
      const a = anchor("TS", "top", 0.5, 0.3);
      const b = anchor("DS", "bottom", 0.5, 0.3);
      list.push({
        d: `M ${a.x} ${a.y} L ${b.x} ${b.y}`,
        label: "sen SED",
        labelAt: { x: a.x - 32, y: (a.y + b.y) / 2 + 4 },
        dashed: true,
      });
    }

    // TS → SL (up-right)
    {
      const a = anchor("TS", "right", 0.25);
      const b = anchor("SL", "left");
      const bend = a.x + 30;
      list.push({
        d: ortho(a, b, bend),
        label: "slett OK",
        labelAt: { x: (bend + b.x) / 2, y: b.y - 8 },
      });
    }

    // TS → SFR (straight)
    {
      const a = anchor("TS", "right", 0.5);
      const b = anchor("SFR", "left");
      list.push({
        d: `M ${a.x} ${a.y} L ${b.x} ${b.y}`,
        label: "feil",
        labelAt: { x: (a.x + b.x) / 2, y: a.y - 8 },
      });
    }

    // TS → NF (down-right)
    {
      const a = anchor("TS", "right", 0.75);
      const b = anchor("NF", "left");
      const bend = a.x + 30;
      list.push({
        d: ortho(a, b, bend),
        label: "404",
        labelAt: { x: (bend + b.x) / 2, y: b.y - 8 },
      });
    }

    // SFR → SL (up)
    {
      const a = anchor("SFR", "top", 0.5, 0.7);
      const b = anchor("SL", "bottom", 0.5, 0.7);
      list.push({
        d: `M ${a.x} ${a.y} L ${b.x} ${b.y}`,
        label: "retry OK",
        labelAt: { x: a.x + 14, y: (a.y + b.y) / 2 + 4 },
      });
    }

    // SFR → NF (down)
    {
      const a = anchor("SFR", "bottom", 0.5, 0.7);
      const b = anchor("NF", "top", 0.5, 0.7);
      list.push({
        d: `M ${a.x} ${a.y} L ${b.x} ${b.y}`,
        label: "404",
        labelAt: { x: a.x + 14, y: (a.y + b.y) / 2 + 4 },
      });
    }

    // SFR → SF (straight right)
    {
      const a = anchor("SFR", "right");
      const b = anchor("SF", "left");
      list.push({
        d: `M ${a.x} ${a.y} L ${b.x} ${b.y}`,
        label: "feil igjen",
        labelAt: { x: (a.x + b.x) / 2, y: a.y - 8 },
      });
    }

    return list;
  })();

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label="Statusmaskin for eux-slett-usendte-rinasaker"
      style={{ width: "100%", height: "auto", display: "block" }}
    >
      <defs>
        <marker id="arr-state-slett" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
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
            strokeDasharray={e.dashed ? "6 3" : undefined}
            markerEnd="url(#arr-state-slett)"
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

      {/* Note about KORRUPT status */}
      <g transform={`translate(${COL.c3 - 10}, ${ROW.low + 16})`}>
        <rect
          x={0}
          y={0}
          width={270}
          height={36}
          rx={8}
          ry={8}
          fill="#fde8e8"
          stroke="#b32525"
          strokeDasharray="4 3"
          strokeWidth={1.2}
        />
        <text x={14} y={15} fontSize={11} fontWeight={600} fill="#7a1414">
          Finnes også: <tspan fontFamily="var(--ax-font-mono, monospace)">KORRUPT</tspan>
        </text>
        <text x={14} y={29} fontSize={11} fill="#7a1414">
          ⇒ korrupt data, utenfor normal flyt
        </text>
      </g>

      {/* Legend */}
      <g transform={`translate(20, ${h - 18})`}>
        <rect x={0} y={-10} width={12} height={12} rx={3} fill="#e6f0fa" stroke="#0067c5" />
        <text x={18} y={0} fontSize={11} fill="#333">start</text>
        <rect x={70} y={-10} width={12} height={12} rx={3} fill="#fff4e1" stroke="#c77300" />
        <text x={88} y={0} fontSize={11} fill="#333">overgang</text>
        <rect x={170} y={-10} width={12} height={12} rx={3} fill="#e3f5e8" stroke="#067a3a" />
        <text x={188} y={0} fontSize={11} fill="#333">ferdig / trygg</text>
        <rect x={310} y={-10} width={12} height={12} rx={3} fill="#fde8e8" stroke="#b32525" />
        <text x={328} y={0} fontSize={11} fill="#333">feil / manuell</text>
      </g>
    </svg>
  );
}

/* ---------- Section eyebrow ---------- */

function SectionEyebrow({ kind }: { kind: "funksjonell" | "teknisk" }) {
  const label = kind === "funksjonell" ? "For alle" : "For utviklere";
  return <div style={eyebrow}>{label}</div>;
}

/* ---------- Page ---------- */

export default function Page() {
  return (
    <VStack gap="space-32">
      <header>
        <div style={eyebrow}>Prosess</div>
        <Heading size="xlarge" level="1" spacing>
          Automatisk sletting
        </Heading>
        <BodyLong size="medium" style={subtle}>
          Slik rydder plattformen bort RINA-saker som aldri ble brukt —
          opprettet ved feil eller forlatt uten at noe dokument ble sendt.
          Prosessen utføres av applikasjonen{" "}
          <DsLink href="https://github.com/navikt/eux-slett-usendte-rinasaker" target="_blank" rel="noreferrer">
            eux-slett-usendte-rinasaker
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
            Det hender at en saksbehandler oppretter en RINA-sak, men aldri
            legger til eller sender et dokument (SED). Slike «tomme» saker
            har ingen funksjon og skaper støy i porteføljen. Plattformen
            rydder dem bort automatisk i bakgrunnen, hver natt.
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
            Saker vurderes tidligst for sletting 15 dager etter
            opprettelse. Ethvert sendt eller mottatt dokument — uansett
            når det ankommer — beskytter saken permanent: den flyttes til
            «beholdes» og vil aldri bli slettet automatisk. Dersom ingen
            SED ankommer i løpet av de 15 dagene, sjekkes saken mot RINA
            for å bekrefte at den kan slettes trygt.
          </BodyLong>

          <BodyLong>
            Selve slettingen skjer via{" "}
            <code>eux-rina-terminator-api</code>, som sjekker i RINA om
            saken faktisk er tom og trygg å fjerne. Saker som RINA sier
            ikke kan slettes — eller der statussjekken feiler — markeres
            og hoppes over. De forsvinner ikke av seg selv.
          </BodyLong>

          <Accordion>
            <Accordion.Item>
              <Accordion.Header>Hva slettes ikke?</Accordion.Header>
              <Accordion.Content>
                <BodyLong spacing>
                  Følgende saker slettes aldri automatisk:
                </BodyLong>
                <ul style={{ margin: 0, paddingInlineStart: "1.5rem" }}>
                  <li>Saker der det er sendt eller mottatt minst én SED.</li>
                  <li>Saker som er yngre enn 15 dager.</li>
                  <li>
                    Saker der <code>eux-rina-terminator-api</code> svarer at
                    de ikke kan slettes (f.eks. fordi saken er brukt av
                    motparten).
                  </li>
                </ul>
              </Accordion.Content>
            </Accordion.Item>

            <Accordion.Item>
              <Accordion.Header>Hva med saker som feiler ved sletting?</Accordion.Header>
              <Accordion.Content>
                <BodyLong>
                  Hvis slettekallet mot RINA feiler, får saken ett nytt forsøk
                  neste natt. Feiler det igjen, settes saken til en
                  feilstatus og rapporteres i den månedlige Slack-rapporten.
                  Slike saker må undersøkes manuelt.
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
            <code>eux-slett-usendte-rinasaker</code> er en Kotlin/Spring
            Boot-app med én tabell (<code>rinasak_status</code>) i
            PostgreSQL. Den populeres fra Kafka-events, og prosessene kjøres
            via NAIS-jobber (
            <code>eux-slett-usendte-rinasaker-naisjob</code>) som kaller
            HTTP-endepunkter på appen. Selve slettingen gjøres via{" "}
            <code>eux-rina-terminator-api</code>.
          </BodyLong>

          <BodyLong>
            Kafka-lytteren mottar sak- og dokument-events. Sak-events
            oppretter en rad med status <code>NY_SAK</code>.
            Dokument-events (<code>SENT_DOCUMENT</code> og{" "}
            <code>RECEIVE_DOCUMENT</code>) setter statusen til{" "}
            <code>DOKUMENT_SENT</code> — uavhengig av nåværende status. Det
            betyr at selv en sak som allerede er markert{" "}
            <code>TIL_SLETTING</code> kan reddes av et sent dokument.
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
              <code>POST /api/v1/sletteprosess/&#123;sletteprosess&#125;/execute</code>.
            </Detail>
          </Box>

          <Heading size="small" level="3">
            Prosessene og når de kjøres
          </Heading>
          <BodyLong>
            Hver prosess kjøres som en egen NAIS-jobb med fast cron. Merk
            at <code>slett</code> kjøres før <code>til-sletting</code> —
            saker som markeres kl. 02:00 slettes normalt ved neste natts
            kjøring kl. 01:00.
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
                  ["slett", "01:00", "Sletter saker i TIL_SLETTING og SLETTING_FEILET_RETRY via eux-rina-terminator-api"],
                  ["til-sletting", "02:00", "Finner NY_SAK eldre enn 15 dager, sjekker kanSlettes mot terminator-api"],
                  ["rapport", "1. i mnd kl 06:00", "Sender månedsrapport med statistikk til Slack"],
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
            Tidspunktene er hentet fra <code>eux-slett-usendte-rinasaker-naisjob/.nais/&lt;prosess&gt;/prod.yaml</code>.
          </BodyShort>

          <Heading size="small" level="3">
            Beslutningslogikk for «til-sletting»
          </Heading>
          <BodyLong>
            Logikken i <code>SlettUsendteRinasakerService</code> er enkel
            sammenlignet med avslutning — det finnes ingen per-BUC
            konfigurasjon:
          </BodyLong>
          <ol style={{ margin: 0, paddingInlineStart: "1.5rem" }}>
            <li>Finn alle saker med status <code>NY_SAK</code> opprettet for mer enn 15 dager siden.</li>
            <li>For hver sak: kall <code>GET /api/v1/rinasaker/&#123;id&#125;/status</code> på <code>eux-rina-terminator-api</code>.</li>
            <li>Svarer den <code>kanSlettes=true</code> ⇒ sett status til <code>TIL_SLETTING</code>.</li>
            <li>Svarer den <code>kanSlettes=false</code> eller feiler ⇒ sett status til <code>KAN_IKKE_SLETTES</code>.</li>
          </ol>

          <Heading size="small" level="3">
            API
          </Heading>
          <BodyLong>
            Appen eksponerer ett operasjonelt endepunkt som NAIS-jobbene
            kaller:
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
            POST /api/v1/sletteprosess/&#123;sletteprosess&#125;/execute
          </Box>
          <BodyShort size="small" style={subtle}>
            Gyldige verdier for <code>sletteprosess</code>:{" "}
            <code>til-sletting</code>, <code>slett</code>,{" "}
            <code>rapport</code>.
          </BodyShort>

          <Heading size="small" level="3">
            Avhengigheter
          </Heading>
          <BodyLong>
            Appen kaller <code>eux-rina-terminator-api</code> for både
            statussjekk og sletting:
          </BodyLong>
          <ul style={{ margin: 0, paddingInlineStart: "1.5rem" }}>
            <li><code>GET /api/v1/rinasaker/&#123;id&#125;/status</code> — sjekker om en sak kan slettes.</li>
            <li><code>DELETE /api/v1/rinasaker/&#123;id&#125;</code> — sletter saken i RINA.</li>
          </ul>

          <Accordion>
            <Accordion.Item>
              <Accordion.Header>Feilhåndtering</Accordion.Header>
              <Accordion.Content>
                <BodyLong spacing>
                  Sletting bruker et engangs retry-mønster:
                </BodyLong>
                <ol style={{ margin: 0, paddingInlineStart: "1.5rem" }}>
                  <li>Kall mot RINA feiler ⇒ status settes til <code>SLETTING_FEILET_RETRY</code>.</li>
                  <li>Neste natts <code>slett</code>-jobb prøver igjen.</li>
                  <li>Feiler det på nytt ⇒ <code>SLETTING_FEILET</code> (terminal).</li>
                  <li>Returnerer RINA 404 ⇒ <code>NOT_FOUND</code> — saken er allerede borte.</li>
                </ol>
                <BodyLong style={{ marginTop: "0.75rem" }}>
                  Kafka-mottaket håndterer{" "}
                  <code>DataIntegrityViolationException</code> med ett
                  automatisk retry etter 1 sekund, i tilfelle en sak- og
                  dokument-event ankommer samtidig.
                </BodyLong>
              </Accordion.Content>
            </Accordion.Item>

            <Accordion.Item>
              <Accordion.Header>Månedlig rapport</Accordion.Header>
              <Accordion.Content>
                <BodyLong spacing>
                  Første dag i måneden kl. 06:00 sender appen en rapport til
                  Slack med to seksjoner:
                </BodyLong>
                <ul style={{ margin: 0, paddingInlineStart: "1.5rem" }}>
                  <li>
                    <strong>Forrige måned:</strong> antall slettet, not
                    found, sletting feilet, kan ikke slettes, dokument
                    mottatt.
                  </li>
                  <li>
                    <strong>Nåværende kø:</strong> nye saker, til sletting,
                    venter på retry.
                  </li>
                </ul>
              </Accordion.Content>
            </Accordion.Item>
          </Accordion>

          <GuidePanel poster>
            <Heading spacing size="small" level="3">
              Vil du grave dypere?
            </Heading>
            <BodyLong>
              All logikk ligger i{" "}
              <DsLink href="https://github.com/navikt/eux-slett-usendte-rinasaker" target="_blank" rel="noreferrer">
                navikt/eux-slett-usendte-rinasaker
              </DsLink>
              . NAIS-jobbene som driver prosessene finner du i{" "}
              <DsLink href="https://github.com/navikt/eux-slett-usendte-rinasaker-naisjob" target="_blank" rel="noreferrer">
                navikt/eux-slett-usendte-rinasaker-naisjob
              </DsLink>
              .
            </BodyLong>
          </GuidePanel>
        </VStack>
      </section>
    </VStack>
  );
}
