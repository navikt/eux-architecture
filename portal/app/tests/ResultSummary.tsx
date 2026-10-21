import { ExternalLinkIcon } from "@navikt/aksel-icons";
import { Alert, BodyShort, Button, Heading, VStack } from "@navikt/ds-react";
import { formatDuration } from "./format";
import { DIRECTION_LABEL, type RunResponse } from "./smokeTest";

export function ResultSummary({ result }: { result: RunResponse }) {
  const failures = result.steps.filter((s) => s.status === "fail").length;
  const checks = result.verifications;
  const passed = checks.filter((v) => v.ok).length;

  const summary = [
    `${result.steps.length} steg`,
    formatDuration(result.durationMs),
    checks.length > 0 && `${passed}/${checks.length} feltsjekk${checks.length === 1 ? "" : "er"} matchet`,
    result.caseId && "saken blir liggende i RINA",
  ]
    .filter(Boolean)
    .join(" · ");

  const facts = [
    { label: "Sak-ID", value: result.caseId ?? "—", mono: true },
    { label: "Dokument-ID", value: result.documentId ?? "—", mono: true },
    { label: "BUC", value: result.bucType },
    { label: "SED", value: result.sedType },
    { label: "Mottaker", value: result.mottakerId, mono: true },
    { label: "Bruker (fnr)", value: result.fnr, mono: true },
  ];

  return (
    <VStack gap="space-12">
      <Alert variant={result.ok ? "success" : "error"}>
        <VStack gap="space-4">
          <Heading level="3" size="xsmall">
            {result.ok ? "Alle steg gikk gjennom" : `${failures} steg feilet`} · {DIRECTION_LABEL[result.direction]}
          </Heading>
          <BodyShort size="small">{summary}</BodyShort>
        </VStack>
      </Alert>

      <div className="tst-result">
        <dl className="tst-facts">
          {facts.map((f) => (
            <div key={f.label}>
              <dt>{f.label}</dt>
              <dd className={f.mono ? "tst-mono" : undefined}>{f.value}</dd>
            </div>
          ))}
        </dl>

        {result.links.rina && (
          <Button
            as="a"
            href={result.links.rina}
            target="_blank"
            rel="noreferrer"
            variant="secondary"
            size="small"
            icon={<ExternalLinkIcon title="åpnes i ny fane" />}
            iconPosition="right"
          >
            Åpne i RINA
          </Button>
        )}
      </div>
    </VStack>
  );
}
