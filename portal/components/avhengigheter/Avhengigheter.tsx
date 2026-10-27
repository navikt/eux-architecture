"use client";

import type { CSSProperties, PointerEvent } from "react";
import { BodyLong, Detail, Heading } from "@navikt/ds-react";
import {
  ArrowRightIcon,
  ArrowsCirclepathIcon,
  BandageIcon,
  ExternalLinkIcon,
  LayersIcon,
  MagnifyingGlassIcon,
  PackageIcon,
  PlantIcon,
  ShieldCheckmarkIcon,
  SparklesIcon,
  HourglassIcon,
  CloudIcon,
} from "@navikt/aksel-icons";
import { Section } from "@/components/page/Section";
import { JumpNav } from "@/components/page/JumpNav";
import { Pitfalls } from "@/components/page/Pitfalls";
import { Glossary } from "@/components/page/Glossary";
import { FurtherReading } from "@/components/page/FurtherReading";
import { ExtLink } from "@/components/page/ExtLink";
import { usePointerParallax } from "@/components/ny-i-teamet/hooks";
import {
  DEPENDABOT_BACKEND,
  FRONTEND_PRACTICE,
  FURTHER,
  GLOSSARY,
  NAIS_VULNERABILITIES,
  OVERRIDE_STEPS,
  PARENT_POM_REPO,
  POM_RULES,
  PRINCIPLES,
  SHORT_VERSION,
  SPRING_BOOT_VERSIONS,
  SPRING_LINE,
  TOKEN_SUPPORT_REPO,
  WEB_APP_REPO,
  type PrincipleIcon,
} from "./data";
import { HeroArt } from "./HeroArt";
import { LayerStack } from "./LayerStack";
import { VersionGuide } from "./VersionGuide";
import { PomCompare } from "./PomCompare";
import { OverrideTimeline } from "./OverrideTimeline";
import { Cycle } from "./Cycle";
import { TokenSync } from "./TokenSync";
import { FrontendHistory, FrontendWeek } from "./Frontend";

const SECTIONS = [
  { id: "prinsipper", label: "Prinsipper" },
  { id: "lagene", label: "Lagene" },
  { id: "token-support", label: "token-support" },
  { id: "hvor", label: "Hvor?" },
  { id: "ren-pom", label: "Ren POM" },
  { id: "avvik", label: "Avvik" },
  { id: "rytme", label: "Rytmen" },
  { id: "sarbarheter", label: "Sårbarheter" },
  { id: "frontend", label: "Frontend" },
  { id: "fallgruver", label: "Fallgruver" },
  { id: "ordliste", label: "Ordliste" },
  { id: "videre", label: "Videre" },
];

const ICONS: Record<PrincipleIcon, typeof PlantIcon> = {
  plant: PlantIcon,
  layers: LayersIcon,
  flow: ArrowsCirclepathIcon,
  bandage: BandageIcon,
  sparkles: SparklesIcon,
  package: PackageIcon,
};

const FACTS = [
  { value: "1", label: "felles parent-pom" },
  { value: "0", label: "versjoner på det Spring styrer" },
  { value: "daglig", label: "Dependabot i backend" },
  { value: "mandag", label: "Dependabot i frontend" },
];

/* Historikk, november 2025 – oktober 2026: Dependabot-PR-er merget per app. */
const CALM_PRS = 3;
const BUSY_PRS = 55;

const FLOOR = `<plugin>
    <artifactId>maven-enforcer-plugin</artifactId>
    <executions>
        <execution>
            <id>sårbarhetsgulv</id>
            <goals><goal>enforce</goal></goals>
            <configuration>
                <rules>
                    <bannedDependencies>
                        <excludes>
                            <!-- CVE-…: alt under x.y.z er sårbart -->
                            <exclude>org.apache.httpcomponents.client5:httpclient5:(,x.y.z)</exclude>
                        </excludes>
                    </bannedDependencies>
                </rules>
            </configuration>
        </execution>
    </executions>
</plugin>`;

/** Kort som vipper litt mot pekeren, med et lys som følger den. */
function tilt(e: PointerEvent<HTMLElement>) {
  if (e.pointerType !== "mouse") return;
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--rx", `${(((e.clientY - r.top) / r.height) * 2 - 1) * -3}deg`);
  el.style.setProperty("--ry", `${(((e.clientX - r.left) / r.width) * 2 - 1) * 4}deg`);
  el.style.setProperty("--gx", `${((e.clientX - r.left) / r.width) * 100}%`);
  el.style.setProperty("--gy", `${((e.clientY - r.top) / r.height) * 100}%`);
}

