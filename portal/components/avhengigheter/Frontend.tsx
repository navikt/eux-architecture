"use client";

import { useState, type CSSProperties } from "react";
import { CheckmarkIcon, RobotSmileIcon } from "@navikt/aksel-icons";
import { useInView } from "@/components/ny-i-teamet/hooks";
import { FRONTEND_HISTORY, WEEK } from "./data";

/**
 * En uke i eux-web-app: Dependabot åpner PR-er mandag morgen, og i løpet av
 * uka blir de til én samle-PR. Pek på en dag for å lese mer.
 */
export function FrontendWeek() {
  const [ref, inView] = useInView<HTMLDivElement>(0.4);
  const [day, setDay] = useState(0);
  const d = WEEK[day];

  return (
    <div ref={ref} className="avh-week" data-in={inView || undefined}>
      <div className="avh-week__lane" aria-hidden>
        <div className="avh-week__bot">
          <RobotSmileIcon className="avh-week__robot" />
          {Array.from({ length: 5 }, (_, i) => (
            <i key={i} style={{ "--i": i } as CSSProperties} />
          ))}
        </div>
        <div className="avh-week__pill">
          <span className="avh-week__pill-fill" />
          <span className="avh-week__pill-text">samle-PR</span>
          <CheckmarkIcon className="avh-week__check" />
        </div>
        <div className="avh-week__rest">
          <span>z</span>
          <span>z</span>
          <span>z</span>
        </div>
      </div>

      <div className="avh-week__days" role="group" aria-label="Dagene i uka">
        {WEEK.map((w, i) => (
          <button
            key={w.day}
            type="button"
            data-kind={w.kind}
            aria-pressed={day === i}
            aria-label={w.day}
            onClick={() => setDay(i)}
            onPointerEnter={(e) => e.pointerType === "mouse" && setDay(i)}
          >
            {w.short}
          </button>
        ))}
      </div>

      <p className="avh-week__text" aria-live="polite">
        <strong>{d.day}.</strong> {d.text}
      </p>
    </div>
  );
}

/** Historikk fra eux-web-app, som en slynge som vokser når du ruller. */
export function FrontendHistory() {
  return (
    <ol className="avh-history">
      {FRONTEND_HISTORY.map((h, i) => (
        <li key={h.title} data-tone={h.tone} style={{ "--i": i } as CSSProperties}>
          <span className="avh-history__leaf" aria-hidden />
          <time>{h.date}</time>
          <strong>{h.title}</strong>
          <span>{h.text}</span>
        </li>
      ))}
    </ol>
  );
}
