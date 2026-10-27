/**
 * Innholdet på /avhengigheter. Siden er en retningslinje, ikke en statustavle:
 * den sier ikke hvilken app som står på hvilken versjon. Datoer og tall merket
 * som historikk er hentet fra git-historikken til eux-parent-pom og eux-web-app.
 */

import type { FurtherLink } from "@/components/page/FurtherReading";
import type { GlossaryEntry } from "@/components/page/Glossary";
import type { Tone } from "@/lib/tones";

export const PARENT_POM_REPO = "https://github.com/navikt/eux-parent-pom";
export const VERSIONS_PLUGIN_REPO = "https://github.com/navikt/eux-versions-maven-plugin";
export const WEB_APP_REPO = "https://github.com/navikt/eux-web-app";
export const NAIS_VULNERABILITIES = "https://console.nav.cloud.nais.io/team/eessibasis/vulnerabilities";
export const NAIS_VULN_DOCS = "https://docs.nais.io/services/vulnerabilities/";
export const SPRING_BOOT_VERSIONS = "https://docs.spring.io/spring-boot/appendix/dependency-versions/index.html";
export const DEPENDABOT_DOCS =
  "https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference";

export const SHORT_VERSION =
  "Vi lar Spring Boot bestemme versjonene, samler resten i eux-parent-pom og holder app-POM-ene rene. Avviker vi fra Spring, er det for å tette en akutt sårbarhet – og bare til Spring har tatt oss igjen.";

/* ---------- Prinsipper ---------- */

export type PrincipleIcon = "plant" | "layers" | "flow" | "bandage" | "sparkles" | "package";

export const PRINCIPLES: { icon: PrincipleIcon; tone: Tone; title: string; text: string }[] = [
  {
    icon: "plant",
    tone: "success",
    title: "Spring først",
    text: "Spring er rammeverket vi velger. Vi går for noe annet bare når vi har en konkret grunn – det har fungert godt for oss.",
  },
  {
    icon: "layers",
    tone: "accent",
    title: "Én parent-pom",
    text: "eux-parent-pom er stedet for felles versjoner og plugins. Appene arver dem i stedet for å bestemme selv.",
  },
  {
    icon: "flow",
    tone: "info",
    title: "Følg Springs versjoner",
    text: "Det Spring Boot styrer, lar vi Spring styre. Spring tester bibliotekene sammen, så vi slipper å gjøre det selv.",
  },
  {
    icon: "bandage",
    tone: "warning",
    title: "Avvik bare når det haster",
    text: "Vi overstyrer en Spring-versjon bare for å tette en akutt sårbarhet. Og vi går tilbake så snart Spring har tatt oss igjen.",
  },
  {
    icon: "sparkles",
    tone: "meta-purple",
    title: "Rene POM-er",
    text: "En app-POM skal være kort og pen: parent, avhengigheter uten versjon, og egne versjoner samlet som properties.",
  },
  {
    icon: "package",
    tone: "meta-lime",
    title: "Maven",
    text: "Backend bygges med Maven. Parent-POM, BOM-er og dependencyManagement er mekanismene alt dette hviler på.",
  },
];

/* ---------- Lagene ---------- */

export type LayerId = "spring" | "parent" | "app";

export type Layer = {
  id: LayerId;
  tone: Tone;
  name: string;
  code: string;
  role: string;
  text: string;
  owns: string[];
};

