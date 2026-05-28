"use client";

import { useCallback, useState } from "react";
import {
  Alert,
  BodyLong,
  BodyShort,
  Button,
  Heading,
  HStack,
  Loader,
  Tag,
  TextField,
  ToggleGroup,
  VStack,
} from "@navikt/ds-react";

type StepStatus = "ok" | "fail" | "skipped";

type Step = {
  id: string;
  index: number;
  title: string;
  description: string;
  method: string;
  url: string;
  requestBody: unknown;
  status: StepStatus;
  httpStatus: number | null;
  responseBody: unknown;
  durationMs: number;
  message: string;
  error?: string;
};

type Verification = {
  group: string;
  label: string;
  expected: string | null;
  actual: string | null;
  ok: boolean;
};

type Links = {
  rina: string | null;
};

type Direction = "q1-to-q2" | "q2-to-q1";

type RunResponse = {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  ok: boolean;
  direction: Direction;
  sender: "q1" | "q2";
  receiver: "q1" | "q2";
  caseId: string | null;
  documentId: string | null;
  fnr: string;
  bucType: string;
  sedType: string;
  mottakerId: string;
  verifications: Verification[];
  verificationOk: boolean;
  links: Links;
  steps: Step[];
};

const DEFAULT_FNR = "21458837225";
const FNR_REGEX = /^[0-9]{11}$/;

const STATUS_VARIANT: Record<StepStatus, "success" | "error" | "neutral"> = {
  ok: "success",
  fail: "error",
  skipped: "neutral",
};

const STATUS_LABEL: Record<StepStatus, string> = {
  ok: "OK",
  fail: "Feilet",
  skipped: "Hoppet over",
};

