"use client";

import type { CSSProperties, PointerEvent, ReactNode } from "react";
import NextLink from "next/link";
import { BodyLong, BodyShort, Detail, Heading } from "@navikt/ds-react";
import {
  ArrowRightIcon,
  BellIcon,
  CloudIcon,
  CoffeeIcon,
  DatabaseIcon,
  ExternalLinkIcon,
  BookIcon,
  CodeIcon,
  HandshakeIcon,
  PadlockUnlockedIcon,
  PersonGroupIcon,
  StarsEuIcon,
  TasklistIcon,
  VideoIcon,
  WavesIcon,
} from "@navikt/aksel-icons";
import { useScrollSpy } from "@/components/architecture/hooks";
import { NODE_BY_ID, NODES, SERVICE_COUNT, incoming, outgoing } from "@/components/architecture/data";
import { archHref } from "@/components/avslutning/tones";
import { useCurrentUser } from "@/components/UserMenu";
import {
  CONFLUENCE,
  EESSI_COUNTRIES,
  EESSI_URL,
  FURTHER,
  MEETINGS,
  NAIS_CONSOLE,
  NAIS_DOCS,
  REPO,
  SECTORS,
  SED_TRIP,
  SLACK_CHANNELS,
  TEAM_POINTS,
  TEAM_SIZE,
  TOOLS,
} from "./data";
import { HeroArt } from "./HeroArt";
import { TeamOrbit } from "./TeamOrbit";
import { SlackMock } from "./SlackMock";
import { Checklist } from "./Checklist";
import { WordCards } from "./WordCards";
import { NaisCluster } from "./NaisCluster";
import { ring, starPath, useInView, usePointerParallax } from "./hooks";

const SECTIONS = [
  { id: "teamet", label: "Teamet" },
  { id: "eessi", label: "EESSI" },
  { id: "rina", label: "RINA" },
  { id: "nais", label: "NAIS" },
  { id: "hverdagen", label: "Hverdagen" },
  { id: "slack", label: "Slack" },
  { id: "verktoy", label: "Verktøy" },
  { id: "naboteam", label: "Naboteam" },
  { id: "ord", label: "Ord" },
  { id: "forste-uke", label: "Første uke" },
  { id: "videre", label: "Videre" },
];
const SECTION_IDS = SECTIONS.map((s) => s.id);

const DB_COUNT = NODES.filter((n) => n.db).length;
const NEIGHBOURS: { id: string; title: string; area: string }[] = [
  { id: "melosys-eessi", title: "Melosys", area: "Medlemskap og lovvalg" },
  { id: "eessi-pensjon", title: "EESSI Pensjon", area: "Pensjon" },
];

const BAND_STARS = ring(12, 120, 0, 0);
const STAR_LG = starPath(13);
const STAR_SM = starPath(4);
const STAR_XS = starPath(4.5);
const OUTRO_STARS = ring(12, 28);
const FIELD = Array.from({ length: 26 }, (_, i) => ({
  x: (i * 137.5) % 100,
  y: (i * 61.8) % 100,
  s: 0.5 + ((i * 7) % 5) / 6,
}));

const POINT_ICONS = { people: PersonGroupIcon, stars: StarsEuIcon, handshake: HandshakeIcon };
const TOOL_ICONS: Record<string, typeof BookIcon> = { jira: TasklistIcon, teams: VideoIcon, confluence: BookIcon, github: CodeIcon };

/* ---------- Byggeklosser ---------- */

function Section({ id, eyebrow, title, lead, children }: { id: string; eyebrow: string; title: string; lead?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="arch-section ny-section" aria-labelledby={`${id}-title`}>
      <header className="arch-section__head">
        <Detail className="arch-eyebrow">{eyebrow}</Detail>
        <Heading level="2" size="large" id={`${id}-title`}>
          {title}
        </Heading>
        {lead && <BodyLong className="arch-section__lead">{lead}</BodyLong>}
      </header>
      {children}
    </section>
  );
}

