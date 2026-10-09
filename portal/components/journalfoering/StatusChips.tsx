"use client";

import { STATUS_BY_ID, type StatusId } from "./data";

export function StatusChips({
  ids,
  onFocusStatus,
  active,
}: {
  ids: StatusId[];
  onFocusStatus: (s: StatusId) => void;
  active?: StatusId | null;
}) {
  return (
    <span className="arch-chips">
      {ids.map((id) => (
        <button
          key={id}
          type="button"
          className="avs-chip arch-mono"
          data-tone={STATUS_BY_ID[id].tone}
          aria-pressed={active === undefined ? undefined : active === id}
          onClick={() => onFocusStatus(id)}
          title={`${STATUS_BY_ID[id].label} – vis i statusdiagrammet`}
        >
          {id}
        </button>
      ))}
    </span>
  );
}