const DIRECTION_LABEL: Record<Direction, string> = {
  "q1-to-q2": "Q1 → Q2",
  "q2-to-q1": "Q2 → Q1",
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function pretty(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function methodColor(method: string): string {
  switch (method) {
    case "GET":
      return "var(--ax-bg-info-strong, #2c5cab)";
    case "POST":
      return "var(--ax-bg-success-strong, #06893a)";
    case "PUT":
      return "var(--ax-bg-warning-strong, #b35900)";
    default:
      return "var(--ax-text-subtle, #555)";
  }
}

export default function TestsClient() {
  const [direction, setDirection] = useState<Direction>("q1-to-q2");
  const [fnr, setFnr] = useState(DEFAULT_FNR);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RunResponse | null>(null);

  const fnrValid = FNR_REGEX.test(fnr);

  const run = useCallback(async () => {
    if (!fnrValid) return;
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/tests/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction, fnr }),
      });
      const json = (await res.json()) as RunResponse | { error?: string };
      if (res.status >= 400 && res.status !== 207) {
        const e = (json as { error?: string }).error ?? `HTTP ${res.status}`;
        setError(e);
      } else {
        setResult(json as RunResponse);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }, [direction, fnr, fnrValid]);

  return (
    <VStack gap="space-32" style={{ maxWidth: "62rem" }}>
      <VStack gap="space-12">
        <Heading level="1" size="xlarge">
          Smoke-test mot eux-rina-api
        </Heading>
        <BodyLong size="large">
          Ett klikk og portalen kjører en ekte ende-til-ende smoke-test mot{" "}
          <code>eux-rina-api</code> i Q1 eller Q2: oppretter en{" "}
          <code>H_BUC_01</code>-sak med en <code>H001</code> SED, verifiserer
          sak-oversikten, leser NAV-formatert SED tilbake, oppdaterer den med
          to nye adresser og verifiserer på nytt.
        </BodyLong>
        <BodyLong>
          Saken blir <strong>liggende</strong> i RINA — ingen sletting. Velg
          retning og angi fnr (default er NAV sin standard testidentitet{" "}
          <code>{DEFAULT_FNR}</code>). Ingenting her rører produksjon.
        </BodyLong>
      </VStack>

      <section className="portal-runner">
        <VStack gap="space-20">
          <HStack gap="space-16" align="end" wrap>
            <VStack gap="space-4" style={{ flex: "1 1 18rem" }}>
              <ToggleGroup
                size="medium"
                value={direction}
                onChange={(value) => setDirection(value as Direction)}
                label="Retning"
              >
                <ToggleGroup.Item value="q1-to-q2" label="Q1 → Q2" />
                <ToggleGroup.Item value="q2-to-q1" label="Q2 → Q1" />
              </ToggleGroup>
              <BodyShort size="small" className="portal-subtle">
                Avsender: <code>eux-rina-api-{direction === "q1-to-q2" ? "q1" : "q2"}</code>
                {" · "}
                Mottaker:{" "}
                <code>{direction === "q1-to-q2" ? "NO:NAVAT07" : "NO:NAVAT06"}</code>
              </BodyShort>
            </VStack>

            <TextField
              label="Bruker (fnr)"
              description="11 sifre"
              value={fnr}
              onChange={(e) => setFnr(e.target.value.trim())}
              error={
                fnr && !fnrValid ? "fnr må være 11 sifre" : undefined
              }
              size="medium"
              inputMode="numeric"
              maxLength={11}
              style={{ minWidth: "12rem" }}
              disabled={running}
            />

            <Button
              onClick={run}
              loading={running}
              disabled={running || !fnrValid}
              size="medium"
            >
              {running ? "Kjører…" : result ? "Kjør på nytt" : "Kjør smoke-test"}
            </Button>
          </HStack>

          {error && (
            <Alert variant="error">
              <strong>Kunne ikke kjøre testen.</strong> {error}
            </Alert>
          )}

          {running && (
            <HStack gap="space-12" align="center">
              <Loader size="small" />
              <BodyShort>
                Snakker med eux-rina-api-{direction === "q1-to-q2" ? "q1" : "q2"}{" "}
                — dette tar vanligvis noen sekunder…
              </BodyShort>
            </HStack>
          )}

          {result && <ResultSummary result={result} />}
        </VStack>
      </section>

      {result && result.verifications.length > 0 && (
        <VStack gap="space-12">
          <Heading level="2" size="medium">
            Feltsjekker
          </Heading>
          <BodyShort size="small" className="portal-subtle-block">
            Hver eneste forventning testen stilte til API-respons, gruppert
            etter hvor den kom fra. Grupper med feil åpner seg automatisk.
          </BodyShort>
          <VerificationGroups verifications={result.verifications} />
        </VStack>
      )}

      {result && (
        <VStack gap="space-12">
          <Heading level="2" size="medium">
            Steg for steg
          </Heading>
          <VStack gap="space-12">
            {result.steps.map((s) => (
              <StepCard key={s.id} step={s} />
            ))}
          </VStack>
        </VStack>
      )}

      <style jsx>{`
        .portal-runner {
          padding: 1.75rem;
          border-radius: 16px;
          background: var(--ax-bg-subtle, #f7f7f7);
          border: 1px solid var(--ax-border-subtle, rgba(0, 0, 0, 0.08));
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.6) inset,
            0 8px 24px -16px rgba(0, 0, 0, 0.18);
        }
        .portal-subtle {
          color: var(--ax-text-subtle, #555);
        }
        :global(.portal-subtle-block) {
          color: var(--ax-text-subtle, #555);
        }
      `}</style>
    </VStack>
  );
}

function ResultSummary({ result }: { result: RunResponse }) {
  const failures = result.steps.filter((s) => s.status === "fail").length;
  const variant = result.ok ? "success" : "error";
  const headline = result.ok
    ? "Alle steg gikk gjennom"
    : `${failures} steg feilet`;
  const passCount = result.verifications.filter((v) => v.ok).length;

  return (
    <VStack gap="space-12">
      <Alert variant={variant}>
        <VStack gap="space-4">
          <Heading level="3" size="xsmall">
            {headline} · {DIRECTION_LABEL[result.direction]}
          </Heading>
          <BodyShort size="small">
            {result.steps.length} steg · {formatDuration(result.durationMs)}
            {result.verifications.length > 0 && (
              <>
                {" "}
                · {passCount}/{result.verifications.length} feltsjekk
                {result.verifications.length === 1 ? "" : "er"} matchet
              </>
            )}
            {result.caseId && (
              <>
                {" "}
                · saken blir liggende i RINA
              </>
            )}
          </BodyShort>
        </VStack>
      </Alert>

      <div className="portal-result">
        <div className="portal-result__grid">
          <ResultStat label="Sak-ID" value={result.caseId ?? "—"} mono />
          <ResultStat label="Dokument-ID" value={result.documentId ?? "—"} mono />
          <ResultStat label="BUC" value={result.bucType} />
          <ResultStat label="SED" value={result.sedType} />
          <ResultStat label="Mottaker" value={result.mottakerId} mono />
          <ResultStat label="Bruker (fnr)" value={result.fnr} mono />
        </div>

        {result.links.rina && (
          <HStack gap="space-12" wrap>
            <a
              className="portal-result__link"
              href={result.links.rina}
              target="_blank"
              rel="noreferrer noopener"
            >
              <span aria-hidden>↗</span> Åpne i RINA
            </a>
          </HStack>
        )}
      </div>

      <style jsx>{`
        .portal-result {
          padding: 1.25rem 1.5rem;
          border-radius: 14px;
          background: linear-gradient(
            135deg,
            var(--ax-bg-default, #fff) 0%,
            var(--ax-bg-subtle, #f7f7f7) 100%
          );
          border: 1px solid var(--ax-border-subtle, rgba(0, 0, 0, 0.08));
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .portal-result__grid {
          display: grid;
          gap: 0.75rem 1.25rem;
          grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
        }
        .portal-result__link {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 0.95rem;
          border-radius: 999px;
          text-decoration: none;
          font-weight: 600;
          font-size: 0.92rem;
          background: white;
          color: var(--ax-text-default, #1a1a1a);
          border: 1px solid var(--ax-border-strong, rgba(0, 0, 0, 0.2));
          transition:
            transform 80ms ease,
            box-shadow 80ms ease;
        }
        .portal-result__link:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px -8px rgba(0, 0, 0, 0.25);
        }
      `}</style>
    </VStack>
  );
}

