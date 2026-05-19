import {
  Heading,
  BodyLong,
  BodyShort,
  VStack,
  HStack,
  Box,
  Tag,
} from "@navikt/ds-react";
import NextLink from "next/link";

type Card = {
  href: string;
  external?: boolean;
  eyebrow: string;
  title: string;
  description: string;
  cta: string;
  className: string;
};

const cards: Card[] = [
  {
    href: "/architecture",
    eyebrow: "Hvordan henger det sammen",
    title: "Arkitekturoversikt",
    description:
      "En guidet tur gjennom EUX-tjenestene, Kafka-strømmene som binder dem sammen, og integrasjonene mot RINA, PDL, Dokarkiv og SAF.",
    cta: "Se arkitekturen →",
    className: "portal-card portal-card--blue",
  },
  {
    href: "/applications",
    eyebrow: "Katalog",
    title: "Applikasjoner",
    description:
      "Hver eneste EUX/EESSI-tjeneste vi drifter — hva den gjør, hva den er avhengig av, og hvor du finner kildekoden.",
    cta: "Bla i applikasjonene →",
    className: "portal-card portal-card--green",
  },
  {
    href: "/environments",
    eyebrow: "Test og utvikling",
    title: "Miljøer",
    description:
      "Q1 og Q2 — RINA-instanser, frontend-URL-er, CPI- og NIE-endepunkter, og Swagger-lenker per tjeneste.",
    cta: "Åpne miljøoversikten →",
    className: "portal-card portal-card--purple",
  },
  {
    href: "https://github.com/navikt/eux-architecture/blob/main/README.md",
    external: true,
    eyebrow: "Kildedokument",
    title: "README.md",
    description:
      "Det fullstendige, alltid oppdaterte arkitekturdokumentet på GitHub. Les dette før du gjør endringer på tvers av tjenester.",
    cta: "Les README-en →",
    className: "portal-card portal-card--orange",
  },
];

const subtleStyle = { color: "var(--ax-text-subtle, #555)" };
const eyebrowStyle = {
  ...subtleStyle,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
};

export default function Home() {
  return (
    <VStack gap="space-48">
      <section className="portal-hero">
        <Box
          paddingBlock={{ xs: "space-32", md: "space-48" }}
          paddingInline={{ xs: "space-24", md: "space-48" }}
        >
          <div style={{ maxWidth: "48rem" }}>
            <VStack gap="space-16">
              <BodyShort size="small" style={eyebrowStyle}>
                NAV · EUX · EESSI
              </BodyShort>
              <Heading level="1" size="xlarge">
                EUX-arkitekturen — samlet på ett sted
              </Heading>
              <BodyLong size="large">
                Når noen som bor i Norge har bodd eller jobbet i et annet
                EU/EØS-land, må NAV ofte utveksle informasjon med landet
                de kom fra — en pensjonssøknad, en sykepengesak, en
                familieytelse. Den utvekslingen skjer over{" "}
                <strong>EESSI</strong>, EUs elektroniske nettverk for
                trygdeinformasjon, gjennom et system som heter{" "}
                <strong>RINA</strong>.
              </BodyLong>
              <BodyLong>
                <strong>EUX</strong> er NAVs samling av tjenester som
                sitter mellom norske saksbehandlere og RINA. Denne
                portalen forklarer hva tjenestene er, hvordan de snakker
                sammen, og hvor du skal lete når du trenger å dykke
                dypere.
              </BodyLong>
              <HStack gap="space-8" align="center" wrap>
                <Tag size="small" variant="info">
                  Dokumentasjon
                </Tag>
                <Tag size="small" variant="neutral">
                  Testmiljø
                </Tag>
                <BodyShort size="small" style={subtleStyle}>
                  architecture.intern.dev.nav.no
                </BodyShort>
              </HStack>
            </VStack>
          </div>
        </Box>
      </section>

      <section>
        <Heading level="2" size="medium" spacing>
          Se deg rundt
        </Heading>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {cards.map((card) =>
            card.external ? (
              <a
                key={card.href}
                href={card.href}
                className={card.className}
                target="_blank"
                rel="noreferrer"
              >
                <CardBody card={card} />
              </a>
            ) : (
              <NextLink
                key={card.href}
                href={card.href}
                className={card.className}
              >
                <CardBody card={card} />
              </NextLink>
            )
          )}
        </div>
      </section>
    </VStack>
  );
}

function CardBody({ card }: { card: Card }) {
  return (
    <VStack gap="space-12">
      <BodyShort
        size="small"
        style={{
          ...subtleStyle,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {card.eyebrow}
      </BodyShort>
      <Heading level="3" size="small">
        {card.title}
      </Heading>
      <BodyLong>{card.description}</BodyLong>
      <BodyShort weight="semibold">{card.cta}</BodyShort>
    </VStack>
  );
}
