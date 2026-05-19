type NodeProps = {
  x: number;
  y: number;
  w?: number;
  h?: number;
  fill?: string;
  stroke?: string;
  label: string;
  sub?: string;
  textColor?: string;
};

function Node({
  x,
  y,
  w = 150,
  h = 56,
  fill = "#e6f0fa",
  stroke = "#0067c5",
  label,
  sub,
  textColor = "#1a1a1a",
}: NodeProps) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={10}
        ry={10}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
      />
      <text
        x={x + w / 2}
        y={sub ? y + h / 2 - 4 : y + h / 2 + 5}
        textAnchor="middle"
        fontSize={13}
        fontWeight={600}
        fill={textColor}
        fontFamily="system-ui, sans-serif"
      >
        {label}
      </text>
      {sub && (
        <text
          x={x + w / 2}
          y={y + h / 2 + 12}
          textAnchor="middle"
          fontSize={10.5}
          fill={textColor}
          opacity={0.7}
          fontFamily="system-ui, sans-serif"
        >
          {sub}
        </text>
      )}
    </g>
  );
}

function Arrow({
  x1,
  y1,
  x2,
  y2,
  label,
  dashed = false,
  color = "#525252",
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: string;
  dashed?: boolean;
  color?: string;
}) {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={1.5}
        strokeDasharray={dashed ? "5,4" : undefined}
        markerEnd="url(#arrowhead)"
      />
      {label && (
        <text
          x={midX}
          y={midY - 6}
          textAnchor="middle"
          fontSize={10.5}
          fill={color}
          fontFamily="system-ui, sans-serif"
          style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3 }}
        >
          {label}
        </text>
      )}
    </g>
  );
}

function Defs() {
  return (
    <defs>
      <marker
        id="arrowhead"
        viewBox="0 0 10 10"
        refX="9"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#525252" />
      </marker>
    </defs>
  );
}

const C = {
  blue: { fill: "#e6f0fa", stroke: "#0067c5" },
  green: { fill: "#e0f1e3", stroke: "#06893a" },
  purple: { fill: "#ece6f6", stroke: "#634689" },
  orange: { fill: "#fcecd6", stroke: "#a04300" },
  red: { fill: "#fde2e2", stroke: "#b3253a" },
  grey: { fill: "#f0f0f0", stroke: "#666" },
};

export function SyncFlowDiagram() {
  return (
    <svg
      viewBox="0 0 900 520"
      role="img"
      aria-label="Synchronous request flow from caseworker through eux-web-app, eux-neessi, and the specialised EUX services to RINA and external NAV systems."
      width="100%"
      style={{ maxWidth: "100%", height: "auto" }}
    >
      <Defs />
      {/* Caseworker */}
      <Node x={370} y={10} w={160} h={48} label="Caseworker" sub="Browser" {...C.grey} />
      <Arrow x1={450} y1={58} x2={450} y2={82} />

      {/* eux-web-app */}
      <Node x={350} y={84} w={200} h={56} label="eux-web-app" sub="React + Node.js BFF" {...C.blue} />
      <Arrow x1={450} y1={140} x2={450} y2={164} label="OAuth2 on-behalf-of" />

      {/* eux-neessi */}
      <Node x={340} y={166} w={220} h={62} label="eux-neessi" sub="Orchestrator BFF" {...C.purple} />

      {/* Downstream services row */}
      <Arrow x1={395} y1={228} x2={120} y2={290} />
      <Arrow x1={420} y1={228} x2={290} y2={290} />
      <Arrow x1={450} y1={228} x2={450} y2={290} />
      <Arrow x1={480} y1={228} x2={620} y2={290} />
      <Arrow x1={505} y1={228} x2={780} y2={290} />

      <Node x={40} y={292} w={160} h={58} label="eux-rina-api" sub="RINA middleware" {...C.blue} />
      <Node x={210} y={292} w={160} h={58} label="eux-nav-rinasak" sub="Case linking · PG" {...C.green} />
      <Node x={380} y={292} w={160} h={58} label="eux-journal" sub="Journal mgmt · PG" {...C.green} />
      <Node x={550} y={292} w={160} h={58} label="eux-oppgave" sub="Task mgmt · PG" {...C.green} />
      <Node x={720} y={292} w={160} h={58} label="eux-saksbehandler" sub="Preferences · PG" {...C.green} />

      {/* External NAV systems */}
      <Arrow x1={120} y1={350} x2={120} y2={410} />
      <Node x={40} y={412} w={160} h={50} label="RINA CPI" sub="EU infrastructure" {...C.red} />

      <Arrow x1={620} y1={350} x2={620} y2={410} />
      <Node x={540} y={412} w={160} h={50} label="NAV Oppgave" sub="Task system" {...C.orange} />

      {/* Side calls from neessi */}
      <Arrow x1={560} y1={196} x2={780} y2={196} label="PDL · Dokarkiv · SAF" />
      <Node x={780} y={166} w={100} h={62} label="External" sub="NAV systems" {...C.orange} />
    </svg>
  );
}

