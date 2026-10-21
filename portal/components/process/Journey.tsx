"use client";

import { BodyShort, Button } from "@navikt/ds-react";
import { ArrowRightIcon, PauseIcon, PlayIcon } from "@navikt/aksel-icons";
import { TONE, type Tone } from "@/lib/tones";
import type { JourneyPlayer } from "./useJourneyPlayer";

type Status = { id: string; label: string; tone: Tone };

/** Play button, scrubber and the current status under a case-journey diagram. */
export function JourneyBar({
  player,
  end,
  rangeLabel,
  when,
  whenClassName,
  status,
  onFocusStatus,
}: {
  player: JourneyPlayer;
  end: number;
  /** Screen-reader label for the scrubber. */
  rangeLabel: string;
  /** The current position as text, for example "dag 12". */
  when: string;
  whenClassName?: string;
  status: Status;
  onFocusStatus: () => void;
}) {
  const { playing, shown, toggle, seek } = player;
  return (
    <div className="proc-journey__bar">
      <Button size="small" variant="primary" icon={playing ? <PauseIcon aria-hidden /> : <PlayIcon aria-hidden />} onClick={toggle}>
        {playing ? "Pause" : "Spill av"}
      </Button>
      <label className="proc-journey__range">
        <span className="aksel-sr-only">{rangeLabel}</span>
        <input type="range" min={0} max={end} value={shown} onChange={(e) => seek(Number(e.target.value))} aria-valuetext={when} />
      </label>
      <div className="proc-journey__now" data-tone={status.tone} aria-live="polite">
        <span className={["proc-journey__when", "arch-mono", whenClassName].filter(Boolean).join(" ")}>{when}</span>
        <button type="button" className="proc-status-pill" onClick={onFocusStatus} title="Vis i statusdiagrammet">
          <span className="arch-mono">{status.id}</span>
          <ArrowRightIcon aria-hidden />
        </button>
        <BodyShort size="small" className="arch-subtle">
          {status.label}
        </BodyShort>
      </div>
    </div>
  );
}

/** The marker that shows where the case is on the journey track. */
export function JourneyToken({ x, y, tone, playing }: { x: number; y: number; tone: Tone; playing: boolean }) {
  const fill = TONE[tone].strong;
  return (
    <g className="proc-journey__token" style={{ transform: `translate(${x}px, ${y}px)`, transition: playing ? "none" : "transform 300ms ease" }}>
      <circle r={13} fill={fill} opacity={0.2} className={playing ? "" : "proc-breathe"} />
      <circle r={7.5} fill={fill} stroke="var(--ax-bg-default)" strokeWidth={2.5} />
    </g>
  );
}
