"use client";

import { useEffect, useRef, useState } from "react";
import { dayKey, formatDayHeading, safeDate } from "@/lib/datetime";

/** Live-connection state shared by the SSE-backed monitor pages. */
export type ConnectionStatus = "connecting" | "connected" | "disconnected";

export const RECONNECT_MS = 5000;

/**
 * Connects to a portal SSE endpoint and dispatches each named event to its
 * handler. Reconnects after [RECONNECT_MS] on error. The handler map may change
 * between renders; the event names are read when the connection opens.
 *
 * `reconnects` counts successful re-opens after the first one. The stream does
 * not replay missed events, so pass it to [useSnapshot] to refetch after a gap.
 */
export function useLiveStream(
  url: string,
  handlers: Record<string, (data: unknown) => void>,
): { status: ConnectionStatus; lastEventAt: number | null; reconnects: number } {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);
  const [reconnects, setReconnects] = useState(0);
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    let source: EventSource | null = null;
    let closed = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let opened = false;

    function connect() {
      if (closed) return;
      setStatus("connecting");
      source = new EventSource(url);

      for (const name of Object.keys(handlersRef.current)) {
        source.addEventListener(name, (e) => {
          let data: unknown;
          try {
            data = JSON.parse((e as MessageEvent<string>).data);
          } catch {
            return;
          }
          handlersRef.current[name]?.(data);
          setLastEventAt(Date.now());
        });
      }
      source.addEventListener("heartbeat", () => setStatus("connected"));
      source.onopen = () => {
        setStatus("connected");
        if (opened) setReconnects((n) => n + 1);
        opened = true;
      };
      source.onerror = () => {
        setStatus("disconnected");
        source?.close();
        if (!closed) timer = setTimeout(connect, RECONNECT_MS);
      };
    }

    connect();
    return () => {
      closed = true;
      if (timer) clearTimeout(timer);
      source?.close();
    };
  }, [url]);

  return { status, lastEventAt, reconnects };
}

/**
 * Fetches the snapshot for a live page, and again whenever `reloadKey`
 * changes. `loading` is only true for the first fetch.
 */
export function useSnapshot<T>(url: string, onData: (data: T) => void, reloadKey = 0) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const onDataRef = useRef(onData);

  useEffect(() => {
    onDataRef.current = onData;
  });

  useEffect(() => {
    let cancelled = false;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<T>;
      })
      .then((data) => {
        if (cancelled) return;
        onDataRef.current(data);
        setError(null);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message || "Ukjent feil");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [url, reloadKey]);

  return { loading, error };
}

/** A clock that ticks every `ms` milliseconds, for fading highlights. */
export function useNow(ms: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

/**
 * String state mirrored in the URL query (`?q=…`), so a filtered view can be
 * shared and other portal pages can deep-link into it. The URL is read after
 * mount to keep server and client markup identical.
 */
export function useUrlState(key: string, fallback: string): [string, (v: string) => void] {
  const [value, setValue] = useState(fallback);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const fromUrl = new URLSearchParams(window.location.search).get(key);
      if (fromUrl !== null) setValue(fromUrl);
    });
    return () => cancelAnimationFrame(id);
  }, [key]);

  const update = (v: string) => {
    setValue(v);
    const url = new URL(window.location.href);
    if (v && v !== fallback) url.searchParams.set(key, v);
    else url.searchParams.delete(key);
    window.history.replaceState(null, "", url);
  };

  return [value, update];
}

/** Focuses the search field inside `ref` when the user presses "/" outside a text field. */
export function useSlashFocus(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      const input = ref.current?.querySelector("input");
      if (!input) return;
      e.preventDefault();
      input.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ref]);
}

/** Groups rows (already sorted newest first) into consecutive days. */
export function groupByDay<T>(rows: T[], iso: (r: T) => string | null | undefined) {
  const groups: { key: string; heading: string; rows: T[] }[] = [];
  for (const r of rows) {
    const key = dayKey(iso(r));
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.rows.push(r);
    else groups.push({ key, heading: formatDayHeading(iso(r)), rows: [r] });
  }
  return groups;
}

/** Highlight strength for something `ageMs` old: 1 when new, fading to 0 over `windowMs`. */
export function fadeAlpha(ageMs: number, windowMs: number): number {
  if (ageMs <= 0) return 1;
  if (ageMs >= windowMs) return 0;
  return Math.pow(1 - ageMs / windowMs, 0.7);
}

/** Upper bound for first-seen maps, so a page left open for days does not grow without limit. */
const FIRST_SEEN_CAP = 2000;

/**
 * Records when each key was first seen, keeping existing entries and evicting
 * the oldest beyond `cap`. Returns `prev` unchanged when every key is known.
 */
export function rememberFirstSeen(
  prev: Map<string, number>,
  entries: Iterable<readonly [key: string, at: number]>,
  cap = FIRST_SEEN_CAP,
): Map<string, number> {
  let next: Map<string, number> | null = null;
  for (const [key, at] of entries) {
    if ((next ?? prev).has(key)) continue;
    next ??= new Map(prev);
    next.set(key, at);
  }
  if (!next) return prev;
  for (const old of next.keys()) {
    if (next.size <= cap) break;
    next.delete(old);
  }
  return next;
}

/** Milliseconds since epoch, or 0 for missing/unparseable timestamps. */
export const ms = (iso?: string | null) => safeDate(iso)?.getTime() ?? 0;

/** Splits a search query into lower-case tokens. */
export function tokens(q: string): string[] {
  return q.toLowerCase().split(/\s+/).filter(Boolean);
}

/** True when every token occurs somewhere in the haystack. */
export function matchesAll(haystack: (string | number | null | undefined)[], toks: string[]): boolean {
  if (toks.length === 0) return true;
  const text = haystack
    .filter((v) => v !== null && v !== undefined && v !== "")
    .join(" ")
    .toLowerCase();
  return toks.every((t) => text.includes(t));
}
