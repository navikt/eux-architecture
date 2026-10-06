import type { Tone } from "./data";

/** Aksel tokens per tone, for SVG fills and strokes. */
export const TONE: Record<Tone, { fill: string; stroke: string; text: string; strong: string }> = {
  accent: {
    fill: "var(--ax-bg-accent-soft)",
    stroke: "var(--ax-border-accent)",
    text: "var(--ax-text-accent)",
    strong: "var(--ax-bg-accent-strong)",
  },
  warning: {
    fill: "var(--ax-bg-warning-soft)",
    stroke: "var(--ax-border-warning)",
    text: "var(--ax-text-warning)",
    strong: "var(--ax-bg-warning-strong)",
  },
  info: {
    fill: "var(--ax-bg-info-soft)",
    stroke: "var(--ax-border-info)",
    text: "var(--ax-text-info)",
    strong: "var(--ax-bg-info-strong)",
  },
  success: {
    fill: "var(--ax-bg-success-soft)",
    stroke: "var(--ax-border-success)",
    text: "var(--ax-text-success)",
    strong: "var(--ax-bg-success-strong)",
  },
  neutral: {
    fill: "var(--ax-bg-neutral-soft)",
    stroke: "var(--ax-border-neutral)",
    text: "var(--ax-text-neutral-subtle)",
    strong: "var(--ax-bg-neutral-strong)",
  },
  danger: {
    fill: "var(--ax-bg-danger-soft)",
    stroke: "var(--ax-border-danger)",
    text: "var(--ax-text-danger)",
    strong: "var(--ax-bg-danger-strong)",
  },
  "meta-purple": {
    fill: "var(--ax-bg-meta-purple-soft)",
    stroke: "var(--ax-border-meta-purple)",
    text: "var(--ax-text-meta-purple)",
    strong: "var(--ax-bg-meta-purple-strong)",
  },
};

/** Link to a node in the architecture map. */
export const archHref = (id: string) => `/architecture?fokus=${encodeURIComponent(id)}#kart`;

export const ghHref = (repo: string) => `https://github.com/navikt/${repo}`;
