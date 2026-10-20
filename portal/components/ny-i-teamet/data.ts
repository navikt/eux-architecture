/**
 * Innholdet på «Ny i teamet» (/ny-i-teamet). Alt som kan endre seg – teamet,
 * kanaler, møter, verktøy og lenker – ligger her, så siden er lett å justere.
 */

import type { Tone } from "@/lib/tones";

export type { Tone };

/* ---------- Teamet ---------- */

export type RoleId = "produkt" | "fag" | "teknisk";

export const ROLES: { id: RoleId; label: string; plural: string; count: number; tone: Tone; text: string }[] = [
  { id: "produkt", label: "Produktsjef", plural: "produktsjef", count: 1, tone: "warning", text: "Prioriterer og holder retningen." },
  { id: "fag", label: "Fagressurs", plural: "fagressurser", count: 3, tone: "meta-purple", text: "Kan regelverket, BUC-ene og SED-ene." },
  { id: "teknisk", label: "Teknisk ressurs", plural: "tekniske ressurser", count: 4, tone: "accent", text: "Utvikler og drifter plattformen." },
];

export const TEAM_SIZE = ROLES.reduce((sum, r) => sum + r.count, 0);

export const TEAM_POINTS: { title: string; text: string; tone: Tone; icon: "people" | "stars" | "handshake" }[] = [
  {
    title: "Tverrfaglig",
    text: "Fag og teknikk sitter i samme team. Spørsmål om regelverk og spørsmål om kode får svar på samme sted.",
    tone: "meta-purple",
    icon: "people",
  },
  {
    title: "Mye EESSI-kompetanse",
    text: "Vi samarbeider med andre EU-land om å utvikle hvordan trygdeinformasjon utveksles.",
    tone: "accent",
    icon: "stars",
  },
  {
    title: "Tjenester for resten av Nav",
    text: "Andre team i Nav bruker tjenestene våre når de skal utveksle informasjon med EU.",
    tone: "success",
    icon: "handshake",
  },
];

/* ---------- EESSI ---------- */

/** EU-landene, Island, Liechtenstein, Norge, Sveits og Storbritannia. */
export const EESSI_COUNTRIES = 32;

/** Sektorene i EESSI. Koden er starten på BUC-navnet, f.eks. H i H_BUC_01. */
export const SECTORS: { code: string; label: string }[] = [
  { code: "AW", label: "Yrkesskade og yrkessykdom" },
  { code: "FB", label: "Familieytelser" },
  { code: "H", label: "Horisontale – på tvers av sektorene" },
  { code: "LA", label: "Lovvalg" },
  { code: "P", label: "Pensjon" },
  { code: "R", label: "Innkreving" },
  { code: "S", label: "Sykdom" },
  { code: "UB", label: "Arbeidsledighet" },
];

export const SED_TRIP: { title: string; sub: string; tone: Tone }[] = [
  { title: "Saksbehandler", sub: "i Nav", tone: "neutral" },
  { title: "nEESSI", sub: "løsningen vår", tone: "accent" },
  { title: "RINA", sub: "som vi drifter", tone: "meta-purple" },
  { title: "EESSI", sub: "nettverket i EU", tone: "info" },
  { title: "Et annet land", sub: "deres institusjon", tone: "warning" },
];

export const EESSI_URL =
  "https://employment-social-affairs.ec.europa.eu/policies-and-activities/moving-working-europe/eu-social-security-coordination/digitalisation-social-security-coordination/electronic-exchange-social-security-information-eessi_en";

/* ---------- Slack ---------- */

export const SLACK_CHANNELS: { name: string; short: string; text: string; use: string[]; tone: Tone; tag?: string }[] = [
  {
    name: "team-eessi-nav-intern",
    short: "Hovedkanalen vår",
    text: "Her snakker vi sammen på tvers av fag og teknikk. Usikker på hvor noe hører hjemme? Da hører det hjemme her.",
    use: ["Spørsmål, store og små", "Beskjeder til hele teamet", "Det som ikke passer andre steder"],
    tone: "accent",
    tag: "Start her",
  },
  {
    name: "team-eessi-nav-neessi",
    short: "Alt om nEESSI",
    text: "For prat om nEESSI – saksbehandlerløsningen vår.",
    use: ["Nye funksjoner og endringer", "Hvordan noe skal virke", "Feil vi har sett"],
    tone: "info",
  },
  {
    name: "team-eessi-nav-porten",
    short: "Saker fra saksbehandlere",
    text: "Hit kommer saker fra saksbehandlere i Nav. Vi ser på dem og følger dem opp.",
    use: ["Henvendelser fra saksbehandlere", "Feil i saker", "Spørsmål om bruk"],
    tone: "warning",
  },
  {
    name: "team-eessi-nav-driftsoppfølging",
    short: "Automatiske meldinger",
    text: "Systemene våre poster hit automatisk. Vi følger med og tar tak i det som trenger oppfølging.",
    use: ["Varsler fra applikasjonene", "Rapporter fra nattlige jobber", "Ting som må følges opp"],
    tone: "meta-purple",
    tag: "Bot",
  },
  {
    name: "team-eessi-nav",
    short: "Døra inn til oss",
    text: "Her tar andre team kontakt med oss for å diskutere saker.",
    use: ["Spørsmål fra andre team", "Avklaringer om integrasjoner", "Samarbeid på tvers"],
    tone: "success",
  },
];

/* ---------- Møter ---------- */

/**
 * `time` er klokkeslettet møtet starter (HH:MM). Med `time` viser klokka både
 * time- og minuttviser, og buen tegnes fra starttidspunktet.
 */
