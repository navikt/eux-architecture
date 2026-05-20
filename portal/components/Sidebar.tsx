"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_SECTIONS: { heading?: string; items: { href: string; label: string; external?: boolean; requiresLogin?: boolean }[] }[] = [
  {
    items: [{ href: "/", label: "Oversikt" }],
  },
  {
    heading: "Plattform",
    items: [
      { href: "/architecture", label: "Arkitektur" },
      { href: "/applications", label: "Applikasjoner" },
      { href: "/environments", label: "Miljøer" },
    ],
  },
  {
    heading: "Verktøy",
    items: [
      { href: "/tests", label: "Smoke-test", requiresLogin: true },
    ],
  },
  {
    heading: "Ressurser",
    items: [
      { href: "https://github.com/navikt/eux-architecture", label: "GitHub", external: true },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav aria-label="Hovedmeny" className="portal-sidebar">
      {NAV_SECTIONS.map((section, i) => (
        <div key={i} className="portal-sidebar__section">
          {section.heading && (
            <div className="portal-sidebar__heading">{section.heading}</div>
          )}
          <ul className="portal-sidebar__list">
            {section.items.map((item) => {
              const active =
                !item.external &&
                (item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(item.href + "/"));
              const className =
                "portal-sidebar__link" +
                (active ? " portal-sidebar__link--active" : "");
              if (item.external) {
                return (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className={className}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {item.label}
                      <span aria-hidden="true" style={{ marginLeft: 6, opacity: 0.6 }}>↗</span>
                    </a>
                  </li>
                );
              }
              return (
                <li key={item.href}>
                  <Link href={item.href} className={className} aria-current={active ? "page" : undefined}>
                    {item.label}
                    {item.requiresLogin && (
                      <span
                        aria-label="Krever innlogging"
                        title="Krever innlogging"
                        style={{ marginLeft: 6, opacity: 0.55, fontSize: "0.85em" }}
                      >
                        🔒
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
