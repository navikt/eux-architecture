"use client";

import { useScrollSpy } from "@/components/architecture/hooks";

export type JumpNavItem = { id: string; label: string };

/** The sticky "on this page" bar. Highlights the section currently in view. */
export function JumpNav({ sections }: { sections: readonly JumpNavItem[] }) {
  const active = useScrollSpy(sections.map((s) => s.id));

  return (
    <nav className="arch-jumpnav" aria-label="Innhold på siden">
      <ol>
        {sections.map((s) => (
          <li key={s.id}>
            <a href={`#${s.id}`} aria-current={active === s.id ? "location" : undefined}>
              {s.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
