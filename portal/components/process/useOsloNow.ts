"use client";

import { useEffect, useState } from "react";
import { osloNow, type OsloTime } from "./time";

/**
 * The current time in Europe/Oslo, refreshed every `intervalMs`. Null during
 * SSR and the first client render, so the markup hydrates without a mismatch.
 */
export function useOsloNow(intervalMs = 30_000): OsloTime | null {
  const [now, setNow] = useState<OsloTime | null>(null);

  useEffect(() => {
    const tick = () => setNow(osloNow());
    const first = window.setTimeout(tick, 0);
    const t = window.setInterval(tick, intervalMs);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(t);
    };
  }, [intervalMs]);

  return now;
}
