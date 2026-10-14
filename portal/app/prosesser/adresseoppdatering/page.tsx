"use client";

import type { CSSProperties, ReactNode } from "react";
import NextLink from "next/link";
import { Accordion, BodyLong, BodyShort, CopyButton, Detail, Heading, Table } from "@navikt/ds-react";
import { ArrowRightIcon, BucketMopIcon, ExternalLinkIcon, PaperplaneIcon, TasklistIcon } from "@navikt/aksel-icons";
import { useScrollSpy } from "@/components/architecture/hooks";
import { archHref, ghHref } from "@/components/avslutning/tones";
import { CONSUMER_GROUP, ENVS, ORD_FOR_POSTBOKS, ORD_FOR_UKJENT, SEKTORER, TEST_RINASAK, type Tone } from "@/components/adresse/data";
import { Journey } from "@/components/adresse/Journey";
import { SystemFlow } from "@/components/adresse/SystemFlow";
import { SedPaths } from "@/components/adresse/SedPaths";
import { NameMatch } from "@/components/adresse/NameMatch";
import { AddressLab } from "@/components/adresse/AddressLab";

const SECTIONS = [
  { id: "reisen", label: "Reisen" },
  { id: "system", label: "Systemet" },
  { id: "sed", label: "I SED-en" },
  { id: "person", label: "Hvem gjelder det" },
  { id: "vask", label: "Prøv en adresse" },
  { id: "regler", label: "Regler" },
  { id: "feil", label: "Feil" },
  { id: "drift", label: "Drift" },
  { id: "ordliste", label: "Ordliste" },
  { id: "videre", label: "Videre" },
];
const SECTION_IDS = SECTIONS.map((s) => s.id);

/* ---------- Innhold ---------- */

const RULES: { id: string; tone: Tone; title: string; type: string; rows: { k: string; v: ReactNode }[] }[] = [
  {
    id: "kontakt",
    tone: "accent",
    title: "Kontaktadresse",
    type: "kontakt",
    rows: [
      { k: "Utenlandsk", v: <><code>KONTAKTADRESSE</code> som <code>UTENLANDSK_ADRESSE</code></> },
      { k: "Norsk", v: <><code>VEGADRESSE</code> når gaten har husnummer, <code>POSTBOKSADRESSE</code> når den er en postboks</> },
      { k: "Gyldig", v: "Fra i dag og fem år frem" },
      { k: "Død person", v: "Sendes likevel" },
    ],
  },
  {
    id: "opphold",
    tone: "info",
    title: "Oppholdsadresse",
    type: "opphold",
    rows: [
      { k: "Utenlandsk", v: <><code>OPPHOLDSADRESSE</code> som <code>UTENLANDSK_ADRESSE</code>, uten datoer</> },
      { k: "Norsk", v: <>Med gate eller postboks: sendes som <code>KONTAKTADRESSE</code>, gyldig fra i dag og uten sluttdato</> },
      { k: "Død person", v: "Sendes ikke" },
    ],
  },
  {
    id: "bosted",
    tone: "warning",
    title: "Bostedsadresse",
    type: "bosted",
    rows: [
      { k: "Utenlandsk", v: <><code>BOSTEDSADRESSE</code> som <code>UTENLANDSK_ADRESSE</code>, uten datoer</> },
      { k: "Norsk", v: "Sendes aldri" },
      { k: "Motpart", v: "Første motpart i saken må være fra samme land som adressen" },
      { k: "Død person", v: "Sendes ikke" },
    ],
  },
];

