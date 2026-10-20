import type { CSSProperties, ReactNode } from "react";

export type HeroStat = { n: ReactNode; label: string; sub?: string };

/** The row of key figures in a page hero. Each figure fades in a little after the previous one. */
export function HeroStats({ stats }: { stats: readonly HeroStat[] }) {
  return (
    <dl className="arch-stats">
      {stats.map((s, i) => (
        <div key={s.label} className="arch-stat" style={{ "--arch-delay": `${120 + i * 70}ms` } as CSSProperties}>
          <dt>{s.label}</dt>
          <dd>
            <span className="arch-stat__n">{s.n}</span>
            {s.sub && <span className="arch-stat__sub">{s.sub}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
