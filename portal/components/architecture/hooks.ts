"use client";

import { useEffect, useId, useState, useSyncExternalStore } from "react";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

const subscribeReducedMotion = (cb: () => void) => {
  const mq = window.matchMedia(REDUCED_MOTION);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

/** True when the user prefers reduced motion. Always false during SSR. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

/** Returns the id of the section currently in view. */
export function useScrollSpy(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  const key = ids.join(",");

  useEffect(() => {
    const elements = key
      .split(",")
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.set(entry.target.id, entry.boundingClientRect.top);
          else visible.delete(entry.target.id);
        }
        const first = elements.find((el) => visible.has(el.id));
        if (first) setActive(first.id);
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [key]);

  return active;
}

export type SvgIds = {
  /** The id to put on a `<marker>`, gradient or clip path. */
  id: (name: string) => string;
  /** `url(#…)` for `markerEnd`, `fill`, `clipPath` and similar attributes. */
  url: (name: string) => string;
  /** `#…` for `href` on `<use>` and `<mpath>`. */
  href: (name: string) => string;
};

/**
 * Ids for the defs of one inline SVG, unique per component instance, so two
 * diagrams on the same page never resolve each other's markers or gradients.
 */
export function useSvgIds(): SvgIds {
  const base = useId();
  const id = (name: string) => `${base}${name}`;
  return { id, url: (name) => `url(#${id(name)})`, href: (name) => `#${id(name)}` };
}
