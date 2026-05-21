"use client";

import type { ReactNode } from "react";
import {
  Accordion,
  BodyLong,
  BodyShort,
  Box,
  Detail,
  GuidePanel,
  Heading,
  Link as DsLink,
  ReadMore,
  Table,
  Tag,
  VStack,
} from "@navikt/ds-react";

const subtle = { color: "var(--ax-text-subtle, #555)" };
const eyebrow = {
  ...subtle,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  fontSize: 12,
};

type Tone = "blue" | "green" | "purple" | "orange" | "red" | "grey";

const palette: Record<Tone, { fill: string; stroke: string }> = {
  blue: { fill: "#e6f0fa", stroke: "#0067c5" },
  green: { fill: "#e3f5e8", stroke: "#067a3a" },
  purple: { fill: "#ece6f6", stroke: "#634689" },
  orange: { fill: "#fff4e1", stroke: "#c77300" },
  red: { fill: "#fde8e8", stroke: "#b32525" },
  grey: { fill: "#f5f5f5", stroke: "#777" },
};

type NodeProps = {
  x: number;
  y: number;
  w: number;
  h?: number;
  label: string;
  sub?: string;
  tone?: Tone;
  compact?: boolean;
};

function SvgNode({
  x,
  y,
  w,
  h = 58,
  label,
  sub,
  tone = "blue",
  compact = false,
}: NodeProps) {
  const c = palette[tone];
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
        fill={c.fill}
        stroke={c.stroke}
        strokeWidth={1.45}
      />
      <text
        x={x + w / 2}
        y={sub ? y + h / 2 - 3 : y + h / 2 + 5}
        textAnchor="middle"
        fontSize={labelSize}
        fontWeight={600}
        fill="#1a1a1a"
        fontFamily="system-ui, sans-serif"
      >
        {label}
      </text>
      {sub && (
        <text
          x={x + w / 2}
          y={y + h / 2 + 13}
          textAnchor="middle"
          fontSize={subSize}
          fill="#1a1a1a"
          opacity={0.74}
          fontFamily="system-ui, sans-serif"
        >
          {sub}
        </text>
      )}
    </g>
  );
}

function SvgDefs({ markerId, color = "#5a6470" }: { markerId: string; color?: string }) {
  return (
    <defs>
      <marker
        id={markerId}
        viewBox="0 0 10 10"
        refX="9"
        refY="5"
        markerWidth="7"
        markerHeight="7"
        orient="auto"
      >
        <path d="M0,0 L10,5 L0,10 z" fill={color} />
      </marker>
    </defs>
  );
}

function LineArrow({
  x1,
  y1,
  x2,
  y2,
  markerId,
  label,
  dashed = false,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  markerId: string;
  label?: string;
  dashed?: boolean;
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
        stroke="#5a6470"
        strokeWidth={1.45}
        strokeLinecap="round"
        strokeDasharray={dashed ? "6 4" : undefined}
        markerEnd={`url(#${markerId})`}
      />
      {label && (
        <text
          x={midX}
          y={midY - 8}
          textAnchor="middle"
          fontSize={10.5}
          fill="#5a6470"
          fontFamily="system-ui, sans-serif"
          style={{ paintOrder: "stroke", stroke: "#ffffff", strokeWidth: 5 }}
        >
          {label}
        </text>
      )}
    </g>
  );
}

function PathArrow({
  d,
  markerId,
  label,
  labelAt,
  dashed = false,
}: {
  d: string;
  markerId: string;
  label?: string;
  labelAt?: { x: number; y: number };
  dashed?: boolean;
}) {
  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke="#5a6470"
        strokeWidth={1.45}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={dashed ? "6 4" : undefined}
        markerEnd={`url(#${markerId})`}
      />
      {label && labelAt && (
        <text
          x={labelAt.x}
          y={labelAt.y}
          textAnchor="middle"
          fontSize={10.5}
          fill="#5a6470"
          fontFamily="system-ui, sans-serif"
          style={{ paintOrder: "stroke", stroke: "#ffffff", strokeWidth: 5 }}
        >
          {label}
        </text>
      )}
    </g>
  );
}

function Figure({ children, caption }: { children: ReactNode; caption?: ReactNode }) {
  return (
    <Box
      style={{ background: "var(--ax-bg-neutral-soft, #f5f7fa)" }}
      borderRadius="12"
      padding="space-16"
      borderColor="neutral-subtle"
      borderWidth="1"
    >
      {children}
      {caption && (
        <Detail textColor="subtle" style={{ marginTop: 8 }}>
          {caption}
        </Detail>
      )}
    </Box>
  );
}

