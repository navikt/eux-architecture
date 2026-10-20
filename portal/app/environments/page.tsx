"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import NextLink from "next/link";
import { Accordion, BodyLong, BodyShort, Button, CopyButton, Detail, Heading, Table, ToggleGroup } from "@navikt/ds-react";
import { ArrowRightIcon, ArrowsSquarepathIcon, PaperplaneIcon, StarIcon, TestFlaskIcon } from "@navikt/aksel-icons";
import { useReducedMotion } from "@/components/architecture/hooks";
import { NODE_BY_ID, incoming } from "@/components/architecture/data";
import { archHref } from "@/lib/links";
import {
  ENV_IDS,
  ENV_SERVICES,
  ENVS,
  GOSYS_URL,
  NAIS_CONSOLE,
  NEESSI_VARIANTS,
  Q2_ONLY,
  SWAGGER_COUNT,
  hostUrl,
  neessiUrl,
  rinaUrl,
  sameRinaVersion,
  swaggerUrl,
  type EnvId,
  type EnvInfo,
} from "@/components/miljoer/data";
import { Section } from "@/components/page/Section";
import { HeroStats } from "@/components/page/HeroStats";
import { JumpNav } from "@/components/page/JumpNav";
import { FurtherReading, type FurtherLink } from "@/components/page/FurtherReading";
import { ExtLink } from "@/components/page/ExtLink";

const SECTIONS = [
  { id: "samspill", label: "Q1 og Q2" },
  { id: "miljoer", label: "Miljøene" },
  { id: "tjenester", label: "Tjenester" },
  { id: "sporsmal", label: "Spørsmål" },
  { id: "videre", label: "Videre" },
];

const IN_BOTH = ENV_SERVICES.filter((s) => s.envs.length === 2).length;
const SWAGGER_Q1_ONLY = ENV_SERVICES.filter((s) => s.swagger.length === 1 && s.swagger[0] === "q1");
const CPI_CALLERS = incoming("rina")
  .filter((e) => e.kind === "rest")
  .map((e) => NODE_BY_ID[e.from].name);

const other = (env: EnvId): EnvId => (env === "q1" ? "q2" : "q1");

/* ---------- Innhold ---------- */

const FURTHER: FurtherLink[] = [
  { href: "/kafka/sed-kobling", title: "SED-kobling", text: "Se samme SED sendt fra det ene miljøet og mottatt i det andre, med transporttid." },
  { href: "/kafka/sed-hendelser", title: "SED-hendelser", text: "Hendelser fra RINA i Q1 og Q2, live fra Kafka." },
  { href: "/tests", title: "Tester", text: "Send en ekte SED fra Q1 til Q2 eller motsatt, og følg hvert kall." },
  { href: "/applications", title: "Applikasjoner", text: "Hva hver tjeneste gjør, hvem som kaller den, og lenker til Q1 og Q2." },
  { href: "/architecture", title: "Arkitektur", text: "Hele plattformen i ett kart, med flyter og integrasjoner." },
  { href: NAIS_CONSOLE, title: "NAIS-konsollen", text: "Status, logger og produksjonsendepunkter.", external: true },
];

/* ---------- Byggeklosser ---------- */

function Copyable({ value, label }: { value: string; label?: string }) {
  return (
    <span className="env-copy">
      <code>{label ?? value}</code>
      <CopyButton copyText={value} size="xsmall" title={`Kopier ${value}`} />
    </span>
  );
}

/** Ring med tolv prikker, samme motiv som på forsiden. */
function Ring({ cx, cy, r, label, sub, tone }: { cx: number; cy: number; r: number; label: string; sub: string; tone: string }) {
  return (
    <g className="env-ring" data-tone={tone}>
      <circle cx={cx} cy={cy} r={r + 16} className="env-ring__halo" />
      <g className="env-ring__dots" style={{ transformOrigin: `${cx}px ${cy}px` }}>
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return <circle key={i} cx={cx + Math.cos(a) * r} cy={cy + Math.sin(a) * r} r={i % 3 === 0 ? 4.6 : 3.2} />;
        })}
      </g>
      <text x={cx} y={cy + 6} textAnchor="middle" className="env-ring__label">
        {label}
      </text>
      <text x={cx} y={cy + r + 30} textAnchor="middle" className="env-ring__sub">
        {sub}
      </text>
    </g>
  );
}

function Envelope() {
  return (
    <g className="env-envelope">
      <rect x={-12} y={-8} width={24} height={16} rx={3} />
      <path d="M -11 -6.5 L 0 1.5 L 11 -6.5" />
    </g>
  );
}