/** Øverst først, slik de ligger i stabelen. */
export const LAYERS: Layer[] = [
  {
    id: "app",
    tone: "meta-purple",
    name: "App-POM-en",
    code: "pom.xml",
    role: "Bruker",
    text: "Sier hvilke avhengigheter appen trenger – ikke hvilke versjoner. Bare biblioteker som ingen over styrer, får en versjon her, som property øverst i fila.",
    owns: [
      "Hvilke avhengigheter appen bruker",
      "Versjoner for biblioteker bare denne appen trenger",
      "App-spesifikke plugins, for eksempel OpenAPI-generering",
    ],
  },
  {
    id: "parent",
    tone: "accent",
    name: "eux-parent-pom",
    code: "no.nav.eux:parent-pom",
    role: "Samler",
    text: "Importerer Spring Boot og Kotlin som BOM-er og legger til det Spring ikke har. Hver endring på main blir en ny versjon i GitHub Packages.",
    owns: [
      "Spring Boot-versjonen – én linje",
      "Java- og Kotlin-versjonen",
      "Navs token-support, kotlin-logging, Kotest, springdoc og eux-logging",
      "Versjonene til Maven-pluginene",
      "Midlertidige sikkerhetsoverstyringer – når det trengs",
    ],
  },
  {
    id: "spring",
    tone: "success",
    name: "Spring Boot",
    code: "spring-boot-dependencies",
    role: "Grunnmur",
    text: "Spring Boots BOM styrer versjonene til flere hundre biblioteker som er testet sammen. Det meste en app trenger, finnes allerede her.",
    owns: [
      "Tomcat, Jackson og Netty",
      "Kafka-klienten og Spring Kafka",
      "Flyway og PostgreSQL-driveren",
      "Logback, Micrometer, JUnit og Mockito",
    ],
  },
];

/* ---------- Hvor skal versjonen stå? ---------- */

export type GuideQuestion = {
  kind: "question";
  question: string;
  hint: string;
  ja: string;
  nei: string;
};

export type GuideResult = {
  kind: "result";
  tone: Tone;
  title: string;
  text: string;
  snippet: string;
};

export const GUIDE_START = "trengs";

export const GUIDE: Record<string, GuideQuestion | GuideResult> = {
  trengs: {
    kind: "question",
    question: "Kan Spring, eller noe vi allerede har, gjøre jobben?",
    hint: "Hver ny avhengighet er noe som skal holdes oppdatert. Den beste avhengigheten er den vi slipper.",
    ja: "bruk-det-vi-har",
    nei: "spring-styrer",
  },
  "spring-styrer": {
    kind: "question",
    question: "Styrer Spring Boot versjonen av biblioteket?",
    hint: "Slå det opp i Spring Boots liste over avhengighetsversjoner, eller se om IDE-en viser versjonen som arvet.",
    ja: "akutt",
    nei: "flere-apper",
  },
  akutt: {
    kind: "question",
    question: "Har versjonen en akutt sårbarhet som Spring ikke har rettet ennå?",
    hint: "Se i NAIS Console. Ofte er neste Spring Boot-patch bare noen uker unna.",
    ja: "overstyr",
    nei: "ingen-versjon",
  },
  "flere-apper": {
    kind: "question",
    question: "Kommer flere apper til å bruke biblioteket?",
    hint: "Navs token-support, kotlin-logging og Kotest er typiske eksempler på biblioteker appene deler.",
    ja: "i-parent",
    nei: "i-appen",
  },
  "bruk-det-vi-har": {
    kind: "result",
    tone: "success",
    title: "Bruk det vi har",
    text: "Færre avhengigheter betyr færre oppdateringer og færre sårbarheter. Spring har ofte allerede det du trenger.",
    snippet: "<!-- Ingenting å legge til. -->",
  },
  "ingen-versjon": {
    kind: "result",
    tone: "success",
    title: "Ingen versjon",
    text: "Skriv bare groupId og artifactId. Versjonen kommer fra Spring Boot via eux-parent-pom, og følger med når parent-pom-en oppdateres.",
    snippet: `<dependency>
    <groupId>org.springframework.kafka</groupId>
    <artifactId>spring-kafka</artifactId>
</dependency>`,
  },
  "i-parent": {
    kind: "result",
    tone: "accent",
    title: "Legg den i eux-parent-pom",
    text: "Versjonen blir en property og en oppføring i dependencyManagement i eux-parent-pom. Appene bruker den uten versjon.",
    snippet: `<properties>
    <kotest.version>…</kotest.version>
</properties>

<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>io.kotest</groupId>
            <artifactId>kotest-assertions-core-jvm</artifactId>
            <version>\${kotest.version}</version>
        </dependency>
    </dependencies>
</dependencyManagement>`,
  },
  "i-appen": {
    kind: "result",
    tone: "meta-purple",
    title: "Versjon som property i appen",
    text: "Samle versjonen øverst i appens POM, aldri inne i en dependency. Dependabot holder den oppdatert.",
    snippet: `<properties>
    <pdfbox.version>…</pdfbox.version>
</properties>

<dependency>
    <groupId>org.apache.pdfbox</groupId>
    <artifactId>pdfbox</artifactId>
    <version>\${pdfbox.version}</version>
</dependency>`,
  },
  overstyr: {
    kind: "result",
    tone: "warning",
    title: "Overstyr – midlertidig",
    text: "Overstyr i eux-parent-pom, så alle appene får fiksen. Skriv hvorfor og når den kan fjernes. Når Spring Boot har tatt oss igjen, fjerner vi den.",
    snippet: `<!-- CVE-…: fjernes når Spring Boot
     styrer en versjon med fiksen -->
<dependency>
    <groupId>org.apache.tomcat.embed</groupId>
    <artifactId>tomcat-embed-core</artifactId>
    <version>\${tomcat.version}</version>
</dependency>`,
  },
};

