"use client";

import type { CSSProperties } from "react";
import { NODES } from "@/components/architecture/data";
import { useInView } from "./hooks";

const PODS = NODES.filter((n) => n.kind === "app" || n.kind === "job");

/** Namespace eessibasis med en pod per applikasjon og NAIS-jobb. */
export function NaisCluster() {
  const [ref, inView] = useInView<HTMLDivElement>();
  const apps = PODS.filter((p) => p.kind === "app").length;
  const jobs = PODS.length - apps;

  return (
    <div ref={ref} className="ny-nais" data-in={inView || undefined}>
      <div className="ny-nais__clusters" aria-hidden>
        <span>dev-gcp</span>
        <span>prod-gcp</span>
      </div>
      <div className="ny-nais__ns">
        <div className="ny-nais__ns-head">
          <span className="ny-nais__ns-label">namespace</span>
          <code>eessibasis</code>
        </div>
        <ul className="ny-nais__pods" aria-label={`${apps} applikasjoner og ${jobs} NAIS-jobber`}>
          {PODS.map((p, i) => (
            <li
              key={p.id}
              className="ny-pod"
              data-kind={p.kind}
              title={p.name}
              style={{ "--i": i, "--d": `${((i * 37) % 23) / 10}s` } as CSSProperties}
            >
              <span className="ny-pod__dot" aria-hidden />
              <span className="ny-pod__name">{p.kind === "job" ? `${p.short}-naisjob` : p.short}</span>
            </li>
          ))}
        </ul>
        <div className="ny-nais__legend" aria-hidden>
          <span data-kind="app">{apps} applikasjoner</span>
          <span data-kind="job">{jobs} NAIS-jobber</span>
        </div>
      </div>
    </div>
  );
}