const ERRORS: { what: string; tone: Tone; how: ReactNode; result: string }[] = [
  {
    what: "eux-rina-api svarer ikke",
    tone: "danger",
    how: "Kallet prøves opptil 9 ganger til, med 1 sekund ventetid som dobles for hvert forsøk.",
    result: "Hele SED-en feiler",
  },
  {
    what: "pdl-api finner ikke personen eller identen er ugyldig",
    tone: "neutral",
    how: "Ugyldig ident prøves ikke igjen. «Fant ikke person» prøves 9 ganger til først.",
    result: "Adressen hoppes over",
  },
  {
    what: "pdl-api svarer med en annen feil",
    tone: "danger",
    how: "Nettverks- og serverfeil prøves 9 ganger til. Andre GraphQL-feil prøves ikke igjen.",
    result: "Hele SED-en feiler",
  },
  {
    what: "PDL-mottak svarer 409 eller 422",
    tone: "neutral",
    how: "PDL godtok ikke endringen. Logges som «PDL godtok ikke oppdateringen av adresse».",
    result: "Adressen hoppes over",
  },
  {
    what: "PDL-mottak svarer 404",
    tone: "warning",
    how: "Prøves 9 ganger til, deretter logges det på samme måte som 409 og 422.",
    result: "Adressen hoppes over",
  },
  {
    what: "PDL-mottak svarer 5xx eller annen 4xx",
    tone: "danger",
    how: "5xx prøves 9 ganger til. Andre 4xx, som 400 og 403, prøves ikke igjen.",
    result: "Hele SED-en feiler",
  },
  {
    what: "Statusen blir ERROR",
    tone: "warning",
    how: "Logges som «Feil ved verifisering». Behandlingen går videre som om alt gikk bra.",
    result: "Bare en logglinje",
  },
  {
    what: "Utenlandsk adresse uten postkode",
    tone: "danger",
    how: "Vasken kan fjerne postnummeret, f.eks. «unknown». Da kastes en IllegalArgumentException.",
    result: "Hele SED-en feiler",
  },
];

const PITFALLS: { group: string; items: { title: string; body: ReactNode }[] }[] = [
  {
    group: "Vask og mapping",
    items: [
      {
        title: "«pb» midt i et ord gir postboks",
        body: (
          <>
            Gate-feltet regnes som postboks hvis det inneholder et av ordene {ORD_FOR_POSTBOKS.map((o, i) => <span key={o}>{i > 0 && ", "}<code>{o}</code></span>)}{" "}
            hvor som helst. «Lappbyvägen 3» blir derfor sendt som postboks. Prøv eksempelet i{" "}
            <a href="#vask">simulatoren</a>.
          </>
        ),
      },
      {
        title: "Landkode og postnummer sjekkes før vasken",
        body: (
          <>
            Et postnummer som «unknown» slipper gjennom sjekken, blir fjernet av vasken og gjør at en utenlandsk adresse ikke kan
            lages. Da feiler hele SED-en.
          </>
        ),
      },
      {
        title: "Norsk oppholdsadresse blir kontaktadresse",
        body: (
          <>
            En oppholdsadresse med landkode <code>NOR</code> og gate eller postboks sendes med opplysningstype{" "}
            <code>KONTAKTADRESSE</code>. Den får startdato, men ingen sluttdato.
          </>
        ),
      },
      {
        title: "Tilleggsnavn beholder bare bokstaver",
        body: (
          <>
            For en norsk vegadresse blir bygning-feltet til tilleggsnavn, men tall, mellomrom og tegn fjernes. «H0201» blir
            «H».
          </>
        ),
      },
      {
        title: "En norsk adresse uten husnummer blir ikke sendt",
        body: <>Finner ikke mappingen et husnummer i gate-feltet, logges «Kunne ikke mappe norsk … til vegadresse», og adressen hoppes over.</>,
      },
    ],
  },
  {
    group: "Sammenligning med PDL",
    items: [
      {
        title: "Bare den første adressen sammenlignes",
        body: (
          <>
            Adressen sammenlignes bare med den første adressen av samme type i PDL, og bare hvis den er utenlandsk. Ligger den
            samme adressen lenger ned i listen, sendes den på nytt.
          </>
        ),
      },
      {
        title: "Fire felt avgjør om adressen er lik",
        body: <>By, gate, postboks og landkode sammenlignes. Postkode, region og bygning er ikke med.</>,
      },
      {
        title: "Loggen sier «Kontaktadresse» også for opphold",
        body: (
          <>
            Er en oppholdsadresse registrert fra før, logges det «Kontaktadresse er ikke sendt til PDL, da adresse allerede er
            registrert». Teksten er kopiert fra kontaktadressen.
          </>
        ),
      },
    ],
  },
  {
    group: "Kafka og forsøk",
    items: [
      {
        title: "Et nytt forsøk behandler hele SED-en",
        body: (
          <>
            Feiler én adresse på en måte som ikke fanges, prøves hele SED-en på nytt. Adresser som allerede er sendt, går gjennom
            sammenligningen med PDL igjen. Norske adresser sammenlignes aldri, så de sendes en gang til.
          </>
        ),
      },
      {
        title: "Feil på statuskallet sender meldingen på nytt",
        body: (
          <>
            Endringsmeldingen og statusspørringen ligger i samme metode. Feiler statuskallet med 5xx, prøves hele metoden igjen,
            og meldingen postes en gang til.
          </>
        ),
      },
      {
        title: "Hendelsestypen sjekkes ikke",
        body: (
          <>
            Lytteren ser på retning og BUC, ikke på <code>documentEventType</code>. Alle dokumenthendelser for en innkommende SED i
            riktig sektor gir en ny behandling.
          </>
        ),
      },
      {
        title: `RINA-sak ${TEST_RINASAK} feiler alltid`,
        body: (
          <>
            Saken brukes til å teste feilhåndteringen. Hendelser på den kaster alltid en feil og havner til slutt på DLT. Koden
            sjekker ikke hvilket miljø den kjører i.
          </>
        ),
      },
    ],
  },
  {
    group: "Personer",
    items: [
      {
        title: "Ektefelle og annen person har ingen reserve",
        body: <>Bare bruker kan få fødselsnummer fra RINA-saken. Mangler ektefellen norsk PIN i SED-en, sendes ingen av ektefellens adresser.</>,
      },
      {
        title: "Fødselsdatoen må være helt lik",
        body: <>Navnene tåler to endringer, men fødselsdatoen sammenlignes tegn for tegn. Ombyttet dag og måned stopper alt.</>,
      },
    ],
  },
];

