"use client";

import { useState } from "react";
import { onActivate } from "@/components/architecture/svg";

/**
 * Selection for the clickable boxes in a figure. `nodeProps(id, label)` makes a `<g>` a toggle
 * button that is marked active when selected and dimmed when `isDim(id)` is true.
 */
export function useNodeSelection<Id extends string>(isDim: (id: Id) => boolean = () => false) {
  const [selected, setSelected] = useState<Id | null>(null);
  const toggle = (id: Id) => setSelected((s) => (s === id ? null : id));

  const nodeProps = (id: Id, label: string) => ({
    className: ["arch-node", selected === id && "is-active", isDim(id) && "is-dim"].filter(Boolean).join(" "),
    role: "button" as const,
    tabIndex: 0,
    "aria-pressed": selected === id,
    "aria-label": `${label}: vis detaljer`,
    onClick: () => toggle(id),
    onKeyDown: onActivate(() => toggle(id)),
  });

  return { selected, clear: () => setSelected(null), nodeProps };
}

/**
 * Lit/dim state for a figure with a flow picker, where `all` shows every flow at once.
 * `on(flows)` tells if something that belongs to `flows` is part of the shown flow, and
 * `state(flows)` gives its class: "" while showing all, otherwise "is-lit" or "is-dim".
 */
export function flowFilter<F extends string>(flow: F, all: F) {
  const on = (flows: readonly F[]) => flow === all || flows.includes(flow);
  const state = (flows: readonly F[]) => (flow === all ? "" : on(flows) ? "is-lit" : "is-dim");
  return { on, state };
}