function OverviewDiagram() {
  const marker = "journal-overview-arrow";
  const busY = 230;
  return (
    <svg
      viewBox="0 0 1120 500"
      role="img"
      aria-label="Overordnet flyt for journalføring fra RINA-hendelse via Kafka til journalføring, Dokarkiv, SAF, PDL, eux-nav-rinasak og oppgaver."
      style={{ width: "100%", height: "auto", display: "block" }}
    >
      <SvgDefs markerId={marker} />

      <SvgNode x={20} y={42} w={150} label="RINA" sub="SED sendt/mottatt" tone="red" />
      <SvgNode x={230} y={42} w={230} label="sedmottatt-v1 · sedsendt-v1" sub="Kafka-hendelser" tone="purple" />
      <SvgNode x={535} y={34} w={260} h={74} label="eux-fagmodul-journalfoering" sub="auto-journalføring" tone="blue" />
      <SvgNode x={910} y={42} w={170} label="Dokarkiv" sub="journalpost" tone="orange" />

      <LineArrow x1={170} y1={71} x2={230} y2={71} markerId={marker} />
      <LineArrow x1={460} y1={71} x2={535} y2={71} markerId={marker} />
      <LineArrow x1={795} y1={71} x2={910} y2={71} markerId={marker} label="opprett" />

      <PathArrow d={`M 665 108 V ${busY} H 150`} markerId={marker} />
      <PathArrow d={`M 665 ${busY} H 360`} markerId={marker} />
      <PathArrow d={`M 665 ${busY} H 570`} markerId={marker} />
      <PathArrow d={`M 665 ${busY} H 790`} markerId={marker} />
      <PathArrow d={`M 665 ${busY} H 1000`} markerId={marker} />

      <SvgNode x={60} y={278} w={180} label="PDL" sub="person og adresse" tone="orange" />
      <SvgNode x={270} y={278} w={180} label="SAF" sub="fagsak/journalpost" tone="orange" />
      <SvgNode x={480} y={278} w={180} label="eux-rina-api" sub="SED + vedlegg" tone="blue" />
      <SvgNode x={700} y={278} w={190} label="eux-nav-rinasak" sub="dokument + status" tone="green" />
      <SvgNode x={910} y={278} w={180} label="eux-oppgave" sub="BEH_SED/JFR/FDR" tone="green" />

      <LineArrow x1={150} y1={230} x2={150} y2={278} markerId={marker} />
      <LineArrow x1={360} y1={230} x2={360} y2={278} markerId={marker} />
      <LineArrow x1={570} y1={230} x2={570} y2={278} markerId={marker} />
      <LineArrow x1={795} y1={230} x2={795} y2={278} markerId={marker} />
      <LineArrow x1={1000} y1={230} x2={1000} y2={278} markerId={marker} />

      <SvgNode x={700} y={402} w={190} label="eux-journalarkivar" sub="01:00 / 02:00" tone="purple" />
      <SvgNode x={920} y={402} w={170} label="eux-journal" sub="ferdigstill/avbryt" tone="blue" />
      <LineArrow x1={795} y1={336} x2={795} y2={402} markerId={marker} label="UKJENT/feil" dashed />
      <LineArrow x1={890} y1={431} x2={920} y2={431} markerId={marker} dashed />
      <PathArrow d="M 1090 431 H 1105 V 100 H 1080" markerId={marker} label="Dokarkiv-kall" labelAt={{ x: 1084, y: 248 }} dashed />
    </svg>
  );
}

