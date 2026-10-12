/*
 * Endringer i nEESSI (eux-web-app + eux-neessi) fra 1. desember 2025.
 *
 * Kilder: sammenslåtte PR-er og commits på master/main i navikt/eux-web-app og
 * navikt/eux-neessi, JIRA-sakene i TEN-prosjektet og prod-deployene i GitHub Actions.
 * Prodstatus: eux-web-app og eux-neessi (5.0.184) ble sist prodsatt 06.10.2026.
 */

export const PERIOD_FROM = "1. desember 2025";
export const UPDATED = "12. oktober 2026";
export const PROD_DATE = "6. oktober 2026";

export type Month =
  | "2025-12"
  | "2026-01"
  | "2026-02"
  | "2026-03"
  | "2026-04"
  | "2026-05"
  | "2026-06"
  | "2026-07"
  | "2026-08"
  | "2026-09"
  | "2026-10";

export const MONTHS: { id: Month; label: string; short: string }[] = [
  { id: "2025-12", label: "Desember 2025", short: "Des" },
  { id: "2026-01", label: "Januar 2026", short: "Jan" },
  { id: "2026-02", label: "Februar 2026", short: "Feb" },
  { id: "2026-03", label: "Mars 2026", short: "Mar" },
  { id: "2026-04", label: "April 2026", short: "Apr" },
  { id: "2026-05", label: "Mai 2026", short: "Mai" },
  { id: "2026-06", label: "Juni 2026", short: "Jun" },
  { id: "2026-07", label: "Juli 2026", short: "Jul" },
  { id: "2026-08", label: "August 2026", short: "Aug" },
  { id: "2026-09", label: "September 2026", short: "Sep" },
  { id: "2026-10", label: "Oktober 2026", short: "Okt" },
];

export const monthLabel = (m: Month) => MONTHS.find((x) => x.id === m)?.label ?? m;
export const monthShort = (m: Month) => {
  const x = MONTHS.find((y) => y.id === m);
  return x ? `${x.short} ${m.slice(0, 4)}` : m;
};

export const jiraHref = (key: string) => `https://nav.atlassian.net/browse/${key}`;

/* ---------- Nye SED-er ---------- */

export type SedFamily = "H" | "X" | "U";
export type SedStatus = "prod" | "ikke-aktivert";

export type NewSed = {
  code: string;
  name: string;
  family: SedFamily;
  buc: string;
  /** Hvor saksbehandler finner SED-en i nEESSI */
  how: string;
  what: string;
  month: Month;
  jira: string[];
  status: SedStatus;
};

export const SED_FAMILIES: { id: SedFamily; label: string; tone: string }[] = [
  { id: "H", label: "Horisontale", tone: "accent" },
  { id: "X", label: "Administrative", tone: "meta-purple" },
  { id: "U", label: "Dagpenger", tone: "meta-lime" },
];

