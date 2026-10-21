"use client";

import { useId, useState } from "react";
import { ChevronDownIcon } from "@navikt/aksel-icons";
import { BodyLong, BodyShort, Button, CopyButton, Detail, Heading, HStack, Tag, VStack } from "@navikt/ds-react";
import { formatDuration, pretty } from "./format";
import type { Step, StepStatus } from "./smokeTest";

type Color = "success" | "danger" | "neutral" | "info" | "warning";

const STATUS: Record<StepStatus, { label: string; color: Color }> = {
  ok: { label: "OK", color: "success" },
  fail: { label: "Feilet", color: "danger" },
  skipped: { label: "Hoppet over", color: "neutral" },
};

const METHOD_COLOR: Record<string, Color> = {
  GET: "info",
  POST: "success",
  PUT: "warning",
};

export function StepCard({ step }: { step: Step }) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  const expandable = step.status !== "skipped" || step.requestBody !== null;
  const status = STATUS[step.status];

  return (
    <article className="tst-step" data-status={step.status}>
      <HStack gap="space-16" align="center" justify="space-between" wrap>
        <HStack gap="space-12" align="center" wrap={false}>
          <span className="tst-step__index">{step.index}</span>
          <VStack gap="space-2">
            <Heading level="3" size="xsmall">
              {step.title}
            </Heading>
            <BodyShort size="small" textColor="subtle">
              {step.message}
            </BodyShort>
          </VStack>
        </HStack>
        <HStack gap="space-8" align="center" wrap>
          <Tag size="small" variant="moderate" data-color={status.color}>
            {status.label}
            {step.httpStatus != null && ` · ${step.httpStatus}`}
          </Tag>
          {step.status !== "skipped" && (
            <BodyShort size="small" textColor="subtle">
              {formatDuration(step.durationMs)}
            </BodyShort>
          )}
          {expandable && (
            <Button
              variant="tertiary"
              data-color="neutral"
              size="xsmall"
              icon={<ChevronDownIcon aria-hidden className="tst-step__chevron" />}
              iconPosition="right"
              aria-expanded={open}
              aria-controls={open ? bodyId : undefined}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? "Skjul detaljer" : "Vis detaljer"}
            </Button>
          )}
        </HStack>
      </HStack>

      {open ? (
        <VStack gap="space-12" id={bodyId} className="tst-step__body">
          <BodyLong size="small">{step.description}</BodyLong>
          <div className="tst-call">
            <Tag size="xsmall" variant="strong" data-color={METHOD_COLOR[step.method] ?? "neutral"}>
              {step.method}
            </Tag>
            <code>{step.url}</code>
          </div>
          {step.requestBody != null && <Payload label="Request body" body={step.requestBody} />}
          {step.responseBody != null && (
            <Payload
              label={`Response${step.httpStatus ? ` · ${step.httpStatus}` : ""}`}
              body={step.responseBody}
              failed={step.status === "fail"}
            />
          )}
        </VStack>
      ) : (
        <BodyShort size="small" textColor="subtle" className="tst-step__desc">
          {step.description}
        </BodyShort>
      )}
    </article>
  );
}

function Payload({ label, body, failed }: { label: string; body: unknown; failed?: boolean }) {
  const text = pretty(body);
  return (
    <figure className="tst-payload" data-failed={failed || undefined}>
      <figcaption className="tst-payload__head">
        <Detail weight="semibold" uppercase textColor="subtle">
          {label}
        </Detail>
        <CopyButton size="xsmall" copyText={text} text="Kopier" activeText="Kopiert" />
      </figcaption>
      <pre className="tst-payload__body" tabIndex={0} aria-label={label}>
        {text}
      </pre>
    </figure>
  );
}