export function EventFlowDiagram() {
  return (
    <svg
      viewBox="0 0 900 520"
      role="img"
      aria-label="Event-driven flow from RINA via eux-all-rina-events to three Kafka topics and the downstream worker services."
      width="100%"
      style={{ maxWidth: "100%", height: "auto" }}
    >
      <Defs />
      {/* RINA */}
      <Node x={370} y={10} w={160} h={50} label="RINA CPI" sub="EU infrastructure" {...C.red} />
      <Arrow x1={450} y1={60} x2={450} y2={84} label="NIE events (HTTP)" />

      {/* all-rina-events */}
      <Node x={335} y={86} w={230} h={58} label="eux-all-rina-events" sub="HTTP → Kafka" {...C.blue} />

      {/* Topics */}
      <Arrow x1={400} y1={144} x2={150} y2={188} />
      <Arrow x1={450} y1={144} x2={450} y2={188} />
      <Arrow x1={500} y1={144} x2={750} y2={188} />

      <Node x={40} y={190} w={220} h={48} label="case-events-v1" sub="Kafka topic" {...C.purple} />
      <Node x={340} y={190} w={220} h={48} label="document-events-v1" sub="Kafka topic" {...C.purple} />
      <Node x={640} y={190} w={220} h={48} label="notification-events-v1" sub="Kafka topic" {...C.purple} />

      {/* legacy bridge */}
      <Arrow x1={450} y1={238} x2={450} y2={272} />
      <Node x={320} y={274} w={260} h={50} label="eux-legacy-rina-events" sub="Format bridge → legacy topics" {...C.blue} />
      <Arrow x1={450} y1={324} x2={450} y2={350} />
      <Node x={300} y={352} w={300} h={42} label="sedmottatt-v1 · sedsendt-v1" sub="Legacy Kafka topics" {...C.purple} />

      {/* Consumers row */}
      <Arrow x1={150} y1={238} x2={70} y2={420} />
      <Arrow x1={150} y1={238} x2={70} y2={462} />
      <Arrow x1={750} y1={238} x2={820} y2={420} />
      <Arrow x1={450} y1={394} x2={300} y2={460} />
      <Arrow x1={450} y1={394} x2={600} y2={460} />

      <Node x={0} y={400} w={150} h={48} label="eux-rina-" sub="case-search" {...C.green} />
      <Node x={0} y={460} w={150} h={48} label="eux-avslutt-" sub="rinasaker" {...C.green} />
      <Node x={155} y={460} w={140} h={48} label="eux-slett-" sub="usendte-rinasaker" {...C.green} />
      <Node x={300} y={460} w={150} h={48} label="eux-journal-" sub="foering" {...C.green} />
      <Node x={460} y={460} w={150} h={48} label="eux-person-" sub="oppdatering" {...C.green} />
      <Node x={620} y={460} w={150} h={48} label="eux-adresse-" sub="oppdatering" {...C.green} />
      <Node x={760} y={400} w={140} h={48} label="External" sub="notif handlers" {...C.orange} />
    </svg>
  );
}

export function SedLifecycleDiagram() {
  const steps: { label: string; sub: string }[] = [
    { label: "Open case", sub: "Caseworker starts" },
    { label: "Create RINA case", sub: "via eux-rina-api" },
    { label: "Fill SED", sub: "in eux-web-app" },
    { label: "Send SED", sub: "to counterpart" },
    { label: "Document event", sub: "RINA → Kafka" },
    { label: "Auto-journal", sub: "Dokarkiv + Oppgave" },
    { label: "Close case", sub: "Scheduled cleanup" },
  ];
  const w = 110;
  const gap = 12;
  return (
    <svg
      viewBox={`0 0 ${(w + gap) * steps.length} 120`}
      role="img"
      aria-label="The lifecycle of a SED — from opening a case to scheduled closure."
      width="100%"
      style={{ maxWidth: "100%", height: "auto" }}
    >
      <Defs />
      {steps.map((s, i) => (
        <g key={s.label}>
          <Node
            x={i * (w + gap)}
            y={30}
            w={w}
            h={60}
            label={s.label}
            sub={s.sub}
            {...(i < 3 ? C.blue : i < 5 ? C.purple : C.green)}
          />
          {i < steps.length - 1 && (
            <line
              x1={i * (w + gap) + w}
              y1={60}
              x2={(i + 1) * (w + gap)}
              y2={60}
              stroke="#525252"
              strokeWidth={1.5}
              markerEnd="url(#arrowhead)"
            />
          )}
        </g>
      ))}
    </svg>
  );
}
