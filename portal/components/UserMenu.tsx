"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ActionMenu, Skeleton, Tooltip } from "@navikt/ds-react";
import {
  ChevronUpDownIcon,
  EnterIcon,
  FilesIcon,
  LeaveIcon,
  PersonIcon,
  ArrowsSquarepathIcon,
} from "@navikt/aksel-icons";
import { ThemeToggle } from "./ThemeToggle";

export type CurrentUser = {
  name: string;
  email: string | null;
  navIdent: string | null;
  mock?: boolean;
};

export type UserState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "authenticated"; user: CurrentUser };

/** Fetches the employee logged in through the NAIS login proxy (see /api/me). */
export function useCurrentUser(): UserState {
  const [state, setState] = useState<UserState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/me", { cache: "no-store", signal: controller.signal })
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((body: { user: CurrentUser | null }) =>
        setState(
          body.user
            ? { status: "authenticated", user: body.user }
            : { status: "anonymous" },
        ),
      )
      .catch((err: unknown) => {
        if ((err as Error).name !== "AbortError") {
          setState({ status: "anonymous" });
        }
      });
    return () => controller.abort();
  }, []);

  return state;
}

/** Wonderwall session end time, e.g. "18:42". Null outside NAIS. */
function useSessionEndsAt(enabled: boolean): string | null {
  const [endsAt, setEndsAt] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetch("/oauth2/session", {
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { session?: { ends_at?: string } } | null) => {
        const d = body?.session?.ends_at ? new Date(body.session.ends_at) : null;
        if (d && !Number.isNaN(d.getTime())) {
          setEndsAt(
            d.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" }),
          );
        }
      })
      .catch(() => {
        /* best effort */
      });
    return () => controller.abort();
  }, [enabled]);

  return endsAt;
}

/** Entra ID names at Nav are "Etternavn, Fornavn" — show them naturally. */
function displayName(name: string): string {
  const [last, first] = name.split(",").map((s) => s.trim());
  return first ? `${first} ${last}` : name;
}

function initials(name: string): string {
  const parts = displayName(name).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function loginHref(pathname: string, selectAccount = false): string {
  const params = new URLSearchParams({ redirect: pathname || "/" });
  if (selectAccount) params.set("prompt", "select_account");
  return `/oauth2/login?${params.toString()}`;
}

/** Bottom-of-sidebar profile area: who is logged in, account actions and theme. */
export function UserMenu({ state, compact = false }: {
  state: UserState;
  /** Avatar-only layout for the collapsed sidebar rail. */
  compact?: boolean;
}) {
  const pathname = usePathname();
  const sessionEndsAt = useSessionEndsAt(
    state.status === "authenticated" && !state.user.mock,
  );

  const loginLink = (
    <a className="portal-user__card portal-user__card--link" href={loginHref(pathname)}>
      <span className="portal-user__avatar portal-user__avatar--empty" aria-hidden>
        <PersonIcon />
      </span>
      <span className="portal-user__text">
        <span className="portal-user__name">Logg inn</span>
        <span className="portal-user__meta">Nav-ansatt (Entra ID)</span>
      </span>
      <EnterIcon aria-hidden className="portal-user__chevron" />
    </a>
  );

  return (
    <div className="portal-user">
      {state.status === "loading" && (
        <div className="portal-user__card" aria-busy="true">
          <Skeleton variant="circle" width={32} height={32} />
          <div className="portal-user__text">
            <Skeleton variant="text" width="7rem" />
            <Skeleton variant="text" width="4rem" />
          </div>
        </div>
      )}

      {state.status === "anonymous" && (compact ? (
        <Tooltip content="Logg inn som Nav-ansatt" placement="right">
          {loginLink}
        </Tooltip>
      ) : loginLink)}

      {state.status === "authenticated" && (
        <ActionMenu>
          <ActionMenu.Trigger>
            <button
              type="button"
              className="portal-user__card portal-user__card--button"
              aria-label={`Innlogget som ${displayName(state.user.name)}. Åpne brukermeny`}
            >
              <span className="portal-user__avatar" aria-hidden>
                {initials(state.user.name)}
              </span>
              <span className="portal-user__text">
                <span className="portal-user__name">
                  {displayName(state.user.name)}
                </span>
                <span className="portal-user__meta">
                  {state.user.navIdent ?? state.user.email ?? "Innlogget"}
                  {state.user.mock && " · lokal"}
                </span>
              </span>
              <ChevronUpDownIcon aria-hidden className="portal-user__chevron" />
            </button>
          </ActionMenu.Trigger>
          <ActionMenu.Content align="start" className="portal-user__menu">
            <ActionMenu.Label>
              <span className="portal-user__menu-name">
                {displayName(state.user.name)}
              </span>
              {state.user.email && (
                <span className="portal-user__menu-email">{state.user.email}</span>
              )}
              {sessionEndsAt && (
                <span className="portal-user__menu-session">
                  Økten varer til kl. {sessionEndsAt}
                </span>
              )}
            </ActionMenu.Label>
            <ActionMenu.Divider />
            {state.user.navIdent && (
              <ActionMenu.Item
                icon={<FilesIcon aria-hidden />}
                onSelect={() =>
                  void navigator.clipboard?.writeText(state.user.navIdent ?? "")
                }
              >
                Kopier NAV-ident ({state.user.navIdent})
              </ActionMenu.Item>
            )}
            <ActionMenu.Item
              as="a"
              href={loginHref(pathname, true)}
              icon={<ArrowsSquarepathIcon aria-hidden />}
            >
              Bytt konto
            </ActionMenu.Item>
            <ActionMenu.Divider />
            <ActionMenu.Item
              as="a"
              href="/oauth2/logout"
              variant="danger"
              icon={<LeaveIcon aria-hidden />}
            >
              Logg ut
            </ActionMenu.Item>
          </ActionMenu.Content>
        </ActionMenu>
      )}

      <ThemeToggle />
    </div>
  );
}