function DirectionDiagram() {
  const marker = "journal-direction-arrow";
  const lane = [
    { x: 20, w: 150 },
    { x: 205, w: 170 },
    { x: 420, w: 170 },
    { x: 635, w: 175 },
    { x: 855, w: 165 },
  ];
  return (
    <svg
      viewBox="0 0 1120 420"
      role="img"
      aria-label="To adskilte journalføringsløp: inngående SED fra sedmottatt og utgående SED fra sedsendt."
      style={{ width: "100%", height: "auto", display: "block" }}
    >
      <SvgDefs markerId={marker} />

      <text x={20} y={26} fontSize={13} fontWeight={700} fill="#333" fontFamily="system-ui, sans-serif">
        Inngående SED
      </text>
      <text x={20} y={221} fontSize={13} fontWeight={700} fill="#333" fontFamily="system-ui, sans-serif">
        Utgående SED
      </text>

      <SvgNode x={lane[0].x} y={52} w={lane[0].w} label="sedmottatt-v1" sub="Kafka" tone="purple" />
      <SvgNode x={lane[1].x} y={52} w={lane[1].w} label="Person/fagsak" sub="PDL + SAF" tone="orange" />
      <SvgNode x={lane[2].x} y={52} w={lane[2].w} label="SED + vedlegg" sub="eux-rina-api" tone="blue" />
      <SvgNode x={lane[3].x} y={52} w={lane[3].w} label="Dokarkiv" sub="INNGAAENDE" tone="orange" />
      <SvgNode x={lane[4].x} y={52} w={lane[4].w} label="Oppgave" sub="BEH_SED/JFR/FDR" tone="green" />
      <SvgNode x={940} y={138} w={160} label="eux-nav-rinasak" sub="dokument + status" tone="green" />

      <LineArrow x1={170} y1={81} x2={205} y2={81} markerId={marker} />
      <LineArrow x1={375} y1={81} x2={420} y2={81} markerId={marker} />
      <LineArrow x1={590} y1={81} x2={635} y2={81} markerId={marker} />
      <LineArrow x1={810} y1={81} x2={855} y2={81} markerId={marker} />
      <LineArrow x1={1020} y1={110} x2={1020} y2={138} markerId={marker} label="status" />

      <SvgNode x={lane[0].x} y={247} w={lane[0].w} label="sedsendt-v1" sub="Kafka" tone="purple" />
      <SvgNode x={lane[1].x} y={247} w={lane[1].w} label="Fagsak/enhet" sub="nav-rinasak/SAF" tone="orange" />
      <SvgNode x={lane[2].x} y={247} w={lane[2].w} label="SED + vedlegg" sub="eux-rina-api" tone="blue" />
      <SvgNode x={lane[3].x} y={247} w={lane[3].w} label="Dokarkiv" sub="UTGAAENDE" tone="orange" />
      <SvgNode x={lane[4].x} y={247} w={lane[4].w} label="eux-nav-rinasak" sub="dokument + status" tone="green" />
      <SvgNode x={635} y={344} w={175} label="H001" sub="avbryt hvis ikke ferdig" tone="red" />

      <LineArrow x1={170} y1={276} x2={205} y2={276} markerId={marker} />
      <LineArrow x1={375} y1={276} x2={420} y2={276} markerId={marker} />
      <LineArrow x1={590} y1={276} x2={635} y2={276} markerId={marker} />
      <LineArrow x1={810} y1={276} x2={855} y2={276} markerId={marker} />
      <LineArrow x1={722} y1={305} x2={722} y2={344} markerId={marker} dashed />

      <text x={20} y={142} fontSize={10.5} fill="#5a6470" fontFamily="system-ui, sans-serif">
        Inngående kan opprette oppgave selv om journalposten bare er midlertidig journalført.
      </text>
      <text x={20} y={337} fontSize={10.5} fill="#5a6470" fontFamily="system-ui, sans-serif">
        Utgående forsøker ferdigstilling direkte; vanligvis opprettes ikke ny oppgave her.
      </text>
    </svg>
  );
}

function FollowUpDiagram() {
  const marker = "journal-followup-arrow";
  return (
    <svg
      viewBox="0 0 1120 455"
      role="img"
      aria-label="To separate nattlige etterløp: ferdigstill klokken 01 og feilregistrer klokken 02."
      style={{ width: "100%", height: "auto", display: "block" }}
    >
      <SvgDefs markerId={marker} />

      <text x={20} y={26} fontSize={13} fontWeight={700} fill="#333" fontFamily="system-ui, sans-serif">
        01:00 ferdigstill
      </text>
      <SvgNode x={20} y={50} w={150} label="NAIS-jobb" sub="ferdigstill" tone="grey" />
      <SvgNode x={210} y={50} w={190} label="Input-statuser" sub="FEILET/UKJENT/FEILREG." tone="purple" />
      <SvgNode x={440} y={50} w={170} label="Finn journalpost" sub="SAF + nav-rinasak" tone="orange" />
      <SvgNode x={650} y={50} w={170} label="Oppdater Dokarkiv" sub="sak/bruker/tema" tone="orange" />
      <SvgNode x={860} y={50} w={135} label="eux-journal" sub="ferdigstill" tone="blue" />
      <SvgNode x={1005} y={50} w={95} label="JOURNALFOERT" tone="green" compact />
      <SvgNode x={860} y={148} w={190} label="FEILET_FERDIGSTILL" sub="2. feil → KORRUPT" tone="red" />

      <LineArrow x1={170} y1={79} x2={210} y2={79} markerId={marker} />
      <LineArrow x1={400} y1={79} x2={440} y2={79} markerId={marker} />
      <LineArrow x1={610} y1={79} x2={650} y2={79} markerId={marker} />
      <LineArrow x1={820} y1={79} x2={860} y2={79} markerId={marker} />
      <LineArrow x1={995} y1={79} x2={1005} y2={79} markerId={marker} />
      <LineArrow x1={927} y1={108} x2={927} y2={148} markerId={marker} label="feil" dashed />

      <text x={20} y={245} fontSize={13} fontWeight={700} fill="#333" fontFamily="system-ui, sans-serif">
        02:00 feilregistrer
      </text>
      <SvgNode x={20} y={269} w={150} label="NAIS-jobb" sub="feilregistrer" tone="grey" />
      <SvgNode x={210} y={269} w={190} label="Input-statuser" sub="FEILET eller UKJENT >30d" tone="purple" />
      <SvgNode x={440} y={269} w={170} label="Finn journalpost" sub="SAF" tone="orange" />
      <SvgNode x={650} y={269} w={170} label="Manglende bruker" sub="utgående journalpost" tone="orange" />
      <SvgNode x={860} y={269} w={135} label="eux-journal" sub="settStatusAvbryt" tone="blue" />
      <SvgNode x={1005} y={269} w={95} label="FEILREGISTRERT" tone="green" compact />
      <SvgNode x={860} y={367} w={190} label="FEILET_FEILREG." sub="2. feil → KORRUPT" tone="red" />

      <LineArrow x1={170} y1={298} x2={210} y2={298} markerId={marker} />
      <LineArrow x1={400} y1={298} x2={440} y2={298} markerId={marker} />
      <LineArrow x1={610} y1={298} x2={650} y2={298} markerId={marker} />
      <LineArrow x1={820} y1={298} x2={860} y2={298} markerId={marker} />
      <LineArrow x1={995} y1={298} x2={1005} y2={298} markerId={marker} />
      <LineArrow x1={927} y1={327} x2={927} y2={367} markerId={marker} label="feil" dashed />
    </svg>
  );
}

