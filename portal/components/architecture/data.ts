/**
 * Verified architecture model for the EUX platform, used by the
 * /architecture page. Every node and edge is checked against the source
 * repositories (NAIS access policies, Kafka listeners and HTTP clients).
 * Keep in sync with README.md.
 */

import { JOBS as AVSLUTT_JOBS } from "@/components/avslutning/data";
import { JOBS as ARKIVAR_JOBS } from "@/components/journalfoering/data";
import { klokke } from "@/components/process/time";
import { GRENSE_DAGER, JOBS as SLETT_JOBS } from "@/components/sletting/data";
import { capitalize, joinOg, tallord } from "@/lib/text";
import type { Tone } from "@/lib/tones";

export type Zone =
  | "bruker"
  | "frontend"
  | "orkestrering"
  | "domene"
  | "rina-integrasjon"
  | "eu"
  | "hendelser"
  | "kafka"
  | "bakgrunn"
  | "jobber"
  | "nav"
  | "andre";

export type NodeKind = "person" | "app" | "job" | "topic" | "external" | "team";

export type Lang = "Java" | "Kotlin" | "TypeScript";

/** Build and library patterns, checked against each repo's pom.xml and sources. Shown in the pattern matrix. */
export interface Patterns {
  /** OpenAPI code generation and a multi-module Maven build. */
  openapi?: boolean;
  /** In-memory caching with Caffeine. */
  caffeine?: boolean;
  /** How failed calls are retried. */
  retry?: "@Retryable" | "Spring Retry" | "Resilience4j";
  /** MDC-based tracing with eux-logging. */
  logging?: boolean;
  /** Maven parent, when it is not eux-parent-pom. */
  parent?: "spring-boot-starter-parent";
}

export interface ArchNode {
  id: string;
  /** Full name, e.g. eux-rina-api */
  name: string;
  /** Label in the map (without the eux- prefix) */
  short: string;
  zone: Zone;
  kind: NodeKind;
  lang?: Lang;
  db?: boolean;
  patterns?: Patterns;
  /** Prod cron of a Spring @Scheduled job built into the app (Spring's six-field form, from .nais/prod.yaml). A fact must name its time. */
  scheduled?: string;
  repo?: string;
  summary: string;
  facts?: string[];
  link?: { href: string; label: string };
}

export type EdgeKind = "rest" | "event" | "cron";

export interface ArchEdge {
  from: string;
  to: string;
  kind: EdgeKind;
}

const app = (
  id: string,
  zone: Zone,
  lang: Lang,
  summary: string,
  extra: Partial<ArchNode> = {},
): ArchNode => ({
  id,
  name: id,
  short: id.replace(/^eux-/, ""),
  zone,
  kind: "app",
  lang,
  repo: id,
  summary,
  ...extra,
});

const ext = (id: string, name: string, summary: string): ArchNode => ({
  id,
  name,
  short: name,
  zone: "nav",
  kind: "external",
  summary,
});

/** "Sju cron-jobber", counted from the job list in the process data. */
const cronJobs = (n: number) => `${capitalize(tallord(n))} cron-jobber`;

const topic = (name: string, summary: string, facts?: string[]): ArchNode => ({
  id: name,
  name,
  short: name.replace(/^eux-/, ""),
  zone: "kafka",
  kind: "topic",
  summary,
  facts,
});