/* ---------- Ren POM ---------- */

export const POM_RULES: { title: string; text: string }[] = [
  { title: "eux-parent-pom som parent", text: "Da får appen Spring Boot, Kotlin, Java-versjon og plugins i én linje." },
  { title: "Ingen versjon på det Spring eller parent styrer", text: "En versjon her stopper oppdateringene som kommer ovenfra." },
  { title: "Egne versjoner som properties", text: "Samlet øverst i fila, aldri skrevet rett inn i en dependency." },
  { title: "Kommentar på hver overstyring", text: "Hvorfor – gjerne med CVE-nummeret – og når den kan fjernes." },
  { title: "Ingen ubrukte avhengigheter", text: "mvn dependency:analyze viser hva som er deklarert, men ikke brukt." },
  { title: "Fast rekkefølge", text: "parent, properties, dependencies, build – så alle POM-ene leses likt." },
];

export type PomLine = { text: string; note?: number };

export const POM_MESSY: PomLine[] = [
  { text: "<parent>" },
  { text: "    <groupId>no.nav.eux</groupId>" },
  { text: "    <artifactId>parent-pom</artifactId>" },
  { text: "    <version>…</version>" },
  { text: "</parent>" },
  { text: "" },
  { text: "<dependencies>" },
  { text: "    <dependency>" },
  { text: "        <groupId>org.springframework.kafka</groupId>" },
  { text: "        <artifactId>spring-kafka</artifactId>" },
  { text: "        <version>4.0.2</version>", note: 1 },
  { text: "    </dependency>" },
  { text: "    <dependency>" },
  { text: "        <groupId>org.apache.tomcat.embed</groupId>", note: 2 },
  { text: "        <artifactId>tomcat-embed-core</artifactId>", note: 2 },
  { text: "        <version>11.0.21</version>", note: 2 },
  { text: "    </dependency>" },
  { text: "    <dependency>" },
  { text: "        <groupId>commons-io</groupId>", note: 3 },
  { text: "        <artifactId>commons-io</artifactId>", note: 3 },
  { text: "        <version>2.18.0</version>", note: 3 },
  { text: "    </dependency>" },
  { text: "</dependencies>" },
];

export const POM_CLEAN: PomLine[] = [
  { text: "<parent>" },
  { text: "    <groupId>no.nav.eux</groupId>" },
  { text: "    <artifactId>parent-pom</artifactId>" },
  { text: "    <version>…</version>" },
  { text: "</parent>" },
  { text: "" },
  { text: "<properties>", note: 4 },
  { text: "    <pdfbox.version>…</pdfbox.version>", note: 4 },
  { text: "</properties>", note: 4 },
  { text: "" },
  { text: "<dependencies>" },
  { text: "    <dependency>", note: 5 },
  { text: "        <groupId>org.springframework.kafka</groupId>", note: 5 },
  { text: "        <artifactId>spring-kafka</artifactId>", note: 5 },
  { text: "    </dependency>", note: 5 },
  { text: "    <dependency>" },
  { text: "        <groupId>org.apache.pdfbox</groupId>" },
  { text: "        <artifactId>pdfbox</artifactId>" },
  { text: "        <version>${pdfbox.version}</version>", note: 4 },
  { text: "    </dependency>" },
  { text: "</dependencies>" },
];

