"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/** True once the element has been on screen. Starts false, so the first paint is the "before" state. */
export function useInView<T extends Element>(threshold = 0.25): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, inView];
}

/**
 * Sets --px and --py (-1…1) on the element while the pointer moves over it.
 * Layers use them with their own depth, so near layers move more than far ones.
 */
export function usePointerParallax<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let frame = 0;
    let x = 0;
    let y = 0;
    const apply = () => {
      frame = 0;
      el.style.setProperty("--px", x.toFixed(3));
      el.style.setProperty("--py", y.toFixed(3));
    };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      x = ((e.clientX - r.left) / r.width) * 2 - 1;
      y = ((e.clientY - r.top) / r.height) * 2 - 1;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const onLeave = () => {
      x = 0;
      y = 0;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return ref;
}

/** Points on a five-pointed star, centred on 0,0. */
export function starPath(r: number, inner = 0.42): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * inner;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    pts.push(`${(Math.cos(a) * rad).toFixed(2)} ${(Math.sin(a) * rad).toFixed(2)}`);
  }
  return `M ${pts.join(" L ")} Z`;
}

/** Positions on a circle, starting at twelve o'clock. */
export function ring(n: number, r: number, cx = 0, cy = 0): { x: number; y: number; a: number }[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, a };
  });
}
