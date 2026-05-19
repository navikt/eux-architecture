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

function SubscriberPanel({
  x,
  y,
  w,
  title = "Konsumenter",
  items,
}: {
  x: number;
  y: number;
  w: number;
  title?: string;
  items: { name: string; sub?: string }[];
}) {
  const headerH = 22;
  const rowH = 44;
  const padBottom = 10;
  const h = headerH + items.length * rowH + padBottom;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={10}
        ry={10}
        fill="#fafafa"
        stroke="#9a9a9a"
        strokeDasharray="4,3"
        strokeWidth={1.2}
      />
      <text
        x={x + 12}
        y={y + 15}
        fontSize={9}
        fill="#666"
        letterSpacing={1.2}
        fontFamily="system-ui, sans-serif"
      >
        {title.toUpperCase()}
      </text>
      {items.map((item, i) => {
        const cy = y + headerH + i * rowH + rowH / 2;
        return (
          <g key={i}>
            <text
              x={x + w / 2}
              y={cy - 2}
              textAnchor="middle"
              fontSize={11.5}
              fontWeight={600}
              fill="#1a1a1a"
              fontFamily="system-ui, sans-serif"
            >
              {item.name}
            </text>
            {item.sub && (
              <text
                x={x + w / 2}
                y={cy + 11}
                textAnchor="middle"
                fontSize={9.5}
                opacity={0.72}
                fill="#1a1a1a"
                fontFamily="system-ui, sans-serif"
              >
                {item.sub}
              </text>
            )}
            {i < items.length - 1 && (
              <line
                x1={x + 14}
                y1={y + headerH + (i + 1) * rowH}
                x2={x + w - 14}
                y2={y + headerH + (i + 1) * rowH}
                stroke="#e3e3e3"
                strokeWidth={1}
              />
            )}
          </g>
        );
      })}
    </g>
  );
}

export function EventFlowDiagram() {
  return (
    <svg
      viewBox="0 0 960 620"
      role="img"
      aria-label="Hendelsesflyt fra RINA via eux-all-rina-events til tre Kafka-topics, og videre til konsumentgrupper per topic — uten krysninger."
      width="100%"
      style={{ maxWidth: "100%", height: "auto" }}
    >
      <Defs />

      {/* RINA → all-rina-events */}
      <Node x={400} y={10} w={160} h={46} label="RINA CPI" sub="EU-infrastruktur" {...C.red} />
      <Arrow x1={480} y1={56} x2={480} y2={88} label="NIE-hendelser (HTTP)" />
      <Node x={360} y={88} w={240} h={58} label="eux-all-rina-events" sub="HTTP → Kafka" {...C.blue} />

      {/* Fan-out til tre topics */}
      <Arrow x1={420} y1={146} x2={160} y2={190} />
      <Arrow x1={480} y1={146} x2={480} y2={190} />
      <Arrow x1={540} y1={146} x2={800} y2={190} />

      {/* Topics */}
      <Node x={30} y={190} w={260} h={48} label="case-events-v1" sub="Kafka-topic" {...C.purple} />
      <Node x={350} y={190} w={260} h={48} label="document-events-v1" sub="Kafka-topic" {...C.purple} />
      <Node x={670} y={190} w={260} h={48} label="notification-events-v1" sub="Kafka-topic" {...C.purple} />

      {/* Venstre kolonne: konsumenter rett under case-events-v1 */}
      <Arrow x1={160} y1={238} x2={160} y2={268} />
      <SubscriberPanel
        x={20}
        y={268}
        w={280}
        items={[
          { name: "eux-rina-case-search", sub: "Søkeindeks for saker" },
          { name: "eux-avslutt-rinasaker", sub: "Lukker saker" },
          { name: "eux-slett-usendte-rinasaker", sub: "Rydder bort tomme saker" },
        ]}
      />

      {/* Midtre kolonne: bridge → legacy topic → konsumenter */}
      <Arrow x1={480} y1={238} x2={480} y2={268} />
      <Node x={360} y={268} w={240} h={52} label="eux-legacy-rina-events" sub="Bygger bro til eldre topics" {...C.blue} />
      <Arrow x1={480} y1={320} x2={480} y2={344} />
      <Node x={360} y={344} w={240} h={46} label="sedmottatt-v1 · sedsendt-v1" sub="Eldre Kafka-topics" {...C.purple} />
      <Arrow x1={480} y1={390} x2={480} y2={414} />
      <SubscriberPanel
        x={340}
        y={414}
        w={280}
        items={[
          { name: "eux-fagmodul-journalfoering", sub: "Auto-journalføring" },
          { name: "eux-person-oppdatering", sub: "Utenlandske ID-er → PDL" },
          { name: "eux-adresse-oppdatering", sub: "Adresser → PDL" },
        ]}
      />

      {/* Høyre kolonne: én ekstern konsument */}
      <Arrow x1={800} y1={238} x2={800} y2={268} />
      <SubscriberPanel
        x={660}
        y={268}
        w={280}
        title="Eksterne abonnenter"
        items={[
          { name: "eessi-pensjon m.fl.", sub: "Brukerrettede varsler" },
        ]}
      />
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