export const POM_NOTES: Record<number, { tone: Tone; text: string }> = {
  1: { tone: "danger", text: "Spring Boot styrer spring-kafka. Versjonen her låser appen fast når Spring går videre." },
  2: { tone: "danger", text: "En overstyring uten kommentar. Hvorfor er den her, og når kan den fjernes? Ingen vet." },
  3: { tone: "danger", text: "Ikke i bruk – og en versjon midt i fila. Den skal bort." },
  4: { tone: "success", text: "Den eneste versjonen appen eier, samlet som property øverst." },
  5: { tone: "success", text: "Ingen versjon. Den kommer fra Spring Boot og følger med neste parent-pom." },
};

/* ---------- Avvik: historikk fra eux-parent-pom ---------- */

/**
 * Historikk: hvor mange Spring-styrte artefakter som var overstyrt i
 * eux-parent-pom etter hver endring, november 2025 – oktober 2026.
 */
export const DRIFT: { date: string; n: number; boot?: string; text: string }[] = [
  { date: "2025-11-19", n: 1, boot: "3.5.7", text: "PostgreSQL-driveren er overstyrt." },
  { date: "2025-11-24", n: 1, boot: "4.0.0", text: "Spring Boot 4. Ny major – PostgreSQL-overstyringen blir med." },
  { date: "2025-12-28", n: 1, boot: "4.0.1", text: "Spring Boot 4.0.1." },
  { date: "2026-02-23", n: 1, boot: "4.0.3", text: "Spring Boot 4.0.3." },
  { date: "2026-03-23", n: 1, boot: "4.0.4", text: "Spring Boot 4.0.4." },
  { date: "2026-04-08", n: 3, boot: "4.0.5", text: "Jackson 3 overstyres i tillegg." },
  { date: "2026-04-24", n: 0, boot: "4.0.6", text: "Spring Boot 4.0.6 tar oss igjen. Alle overstyringene fjernes." },
  { date: "2026-06-23", n: 0, boot: "4.0.7", text: "Spring Boot 4.0.7, og Dependabot slås på i parent-pom-en." },
  { date: "2026-06-24", n: 11, text: "Jackson 2 og 3 overstyres – BOM-er, kjerneartefakter og Kotlin-modulen." },
  { date: "2026-07-02", n: 0, boot: "4.1.0", text: "Spring Boot 4.1. Overstyringene fjernes igjen." },
  { date: "2026-08-04", n: 9, text: "Jackson overstyres på nytt." },
  { date: "2026-08-14", n: 11, text: "Jackson-BOM-ene flyttes før Spring Boot – ellers ble versjonene blandet." },
  { date: "2026-09-07", n: 12, text: "Tomcat overstyres også." },
  {
    date: "2026-10-05",
    n: 0,
    boot: "4.1.1",
    text: "Vi prøver Springs egne versjoner og ser hvor mange sårbarheter det gir – og fjerner alle overstyringene.",
  },
  { date: "2026-10-26", n: 0, boot: "4.1.2", text: "Spring Boot 4.1.2 og Java 25. Ingen overstyringer." },
];

export const OVERRIDE_STEPS: { title: string; text: string; tone: Tone }[] = [
  { title: "Oppdag", text: "NAIS Console viser en sårbarhet i et bibliotek Spring Boot styrer.", tone: "danger" },
  { title: "Vurder", text: "Er den akutt, og har ikke Spring rettet den? Hvis ikke, venter vi på neste Spring Boot-patch.", tone: "warning" },
  { title: "Overstyr", text: "I eux-parent-pom, med kommentar – og for hele familien av artefakter, ikke bare én.", tone: "accent" },
  { title: "Gå tilbake", text: "Når Spring Boot har tatt oss igjen, fjerner vi overstyringen og følger Spring igjen.", tone: "success" },
];

/* ---------- Rytmen ---------- */

