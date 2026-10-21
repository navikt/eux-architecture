"use client";

import { useEffect, useState } from "react";

/**
 * Steps through `count` steps, one every `stepMs` while playing. Playback stops on the last step,
 * and `go` jumps to a step and pauses. Playing from the last step starts over.
 */
export function useStepPlayer(count: number, stepMs: number) {
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const last = count - 1;
  const index = Math.min(current, last);
  const running = playing && index < last;

  useEffect(() => {
    if (!running) return;
    const t = window.setTimeout(() => setCurrent((i) => Math.min(i + 1, last)), stepMs);
    return () => window.clearTimeout(t);
  }, [running, index, last, stepMs]);

  const go = (i: number) => {
    setPlaying(false);
    setCurrent(Math.max(0, Math.min(last, i)));
  };

  const toggle = () => {
    if (running) return setPlaying(false);
    if (index >= last) setCurrent(0);
    setPlaying(true);
  };

  return { index, count, running, go, toggle };
}

export type StepPlayer = ReturnType<typeof useStepPlayer>;