function SectionEyebrow({ kind }: { kind: "funksjonell" | "teknisk" }) {
  return <div style={eyebrow}>{kind === "funksjonell" ? "For alle" : "For utviklere"}</div>;
}

function CodeBlock({ children }: { children: ReactNode }) {
  return (
    <Box
      borderRadius="8"
      padding="space-12"
      borderColor="neutral-subtle"
      borderWidth="1"
      style={{
        background: "var(--ax-bg-default, #fff)",
        fontFamily: "var(--ax-font-mono, monospace)",
        fontSize: 13,
        overflowX: "auto",
      }}
    >
      {children}
    </Box>
  );
}

const serviceRows: [string, string, string][] = [
  [
    "eux-fagmodul-journalfoering",
    "Hendelsesdrevet auto-journalføring",
    "Leser sedmottatt-v1/sedsendt-v1, henter SED og vedlegg, oppretter journalpost, oppgave og journalstatus.",
  ],
  [
    "eux-journal",
    "Operasjoner på journalposter",
    "Kaller Dokarkiv for ferdigstilling og settStatusAvbryt, og kan feilregistrere journalposter for en RINA-sak.",
  ],
  [
    "eux-journalarkivar",
    "Nattlig etterløp",
    "Ferdigstiller UKJENT/feilede journalposter og feilregistrerer gamle journalposter som ikke kan kobles trygt.",
  ],
  [
    "eux-nav-rinasak",
    "Status og kobling",
    "Lagrer dokumentInfoId, SED-id/-versjon og journalstatus per RINA-sak.",
  ],
];

const bucRows: [string, string, string][] = [
  [
    "H001",
    "Utgående horisontal SED.",
    "Hvis Dokarkiv ikke ferdigstiller journalposten direkte, settes journalposten til avbryt.",
  ],
  [
    "UB_BUC_04",
    "Manuell journalføringsvei.",
    "Det opprettes BEH_SED-oppgave med tekst om at inngående SED ikke ble automatisk journalført.",
  ],
  [
    "H020/H021",
    "Personident kan ligge annerledes i SED-en.",
    "Når navBruker mangler, forsøker tjenesten å hente fnr fra SED-er der pin ligger i entall.",
  ],
  [
    "S005",
    "Sykdoms-SED med egen behandling.",
    "Inngående flow overstyrer tema til GRU, og enhetsvalget peker til 4461.",
  ],
  [
    "H070 og S055",
    "Spesialruting.",
    "H070 kan få PEN-tema og rutes til 4803; S055 rutes til 0393 og tema SYM hvis ikke fagsaken gir noe annet.",
  ],
  [
    "H_BUC_07",
    "Skal bare journalføres av EUX når saken er kjent hos nEESSI.",
    "Hvis det ikke finnes nav-rinasak, tolkes saken som opprettet av andre og SED-en hoppes over.",
  ],
];

const statusRows: [string, string, string][] = [
  ["UKJENT", "eux-fagmodul-journalfoering", "SED er observert og journalføring/ferdigstilling må avklares."],
  ["JOURNALFOERT", "eux-fagmodul-journalfoering / eux-journalarkivar", "Dokarkiv-journalpost er ferdigstilt eller allerede journalført."],
  ["MANUELL_JOURNALFOERING", "eux-fagmodul-journalfoering", "Brukt når NAV Rinasak ikke skal håndtere journalføring automatisk for BUC-en."],
  ["MELOSYS_JOURNALFOERER", "eux-nav-rinasak / annet system", "Signal om at Melosys håndterer journalføringen; fagmodulen hopper over."],
  ["FEILREGISTRERT", "eux-journalarkivar", "Journalpost er satt til avbryt/feilregistrert etter etterløp."],
  ["FEILET_FERDIGSTILL", "eux-journalarkivar", "Ferdigstilling feilet første gang og forsøkes igjen neste kjøring."],
  ["FEILET_FEILREGISTRER", "eux-journalarkivar", "Feilregistrering feilet første gang og forsøkes igjen neste kjøring."],
  ["KORRUPT", "eux-journalarkivar", "Andre forsøk feilet; må undersøkes manuelt."],
];