export const CYCLE: { title: string; who: string; text: string; tone: Tone }[] = [
  {
    title: "Spring Boot slipper",
    who: "Spring",
    text: "Spring Boot kommer med en patch omtrent hver måned og en ny minor-versjon to ganger i året.",
    tone: "success",
  },
  {
    title: "Vi løfter eux-parent-pom",
    who: "Teamet",
    text: "Vi løfter spring.boot.version og ser over resten. Dependabot foreslår versjonene parent-pom-en eier selv.",
    tone: "accent",
  },
  {
    title: "Ny parent-versjon",
    who: "GitHub Actions",
    text: "Hver push til main gir en ny versjon. eux-versions-maven-plugin finner neste nummer ut fra git-taggene, og pom-en publiseres til GitHub Packages.",
    tone: "info",
  },
  {
    title: "Appene løfter parent",
    who: "Teamet",
    text: "Dependabot ser ikke parent-pom-en i GitHub Packages, så vi løfter parent-versjonen i appene selv. Dependabot tar resten.",
    tone: "meta-purple",
  },
  {
    title: "Bygg og skann",
    who: "NAIS",
    text: "nais/docker-build-push lager en SBOM for hvert image, og NAIS Console viser sårbarhetene. Så starter sirkelen på nytt.",
    tone: "warning",
  },
];

export const DEPENDABOT_BACKEND: { label: string; value: string }[] = [
  { label: "Økosystem", value: "maven" },
  { label: "Ser etter", value: "daglig" },
  { label: "Patch venter", value: "4 dager" },
  { label: "Minor venter", value: "7 dager" },
  { label: "Major venter", value: "30 dager" },
  { label: "Commit", value: "chore(deps)" },
];

/** Historikk: når eux-parent-pom tok inn hver Spring Boot-linje. */
export const SPRING_LINE: { line: string; date: string; note?: string }[] = [
  { line: "3.1", date: "jul. 2023", note: "eux-parent-pom blir til" },
  { line: "3.2", date: "des. 2023", note: "Java 21" },
  { line: "3.3", date: "aug. 2024" },
  { line: "3.4", date: "nov. 2024" },
  { line: "3.5", date: "mai 2025" },
  { line: "4.0", date: "nov. 2025", note: "Ny major" },
  { line: "4.1", date: "jul. 2026", note: "Java 25 i oktober" },
];

/* ---------- Frontend ---------- */

export const FRONTEND_PRACTICE: { title: string; text: string }[] = [
  {
    title: "Eksakte versjoner",
    text: "Ingen ^ eller ~ i package.json. Det som står der, er det som kjører – og det som er testet.",
  },
  {
    title: "Dependabot hver mandag",
    text: "Kl. 08.00, med sju dagers karantene for nye versjoner og maks 15 åpne PR-er.",
  },
  {
    title: "Én samle-PR",
    text: "Ukens Dependabot-PR-er slås sammen til én, som bygges og testes samlet før den merges.",
  },
  {
    title: "Major er planlagt arbeid",
    text: "Dependabot hopper over major-versjoner. De tas som egne oppgaver i Jira, med tid til å teste.",
  },
  {
    title: "npm ci --ignore-scripts",
    text: "Installerer fra låsefila uten å kjøre pakkenes egne skript – et lite, men viktig vern mot angrep via pakker.",
  },
  {
    title: "Ingen ubrukte pakker",
    text: "knip finner pakker som ikke brukes. Det som ikke er der, trenger ingen oppdatering.",
  },
];

export const WEEK: { day: string; short: string; kind: "bot" | "combine" | "rest"; text: string }[] = [
  { day: "Mandag", short: "man", kind: "bot", text: "Kl. 08.00 åpner Dependabot PR-er – bare for versjoner som har vært ute i minst sju dager." },
  { day: "Tirsdag", short: "tir", kind: "combine", text: "I løpet av uka slår vi PR-ene sammen til én samle-PR som bygges og testes." },
  { day: "Onsdag", short: "ons", kind: "combine", text: "I løpet av uka slår vi PR-ene sammen til én samle-PR som bygges og testes." },
  { day: "Torsdag", short: "tor", kind: "combine", text: "I løpet av uka slår vi PR-ene sammen til én samle-PR som bygges og testes." },
  { day: "Fredag", short: "fre", kind: "combine", text: "I løpet av uka slår vi PR-ene sammen til én samle-PR som bygges og testes." },
  { day: "Lørdag", short: "lør", kind: "rest", text: "Helg. Dependabot er stille til neste mandag." },
  { day: "Søndag", short: "søn", kind: "rest", text: "Helg. Dependabot er stille til neste mandag." },
];

