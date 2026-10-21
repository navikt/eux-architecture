"use client";

import { StatusChips as ProcessStatusChips } from "@/components/process/StatusChips";
import { STATUS_BY_ID, type StatusId } from "./data";

export function StatusChips({ ids, onFocusStatus }: { ids: StatusId[]; onFocusStatus: (s: StatusId) => void }) {
  return <ProcessStatusChips ids={ids} statuses={STATUS_BY_ID} onFocusStatus={onFocusStatus} />;
}
