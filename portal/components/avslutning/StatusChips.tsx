"use client";

import { STATUS_BY_ID, type StatusId } from "./data";

export function StatusChips({ ids, onFocusStatus }: { ids: StatusId[]; onFocusStatus: (s: StatusId) => void }) {
  return (
    <span className="arch-chips">
      {ids.map((id) => (
        <button
          key={id}
          type="button"
          className="avs-chip arch-mono"
          data-tone={STATUS_BY_ID[id].tone}
          onClick={() => onFocusStatus(id)}
          title={`${STATUS_BY_ID[id].label} – vis i statusdiagrammet`}
        >
          {id}
        </button>
      ))}
    </span>
  );
}
