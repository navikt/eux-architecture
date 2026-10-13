/**
 * Shared glossary for the portal. Used by the Arkitektur page (full list) and
 * the Oversikt page (the key terms). Definitions follow the official EU terms.
 */

export interface GlossaryEntry {
  term: string;
  full?: string;
  text: string;
}

export const GLOSSARY: GlossaryEntry[] = [
  { term: "EESSI", full: "Electronic Exchange of Social Security Information", text: "EUs system for elektronisk utveksling av trygdeinformasjon mellom landene." },
  { term: "RINA", full: "Reference Implementation of a National Application", text: "Europakommisjonens referanseimplementasjon for å behandle EESSI-saker." },
  { term: "CPI", full: "Case Processing Interface", text: "RINAs REST-API." },
  { term: "NIE", full: "National Interface Endpoint", text: "Måten RINA sender hendelser til nasjonale systemer på." },
  { term: "BUC", full: "Business Use Case", text: "En saksprosess i EESSI. En RINA-sak følger én BUC." },
  { term: "SED", full: "Structured Electronic Document", text: "Et strukturert dokument som sendes mellom landene i en BUC." },
  { term: "nEESSI", text: "NAVs saksbehandlerløsning for EESSI: eux-web-app med eux-neessi som backend." },
  { term: "CAS-billett", text: "Innloggingsbilletten RINA krever før den gir en sesjon (JSESSIONID)." },
  { term: "On-behalf-of (OBO)", text: "Tokenveksling i Azure AD der en tjeneste kaller videre på vegne av den innloggede brukeren." },
  { term: "Wonderwall", text: "NAIS-sidecar som håndterer innlogging for nettapplikasjoner." },
  { term: "NAIS", text: "NAVs applikasjonsplattform på Kubernetes. EUX kjører i dev-gcp og prod-gcp." },
  { term: "FSS", text: "NAVs fagsystemsone. Tjenester der nås fra GCP via *.prod-fss-pub.nais.io." },
  { term: "PDL", full: "Persondataløsningen", text: "NAVs kilde til persondata." },
  { term: "SAF", text: "NAVs API for å søke i journalposter og dokumenter." },
  { term: "Dokarkiv", text: "API for å opprette og oppdatere journalposter." },
  { term: "Fagsak", text: "En sak i et av NAVs fagsystemer, f.eks. pensjon eller sykepenger." },
  { term: "Journalpost", text: "Et registrert dokument i arkivet." },
  { term: "Oppgave", text: "En arbeidsoppgave for saksbehandler i NAV Oppgave." },
];

export const GLOSSARY_BY_TERM: Record<string, GlossaryEntry> = Object.fromEntries(GLOSSARY.map((g) => [g.term, g]));