const ARC_OUT = "M 158 196 Q 214 92 268 140";
const ARC_BACK = "M 276 186 Q 236 268 166 236";

function HeroArt() {
  const reduced = useReducedMotion();
  const box = "0 0 420 360";
  return (
    <div className="lite-hero__art" aria-hidden>
      <svg className="lite-layer" style={{ "--depth": 0.1 } as CSSProperties} viewBox={box}>
        {[64, 96, 128].map((r) => (
          <g key={r}>
            <circle cx={118} cy={214} r={r} className="env-orbit" />
            <circle cx={308} cy={162} r={r} className="env-orbit" />
          </g>
        ))}
      </svg>
      <svg className="lite-layer" style={{ "--depth": 0.45 } as CSSProperties} viewBox={box}>
        <path d={ARC_OUT} className="env-arc" />
        <path d={ARC_BACK} className="env-arc env-arc--back" />
        <Ring cx={118} cy={214} r={40} label="Q1" sub={ENVS.q1.institution} tone={ENVS.q1.tone} />
        <Ring cx={308} cy={162} r={40} label="Q2" sub={ENVS.q2.institution} tone={ENVS.q2.tone} />
        {!reduced &&
          [ARC_OUT, ARC_BACK].map((d, i) => (
            <g key={d}>
              <Envelope />
              <animateMotion dur="3.6s" begin={`${i * 1.8}s`} repeatCount="indefinite" path={d} keyTimes="0;1" keySplines="0.45 0 0.55 1" calcMode="spline" />
              <animate attributeName="opacity" dur="3.6s" begin={`${i * 1.8}s`} repeatCount="indefinite" values="0;1;1;0" keyTimes="0;0.15;0.85;1" />
            </g>
          ))}
      </svg>
      <svg className="lite-layer" style={{ "--depth": 0.9 } as CSSProperties} viewBox={box}>
        {[
          { x: 352, y: 278, r: -12, s: 0.9 },
          { x: 58, y: 92, r: 10, s: 0.75 },
          { x: 236, y: 316, r: 6, s: 0.6 },
        ].map((e, i) => (
          <g key={i} transform={`translate(${e.x} ${e.y}) rotate(${e.r}) scale(${e.s})`}>
            <g className="lite-float" style={{ "--i": i } as CSSProperties}>
              <Envelope />
            </g>
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ---------- Q1 ⇄ Q2 ---------- */

type Dir = "q1-q2" | "q2-q1";

function Side({ env, role }: { env: EnvInfo; role: "send" | "receive" }) {
  const e = env.id;
  return (
    <div className="env-side" data-tone={env.tone} data-role={role}>
      <div className="env-side__head">
        <span className="env-side__name">{env.name}</span>
        <span className="env-side__role" key={role}>
          {role === "send" ? "Sender" : "Mottar"}
        </span>
      </div>
      <code className="env-side__inst">{env.institution}</code>
      <ol className="env-side__stack">
        <li>nEESSI</li>
        <li className="arch-mono">eux-rina-api-{e}</li>
        <li className="env-side__rina">
          RINA <span className="arch-mono">{env.rinaHost.split(".")[0]}</span>
        </li>
        <li className="arch-mono">eux-all-rina-events-{e}</li>
      </ol>
    </div>
  );
}

function Exchange() {
  const reduced = useReducedMotion();
  const [dir, setDir] = useState<Dir>("q1-q2");
  const [run, setRun] = useState(0);
  const a = dir === "q1-q2" ? ENVS.q1 : ENVS.q2;
  const b = dir === "q1-q2" ? ENVS.q2 : ENVS.q1;

  const steps: ReactNode[] = [
    <>
      En saksbehandler sender SED-en fra nEESSI i {a.name}. <code>eux-neessi-{a.id}</code> ber{" "}
      <code>eux-rina-api-{a.id}</code> om å sende den.
    </>,
    <>
      RINA i {a.name} (<code>{a.institution}</code>) sender til <code>{b.institution}</code>, akkurat som til en
      institusjon i et annet land.
    </>,
    <>
      RINA i {b.name} tar imot og varsler <code>eux-all-rina-events-{b.id}</code> via NIE.
    </>,
    <>
      Hendelsen havner på Kafka-topics som slutter på <code>-{b.id}</code>, og resten av EUX i {b.name} tar over,
      for eksempel journalføring.
    </>,
  ];

  return (
    <div className="env-xchg" data-dir={dir}>
      <div className="env-xchg__stage">
        <Side env={ENVS.q1} role={a.id === "q1" ? "send" : "receive"} />
        <div className="env-xchg__lane" aria-hidden>
          <span className="env-xchg__track" />
          <span className="env-xchg__track env-xchg__track--back" />
          <span className="env-xchg__label">SED</span>
          {run > 0 && !reduced && (
            <span key={`${dir}-${run}`} className="env-xchg__sed">
              <PaperplaneIcon />
            </span>
          )}
        </div>
        <Side env={ENVS.q2} role={b.id === "q2" ? "receive" : "send"} />
      </div>

      <div className="env-xchg__controls">
        <ToggleGroup size="small" value={dir} onChange={(v) => setDir(v as Dir)} label="Retning">
          <ToggleGroup.Item value="q1-q2" label="Q1 → Q2" />
          <ToggleGroup.Item value="q2-q1" label="Q2 → Q1" />
        </ToggleGroup>
        <Button size="small" variant="secondary" icon={<PaperplaneIcon aria-hidden />} onClick={() => setRun((r) => r + 1)}>
          Send en SED
        </Button>
      </div>

      <ol className={`env-steps${run > 0 ? " is-running" : ""}`} key={`${dir}-${run}`} aria-live="polite">
        {steps.map((s, i) => (
          <li key={i} style={{ "--d": `${[0, 650, 1500, 2100][i]}ms` } as CSSProperties}>
            <span className="env-steps__n">{i + 1}</span>
            <BodyShort size="small">{s}</BodyShort>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Versions() {
  return (
    <div className="env-versions" data-same={sameRinaVersion}>
      {ENV_IDS.map((id, i) => (
        <span key={id} style={{ display: "contents" }}>
          {i === 1 && (
            <span className="env-versions__eq" role="img" aria-label={sameRinaVersion ? "lik" : "ulik"}>
              {sameRinaVersion ? "=" : "≠"}
            </span>
          )}
          <span className="env-version" data-tone={ENVS[id].tone}>
            <small>{ENVS[id].name}</small>
            <code>{ENVS[id].rinaVersion}</code>
          </span>
        </span>
      ))}
    </div>
  );
}

/* ---------- Miljøkort ---------- */

function EnvCard({ env }: { env: EnvInfo }) {
  const e = env.id;
  const rows: { k: string; v: ReactNode }[] = [
    { k: "Institusjon", v: <Copyable value={env.institution} /> },
    { k: "RINA", v: <ExtLink href={rinaUrl(e)} className="env-ext arch-mono">{env.rinaHost}</ExtLink> },
    { k: "RINA-versjon", v: <code>{env.rinaVersion}</code> },
    { k: "RINA-server", v: <Copyable value={env.rinaServer} /> },
    {
      k: "nEESSI",
      v: (
        <span className="env-variants">
          {NEESSI_VARIANTS.map((n) => (
            <a key={n.id} href={neessiUrl(e, n.id)} target="_blank" rel="noreferrer" title={`${n.text} ${neessiUrl(e, n.id)}`} className={n.id ? "portal-chip" : "portal-chip env-variants__main"}>
              {n.label}
            </a>
          ))}
        </span>
      ),
    },
    {
      k: "Mot RINA (CPI)",
      v: (
        <NextLink href="/applications#eux-rina-api" className="arch-mono">
          eux-rina-api-{e}
        </NextLink>
      ),
    },
    {
      k: "Fra RINA (NIE)",
      v: (
        <NextLink href="/applications#eux-all-rina-events" className="arch-mono">
          eux-all-rina-events-{e}
        </NextLink>
      ),
    },
    { k: "Kafka", v: <code>eessibasis.sedmottatt-v1-{e}</code> },
  ];

  return (
    <article id={`miljo-${e}`} className="env-card" data-tone={env.tone}>
      <header className="env-card__head">
        <span className="env-card__badge" aria-hidden>
          {env.name}
        </span>
        <div>
          <Heading level="3" size="medium">
            {env.name} <span className="arch-subtle env-card__inst">{env.institutionName}</span>
          </Heading>
          <BodyShort size="small" className="arch-subtle">
            {env.role}
          </BodyShort>
        </div>
      </header>
      <dl className="env-card__rows">
        {rows.map((r) => (
          <div key={r.k}>
            <dt>{r.k}</dt>
            <dd>{r.v}</dd>
          </div>
        ))}
      </dl>
      {e === "q2" && Q2_ONLY.length > 0 && (
        <BodyShort size="small" className="env-card__note">
          <StarIcon aria-hidden /> Bare i Q2:{" "}
          {Q2_ONLY.map((s, i) => (
            <span key={s.id}>
              {i > 0 && " og "}
              <NextLink href={`/applications#${s.id}`} className="arch-mono">
                {s.id}
              </NextLink>
            </span>
          ))}
          .
        </BodyShort>
      )}
    </article>
  );
}

/* ---------- Tjenestetabell ---------- */

function ServiceTable() {
  const [env, setEnv] = useState<EnvId>("q2");
  const shown = ENV_SERVICES.filter((s) => s.envs.includes(env)).length;

  return (
    <>
      <div className="env-toolbar">
        <ToggleGroup size="small" value={env} onChange={(v) => setEnv(v as EnvId)} label="Miljø">
          <ToggleGroup.Item value="q2" label="Q2" />
          <ToggleGroup.Item value="q1" label="Q1" />
        </ToggleGroup>
        <BodyShort size="small" className="arch-subtle" aria-live="polite">
          {shown} av {ENV_SERVICES.length} tjenester kjører i {ENVS[env].name}
        </BodyShort>
      </div>
      <div className="arch-table env-table" data-env={env} key={env}>
        <Table size="small">
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell scope="col">Tjeneste</Table.HeaderCell>
              <Table.HeaderCell scope="col">Adresse</Table.HeaderCell>
              <Table.HeaderCell scope="col">Swagger</Table.HeaderCell>
              <Table.HeaderCell scope="col">Helse</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {ENV_SERVICES.map((s, i) => {
              const here = s.envs.includes(env);
              const url = hostUrl(s, env);
              const swaggerElsewhere = !s.swagger.includes(env) && s.swagger.includes(other(env));
              return (
                <Table.Row key={s.id} className={here ? undefined : "is-dim"} style={{ "--i": i } as CSSProperties}>
                  <Table.HeaderCell scope="row">
                    <NextLink href={`/applications#${s.id}`} className="arch-mono env-table__name">
                      {s.id}
                    </NextLink>
                    {s.note && <span className="env-table__note">{s.note}</span>}
                  </Table.HeaderCell>
                  <Table.DataCell>
                    {!here ? (
                      <span className="arch-subtle">Ikke i {ENVS[env].name}</span>
                    ) : !s.health ? (
                      <code className="arch-subtle">{url.replace("https://", "")}</code>
                    ) : (
                      <span className="env-copy">
                        <ExtLink href={url} className="env-ext arch-mono">
                          {url.replace("https://", "")}
                        </ExtLink>
                        <CopyButton copyText={url} size="xsmall" title={`Kopier ${url}`} />
                      </span>
                    )}
                  </Table.DataCell>
                  <Table.DataCell>
                    {here && s.swagger.includes(env) ? (
                      <ExtLink href={swaggerUrl(s, env)} className="env-ext">Swagger UI</ExtLink>
                    ) : here && swaggerElsewhere ? (
                      <a href={swaggerUrl(s, other(env))} target="_blank" rel="noreferrer" className="env-table__elsewhere">
                        Bare i {ENVS[other(env)].name}
                      </a>
                    ) : (
                      <span className="arch-subtle" aria-label="Ingen">
                        –
                      </span>
                    )}
                  </Table.DataCell>
                  <Table.DataCell>
                    {here && s.health ? (
                      <a href={`${url}${s.health}`} target="_blank" rel="noreferrer" className="env-health" title={`${url}${s.health}`}>
                        <span className="env-health__dot" aria-hidden />
                        {s.health.split("/").pop()}
                      </a>
                    ) : (
                      <span className="arch-subtle" aria-label="Ingen">
                        –
                      </span>
                    )}
                  </Table.DataCell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table>
      </div>
    </>
  );
}

/* ---------- Side ---------- */

export default function EnvironmentsPage() {

  return (
    <div className="portal-page--wide arch-page lite-page env-page">
      <header className="portal-hero arch-hero lite-hero">
        <HeroArt />
        <div className="arch-hero__text">
          <Detail className="arch-eyebrow">Miljøer</Detail>
          <Heading level="1" size="xlarge" spacing>
            Q1 og Q2
          </Heading>
          <BodyLong size="large" className="arch-hero__lead">
            To testmiljøer i dev-gcp, hvert med sin egen RINA og sin egen institusjon. Vi har to for å kunne sende SED-er
            fra det ene til det andre. Det meste av testingen skjer i Q2.
          </BodyLong>
        </div>

        <HeroStats
          stats={[
            { n: 2, label: "testmiljøer", sub: `${ENVS.q1.institution} · ${ENVS.q2.institution}` },
            { n: IN_BOTH, label: "tjenester i begge", sub: `+${Q2_ONLY.length} bare i Q2` },
            { n: SWAGGER_COUNT, label: "med Swagger UI", sub: `${SWAGGER_Q1_ONLY.length} bare i Q1` },
            { n: sameRinaVersion ? "Lik" : "Ulik", label: "RINA-versjon", sub: sameRinaVersion ? ENVS.q1.rinaVersion : "se Q1 og Q2" },
          ]}
        />

        <div className="arch-flows">
          <a href="#miljo-q2" className="arch-flow-card" data-tone={ENVS.q2.tone}>
            <span className="arch-flow-card__icon" aria-hidden>
              <TestFlaskIcon />
            </span>
            <span>
              <strong>Q2 · hovedmiljøet</strong>
              <span className="arch-flow-card__text">
                Der det meste testes. {ENVS.q2.institution} på {ENVS.q2.rinaHost.split(".")[0]}.
              </span>
            </span>
            <ArrowRightIcon aria-hidden className="arch-flow-card__arrow" />
          </a>
          <a href="#miljo-q1" className="arch-flow-card" data-tone={ENVS.q1.tone}>
            <span className="arch-flow-card__icon" aria-hidden>
              <PaperplaneIcon />
            </span>
            <span>
              <strong>Q1 · motparten</strong>
              <span className="arch-flow-card__text">
                Sender til og mottar fra Q2. {ENVS.q1.institution} på {ENVS.q1.rinaHost.split(".")[0]}.
              </span>
            </span>
            <ArrowRightIcon aria-hidden className="arch-flow-card__arrow" />
          </a>
          <a href="#samspill" className="arch-flow-card" data-tone="info">
            <span className="arch-flow-card__icon" aria-hidden>
              <ArrowsSquarepathIcon />
            </span>
            <span>
              <strong>Q1 ⇄ Q2</strong>
              <span className="arch-flow-card__text">Slik går en SED fra det ene miljøet til det andre.</span>
            </span>
            <ArrowRightIcon aria-hidden className="arch-flow-card__arrow" />
          </a>
        </div>
      </header>

      <JumpNav sections={SECTIONS} />

      <Section
        id="samspill"
        eyebrow="Hvorfor to miljøer"
        title="Q1 og Q2 sender til hverandre"
        lead="Hvert miljø har sin egen RINA og sin egen institusjon. For RINA er Q1 og Q2 derfor to ulike institusjoner, og vi kan teste både sending og mottak uten å gå via et annet land."
      >
        <Exchange />

        <div className="env-why">
          <article className="env-why__card" data-tone="info">
            <Heading level="3" size="xsmall">
              Send fra det ene, motta i det andre
            </Heading>
            <BodyShort size="small">
              En SED sendt fra <code>{ENVS.q1.institution}</code> kommer inn som mottatt i <code>{ENVS.q2.institution}</code>,
              og omvendt. Da kan vi teste hele løpet på begge sider: sending, mottak, journalføring og oppgaver.
            </BodyShort>
            <NextLink href="/kafka/sed-kobling" className="env-why__link">
              Se par i SED-kobling <ArrowRightIcon aria-hidden />
            </NextLink>
          </article>
          <article className="env-why__card" data-tone={ENVS.q2.tone}>
            <Heading level="3" size="xsmall">
              Det meste testes i Q2
            </Heading>
            <BodyShort size="small">
              Q2 er hovedmiljøet. Det har mest trafikk, utveksler også med andre testinstitusjoner, og har tjenester som
              ikke finnes i Q1. Q1 brukes mest som motpart.
            </BodyShort>
            <NextLink href="/kafka/sed-hendelser" className="env-why__link">
              Se hendelsene live <ArrowRightIcon aria-hidden />
            </NextLink>
          </article>
          <article className="env-why__card" data-tone="accent">
            <Heading level="3" size="xsmall">
              Kan kjøre ulike RINA-versjoner
            </Heading>
            <BodyShort size="small">
              Av og til er det ene miljøet oppgradert før det andre. Da kan vi teste ny versjon mot gammel, slik det også
              blir mot andre land.
            </BodyShort>
            <Versions />
          </article>
        </div>
      </Section>

      <Section
        id="miljoer"
        eyebrow="Miljøene"
        title="Adresser og identiteter"
        lead="Det du trenger for å finne fram i hvert miljø. nEESSI finnes i fire utgaver per miljø, alle mot samme backend."
      >
        <div className="env-cards">
          <EnvCard env={ENVS.q2} />
          <EnvCard env={ENVS.q1} />
        </div>
        <dl className="env-shared">
          <div>
            <dt>Innlogging</dt>
            <dd>
              Azure AD med <code>@trygdeetaten.no</code>-testbruker, både i nEESSI og RINA.
            </dd>
          </div>
          <div>
            <dt>Gosys</dt>
            <dd>
              Felles for begge: <ExtLink href={GOSYS_URL} className="env-ext">gosys.dev.intern.nav.no</ExtLink>
            </dd>
          </div>
          <div>
            <dt>Produksjon</dt>
            <dd>
              Ikke her. Bruk <ExtLink href={NAIS_CONSOLE} className="env-ext">NAIS-konsollen</ExtLink>
            </dd>
          </div>
        </dl>
      </Section>

      <Section
        id="tjenester"
        eyebrow="Endepunkter"
        title="Tjenester i Q1 og Q2"
        lead={
          <>
            Alle har adressen <code>https://&lt;app&gt;-q1|q2.intern.dev.nav.no</code>, med to unntak: nEESSI ligger på{" "}
            <code>eux-neessi-qN</code> og eux-neessi på <code>eux-neessi-backend-qN</code>. Klikk på navnet for å se hva
            tjenesten gjør.
          </>
        }
      >
        <ServiceTable />
      </Section>

      <Section id="sporsmal" eyebrow="Spørsmål" title="Greit å vite">
        <Accordion className="env-faq">
          <Accordion.Item>
            <Accordion.Header>Hvordan logger jeg inn?</Accordion.Header>
            <Accordion.Content>
              <BodyLong size="small">
                nEESSI og backendene bruker Azure AD via Wonderwall. I testmiljøene logger du inn med en{" "}
                <code>@trygdeetaten.no</code>-testbruker, ikke din vanlige NAV-bruker. RINA bruker de samme testbrukerne,
                og er bare tilgjengelig fra NAV-nettet.
              </BodyLong>
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item>
            <Accordion.Header>Hvor finner jeg API-dokumentasjonen?</Accordion.Header>
            <Accordion.Content>
              <BodyLong size="small">
                {SWAGGER_COUNT} tjenester har Swagger UI på <code>/swagger-ui/index.html</code>.{" "}
                {SWAGGER_Q1_ONLY.map((s) => s.id).join(" og ")} har det bare i Q1. Swagger er slått av i produksjon. Bruk
                lenkene i <a href="#tjenester">tabellen over</a>.
              </BodyLong>
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item>
            <Accordion.Header>Hvordan ser jeg om en tjeneste kjører?</Accordion.Header>
            <Accordion.Content>
              <BodyLong size="small">
                Helselenken i tabellen svarer uten innlogging. Vil du teste hele veien, kan du{" "}
                <NextLink href="/tests">sende en ekte SED mellom Q1 og Q2</NextLink>.
              </BodyLong>
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item>
            <Accordion.Header>Hva betyr CPI og NIE?</Accordion.Header>
            <Accordion.Content>
              <BodyLong size="small">
                CPI (Case Processing Interface) er REST-API-et til RINA. Det brukes av {CPI_CALLERS.join(", ")}. NIE
                (National Interface Endpoint) er motsatt vei: RINA sender hendelser til{" "}
                <NextLink href="/applications#eux-all-rina-events">eux-all-rina-events</NextLink>, som legger dem på Kafka.
                Se <NextLink href={archHref("rina")}>RINA i arkitekturkartet</NextLink>.
              </BodyLong>
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item>
            <Accordion.Header>Hvor er produksjon?</Accordion.Header>
            <Accordion.Content>
              <BodyLong size="small">
                Produksjon er bevisst ikke med i portalen, så ingen åpner feil lenke ved et uhell. Bruk{" "}
                <a href={NAIS_CONSOLE} target="_blank" rel="noreferrer">
                  NAIS-konsollen
                </a>
                .
              </BodyLong>
            </Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </Section>

      <Section id="videre" eyebrow="Mer" title="Videre lesing">
        <FurtherReading links={FURTHER} />
      </Section>
    </div>
  );
}
