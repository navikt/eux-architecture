import "@navikt/ds-css";
import "./globals.css";
import "@navikt/next-logger";

import type { Metadata } from "next";
import Link from "next/link";
import { Theme, Box, HStack, Heading, BodyShort } from "@navikt/ds-react";

export const metadata: Metadata = {
  title: "EUX Architecture",
  description:
    "Architecture portal for NAV's EUX/EESSI platform — applications, integrations, APIs and how it all fits together.",
};

const NAV_LINKS = [
  { href: "/", label: "Overview" },
  { href: "/architecture", label: "Architecture" },
  { href: "/applications", label: "Applications" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-color-scheme="auto">
      <body>
        <Theme>
          <Box
            as="header"
            paddingInline={{ xs: "space-16", md: "space-40" }}
            paddingBlock="space-16"
            borderWidth="0 0 1 0"
            borderColor="neutral-subtle"
          >
            <HStack justify="space-between" align="center" gap="space-16">
              <Link
                href="/"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <Heading level="1" size="small">
                  EUX Architecture
                </Heading>
              </Link>
              <HStack gap="space-20" align="center">
                {NAV_LINKS.map((l) => (
                  <BodyShort size="small" key={l.href}>
                    <Link
                      href={l.href}
                      style={{ color: "inherit", textDecoration: "none" }}
                    >
                      {l.label}
                    </Link>
                  </BodyShort>
                ))}
                <BodyShort size="small">
                  <a
                    href="https://github.com/navikt/eux-architecture"
                    style={{ color: "inherit" }}
                    target="_blank"
                    rel="noreferrer"
                  >
                    GitHub
                  </a>
                </BodyShort>
              </HStack>
            </HStack>
          </Box>
          <Box
            as="main"
            paddingInline={{ xs: "space-16", md: "space-40" }}
            paddingBlock={{ xs: "space-24", md: "space-48" }}
            marginInline="auto"
            style={{ maxWidth: "var(--portal-wide-max)", width: "100%" }}
          >
            {children}
          </Box>
        </Theme>
      </body>
    </html>
  );
}
