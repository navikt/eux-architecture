"use client";

import { Button } from "@navikt/ds-react";
import { ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon } from "@navikt/aksel-icons";
import type { StepPlayer } from "./useStepPlayer";

const VARIANTS = {
  accent: { step: "secondary", play: "primary" },
  neutral: { step: "tertiary-neutral", play: "secondary-neutral" },
} as const;

/** «Forrige», «Spill av»/«Pause» and «Neste» for a `useStepPlayer`. The caller lays them out. */
export function StepButtons({ player, emphasis = "accent" }: { player: StepPlayer; emphasis?: keyof typeof VARIANTS }) {
  const { index, count, running, go, toggle } = player;
  const atEnd = index >= count - 1;
  const v = VARIANTS[emphasis];
  return (
    <>
      <Button size="small" variant={v.step} icon={<ChevronLeftIcon aria-hidden />} onClick={() => go(index - 1)} disabled={index === 0}>
        Forrige
      </Button>
      <Button size="small" variant={v.play} icon={running ? <PauseIcon aria-hidden /> : <PlayIcon aria-hidden />} onClick={toggle}>
        {running ? "Pause" : atEnd ? "Spill av på nytt" : "Spill av"}
      </Button>
      <Button size="small" variant={v.step} icon={<ChevronRightIcon aria-hidden />} iconPosition="right" onClick={() => go(index + 1)} disabled={atEnd}>
        Neste
      </Button>
    </>
  );
}
