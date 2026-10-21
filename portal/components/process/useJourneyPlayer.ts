"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/components/architecture/hooks";

/** Maps a timeline value to playback progress (0–1) and back, for axes that are not linear. */
export type JourneyScale = {
  toProgress: (value: number) => number;
  fromProgress: (progress: number) => number;
};

const linear = (end: number): JourneyScale => ({
  toProgress: (v) => v / end,
  fromProgress: (p) => p * end,
});

/**
 * Plays a value from 0 to `end` over `durationMs`, and lets the user pause and scrub.
 * The value is `null` until the user interacts, so `shown` starts at the end.
 * Reduced motion jumps straight to the end. Changing `resetKey` stops playback and resets.
 */
export function useJourneyPlayer({
  end,
  durationMs,
  resetKey,
  scale,
}: {
  end: number;
  durationMs: number;
  resetKey: string;
  /** Must be stable between renders, for example a module constant. Defaults to linear. */
  scale?: JourneyScale;
}) {
  const reduced = useReducedMotion();
  const [value, setValue] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const startProgress = useRef(0);

  const [lastKey, setLastKey] = useState(resetKey);
  if (lastKey !== resetKey) {
    setLastKey(resetKey);
    setValue(null);
    setPlaying(false);
  }

  useEffect(() => {
    if (!playing) return;
    const { fromProgress } = scale ?? linear(end);
    const from = startProgress.current;
    let start: number | null = null;
    let raf: number;
    const tick = (ts: number) => {
      if (start === null) start = ts - from * durationMs;
      const p = Math.min(1, (ts - start) / durationMs);
      setValue(Math.round(fromProgress(p)));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setPlaying(false);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, end, durationMs, scale]);

  const toggle = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (reduced) {
      setValue(null);
      return;
    }
    const from = value === null || value >= end ? 0 : value;
    startProgress.current = (scale ?? linear(end)).toProgress(from);
    setValue(from);
    setPlaying(true);
  };

  const seek = (v: number) => {
    setPlaying(false);
    setValue(v);
  };

  return { shown: value ?? end, playing, toggle, seek };
}

export type JourneyPlayer = ReturnType<typeof useJourneyPlayer>;