export const NEW_SEDS: NewSed[] = [
  {
    code: "H065",
    name: "Overføring av krav/dokument/informasjon",
    family: "H",
    buc: "H_BUC_06",
    how: "Ny sakshandling",
    what: "Send et krav, et dokument eller informasjon videre til riktig institusjon i et annet land – med grunn for overføringen, opplysninger om kravet og vedlagte dokumenter.",
    month: "2026-03",
    jira: ["TEN-932"],
    status: "prod",
  },
  {
    code: "H120",
    name: "Anmodning om medisinsk informasjon",
    family: "H",
    buc: "H_BUC_08",
    how: "Ny sakshandling",
    what: "Be et annet land om medisinsk informasjon. Skjemaet viser bare spørsmålene som gjelder valgt ytelse, f.eks. familieytelser eller yrkesskade. Fra juni kan adressen hentes fra PDL.",
    month: "2026-03",
    jira: ["TEN-929", "TEN-1711"],
    status: "prod",
  },
  {
    code: "H021",
    name: "Svar på krav om refusjon – administrativ kontroll, legeundersøkelse eller medisinsk informasjon",
    family: "H",
    buc: "H_BUC_04",
    how: "Svar på mottatt H020",
    what: "Svar på et krav om refusjon av utgifter, både for kravet samlet og for hvert enkelt krav.",
    month: "2026-05",
    jira: ["TEN-930"],
    status: "prod",
  },
  {
    code: "H070",
    name: "Melding om dødsfall",
    family: "H",
    buc: "H_BUC_07",
    how: "Ny sakshandling",
    what: "Meld fra om et dødsfall med dødsdato, dødssted og vedlagt dokumentasjon, f.eks. dødsattest.",
    month: "2026-07",
    jira: ["TEN-1597", "TEN-1733"],
    status: "prod",
  },
  {
    code: "H003",
    name: "Forslag/melding om bostedsstat",
    family: "H",
    buc: "H_BUC_02a",
    how: "Ny sakshandling",
    what: "Foreslå eller meld fra om hvilket land som er personens bostedsland – med land, startdato og begrunnelse.",
    month: "2026-08",
    jira: ["TEN-1594"],
    status: "prod",
  },
  {
    code: "H005",
    name: "Anmodning om informasjon om bosted",
    family: "H",
    buc: "H_BUC_02a",
    how: "Ny sakshandling",
    what: "Be et annet land om opplysningene som trengs for å fastslå hvor personen bor.",
    month: "2026-08",
    jira: ["TEN-1595"],
    status: "prod",
  },
  {
    code: "H006",
    name: "Svar på anmodning om informasjon om bosted",
    family: "H",
    buc: "H_BUC_02a",
    how: "Svar på mottatt H005",
    what: "Svar på en H005. Sammen med H003 og H005 kan nå hele H_BUC_02a behandles i nEESSI.",
    month: "2026-08",
    jira: ["TEN-1596"],
    status: "prod",
  },
  {
    code: "X002",
    name: "Anmodning om gjenåpning av avsluttet sak",
    family: "X",
    buc: "Alle BUC-er",
    how: "Fra en X001 i saken",
    what: "Be om at en avsluttet sak åpnes igjen.",
    month: "2026-05",
    jira: ["TEN-1585"],
    status: "prod",
  },
  {
    code: "X003",
    name: "Svar på anmodning om gjenåpning av avsluttet sak",
    family: "X",
    buc: "Alle BUC-er",
    how: "Svar på mottatt X002",
    what: "Svar på en anmodning om å åpne en avsluttet sak igjen.",
    month: "2026-06",
    jira: ["TEN-1586"],
    status: "prod",
  },
  {
    code: "X004",
    name: "Gjenåpne saken",
    family: "X",
    buc: "Alle BUC-er",
    how: "Svar på mottatt X003",
    what: "Bekreft at saken gjenåpnes.",
    month: "2026-06",
    jira: ["TEN-1587"],
    status: "prod",
  },
  {
    code: "X005",
    name: "Legg til ny institusjon",
    family: "X",
    buc: "Alle BUC-er",
    how: "Ny sakshandling",
    what: "Legg til en ny institusjon som deltaker i saken.",
    month: "2026-07",
    jira: ["TEN-1588"],
    status: "prod",
  },
  {
    code: "X006",
    name: "Fjern institusjon",
    family: "X",
    buc: "Alle BUC-er",
    how: "Ny sakshandling",
    what: "Fjern en institusjon fra saken.",
    month: "2026-07",
    jira: ["TEN-1589"],
    status: "prod",
  },
  {
    code: "X007",
    name: "Videresend sak",
    family: "X",
    buc: "Alle BUC-er",
    how: "Ny sakshandling",
    what: "Send saken videre til en annen institusjon.",
    month: "2026-07",
    jira: ["TEN-1590"],
    status: "prod",
  },
  {
    code: "X013",
    name: "Svar på anmodning om klargjøring",
    family: "X",
    buc: "Alle BUC-er",
    how: "Svar på mottatt X012",
    what: "Skjemaet er laget, men svarknappen er ikke slått på. Saksbehandlere ser den derfor ikke i dag.",
    month: "2026-08",
    jira: ["TEN-1591"],
    status: "ikke-aktivert",
  },
  {
    code: "U013",
    name: "Månedlig oppfølging – eksport",
    family: "U",
    buc: "U-saker",
    how: "Ny sakshandling",
    what: "Månedlig rapportering til et annet land når en person tar med seg dagpenger dit – med lokale saksnumre og rapporteringsfelter.",
    month: "2026-09",
    jira: ["TEN-1790"],
    status: "prod",
  },
];

