"use client";

import { useCallback, useState } from "react";
import { Alert, BodyLong, BodyShort, Button, Heading, HStack, Loader, TextField, ToggleGroup, VStack } from "@navikt/ds-react";
import { ResultSummary } from "./ResultSummary";
import { StepCard } from "./StepCard";
import { VerificationGroups } from "./Verifications";
import {
  DEFAULT_FNR,
  DIRECTION_LABEL,
  FNR_REGEX,
  MOTTAKER,
  SENDER,
  type Direction,
  type RunResponse,
} from "./smokeTest";

const DIRECTIONS = Object.keys(DIRECTION_LABEL) as Direction[];

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
      // A gateway timeout or proxy error may answer with HTML instead of JSON.
      const json = (await res.json().catch(() => null)) as RunResponse | { error?: string } | null;
      if (!res.ok || !json) {
        setError((json as { error?: string } | null)?.error ?? `HTTP ${res.status}`);
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
    <VStack gap="space-32" className="tst-page">
      <VStack gap="space-12">
        <Heading level="1" size="xlarge">
          Smoke-test mot eux-rina-api
        </Heading>
        <BodyLong size="large">
          Ett klikk og portalen kjører en ekte ende-til-ende smoke-test mot <code>eux-rina-api</code> i Q1 eller
          Q2: oppretter en <code>H_BUC_01</code>-sak med en <code>H001</code> SED, verifiserer sak-oversikten,
          leser NAV-formatert SED tilbake, oppdaterer den med to nye adresser, verifiserer på nytt og sender
          SED-en til mottaker.
        </BodyLong>
        <BodyLong>
          Saken blir <strong>liggende</strong> i RINA — ingen sletting. Velg retning og angi fnr (default er NAV
          sin standard testidentitet <code>{DEFAULT_FNR}</code>). Ingenting her rører produksjon.
        </BodyLong>
      </VStack>

      <section className="tst-runner" aria-label="Kjør testen">
        <VStack gap="space-20">
          <HStack gap="space-16" align="end" wrap>
            <VStack gap="space-4" className="tst-runner__direction">
              <ToggleGroup
                size="medium"
                value={direction}
                onChange={(value) => setDirection(value as Direction)}
                label="Retning"
              >
                {DIRECTIONS.map((d) => (
                  <ToggleGroup.Item key={d} value={d} label={DIRECTION_LABEL[d]} />
                ))}
              </ToggleGroup>
              <BodyShort size="small" textColor="subtle">
                Avsender: <code>eux-rina-api-{SENDER[direction]}</code> · Mottaker: <code>{MOTTAKER[direction]}</code>
              </BodyShort>
            </VStack>

            <TextField
              label="Bruker (fnr)"
              description="11 sifre"
              value={fnr}
              onChange={(e) => setFnr(e.target.value.trim())}
              error={fnr && !fnrValid ? "fnr må være 11 sifre" : undefined}
              inputMode="numeric"
              maxLength={11}
              className="tst-runner__fnr"
              disabled={running}
            />

            <Button onClick={run} loading={running} disabled={running || !fnrValid}>
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
              <BodyShort>Snakker med eux-rina-api-{SENDER[direction]} — dette tar vanligvis noen sekunder…</BodyShort>
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
          <BodyShort size="small" textColor="subtle">
            Hver eneste forventning testen stilte til API-respons, gruppert etter hvor den kom fra. Grupper med feil
            åpner seg automatisk.
          </BodyShort>
          <VerificationGroups verifications={result.verifications} />
        </VStack>
      )}

      {result && (
        <VStack gap="space-12">
          <Heading level="2" size="medium">
            Steg for steg
          </Heading>
          {result.steps.map((s) => (
            <StepCard key={s.id} step={s} />
          ))}
        </VStack>
      )}
    </VStack>
  );
}