/** Historikk: milepæler fra git-historikken til eux-web-app. */
export const FRONTEND_HISTORY: { date: string; title: string; text: string; tone: Tone }[] = [
  { date: "2018", title: "Create React App", text: "nEESSI starter som en Create React App.", tone: "neutral" },
  { date: "2020", title: "TypeScript", text: "TypeScript tas i bruk for alvor, og alle pakkene oppdateres.", tone: "info" },
  { date: "2023", title: "Også patcher kan knekke", text: "En ny patch av @types/lodash knekker bygget, og versjonen låses.", tone: "warning" },
  { date: "mar. 2025", title: "Vite", text: "Fra Create React App til Vite, og Dependabot-varsler slås på.", tone: "accent" },
  { date: "nov. 2025", title: "Node og Chainguard", text: "Node 18 → 20 → 22 på en uke, og et Chainguard-image fra Navs speil.", tone: "info" },
  { date: "des. 2025", title: "Låste versjoner", text: "Eksakte versjoner, karantene i Dependabot, --ignore-scripts og knip.", tone: "success" },
  { date: "jan.–feb. 2026", title: "Farvel, styled-components", text: "Komponent for komponent over til CSS-moduler, til pakken kunne fjernes.", tone: "meta-purple" },
  { date: "mar. 2026", title: "Aksel 8", text: "Hele appen over på Aksel 8, med hjelp fra Copilot.", tone: "accent" },
  { date: "mai 2026", title: "React 19", text: "React 18 → 19, og alle versjonene låses på nytt.", tone: "info" },
  { date: "jun. 2026", title: "Node 24 og Vite 8", text: "Ny Node i bygg og image, og Vite 8 via Dependabot.", tone: "success" },
];

/* ---------- Ordliste og videre ---------- */

export const GLOSSARY: GlossaryEntry[] = [
  { term: "BOM", full: "Bill of Materials", text: "En POM som bare lister versjoner. Spring Boot, Kotlin og Jackson har hver sin." },
  { term: "Parent-POM", text: "En POM appene arver fra. Vår heter eux-parent-pom." },
  { term: "dependencyManagement", text: "Bestemmer versjonen en avhengighet får hvis den brukes – uten å legge den til." },
  { term: "Overstyring", text: "En versjon vi setter selv for et bibliotek Spring Boot ellers ville styrt." },
  { term: "Dependabot", text: "GitHubs robot som åpner PR-er når nye versjoner kommer." },
  { term: "Karantene", full: "cooldown", text: "Antall dager Dependabot venter før den foreslår en ny versjon." },
  { term: "SBOM", full: "Software Bill of Materials", text: "Listen over alt et image inneholder. NAIS bruker den til å finne sårbarheter." },
  { term: "CVE", full: "Common Vulnerabilities and Exposures", text: "Et offentlig nummer for en kjent sårbarhet." },
];

export const FURTHER: FurtherLink[] = [
  { href: PARENT_POM_REPO, title: "eux-parent-pom", text: "Felles versjoner og plugins for backend.", external: true },
  { href: NAIS_VULNERABILITIES, title: "Sårbarheter i NAIS Console", text: "Teamets sårbarheter, per app og image.", external: true },
  { href: SPRING_BOOT_VERSIONS, title: "Spring Boots versjoner", text: "Alt Spring Boot styrer – sjekk her før du skriver en versjon.", external: true },
  { href: VERSIONS_PLUGIN_REPO, title: "eux-versions-maven-plugin", text: "Finner neste versjon ut fra git-taggene.", external: true },
  { href: WEB_APP_REPO, title: "eux-web-app", text: "nEESSI – package.json og Dependabot-oppsettet.", external: true },
  { href: NAIS_VULN_DOCS, title: "NAIS: sårbarheter", text: "SBOM, attestering og hvordan NAIS finner sårbarheter.", external: true },
  { href: DEPENDABOT_DOCS, title: "Dependabot-oppsett", text: "Alle valgene i dependabot.yml, også karantene.", external: true },
];