function ResultStat({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="portal-stat">
      <span className="portal-stat__label">{label}</span>
      <span
        className="portal-stat__value"
        style={{
          fontFamily: mono
            ? "var(--ax-font-monospace, ui-monospace, SFMono-Regular, Menlo, monospace)"
            : undefined,
        }}
      >
        {value}
      </span>
      <style jsx>{`
        .portal-stat {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          min-width: 0;
        }
        .portal-stat__label {
          font-size: 0.74rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ax-text-subtle, #666);
        }
        .portal-stat__value {
          font-size: 1rem;
          font-weight: 600;
          word-break: break-word;
        }
      `}</style>
    </div>
  );
}

function VerificationGroups({
  verifications,
}: {
  verifications: Verification[];
}) {
  const groups = new Map<string, Verification[]>();
  for (const v of verifications) {
    const list = groups.get(v.group) ?? [];
    list.push(v);
    groups.set(v.group, list);
  }

  return (
    <VStack gap="space-8">
      {Array.from(groups.entries()).map(([group, items]) => {
        const passCount = items.filter((v) => v.ok).length;
        const allOk = passCount === items.length;
        return (
          <details
            key={group}
            className={`portal-vgroup ${allOk ? "is-ok" : "is-fail"}`}
            open={!allOk}
          >
            <summary className="portal-vgroup__head">
              <span className="portal-vgroup__title">{group}</span>
              <Tag size="small" variant={allOk ? "success" : "error"}>
                {passCount}/{items.length}{" "}
                {allOk ? "✓ alle matcher" : "✗ avvik"}
              </Tag>
            </summary>
            <div className="portal-vgroup__body">
              <VerificationTable verifications={items} />
            </div>
            <style jsx>{`
              .portal-vgroup {
                border: 1px solid var(--ax-border-subtle, rgba(0, 0, 0, 0.1));
                border-radius: 12px;
                background: var(--ax-bg-default, #fff);
                overflow: hidden;
              }
              .portal-vgroup.is-fail {
                border-color: rgba(229, 62, 62, 0.55);
              }
              .portal-vgroup__head {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 0.75rem;
                padding: 0.75rem 1rem;
                cursor: pointer;
                user-select: none;
                list-style: none;
              }
              .portal-vgroup__head::-webkit-details-marker {
                display: none;
              }
              .portal-vgroup__head::before {
                content: "▸";
                display: inline-block;
                margin-inline-end: 0.55rem;
                color: var(--ax-text-subtle, #666);
                transition: transform 100ms ease;
              }
              .portal-vgroup[open] > .portal-vgroup__head::before {
                transform: rotate(90deg);
              }
              .portal-vgroup__title {
                font-weight: 600;
                flex: 1;
              }
              .portal-vgroup__body {
                border-block-start: 1px solid
                  var(--ax-border-subtle, rgba(0, 0, 0, 0.06));
              }
            `}</style>
          </details>
        );
      })}
    </VStack>
  );
}