export const NODES: ArchNode[] = [
  {
    id: "saksbehandler",
    name: "Saksbehandler",
    short: "Saksbehandler",
    zone: "bruker",
    kind: "person",
    summary:
      "Saksbehandlere i NAV som utveksler SED-er med andre land gjennom nEESSI i nettleseren.",
  },

  // Frontend og orkestrering
  app(
    "eux-web-app",
    "frontend",
    "TypeScript",
    "nEESSI – saksbehandlernes brukergrensesnitt. React med en Node.js-BFF (Express) som håndterer innlogging og videresender API-kall til eux-neessi.",
    {
      short: "eux-web-app",
      facts: [
        "Innlogging via Wonderwall-sidecar (Azure AD).",
        "BFF-en veksler token (on-behalf-of) og proxyer /api og /v2–/v5 til eux-neessi, med 60 sekunders timeout.",
        "Helse og metrikker på /internal/isAlive, /internal/isReady og /internal/metrics.",
      ],
    },
  ),
  app(
    "eux-neessi",
    "orkestrering",
    "Java",
    "Backend for nEESSI. Orkestrerer kall mot EUX-tjenestene og en rekke NAV-systemer.",
    {
      short: "eux-neessi",
      patterns: { caffeine: true, retry: "Resilience4j" },
      facts: [
        "Alle RINA-operasjoner går via eux-rina-api.",
        "Kaller ikke eux-oppgave eller eux-rina-case-search direkte.",
        "Mapper mange Azure AD-grupper (én per fagområde) til tilganger.",
        "Resilience4j for retry, Caffeine for caching.",
      ],
    },
  ),

  // Domenetjenester (Kotlin + PostgreSQL)
  app(
    "eux-nav-rinasak",
    "domene",
    "Kotlin",
    "Kobler RINA-saker til fagsaker i NAV og holder journalstatus per SED.",
    {
      db: true,
      patterns: { openapi: true, logging: true },
      facts: [
        "Kalles av eux-neessi, flere bakgrunnstjenester, melosys-eessi og eux-portal-core.",
        "Journalstatusen her avstemmes nattlig mot Dokarkiv av eux-journalarkivar.",
      ],
      link: { href: "/nav-rinasak/sed-er", label: "SED-er i nEESSI" },
    },
  ),
  app(
    "eux-journal",
    "domene",
    "Kotlin",
    "Ferdigstiller og feilregistrerer journalposter i Dokarkiv.",
    {
      db: true,
      patterns: { openapi: true, logging: true },
      facts: ["Slår opp saker i eux-nav-rinasak og journalposter i SAF, og bruker eux-oppgave ved behov."],
    },
  ),
  app(
    "eux-oppgave",
    "domene",
    "Kotlin",
    "Oppretter, oppdaterer og ferdigstiller oppgaver i NAV Oppgave på vegne av EUX-tjenestene.",
    {
      db: true,
      patterns: { openapi: true, retry: "Spring Retry", logging: true },
      facts: [
        "Eneste EUX-tjeneste som snakker med NAV Oppgave.",
        "Brukes av eux-journal, eux-fagmodul-journalfoering, eux-journalarkivar og eux-barnetrygd – ikke av eux-neessi.",
        "Bruker Spring Retry.",
      ],
    },
  ),
  app(
    "eux-saksbehandler",
    "domene",
    "Kotlin",
    "Lagrer innstillinger per saksbehandler, som foretrukket enhet.",
    { db: true, patterns: { logging: true }, facts: ["Kalles kun av eux-neessi."] },
  ),
  app(
    "eux-relaterte-rinasaker",
    "domene",
    "Kotlin",
    "Holder oversikt over hvilke RINA-saker som henger sammen.",
    { db: true, patterns: { openapi: true, logging: true }, facts: ["Kalles kun av eux-neessi."] },
  ),

  // RINA-integrasjon
  app(
    "eux-rina-api",
    "rina-integrasjon",
    "Java",
    "Mellomvaren mot RINA. All lesing og skriving av saker, SED-er og vedlegg går hit – også fra andre team.",
    {
      patterns: { caffeine: true, retry: "@Retryable" },
      facts: [
        "Transformerer SED-er mellom NAV-format og EU-format (EessiAcl).",
        "Logger inn i CPI med shared-secret JWT → CAS-billett → JSESSIONID, bufret i 29 minutter.",
        "Lager de fleste SED-PDF-er selv (iText); U020 og U029 lages av eux-pdf.",
        "Kan republisere dokumenthendelser via eux-all-rina-events.",
        "Brukes også av eessi-pensjon og melosys-eessi.",
      ],
    },
  ),
  app(
    "eux-rina-terminator-api",
    "rina-integrasjon",
    "Kotlin",
    "Utfører oppryddingshandlinger i RINA: avslutte saker lokalt eller globalt, arkivere, slette saker og slette dokumentutkast.",
    {
      patterns: { openapi: true, caffeine: true, logging: true },
      facts: [
        "Kalles av eux-avslutt-rinasaker og eux-slett-usendte-rinasaker.",
        "Logger inn i RINA med systembruker og CAS-billett.",
        "Caffeine for caching.",
      ],
    },
  ),
  app(
    "eux-rina-case-search",
    "rina-integrasjon",
    "Java",
    "Søkeindeks over RINA-saker, bygd fra hendelser. eux-rina-api bruker den til å finne saker for en person.",
    {
      db: true,
      patterns: { retry: "@Retryable", parent: "spring-boot-starter-parent" },
      facts: [
        "Konsumerer sak-, dokument- og varslingshendelser. Har DLQ for dokumenthendelser.",
        "Logger inn i RINA med systembruker og CAS-billett.",
        "Har større connection pool enn de andre (50 / 2).",
      ],
    },
  ),
  app(
    "eux-pdf",
    "rina-integrasjon",
    "Kotlin",
    "Lager PDF for SED-typene U020 og U029 med PDFBox.",
    {
      patterns: { logging: true },
      facts: [
        "Kalles kun av eux-rina-api.",
        "Henter data fra RINA CPI med egen systembruker-innlogging.",
      ],
    },
  ),

  // Hendelsesinfrastruktur
  app(
    "eux-all-rina-events",
    "hendelser",
    "Java",
    "Tar imot hendelser fra RINA (NIE) over HTTP og publiserer dem på tre Kafka-topics.",
    {
      patterns: { parent: "spring-boot-starter-parent" },
      facts: [
        "Endepunkt: POST /events/v1/{eventType}.",
        "Bruker spring-boot-starter-parent, ikke eux-parent-pom.",
      ],
    },
  ),
  app(
    "eux-legacy-rina-events",
    "hendelser",
    "Java",
    "Gjør dokumenthendelser om til det eldre formatet: beriker dem fra RINA CPI og publiserer sedmottatt-v1 og sedsendt-v1.",
    {
      patterns: { retry: "@Retryable", parent: "spring-boot-starter-parent" },
      facts: [
        "Logger inn i RINA med systembruker og CAS-billett.",
        "Bruker spring-boot-starter-parent, ikke eux-parent-pom.",
      ],
      link: { href: "/kafka/sed-hendelser", label: "SED-hendelser" },
    },
  ),

  // Bakgrunnstjenester
  app(
    "eux-fagmodul-journalfoering",
    "bakgrunn",
    "Java",
    "Journalfører mottatte og sendte SED-er automatisk og oppretter oppgaver ved behov.",
    {
      patterns: { caffeine: true, retry: "@Retryable" },
      facts: [
        "Konsumerer sedmottatt-v1 og sedsendt-v1, én melding om gangen.",
        "eux-neessi kaller den for å journalføre alle SED-er i en sak på en fagsak.",
        "Kaller NORG2 uten autentisering.",
      ],
      link: { href: "/prosesser/journalfoering", label: "Journalføring" },
    },
  ),
  app(
    "eux-journalarkivar",
    "bakgrunn",
    "Kotlin",
    "Nattlig avstemming av journalstatus: ferdigstiller det som kan løses, og feilregistrerer det som fortsatt er uavklart etter 30 dager.",
    {
      patterns: { openapi: true, retry: "@Retryable", logging: true },
      facts: [
        "Ferdigstill: status UKJENT, FEILET_FERDIGSTILL eller FEILREGISTRERT.",
        "Feilregistrer: FEILET_FEILREGISTRER, og UKJENT eldre enn 30 dager.",
        "Startes av eux-journalarkivar-naisjob.",
      ],
    },
  ),
  app(
    "eux-avslutt-rinasaker",
    "bakgrunn",
    "Kotlin",
    "Avslutter og arkiverer inaktive RINA-saker automatisk.",
    {
      db: true,
      patterns: { logging: true },
      facts: [
        "Følger sakene via sak- og dokumenthendelser.",
        `Startes av ${tallord(AVSLUTT_JOBS.length)} jobber i eux-avslutt-rinasaker-naisjob.`,
        "Utfører handlingene via eux-rina-terminator-api.",
      ],
      link: { href: "/prosesser/automatisk-avslutning", label: "Automatisk avslutning" },
    },
  ),
  app(
    "eux-slett-usendte-rinasaker",
    "bakgrunn",
    "Kotlin",
    `Sletter RINA-saker der ingen SED er sendt eller mottatt etter ${GRENSE_DAGER} dager.`,
    {
      db: true,
      patterns: { logging: true },
      facts: [
        "Følger nye saker via sak- og dokumenthendelser.",
        "Spør eux-rina-terminator-api om saken kan slettes før den slettes.",
        "Sender en månedlig rapport til Slack.",
      ],
      link: { href: "/prosesser/automatisk-sletting", label: "Automatisk sletting" },
    },
  ),
  app(
    "eux-adresse-oppdatering",
    "bakgrunn",
    "Kotlin",
    "Leser dokumenthendelser og sender adresser fra mottatte SED-er til PDL via PDL-Mottak.",
    {
      patterns: { retry: "@Retryable", logging: true },
      facts: [
        "Henter SED-en og RINA-saken fra eux-rina-api.",
        "Sjekker personen og eksisterende adresser i PDL før den sender.",
        "@RetryableTopic: 3 forsøk med 15 s mellomrom, deretter DLT.",
      ],
      link: { href: "/prosesser/adresseoppdatering", label: "Adresseoppdatering" },
    },
  ),
  app(
    "eux-person-oppdatering",
    "bakgrunn",
    "Java",
    "Leser sedmottatt-v1 og sender utenlandske identifikasjonsnumre til PDL via PDL-Mottak.",
    { db: true, patterns: { retry: "@Retryable" }, facts: ["Poller én melding om gangen."] },
  ),
  app(
    "eux-barnetrygd",
    "bakgrunn",
    "Java",
    "Årlig fornyelse av barnetrygdsaker i EESSI.",
    {
      patterns: { retry: "@Retryable" },
      scheduled: "0 0 22 * * ?",
      facts: [
        "Startes av en innebygd Spring @Scheduled-cron (kl. 22.00 i prod), ikke av en NAIS-jobb.",
      ],
    },
  ),

  // NAIS-jobber
  {
    id: "eux-avslutt-rinasaker-naisjob",
    name: "eux-avslutt-rinasaker-naisjob",
    short: "avslutt-rinasaker",
    zone: "jobber",
    kind: "job",
    lang: "Kotlin",
    repo: "eux-avslutt-rinasaker-naisjob",
    summary: `${cronJobs(AVSLUTT_JOBS.length)} som driver avslutningsløpet i eux-avslutt-rinasaker, fra «sett uvirksom» til «arkiver».`,
    link: { href: "/prosesser/automatisk-avslutning", label: "Automatisk avslutning" },
  },
  {
    id: "eux-journalarkivar-naisjob",
    name: "eux-journalarkivar-naisjob",
    short: "journalarkivar",
    zone: "jobber",
    kind: "job",
    lang: "Kotlin",
    patterns: { logging: true },
    repo: "eux-journalarkivar-naisjob",
    summary: `${cronJobs(ARKIVAR_JOBS.length)} i eux-journalarkivar: ${joinOg(
      ARKIVAR_JOBS.map((j) => (j.sched.prod.h === null ? j.id : `${j.id} (${klokke(j.sched.prod.h)})`)),
    )}.`,
  },
  {
    id: "eux-slett-usendte-rinasaker-naisjob",
    name: "eux-slett-usendte-rinasaker-naisjob",
    short: "slett-usendte-rinasaker",
    zone: "jobber",
    kind: "job",
    lang: "Kotlin",
    patterns: { logging: true },
    repo: "eux-slett-usendte-rinasaker-naisjob",
    summary: `${cronJobs(SLETT_JOBS.length)} i eux-slett-usendte-rinasaker: ${joinOg(SLETT_JOBS.map((j) => j.id))}.`,
    link: { href: "/prosesser/automatisk-sletting", label: "Automatisk sletting" },
  },

  // Kafka-topics
  topic("eux-rina-case-events-v1", "Sakshendelser fra RINA."),
  topic("eux-rina-document-events-v1", "Dokumenthendelser fra RINA, f.eks. at en SED er sendt eller mottatt.", [
    "Har egne retry-, DLT- og DLQ-topics for konsumentene som trenger det.",
  ]),
  topic("eux-rina-notification-events-v1", "Varslingshendelser fra RINA."),
  topic("sedmottatt-v1", "Mottatte SED-er i det eldre formatet. En offentlig kontrakt som også andre team leser.", [
    "eux-portal-core leser dev-utgaven for å vise hendelser live i portalen.",
  ]),
  topic("sedsendt-v1", "Sendte SED-er i det eldre formatet. En offentlig kontrakt som også andre team leser.", [
    "eux-portal-core leser dev-utgaven for å vise hendelser live i portalen.",
  ]),

  // EU
  {
    id: "rina",
    name: "RINA",
    short: "RINA",
    zone: "eu",
    kind: "external",
    summary:
      "Europakommisjonens referanseimplementasjon for saksbehandling i EESSI. NAV snakker med RINA via CPI (REST) og får hendelser via NIE.",
    facts: [
      "eux-rina-api: shared-secret JWT → CAS-billett → JSESSIONID.",
      "eux-rina-terminator-api, eux-rina-case-search, eux-legacy-rina-events og eux-pdf: systembruker → CAS-billett.",
    ],
  },

  // NAV-systemer
  ext("pdl", "PDL", "Persondataløsningen – persondata via GraphQL."),
  ext("pdl-mottak", "PDL-Mottak", "Tar imot endringer som skal inn i PDL."),
  ext("saf", "SAF", "Søk i journalposter og dokumenter (GraphQL)."),
  ext("dokarkiv", "Dokarkiv", "Oppretter og oppdaterer journalposter."),
  ext("nav-oppgave", "NAV Oppgave", "NAVs oppgavestyring."),
  ext("norg2", "NORG2", "NAVs organisasjonsenheter. Kalles uten autentisering."),
  ext("sak", "Sak", "Arkivsaker."),
  ext("aareg", "Aa-registeret", "Arbeidsforhold."),
  ext("inntekt", "Inntekt", "Inntektsopplysninger."),
  ext("dokdist", "Dokdistfordeling", "Distribusjon av dokumenter."),
  ext("nom", "NOM", "NAVs organisasjonsdata."),
  ext("graph", "Microsoft Graph", "Brukerinformasjon fra Entra ID."),
  ext("slack", "Slack", "Varsler til teamet."),

  // Andre team
  {
    id: "eessi-pensjon",
    name: "eessi-pensjon",
    short: "eessi-pensjon",
    zone: "andre",
    kind: "team",
    summary:
      "Pensjonsområdets EESSI-applikasjoner. Leser sedmottatt-v1 og sedsendt-v1 og kaller eux-rina-api direkte.",
  },
  {
    id: "melosys-eessi",
    name: "melosys-eessi",
    short: "melosys-eessi",
    zone: "andre",
    kind: "team",
    summary:
      "Melosys sin EESSI-integrasjon. Leser sedmottatt-v1 og sedsendt-v1 og kaller eux-rina-api og eux-nav-rinasak.",
  },
];

