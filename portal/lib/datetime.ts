/**
 * Shared, defensive date/time helpers for the live-monitor pages.
 *
 * `new Date()` never throws — it yields an "Invalid Date" whose formatters
 * return the literal string "Invalid Date" and whose getters return NaN. That
 * is what once produced chaotic "NaN-NaN-NaN" day buckets. Every helper here
 * routes through [safeDate], which returns `null` for missing/unparseable input
 * (so callers can degrade gracefully) and repairs RINA's hour-only timezone
 * offset ("2026-07-07T16:31:03+02"), which JavaScript's `Date` rejects.
 */

/** Parses an ISO timestamp, returning null for missing/unparseable input. */
export function safeDate(iso?: string | null): Date | null {
  if (!iso) return null;
  const repaired = iso.replace(
    /(T\d{2}:\d{2}:\d{2}(?:\.\d+)?)([+-]\d{2})$/,
    "$1$2:00",
  );
  const d = new Date(repaired);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatTime(iso?: string | null): string {
  const d = safeDate(iso);
  if (!d) return "–";
  return d.toLocaleTimeString("nb-NO", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatDateTime(iso?: string | null): string {
  const d = safeDate(iso);
  if (!d) return "–";
  return d.toLocaleString("nb-NO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatDayHeading(iso?: string | null): string {
  const d = safeDate(iso);
  if (!d) return "Ukjent dato";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const formatted = d.toLocaleDateString("nb-NO", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  if (sameDay(d, today)) return `I dag · ${formatted}`;
  if (sameDay(d, yesterday)) return `I går · ${formatted}`;
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function dayKey(iso?: string | null): string {
  const d = safeDate(iso);
  if (!d) return "ukjent";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function isToday(iso?: string | null): boolean {
  const d = safeDate(iso);
  return d ? sameDay(d, new Date()) : false;
}
