/**
 * Colour tones shared by the portal's diagrams and cards. Each tone maps to
 * Aksel `--ax-*` tokens, so SVG fills and strokes follow light and dark mode.
 * The names match the `data-tone` values used in `app/globals.css`.
 */
export type Tone =
  | "accent"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "neutral"
  | "meta-purple"
  | "meta-lime"
  | "brand-magenta"
  | "brand-beige"
  | "brand-blue";

export type ToneTokens = {
  /** Soft background, for box fills. */
  fill: string;
  /** Default border. */
  stroke: string;
  /** Subtle border, for quieter outlines. */
  strokeSubtle: string;
  /** Text and icon colour on `fill`. */
  text: string;
  /** Strong background, for dots, badges and highlights. */
  strong: string;
};

const tokens = (tone: Tone, text = `var(--ax-text-${tone})`): ToneTokens => ({
  fill: `var(--ax-bg-${tone}-soft)`,
  stroke: `var(--ax-border-${tone})`,
  strokeSubtle: `var(--ax-border-${tone}-subtle)`,
  text,
  strong: `var(--ax-bg-${tone}-strong)`,
});

export const TONE: Record<Tone, ToneTokens> = {
  accent: tokens("accent"),
  info: tokens("info"),
  success: tokens("success"),
  warning: tokens("warning"),
  danger: tokens("danger"),
  neutral: tokens("neutral", "var(--ax-text-neutral-subtle)"),
  "meta-purple": tokens("meta-purple"),
  "meta-lime": tokens("meta-lime"),
  "brand-magenta": tokens("brand-magenta"),
  "brand-beige": tokens("brand-beige", "var(--ax-text-neutral-subtle)"),
  "brand-blue": tokens("brand-blue"),
};
