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
  compact?: boolean;
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
  compact = false,
}: NodeProps) {
  const labelSize = compact ? 11 : 12.5;
  const subSize = compact ? 9.5 : 10.5;
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
        y={sub ? y + h / 2 - 3 : y + h / 2 + 5}
        textAnchor="middle"
        fontSize={labelSize}
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
          fontSize={subSize}
          fill={textColor}
          opacity={0.72}
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
  labelOffset = 0,
  dashed = false,
  color = "#525252",
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: string;
  labelOffset?: number;
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
        strokeWidth={1.4}
        strokeDasharray={dashed ? "5,4" : undefined}
        markerEnd="url(#arrowhead)"
      />
      {label && (
        <text
          x={midX + labelOffset}
          y={midY - 5}
          textAnchor="middle"
          fontSize={10}
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
      viewBox="0 0 960 600"
      role="img"
      aria-label="Synkron forespørselsflyt fra saksbehandler via nEESSI og eux-neessi til de spesialiserte tjenestene, RINA og eksterne NAV-systemer."
      width="100%"
      style={{ maxWidth: "100%", height: "auto" }}
    >
      <Defs />

      {/* Saksbehandler */}
      <Node x={400} y={10} w={160} h={44} label="Saksbehandler" sub="Nettleser" {...C.grey} />
      <Arrow x1={480} y1={54} x2={480} y2={88} />

      {/* nEESSI */}
      <Node x={380} y={88} w={200} h={58} label="nEESSI" sub="React + Node.js BFF" {...C.blue} />
      <Arrow x1={480} y1={146} x2={480} y2={210} label="OAuth2 OBO" />

      {/* eux-neessi */}
      <Node x={370} y={210} w={220} h={62} label="eux-neessi" sub="Orkestrator-BFF" {...C.purple} />

      {/* Side branch right to external NAV systems */}
      <Arrow x1={590} y1={241} x2={720} y2={241} label="PDL · Dokarkiv · SAF" />
      <Node x={720} y={210} w={170} h={62} label="Eksterne" sub="NAV-systemer" {...C.orange} />

      {/* Fan-out to specialised services */}
      <Arrow x1={420} y1={272} x2={120} y2={332} />
      <Arrow x1={445} y1={272} x2={290} y2={332} />
      <Arrow x1={480} y1={272} x2={480} y2={332} />
      <Arrow x1={515} y1={272} x2={670} y2={332} />
      <Arrow x1={540} y1={272} x2={840} y2={332} />

      <Node x={40} y={334} w={160} h={62} label="eux-rina-api" sub="RINA-mellomvare" {...C.blue} />
      <Node x={210} y={334} w={160} h={62} label="eux-nav-rinasak" sub="Saksforbindelse · PG" {...C.green} />
      <Node x={400} y={334} w={160} h={62} label="eux-journal" sub="Journal · PG" {...C.green} />
      <Node x={590} y={334} w={160} h={62} label="eux-oppgave" sub="Oppgaver · PG" {...C.green} />
      <Node x={760} y={334} w={160} h={62} label="eux-saksbehandler" sub="Innstillinger · PG" {...C.green} />

      {/* External systems below */}
      <Arrow x1={120} y1={396} x2={120} y2={470} />
      <Node x={40} y={472} w={160} h={50} label="RINA CPI" sub="EU-infrastruktur" {...C.red} />

      <Arrow x1={670} y1={396} x2={670} y2={470} />
      <Node x={590} y={472} w={160} h={50} label="NAV Oppgave" sub="Oppgavesystem" {...C.orange} />
    </svg>
  );
}

export function EventFlowDiagram() {
  return (
    <svg
      viewBox="0 0 960 620"
      role="img"
      aria-label="Hendelsesflyt fra RINA via eux-all-rina-events til tre Kafka-topics, og videre til konsumentene som gjør jobben."
      width="100%"
      style={{ maxWidth: "100%", height: "auto" }}
    >
      <Defs />

      {/* RINA */}
      <Node x={400} y={10} w={160} h={46} label="RINA CPI" sub="EU-infrastruktur" {...C.red} />
      <Arrow x1={480} y1={56} x2={480} y2={94} label="NIE-hendelser (HTTP)" />

      {/* eux-all-rina-events */}
      <Node x={370} y={94} w={220} h={58} label="eux-all-rina-events" sub="HTTP → Kafka" {...C.blue} />

      {/* Three topics */}
      <Arrow x1={420} y1={152} x2={170} y2={200} />
      <Arrow x1={480} y1={152} x2={480} y2={200} />
      <Arrow x1={540} y1={152} x2={790} y2={200} />

      <Node x={30} y={202} w={280} h={50} label="case-events-v1" sub="Kafka-topic" {...C.purple} />
      <Node x={340} y={202} w={280} h={50} label="document-events-v1" sub="Kafka-topic" {...C.purple} />
      <Node x={650} y={202} w={280} h={50} label="notification-events-v1" sub="Kafka-topic" {...C.purple} />

      {/* Legacy bridge */}
      <Arrow x1={480} y1={252} x2={480} y2={296} />
      <Node x={330} y={298} w={300} h={50} label="eux-legacy-rina-events" sub="Bygger bro til eldre topics" {...C.blue} />
      <Arrow x1={480} y1={348} x2={480} y2={380} />
      <Node x={300} y={382} w={360} h={46} label="sedmottatt-v1 · sedsendt-v1" sub="Eldre Kafka-topics" {...C.purple} />

      {/* Consumers row 1 (from case-events-v1 and notification-events-v1) */}
      <Arrow x1={170} y1={252} x2={90} y2={460} />
      <Arrow x1={170} y1={252} x2={260} y2={460} />
      <Arrow x1={170} y1={252} x2={430} y2={460} />
      <Arrow x1={790} y1={252} x2={870} y2={460} />

      {/* Consumers row 2 (from legacy topics and document-events-v1) */}
      <Arrow x1={480} y1={428} x2={90} y2={544} />
      <Arrow x1={480} y1={428} x2={260} y2={544} />
      <Arrow x1={620} y1={227} x2={430} y2={544} />

      <Node compact x={20} y={462} w={150} h={58} label="rina-case-search" sub="Søkeindeks" {...C.green} />
      <Node compact x={190} y={462} w={150} h={58} label="avslutt-rinasaker" sub="Lukker saker" {...C.green} />
      <Node compact x={360} y={462} w={150} h={58} label="slett-usendte-rinasaker" sub="Rydder bort tomme" {...C.green} />
      <Node compact x={800} y={462} w={140} h={58} label="Eksterne" sub="eessi-pensjon m.fl." {...C.orange} />

      <Node compact x={20} y={546} w={150} h={58} label="fagmodul-journalfoering" sub="Auto-journalføring" {...C.green} />
      <Node compact x={190} y={546} w={150} h={58} label="person-oppdatering" sub="Utenlandske ID-er" {...C.green} />
      <Node compact x={360} y={546} w={150} h={58} label="adresse-oppdatering" sub="PDL-adresser" {...C.green} />
    </svg>
  );
}

export function SedLifecycleDiagram() {
  const steps: { label: string; sub: string }[] = [
    { label: "Åpne sak", sub: "Saksbehandler starter" },
    { label: "Opprett RINA-sak", sub: "via eux-rina-api" },
    { label: "Fyll SED", sub: "i nEESSI" },
    { label: "Send SED", sub: "til motpart" },
    { label: "Dokumenthendelse", sub: "RINA → Kafka" },
    { label: "Auto-journal", sub: "Dokarkiv + Oppgave" },
    { label: "Lukk sak", sub: "Planlagt opprydding" },
  ];
  const w = 118;
  const gap = 12;
  return (
    <svg
      viewBox={`0 0 ${(w + gap) * steps.length} 120`}
      role="img"
      aria-label="Livssyklusen til en SED — fra åpning av sak til planlagt lukking."
      width="100%"
      style={{ maxWidth: "100%", height: "auto" }}
    >
      <Defs />
      {steps.map((s, i) => (
        <g key={s.label}>
          <Node
            compact
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
