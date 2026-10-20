import type { ComponentType, SVGProps } from "react";
import NextLink from "next/link";
import { BodyLong, Detail, Heading } from "@navikt/ds-react";
import {
  ArchiveIcon,
  ArrowRightIcon,
  ArrowsSquarepathIcon,
  ClockIcon,
  CloudIcon,
  CodeIcon,
  ComponentIcon,
  ExternalLinkIcon,
  FileTextIcon,
  FilesIcon,
  FolderFileIcon,
  LayersIcon,
  LightningIcon,
  LinkIcon,
  LocationPinIcon,
  PadlockLockedIcon,
  TestFlaskIcon,
  TrashIcon,
  WavesIcon,
  WrenchIcon,
} from "@navikt/aksel-icons";
import { JOB_COUNT, SERVICE_COUNT, TOPIC_COUNT } from "@/components/architecture/data";
import { GLOSSARY_BY_TERM } from "@/components/architecture/glossary";
import { BUCS, JOBS as AVSLUTNING_JOBS } from "@/components/avslutning/data";
import { GRENSE_DAGER, JOBS as SLETTING_JOBS } from "@/components/sletting/data";
import { JOBS as JOURNAL_JOBS } from "@/components/journalfoering/data";
import { PRESETS as ADRESSE_PRESETS } from "@/components/adresse/data";
import type { Tone } from "@/lib/tones";
import { Section } from "@/components/page/Section";

const REPO = "https://github.com/navikt/eux-architecture";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

/* ---------- Innhold ---------- */

const CHAIN: { title: string; sub: string; tone: Tone; ring?: boolean }[] = [
  { title: "Saksbehandler", sub: "i NAV", tone: "neutral" },
  { title: "nEESSI", sub: "eux-web-app i nettleseren", tone: "accent" },
  { title: "EUX", sub: "tjenestene bak, på NAIS", tone: "accent" },
  { title: "RINA", sub: "CPI for kall · NIE for hendelser", tone: "meta-purple" },
  { title: "Andre land", sub: "EU/EØS og Sveits, via EESSI", tone: "warning", ring: true },
];

const FLOWS: { n: number; kind: string; title: string; path: string[]; text: string; href: string; tone: Tone; Icon: Icon }[] = [
  {
    n: 1,
    kind: "Synkront",
    title: "Forespørsler",
    path: ["nEESSI", "eux-neessi", "eux-rina-api", "RINA CPI"],
    text: "Saksbehandleren åpner en sak eller sender en SED. Kallet går gjennom fire ledd, med tokenveksling i hvert av dem.",
    href: "/architecture#foresporsel",
    tone: "accent",
    Icon: ArrowsSquarepathIcon,
  },
  {
    n: 2,
    kind: "Asynkront",
    title: "Hendelser",
    path: ["RINA NIE", "eux-all-rina-events", "Kafka"],
    text: "RINA melder fra om saker og SED-er. Bakgrunnstjenester og andre team reagerer – blant annet journalføring og personoppdatering.",
    href: "/architecture#hendelser",
    tone: "meta-purple",
    Icon: LightningIcon,
  },
  {
    n: 3,
    kind: "Planlagt",
    title: "Om natten",
    path: ["NAIS-jobb", "REST", "bakgrunnstjeneste"],
    text: "NAIS-jobber starter journalavstemming, avslutning og sletting. Jobbene har ingen logikk – den ligger i tjenesten de kaller.",
    href: "/architecture#planlagt",
    tone: "warning",
    Icon: ClockIcon,
  },
];

type NavLink = {
  href: string;
  title: string;
  text: string;
  Icon: Icon;
  meta?: string;
  external?: boolean;
  locked?: boolean;
};