/** Tall som teller opp fra null. Skjermlesere får tallet direkte. */
function Count({ n }: { n: number }) {
  return (
    <>
      <span className="ny-count" style={{ "--to": n } as CSSProperties} aria-hidden />
      <span className="aksel-sr-only">{n}</span>
    </>
  );
}

function Ext({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      {children} <ExternalLinkIcon title="åpnes i ny fane" />
    </a>
  );
}

/** Kort som vipper litt mot pekeren. */
function tilt(e: PointerEvent<HTMLElement>) {
  if (e.pointerType !== "mouse") return;
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--rx", `${(((e.clientY - r.top) / r.height) * 2 - 1) * -4}deg`);
  el.style.setProperty("--ry", `${(((e.clientX - r.left) / r.width) * 2 - 1) * 5}deg`);
  el.style.setProperty("--gx", `${((e.clientX - r.left) / r.width) * 100}%`);
  el.style.setProperty("--gy", `${((e.clientY - r.top) / r.height) * 100}%`);
}

function untilt(e: PointerEvent<HTMLElement>) {
  const el = e.currentTarget;
  el.style.removeProperty("--rx");
  el.style.removeProperty("--ry");
}

function firstName(name: string): string {
  const [last, first] = name.split(",").map((s) => s.trim());
  return (first || last).split(/\s+/)[0];
}

/* ---------- Deler ---------- */

function ToolIcon({ id }: { id: string }) {
  const Icon = TOOL_ICONS[id] ?? BookIcon;
  return <Icon />;
}

function Greeting() {
  const user = useCurrentUser();
  const name = user.status === "authenticated" ? firstName(user.user.name) : null;
  return (
    <Detail className="arch-eyebrow ny-greeting">
      {name ? `Hei, ${name}` : "Hei"} <span className="ny-wave" aria-hidden>👋</span>
      <span className="ny-greeting__sep" aria-hidden>
        ·
      </span>
      Ny i teamet
    </Detail>
  );
}

function EessiBand() {
  return (
    <div className="ny-band" aria-hidden>
      <div className="ny-band__field ny-band__field--far">
        {FIELD.map((f, i) => (
          <i key={i} style={{ left: `${f.x}%`, top: `${f.y}%`, "--s": f.s } as CSSProperties} />
        ))}
      </div>
      <div className="ny-band__field ny-band__field--near">
        {FIELD.slice(0, 12).map((f, i) => (
          <i key={i} style={{ left: `${(f.x + 40) % 100}%`, top: `${(f.y + 30) % 100}%`, "--s": f.s * 1.6 } as CSSProperties} />
        ))}
      </div>
      <svg viewBox="-160 -160 320 320" className="ny-band__ring">
        <circle r={120} className="ny-band__orbit" />
        {BAND_STARS.map((s, i) => (
          <g key={i} transform={`translate(${s.x.toFixed(1)} ${s.y.toFixed(1)})`}>
            <path d={STAR_LG} className="ny-band__star" style={{ "--i": i } as CSSProperties} />
          </g>
        ))}
        {BAND_STARS.map((s, i) => (
          <g key={`s${i}`} transform={`translate(${(s.x * 1.25).toFixed(1)} ${(s.y * 1.25).toFixed(1)})`}>
            <path d={STAR_SM} className="ny-band__spark" style={{ "--i": i } as CSSProperties} />
          </g>
        ))}
      </svg>
      <div className="ny-band__text">
        <span className="ny-band__n">
          <Count n={EESSI_COUNTRIES} />
        </span>
        <span className="ny-band__label">land utveksler trygdeinformasjon i EESSI</span>
      </div>
    </div>
  );
}

function SedTrip() {
  return (
    <div className="ny-trip">
      <Detail className="arch-eyebrow">Slik reiser en SED</Detail>
      <ol className="ny-trip__stops" style={{ "--n": SED_TRIP.length } as CSSProperties}>
        {SED_TRIP.map((s, i) => (
          <li key={s.title} data-tone={s.tone} style={{ "--i": i } as CSSProperties}>
            <span className="ny-trip__dot" aria-hidden />
            <strong>{s.title}</strong>
            <span>{s.sub}</span>
          </li>
        ))}
        <li className="ny-trip__env" aria-hidden>
          <svg viewBox="-12 -9 24 18">
            <rect x={-11} y={-8} width={22} height={16} rx={2.5} />
            <path d="M -10 -6.5 L 0 1.5 L 10 -6.5" />
          </svg>
        </li>
      </ol>
    </div>
  );
}