const rest = (from: string, ...to: string[]): ArchEdge[] =>
  to.map((t) => ({ from, to: t, kind: "rest" as const }));
const event = (from: string, ...to: string[]): ArchEdge[] =>
  to.map((t) => ({ from, to: t, kind: "event" as const }));
const cron = (from: string, to: string): ArchEdge => ({ from, to, kind: "cron" });

export const EDGES: ArchEdge[] = [
  ...rest("saksbehandler", "eux-web-app"),
  ...rest("eux-web-app", "eux-neessi"),
  ...rest(
    "eux-neessi",
    "eux-rina-api",
    "eux-nav-rinasak",
    "eux-journal",
    "eux-fagmodul-journalfoering",
    "eux-relaterte-rinasaker",
    "eux-saksbehandler",
    "pdl",
    "saf",
    "dokarkiv",
    "sak",
    "aareg",
    "inntekt",
    "norg2",
    "dokdist",
    "nom",
    "graph",
    "slack",
  ),
  ...rest("eux-rina-api", "rina", "eux-rina-case-search", "eux-pdf", "pdl", "eux-all-rina-events"),
  ...rest("eux-journal", "saf", "dokarkiv", "eux-oppgave", "eux-nav-rinasak"),
  ...rest("eux-oppgave", "nav-oppgave"),
  ...rest("eux-rina-terminator-api", "rina"),
  ...rest("eux-rina-case-search", "rina"),
  ...rest("eux-pdf", "rina"),
  ...rest("eux-legacy-rina-events", "rina"),
  ...rest(
    "eux-fagmodul-journalfoering",
    "eux-oppgave",
    "eux-rina-api",
    "eux-nav-rinasak",
    "dokarkiv",
    "saf",
    "pdl",
    "norg2",
    "slack",
  ),
  ...rest(
    "eux-journalarkivar",
    "eux-nav-rinasak",
    "eux-journal",
    "eux-oppgave",
    "eux-rina-api",
    "saf",
    "dokarkiv",
  ),
  ...rest("eux-avslutt-rinasaker", "eux-rina-terminator-api", "slack"),
  ...rest("eux-slett-usendte-rinasaker", "eux-rina-terminator-api", "slack"),
  ...rest("eux-adresse-oppdatering", "eux-rina-api", "pdl", "pdl-mottak"),
  ...rest("eux-person-oppdatering", "eux-rina-api", "pdl", "pdl-mottak"),
  ...rest("eux-barnetrygd", "eux-oppgave", "eux-rina-api", "eux-nav-rinasak", "pdl", "saf"),
  ...rest("eessi-pensjon", "eux-rina-api"),
  ...rest("melosys-eessi", "eux-rina-api", "eux-nav-rinasak"),

  ...event("rina", "eux-all-rina-events"),
  ...event(
    "eux-all-rina-events",
    "eux-rina-case-events-v1",
    "eux-rina-document-events-v1",
    "eux-rina-notification-events-v1",
  ),
  ...event("eux-rina-case-events-v1", "eux-avslutt-rinasaker", "eux-slett-usendte-rinasaker", "eux-rina-case-search"),
  ...event(
    "eux-rina-document-events-v1",
    "eux-legacy-rina-events",
    "eux-adresse-oppdatering",
    "eux-avslutt-rinasaker",
    "eux-slett-usendte-rinasaker",
    "eux-rina-case-search",
  ),
  ...event("eux-rina-notification-events-v1", "eux-rina-case-search"),
  ...event("eux-legacy-rina-events", "sedmottatt-v1", "sedsendt-v1"),
  ...event("sedmottatt-v1", "eux-fagmodul-journalfoering", "eux-person-oppdatering", "eessi-pensjon", "melosys-eessi"),
  ...event("sedsendt-v1", "eux-fagmodul-journalfoering", "eessi-pensjon", "melosys-eessi"),

  cron("eux-avslutt-rinasaker-naisjob", "eux-avslutt-rinasaker"),
  cron("eux-journalarkivar-naisjob", "eux-journalarkivar"),
  cron("eux-slett-usendte-rinasaker-naisjob", "eux-slett-usendte-rinasaker"),
];