const AREAS: { id: string; title: string; lead: string; tone: Tone; Icon: Icon; live?: boolean; links: NavLink[] }[] = [
  {
    id: "plattform",
    title: "Plattform",
    lead: "Hvordan EUX er bygget, og hvor det kjører.",
    tone: "accent",
    Icon: LayersIcon,
    links: [
      {
        href: "/architecture",
        title: "Arkitektur",
        text: "Interaktivt kart over tjenestene, de tre flytene, mønstre og fallgruver.",
        Icon: LayersIcon,
      },
      {
        href: "/applications",
        title: "Applikasjoner",
        text: "Rolle, avhengigheter, Kafka-topics og repo for hver applikasjon.",
        Icon: ComponentIcon,
      },
      {
        href: "/environments",
        title: "Miljøer",
        text: "Q1 og Q2 – RINA-instanser, nEESSI, CPI- og NIE-endepunkter og Swagger.",
        Icon: CloudIcon,
      },
    ],
  },
  {
    id: "prosesser",
    title: "Prosesser",
    lead: "Det som skjer automatisk med sakene og SED-ene.",
    tone: "warning",
    Icon: ClockIcon,
    links: [
      {
        href: "/prosesser/automatisk-avslutning",
        title: "Automatisk avslutning",
        text: "Inaktive RINA-saker lukkes og arkiveres, med egne regler per BUC.",
        meta: `${BUCS.length} BUC-typer · ${AVSLUTNING_JOBS.length} NAIS-jobber`,
        Icon: ArchiveIcon,
      },
      {
        href: "/prosesser/automatisk-sletting",
        title: "Automatisk sletting",
        text: `Saker der ingen SED er sendt eller mottatt, slettes etter ${GRENSE_DAGER} dager.`,
        meta: `${GRENSE_DAGER} dager · ${SLETTING_JOBS.length} NAIS-jobber`,
        Icon: TrashIcon,
      },
      {
        href: "/prosesser/journalfoering",
        title: "Journalføring",
        text: "SED-er arkiveres i Dokarkiv – med tema, enhet og oppgave.",
        meta: `Kafka · ${JOURNAL_JOBS.length} NAIS-jobber`,
        Icon: FolderFileIcon,
      },
      {
        href: "/prosesser/adresseoppdatering",
        title: "Adresseoppdatering",
        text: "Utenlandske adresser fra innkommende SED-er vaskes og sendes til PDL.",
        meta: `Kafka · PDL-Mottak · ${ADRESSE_PRESETS.length} eksempler`,
        Icon: LocationPinIcon,
      },
    ],
  },
  {
    id: "sanntid",
    title: "Sanntid",
    lead: "Hendelser og SED-er fra Q1 og Q2, mens de skjer.",
    tone: "success",
    Icon: WavesIcon,
    live: true,
    links: [
      {
        href: "/kafka/sed-hendelser",
        title: "SED-hendelser",
        text: "Meldingene på sedmottatt og sedsendt i Q1 og Q2.",
        Icon: WavesIcon,
        locked: true,
      },
      {
        href: "/kafka/sed-kobling",
        title: "SED-kobling",
        text: "Kobler samme SED mellom Q1 og Q2 og viser transporttiden.",
        Icon: LinkIcon,
        locked: true,
      },
      {
        href: "/nav-rinasak/sed-er",
        title: "SED-er i nEESSI",
        text: "Saker og SED-er som opprettes i nEESSI og registreres i eux-nav-rinasak.",
        Icon: FilesIcon,
        locked: true,
      },
    ],
  },
  {
    id: "verktoy",
    title: "Verktøy og kilder",
    lead: "Test plattformen, eller gå rett til kildene.",
    tone: "meta-purple",
    Icon: WrenchIcon,
    links: [
      {
        href: "/tests",
        title: "Smoke-test",
        text: "Ende-til-ende-test mot eux-rina-api i Q1 eller Q2.",
        Icon: TestFlaskIcon,
        locked: true,
      },
      {
        href: `${REPO}#readme`,
        title: "README.md",
        text: "Arkitekturbeskrivelsen som tekst, på engelsk.",
        Icon: FileTextIcon,
        external: true,
      },
      {
        href: "https://github.com/orgs/navikt/repositories?q=eux-",
        title: "EUX-repoene",
        text: "Alle eux-repoene i navikt på GitHub.",
        Icon: CodeIcon,
        external: true,
      },
    ],
  },
];

