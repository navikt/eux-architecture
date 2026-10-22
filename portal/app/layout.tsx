import "@navikt/ds-css";
import "./globals.css";
import "@navikt/next-logger";

import type { Metadata } from "next";
import { Box } from "@navikt/ds-react";
import { Sidebar } from "@/components/Sidebar";
import { ThemeProvider, THEME_STORAGE_KEY } from "@/components/ThemeProvider";
import { sidebarBootScript } from "@/lib/sidebar";

export const metadata: Metadata = {
  title: "Team EESSI Nav",
  description:
    "Arkitekturportal for NAVs EUX/EESSI-plattform — applikasjoner, integrasjoner, API-er og hvordan det henger sammen.",
};

// Runs before first paint so the correct theme is applied with no flash and no
// hydration mismatch (see ThemeProvider). Keep in sync with THEME_STORAGE_KEY.
const themeBootScript = `(function(){try{var m=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(m!=="light"&&m!=="dark"&&m!=="system")m="system";var d=m==="dark"||(m==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var e=document.documentElement;e.classList.remove("light","dark");e.classList.add(d?"dark":"light");e.style.colorScheme=d?"dark":"light";e.setAttribute("data-theme-mode",m);}catch(_){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="no" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript + sidebarBootScript }} />
      </head>
      <body>
        <ThemeProvider>
          <a href="#main" className="portal-skip-link">
            Hopp til innhold
          </a>
          <div className="portal-shell">
            <Sidebar />
            <Box
              as="main"
              id="main"
              tabIndex={-1}
              className="portal-main"
              paddingInline={{ xs: "space-16", md: "space-40" }}
              paddingBlock={{ xs: "space-24", md: "space-48" }}
              style={{ maxWidth: "var(--portal-wide-max)", width: "100%" }}
            >
              {children}
            </Box>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
