"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** New rows that arrive within this window are announced together. */
const SETTLE_MS = 1000;
/** At most one new-rows announcement per this interval. */
export const ARRIVAL_GAP_MS = 5000;
/** How long the search and filters must be still before the hit count is announced. */
const FILTER_DEBOUNCE_MS = 800;

export interface Announcement {
  id: number;
  text: string;
}

/**
 * A visually hidden polite live region. Each new `message.id` replaces the
 * text node, so the same text is read again when it is announced twice.
 */
export function Announcer({ message }: { message: Announcement | null }) {
  return (
    <div role="status" className="aksel-sr-only">
      {message && <span key={message.id}>{message.text}</span>}
    </div>
  );
}

function useAnnouncement() {
  const [message, setMessage] = useState<Announcement | null>(null);
  const say = useCallback((text: string) => setMessage((m) => ({ id: (m?.id ?? 0) + 1, text })), []);
  return [message, say] as const;
}

/** Keeps the latest value in a ref, for timers that fire after later renders. */
function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}

/**
 * Announces rows that arrive while the page is open as one summary, such as
 * "3 nye hendelser". A burst within SETTLE_MS gives one announcement, and a
 * steady stream gives at most one per ARRIVAL_GAP_MS.
 *
 * `all` are the keys of every row and `shown` the keys of the rows that pass
 * the current filters; only new rows that are shown are counted. The rows that
 * are there when `ready` first becomes true (the first snapshot) are not.
 */
export function useArrivalAnnouncement({
  all,
  shown,
  ready,
  label,
}: {
  all: readonly string[];
  shown: readonly string[];
  ready: boolean;
  /** The text for `n` new rows, such as "3 nye hendelser". */
  label: (n: number) => string;
}): Announcement | null {
  const [message, say] = useAnnouncement();
  const labelRef = useLatest(label);
  const state = useRef({
    known: null as Set<string> | null,
    count: 0,
    timer: null as ReturnType<typeof setTimeout> | null,
    lastAt: -Infinity,
  });

  useEffect(() => {
    if (!ready) return;
    const s = state.current;
    const before = s.known;
    s.known = new Set(all);
    if (!before) return;
    const visible = new Set(shown);
    const fresh = all.filter((k) => !before.has(k) && visible.has(k)).length;
    if (fresh === 0) return;
    s.count += fresh;
    if (s.timer) return;
    const now = Date.now();
    const wait = Math.max(SETTLE_MS, s.lastAt + ARRIVAL_GAP_MS - now);
    s.timer = setTimeout(() => {
      const n = s.count;
      s.timer = null;
      s.count = 0;
      s.lastAt = Date.now();
      say(labelRef.current(n));
    }, wait);
  }, [all, shown, ready, say, labelRef]);

  useEffect(() => {
    const s = state.current;
    return () => {
      if (s.timer) clearTimeout(s.timer);
      s.timer = null;
      s.count = 0;
    };
  }, []);

  return message;
}

/**
 * Announces `text` (the hit count) once the search and filters, summed up in
 * `filterKey`, have been still for FILTER_DEBOUNCE_MS. Rows streaming in do
 * not trigger it, and nothing is announced before the first change or while
 * `text` is null.
 */
export function useFilterAnnouncement(filterKey: string, text: string | null): Announcement | null {
  const [message, say] = useAnnouncement();
  const textRef = useLatest(text);
  const initialKey = useRef<string | null>(filterKey);

  useEffect(() => {
    if (filterKey === initialKey.current) return;
    initialKey.current = null;
    const timer = setTimeout(() => {
      if (textRef.current) say(textRef.current);
    }, FILTER_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [filterKey, say, textRef]);

  return message;
}