export default function Page() {
  return (
    <VStack gap="space-32">
      <header>
        <div style={eyebrow}>Prosess</div>
        <Heading size="xlarge" level="1" spacing>
          Journalføring
        </Heading>
        <BodyLong size="medium" style={subtle}>
          Slik blir EESSI-dokumenter synlige og sporbare i NAV: SED-er fra RINA
          journalføres i Dokarkiv, kobles til riktig fagsak og følges opp med
          oppgaver og journalstatus. Hovedløpet kjøres av{" "}
          <DsLink href="https://github.com/navikt/eux-fagmodul-journalfoering" target="_blank" rel="noreferrer">
            eux-fagmodul-journalfoering
          </DsLink>
          , mens <code>eux-journal</code> og <code>eux-journalarkivar</code>{" "}
          rydder opp når journalposter må ferdigstilles eller feilregistreres.
        </BodyLong>
      </header>

      <section id="kortversjon">
        <Box
          borderRadius="12"
          borderColor="neutral-subtle"
          borderWidth="1"
          padding="space-16"
          style={{ background: "var(--ax-bg-accent-soft, #e6f0fa)" }}
        >
          <VStack gap="space-12">
            <Heading size="small" level="2">
              Kortversjon
            </Heading>
            <BodyLong>
              En dokumenthendelse fra RINA blir til en Kafka-melding. Fagmodulen
              henter full SED og vedlegg fra <code>eux-rina-api</code>, avklarer
              person, fagsak, tema og enhet via PDL, SAF og NAV-regler, og
              oppretter journalpost i Dokarkiv med kanal <code>EESSI</code>.
              Inngående SED-er kan i tillegg gi en oppgave til riktig enhet.
            </BodyLong>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              <Tag size="small" variant="info">Dokarkiv skriver</Tag>
              <Tag size="small" variant="neutral">SAF leser</Tag>
              <Tag size="small" variant="success">Oppgave følger opp</Tag>
              <Tag size="small" variant="warning">Journalarkivar reparerer</Tag>
            </div>
          </VStack>
        </Box>
      </section>

      <section id="funksjonelt">
        <VStack gap="space-16">
          <div>
            <SectionEyebrow kind="funksjonell" />
            <Heading size="large" level="2">
              Hva skjer når en SED journalføres?
            </Heading>
          </div>

          <BodyLong>
            Journalføring er broen mellom EESSI-utvekslingen og NAVs arkiv- og
            oppgaveflate. RINA eier selve BUC-en og SED-en, men NAV må ha en
            journalpost i Dokarkiv, en fagsakskobling der det finnes grunnlag,
            og en oppgave når en saksbehandler skal behandle dokumentet videre.
          </BodyLong>

          <Figure>
            <OverviewDiagram />
          </Figure>

          <BodyLong>
            Første forsøk skjer hendelsesdrevet og én SED av gangen. Dersom
            journalposten ikke kan ferdigstilles direkte, ligger statusen igjen i
            <code>eux-nav-rinasak</code>. Nattjobbene i{" "}
            <code>eux-journalarkivar</code> bruker den statusen til å prøve
            ferdigstilling på nytt eller feilregistrere journalposter som ikke
            lenger skal behandles.
          </BodyLong>

          <Box
            style={{ background: "var(--ax-bg-default, #fff)" }}
            borderRadius="8"
            padding="space-12"
            borderColor="neutral-subtle"
            borderWidth="1"
          >
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell scope="col">Tjeneste</Table.HeaderCell>
                  <Table.HeaderCell scope="col">Rolle</Table.HeaderCell>
                  <Table.HeaderCell scope="col">Hva den gjør i journalføring</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {serviceRows.map(([service, role, description]) => (
                  <Table.Row key={service}>
                    <Table.DataCell><code>{service}</code></Table.DataCell>
                    <Table.DataCell>{role}</Table.DataCell>
                    <Table.DataCell>{description}</Table.DataCell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </Box>

          <Heading size="medium" level="3">
            Inngående og utgående SED-er
          </Heading>
          <BodyLong>
            Inngående og utgående dokumenter følger samme grunnmønster, men ikke
            samme brukeropplevelse. Inngående SED-er er typisk noe NAV må
            behandle, og får derfor oppgave. Utgående SED-er er allerede sendt
            fra NAV, og journalføres først og fremst for arkivspor og sakshistorikk.
          </BodyLong>

          <Figure>
            <DirectionDiagram />
          </Figure>

          <Accordion>
            <Accordion.Item>
              <Accordion.Header>Hva betyr «automatisk» her?</Accordion.Header>
              <Accordion.Content>
                <BodyLong spacing>
                  Automatisk betyr at saksbehandleren ikke oppretter
                  journalposten selv. Systemet leser hendelsen, henter dokumentet,
                  lager Dokarkiv-requesten og oppretter eventuell oppgave. Det
                  betyr ikke at alle SED-er blir ferdig behandlet uten mennesker:
                  en <code>JFR</code>, <code>FDR</code> eller{" "}
                  <code>BEH_SED</code>-oppgave kan fortsatt kreve manuell
                  vurdering.
                </BodyLong>
                <BodyLong>
                  Journalføringen lukker heller ikke BUC-en i RINA og sletter
                  ikke RINA-saker. Det håndteres av egne prosesser for
                  automatisk avslutning og sletting.
                </BodyLong>
              </Accordion.Content>
            </Accordion.Item>

            <Accordion.Item>
              <Accordion.Header>Hvordan velges fagsak, tema og enhet?</Accordion.Header>
              <Accordion.Content>
                <BodyLong spacing>
                  Først prøver tjenesten å bruke eksisterende kobling i{" "}
                  <code>eux-nav-rinasak</code>. Hvis den mangler, kan den bruke
                  nyeste journalpost via SAF eller finne fagsaker for personen.
                  Tema styres av sektor og SED-type, med egne regler for blant
                  annet <code>UB</code>, <code>FB</code>, <code>H</code>,{" "}
                  <code>S</code> og spesielle SED-er som <code>H070</code>,{" "}
                  <code>S055</code> og <code>S005</code>.
                </BodyLong>
                <BodyLong>
                  Enhet velges deretter. Beskyttet adresse rutes til{" "}
                  <code>2103</code>, dagpenger til <code>4470</code>,{" "}
                  <code>H070</code> til <code>4803</code>, <code>S055</code>{" "}
                  til <code>0393</code>, <code>S005</code> til{" "}
                  <code>4461</code>, og sykdom/horisontal bruker enten overstyrt
                  enhet eller <code>4303</code>. Resten går via PDL geografisk
                  tilknytning og NORG arbeidsfordeling.
                </BodyLong>
              </Accordion.Content>
            </Accordion.Item>

            <Accordion.Item>
              <Accordion.Header>Når lager vi oppgaver?</Accordion.Header>
              <Accordion.Content>
                <BodyLong spacing>
                  Inngående SED-er kan gi tre typer oppgaver:{" "}
                  <code>BEH_SED</code> når dokumentet er ferdigstilt og skal
                  behandles, <code>JFR</code> når journalposten finnes men ikke
                  er ferdigstilt, og <code>FDR</code> for midlertidig journalført
                  dokument til <code>4303</code> når bruker er ukjent.{" "}
                  <code>X001</code> lager ikke oppgave.
                </BodyLong>
                <BodyLong>
                  <code>UB_BUC_04</code> er en egen manuell vei: det opprettes
                  <code>BEH_SED</code>-oppgave med forklaring om at inngående
                  SED ikke ble automatisk journalført.
                </BodyLong>
              </Accordion.Content>
            </Accordion.Item>
          </Accordion>

          <Heading size="medium" level="3">
            Eksempler på flyter og BUC-er
          </Heading>
          <Box
            style={{ background: "var(--ax-bg-default, #fff)" }}
            borderRadius="8"
            padding="space-12"
            borderColor="neutral-subtle"
            borderWidth="1"
          >
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell scope="col">Eksempel</Table.HeaderCell>
                  <Table.HeaderCell scope="col">Hva er spesielt?</Table.HeaderCell>
                  <Table.HeaderCell scope="col">Konsekvens i journalføringen</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {bucRows.map(([example, special, consequence]) => (
                  <Table.Row key={example}>
                    <Table.DataCell><code>{example}</code></Table.DataCell>
                    <Table.DataCell>{special}</Table.DataCell>
                    <Table.DataCell>{consequence}</Table.DataCell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </Box>
          <BodyShort size="small" style={subtle}>
            Dette er eksempler fra kildekoden, ikke en komplett regelbok for
            alle BUC-er. Sjekk <code>TemaMapping</code>,{" "}
            <code>BestemEnhetService</code> og de to fasadene før du endrer
            journalføringslogikk.
          </BodyShort>
        </VStack>
      </section>

      <section id="teknisk">
        <VStack gap="space-16">
          <div>
            <SectionEyebrow kind="teknisk" />
            <Heading size="large" level="2">
              Teknisk beskrivelse
            </Heading>
          </div>

          <BodyLong>
            <code>eux-fagmodul-journalfoering</code> er en stateless
            Java/Spring Boot-konsument. Den har ingen egen database, men skriver
            status og dokumentkoblinger til <code>eux-nav-rinasak</code>.
            Kafka-konfigurasjonen bruker consumer group{" "}
            <code>eux-fagmodul-journalfoering</code>, én melding per poll og
            manuell commit per record.
          </BodyLong>

          <Heading size="medium" level="3">
            SAF og Dokarkiv
          </Heading>
          <BodyLong>
            SAF er lesesiden: den brukes til å finne fagsaker, hente{" "}
            <code>dokumentInfoId</code> fra en journalpost og slå opp
            <code>tilknyttedeJournalposter</code> for samme dokument. Dokarkiv
            er skrivesiden: der opprettes og oppdateres journalposter.
          </BodyLong>

          <Box
            style={{ background: "var(--ax-bg-default, #fff)" }}
            borderRadius="8"
            padding="space-12"
            borderColor="neutral-subtle"
            borderWidth="1"
          >
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell scope="col">System</Table.HeaderCell>
                  <Table.HeaderCell scope="col">Kall</Table.HeaderCell>
                  <Table.HeaderCell scope="col">Brukes til</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {[
                  ["SAF", "GraphQL saker(brukerId)", "Finne relevante fagsaker for person."],
                  ["SAF", "GraphQL journalpost(journalpostId)", "Finne dokumentInfoId på en kjent journalpost."],
                  ["SAF", "GraphQL tilknyttedeJournalposter(dokumentInfoId, GJENBRUK)", "Finne nyeste/tilknyttet journalpost for et dokument."],
                  ["Dokarkiv", "POST /rest/journalpostapi/v1/journalpost", "Opprette journalpost med kanal EESSI."],
                  ["Dokarkiv", "PUT /rest/journalpostapi/v1/journalpost/{id}", "Oppdatere sak, bruker, tema eller avsender/mottaker."],
                  ["Dokarkiv", "PATCH /rest/journalpostapi/v1/journalpost/{id}/ferdigstill", "Ferdigstille journalpost med journalførende enhet."],
                  ["Dokarkiv", "PATCH /rest/journalpostapi/v1/journalpost/{id}/feilregistrer/settStatusAvbryt", "Sette journalpost til avbryt ved feilregistrering."],
                ].map(([system, call, purpose]) => (
                  <Table.Row key={`${system}-${call}`}>
                    <Table.DataCell>{system}</Table.DataCell>
                    <Table.DataCell><code>{call}</code></Table.DataCell>
                    <Table.DataCell>{purpose}</Table.DataCell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </Box>

          <ReadMore header="Detaljer om Dokarkiv-requesten" size="small">
            <BodyLong spacing>
              Opprettelsen bruker <code>kanal=EESSI</code>. Når tjenesten ber
              Dokarkiv forsøke ferdigstilling, settes{" "}
              <code>journalfoerendeEnhet=9999</code>. Første dokument i listen
              er selve SED-en som PDF/A med variantformat <code>ARKIV</code>;
              vedlegg konverteres til PDF når mulig. Hvis et vedlegg ikke kan
              konverteres, legges det inn en egen oversikt over feilede
              konverteringer.
            </BodyLong>
            <BodyLong>
              <code>eksternReferanseId</code> er SED-id-en fra hendelsen.
              Dokarkiv-konflikt på samme referanse behandles som at
              journalposten allerede finnes, slik at samme SED ikke blindt
              opprettes på nytt.
            </BodyLong>
          </ReadMore>

          <Heading size="medium" level="3">
            Etterløp: ferdigstilling og feilregistrering
          </Heading>
          <BodyLong>
            Etterløpet er delt i to jobber fordi de har ulike innganger og ulik
            risiko. Ferdigstill-jobben prøver å gjøre en eksisterende journalpost
            komplett ved å kopiere sak, bruker og tema fra en allerede
            journalført journalpost på samme RINA-sak. Feilregistrer-jobben
            rydder gamle eller feilede journalposter der det ikke finnes trygg
            bruker-kobling.
          </BodyLong>

          <Figure>
            <FollowUpDiagram />
          </Figure>

          <Box
            style={{ background: "var(--ax-bg-default, #fff)" }}
            borderRadius="8"
            padding="space-12"
            borderColor="neutral-subtle"
            borderWidth="1"
          >
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell scope="col">Prosess</Table.HeaderCell>
                  <Table.HeaderCell scope="col">Prod</Table.HeaderCell>
                  <Table.HeaderCell scope="col">Hva den gjør</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {[
                  ["ferdigstill", "01:00", "Kaller eux-journalarkivar, som forsøker FEILET_FERDIGSTILL, UKJENT og FEILREGISTRERT."],
                  ["feilregistrer", "02:00", "Kaller eux-journalarkivar, som forsøker FEILET_FEILREGISTRER og UKJENT eldre enn 30 dager."],
                ].map(([process, schedule, description]) => (
                  <Table.Row key={process}>
                    <Table.DataCell><code>{process}</code></Table.DataCell>
                    <Table.DataCell><code>{schedule}</code></Table.DataCell>
                    <Table.DataCell>{description}</Table.DataCell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </Box>
          <BodyShort size="small" style={subtle}>
            Tidspunktene er hentet fra{" "}
            <code>eux-journalarkivar-naisjob/.nais/&lt;prosess&gt;/prod.yaml</code>.
          </BodyShort>

          <Heading size="medium" level="3">
            API-er og statuser
          </Heading>
          <BodyLong>
            Statusen ligger i <code>eux-nav-rinasak</code>, mens selve
            journalposten ligger i Dokarkiv. Det er derfor viktig å vite både
            hvem som skriver statusen og hvilket system som eier sannheten.
          </BodyLong>
          <CodeBlock>
            PUT&nbsp;&nbsp;/api/v1/sed/journalstatuser
            <br />
            POST /api/v1/sed/journalstatuser/finn
            <br />
            POST /api/v1/arkivarprosess/&#123;arkivarprosess&#125;/execute
            <br />
            POST /api/v1/rinasaker/&#123;rinasakId&#125;/journalposter/feilregistrer
            <br />
            PATCH /api/v1/journalposter/&#123;journalpostId&#125;/ferdigstill
          </CodeBlock>

          <Box
            style={{ background: "var(--ax-bg-default, #fff)" }}
            borderRadius="8"
            padding="space-12"
            borderColor="neutral-subtle"
            borderWidth="1"
          >
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell scope="col">Status</Table.HeaderCell>
                  <Table.HeaderCell scope="col">Skrives typisk av</Table.HeaderCell>
                  <Table.HeaderCell scope="col">Betydning</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {statusRows.map(([status, writer, meaning]) => (
                  <Table.Row key={status}>
                    <Table.DataCell><code>{status}</code></Table.DataCell>
                    <Table.DataCell>{writer}</Table.DataCell>
                    <Table.DataCell>{meaning}</Table.DataCell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </Box>

          <Accordion>
            <Accordion.Item>
              <Accordion.Header>Feilhåndtering og retry</Accordion.Header>
              <Accordion.Content>
                <BodyLong spacing>
                  Dokarkiv-opprettelse retries opptil åtte ganger for tekniske
                  feil. Oppdatering, ferdigstilling og <code>settStatusAvbryt</code>
                  retries opptil fire ganger i fagmodulen. Kafka-konsumenten
                  poster Slack-varsel og kaster feilen videre når behandling av
                  en SED feiler.
                </BodyLong>
                <BodyLong>
                  I etterløpet gir journalarkivar ett nytt forsøk. Feiler en
                  ferdigstilling på nytt, settes status til <code>KORRUPT</code>.
                  Det samme gjelder feilregistrering etter andre feil. Slike
                  dokumenter må undersøkes manuelt.
                </BodyLong>
              </Accordion.Content>
            </Accordion.Item>

            <Accordion.Item>
              <Accordion.Header>Forskjellen på eux-journal og eux-journalarkivar</Accordion.Header>
              <Accordion.Content>
                <BodyLong spacing>
                  <code>eux-journal</code> er operasjonsfasaden: den har
                  beskyttede endepunkter som ferdigstiller journalpost eller
                  setter status avbryt i Dokarkiv. Ved feilregistrering av en
                  RINA-sak flyttes innkommende journalpost-oppgaver til{" "}
                  <code>2950</code>, mens utgående journalposter settes til
                  avbryt.
                </BodyLong>
                <BodyLong>
                  <code>eux-journalarkivar</code> er orkestratoren som kjøres
                  av NAIS-jobber. Den finner kandidater i{" "}
                  <code>eux-nav-rinasak</code>, bruker SAF til å finne
                  journalposter, oppdaterer Dokarkiv ved behov, og kaller
                  <code>eux-journal</code> for selve ferdigstillingen eller
                  feilregistreringen.
                </BodyLong>
              </Accordion.Content>
            </Accordion.Item>

            <Accordion.Item>
              <Accordion.Header>Når hopper fagmodulen over en SED?</Accordion.Header>
              <Accordion.Content>
                <BodyLong spacing>
                  Fagmodulen behandler ikke alle RINA-hendelser. Først filtreres
                  sektorer/BUC-er i Kafka-containeren: sektorene{" "}
                  <code>FB</code>, <code>UB</code>, <code>H</code>,{" "}
                  <code>AD</code>, <code>R</code>, <code>AW</code>,{" "}
                  <code>M</code> og <code>S</code> støttes, men{" "}
                  <code>R_BUC_02</code> og <code>M_BUC_03a</code> filtreres ut.
                </BodyLong>
                <BodyLong>
                  I tillegg hoppes saken over hvis journalstatus sier at
                  Melosys journalfører, eller hvis det er en{" "}
                  <code>H_BUC_07</code> som ikke er opprettet av nEESSI.
                </BodyLong>
              </Accordion.Content>
            </Accordion.Item>
          </Accordion>

          <GuidePanel poster>
            <Heading spacing size="small" level="3">
              Vil du grave dypere?
            </Heading>
            <BodyLong>
              Start i{" "}
              <DsLink href="https://github.com/navikt/eux-fagmodul-journalfoering" target="_blank" rel="noreferrer">
                navikt/eux-fagmodul-journalfoering
              </DsLink>{" "}
              for hovedflyten. Se{" "}
              <DsLink href="https://github.com/navikt/eux-journal" target="_blank" rel="noreferrer">
                navikt/eux-journal
              </DsLink>{" "}
              for operasjoner mot Dokarkiv og{" "}
              <DsLink href="https://github.com/navikt/eux-journalarkivar" target="_blank" rel="noreferrer">
                navikt/eux-journalarkivar
              </DsLink>{" "}
              sammen med{" "}
              <DsLink href="https://github.com/navikt/eux-journalarkivar-naisjob" target="_blank" rel="noreferrer">
                navikt/eux-journalarkivar-naisjob
              </DsLink>{" "}
              for nattlige ferdigstillings- og feilregistreringsløp.
            </BodyLong>
          </GuidePanel>
        </VStack>
      </section>
    </VStack>
  );
}