/* ---------- Skjermbilder og funksjoner ---------- */

export type ChangeKind = "ny" | "forbedret" | "rettet";

export const CHANGE_KINDS: { id: ChangeKind; label: string; color: "success" | "info" | "warning" }[] = [
  { id: "ny", label: "Nytt", color: "success" },
  { id: "forbedret", label: "Forbedret", color: "info" },
  { id: "rettet", label: "Rettet", color: "warning" },
];

export type ScreenChange = {
  title: string;
  text: string;
  kind: ChangeKind;
  month: Month;
  jira?: string[];
  note?: string;
};

export type ScreenIcon = "house" | "plus" | "folder" | "journal" | "pencil" | "doc" | "paperclip" | "palette" | "database";

export type ScreenArea = {
  id: string;
  title: string;
  intro: string;
  icon: ScreenIcon;
  changes: ScreenChange[];
};

export const SCREENS: ScreenArea[] = [
  {
    id: "forside",
    title: "Forsiden og søk",
    intro: "Det første saksbehandler ser – søkefeltet og snarveiene.",
    icon: "house",
    changes: [
      {
        title: "Ny snarvei: Årlig kontroll",
        text: "Søk opp personen og få en liste over aktive F001-er, der den nyeste er valgt. Ett trykk lager en ny F001 for årlig kontroll med de samme personene og standardteksten.",
        kind: "ny",
        month: "2026-10",
        jira: ["TEN-1813", "TEN-1810"],
        note: "Vises for saksbehandlere med tilgang til familieytelser (FB-BUC-er).",
      },
      {
        title: "Søk på internasjonal ID",
        text: "En sak kan nå slås opp med den internasjonale saks-ID-en, ikke bare med saksnummer eller fødselsnummer.",
        kind: "ny",
        month: "2026-06",
        jira: ["TEN-1700"],
      },
      {
        title: "Tydelig melding når søket ikke gir treff",
        text: "Et søk på fødselsnummer uten saker viser nå en melding. Før så den tomme listen ut som en feil.",
        kind: "forbedret",
        month: "2025-12",
        jira: ["TEN-1352"],
      },
      {
        title: "Søkefeltet sjekker det du skriver",
        text: "Feltet godtar bare tall og forklarer hva som er galt hvis man limer inn f.eks. en lenke eller et navn.",
        kind: "forbedret",
        month: "2026-05",
        jira: ["TEN-1577"],
      },
    ],
  },
  {
    id: "opprett-sak",
    title: "Opprett sak",
    intro: "Skjermbildet for å opprette en ny sak med første SED.",
    icon: "plus",
    changes: [
      {
        title: "Nye temaer for M-saker",
        text: "M-BUC-er kan knyttes til temaene SUALDER og SUUFORE (supplerende stønad).",
        kind: "ny",
        month: "2026-06",
        jira: ["TEN-1189"],
      },
      {
        title: "Flere «andre personer» i F-saker",
        text: "Man kan legge til mer enn én annen person når man oppretter F-saker og fyller ut F-SED-er.",
        kind: "ny",
        month: "2025-12",
        jira: ["TEN-1300"],
      },
      {
        title: "Melding når personen ikke kan vises",
        text: "Søker man opp en person man ikke har tilgang til (f.eks. kode 6), eller som ikke finnes, får man nå en tydelig melding i stedet for ingenting.",
        kind: "rettet",
        month: "2025-12",
        jira: ["TEN-1348", "TEN-1336"],
      },
      {
        title: "Fagsak for tema BBF",
        text: "Henting av fagsak feilet for tema BBF og andre ukjente temaer. Det er rettet.",
        kind: "rettet",
        month: "2026-04",
        jira: ["TEN-1483"],
      },
    ],
  },
  {
    id: "saksvisning",
    title: "Saksvisningen",
    intro: "Oversikten over én RINA-sak med SED-er og handlinger.",
    icon: "folder",
    changes: [
      {
        title: "Datamodellen vises på saken",
        text: "Saken viser om den er på datamodell 4.3 eller 4.4, så det er lett å se hvilke felter som gjelder.",
        kind: "ny",
        month: "2026-01",
        jira: ["TEN-1447"],
      },
      {
        title: "Feilmeldingen fra RINA vises",
        text: "Når RINA avviser en SED, ser saksbehandler nå selve begrunnelsen fra RINA – ikke bare «noe gikk galt». Svarer ikke RINA, står det «Rina svarte ikke i tide. Prøv igjen.»",
        kind: "ny",
        month: "2026-03",
        jira: ["TEN-1558", "TEN-1551"],
      },
      {
        title: "Forklaring når en sak ikke kan åpnes",
        text: "Arkiverte saker, VIP-saker og saker som ikke finnes i RINA gir hver sin melding, f.eks. «Saken er arkivert. Bruk ev Rina til videre behandling».",
        kind: "forbedret",
        month: "2026-06",
      },
      {
        title: "Forhåndsvis H065 og H120 som PDF",
        text: "Utkast av de nye H-SED-ene kan forhåndsvises som PDF før de sendes.",
        kind: "ny",
        month: "2026-04",
        jira: ["TEN-1657"],
      },
      {
        title: "Journalføringsboksen skjules i eldre saker",
        text: "Boksen «Under journalføring eller ukjent status» viste ofte feil for gamle saker. Den vises nå bare for saker opprettet i 2024 eller senere.",
        kind: "forbedret",
        month: "2026-08",
        jira: ["TEN-703"],
      },
    ],
  },
  {
    id: "journalforing",
    title: "Journalføring",
    intro: "Journalføring av SED-er og endring av tema og fagsak.",
    icon: "journal",
    changes: [
      {
        title: "Velg Nav-enhet i «Endre tema/fagsak»",
        text: "Man kan velge hvilken Nav-enhet saken skal journalføres på når man endrer tema eller fagsak. Feltet er valgfritt.",
        kind: "ny",
        month: "2026-01",
        jira: ["TEN-1340"],
        note: "Foreløpig bare synlig for administratorer.",
      },
      {
        title: "«Innhent mer informasjon» følger tilgangen til BUC-en",
        text: "Saksbehandlere som ikke har tilgang til en BUC, kan heller ikke sende H001 for den via «Innhent mer informasjon».",
        kind: "rettet",
        month: "2025-12",
        jira: ["TEN-715"],
      },
    ],
  },
  {
    id: "utfylling",
    title: "Utfylling av SED-er",
    intro: "Felles for skjemaene der saksbehandler fyller ut og redigerer SED-er.",
    icon: "pencil",
    changes: [
      {
        title: "Bare gyldige valutaer",
        text: "Valutalistene viser bare valutaene RINA godtar for SED-typen. Før kunne man velge en valuta som RINA avviste ved lagring.",
        kind: "forbedret",
        month: "2026-05",
        jira: ["TEN-1662", "TEN-1661"],
      },
      {
        title: "Beløp skrevet på norsk vis godtas",
        text: "Beløp som «2 197 548», «1234,50» og «1.234,56» gjøres om automatisk, så RINA ikke avviser dem.",
        kind: "rettet",
        month: "2026-04",
        jira: ["TEN-1284"],
      },
      {
        title: "Datoer sjekkes før sending",
        text: "Ugyldige datoer, og perioder der slutt er før start, stoppes med en melding i skjemaet i stedet for å feile i RINA.",
        kind: "forbedret",
        month: "2026-06",
        jira: ["TEN-1553", "TEN-1578"],
      },
      {
        title: "Telefonnummer sjekkes",
        text: "Telefonnummer valideres etter reglene i RINA, og bare gyldige nummer fylles ut automatisk.",
        kind: "forbedret",
        month: "2026-05",
        jira: ["TEN-1601"],
      },
      {
        title: "Riktig filter for arbeidsperioder",
        text: "I F-SED-er kan man velge barnetrygd og kontantstøtte, i U-SED-er bare dagpenger. Mangler man tilgang til filteret, får man beskjed.",
        kind: "rettet",
        month: "2026-01",
        jira: ["TEN-1110"],
      },
      {
        title: "Flere personnummer fra samme land",
        text: "Det går nå an å legge inn flere PIN fra samme land, og å fjerne et feil personnummer.",
        kind: "rettet",
        month: "2026-06",
        jira: ["TEN-1708", "TEN-911"],
      },
      {
        title: "«Type adresse»",
        text: "Feltet «Adresse type» har fått det mer naturlige navnet «Type adresse».",
        kind: "forbedret",
        month: "2026-08",
        jira: ["TEN-1743"],
      },
      {
        title: "Oppdatert postnummerregister",
        text: "Poststed hentes fra et felles postnummerregister som holdes oppdatert, så nye postnumre gir riktig poststed.",
        kind: "forbedret",
        month: "2026-10",
        jira: ["TEN-1772"],
      },
      {
        title: "Oversettelser og CAI-lenke",
        text: "Tekster som manglet norsk oversettelse er lagt inn, og lenken til EUs Clerk Access Interface (CAI) er oppdatert.",
        kind: "rettet",
        month: "2026-05",
        jira: ["TEN-1289", "TEN-1448"],
      },
    ],
  },
  {
    id: "pdu1",
    title: "PD U1",
    intro: "Utfylling og utskrift av PD U1.",
    icon: "doc",
    changes: [
      {
        title: "Ubegrenset antall perioder",
        text: "Grensen på 20 arbeidsperioder og 7 andre forsikringsperioder er fjernet, og alle lister kan gå over flere sider i PDF-en.",
        kind: "ny",
        month: "2025-12",
        jira: ["TEN-1393"],
      },
      {
        title: "Dagens dato ved endring",
        text: "Følgebrev og attest får dagens dato når en PD U1 redigeres.",
        kind: "rettet",
        month: "2025-12",
        jira: ["TEN-1394"],
      },
      {
        title: "«Grupper etter periodetype» dupliserte perioder",
        text: "Knappen la til alle periodene på nytt for hvert trykk. Det er rettet.",
        kind: "rettet",
        month: "2026-08",
        jira: ["TEN-1429"],
      },
    ],
  },
  {
    id: "vedlegg",
    title: "Vedlegg",
    intro: "Å legge ved dokumenter fra arkivet til en SED.",
    icon: "paperclip",
    changes: [
      {
        title: "Fødselsnummeret sjekkes",
        text: "Fødselsnummer med mellomrom eller skråstrek stoppes med en melding før det søkes i arkivet.",
        kind: "rettet",
        month: "2026-04",
        jira: ["TEN-1604"],
      },
      {
        title: "Vedlegg til riktig SED",
        text: "En feil som kunne gi ugyldig adresse til SED-en når vedlegg ble sendt, er rettet.",
        kind: "rettet",
        month: "2026-04",
        jira: ["TEN-1603"],
      },
    ],
  },
  {
    id: "opplysninger",
    title: "Opplysninger fra andre systemer",
    intro: "Det nEESSI henter fra PDL, arkivet og registrene og fyller inn for saksbehandler.",
    icon: "database",
    changes: [
      {
        title: "Nyeste opplysning fra PDL brukes",
        text: "Når PDL har flere opplysninger om det samme, f.eks. to adresser, velges den nyeste – ikke en tilfeldig.",
        kind: "forbedret",
        month: "2026-03",
        jira: ["TEN-1522"],
      },
      {
        title: "Adresser fra PDL ryddes",
        text: "Overflødige mellomrom i gatenavn fra PDL fjernes før de havner i SED-en.",
        kind: "rettet",
        month: "2026-04",
        jira: ["TEN-1554"],
      },
      {
        title: "Ikke «NO» i norske personnummer",
        text: "Landkoden «NO» ble sendt med i norske PIN. Det er rettet.",
        kind: "rettet",
        month: "2026-02",
        jira: ["TEN-1486"],
      },
      {
        title: "Arbeids- og inntektsperioder",
        text: "Fødselsnummer ble i noen tilfeller tolket som organisasjonsnummer når perioder ble hentet. Det er rettet.",
        kind: "rettet",
        month: "2026-06",
      },
      {
        title: "Svar-SED uten fødselsdato",
        text: "Utkast til svar-SED kan lages selv om PDL ikke har fødselsdato for personen.",
        kind: "rettet",
        month: "2026-03",
      },
    ],
  },
  {
    id: "utseende",
    title: "Utseende og pålogging",
    intro: "Det som gjelder hele nEESSI.",
    icon: "palette",
    changes: [
      {
        title: "Nytt utseende og mørk modus",
        text: "nEESSI bruker nå den nyeste versjonen av Navs designsystem (Aksel 8). Farger, knapper og skjemaer ser litt annerledes ut, og det er en knapp for mørk modus i toppen.",
        kind: "forbedret",
        month: "2026-03",
        jira: ["TEN-1477", "TEN-1121"],
      },
      {
        title: "Strengere tilgang ved pålogging",
        text: "Det er ikke lenger nok å ha AD-gruppene «basis» eller «clerk» for å logge på nEESSI.",
        kind: "forbedret",
        month: "2026-04",
        jira: ["TEN-1574"],
      },
    ],
  },
];