function VerificationTable({
  verifications,
}: {
  verifications: Verification[];
}) {
  return (
    <div className="portal-verify">
      <div className="portal-verify__row portal-verify__row--head">
        <span>Felt</span>
        <span>Forventet</span>
        <span>Faktisk</span>
        <span style={{ textAlign: "right" }}>Resultat</span>
      </div>
      {verifications.map((v) => (
        <div
          key={v.label}
          className={`portal-verify__row ${v.ok ? "is-ok" : "is-fail"}`}
        >
          <span className="portal-verify__label">{v.label}</span>
          <code className="portal-verify__cell">{v.expected ?? "—"}</code>
          <code
            className="portal-verify__cell"
            style={{
              color: v.ok ? undefined : "var(--ax-text-danger, #b51331)",
            }}
          >
            {v.actual ?? "(null)"}
          </code>
          <span style={{ textAlign: "right" }}>
            <Tag size="small" variant={v.ok ? "success" : "error"}>
              {v.ok ? "✓ match" : "✗ avvik"}
            </Tag>
          </span>
        </div>
      ))}
      <style jsx>{`
        .portal-verify {
          background: var(--ax-bg-default, #fff);
        }
        .portal-verify__row {
          display: grid;
          grid-template-columns: 1.2fr 1.4fr 1.6fr auto;
          gap: 0.75rem;
          padding: 0.65rem 1rem;
          align-items: center;
          border-block-end: 1px solid var(--ax-border-subtle, rgba(0, 0, 0, 0.06));
        }
        .portal-verify__row:last-child {
          border-block-end: none;
        }
        .portal-verify__row--head {
          background: var(--ax-bg-subtle, #f7f7f7);
          font-size: 0.78rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ax-text-subtle, #555);
        }
        .portal-verify__row.is-fail {
          background: rgba(229, 62, 62, 0.06);
        }
        .portal-verify__label {
          font-weight: 600;
        }
        .portal-verify__cell {
          font-family: var(
            --ax-font-monospace,
            ui-monospace,
            SFMono-Regular,
            Menlo,
            monospace
          );
          font-size: 0.85rem;
          word-break: break-word;
        }
        @media (max-width: 720px) {
          .portal-verify__row {
            grid-template-columns: 1fr;
            gap: 0.25rem;
          }
          .portal-verify__row--head {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

function StepCard({ step }: { step: Step }) {
  const [open, setOpen] = useState(false);
  const isExpandable =
    step.status !== "skipped" || step.requestBody !== null;
  const accent =
    step.status === "ok"
      ? "var(--ax-bg-success-strong, #06893a)"
      : step.status === "fail"
        ? "var(--ax-bg-danger-strong, #b51331)"
        : "var(--ax-border-subtle, #c9c9c9)";

  return (
    <article className="portal-step" style={{ borderInlineStartColor: accent }}>
      <header className="portal-step__head">
        <HStack gap="space-16" align="center" justify="space-between" wrap>
          <HStack gap="space-12" align="center" wrap>
            <span className="portal-step__index">{step.index}</span>
            <VStack gap="space-2">
              <Heading level="3" size="xsmall" style={{ margin: 0 }}>
                {step.title}
              </Heading>
              <BodyShort size="small" className="portal-step__msg">
                {step.message}
              </BodyShort>
            </VStack>
          </HStack>
          <HStack gap="space-8" align="center" wrap>
            <Tag size="small" variant={STATUS_VARIANT[step.status]}>
              {STATUS_LABEL[step.status]}
              {step.httpStatus != null ? ` · ${step.httpStatus}` : ""}
            </Tag>
            {step.status !== "skipped" && (
              <BodyShort size="small" className="portal-step__msg">
                {formatDuration(step.durationMs)}
              </BodyShort>
            )}
            {isExpandable && (
              <button
                className="portal-step__toggle"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
              >
                {open ? "Skjul detaljer" : "Vis detaljer"}
              </button>
            )}
          </HStack>
        </HStack>
      </header>

      {!open && (
        <BodyShort size="small" className="portal-step__desc">
          {step.description}
        </BodyShort>
      )}

      {open && (
        <VStack gap="space-12" className="portal-step__body">
          <BodyLong size="small">{step.description}</BodyLong>
          <div className="portal-call">
            <span
              className="portal-method"
              style={{ background: methodColor(step.method) }}
            >
              {step.method}
            </span>
            <code className="portal-url">{step.url}</code>
          </div>
          {step.requestBody != null && (
            <Payload label="Request body" body={step.requestBody} />
          )}
          {step.responseBody != null && (
            <Payload
              label={`Response${step.httpStatus ? ` · ${step.httpStatus}` : ""}`}
              body={step.responseBody}
              tone={step.status}
            />
          )}
          {step.error && (
            <Alert variant="error" inline>
              {step.error}
            </Alert>
          )}
        </VStack>
      )}

      <style jsx>{`
        .portal-step {
          background: var(--ax-bg-default, #fff);
          border: 1px solid var(--ax-border-subtle, rgba(0, 0, 0, 0.08));
          border-inline-start-width: 4px;
          border-radius: 12px;
          padding: 1rem 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .portal-step__head {
          width: 100%;
        }
        .portal-step__index {
          width: 2rem;
          height: 2rem;
          border-radius: 999px;
          background: var(--ax-bg-subtle, #efefef);
          color: var(--ax-text-subtle, #555);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
        }
        .portal-step__msg,
        .portal-step__desc {
          color: var(--ax-text-subtle, #555);
        }
        .portal-step__desc {
          margin-inline-start: 2.75rem;
        }
        .portal-step__toggle {
          background: transparent;
          border: 1px solid var(--ax-border-subtle, rgba(0, 0, 0, 0.12));
          padding: 0.25rem 0.65rem;
          border-radius: 999px;
          font-size: 0.85rem;
          cursor: pointer;
          color: inherit;
        }
        .portal-step__toggle:hover {
          background: var(--ax-bg-subtle, #f0f0f0);
        }
        .portal-step__body {
          padding-block-start: 0.5rem;
          border-block-start: 1px dashed
            var(--ax-border-subtle, rgba(0, 0, 0, 0.08));
        }
        .portal-call {
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.4rem 0.65rem;
          background: var(--ax-bg-subtle, #f4f4f4);
          border-radius: 8px;
          width: fit-content;
          max-width: 100%;
        }
        .portal-method {
          color: white;
          padding: 0.15rem 0.55rem;
          border-radius: 6px;
          font-size: 0.78rem;
          letter-spacing: 0.06em;
          font-weight: 700;
        }
        .portal-url {
          font-family: var(
            --ax-font-monospace,
            ui-monospace,
            SFMono-Regular,
            Menlo,
            monospace
          );
          font-size: 0.92rem;
          word-break: break-all;
        }
      `}</style>
    </article>
  );
}

function Payload({
  label,
  body,
  tone,
}: {
  label: string;
  body: unknown;
  tone?: StepStatus;
}) {
  const text = pretty(body);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  return (
    <div className="portal-payload" data-tone={tone ?? "neutral"}>
      <header className="portal-payload__head">
        <BodyShort
          size="small"
          weight="semibold"
          style={{
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--ax-text-subtle, #555)",
          }}
        >
          {label}
        </BodyShort>
        <button className="portal-payload__copy" onClick={onCopy}>
          Kopier
        </button>
      </header>
      <pre className="portal-payload__body">{text}</pre>

      <style jsx>{`
        .portal-payload {
          background: #0e1014;
          color: #f4f4f5;
          border-radius: 10px;
          padding: 0.75rem 1rem;
          border: 1px solid rgba(255, 255, 255, 0.06);
          overflow: hidden;
        }
        .portal-payload__head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-block-end: 0.4rem;
          border-block-end: 1px solid rgba(255, 255, 255, 0.08);
          margin-block-end: 0.5rem;
        }
        .portal-payload__head :global(p) {
          color: rgba(244, 244, 245, 0.65) !important;
        }
        .portal-payload__copy {
          background: rgba(255, 255, 255, 0.08);
          color: inherit;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 6px;
          padding: 0.15rem 0.55rem;
          font-size: 0.78rem;
          cursor: pointer;
        }
        .portal-payload__copy:hover {
          background: rgba(255, 255, 255, 0.16);
        }
        .portal-payload__body {
          margin: 0;
          font-family: var(
            --ax-font-monospace,
            ui-monospace,
            SFMono-Regular,
            Menlo,
            monospace
          );
          font-size: 0.85rem;
          line-height: 1.55;
          white-space: pre-wrap;
          word-break: break-word;
          max-height: 22rem;
          overflow: auto;
        }
        .portal-payload[data-tone="fail"] {
          border-color: rgba(229, 62, 62, 0.55);
        }
      `}</style>
    </div>
  );
}
