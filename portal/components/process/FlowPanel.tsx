"use client";

import type { ReactNode } from "react";
import NextLink from "next/link";
import { BodyLong, BodyShort, Button, Detail, Heading, HStack, Link as DsLink, ToggleGroup } from "@navikt/ds-react";
import { ArrowRightIcon, ExternalLinkIcon, XMarkIcon } from "@navikt/aksel-icons";
import { archHref, ghHref } from "@/lib/links";
import type { Tone } from "@/lib/tones";

/** A toggle group that picks what a figure shows, with a live description of the current choice. */
export function FlowToolbar<V extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: V;
  onChange: (v: V) => void;
  options: readonly { id: V; label: string; text: string }[];
}) {
  const current = options.find((o) => o.id === value)!;
  return (
    <div className="proc-toolbar">
      <ToggleGroup size="small" value={value} onChange={(v) => onChange(v as V)} label={label}>
        {options.map((o) => (
          <ToggleGroup.Item key={o.id} value={o.id} label={o.label} />
        ))}
      </ToggleGroup>
      <BodyShort size="small" className="proc-toolbar__text" aria-live="polite">
        {current.text}
      </BodyShort>
    </div>
  );
}

/** The panel under a figure that explains the selected item, in the item's tone. */
export function DetailPanel({
  tone,
  eyebrow,
  title,
  onClose,
  children,
}: {
  tone: Tone;
  eyebrow: string;
  title: string;
  onClose?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="proc-detail" data-tone={tone} aria-live="polite">
      <div className="proc-detail__head">
        <div>
          <Detail className="arch-eyebrow">{eyebrow}</Detail>
          <Heading level="3" size="small" className="arch-mono">
            {title}
          </Heading>
        </div>
        {onClose && (
          <Button size="xsmall" variant="tertiary-neutral" icon={<XMarkIcon aria-hidden />} onClick={onClose}>
            Lukk
          </Button>
        )}
      </div>
      {children}
    </div>
  );
}

/** The placeholder shown under a figure while nothing is selected. */
export function DetailHint({ children }: { children: ReactNode }) {
  return (
    <BodyShort size="small" className="proc-hint">
      {children}
    </BodyShort>
  );
}

/** What the detail panel says about a system or topic in a system-flow figure. */
export type NodeInfo = {
  title: string;
  kind: string;
  tone: Tone;
  text: string;
  facts: string[];
  /** Node id in the architecture map. */
  arch?: string;
  /** Repository name under github.com/navikt. */
  repo?: string;
};

/** The detail panel for the selected box in a system-flow figure, or a hint when none is selected. */
export function NodeDetail({ info, onClose }: { info: NodeInfo | null; onClose: () => void }) {
  if (!info) return <DetailHint>Velg en boks i figuren for å se hva den gjør.</DetailHint>;
  return (
    <DetailPanel tone={info.tone} eyebrow={info.kind} title={info.title} onClose={onClose}>
      <BodyLong size="small">{info.text}</BodyLong>
      <ul className="arch-facts">
        {info.facts.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      <HStack gap="space-16" wrap>
        {info.arch && (
          <DsLink as={NextLink} href={archHref(info.arch)}>
            Vis i arkitekturkartet <ArrowRightIcon aria-hidden />
          </DsLink>
        )}
        {info.repo && (
          <DsLink href={ghHref(info.repo)} target="_blank" rel="noreferrer">
            navikt/{info.repo} <ExternalLinkIcon aria-hidden />
          </DsLink>
        )}
      </HStack>
    </DetailPanel>
  );
}