const GLOSSARY: { term: string; full?: string; text: string }[] = [
  { term: "SED", full: "Structured Electronic Document", text: "Dokumentet som sendes mellom land i EESSI, f.eks. H001 eller U002." },
  { term: "BUC", full: "Business Use Case", text: "En type RINA-sak. Delen foran første «_» er sektoren, f.eks. H i H_BUC_01." },
  { term: "PIN", full: "Personal Identification Number", text: "En persons ident i et land. I SED-en har hver PIN en landkode." },
  { term: "Motpart", text: "Institusjonen i det andre landet i RINA-saken. Navnet og landet blir kilde i endringsmeldingen." },
  { term: "PDL", full: "Persondataløsningen", text: "NAVs register over personopplysninger, blant annet adresser." },
  { term: "PDL-mottak", text: "Tar imot endringsmeldinger til PDL og gir en status for hver av dem." },
  { term: "Endringsmelding", text: "Ber PDL om å registrere en opplysning. Her alltid med endringstype OPPRETT." },
  { term: "Kontaktadresse", text: "Der personen kan nås med post." },
  { term: "Oppholdsadresse", text: "Der personen oppholder seg, når det er et annet sted enn bostedet." },
  { term: "Bostedsadresse", text: "Der personen bor. Herfra sendes bare utenlandske bostedsadresser, og bare når motparten er fra samme land." },
  { term: "Vegadresse", text: "Norsk adresse med gatenavn, husnummer og eventuelt husbokstav." },
  { term: "Behandlingsnummer", text: "Oppgir formålet med oppslaget i PDL. Velges ut fra sektoren i saken." },
  { term: "DLT", full: "Dead letter topic", text: "Kafka-topic for meldinger som har feilet for mange ganger." },
];

const REPOS = ["eux-adresse-oppdatering", "eux-all-rina-events", "eux-rina-api"];

const FURTHER: { href: string; title: string; text: string; external?: boolean }[] = [
  { href: archHref("eux-adresse-oppdatering"), title: "Arkitektur", text: "Se eux-adresse-oppdatering i arkitekturkartet." },
  { href: "/prosesser/journalfoering", title: "Journalføring", text: "Hvordan de samme SED-ene arkiveres i Dokarkiv." },
  { href: "/prosesser/automatisk-avslutning", title: "Automatisk avslutning", text: "Hvordan uvirksomme RINA-saker lukkes og arkiveres." },
  { href: "/prosesser/automatisk-sletting", title: "Automatisk sletting", text: "Hvordan saker uten sendt SED slettes." },
  { href: "/applications", title: "Applikasjoner", text: "Rolle, avhengigheter, Kafka-topics og repo for hver applikasjon." },
  ...REPOS.map((r) => ({ href: ghHref(r), title: r, text: "Kildekoden på GitHub.", external: true })),
];

