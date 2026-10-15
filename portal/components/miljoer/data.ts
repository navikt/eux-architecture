/**
 * Testmiljøene Q1 og Q2, brukt av /environments og /applications.
 * Ingresser, Swagger og helsesjekk er sjekket mot NAIS-manifestene og springdoc-
 * konfigurasjonen i repoene, og prøvd mot dev-gcp. Produksjon er bevisst utelatt.
 */

export type EnvId = "q1" | "q2";

export const ENV_IDS: EnvId[] = ["q1", "q2"];

export interface EnvInfo {
  id: EnvId;
  name: string;
  tone: "accent" | "meta-purple";
  /** Institusjons-ID i EESSI */
  institution: string;
  institutionName: string;
  /** Vedlikeholdes manuelt: oppdater når RINA oppgraderes i miljøet. */
  rinaVersion: string;
  rinaHost: string;
  rinaServer: string;
  role: string;
}

export const ENVS: Record<EnvId, EnvInfo> = {
  q1: {
    id: "q1",
    name: "Q1",
    tone: "accent",
    institution: "NO:NAVAT06",
    institutionName: "NAV ACC 06",
    rinaVersion: "JINA 2025 v2.1",
    rinaHost: "rina-ss4-q.adeo.no",
    rinaServer: "b27apvw175",
    role: "Motparten. Her sender og mottar vi når noe skal testes mot Q2.",
  },
  q2: {
    id: "q2",
    name: "Q2",
    tone: "meta-purple",
    institution: "NO:NAVAT07",
    institutionName: "NAV ACC 07",
    rinaVersion: "JINA 2025 v2.1",
    rinaHost: "rina-ss1-q.adeo.no",
    rinaServer: "b27apvw171",
    role: "Hovedmiljøet. Det meste av testingen skjer her.",
  },
};

export const sameRinaVersion = ENVS.q1.rinaVersion.toLowerCase() === ENVS.q2.rinaVersion.toLowerCase();

/** Begge miljøene peker nEESSI mot samme Gosys i dev. */
export const GOSYS_URL = "https://gosys.dev.intern.nav.no/gosys";
export const NAIS_CONSOLE = "https://console.nav.cloud.nais.io";

/** nEESSI-utgaver per miljø. Alle bruker eux-neessi-backend i samme miljø. */
export const NEESSI_VARIANTS: { id: string; label: string; text: string }[] = [
  { id: "", label: "nEESSI", text: "Hovedutgaven, bygget fra master." },
  { id: "parallel", label: "parallel", text: "Plass for å teste en gren ved siden av master." },
  { id: "experimental", label: "experimental", text: "Ekstra plass for grener og eksperimenter." },
  { id: "odin", label: "odin", text: "Grener fra Odin-agenten havner her." },
];

export const neessiUrl = (env: EnvId, variant = "", domain: "intern" | "ansatt" = "intern") =>
  `https://eux-neessi${variant ? `-${variant}` : ""}-${env}.${domain}.dev.nav.no`;

export const rinaUrl = (env: EnvId) => `https://${ENVS[env].rinaHost}/portal_new/`;

export interface EnvService {
  /** Node-id i arkitekturmodellen (components/architecture/data.ts) */
  id: string;
  /** Ingressnavn uten -q1/-q2 */
  host: string;
  envs: EnvId[];
  swagger: EnvId[];
  /** Sti for helsesjekk. Mangler for tjenester uten åpne endepunkter. */
  health?: string;
  note?: string;
}

const both: EnvId[] = ["q1", "q2"];

export const ENV_SERVICES: EnvService[] = [
  { id: "eux-web-app", host: "eux-neessi", envs: both, swagger: [], health: "/internal/isAlive", note: "nEESSI. Finnes også på ansatt.dev.nav.no." },
  { id: "eux-neessi", host: "eux-neessi-backend", envs: both, swagger: both, health: "/actuator/health" },
  { id: "eux-nav-rinasak", host: "eux-nav-rinasak", envs: both, swagger: both, health: "/actuator/health" },
  { id: "eux-journal", host: "eux-journal", envs: both, swagger: both, health: "/actuator/health" },
  { id: "eux-oppgave", host: "eux-oppgave", envs: both, swagger: both, health: "/actuator/health" },
  { id: "eux-saksbehandler", host: "eux-saksbehandler", envs: both, swagger: both, health: "/actuator/health" },
  { id: "eux-relaterte-rinasaker", host: "eux-relaterte-rinasaker", envs: both, swagger: both, health: "/actuator/health" },
  { id: "eux-rina-api", host: "eux-rina-api", envs: both, swagger: both, health: "/actuator/health", note: "Også på eux-rina-api-gcp-qN." },
  { id: "eux-rina-terminator-api", host: "eux-rina-terminator-api", envs: both, swagger: both, health: "/actuator/health" },
  { id: "eux-rina-case-search", host: "eux-rina-case-search", envs: both, swagger: ["q1"], health: "/actuator/health" },
  { id: "eux-pdf", host: "eux-pdf", envs: both, swagger: both, health: "/actuator/health" },
  { id: "eux-all-rina-events", host: "eux-all-rina-events", envs: both, swagger: ["q1"], health: "/actuator/health", note: "Tar imot NIE-hendelser fra RINA." },
  { id: "eux-legacy-rina-events", host: "eux-legacy-rina-events", envs: both, swagger: [], health: "/actuator/health" },
  { id: "eux-fagmodul-journalfoering", host: "eux-fagmodul-journalfoering", envs: both, swagger: both, health: "/actuator/health" },
  { id: "eux-journalarkivar", host: "eux-journalarkivar", envs: both, swagger: both, health: "/actuator/health" },
  { id: "eux-avslutt-rinasaker", host: "eux-avslutt-rinasaker", envs: both, swagger: both, health: "/actuator/health" },
  { id: "eux-slett-usendte-rinasaker", host: "eux-slett-usendte-rinasaker", envs: both, swagger: both, health: "/actuator/health" },
  { id: "eux-adresse-oppdatering", host: "eux-adresse-oppdatering", envs: ["q2"], swagger: [], health: "/actuator/health" },
  { id: "eux-person-oppdatering", host: "eux-person-oppdatering", envs: ["q2"], swagger: [], health: "/actuator/health" },
  { id: "eux-barnetrygd", host: "eux-barnetrygd", envs: both, swagger: [], note: "Kjører en planlagt jobb og har ingen åpne endepunkter." },
];

export const ENV_SERVICE_BY_ID: Record<string, EnvService> = Object.fromEntries(ENV_SERVICES.map((s) => [s.id, s]));

export const hostUrl = (s: EnvService, env: EnvId) => `https://${s.host}-${env}.intern.dev.nav.no`;
export const swaggerUrl = (s: EnvService, env: EnvId) => `${hostUrl(s, env)}/swagger-ui/index.html`;

export const Q2_ONLY = ENV_SERVICES.filter((s) => !s.envs.includes("q1"));
export const SWAGGER_COUNT = ENV_SERVICES.filter((s) => s.swagger.length > 0).length;
