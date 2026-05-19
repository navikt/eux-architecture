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
    eyebrow: "How it fits together",
    title: "Architecture overview",
    description:
      "A guided tour of the EUX services, the Kafka topics that glue them together, and the integrations to RINA, PDL, Dokarkiv and SAF.",
    cta: "See the architecture →",
    className: "portal-card portal-card--blue",
  },
  {
    href: "/applications",
    eyebrow: "Catalogue",
    title: "Applications",
    description:
      "Every EUX/EESSI service we run — what it does, what it depends on, and where to find its source code.",
    cta: "Browse applications →",
    className: "portal-card portal-card--green",
  },
  {
    href: "https://eux-rina-gateway-portal-q1.intern.dev.nav.no",
    external: true,
    eyebrow: "Sister portal",
    title: "RINA Gateway portal",
    description:
      "A friendlier window into the gateway: live status, end-to-end smoke tests, and the story behind the replacement of the old EESSI integration.",
    cta: "Open RINA Gateway portal →",
    className: "portal-card portal-card--purple",
  },
  {
    href: "https://github.com/navikt/eux-architecture/blob/main/README.md",
    external: true,
    eyebrow: "Source of truth",
    title: "README.md",
    description:
      "The full, always-current architecture document on GitHub. Read this before making changes that cross service boundaries.",
    cta: "Read the README →",
    className: "portal-card portal-card--orange",
  },
];

const facts = [
  { label: "Services in the platform", value: "~24" },
  { label: "Kafka topics", value: "5+" },
  { label: "External integrations", value: "RINA · PDL · Dokarkiv · SAF" },
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
                The EUX architecture, in one place
              </Heading>
              <BodyLong size="large">
                When someone in Norway has lived or worked elsewhere in the
                EU, NAV often needs to exchange information with the country
                they came from — a pension claim, a sickness benefit, a
                family allowance. Those exchanges happen over{" "}
                <strong>EESSI</strong>, the EU&rsquo;s electronic
                social-security network, through a system called{" "}
                <strong>RINA</strong>.
              </BodyLong>
              <BodyLong>
                <strong>EUX</strong> is NAV&rsquo;s collection of services
                that sit between Norwegian caseworkers and RINA. This portal
                explains what those services are, how they talk to each
                other, and where to look when you need to dive deeper.
              </BodyLong>
              <HStack gap="space-8" align="center" wrap>
                <Tag size="small" variant="info">
                  Documentation
                </Tag>
                <Tag size="small" variant="neutral">
                  Test environment
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
          Take a look around
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

      <section>
        <Heading level="2" size="medium" spacing>
          EUX in three numbers
        </Heading>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
          }}
        >
          {facts.map((f) => (
            <Box
              key={f.label}
              padding="space-24"
              borderRadius="8"
              borderWidth="1"
              borderColor="neutral-subtle"
              background="neutral-soft"
            >
              <VStack gap="space-4">
                <Heading level="3" size="large">
                  {f.value}
                </Heading>
                <BodyShort size="small" style={subtleStyle}>
                  {f.label}
                </BodyShort>
              </VStack>
            </Box>
          ))}
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
