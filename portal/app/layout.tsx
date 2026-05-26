import "@navikt/ds-css";
import "./globals.css";
import "@navikt/next-logger";

import type { Metadata } from "next";
import Link from "next/link";
import { Theme, Box, HStack, Heading } from "@navikt/ds-react";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Team EESSI Nav",
  description:
    "Arkitekturportal for NAVs EUX/EESSI-plattform — applikasjoner, integrasjoner, API-er og hvordan det henger sammen.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="no" data-color-scheme="auto">
      <body>
        <Theme>
          <Box
            as="header"
            paddingInline={{ xs: "space-16", md: "space-32" }}
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
                  Team EESSI Nav
                </Heading>
              </Link>
            </HStack>
          </Box>
          <div className="portal-shell">
            <Sidebar />
            <Box
              as="main"
              paddingInline={{ xs: "space-16", md: "space-40" }}
              paddingBlock={{ xs: "space-24", md: "space-48" }}
              style={{ maxWidth: "var(--portal-wide-max)", width: "100%" }}
            >
              {children}
            </Box>
          </div>
        </Theme>
      </body>
    </html>
  );
}