function RinaName() {
  return (
    <span className="ny-rinaname" role="img" aria-label="RINA, som i dag heter JINA">
      <span className="ny-rinaname__flip" aria-hidden>
        <span>R</span>
        <span>J</span>
      </span>
      <span aria-hidden>INA</span>
    </span>
  );
}

function MeetingClock({ fill, label, tone }: { fill: number; label: string; tone: string }) {
  const [ref, inView] = useInView<HTMLDivElement>(0.5);
  return (
    <div ref={ref} className="ny-clock" data-tone={tone} data-in={inView || undefined} style={{ "--fill": fill } as CSSProperties}>
      <svg viewBox="-50 -50 100 100" aria-hidden>
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} y1={-41} y2={i % 3 === 0 ? -36 : -38.5} transform={`rotate(${i * 30})`} className="ny-clock__tick" />
        ))}
        <circle r={30} className="ny-clock__track" pathLength={100} />
        <circle r={30} className="ny-clock__arc" pathLength={100} />
        <line y2={-24} className="ny-clock__hand" />
        <circle r={2.6} className="ny-clock__pin" />
      </svg>
      <span className="ny-clock__label">{label}</span>
    </div>
  );
}

function Venn() {
  const [ref, inView] = useInView<HTMLDivElement>(0.4);
  return (
    <div ref={ref} className="ny-venn" data-in={inView || undefined}>
      <div className="ny-venn__circle ny-venn__circle--a" data-tone="info">
        <strong>Confluence</strong>
        <span>Mer om teamet</span>
        <span>Løsningene våre</span>
      </div>
      <div className="ny-venn__circle ny-venn__circle--b" data-tone="accent">
        <strong>Portalen</strong>
        <span>Arkitektur</span>
        <span>Prosesser og sanntid</span>
      </div>
      <div className="ny-venn__mid">Litt av begge</div>
    </div>
  );
}

function Neighbour({ id, title, area, side }: { id: string; title: string; area: string; side: "left" | "right" }) {
  const node = NODE_BY_ID[id];
  const calls = outgoing(id).filter((e) => e.kind === "rest").map((e) => NODE_BY_ID[e.to]?.name ?? e.to);
  const reads = incoming(id).filter((e) => e.kind === "event").map((e) => NODE_BY_ID[e.from]?.name ?? e.from);
  return (
    <article className="ny-neighbour" data-side={side}>
      <header>
        <span className="ny-neighbour__area">{area}</span>
        <Heading level="3" size="small">
          {title}
        </Heading>
        <code>{node?.name ?? id}</code>
      </header>
      {node && <BodyShort size="small">{node.summary}</BodyShort>}
      <dl className="ny-neighbour__links">
        {calls.length > 0 && (
          <div>
            <dt>Kaller</dt>
            <dd>
              {calls.map((c) => (
                <span key={c} className="ny-pill" data-tone="accent">
                  {c}
                </span>
              ))}
            </dd>
          </div>
        )}
        {reads.length > 0 && (
          <div>
            <dt>Leser</dt>
            <dd>
              {reads.map((c) => (
                <span key={c} className="ny-pill" data-tone="meta-purple">
                  {c}
                </span>
              ))}
            </dd>
          </div>
        )}
      </dl>
      <NextLink href={archHref(id)} className="ny-textlink">
        Se i arkitekturkartet <ArrowRightIcon aria-hidden />
      </NextLink>
    </article>
  );
}

/* ---------- Side ---------- */

