import { BodyShort, Detail, Heading, Tag } from "@navikt/ds-react";
import { ArrowRightIcon, PersonIcon, PersonGroupIcon, HeartIcon } from "@navikt/aksel-icons";
import type { ComponentType, SVGProps } from "react";
import { FIELD_MAP, type Tone } from "./data";

type PersonCard = {
  id: string;
  title: string;
  tone: Tone;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  ident: string;
  fallback: string | null;
  paths: { path: string; note?: string }[];
  log: string;
};

const PERSONS: PersonCard[] = [
  {
    id: "bruker",
    title: "Bruker",
    tone: "accent",
    icon: PersonIcon,
    ident: "Første PIN med landkode NOR i nav.bruker.person.pin.",
    fallback: "Ellers fnr fra RINA-saken, hvis fødselsdato og navn stemmer.",
    paths: [
      { path: "nav.bruker.adresse[]", note: "F-SED fra versjon 4.4: nav.bruker.person.adresser[]" },
      { path: "horisontal.anmodningominformasjon.fastslaabosted.bruker.adresse[]" },
      { path: "nav.bruker.bostedsadresse", note: "Bare S048 og S055. Typen settes til bosted." },
    ],
    log: "Ingen ident for norge funnet, avslutter oppdatering av adresser for bruker",
  },
  {
    id: "ektefelle",
    title: "Ektefelle",
    tone: "info",
    icon: HeartIcon,
    ident: "Første PIN med landkode NOR i nav.ektefelle.person.pin.",
    fallback: null,
    paths: [{ path: "nav.ektefelle.adresse[]", note: "F-SED fra versjon 4.4: nav.ektefelle.person.adresser[]" }],
    log: "Ingen ident for norge funnet, avslutter oppdatering av adresser for ektefelle",
  },
  {
    id: "annen",
    title: "Annen person",
    tone: "meta-purple",
    icon: PersonGroupIcon,
    ident: "Første PIN med landkode NOR i nav.annenperson.person.pin.",
    fallback: null,
    paths: [{ path: "nav.annenperson.adresse[]", note: "F-SED fra versjon 4.4: nav.annenperson.person.adresser[]" }],
    log: "Ingen ident for norge funnet, avslutter oppdatering av adresser for annen person",
  },
];

export function SedPaths() {
  return (
    <div className="adr-sed">
      <ol className="adr-persons">
        {PERSONS.map((p, i) => {
          const Icon = p.icon;
          return (
            <li key={p.id} className="adr-person" data-tone={p.tone} style={{ ["--i" as string]: i }}>
              <div className="adr-person__head">
                <span className="adr-person__icon" aria-hidden>
                  <Icon />
                </span>
                <div>
                  <Detail className="arch-eyebrow">Nr. {i + 1} i rekkefølgen</Detail>
                  <Heading level="3" size="small">
                    {p.title}
                  </Heading>
                </div>
              </div>

              <div className="adr-person__block">
                <Detail weight="semibold">Norsk ident</Detail>
                <BodyShort size="small">{p.ident}</BodyShort>
                {p.fallback ? (
                  <BodyShort size="small" className="adr-person__fallback">
                    <a href="#person">{p.fallback}</a>
                  </BodyShort>
                ) : (
                  <Tag size="xsmall" variant="moderate" data-color="neutral" className="adr-person__tag">
                    Ingen reserve
                  </Tag>
                )}
              </div>

              <div className="adr-person__block">
                <Detail weight="semibold">Adressene leses fra</Detail>
                <ul className="adr-person__paths">
                  {p.paths.map((x) => (
                    <li key={x.path}>
                      <code className="adr-path">{x.path}</code>
                      {x.note && <small>{x.note}</small>}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="adr-person__foot">
                <Detail>Uten ident hoppes personen over:</Detail>
                <code>{p.log}</code>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="adr-map" role="table" aria-label="Felt i SED-en og feltene de blir i PDL">
        <div className="adr-map__row adr-map__row--head" role="row">
          <span role="columnheader">I SED-en</span>
          <span aria-hidden />
          <span role="columnheader">Hos oss og i PDL</span>
          <span role="columnheader">Innhold</span>
        </div>
        {FIELD_MAP.map((f, i) => (
          <div key={f.sed} className="adr-map__row" role="row" style={{ ["--i" as string]: i }}>
            <code role="cell" className="adr-map__sed">
              {f.sed}
            </code>
            <span className="adr-map__arrow" aria-hidden>
              <ArrowRightIcon />
            </span>
            <code role="cell" className="adr-map__pdl">
              {f.pdl}
            </code>
            <span role="cell" className="adr-map__text">
              {f.text}
            </span>
          </div>
        ))}
        <div className="adr-map__row adr-map__row--type" role="row" style={{ ["--i" as string]: FIELD_MAP.length }}>
          <code role="cell" className="adr-map__sed">
            type
          </code>
          <span className="adr-map__arrow" aria-hidden>
            <ArrowRightIcon />
          </span>
          <span role="cell" className="adr-map__types">
            <code>kontakt</code>
            <code>opphold</code>
            <code>bosted</code>
          </span>
          <span role="cell" className="adr-map__text">
            Avgjør hvilken regel som gjelder. Andre typer logges som «Ukjent adresse type» og hoppes over.
          </span>
        </div>
        <div className="adr-map__row adr-map__row--extra" role="row" style={{ ["--i" as string]: FIELD_MAP.length + 1 }}>
          <span role="cell" className="adr-map__sed adr-map__none">
            —
          </span>
          <span className="adr-map__arrow" aria-hidden>
            <ArrowRightIcon />
          </span>
          <code role="cell" className="adr-map__pdl">
            postboksNummerNavn
          </code>
          <span role="cell" className="adr-map__text">
            Fylles bare når vasken flytter gate-feltet hit fordi det inneholder et ord for postboks.
          </span>
        </div>
      </div>
    </div>
  );
}
