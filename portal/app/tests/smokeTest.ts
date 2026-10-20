/**
 * Contract between the smoke-test page and `POST /api/tests/run`.
 * Kept free of server-only imports so the client can use it too.
 */

export type Direction = "q1-to-q2" | "q2-to-q1";

export type StepStatus = "ok" | "fail" | "skipped";

export type Step = {
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

export type Verification = {
  group: string;
  label: string;
  expected: string | null;
  actual: string | null;
  ok: boolean;
};

export type Links = {
  rina: string | null;
};

export type RunResponse = {
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

/** NAV's standard test identity in the Q environments. */
export const DEFAULT_FNR = "21458837225";
export const FNR_REGEX = /^[0-9]{11}$/;

// Q1 service-user identifies as NO:NAVAT06, Q2 as NO:NAVAT07
// (see eux-rina-gateway-api-test ApiTestProperties for background).
export const SENDER: Record<Direction, "q1" | "q2"> = {
  "q1-to-q2": "q1",
  "q2-to-q1": "q2",
};
export const MOTTAKER: Record<Direction, string> = {
  "q1-to-q2": "NO:NAVAT07",
  "q2-to-q1": "NO:NAVAT06",
};