const CRONJOB_COUNT = AVSLUTNING_JOBS.length + SLETTING_JOBS.length + JOURNAL_JOBS.length;

const TERMS = ["EESSI", "RINA", "BUC", "SED", "CPI", "NIE"].map((t) => GLOSSARY_BY_TERM[t]);

/* ---------- Byggeklosser ---------- */

/** Twelve dots in a ring – the same motif as the portal logo. */
function Ring() {
  return (
    <svg viewBox="0 0 20 20" className="home-chain__ring" aria-hidden focusable="false">
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return <circle key={i} cx={(10 + Math.cos(a) * 7).toFixed(2)} cy={(10 + Math.sin(a) * 7).toFixed(2)} r="1.3" />;
      })}
    </svg>
  );
}

function AreaLink({ link }: { link: NavLink }) {
  const body = (
    <>
      <span className="home-link__icon" aria-hidden>
        <link.Icon />
      </span>
      <span className="home-link__body">
        <span className="home-link__title">
          {link.title}
          {link.locked && <PadlockLockedIcon title="Krever innlogging" className="home-link__lock" />}
        </span>
        <span className="home-link__text">{link.text}</span>
        {link.meta && <span className="home-link__meta">{link.meta}</span>}
      </span>
      {link.external ? (
        <ExternalLinkIcon title="åpnes i ny fane" className="home-link__arrow" />
      ) : (
        <ArrowRightIcon aria-hidden className="home-link__arrow" />
      )}
    </>
  );
  return link.external ? (
    <a href={link.href} className="home-link" target="_blank" rel="noreferrer">
      {body}
    </a>
  ) : (
    <NextLink href={link.href} className="home-link">
      {body}
    </NextLink>
  );
}

/* ---------- Side ---------- */

