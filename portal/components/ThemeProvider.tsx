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
import {
  applyTheme,
  readThemeMode,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemeMode,
} from "@/lib/theme";

type ThemeContextValue = {
  /** The user's chosen preference. */
  mode: ThemeMode;
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

// Cached so getSnapshot returns a stable reference until something changes.
let cachedSnapshot: Snapshot | null = null;

function getSnapshot(): Snapshot {
  const mode = readThemeMode(THEME_STORAGE_KEY);
  const resolved = resolveTheme(mode);
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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { mode, resolved } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  // Keep <html> in step with the boot script, so native controls and the Aksel tokens follow changes.
  useEffect(() => {
    if (resolved) applyTheme(mode, resolved);
  }, [mode, resolved]);

  const setMode = useCallback((next: ThemeMode) => setStoredMode(next), []);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, setMode }),
    [mode, setMode],
  );

  return (
    <ThemeContext.Provider value={value}>
      <Theme theme={resolved}>{children}</Theme>
    </ThemeContext.Provider>
  );
}