export const MEETINGS: {
  id: string;
  title: string;
  when: string;
  time?: string;
  length: string;
  fill: number;
  text: string;
  tone: Tone;
}[] = [
  {
    id: "daglig",
    title: "Daglig møte",
    when: "Hver dag",
    time: "09:30",
    length: "30 min",
    fill: 0.5,
    text: "En halvtime der vi snakker om stort og smått – hva vi jobber med, og hva som står fast.",
    tone: "accent",
  },
  {
    id: "tavle",
    title: "Tavlemøte",
    when: "Én gang i uka",
    length: "Lengre",
    fill: 0.85,
    text: "Et lengre møte der vi går gjennom JIRA-tavla og diskuterer sakene der.",
    tone: "meta-purple",
  },
];

/* ---------- RINA ---------- */

/** RINA-utgaven vi bruker i dag, og den vi går over til. */
export const RINA_NOW = { name: "JINA", country: "Italia" };
export const RINA_NEXT = { name: "ERINA", country: "Danmark", year: 2027 };

/* ---------- Verktøy ---------- */

export const JIRA_BOARD = "https://nav.atlassian.net/jira/software/c/projects/TEN/boards/214";
export const CONFLUENCE = "https://confluence.adeo.no/spaces/TEN/pages/340505927/Team+EESSI+NAV";
export const NAIS_DOCS = "https://doc.nais.io";
export const NAIS_CONSOLE = "https://console.nav.cloud.nais.io";
export const GITHUB_REPOS = "https://github.com/orgs/navikt/repositories?q=eux-";
export const REPO = "https://github.com/navikt/eux-architecture";

export const TOOLS: { id: string; name: string; badge: string; text: string; points: string[]; href?: string; linkText?: string; tone: Tone }[] = [
  {
    id: "jira",
    name: "JIRA",
    badge: "TEN",
    text: "Oppgavene våre ligger i JIRA. De sendes rundt mellom oss, og tavla vår heter TEN.",
    points: ["Oppgaver for hele teamet", "Gjennomgås i tavlemøtet"],
    href: JIRA_BOARD,
    linkText: "Åpne TEN-tavla",
    tone: "accent",
  },
  {
    id: "teams",
    name: "Microsoft Teams",
    badge: "Video",
    text: "Vi bruker Teams til møter med video, og til å informere saksbehandlere i Nav om nye funksjoner.",
    points: ["Møter med video", "Nyheter til saksbehandlere", "Aldri til chat – det har vi Slack til"],
    tone: "meta-purple",
  },
  {
    id: "confluence",
    name: "Confluence",
    badge: "Wiki",
    text: "Mer om teamet og løsningene våre. Noe overlapper med denne portalen, så det er lurt å kjenne begge.",
    points: ["Mer om teamet", "Mer om løsningene"],
    href: CONFLUENCE,
    linkText: "Åpne Team EESSI NAV",
    tone: "info",
  },
  {
    id: "github",
    name: "GitHub",
    badge: "navikt",
    text: "Koden ligger i navikt-organisasjonen. EUX-repoene starter med eux-.",
    points: ["Bygg og deploy med GitHub Actions", "Denne portalen ligger i eux-architecture"],
    href: GITHUB_REPOS,
    linkText: "Se eux-repoene",
    tone: "success",
  },
];

/* ---------- Første uke ---------- */

export const CHECKLIST: { id: string; text: string; href?: string; external?: boolean }[] = [
  { id: "les", text: "Les denne siden" },
  { id: "slack", text: "Bli med i Slack-kanalene", href: "#slack" },
  { id: "jira", text: "Ta en titt på TEN-tavla i JIRA", href: JIRA_BOARD, external: true },
  { id: "confluence", text: "Bla gjennom Confluence-sidene", href: CONFLUENCE, external: true },
  { id: "arkitektur", text: "Utforsk arkitekturkartet", href: "/architecture" },
  { id: "miljoer", text: "Se hvilke testmiljøer vi har", href: "/environments" },
  { id: "nais", text: "Logg inn i NAIS-konsollen", href: NAIS_CONSOLE, external: true },
  { id: "github", text: "Finn et eux-repo og bygg det lokalt", href: GITHUB_REPOS, external: true },
];

/* ---------- Ord ---------- */

export const WORDS = ["EESSI", "RINA", "BUC", "SED", "CPI", "NIE", "nEESSI", "NAIS"];

/* ---------- Videre ---------- */

export const FURTHER: { href: string; title: string; text: string; external?: boolean }[] = [
  { href: "/", title: "Oversikt", text: "Plattformen forklart på én side, med de tre flytene." },
  { href: "/architecture", title: "Arkitektur", text: "Interaktivt kart over tjenestene, mønstre og fallgruver." },
  { href: "/applications", title: "Applikasjoner", text: "Rolle, avhengigheter og repo for hver applikasjon." },
  { href: "/environments", title: "Miljøer", text: "Q1 og Q2 – RINA, nEESSI og Swagger." },
  { href: "/prosesser/journalfoering", title: "Journalføring", text: "Hvordan SED-er havner i arkivet." },
  { href: "/kafka/sed-hendelser", title: "SED-hendelser", text: "Hendelsene fra RINA, mens de skjer." },
  { href: CONFLUENCE, title: "Confluence", text: "Mer om teamet og løsningene.", external: true },
  { href: NAIS_DOCS, title: "NAIS-dokumentasjonen", text: "Den offisielle dokumentasjonen for plattformen.", external: true },
  { href: `${REPO}#readme`, title: "README.md", text: "Arkitekturen som tekst, på engelsk.", external: true },
];
