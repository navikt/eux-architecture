"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { CheckmarkIcon } from "@navikt/aksel-icons";
import { useReducedMotion } from "@/components/architecture/hooks";
import { SLACK_CHANNELS } from "./data";
import { useInView } from "./hooks";

const AUTOPLAY_MS = 6000;

/** Et lite Slack-vindu. Kanalene byttes automatisk til du velger en selv. */
export function SlackMock() {
  const [active, setActive] = useState(0);
  const [touched, setTouched] = useState(false);
  const [hover, setHover] = useState(false);
  const [ref, inView] = useInView<HTMLDivElement>(0.4);
  const reduced = useReducedMotion();
  const playing = inView && !touched && !hover && !reduced;

  useEffect(() => {
    if (!playing) return;
    const t = window.setTimeout(() => setActive((a) => (a + 1) % SLACK_CHANNELS.length), AUTOPLAY_MS);
    return () => window.clearTimeout(t);
  }, [playing, active]);

  const ch = SLACK_CHANNELS[active];
  const pick = (i: number) => {
    setTouched(true);
    setActive(i);
  };

  return (
    <div
      ref={ref}
      className="ny-slack"
      data-playing={playing || undefined}
      style={{ "--ny-autoplay": `${AUTOPLAY_MS}ms` } as CSSProperties}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="ny-slack__bar" aria-hidden>
        <span />
        <span />
        <span />
        <span className="ny-slack__title">Slack · Nav</span>
      </div>

      <div className="ny-slack__body">
        <div className="ny-slack__side">
          <div className="ny-slack__ws">Kanaler</div>
          <div
            role="tablist"
            aria-label="Slack-kanaler"
            aria-orientation="vertical"
            className="ny-slack__tabs"
            onKeyDown={(e) => {
              if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
              e.preventDefault();
              const next = (active + (e.key === "ArrowDown" ? 1 : -1) + SLACK_CHANNELS.length) % SLACK_CHANNELS.length;
              pick(next);
              document.getElementById(`ny-slack-tab-${next}`)?.focus();
            }}
          >
            {SLACK_CHANNELS.map((c, i) => (
              <button
                key={c.name}
                id={`ny-slack-tab-${i}`}
                type="button"
                role="tab"
                aria-selected={i === active}
                aria-controls="ny-slack-panel"
                tabIndex={i === active ? 0 : -1}
                className="ny-slack__tab"
                data-tone={c.tone}
                onClick={() => pick(i)}
              >
                <span className="ny-slack__hash" aria-hidden>
                  #
                </span>
                <span className="ny-slack__name">{c.name}</span>
                {c.tag && <span className="ny-slack__tag">{c.tag}</span>}
                {i === active && playing && <span className="ny-slack__timer" aria-hidden key={active} />}
              </button>
            ))}
          </div>
        </div>

        <div id="ny-slack-panel" role="tabpanel" aria-labelledby={`ny-slack-tab-${active}`} className="ny-slack__main" data-tone={ch.tone}>
          <div key={ch.name} className="ny-slack__pane">
            <header className="ny-slack__head">
              <strong>
                <span aria-hidden>#</span>
                {ch.name}
              </strong>
              <span>{ch.short}</span>
            </header>
            <div className="ny-slack__msg">
              <span className="ny-slack__avatar" aria-hidden>
                EN
              </span>
              <div>
                <div className="ny-slack__who">
                  Team EESSI Nav <span>Fest øverst</span>
                </div>
                <p>{ch.text}</p>
                <ul className="ny-slack__use">
                  {ch.use.map((u, i) => (
                    <li key={u} style={{ "--i": i } as CSSProperties}>
                      <CheckmarkIcon aria-hidden /> {u}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <div className="ny-slack__composer" aria-hidden>
            <span>Send en melding til #{ch.name}</span>
            <span className="ny-slack__typing">
              <i />
              <i />
              <i />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
