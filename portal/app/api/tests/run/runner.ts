import "server-only";

import { log } from "@/lib/log";
import type { Step, Verification } from "@/app/tests/smokeTest";
import { failedChecksMessage, type Oversikt } from "./checks";

// Per kall mot eux-rina-api. Send-steget venter på at RINA fullfører
// handlingen, så grensen er romslig; den hindrer bare at kjøringen henger.
const STEP_TIMEOUT_MS = 60_000;
// RINA sin read-side er eventually consistent, så oversikten polles.
const POLL_ATTEMPTS = 5;
const POLL_DELAY_MS = 700;

/** One call to eux-rina-api. `path` keeps its `{caseId}` placeholders when the step is skipped. */
export type StepSpec = {
  id: string;
  title: string;
  description: string;
  method: "GET" | "POST" | "PUT";
  path: string;
  body?: unknown;
};

type CallOptions = {
  /** Skip the step with this message instead of calling eux-rina-api. */
  skip?: string | null;
  /** Message when eux-rina-api answers 2xx. */
  ok?: string;
  /** Message when the call fails; the HTTP status is appended. */
  failed?: string;
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function tryParseJson(raw: string): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw.length > 8000 ? raw.slice(0, 8000) + "…" : raw;
  }
}

function parseResponseBody(res: Response, text: string): unknown {
  const trimmed = text.trim();
  const looksLikeJson =
    (res.headers.get("content-type") ?? "").includes("application/json") ||
    trimmed.startsWith("{") ||
    trimmed.startsWith("[");
  return looksLikeJson ? tryParseJson(text) : text;
}

function toStep(index: number, spec: StepSpec, result: Pick<Step, "status" | "httpStatus" | "responseBody" | "message" | "durationMs">): Step {
  return {
    id: spec.id,
    index,
    title: spec.title,
    description: spec.description,
    method: spec.method,
    url: spec.path,
    requestBody: result.status === "skipped" ? null : (spec.body ?? null),
    ...result,
  };
}

/**
 * Kaller eux-rina-api og gjør svaret om til et steg for nettleseren.
 * Feilsvar og unntak fra eux-rina-api logges her på serveren og sendes
 * aldri videre: nettleseren får bare HTTP-status og en generell melding.
 */
async function callRinaApi(base: string, token: string, index: number, spec: StepSpec): Promise<Step> {
  const started = Date.now();
  const logContext = { step: spec.id, method: spec.method, path: spec.path };
  const hasBody = spec.body !== undefined;

  try {
    const res = await fetch(`${base}${spec.path}`, {
      method: spec.method,
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(hasBody && { "Content-Type": "application/json" }),
      },
      body: hasBody ? JSON.stringify(spec.body) : undefined,
      signal: AbortSignal.timeout(STEP_TIMEOUT_MS),
    });
    const text = await res.text();
    if (!res.ok) {
      log.warn(
        { ...logContext, httpStatus: res.status, upstreamBody: text.slice(0, 2000) },
        "smoke-test: eux-rina-api svarte med feil",
      );
    }
    return toStep(index, spec, {
      status: res.ok ? "ok" : "fail",
      httpStatus: res.status,
      responseBody: res.ok ? parseResponseBody(res, text) : null,
      message: `eux-rina-api svarte ${res.status}`,
      durationMs: Date.now() - started,
    });
  } catch (err) {
    log.warn({ ...logContext, err }, "smoke-test: kall mot eux-rina-api feilet");
    const timedOut = err instanceof DOMException && err.name === "TimeoutError";
    return toStep(index, spec, {
      status: "fail",
      httpStatus: null,
      responseBody: null,
      message: timedOut
        ? `eux-rina-api svarte ikke innen ${STEP_TIMEOUT_MS / 1000} s`
        : "Nettverks- eller transportfeil før eux-rina-api rakk å svare",
      durationMs: Date.now() - started,
    });
  }
}

/** Runs the smoke-test steps in order and collects them with their field checks. */
export class SmokeRun {
  readonly steps: Step[] = [];
  readonly verifications: Verification[] = [];

  constructor(
    private readonly base: string,
    private readonly token: string,
  ) {}

  private get nextIndex(): number {
    return this.steps.length + 1;
  }

  private record(step: Step): Step {
    this.steps.push(step);
    return step;
  }

  private skipped(spec: StepSpec, reason: string): Step {
    return toStep(this.nextIndex, spec, {
      status: "skipped",
      httpStatus: null,
      responseBody: null,
      message: reason,
      durationMs: 0,
    });
  }

  /** Calls eux-rina-api once and records the step. */
  async call(spec: StepSpec, { skip, ok, failed }: CallOptions = {}): Promise<Step> {
    if (skip) return this.record(this.skipped(spec, skip));
    const step = await callRinaApi(this.base, this.token, this.nextIndex, spec);
    if (step.status === "ok" && ok) step.message = ok;
    if (step.status === "fail" && failed) step.message = `${failed} (${step.httpStatus ?? "ingen respons"})`;
    return this.record(step);
  }

  /** Polls the case overview until it shows the case (and the SED, if known), and records the last attempt. */
  async pollOversikt(
    spec: Omit<StepSpec, "method" | "body">,
    { skip, caseId, documentId }: { skip: string | null; caseId: string | null; documentId: string | null },
  ): Promise<{ step: Step; oversikt: Oversikt | null }> {
    const get: StepSpec = { ...spec, method: "GET" };
    if (skip) return { step: this.record(this.skipped(get, skip)), oversikt: null };

    let oversikt: Oversikt | null = null;
    for (let attempt = 1; ; attempt++) {
      const step = await callRinaApi(this.base, this.token, this.nextIndex, get);
      const progress = `forsøk ${attempt}/${POLL_ATTEMPTS}`;
      if (step.status === "ok") {
        oversikt = step.responseBody as Oversikt | null;
        const sedListe = oversikt?.sedListe ?? [];
        const complete =
          oversikt?.sakId === caseId && (documentId == null || sedListe.some((s) => s?.sedId === documentId));
        if (complete) {
          step.message =
            attempt === 1 ? "Oversikt bekreftet på første forsøk" : `Oversikt bekreftet etter ${attempt} forsøk`;
          return { step: this.record(step), oversikt };
        }
        step.message = `Oversikt ufullstendig på ${progress} (sakId=${oversikt?.sakId ?? "?"}, sedListe=${sedListe.length})`;
      } else {
        step.message = `Oversikt-kall feilet på ${progress} (${step.httpStatus ?? "ingen respons"})`;
      }
      if (attempt === POLL_ATTEMPTS) return { step: this.record(step), oversikt };
      await sleep(POLL_DELAY_MS);
    }
  }

  /** Records field checks for a step. Any failed check fails the step. */
  verify(step: Step, checks: Verification[], messages: { what: string; ok: string; failed?: string }): void {
    this.verifications.push(...checks);
    const failed = checks.filter((c) => !c.ok);
    if (failed.length === 0) {
      step.message = messages.ok;
      return;
    }
    step.status = "fail";
    step.message = messages.failed ?? failedChecksMessage(messages.what, failed, checks.length);
  }
}
