"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { Theme } from "@navikt/ds-react";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "portal-theme";

type ThemeContextValue = {
  /** The user's chosen preference. */
  mode: ThemeMode;
  /** The theme actually rendered ("system" resolved against the OS setting). */
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Access the current theme mode and setter. Must be used under ThemeProvider. */
export function useThemeMode(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeMode must be used within <ThemeProvider>");
  }
  return ctx;
}

/* ── External theme store ─────────────────────────────────────────────────
   The preference lives in localStorage and the resolved theme also depends on
   the OS setting — both external to React. We expose them through
   useSyncExternalStore so reads are hydration-safe and updates never require a
   setState-in-effect. */

type Snapshot = { mode: ThemeMode; resolved: ResolvedTheme | undefined };

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function readMode(): ThemeMode {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    /* storage unavailable */
  }
  return "system";
}

function resolve(mode: ThemeMode): ResolvedTheme {
  const dark = mode === "dark" || (mode === "system" && systemPrefersDark());
  return dark ? "dark" : "light";
}

// Cached so getSnapshot returns a stable reference until something changes.
let cachedSnapshot: Snapshot | null = null;

function getSnapshot(): Snapshot {
  const mode = readMode();
  const resolved = resolve(mode);
  if (
    cachedSnapshot &&
    cachedSnapshot.mode === mode &&
    cachedSnapshot.resolved === resolved
  ) {
    return cachedSnapshot;
  }
  cachedSnapshot = { mode, resolved };
  return cachedSnapshot;
}

// `resolved: undefined` keeps the root <Theme> class-free during SSR and
// hydration, so the boot script's <html> theme shows through with no flash and
// server/client markup stays identical.
const SERVER_SNAPSHOT: Snapshot = { mode: "system", resolved: undefined };

function getServerSnapshot(): Snapshot {
  return SERVER_SNAPSHOT;
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", emit);
  window.addEventListener("storage", emit);
  return () => {
    listeners.delete(callback);
    media.removeEventListener("change", emit);
    window.removeEventListener("storage", emit);
  };
}

function setStoredMode(mode: ThemeMode): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    /* storage unavailable — best effort */
  }
  emit();
}

/**
 * Reflects the resolved theme on <html> so native controls and the Aksel
 * design tokens (which cascade from the `.light` / `.dark` class) stay in sync
 * with the boot script.
 */
function applyToDocument(mode: ThemeMode, resolved: ResolvedTheme): void {
  const el = document.documentElement;
  el.classList.remove("light", "dark");
  el.classList.add(resolved);
  el.style.colorScheme = resolved;
  el.setAttribute("data-theme-mode", mode);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { mode, resolved } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  useEffect(() => {
    if (resolved) applyToDocument(mode, resolved);
  }, [mode, resolved]);

  const setMode = useCallback((next: ThemeMode) => setStoredMode(next), []);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, resolvedTheme: resolved ?? "light", setMode }),
    [mode, resolved, setMode],
  );

  return (
    <ThemeContext.Provider value={value}>
      <Theme theme={resolved}>{children}</Theme>
    </ThemeContext.Provider>
  );
}
