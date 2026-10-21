"use client";

import type { Tone } from "@/lib/tones";

type StatusInfo = { label: string; tone: Tone };

/** A clickable status name in the status's tone colour. */
export function StatusChip({
  id,
  tone,
  title,
  pressed,
  onClick,
}: {
  id: string;
  tone: Tone;
  title?: string;
  pressed?: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className="proc-chip arch-mono" data-tone={tone} aria-pressed={pressed} onClick={onClick} title={title}>
      {id}
    </button>
  );
}

/** A row of status chips that each jump to their status in the status diagram. */
export function StatusChips<Id extends string>({
  ids,
  statuses,
  onFocusStatus,
}: {
  ids: Id[];
  statuses: Record<Id, StatusInfo>;
  onFocusStatus: (s: Id) => void;
}) {
  return (
    <span className="arch-chips">
      {ids.map((id) => (
        <StatusChip
          key={id}
          id={id}
          tone={statuses[id].tone}
          onClick={() => onFocusStatus(id)}
          title={`${statuses[id].label} – vis i statusdiagrammet`}
        />
      ))}
    </span>
  );
}