export const NODE_BY_ID: Record<string, ArchNode> = Object.fromEntries(NODES.map((n) => [n.id, n]));

export const ZONE_LABEL: Record<Zone, string> = {
  bruker: "Bruker",
  frontend: "Frontend",
  orkestrering: "Orkestrering",
  domene: "Domenetjeneste",
  "rina-integrasjon": "RINA-integrasjon",
  eu: "EU-system",
  hendelser: "Hendelsesinfrastruktur",
  kafka: "Kafka-topic",
  bakgrunn: "Bakgrunnstjeneste",
  jobber: "NAIS-jobb",
  nav: "NAV-system",
  andre: "Annet team",
};

export type LayerId = "frontend" | "domene" | "rina" | "hendelser" | "bakgrunn" | "jobber";

export type Layer = { id: LayerId; title: string; zones: Zone[]; tone: Tone };

/** Service zones grouped into layers, for /applications and the catalogue on /architecture. */
export const LAYERS: Layer[] = [
  { id: "frontend", title: "Frontend og orkestrering", zones: ["frontend", "orkestrering"], tone: "accent" },
  { id: "domene", title: "Domenetjenester", zones: ["domene"], tone: "success" },
  { id: "rina", title: "RINA-integrasjon", zones: ["rina-integrasjon"], tone: "info" },
  { id: "hendelser", title: "Hendelsesinfrastruktur", zones: ["hendelser"], tone: "meta-purple" },
  { id: "bakgrunn", title: "Bakgrunnstjenester", zones: ["bakgrunn"], tone: "meta-lime" },
  { id: "jobber", title: "NAIS-jobber", zones: ["jobber"], tone: "warning" },
];

