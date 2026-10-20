"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ExternalLinkIcon,
  MenuHamburgerIcon,
  PadlockLockedIcon,
  XMarkIcon,
} from "@navikt/aksel-icons";
import { NAV_SECTIONS, type NavItem } from "@/lib/navigation";
import { UserMenu, useCurrentUser } from "./UserMenu";
import { CommandMenu } from "./CommandMenu";

/** Twelve dots in a ring — a quiet nod to the EU flag. */
function BrandMark() {
  const dots = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    return { cx: 16 + Math.cos(a) * 8, cy: 16 + Math.sin(a) * 8 };
  });
  return (
    <svg className="portal-brand__mark" viewBox="0 0 32 32" aria-hidden focusable="false">
      <rect width="32" height="32" rx="9" />
      <g className="portal-brand__ring">
        {dots.map((d, i) => (
          <circle key={i} cx={d.cx.toFixed(2)} cy={d.cy.toFixed(2)} r="1.55" />
        ))}
      </g>
    </svg>
  );
}

function isActive(pathname: string, item: NavItem): boolean {
  if (item.external) return false;
  if (item.href === "/") return pathname === "/";
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

export function Sidebar() {
  const pathname = usePathname();
  const user = useCurrentUser();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <aside
      className="portal-sidebar"
      data-open={open}
      onKeyDown={(e) => {
        if (e.key === "Escape") close();
      }}
    >
      <div className="portal-sidebar__top">
        <Link href="/" className="portal-brand" onClick={close}>
          <BrandMark />
          <span className="portal-brand__text">
            <span className="portal-brand__name">Team EESSI</span>
            <span className="portal-brand__sub">Arkitekturportal · Nav</span>
          </span>
        </Link>
        <button
          type="button"
          className="portal-sidebar__toggle"
          aria-expanded={open}
          aria-controls="portal-sidebar-panel"
          aria-label={open ? "Lukk meny" : "Åpne meny"}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <XMarkIcon aria-hidden /> : <MenuHamburgerIcon aria-hidden />}
        </button>
      </div>

      <CommandMenu onNavigate={close} />

      <div id="portal-sidebar-panel" className="portal-sidebar__panel">
        <nav aria-label="Hovedmeny" className="portal-sidebar__nav">
          {NAV_SECTIONS.map((section, i) => (
            <div key={i} className="portal-sidebar__section">
              {section.heading && (
                <div className="portal-sidebar__heading">{section.heading}</div>
              )}
              <ul className="portal-sidebar__list">
                {section.items.map((item) => {
                  const active = isActive(pathname, item);
                  const className =
                    "portal-sidebar__link" +
                    (active ? " portal-sidebar__link--active" : "");
                  const content = (
                    <>
                      <item.Icon aria-hidden className="portal-sidebar__icon" />
                      <span className="portal-sidebar__label">{item.label}</span>
                    </>
                  );
                  if (item.external) {
                    return (
                      <li key={item.href}>
                        <a href={item.href} className={className} target="_blank" rel="noreferrer">
                          {content}
                          <ExternalLinkIcon title="åpnes i ny fane" className="portal-sidebar__trail" />
                        </a>
                      </li>
                    );
                  }
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={className}
                        aria-current={active ? "page" : undefined}
                        onClick={close}
                      >
                        {content}
                        {item.requiresLogin && user.status === "anonymous" && (
                          <PadlockLockedIcon
                            title="Krever innlogging"
                            className="portal-sidebar__trail"
                          />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <UserMenu state={user} />
      </div>
    </aside>
  );
}