export function NyITeamet() {
  const active = useScrollSpy(SECTION_IDS);
  const heroRef = usePointerParallax<HTMLElement>();

  return (
    <div className="portal-page--wide arch-page ny-page">
      <div className="ny-progress" aria-hidden />

      <header ref={heroRef} className="portal-hero arch-hero ny-hero">
        <HeroArt />
        <div className="arch-hero__text ny-hero__text">
          <Greeting />
          <Heading level="1" size="xlarge" spacing className="ny-hero__title">
            Velkommen til <span className="ny-shine">Team EESSI Nav</span>
          </Heading>
          <BodyLong size="large" className="arch-hero__lead">
            Fint at du er her. Denne siden er et sted å starte: hvem vi er, hva vi jobber med, og hvor ting skjer. Ta det i
            ditt eget tempo – resten av portalen er her når du trenger den.
          </BodyLong>
          <div className="home-cta">
            <a href="#teamet" className="home-cta__btn home-cta__btn--primary">
              Bli kjent med teamet <ArrowRightIcon aria-hidden />
            </a>
            <a href="#forste-uke" className="home-cta__btn">
              Første uke
            </a>
          </div>
        </div>

        <dl className="ny-facts">
          {[
            { n: TEAM_SIZE, label: "i teamet" },
            { n: EESSI_COUNTRIES, label: "land i EESSI" },
            { n: SERVICE_COUNT, label: "applikasjoner" },
            { n: SLACK_CHANNELS.length, label: "Slack-kanaler" },
          ].map((s, i) => (
            <div key={s.label} style={{ "--i": i } as CSSProperties}>
              <dt>{s.label}</dt>
              <dd>
                <Count n={s.n} />
              </dd>
            </div>
          ))}
        </dl>
      </header>

      <nav className="arch-jumpnav" aria-label="Innhold på siden">
        <ol>
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} aria-current={active === s.id ? "location" : undefined}>
                {s.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <Section id="teamet" eyebrow="Om oss" title="Dette er teamet">
        <div className="ny-team-grid">
          <div className="ny-team-grid__text">
            <BodyLong size="large">
              Velkommen til Team EESSI Nav! Vi er et tverrfaglig team med tre fagressurser, fire tekniske ressurser og en
              produktsjef.
            </BodyLong>
            <BodyLong>
              Vi har mye kompetanse på EESSI og samarbeider med andre EU-land om utviklingen av hvordan trygdeinformasjon
              utveksles. Andre team i Nav bruker tjenestene våre når de skal utveksle informasjon med EU.
            </BodyLong>
            <ul className="ny-points">
              {TEAM_POINTS.map((p, i) => {
                const Icon = POINT_ICONS[p.icon];
                return (
                  <li key={p.title} className="ny-reveal" data-tone={p.tone} style={{ "--i": i } as CSSProperties}>
                    <span className="ny-points__icon" aria-hidden>
                      <Icon />
                    </span>
                    <span>
                      <strong>{p.title}</strong>
                      <span>{p.text}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
          <TeamOrbit />
        </div>
      </Section>

      <Section
        id="eessi"
        eyebrow="Det alt handler om"
        title="EESSI"
        lead={
          <>
            <strong>Electronic Exchange of Social Security Information.</strong> EUs system for å utveksle trygdeinformasjon
            elektronisk mellom trygdeinstitusjoner i Europa.
          </>
        }
      >
        <EessiBand />
        <div className="ny-eessi">
          <div className="ny-eessi__text">
            <BodyLong>
              Når noen bor, jobber eller får ytelser i flere land, må landene snakke sammen. Det gjør de med{" "}
              <strong>SED-er</strong> – strukturerte elektroniske dokumenter. Hver SED hører til en <strong>BUC</strong>, en
              saksprosess med faste regler for hvilke SED-er som sendes når.
            </BodyLong>
            <BodyLong>
              I Nav sendes og mottas SED-ene gjennom <strong>RINA</strong>. Saksbehandlerne jobber i nEESSI, og EUX-tjenestene
              våre binder RINA sammen med resten av Nav.
            </BodyLong>
            <div className="ny-links">
              <NextLink href="/" className="ny-textlink">
                Plattformen forklart <ArrowRightIcon aria-hidden />
              </NextLink>
              <Ext href={EESSI_URL} className="ny-textlink">
                EESSI hos Europakommisjonen
              </Ext>
            </div>
          </div>
          <div>
            <Detail className="arch-eyebrow">Sektorer – starten på BUC-navnet</Detail>
            <ul className="ny-sectors">
              {SECTORS.map((s, i) => (
                <li key={s.code} className="ny-reveal" style={{ "--i": i } as CSSProperties}>
                  <code>{s.code}</code>
                  <span>{s.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <SedTrip />
      </Section>

      <Section
        id="rina"
        eyebrow="Systemet i midten"
        title="RINA"
        lead="RINA er der EESSI-sakene og SED-ene ligger. Vi har ikke laget den, men vi har ansvaret for å drifte den."
      >
        <div className="ny-rina">
          <article className="ny-rina__card ny-rina__card--it ny-reveal" style={{ "--i": 0 } as CSSProperties}>
            <span className="ny-flag" aria-hidden>
              <i />
              <i />
              <i />
            </span>
            <Detail className="arch-eyebrow">Levert fra Italia</Detail>
            <RinaName />
            <BodyShort>
              RINA er ikke utviklet av teamet. Den leveres fra Italia, og den nåværende utgaven heter <strong>JINA</strong>.
            </BodyShort>
            <BodyShort size="small" className="arch-subtle">
              RINA står for Reference Implementation of a National Application.
            </BodyShort>
          </article>
          <article className="ny-rina__card ny-reveal" data-tone="meta-purple" style={{ "--i": 1 } as CSSProperties}>
            <span className="ny-rina__icon" aria-hidden>
              <CloudIcon />
            </span>
            <Detail className="arch-eyebrow">Driftet av oss</Detail>
            <Heading level="3" size="small">
              Vårt ansvar
            </Heading>
            <BodyShort>
              Vi drifter RINA for Nav. I testmiljøene har vi to RINA-instanser, Q1 og Q2, som sender SED-er til hverandre.
            </BodyShort>
            <NextLink href="/environments" className="ny-textlink">
              Se miljøene <ArrowRightIcon aria-hidden />
            </NextLink>
          </article>
          <article className="ny-rina__card ny-reveal" data-tone="accent" style={{ "--i": 2 } as CSSProperties}>
            <span className="ny-rina__icon" aria-hidden>
              <WavesIcon />
            </span>
            <Detail className="arch-eyebrow">Slik snakker vi med den</Detail>
            <Heading level="3" size="small">
              To veier inn og ut
            </Heading>
            <dl className="ny-rina__ways">
              <div>
                <dt>CPI</dt>
                <dd>
                  RINAs REST-API. Vi kaller den, for det meste via eux-rina-api.{" "}
                  <NextLink href="/architecture#foresporsel">Forespørsler</NextLink>
                </dd>
              </div>
              <div>
                <dt>NIE</dt>
                <dd>
                  RINA sender hendelser til eux-all-rina-events, som legger dem på Kafka.{" "}
                  <NextLink href="/architecture#hendelser">Hendelser</NextLink>
                </dd>
              </div>
            </dl>
          </article>
        </div>
      </Section>

      <Section
        id="nais"
        eyebrow="Plattformen"
        title="Vi kjører på NAIS"
        lead="NAIS er Navs applikasjonsplattform. Den er bygget på Kubernetes og kjører i Google Cloud. Alle applikasjonene våre ligger der."
      >
        <div className="ny-nais-grid">
          <div>
            <ul className="ny-feats">
              <li className="ny-reveal" data-tone="accent" style={{ "--i": 0 } as CSSProperties}>
                <CloudIcon aria-hidden />
                <span>
                  <strong>To klynger</strong>
                  <span>
                    <code>dev-gcp</code> for test og <code>prod-gcp</code> for produksjon. Alt ligger i namespace{" "}
                    <code>eessibasis</code>.
                  </span>
                </span>
              </li>
              <li className="ny-reveal" data-tone="meta-purple" style={{ "--i": 1 } as CSSProperties}>
                <WavesIcon aria-hidden />
                <span>
                  <strong>Kafka</strong>
                  <span>Hendelsene fra RINA går på Kafka, og flere av tjenestene våre lytter på dem.</span>
                </span>
              </li>
              <li className="ny-reveal" data-tone="success" style={{ "--i": 2 } as CSSProperties}>
                <DatabaseIcon aria-hidden />
                <span>
                  <strong>Cloud SQL</strong>
                  <span>{DB_COUNT} av applikasjonene har en PostgreSQL-database, med Flyway for migreringer.</span>
                </span>
              </li>
              <li className="ny-reveal" data-tone="info" style={{ "--i": 3 } as CSSProperties}>
                <PadlockUnlockedIcon aria-hidden />
                <span>
                  <strong>Innlogging</strong>
                  <span>Azure AD mellom tjenestene. Wonderwall tar seg av innloggingen i nEESSI.</span>
                </span>
              </li>
              <li className="ny-reveal" data-tone="warning" style={{ "--i": 4 } as CSSProperties}>
                <BellIcon aria-hidden />
                <span>
                  <strong>NAIS-jobber</strong>
                  <span>
                    Starter de nattlige prosessene. <NextLink href="/architecture#planlagt">Se hvordan</NextLink>
                  </span>
                </span>
              </li>
            </ul>
            <div className="home-cta">
              <a href={NAIS_DOCS} target="_blank" rel="noreferrer" className="home-cta__btn home-cta__btn--primary">
                Les NAIS-dokumentasjonen <ExternalLinkIcon title="åpnes i ny fane" />
              </a>
              <a href={NAIS_CONSOLE} target="_blank" rel="noreferrer" className="home-cta__btn">
                NAIS-konsollen <ExternalLinkIcon title="åpnes i ny fane" />
              </a>
            </div>
          </div>
          <NaisCluster />
        </div>
      </Section>

      <Section id="hverdagen" eyebrow="Hverdagen" title="Møtene våre" lead="Vi holder møtene få og korte. Resten tar vi på Slack.">
        <div className="ny-meetings">
          {MEETINGS.map((m, i) => (
            <article key={m.id} className="ny-meeting ny-reveal" data-tone={m.tone} style={{ "--i": i } as CSSProperties}>
              <MeetingClock fill={m.fill} label={m.length} tone={m.tone} />
              <div>
                <Detail className="arch-eyebrow">{m.when}</Detail>
                <Heading level="3" size="small" spacing>
                  {m.title}
                  {m.id === "daglig" && (
                    <span className="ny-coffee" aria-hidden>
                      <CoffeeIcon />
                      <i />
                      <i />
                      <i />
                    </span>
                  )}
                </Heading>
                <BodyShort>{m.text}</BodyShort>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section
        id="slack"
        eyebrow="Der det skjer"
        title="Vi er glade i Slack"
        lead="Det meste av praten vår foregår på Slack. Her er kanalene du bør bli med i – og hva de er til."
      >
        <SlackMock />
      </Section>

      <Section id="verktoy" eyebrow="Verktøy" title="Hvor ting ligger" lead="JIRA for oppgaver, Teams for video, Confluence og denne portalen for dokumentasjon.">
        <div className="ny-tools">
          {TOOLS.map((t, i) => (
            <article
              key={t.id}
              className="ny-tool ny-reveal"
              data-tone={t.tone}
              style={{ "--i": i } as CSSProperties}
              onPointerMove={tilt}
              onPointerLeave={untilt}
            >
              <header>
                <span className="ny-tool__icon" aria-hidden>
                  <ToolIcon id={t.id} />
                </span>
                <Heading level="3" size="small">
                  {t.name}
                </Heading>
                <span className="ny-tool__badge">{t.badge}</span>
              </header>
              <BodyShort size="small">{t.text}</BodyShort>
              <ul>
                {t.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              {t.href && (
                <Ext href={t.href} className="ny-textlink">
                  {t.linkText}
                </Ext>
              )}
            </article>
          ))}
        </div>

        <div className="ny-twoplaces">
          <div>
            <Heading level="3" size="small" spacing>
              To steder å lese
            </Heading>
            <BodyShort spacing>
              Confluence har mer om teamet og løsningene våre. Denne portalen viser arkitekturen, prosessene og hva som skjer i
              testmiljøene. Noe står begge steder – det er greit å kjenne til begge.
            </BodyShort>
            <div className="ny-links">
              <Ext href={CONFLUENCE} className="ny-textlink">
                Team EESSI NAV på Confluence
              </Ext>
              <NextLink href="/" className="ny-textlink">
                Portalens forside <ArrowRightIcon aria-hidden />
              </NextLink>
            </div>
          </div>
          <Venn />
        </div>
      </Section>

      <Section
        id="naboteam"
        eyebrow="Samarbeid"
        title="To team vi jobber mye med"
        lead="Melosys og EESSI Pensjon bruker plattformen vår direkte. Vi jobber ofte sammen med dem."
      >
        <div className="ny-hood">
          <Neighbour {...NEIGHBOURS[0]} side="left" />
          <div className="ny-hood__core" aria-hidden>
            <span className="ny-hood__line ny-hood__line--l" />
            <span className="ny-hood__hub">
              <StarsEuIcon />
              <strong>Team EESSI Nav</strong>
            </span>
            <span className="ny-hood__line ny-hood__line--r" />
          </div>
          <Neighbour {...NEIGHBOURS[1]} side="right" />
        </div>
        <aside className="ny-tip">
          <strong>Greit å vite:</strong> eux-rina-api og topicene <code>sedmottatt-v1</code> og <code>sedsendt-v1</code> brukes
          også av disse teamene. Endrer vi dem, påvirker det mer enn nEESSI.{" "}
          <NextLink href="/architecture#fallgruver">Fallgruver i arkitekturen</NextLink>
        </aside>
      </Section>

      <Section id="ord" eyebrow="Begreper" title="Ord du kommer til å høre" lead="Trykk på et kort for å snu det.">
        <WordCards />
        <NextLink href="/architecture#ordliste" className="ny-textlink ny-words__more">
          Hele ordlisten <ArrowRightIcon aria-hidden />
        </NextLink>
      </Section>

      <Section id="forste-uke" eyebrow="Kom i gang" title="Den første uka" lead="Noen ting det er lurt å gjøre tidlig. Ingen hast.">
        <Checklist />
      </Section>

      <Section id="videre" eyebrow="Mer" title="Videre herfra">
        <div className="arch-further">
          {FURTHER.map((f) =>
            f.external ? (
              <a key={f.href} href={f.href} target="_blank" rel="noreferrer" className="arch-further__card">
                <strong>
                  {f.title} <ExternalLinkIcon aria-hidden />
                </strong>
                <span>{f.text}</span>
              </a>
            ) : (
              <NextLink key={f.href} href={f.href} className="arch-further__card">
                <strong>
                  {f.title} <ArrowRightIcon aria-hidden />
                </strong>
                <span>{f.text}</span>
              </NextLink>
            ),
          )}
        </div>
      </Section>

      <footer className="portal-hero ny-outro">
        <svg viewBox="-40 -40 80 80" className="ny-outro__ring" aria-hidden>
          <g className="ny-outro__spin">
            {OUTRO_STARS.map((s, i) => (
              <g key={i} transform={`translate(${s.x.toFixed(1)} ${s.y.toFixed(1)})`}>
                <path d={STAR_XS} style={{ "--i": i } as CSSProperties} />
              </g>
            ))}
          </g>
        </svg>
        <div>
          <Heading level="2" size="medium">
            Godt å ha deg med!
          </Heading>
          <BodyShort>
            Lurer du på noe, spør i <strong>#team-eessi-nav-intern</strong>. Ingen spørsmål er for små.
          </BodyShort>
          <BodyShort size="small" className="arch-subtle">
            Siden er ny og blir justert underveis. Mangler noe? Lag en pull request i{" "}
            <a href={REPO} target="_blank" rel="noreferrer">
              navikt/eux-architecture
            </a>
            .
          </BodyShort>
        </div>
      </footer>
    </div>
  );
}