const LOG_PHRASES: { text: string; means: string }[] = [
  { text: "Endringsmelding verifisert", means: "PDL har behandlet meldingen. Antall forsøk står i parentes." },
  { text: "PDL godtok ikke oppdateringen av adresse", means: "Adressen ble hoppet over. Feilen fra PDL ligger i stacktracen." },
  { text: "Ingen ident for norge funnet", means: "Personen ble hoppet over." },
  { text: "Eksternt kall feilet", means: "Et kall feilet og prøves igjen. Viser hvilket og forsøk nr." },
  { text: "Dokumentet har feilet 3 ganger, sendes til DLT", means: "SED-en er gitt opp." },
];

/* ---------- Byggeklosser ---------- */

function Section({ id, eyebrow, title, lead, children }: { id: string; eyebrow: string; title: string; lead?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="arch-section" aria-labelledby={`${id}-title`}>
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

function Snippet({ children }: { children: string }) {
  return (
    <div className="avs-snippet">
      <code>{children}</code>
      <CopyButton copyText={children} size="xsmall" />
    </div>
  );
}

/* ---------- Hero-illustrasjon ---------- */

const PIN = { x: 214, y: 128 };
const COUNTRIES: { code: string; x: number; y: number }[] = [
  { code: "SWE", x: 318, y: 58 },
  { code: "FIN", x: 372, y: 150 },
  { code: "POL", x: 330, y: 262 },
  { code: "DEU", x: 214, y: 300 },
  { code: "DNK", x: 106, y: 236 },
  { code: "ESP", x: 40, y: 318 },
  { code: "NLD", x: 70, y: 120 },
];
const route = (c: { x: number; y: number }) => {
  const mx = (c.x + PIN.x) / 2 + (c.y - PIN.y) * 0.3;
  const my = (c.y + PIN.y) / 2 - (c.x - PIN.x) * 0.3;
  return `M ${c.x} ${c.y} Q ${mx} ${my} ${PIN.x} ${PIN.y + 16}`;
};
const ENVELOPES = [
  { x: 96, y: 54, r: -12, s: 0.9 },
  { x: 356, y: 222, r: 9, s: 1 },
  { x: 150, y: 330, r: 5, s: 0.75 },
];

/** Tre lag som flyttes i ulik fart når siden rulles: rutenett bakerst, land og ruter i midten, konvolutter foran. */
function HeroArt() {
  const box = "0 0 420 380";
  return (
    <div className="adr-hero__art" aria-hidden>
      <svg className="adr-layer" style={{ "--depth": 0.1 } as CSSProperties} viewBox={box}>
        {[30, 100, 170, 240, 310, 380].map((y, i) => (
          <path key={y} d={`M -40 ${y + 30} Q 210 ${y - 26 - i * 3} 460 ${y + 14}`} className="adr-lat" />
        ))}
        {[40, 140, 240, 340].map((x) => (
          <path key={x} d={`M ${x} -20 Q ${x + 34} 190 ${x - 8} 400`} className="adr-lat" />
        ))}
      </svg>
      <svg className="adr-layer" style={{ "--depth": 0.45 } as CSSProperties} viewBox={box}>
        {COUNTRIES.map((c, i) => (
          <g key={c.code}>
            <path d={route(c)} className="adr-route" style={{ "--i": i } as CSSProperties} />
            <circle cx={c.x} cy={c.y} r={12} className="adr-country__halo" style={{ "--i": i } as CSSProperties} />
            <circle cx={c.x} cy={c.y} r={4.5} className="adr-country" />
            <text x={c.x} y={c.y + 20} textAnchor="middle" className="adr-country__code">
              {c.code}
            </text>
          </g>
        ))}
        <g transform={`translate(${PIN.x} ${PIN.y})`}>
          <circle r={40} className="adr-pin__ring" />
          <path d="M 0 16 C -7 5 -19 -2 -19 -16 A 19 19 0 1 1 19 -16 C 19 -2 7 5 0 16 Z" className="adr-pin__body" />
          <circle cy={-16} r={7} className="adr-pin__dot" />
          <text y={42} textAnchor="middle" className="adr-pin__label">
            PDL
          </text>
        </g>
      </svg>
      <svg className="adr-layer" style={{ "--depth": 0.9 } as CSSProperties} viewBox={box}>
        {ENVELOPES.map((e, i) => (
          <g key={i} transform={`translate(${e.x} ${e.y}) rotate(${e.r}) scale(${e.s})`}>
            <g className="adr-float" style={{ "--i": i } as CSSProperties}>
              <rect x={-26} y={-17} width={52} height={34} rx={5} className="adr-env" />
              <path d="M -25 -15 L 0 4 L 25 -15" className="adr-env__flap" />
              <rect x={8} y={2} width={12} height={9} rx={1.5} className="adr-env__stamp" />
            </g>
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ---------- Side ---------- */

export default function AdresseoppdateringPage() {
  const active = useScrollSpy(SECTION_IDS);
  const prod = ENVS.find((e) => e.env === "prod")!;

  return (
    <div className="portal-page--wide arch-page avs-page adr-page">
      <header className="portal-hero arch-hero adr-hero">
        <HeroArt />
        <div className="arch-hero__text">
          <Detail className="arch-eyebrow">Prosess</Detail>
          <Heading level="1" size="xlarge" spacing>
            Adresser fra SED til PDL
          </Heading>
          <BodyLong size="large" className="arch-hero__lead">
            Når et annet land sender en SED, står det ofte en adresse i den. eux-adresse-oppdatering finner adressene til personer
            med norsk ident, vasker dem og sender dem til PDL. Slik får PDL vite det de andre landene vet om hvor folk bor.
          </BodyLong>
        </div>

        <dl className="arch-stats">
          {[
            { n: SEKTORER.length, label: "sektorer", sub: SEKTORER.map((s) => s.id).join(" · ") },
            { n: 3, label: "adressetyper", sub: "kontakt · opphold · bosted" },
            { n: 3, label: "personer per SED", sub: "bruker · ektefelle · annen" },
            { n: 3, label: "forsøk per SED", sub: "15 s mellom, så DLT" },
          ].map((s, i) => (
            <div key={s.label} className="arch-stat" style={{ ["--arch-delay" as string]: `${120 + i * 70}ms` }}>
              <dt>{s.label}</dt>
              <dd>
                <span className="arch-stat__n">{s.n}</span>
                <span className="arch-stat__sub">{s.sub}</span>
              </dd>
            </div>
          ))}
        </dl>

        <div className="arch-flows">
          <a href="#reisen" className="arch-flow-card" data-tone="accent">
            <span className="arch-flow-card__icon" aria-hidden>
              <PaperplaneIcon />
            </span>
            <span>
              <strong>Følg en adresse</strong>
              <span className="arch-flow-card__text">Åtte steg fra RINA til PDL, ett om gangen mens du blar.</span>
            </span>
            <ArrowRightIcon aria-hidden className="arch-flow-card__arrow" />
          </a>
          <a href="#vask" className="arch-flow-card" data-tone="warning">
            <span className="arch-flow-card__icon" aria-hidden>
              <BucketMopIcon />
            </span>
            <span>
              <strong>Prøv en adresse</strong>
              <span className="arch-flow-card__text">Skriv inn en adresse og se vasken, sjekkene og meldingen til PDL.</span>
            </span>
            <ArrowRightIcon aria-hidden className="arch-flow-card__arrow" />
          </a>
          <a href="#regler" className="arch-flow-card" data-tone="info">
            <span className="arch-flow-card__icon" aria-hidden>
              <TasklistIcon />
            </span>
            <span>
              <strong>Tre typer, tre regelsett</strong>
              <span className="arch-flow-card__text">Kontakt, opphold og bosted behandles ulikt. Her er forskjellene.</span>
            </span>
            <ArrowRightIcon aria-hidden className="arch-flow-card__arrow" />
          </a>
        </div>
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

      <Section
        id="reisen"
        eyebrow="Reisen"
        title="Fra SED til PDL i åtte steg"
        lead="Bla nedover for å følge én SED, steg for steg. For hvert steg ser du hvor SED-en er, og hva som skjer med den."
      >
        <Journey />
      </Section>

      <Section
        id="system"
        eyebrow="Arkitektur"
        title="Hvem gjør hva"
        lead="eux-adresse-oppdatering har ingen database og ingen API som andre bruker. Den leser fra Kafka og snakker med tre tjenester. Klikk på en boks for detaljer."
      >
        <SystemFlow />
      </Section>

      <Section
        id="sed"
        eyebrow="Kilden"
        title="Hvor i SED-en adressene står"
        lead="En SED kan ha adresser for tre personer. De behandles i denne rekkefølgen, og hver av dem trenger en norsk ident. Feltene i adressen får nye navn på veien."
      >
        <SedPaths />
      </Section>

      <Section
        id="person"
        eyebrow="Interaktivt"
        title="Er det samme person?"
        lead="Har brukeren ingen norsk PIN i SED-en, kan fødselsnummeret i RINA-saken brukes. Først må fødselsdato og navn stemme. Endre feltene og se hvordan sjekkene går."
      >
        <NameMatch />
      </Section>

      <Section
        id="vask"
        eyebrow="Interaktivt"
        title="Prøv en adresse"
        lead={
          <>
            Velg et eksempel eller skriv inn en egen adresse. Simulatoren følger én adresse gjennom de samme stegene som
            AdresseService og PdlService, i samme rekkefølge, og viser meldingen som sendes til PDL.
          </>
        }
      >
        <AddressLab />
        <details className="adr-words">
          <summary>
            <span>Ordene som betyr «ukjent»</span>
            <span className="arch-subtle">{ORD_FOR_UKJENT.length} ord på norsk, engelsk, svensk og dansk</span>
          </summary>
          <BodyShort size="small" className="arch-subtle">
            Et felt fjernes hvis hele feltet, med små bokstaver, er likt ett av disse:
          </BodyShort>
          <ul>
            {ORD_FOR_UKJENT.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </details>
      </Section>

      <Section
        id="regler"
        eyebrow="Regler"
        title="Tre typer, tre regelsett"
        lead="Typen i SED-en avgjør hva som sendes. Felles for alle: Adressen sammenlignes først med den første adressen av samme type i PDL, og sendes ikke hvis den er lik."
      >
        <div className="adr-rules">
          {RULES.map((r, i) => (
            <article key={r.id} className="arch-card adr-rule" data-tone={r.tone} style={{ "--i": i } as CSSProperties}>
              <header>
                <Detail className="arch-eyebrow">
                  type: <code>{r.type}</code>
                </Detail>
                <Heading level="3" size="small">
                  {r.title}
                </Heading>
              </header>
              <dl>
                {r.rows.map((row) => (
                  <div key={row.k}>
                    <dt>{row.k}</dt>
                    <dd>{row.v}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
        <BodyShort size="small" className="arch-subtle adr-rules__note">
          Kilden i meldingen er navnet og landet til første motpart i RINA-saken, eller «EESSI (ukjent motpart)» hvis saken ikke har
          noen.
        </BodyShort>
      </Section>

      <Section
        id="feil"
        eyebrow="Feilhåndtering"
        title="Når noe går galt"
        lead="Noen feil stopper bare én adresse. Andre stopper hele SED-en, som da prøves på nytt fra Kafka to ganger med 15 sekunders mellomrom før den havner på DLT."
      >
        <div className="arch-table avs-errors">
          <Table size="small">
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell scope="col">Hva skjer</Table.HeaderCell>
                <Table.HeaderCell scope="col">Hvordan det håndteres</Table.HeaderCell>
                <Table.HeaderCell scope="col">Resultat</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {ERRORS.map((r) => (
                <Table.Row key={r.what}>
                  <Table.HeaderCell scope="row">
                    <span className="jfr-err" data-tone={r.tone}>
                      {r.what}
                    </span>
                  </Table.HeaderCell>
                  <Table.DataCell>{r.how}</Table.DataCell>
                  <Table.DataCell>
                    <span className="adr-result-tag" data-tone={r.tone}>
                      {r.result}
                    </span>
                  </Table.DataCell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>

        <div className="arch-pitfalls avs-pitfalls adr-pitfalls">
          {PITFALLS.map((g) => (
            <div key={g.group}>
              <Heading level="3" size="small" spacing>
                {g.group}
              </Heading>
              <Accordion size="small">
                {g.items.map((p) => (
                  <Accordion.Item key={p.title}>
                    <Accordion.Header>{p.title}</Accordion.Header>
                    <Accordion.Content>
                      <BodyLong as="div" size="small">
                        {p.body}
                      </BodyLong>
                    </Accordion.Content>
                  </Accordion.Item>
                ))}
              </Accordion>
            </div>
          ))}
        </div>
      </Section>

      <Section id="drift" eyebrow="Drift" title="Kjøring og oppfølging" lead="Appen har ingen database og ingen egne metrikker. Det meste følges opp i loggene.">
        <div className="avs-ops">
          <div className="avs-ops__col">
            <article className="arch-card avs-ops__card" data-tone="meta-purple">
              <Heading level="3" size="xsmall">
                Kafka
              </Heading>
              <div className="arch-table">
                <Table size="small">
                  <Table.Header>
                    <Table.Row>
                      <Table.HeaderCell scope="col">Miljø</Table.HeaderCell>
                      <Table.HeaderCell scope="col">App og topic</Table.HeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {ENVS.map((e) => (
                      <Table.Row key={e.env}>
                        <Table.HeaderCell scope="row">{e.env}</Table.HeaderCell>
                        <Table.DataCell className="arch-mono jfr-topics">
                          <span>{e.app}</span>
                          <span>{e.topic}</span>
                        </Table.DataCell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table>
              </div>
              <BodyShort size="small">
                Consumer group <code>{CONSUMER_GROUP}</code>. Manuell commit etter hver SED. Retry- og DLT-topicene heter som
                hovedtopicen med <code>-retry</code> og <code>-dlt</code> på slutten.
              </BodyShort>
            </article>
            <article className="arch-card avs-ops__card" data-tone="success">
              <Heading level="3" size="xsmall">
                Behandlingsnummer mot pdl-api
              </Heading>
              <dl className="avs-job__meta">
                {SEKTORER.map((s) => (
                  <div key={s.id}>
                    <dt>
                      {s.id} – {s.label}
                    </dt>
                    <dd className="arch-mono">{s.behandlingsnummer}</dd>
                  </div>
                ))}
              </dl>
              <BodyShort size="small" className="arch-subtle">
                Velges fra starten av <code>sakType</code> i RINA-saken.
              </BodyShort>
            </article>
          </div>
          <div className="avs-ops__col">
            <article className="arch-card avs-ops__card" data-tone="accent">
              <Heading level="3" size="xsmall">
                Søk i loggene
              </Heading>
              <dl className="avs-job__meta adr-logs">
                {LOG_PHRASES.map((l) => (
                  <div key={l.text}>
                    <dt>
                      <Snippet>{l.text}</Snippet>
                    </dt>
                    <dd>{l.means}</dd>
                  </div>
                ))}
              </dl>
            </article>
            <article className="arch-card avs-ops__card" data-tone="info">
              <Heading level="3" size="xsmall">
                Plattform
              </Heading>
              <ul className="arch-facts">
                <li>
                  {prod.cluster}, namespace <code>eessibasis</code>. 2–3 replikaer med 512 Mi minne.
                </li>
                <li>
                  Prometheus på <code>/actuator/prometheus</code> og automatisk OpenTelemetry-instrumentering.
                </li>
                <li>Azure AD-token mot eux-rina-api, pdl-api og PDL-mottak. PDL nås via prod-fss-pub og dev-fss-pub.</li>
              </ul>
            </article>
          </div>
        </div>
      </Section>

      <Section id="ordliste" eyebrow="Begreper" title="Ordliste">
        <dl className="arch-glossary">
          {GLOSSARY.map((g) => (
            <div key={g.term}>
              <dt>
                {g.term}
                {g.full && <span className="arch-glossary__full">{g.full}</span>}
              </dt>
              <dd>{g.text}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section id="videre" eyebrow="Mer" title="Videre lesing">
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
    </div>
  );
}
