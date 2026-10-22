"use client";

import { useCallback, useEffect, useId, useState, useSyncExternalStore } from "react";

/**
 * Whether the CSS media query matches. `null` during SSR and hydration, so
 * callers can render markup for both cases until the client knows.
 */
export function useMediaQuery(query: string): boolean | null {
  const subscribe = useCallback(
    (cb: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => null,
  );
}

/** True when the user prefers reduced motion. Always false during SSR. */
export function useReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)") ?? false;
}

/** Scrolls the element with the given id to the top of the view, smoothly unless the user prefers reduced motion. */
export function useScrollTo(): (id: string) => void {
  const reduced = useReducedMotion();
  return useCallback(
    (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" }),
    [reduced],
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