/* ---------- SED-er som er endret ---------- */

export type UpdatedSed = { seds: string[]; title: string; text: string; month: Month; jira: string[] };

export const CDM44_NOTE =
  "Endringene for datamodell 4.4 kom inn i nEESSI i desember 2025 og ble tatt i bruk da RINA gikk over fra 4.3 til 4.4 rundt 20.–23. februar 2026. Mens oppgraderingen pågikk, viste nEESSI et varsel øverst og stoppet opprettelse av SED-er.";

export const UPDATED_SEDS: UpdatedSed[] = [
  {
    seds: ["F001", "F002"],
    title: "Datamodell 4.4 for familieytelser",
    text: "Nytt skjermbilde for aktivitet og status med flere perioder og statuser samtidig, nye felter for oppsummering av motregning og refusjon, og kontoopplysninger (IBAN påkrevd, SWIFT valgfritt).",
    month: "2025-12",
    jira: ["TEN-945", "TEN-1303", "TEN-1369", "TEN-1376", "TEN-1301"],
  },
  {
    seds: ["F003", "F026", "F027"],
    title: "Perioder med rett til ytelser",
    text: "Tilpasset datamodell 4.4 på samme måte som F001 og F002.",
    month: "2025-12",
    jira: ["TEN-1359"],
  },
  {
    seds: ["U004", "U017", "X009", "X010"],
    title: "Tilpasset datamodell 4.4",
    text: "Nye ledetekster og verdier etter 4.4. Feil verdier i U017 er rettet.",
    month: "2025-12",
    jira: ["TEN-1370", "TEN-1467", "TEN-970"],
  },
  {
    seds: ["H001"],
    title: "Anmodning eller melding om adresse",
    text: "Nye felter for å be om eller melde fra om adresse, etter datamodell 4.4.",
    month: "2026-01",
    jira: ["TEN-972"],
  },
  {
    seds: ["F001", "F002"],
    title: "Aktiviteter lagres riktig i RINA",
    text: "«Permisjon med/uten lønn» og datoen på aktiviteter ble ikke lagret i RINA. Begge deler er rettet.",
    month: "2026-05",
    jira: ["TEN-1677"],
  },
  {
    seds: ["H065", "H120"],
    title: "Justert etter testing",
    text: "Oppdaterte beskrivelser i H065. Justerte felter for e-post, telefon, kjønn og adresse i H120.",
    month: "2026-06",
    jira: ["TEN-1690"],
  },
];

