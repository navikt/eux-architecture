/**
 * Light/dark theme. The preference lives in localStorage under THEME_STORAGE_KEY
 * and is shown on <html> as a `light`/`dark` class (the Aksel tokens cascade from
 * it), `color-scheme` and `data-theme-mode`. The boot script (run from
 * app/layout.tsx) applies it before first paint, and components/ThemeProvider.tsx
 * keeps it in sync afterwards. Both use the functions below, so they can't drift.
 */
export const THEME_STORAGE_KEY = "portal-theme";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

// The three functions are copied into the boot script as source text, so they
// must stay self-contained: browser globals only, no imports or module constants.

export function readThemeMode(key: string): ThemeMode {
  try {
    const stored = window.localStorage.getItem(key);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    // storage unavailable
  }
  return "system";
}

/** The theme to render: "system" follows the OS setting. */
export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  const dark = mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  return dark ? "dark" : "light";
}

export function applyTheme(mode: ThemeMode, resolved: ResolvedTheme): void {
  const el = document.documentElement;
  el.classList.remove("light", "dark");
  el.classList.add(resolved);
  el.style.colorScheme = resolved;
  el.setAttribute("data-theme-mode", mode);
}

export const themeBootScript = `(function(){try{var m=(${readThemeMode.toString()})(${JSON.stringify(
  THEME_STORAGE_KEY,
)});(${applyTheme.toString()})(m,(${resolveTheme.toString()})(m));}catch(_){}})();`;