export default function Home() {
  return (
    <div className="portal-page--wide arch-page home-page">
      <header className="portal-hero arch-hero home-hero">
        <div className="arch-hero__text">
          <Detail className="arch-eyebrow">Arkitekturportal · Team EESSI</Detail>
          <Heading level="1" size="xlarge" spacing className="home-hero__title">
            EUX-plattformen, forklart
          </Heading>
          <BodyLong size="large" className="arch-hero__lead">
            EUX er NAVs plattform for EESSI – den elektroniske utvekslingen av trygdeinformasjon med andre land i EU/EØS
            og Sveits. Saksbehandlerne jobber i nEESSI, mens sakene og SED-ene ligger i RINA. EUX binder dette sammen med
            resten av NAV.
          </BodyLong>
          <BodyLong className="home-hero__sub">
            Her finner du hvordan tjenestene henger sammen, hva som skjer automatisk med sakene, og hva som skjer i
            testmiljøene akkurat nå.
          </BodyLong>

          <div className="home-cta">
            <NextLink href="/architecture" className="home-cta__btn home-cta__btn--primary">
              Utforsk arkitekturen <ArrowRightIcon aria-hidden />
            </NextLink>
            <a href={`${REPO}#readme`} className="home-cta__btn" target="_blank" rel="noreferrer">
              Les README-en <ExternalLinkIcon title="åpnes i ny fane" />
            </a>
            <NextLink href="/ny-i-teamet" className="home-cta__btn">
              Ny i teamet? Start her
            </NextLink>
          </div>

          <dl className="home-facts">
            {[
              { n: SERVICE_COUNT, label: "applikasjoner" },
              { n: CRONJOB_COUNT, label: "NAIS-jobber", sub: `i ${JOB_COUNT} repoer` },
              { n: TOPIC_COUNT, label: "Kafka-topics" },
              { n: 2, label: "testmiljøer", sub: "Q1 og Q2" },
            ].map((s) => (
              <div key={s.label}>
                <dt>
                  {s.label}
                  {s.sub && <span className="home-facts__sub">{s.sub}</span>}
                </dt>
                <dd>{s.n}</dd>
              </div>
            ))}
          </dl>
        </div>

        <figure className="home-chain-card">
          <figcaption className="arch-eyebrow">Fra saksbehandler til Europa</figcaption>
          <ol className="home-chain">
            {CHAIN.map((c, i) => (
              <li key={c.title} data-tone={c.tone} style={{ ["--home-delay" as string]: `${160 + i * 90}ms` }}>
                <span className="home-chain__node" aria-hidden>
                  {c.ring ? <Ring /> : null}
                </span>
                <span className="home-chain__text">
                  <strong>{c.title}</strong>
                  <span>{c.sub}</span>
                </span>
              </li>
            ))}
          </ol>
        </figure>
      </header>

      <Section
        id="flyter"
        eyebrow="Slik fungerer det"
        title="Tre flyter"
        lead="Nesten alt i EUX skjer på én av tre måter. Arkitektursiden viser hver av dem steg for steg."
      >
        <ol className="home-flows">
          {FLOWS.map((f) => (
            <li key={f.n}>
              <NextLink href={f.href} className="home-flow" data-tone={f.tone}>
                <span className="home-flow__top">
                  <span className="home-flow__icon" aria-hidden>
                    <f.Icon />
                  </span>
                  <span className="home-flow__kind">
                    {f.n} · {f.kind}
                  </span>
                </span>
                <strong className="home-flow__title">{f.title}</strong>
                <span className="home-flow__path" aria-label={f.path.join(" til ")}>
                  {f.path.map((p, i) => (
                    <span key={p}>
                      {i > 0 && (
                        <span className="home-flow__sep" aria-hidden>
                          →
                        </span>
                      )}
                      <span className="home-flow__hop">{p}</span>
                    </span>
                  ))}
                </span>
                <span className="home-flow__text">{f.text}</span>
                <span className="home-flow__more">
                  Se flyten <ArrowRightIcon aria-hidden />
                </span>
              </NextLink>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="finn-fram" eyebrow="Innhold" title="Finn fram">
        <div className="home-areas">
          {AREAS.map((a) => (
            <section key={a.id} className="home-area" data-tone={a.tone} aria-labelledby={`omrade-${a.id}`}>
              <header className="home-area__head">
                <span className="home-area__icon" aria-hidden>
                  <a.Icon />
                </span>
                <span>
                  <Heading level="3" size="small" id={`omrade-${a.id}`} className="home-area__title">
                    {a.title}
                    {a.live && (
                      <span className="home-live">
                        <span className="home-live__dot" aria-hidden />
                        Live
                      </span>
                    )}
                  </Heading>
                  <span className="home-area__lead">{a.lead}</span>
                </span>
              </header>
              <ul className="home-area__links">
                {a.links.map((l) => (
                  <li key={l.href}>
                    <AreaLink link={l} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </Section>

      <Section
        id="begreper"
        eyebrow="Begreper"
        title="Seks ord du møter overalt"
        aside={
          <NextLink href="/architecture#ordliste" className="home-more">
            Hele ordlisten <ArrowRightIcon aria-hidden />
          </NextLink>
        }
      >
        <dl className="home-terms">
          {TERMS.map((g) => (
            <div key={g.term}>
              <dt>
                <span className="home-terms__term">{g.term}</span>
                {g.full && <span className="home-terms__full">{g.full}</span>}
              </dt>
              <dd>{g.text}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <footer className="home-footer">
        <span>
          Portalen og README-en vedlikeholdes i{" "}
          <a href={REPO} target="_blank" rel="noreferrer">
            navikt/eux-architecture
          </a>
          . Ser du noe som ikke stemmer? Lag en pull request.
        </span>
        <span className="home-footer__meta">Team EESSI · namespace eessibasis · dev-gcp og prod-gcp</span>
      </footer>
    </div>
  );
}