/* ---------- Tidslinje ---------- */

export const TIMELINE: { month: Month; items: string[] }[] = [
  { month: "2025-12", items: ["Datamodell 4.4 klar for F-, U- og X-SED-er", "PD U1 uten grense på perioder", "Flere «andre personer» i F-saker"] },
  { month: "2026-01", items: ["H001 med adressefelter (4.4)", "Datamodellen vises på saken", "Riktig filter for arbeidsperioder"] },
  { month: "2026-02", items: ["RINA over på datamodell 4.4", "«NO» fjernet fra norske PIN"] },
  { month: "2026-03", items: ["Ny SED: H065", "Ny SED: H120", "Nytt utseende og mørk modus", "Feilmeldinger fra RINA vises"] },
  { month: "2026-04", items: ["PDF-forhåndsvisning av H065 og H120", "Beløp på norsk vis godtas"] },
  { month: "2026-05", items: ["Ny SED: H021", "Ny SED: X002", "Bare gyldige valutaer", "Aktiviteter i F001/F002 lagres riktig"] },
  { month: "2026-06", items: ["Ny SED: X003", "Ny SED: X004", "Søk på internasjonal ID", "Nye temaer for M-saker"] },
  { month: "2026-07", items: ["Ny SED: H070", "Ny SED: X005", "Ny SED: X006", "Ny SED: X007"] },
  { month: "2026-08", items: ["Ny SED: H003", "Ny SED: H005", "Ny SED: H006", "Journalføringsboksen skjult i eldre saker", "«Type adresse»"] },
  { month: "2026-09", items: ["Ny SED: U013"] },
  { month: "2026-10", items: ["Årlig kontroll på forsiden", "Oppdatert postnummerregister"] },
];