function untilt(e: PointerEvent<HTMLElement>) {
  e.currentTarget.style.removeProperty("--rx");
  e.currentTarget.style.removeProperty("--ry");
}

function Dots({ n, tone }: { n: number; tone: string }) {
  return (
    <span className="avh-dots" data-tone={tone} aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <i key={i} style={{ "--i": i } as CSSProperties} />
      ))}
    </span>
  );
}

export function Avhengigheter() {
  const heroRef = usePointerParallax<HTMLElement>();

  return (
    <div className="portal-page--wide arch-page avh-page">
      <div className="avh-progress" aria-hidden />

      <header ref={heroRef} className="portal-hero arch-hero avh-hero">
        <HeroArt />
        <div className="arch-hero__text avh-hero__text">
          <Detail className="arch-eyebrow">Retningslinjer · Plattform</Detail>
          <Heading level="1" size="xlarge" spacing className="avh-hero__title">
            Følg Spring. <span className="avh-shine">Ta det med ro.</span>
          </Heading>
          <BodyLong size="large" className="arch-hero__lead">
            Slik velger vi avhengigheter og holder dem oppdatert i eux-appene. Spring Boot bestemmer, eux-parent-pom
            samler, og app-POM-ene holder seg rene. Da blir oppdatering en rolig rutine – ikke et prosjekt.
          </BodyLong>
          <div className="home-cta">
            <a href="#prinsipper" className="home-cta__btn home-cta__btn--primary">
              Prinsippene <ArrowRightIcon aria-hidden />
            </a>
            <a href="#hvor" className="home-cta__btn">
              Hvor skal versjonen stå?
            </a>
            <a href="#frontend" className="home-cta__btn">
              Frontend
            </a>
          </div>
        </div>

        <dl className="avh-facts">
          {FACTS.map((f, i) => (
            <div key={f.label} style={{ "--i": i } as CSSProperties}>
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
      </header>

      <JumpNav sections={SECTIONS} />

      <Section
        id="prinsipper"
        eyebrow="Retningslinjer"
        title="Prinsippene"
        lead="Seks enkle regler. De gjelder alle eux-appene i backend; frontend har sin egen rytme lenger ned."
      >
        <ul className="avh-principles">
          {PRINCIPLES.map((p, i) => {
            const Icon = ICONS[p.icon];
            return (
              <li
                key={p.title}
                className="avh-principle avh-reveal"
                data-tone={p.tone}
                style={{ "--i": i % 3 } as CSSProperties}
                onPointerMove={tilt}
                onPointerLeave={untilt}
              >
                <span className="avh-principle__icon" aria-hidden>
                  <Icon />
                </span>
                <span className="avh-principle__n" aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <Heading level="3" size="small">
                  {p.title}
                </Heading>
                <BodyLong size="small">{p.text}</BodyLong>
              </li>
            );
          })}
        </ul>

        <figure className="avh-short avh-reveal">
          <Detail className="arch-eyebrow">Kortversjonen</Detail>
          <blockquote>{SHORT_VERSION}</blockquote>
        </figure>
      </Section>

      <Section
        id="lagene"
        eyebrow="Maven"
        title="Hvor en versjon kommer fra"
        lead="Tre lag. Versjonene kommer nedenfra og opp: Spring Boot bestemmer det meste, eux-parent-pom legger til det felles, og appen sier bare hva den trenger."
      >
        <LayerStack />
        <BodyLong className="avh-note">
          eux-parent-pom arver ikke fra spring-boot-starter-parent, men importerer{" "}
          <code>spring-boot-dependencies</code> som BOM. Det gir oss kontroll over plugins og Java-versjon – men det
          betyr også at en property som <code>&lt;tomcat.version&gt;</code> i appen <em>ikke</em> endrer Springs
          versjoner. Se fallgruvene.
        </BodyLong>
      </Section>

      <Section
        id="token-support"
        eyebrow="Spring-versjonen"
        title="I takt med token-support"
        lead="Hvilken Spring Boot-versjon skal vi være på? Den samme som Navs token-support er bygget med. De to går i takt."
      >
        <TokenSync />
      </Section>

      <Section
        id="hvor"
        eyebrow="Ny avhengighet"
        title="Hvor skal versjonen stå?"
        lead="Skal du legge til et bibliotek? Svar på noen spørsmål, så får du vite hvor versjonen hører hjemme – om den skal stå noe sted."
      >
        <VersionGuide />
      </Section>

      <Section
        id="ren-pom"
        eyebrow="Maven"
        title="En ren POM"
        lead="Alle POM-er skal være rene og pene. En kort POM er lett å lese, og den får oppdateringene ovenfra uten at noen må gjøre noe."
      >
        <PomCompare />
        <ol className="avh-rules">
          {POM_RULES.map((r, i) => (
            <li key={r.title} className="avh-reveal" style={{ "--i": i % 3 } as CSSProperties}>
              <strong>{r.title}</strong>
              <span>{r.text}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        id="avvik"
        eyebrow="Sikkerhet"
        title="Avvik – og veien tilbake"
        lead="Noen ganger kommer en sårbarhet før Spring rekker å rette den. Da kan vi overstyre en versjon. Men en overstyring er et plaster, ikke en ny vane."
      >
        <ol className="avh-loop">
          {OVERRIDE_STEPS.map((s, i) => (
            <li key={s.title} data-tone={s.tone} className="avh-reveal" style={{ "--i": i } as CSSProperties}>
              <span className="avh-loop__n" aria-hidden>
                {i + 1}
              </span>
              <strong>{s.title}</strong>
              <span>{s.text}</span>
            </li>
          ))}
        </ol>

        <div className="avh-history-card">
          <div className="avh-history-card__head">
            <Detail className="arch-eyebrow">Historikk · eux-parent-pom, nov. 2025 – okt. 2026</Detail>
            <Heading level="3" size="small">
              Overstyringer over tid
            </Heading>
            <BodyLong size="small" className="arch-subtle">
              Hver stolpe er en periode der eux-parent-pom satte versjonen selv i stedet for å følge Spring Boot. Korte
              stolper er målet. Velg en stolpe for å se hvorfor den kom, og hvordan den tok slutt.
            </BodyLong>
          </div>
          <OverrideTimeline />
          <BodyLong size="small" className="avh-history-card__foot">
            Lærdommen: en overstyring koster mer enn den ser ut som. Gamle pinner ble liggende lenge etter at de sluttet å
            gjøre noe, og halve Jackson-pinner ga oss blandede versjoner. I oktober 2026 fjernet vi alle og gikk tilbake
            til Springs versjoner. Kotlin er ikke med i oversikten – den versjonen eier parent-pom-en med vilje.
          </BodyLong>
        </div>

        <div className="avh-floor">
          <div>
            <Detail className="arch-eyebrow">Et alternativ</Detail>
            <Heading level="3" size="small" spacing>
              Et gulv, ikke en pin
            </Heading>
            <BodyLong size="small" spacing>
              Med maven-enforcer kan en app forby sårbare versjoner uten å låse versjonen. Bygget feiler hvis en eldre
              versjon sniker seg inn, men Spring styrer fortsatt. Gulvet er også midlertidig – fjern det når Spring er
              forbi.
            </BodyLong>
          </div>
          <pre className="avh-code">
            <code>{FLOOR}</code>
          </pre>
        </div>
      </Section>

      <Section
        id="rytme"
        eyebrow="Oppdatering"
        title="Rytmen"
        lead="Oppdateringer kommer i en rolig sirkel: Spring Boot slipper, eux-parent-pom følger etter, og appene løfter parent. Dependabot tar resten."
      >
        <Cycle />

        <div className="avh-rhythm">
          <div className="avh-panel">
            <Detail className="arch-eyebrow">Dependabot i backend</Detail>
            <dl className="avh-config">
              {DEPENDABOT_BACKEND.map((c) => (
                <div key={c.label}>
                  <dt>{c.label}</dt>
                  <dd>
                    <code>{c.value}</code>
                  </dd>
                </div>
              ))}
            </dl>
            <BodyLong size="small" className="arch-subtle">
              Karantenen gir nye versjoner tid til å modnes – og andre tid til å oppdage en kompromittert pakke – før vi
              tar dem inn.
            </BodyLong>
          </div>

          <div className="avh-panel">
            <Detail className="arch-eyebrow">Historikk · siste år</Detail>
            <Heading level="3" size="small" spacing>
              Rene POM-er gir roligere uker
            </Heading>
            <div className="avh-compare">
              <div>
                <Dots n={CALM_PRS} tone="success" />
                <span>
                  <strong>En håndfull</strong> Dependabot-PR-er per app med ren POM
                </span>
              </div>
              <div>
                <Dots n={BUSY_PRS} tone="warning" />
                <span>
                  <strong>Over 50</strong> per app med egne versjonslister
                </span>
              </div>
            </div>
            <BodyLong size="small" className="arch-subtle">
              Når versjonene bor i parent-pom-en, kommer oppdateringene som én parent-løfting i stedet for mange små PR-er.
            </BodyLong>
          </div>
        </div>

        <div className="avh-springline">
          <Detail className="arch-eyebrow">Historikk · Spring Boot-linjene i eux-parent-pom</Detail>
          <ol>
            {SPRING_LINE.map((s, i) => (
              <li key={s.line} className="avh-reveal" style={{ "--i": i } as CSSProperties} data-major={s.line.endsWith(".0") || undefined}>
                <span className="avh-springline__dot" aria-hidden />
                <strong>{s.line}</strong>
                <time>{s.date}</time>
                {s.note && <span>{s.note}</span>}
              </li>
            ))}
          </ol>
        </div>
      </Section>

      <Section
        id="sarbarheter"
        eyebrow="Sikkerhet"
        title="Sårbarheter"
        lead="Vi følger med på sårbarheter i NAIS Console. Det er der vi oppdager når noe må gjøres – og der vi ser at det er gjort."
      >
        <div className="avh-vuln">
          <a href={NAIS_VULNERABILITIES} target="_blank" rel="noreferrer" className="avh-radar" onPointerMove={tilt} onPointerLeave={untilt}>
            <svg viewBox="-60 -60 120 120" aria-hidden>
              <circle r={52} className="avh-radar__ring" />
              <circle r={36} className="avh-radar__ring" />
              <circle r={20} className="avh-radar__ring" />
              <path d="M 0 0 L 0 -52 A 52 52 0 0 1 36.8 -36.8 Z" className="avh-radar__sweep" />
              <circle cx={22} cy={-30} r={2.6} className="avh-radar__blip" />
              <circle cx={-28} cy={14} r={2.2} className="avh-radar__blip avh-radar__blip--b" />
            </svg>
            <span className="avh-radar__text">
              <ShieldCheckmarkIcon aria-hidden />
              <strong>NAIS Console</strong>
              <span>Sårbarheter for team eessibasis</span>
              <span className="avh-radar__go">
                Åpne <ExternalLinkIcon title="åpnes i ny fane" />
              </span>
            </span>
          </a>
          <ul className="avh-vuln__points">
            <li className="avh-reveal" style={{ "--i": 0 } as CSSProperties}>
              <MagnifyingGlassIcon aria-hidden />
              <span>
                <strong>Hvor vi ser.</strong> <code>nais/docker-build-push</code> lager en SBOM for hvert image. NAIS
                bruker den til å vise sårbarhetene per app.
              </span>
            </li>
            <li className="avh-reveal" style={{ "--i": 1 } as CSSProperties}>
              <HourglassIcon aria-hidden />
              <span>
                <strong>Hva vi gjør.</strong> Er sårbarheten akutt og ikke rettet av Spring, overstyrer vi. Ellers venter
                vi på neste Spring Boot-patch – den er sjelden mer enn noen uker unna.
              </span>
            </li>
            <li className="avh-reveal" style={{ "--i": 2 } as CSSProperties}>
              <CloudIcon aria-hidden />
              <span>
                <strong>Imaget teller også.</strong> Base-imaget er en avhengighet. Vi bruker i hovedsak Chainguard-images
                fra Navs speil, både for JRE og Node.
              </span>
            </li>
          </ul>
        </div>
      </Section>

      <Section
        id="frontend"
        eyebrow="eux-web-app"
        title="Frontend"
        lead="nEESSI har ingen parent-pom å lene seg på. Her er det npm, package-lock og en fast ukerytme som holder pakkene ferske."
      >
        <div className="avh-front">
          <div className="avh-front__text">
            <BodyLong spacing>
              <ExtLink href={WEB_APP_REPO}>eux-web-app</ExtLink> har én <code>package.json</code> for både React-appen og
              Express-serveren. Alle versjoner er eksakte, og CI installerer med <code>npm ci --ignore-scripts</code>.
              Pakkene fra <code>@navikt</code> hentes fra GitHub Packages med et lesetoken.
            </BodyLong>
            <BodyLong>
              Frontend får mange oppdateringer. Det siste året har eux-web-app fått over 300 Dependabot-PR-er – flere enn
              alle de andre eux-appene til sammen. Rytmen under er det vi har landet på for å holde tritt uten å drukne.
            </BodyLong>
          </div>
          <FrontendWeek />
        </div>

        <ul className="avh-practice">
          {FRONTEND_PRACTICE.map((p, i) => (
            <li key={p.title} className="avh-reveal" style={{ "--i": i % 3 } as CSSProperties}>
              <strong>{p.title}</strong>
              <span>{p.text}</span>
            </li>
          ))}
        </ul>

        <div className="avh-history-wrap">
          <Detail className="arch-eyebrow">Historikk · eux-web-app, 2018–2026</Detail>
          <Heading level="3" size="small" spacing>
            Hvordan vi kom hit
          </Heading>
          <FrontendHistory />
        </div>
      </Section>

      <Section id="fallgruver" eyebrow="Lær av oss" title="Fallgruver">
        <Pitfalls
          groups={[
            {
              group: "Maven",
              items: [
                {
                  title: "En property i appen endrer ikke Springs versjon",
                  body: (
                    <>
                      eux-parent-pom importerer Spring Boot som BOM. Da hjelper det ikke å sette{" "}
                      <code>&lt;tomcat.version&gt;</code> i appen. Du må legge artefaktene inn i{" "}
                      <code>dependencyManagement</code> med versjon – helst i parent-pom-en.
                    </>
                  ),
                },
                {
                  title: "Rekkefølgen på BOM-er betyr noe",
                  body: (
                    <>
                      Første BOM som nevner en artefakt, vinner. En BOM som skal overstyre Spring, må stå{" "}
                      <em>før</em> <code>spring-boot-dependencies</code>. Det lærte vi med Jackson i august 2026.
                    </>
                  ),
                },
                {
                  title: "Spring Boot foran token-support",
                  body: (
                    <>
                      En ny Spring Boot kan være ute før token-support har tatt den inn. Løfter vi likevel, kjører
                      innloggingen på en Spring-versjon den ikke er testet mot. Sjekk{" "}
                      <ExtLink href={TOKEN_SUPPORT_REPO}>token-support</ExtLink> først, og løft begge sammen.
                    </>
                  ),
                },
                {
                  title: "Overstyr hele familien",
                  body: "Tomcat, Jackson og Netty består av mange artefakter. Overstyrer du bare én, får du blandede versjoner som ikke passer sammen.",
                },
                {
                  title: "Glemte overstyringer blir nye sårbarheter",
                  body: "En overstyring stopper Springs oppdateringer for den artefakten. Blir den liggende, er det snart den som er gammel. Skriv når den kan fjernes.",
                },
                {
                  title: "Dependabot ser ikke parent-pom-en",
                  body: (
                    <>
                      eux-parent-pom ligger i GitHub Packages, som Dependabot ikke leser for Maven hos oss. Ny parent-versjon
                      må løftes i appene for hånd. Se <ExtLink href={PARENT_POM_REPO}>taggene i eux-parent-pom</ExtLink>.
                    </>
                  ),
                },
              ],
            },
            {
              group: "Frontend",
              items: [
                {
                  title: "^ sniker seg inn",
                  body: (
                    <>
                      <code>npm install pakke</code> skriver <code>^</code> som standard. Bruk <code>--save-exact</code>, eller
                      sett <code>save-exact=true</code> lokalt.
                    </>
                  ),
                },
                {
                  title: "Major kommer ikke av seg selv",
                  body: "Dependabot hopper over major-versjoner. Lag en Jira-oppgave, så de ikke blir glemt – Aksel 8 kom slik.",
                },
                {
                  title: "Også en patch kan knekke",
                  body: "En patch av @types/lodash knakk bygget i 2023, og i desember 2025 måtte vi rulle tilbake designsystem-pakkene. Samle-PR-en bygges og testes før den merges.",
                },
              ],
            },
          ]}
        />
      </Section>

      <Section id="ordliste" eyebrow="Ord" title="Ordliste">
        <Glossary entries={GLOSSARY} />
      </Section>

      <Section
        id="videre"
        eyebrow="Les mer"
        title="Videre"
        lead={
          <>
            Usikker på om Spring styrer et bibliotek? <ExtLink href={SPRING_BOOT_VERSIONS}>Slå det opp</ExtLink> før du
            skriver en versjon.
          </>
        }
      >
        <FurtherReading links={FURTHER} />
      </Section>
    </div>
  );
}