/** Sort order for neighbour lists: services first, then topics, people/teams and external systems. */
export const KIND_RANK: Record<NodeKind, number> = { app: 0, job: 0, topic: 1, team: 2, person: 2, external: 3 };

export const KIND_COLOR: Record<EdgeKind, string> = {
  rest: "var(--ax-border-accent)",
  event: "var(--ax-border-meta-purple)",
  cron: "var(--ax-border-warning)",
};

/** Short protocol label for an edge, e.g. "NIE", "Kafka", "REST". */
export const edgeLabel = (e: ArchEdge): string => {
  if (e.kind === "cron") return "cron";
  if (e.kind === "event") return e.from === "rina" ? "NIE" : "Kafka";
  if (e.to === "rina") return "CPI";
  if (e.to === "pdl" || e.to === "saf") return "GraphQL";
  return "REST";
};

export const incoming = (id: string) => EDGES.filter((e) => e.to === id);
export const outgoing = (id: string) => EDGES.filter((e) => e.from === id);

/** The one-paragraph platform introduction, shared by the home and architecture heroes. */
export const PLATFORM_INTRO =
  "EUX er NAVs plattform for EESSI – den elektroniske utvekslingen av trygdeinformasjon med andre land i EU/EØS og Sveits. Saksbehandlerne jobber i nEESSI, mens sakene og SED-ene ligger i RINA. EUX binder dette sammen med resten av NAV.";

export const SERVICE_COUNT = NODES.filter((n) => n.kind === "app").length;
export const JOB_COUNT = NODES.filter((n) => n.kind === "job").length;
export const TOPIC_COUNT = NODES.filter((n) => n.kind === "topic").length;
export const DB_COUNT = NODES.filter((n) => n.db).length;