/* ---------- Teknisk ---------- */

export type TechItem = { text: string; month?: Month; jira?: string[]; pending?: boolean };
export type TechGroup = { id: string; title: string; repos: string; items: TechItem[] };

export const TECH: TechGroup[] = [
  {
    id: "frontend",
    title: "Rammeverk og bygg – frontend",
    repos: "eux-web-app",
    items: [
      { text: "React 18 → React 19", month: "2026-05", jira: ["TEN-1476"] },
      { text: "Aksel 7 → Aksel 8 («Darkside») med mørk modus", month: "2026-03", jira: ["TEN-1477"] },
      { text: "Styled Components erstattet med CSS Modules", month: "2026-02", jira: ["TEN-1473"] },
      { text: "Høykontrast-biblioteket erstattet med Aksel", month: "2026-02", jira: ["TEN-1121"] },
      { text: "Vite 8, med retting av bruddendringer i landvelger og datoverktøy", month: "2026-06" },
      { text: "Node 24 i bygg og Docker-image", month: "2026-06" },
      { text: "http-proxy-middleware 2 → 3 i Node-serveren", month: "2026-06", jira: ["TEN-1712"] },
      { text: "Egen RadioPanel-komponent for å beholde utseendet etter Aksel 8.9", month: "2026-05", jira: ["TEN-1658"] },
      { text: "Ubrukt ESLint-oppsett fjernet, og lockfil oppdatert med sikkerhetsfikser", month: "2026-08" },
    ],
  },
  {
    id: "backend",
    title: "Rammeverk og bygg – backend",
    repos: "eux-neessi",
    items: [
      { text: "Spring Boot 4, med opprydding etterpå", month: "2026-01" },
      { text: "eux-parent-pom 2.0.4 → 2.0.23, med oppdatert Tomcat, Netty og Jackson og CVE-fikser", month: "2026-09" },
      { text: "Chainguard JRE som base-image, og .dockerignore", month: "2026-07" },
      { text: "Minste nødvendige rettigheter i byggeworkflowen", month: "2026-08" },
      { text: "Postnummer fra eget bibliotek (eux-postnummer)", month: "2026-10", jira: ["TEN-1772"] },
      { text: "Ubrukte Axsys-properties fjernet", month: "2026-10", pending: true },
    ],
  },
  {
    id: "typed",
    title: "Typed SED-API – én controller per SED",
    repos: "eux-web-app · eux-neessi",
    items: [
      { text: "Nytt mønster: egen controller og DTO per SED under /api/v1/rinasaker/{id}/{sed}, med GET, POST, PUT, DELETE og PDF", month: "2026-03", jira: ["TEN-1555"] },
      { text: "Tatt i bruk for H065, H120, H021, H070, H003, H005, H006, X002–X007, X013 og U013" },
      { text: "Felles DTO-er for H-SED-er i frontend", month: "2026-08", jira: ["TEN-1760"] },
      { text: "Egen F001-controller og mapper for årlig kontroll", month: "2026-09", jira: ["TEN-1810"] },
      { text: "H001 og H002 flyttet over på typed API", month: "2026-10", jira: ["TEN-1779"], pending: true },
      { text: "PDF-endepunkt per SED for forhåndsvisning", month: "2026-04", jira: ["TEN-1657"] },
      { text: "Interne felter fjernes fra SED-er før de sendes til backend og PDF", month: "2026-03", jira: ["TEN-1085"] },
      { text: "Nytt endepunkt for tillatte valutaer per datamodell: /api/landogvalutakoder/rina", month: "2026-05", jira: ["TEN-1662"] },
      { text: "R-SED-er oppdatert til NAV-SED 4.4", month: "2026-02" },
    ],
  },
  {
    id: "drift",
    title: "Feilhåndtering, logging og sporbarhet",
    repos: "eux-neessi",
    items: [
      { text: "Feildetaljer fra RINA CPI sendes videre til frontend", month: "2026-03", jira: ["TEN-1551"] },
      { text: "503 fra eux-rina-api gir 503, ikke 500, fra eux-neessi", month: "2026-03", jira: ["TEN-1478"] },
      { text: "Tidsavbrudd mot RINA gir egen melding, og korrelasjons-headere sendes videre", month: "2026-05" },
      { text: "Feilsvar har alltid content type JSON – rettet feil fra PDF-endepunkter", month: "2026-04" },
      { text: "Auditlogging: bare norske fnr logges, og «andrePersoner» tas med", month: "2026-03", jira: ["TEN-1475", "TEN-1548"] },
      { text: "Bedre logging ved «SED ikke sendt», ved opprettet svar-SED-utkast og generelt", month: "2026-05", jira: ["TEN-1235", "TEN-1497", "TEN-1232"] },
      { text: "Elastic og Loki som loggmål (feb), justert Team Logs-nivå (mar) og Team Logs for feilsøking (jun)", month: "2026-06", jira: ["TEN-1482"] },
      { text: "Justert Team Logs-konfigurasjon", month: "2026-10", jira: ["TEN-1820"], pending: true },
      { text: "Mindre støy fra openhtmltopdf og PDF-generatoren for PD U1", month: "2026-08", jira: ["TEN-1518", "TEN-1706"] },
      { text: "Journalpoststatus UNDER_ARBEID støttes", month: "2026-03" },
    ],
  },
  {
    id: "miljo",
    title: "Miljøer og tilgang",
    repos: "eux-web-app · eux-neessi",
    items: [
      { text: "Testmiljøene q1-odin og q2-odin for frontend, med tilgang i backend", month: "2026-03" },
      { text: "Oppdaterte AD-grupper i backend", month: "2026-03" },
    ],
  },
];

export const REPO_COUNTS = [
  { repo: "eux-web-app", prs: 376, dependabot: 314 },
  { repo: "eux-neessi", prs: 105, dependabot: 3 },
];
