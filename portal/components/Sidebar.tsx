"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tooltip } from "@navikt/ds-react";
import {
  ChevronLeftIcon,
  ExternalLinkIcon,
  MenuHamburgerIcon,
  PadlockLockedIcon,
  XMarkIcon,
} from "@navikt/aksel-icons";
import { NAV_SECTIONS, type NavItem } from "@/lib/navigation";
import {
  SIDEBAR_COLLAPSED,
  SIDEBAR_DESKTOP_QUERY,
  SIDEBAR_STORAGE_KEY,
} from "@/lib/sidebar";
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

/* ── Collapsed state ──────────────────────────────────────────────────────
   Lives on <html data-sidebar> (set before first paint, see lib/sidebar.ts) and
   is mirrored to localStorage. React reads it via useSyncExternalStore. */

const collapseListeners = new Set<() => void>();

function emitCollapse() {
  for (const listener of collapseListeners) listener();
}

function applyCollapsed(collapsed: boolean) {
  const el = document.documentElement;
  if (collapsed) el.setAttribute("data-sidebar", SIDEBAR_COLLAPSED);
  else el.removeAttribute("data-sidebar");
}

function onStorage(event: StorageEvent) {
  if (event.key !== SIDEBAR_STORAGE_KEY) return;
  applyCollapsed(event.newValue === SIDEBAR_COLLAPSED);
  emitCollapse();
}

function subscribeCollapsed(callback: () => void) {
  collapseListeners.add(callback);
  if (collapseListeners.size === 1) window.addEventListener("storage", onStorage);
  return () => {
    collapseListeners.delete(callback);
    if (collapseListeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

function setCollapsed(collapsed: boolean) {
  applyCollapsed(collapsed);
  try {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? SIDEBAR_COLLAPSED : "expanded");
  } catch {
    /* storage unavailable — the choice lasts until reload */
  }
  emitCollapse();
}

const isCollapsed = () =>
  document.documentElement.getAttribute("data-sidebar") === SIDEBAR_COLLAPSED;

function subscribeDesktop(callback: () => void) {
  const media = window.matchMedia(SIDEBAR_DESKTOP_QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

const isDesktop = () => window.matchMedia(SIDEBAR_DESKTOP_QUERY).matches;
const serverFalse = () => false;
const subscribePlatform = () => () => {};
const isMacPlatform = () => /Mac|iPhone|iPad/.test(navigator.platform);

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
  const collapsed = useSyncExternalStore(subscribeCollapsed, isCollapsed, serverFalse);
  const desktop = useSyncExternalStore(subscribeDesktop, isDesktop, serverFalse);
  const isMac = useSyncExternalStore(subscribePlatform, isMacPlatform, () => true);
  // The icon-only rail only exists on wide screens; the mobile menu is unaffected.
  const rail = collapsed && desktop;
  const toggleCollapsed = useCallback(() => setCollapsed(!isCollapsed()), []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === "b" &&
        !event.isComposing &&
        isDesktop() &&
        !document.querySelector("dialog[open]")
      ) {
        event.preventDefault();
        if (!event.repeat) toggleCollapsed();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleCollapsed]);

  const brand = (
    <Link href="/" className="portal-brand" onClick={close}>
      <BrandMark />
      <span className="portal-brand__text">
        <span className="portal-brand__name">Team EESSI</span>
        <span className="portal-brand__sub">Arkitekturportal · Nav</span>
      </span>
    </Link>
  );

  return (
    <aside
      className="portal-sidebar"
      data-open={open}
      onKeyDown={(e) => {
        if (e.key === "Escape") close();
      }}
    >
      <Tooltip
        content={collapsed ? "Vis sidemeny" : "Skjul sidemeny"}
        keys={[isMac ? "⌘" : "Ctrl", "B"]}
        placement="right"
      >
        <button
          type="button"
          className="portal-sidebar__collapse"
          aria-expanded={!collapsed}
          aria-controls="portal-sidebar-panel"
          onClick={toggleCollapsed}
        >
          <ChevronLeftIcon aria-hidden />
        </button>
      </Tooltip>

      <div className="portal-sidebar__top">
        {rail ? (
          <Tooltip content="Team EESSI · Oversikt" placement="right">
            {brand}
          </Tooltip>
        ) : (
          brand
        )}
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

      <CommandMenu onNavigate={close} compact={rail} />

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
                  const locked = item.requiresLogin && user.status === "anonymous";
                  const link = item.external ? (
                    <a href={item.href} className={className} target="_blank" rel="noreferrer">
                      {content}
                      <ExternalLinkIcon title="åpnes i ny fane" className="portal-sidebar__trail" />
                    </a>
                  ) : (
                    <Link
                      href={item.href}
                      className={className}
                      aria-current={active ? "page" : undefined}
                      onClick={close}
                    >
                      {content}
                      {locked && (
                        <PadlockLockedIcon
                          title="Krever innlogging"
                          className="portal-sidebar__trail"
                        />
                      )}
                    </Link>
                  );
                  const hint = item.external
                    ? `${item.label} (åpnes i ny fane)`
                    : locked
                      ? `${item.label} · krever innlogging`
                      : item.label;
                  return (
                    <li key={item.href}>
                      {rail ? (
                        <Tooltip content={hint} placement="right">
                          {link}
                        </Tooltip>
                      ) : (
                        link
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <UserMenu state={user} compact={rail} />
      </div>
    </aside>
  );
}
