import "server-only";

import { NextResponse } from "next/server";
import { getClientCredentialsToken } from "@/lib/azureToken";
import { log } from "@/lib/log";
import H001_NAV from "@/lib/seds/H001-NAV.json";
import H001_NAV_UPDATE from "@/lib/seds/H001-NAV-update.json";
import {
  DEFAULT_FNR,
  FNR_REGEX,
  MOTTAKER,
  SENDER,
  type Direction,
  type Links,
  type RunResponse,
  type Step,
  type Verification,
} from "@/app/tests/smokeTest";

export const dynamic = "force-dynamic";

const BUC_TYPE = "H_BUC_01";
const SED_TYPE = "H001";
// Fnr som ligger i SED-malene under lib/seds/ — byttes ut med brukerens fnr
// før vi sender SED-en til eux-rina-api.
const TEMPLATE_FNR = "23478743041";
// Per kall mot eux-rina-api. Send-steget venter på at RINA fullfører
// handlingen, så grensen er romslig; den hindrer bare at kjøringen henger.
const STEP_TIMEOUT_MS = 60_000;

const EXPECTED_ADDR_CREATE = [
  {
    type: "bosted",
    gate: "Karl Johans gate 22",
    postnummer: "0026",
    by: "Oslo",
    land: "NO",
  },
  {
    type: "opphold",
    gate: "Møllergata 5",
    postnummer: "0179",
    by: "Oslo",
    land: "NO",
  },
] as const;

const EXPECTED_ADDR_UPDATE = [
  {
    type: "bosted",
    gate: "Storgata 1",
    postnummer: "0155",
    by: "Oslo",
    land: "NO",
  },
  {
    type: "opphold",
    gate: "Karl Johans gate 22",
    postnummer: "0026",
    by: "Oslo",
    land: "NO",
  },
] as const;

type RunBody = {
  direction?: unknown;
  fnr?: unknown;
};

type ApiConfig = {
  base: string;
  scope: string;
};

function resolveConfig(env: "q1" | "q2"): ApiConfig | null {
  const upper = env.toUpperCase();
  const base = process.env[`EUX_RINA_API_${upper}_BASE_URL`];
  const scope = process.env[`EUX_RINA_API_${upper}_SCOPE`];
  if (!base || !scope) return null;
  return { base: base.replace(/\/+$/, ""), scope };
}

function tryParseJson(raw: string): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw.length > 8000 ? raw.slice(0, 8000) + "…" : raw;
  }
}

function substituteFnr<T>(payload: T, fnr: string): T {
  const json = JSON.stringify(payload).replaceAll(TEMPLATE_FNR, fnr);
  return JSON.parse(json) as T;
}

function parseResponseBody(res: Response, text: string): unknown {
  const ct = res.headers.get("content-type") ?? "";
  const trimmed = text.trim();
  const looksLikeJson =
    ct.includes("application/json") ||
    trimmed.startsWith("{") ||
    trimmed.startsWith("[");
  return looksLikeJson ? tryParseJson(text) : text;
}

/**
 * Kaller eux-rina-api og gjør svaret om til et steg for nettleseren.
 * Feilsvar og unntak fra eux-rina-api logges her på serveren og sendes
 * aldri videre: nettleseren får bare HTTP-status og en generell melding.
 */
async function runStep(
  base: string,
  token: string,
  index: number,
  spec: {
    id: string;
    title: string;
    description: string;
    method: "GET" | "POST" | "PUT";
    path: string;
    body?: unknown;
    accept?: string;
  },
): Promise<Step> {
  const started = Date.now();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: spec.accept ?? "application/json",
  };
  let body: BodyInit | undefined;
  if (spec.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body =
      typeof spec.body === "string" ? spec.body : JSON.stringify(spec.body);
  }
  const toStep = (
    result: Pick<Step, "status" | "httpStatus" | "responseBody" | "message">,
  ): Step => ({
    id: spec.id,
    index,
    title: spec.title,
    description: spec.description,
    method: spec.method,
    url: spec.path,
    requestBody: spec.body ?? null,
    durationMs: Date.now() - started,
    ...result,
  });
  const logContext = { step: spec.id, method: spec.method, path: spec.path };

  try {
    const res = await fetch(`${base}${spec.path}`, {
      method: spec.method,
      cache: "no-store",
      headers,
      body,
      signal: AbortSignal.timeout(STEP_TIMEOUT_MS),
    });
    const text = await res.text();
    if (!res.ok) {
      log.warn(
        { ...logContext, httpStatus: res.status, upstreamBody: text.slice(0, 2000) },
        "smoke-test: eux-rina-api svarte med feil",
      );
    }
    return toStep({
      status: res.ok ? "ok" : "fail",
      httpStatus: res.status,
      responseBody: res.ok ? parseResponseBody(res, text) : null,
      message: `eux-rina-api svarte ${res.status}`,
    });
  } catch (err) {
    log.warn({ ...logContext, err }, "smoke-test: kall mot eux-rina-api feilet");
    const timedOut = err instanceof DOMException && err.name === "TimeoutError";
    return toStep({
      status: "fail",
      httpStatus: null,
      responseBody: null,
      message: timedOut
        ? `eux-rina-api svarte ikke innen ${STEP_TIMEOUT_MS / 1000} s`
        : "Nettverks- eller transportfeil før eux-rina-api rakk å svare",
    });
  }
}

function skip(
  index: number,
  spec: {
    id: string;
    title: string;
    description: string;
    method: string;
    path: string;
  },
  reason: string,
): Step {
  return {
    id: spec.id,
    index,
    title: spec.title,
    description: spec.description,
    method: spec.method,
    url: spec.path,
    requestBody: null,
    status: "skipped",
    httpStatus: null,
    responseBody: null,
    durationMs: 0,
    message: reason,
  };
}

type Oversikt = {
  sakId?: string | null;
  sakType?: string | null;
  sakTittel?: string | null;
  internasjonalSakId?: string | null;
  cdmVersjon?: string | null;
  sakUrl?: string | null;
  sensitiv?: boolean | null;
  erSakseier?: boolean | null;
  fnr?: string | null;
  sistEndretDato?: string | null;
  sistEndretDatoTid?: string | null;
  sakshandlinger?: string[] | null;
  motparter?: Array<{
    motpartId?: string | null;
    motpartNavn?: string | null;
    motpartLand?: string | null;
    motpartLandkode?: string | null;
    formatertNavn?: string | null;
  }>;
  sedListe?: Array<{
    sedId?: string | null;
    sedType?: string | null;
    sedTittel?: string | null;
    status?: string | null;
    sedIdParent?: string | null;
    svarsedType?: string | null;
    svarsedId?: string | null;
    sedHandlinger?: string[] | null;
    vedlegg?: unknown[] | null;
  }>;
};

const G = {
  CASE: "Sak (oversikt)",
  PERSON: "Person (oversikt)",
  MOTPART: "Motparter (oversikt)",
  SEDLIST: "SED-liste (oversikt)",
  SED_CREATE: "NAV-SED · etter opprettelse",
  SED_UPDATE: "NAV-SED · etter oppdatering",
} as const;

function fmt(v: unknown): string {
  if (v === null || v === undefined) return "(null)";
  if (typeof v === "string") return v;
  if (typeof v === "boolean" || typeof v === "number") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function eq(
  group: string,
  label: string,
  expected: unknown,
  actual: unknown,
): Verification {
  return {
    group,
    label,
    expected: fmt(expected),
    actual: fmt(actual),
    ok: fmt(expected) === fmt(actual),
  };
}

/** Step message for a response that came back but failed some field checks. */
function failedChecksMessage(what: string, failed: Verification[], total: number): string {
  return (
    `${what} kom tilbake, men ${failed.length} av ${total} ` +
    `feltsjekk(er) feilet: ${failed.map((f) => f.label).slice(0, 5).join(", ")}` +
    (failed.length > 5 ? ` (+${failed.length - 5} til)` : "")
  );
}

function check(
  group: string,
  label: string,
  expected: string,
  actual: unknown,
  ok: boolean,
): Verification {
  return { group, label, expected, actual: fmt(actual), ok };
}

function verifyOversikt(
  caseId: string,
  documentId: string | null,
  fnr: string,
  mottakerId: string,
  o: Oversikt | null,
): Verification[] {
  const v: Verification[] = [];
  const motpart = o?.motparter?.find((m) => m?.motpartId === mottakerId);
  const sed = o?.sedListe?.find((s) => s?.sedId === documentId)
    ?? o?.sedListe?.[0];

  v.push(eq(G.CASE, "sakId matcher caseId", caseId, o?.sakId ?? null));
  v.push(eq(G.CASE, "sakType", BUC_TYPE, o?.sakType ?? null));
  v.push(check(
    G.CASE,
    "sakTittel er satt",
    "ikke-tom streng",
    o?.sakTittel ?? null,
    typeof o?.sakTittel === "string" && o!.sakTittel!.length > 0,
  ));
  v.push(check(
    G.CASE,
    "internasjonalSakId er satt",
    "ikke-tom streng",
    o?.internasjonalSakId ?? null,
    typeof o?.internasjonalSakId === "string" && o!.internasjonalSakId!.length > 0,
  ));
  v.push(check(
    G.CASE,
    "cdmVersjon er satt",
    "ikke-tom streng (f.eks. 4.3 eller 4.4)",
    o?.cdmVersjon ?? null,
    typeof o?.cdmVersjon === "string" && o!.cdmVersjon!.length > 0,
  ));
  v.push(check(
    G.CASE,
    "sakUrl peker på RINA",
    "starter med https://",
    o?.sakUrl ?? null,
    typeof o?.sakUrl === "string" && o!.sakUrl!.startsWith("https://"),
  ));
  v.push(eq(G.CASE, "sensitiv", false, o?.sensitiv ?? null));
  v.push(eq(G.CASE, "erSakseier (vi opprettet saken)", true, o?.erSakseier ?? null));
  v.push(check(
    G.CASE,
    "sakshandlinger er ikke tom",
    "ikke-tom liste",
    o?.sakshandlinger ?? null,
    Array.isArray(o?.sakshandlinger) && o!.sakshandlinger!.length > 0,
  ));

  v.push(eq(G.PERSON, "fnr matcher input", fnr, o?.fnr ?? null));

  v.push(check(
    G.MOTPART,
    "motparter har nøyaktig 1 element",
    "1",
    o?.motparter?.length ?? 0,
    (o?.motparter?.length ?? 0) === 1,
  ));
  v.push(eq(G.MOTPART, "[0].motpartId", mottakerId, motpart?.motpartId ?? null));
  v.push(check(
    G.MOTPART,
    "[0].motpartNavn er satt",
    "ikke-tom streng",
    motpart?.motpartNavn ?? null,
    typeof motpart?.motpartNavn === "string" && motpart!.motpartNavn!.length > 0,
  ));
  v.push(eq(G.MOTPART, "[0].motpartLand (ISO-2)", "NO", motpart?.motpartLand ?? null));
  v.push(eq(G.MOTPART, "[0].motpartLandkode (ISO-3)", "NOR", motpart?.motpartLandkode ?? null));

  v.push(check(
    G.SEDLIST,
    "sedListe har nøyaktig 1 element",
    "1",
    o?.sedListe?.length ?? 0,
    (o?.sedListe?.length ?? 0) === 1,
  ));
  v.push(eq(G.SEDLIST, "[0].sedId", documentId ?? "(documentId mangler)", sed?.sedId ?? null));
  v.push(eq(G.SEDLIST, "[0].sedType", SED_TYPE, sed?.sedType ?? null));
  v.push(check(
    G.SEDLIST,
    "[0].sedTittel er satt",
    "ikke-tom streng",
    sed?.sedTittel ?? null,
    typeof sed?.sedTittel === "string" && sed!.sedTittel!.length > 0,
  ));
  v.push(check(
    G.SEDLIST,
    "[0].status er satt",
    "ikke-tom streng",
    sed?.status ?? null,
    typeof sed?.status === "string" && sed!.status!.length > 0,
  ));
  v.push(eq(G.SEDLIST, "[0].sedIdParent er null (ingen parent)", null, sed?.sedIdParent ?? null));
  v.push(eq(G.SEDLIST, "[0].svarsedType er null", null, sed?.svarsedType ?? null));
  v.push(eq(G.SEDLIST, "[0].svarsedId er null", null, sed?.svarsedId ?? null));
  v.push(check(
    G.SEDLIST,
    "[0].sedHandlinger er ikke tom",
    "ikke-tom liste (Update m.fl.)",
    sed?.sedHandlinger ?? null,
    Array.isArray(sed?.sedHandlinger) && sed!.sedHandlinger!.length > 0,
  ));
  v.push(check(
    G.SEDLIST,
    "[0].vedlegg er tom liste",
    "[]",
    sed?.vedlegg ?? null,
    Array.isArray(sed?.vedlegg) && sed!.vedlegg!.length === 0,
  ));

  return v;
}

type NavSed = {
  sed?: string;
  sedVer?: string;
  sedGVer?: string;
  nav?: {
    bruker?: {
      person?: {
        pin?: Array<{ identifikator?: string; land?: string; landkode?: string }>;
      };
      adresse?: Array<{
        type?: string;
        gate?: string;
        postnummer?: string;
        by?: string;
        land?: string;
        landkode?: string;
      }>;
    };
  };
};

type ExpectedAddress = {
  type: string;
  gate: string;
  postnummer: string;
  by: string;
  land: string;
};

function verifyNavSed(
  group: string,
  fnr: string,
  navSed: NavSed | null,
  expectedAddresses: readonly ExpectedAddress[],
): Verification[] {
  const v: Verification[] = [];
  const person = navSed?.nav?.bruker?.person;
  const addrs = navSed?.nav?.bruker?.adresse ?? [];

  v.push(eq(group, "sed", SED_TYPE, navSed?.sed ?? null));
  v.push(check(
    group,
    "sedVer er satt",
    "ikke-tom streng",
    navSed?.sedVer ?? null,
    typeof navSed?.sedVer === "string" && navSed!.sedVer!.length > 0,
  ));
  v.push(check(
    group,
    "sedGVer er satt",
    "ikke-tom streng",
    navSed?.sedGVer ?? null,
    typeof navSed?.sedGVer === "string" && navSed!.sedGVer!.length > 0,
  ));

  v.push(eq(group, "person.pin[0].identifikator", fnr, person?.pin?.[0]?.identifikator ?? null));
  v.push(eq(group, "person.pin[0].land", "NO", person?.pin?.[0]?.land ?? null));
  // Vi sjekker bevisst ikke person.pin[0].landkode (ISO-3) — den blir ikke
  // populert av NAV-format-transformen på vei tilbake gjennom CPI, kun ISO-2
  // `land`. Det er en kjent egenskap ved ACL-mappingen, ikke en regresjon.

  v.push(check(
    group,
    `adresse[] har nøyaktig ${expectedAddresses.length} elementer`,
    String(expectedAddresses.length),
    addrs.length,
    addrs.length === expectedAddresses.length,
  ));

  expectedAddresses.forEach((expected, i) => {
    const actual = addrs[i];
    v.push(eq(group, `adresse[${i}].type`, expected.type, actual?.type ?? null));
    v.push(eq(group, `adresse[${i}].gate`, expected.gate, actual?.gate ?? null));
    v.push(eq(group, `adresse[${i}].postnummer`, expected.postnummer, actual?.postnummer ?? null));
    v.push(eq(group, `adresse[${i}].by`, expected.by, actual?.by ?? null));
    v.push(eq(group, `adresse[${i}].land`, expected.land, actual?.land ?? null));
    // Bevisst utelatt: adresse[${i}].landkode — settes ikke av NAV-transformen
    // (samme grunn som person.pin[0].landkode over).
  });

  return v;
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

async function pollOversikt(
  base: string,
  token: string,
  index: number,
  caseId: string,
  documentId: string | null,
  spec: {
    id: string;
    title: string;
    description: string;
  },
  maxAttempts = 5,
  delayMs = 700,
): Promise<{ step: Step; oversikt: Oversikt | null }> {
  let last: Step | null = null;
  let oversikt: Oversikt | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const step = await runStep(base, token, index, {
      id: spec.id,
      title: spec.title,
      description: spec.description,
      method: "GET",
      path: `/v5/rinasaker/${encodeURIComponent(caseId)}/oversikt`,
    });
    last = step;
    if (step.status === "ok") {
      oversikt = step.responseBody as Oversikt | null;
      const sakIdOk = oversikt?.sakId === caseId;
      const sedOk =
        documentId == null ||
        (oversikt?.sedListe ?? []).some((s) => s?.sedId === documentId);
      if (sakIdOk && sedOk) {
        step.message =
          attempt === 1
            ? `Oversikt bekreftet på første forsøk`
            : `Oversikt bekreftet etter ${attempt} forsøk`;
        return { step, oversikt };
      }
      step.message = `Oversikt ufullstendig på forsøk ${attempt}/${maxAttempts} (sakId=${oversikt?.sakId ?? "?"}, sedListe=${(oversikt?.sedListe ?? []).length})`;
    } else {
      step.message = `Oversikt-kall feilet på forsøk ${attempt}/${maxAttempts} (${step.httpStatus ?? "ingen respons"})`;
    }
    if (attempt < maxAttempts) await sleep(delayMs);
  }
  return { step: last!, oversikt };
}

function buildLinks(oversikt: Oversikt | null): Links {
  return {
    rina:
      typeof oversikt?.sakUrl === "string" && oversikt.sakUrl.startsWith("http")
        ? oversikt.sakUrl
        : null,
  };
}

function isDirection(value: unknown): value is Direction {
  return value === "q1-to-q2" || value === "q2-to-q1";
}

function isJson(req: Request): boolean {
  const mediaType = req.headers.get("content-type")?.split(";")[0];
  return mediaType?.trim().toLowerCase() === "application/json";
}

/** Tom eller ugyldig JSON gir tom body, dvs. standardvalgene i runSmokeTest. */
async function readBody(req: Request): Promise<RunBody> {
  try {
    const text = await req.text();
    const parsed: unknown = text.trim() ? JSON.parse(text) : null;
    return parsed && typeof parsed === "object" ? (parsed as RunBody) : {};
  } catch {
    return {};
  }
}

// Hver kjøring oppretter en ekte RINA-sak, så vi tillater bare én om gangen.
// Låsen gjelder per pod; portalen kjører med få replicas.
let runInProgress = false;

export async function POST(req: Request) {
  if (!isJson(req)) {
    return NextResponse.json(
      { ok: false, error: "Content-Type må være application/json." },
      { status: 415 },
    );
  }
  if (runInProgress) {
    return NextResponse.json(
      { ok: false, error: "En smoke-test kjører allerede. Prøv igjen når den er ferdig." },
      { status: 409 },
    );
  }

  runInProgress = true;
  try {
    return await runSmokeTest(await readBody(req));
  } finally {
    runInProgress = false;
  }
}

async function runSmokeTest(body: RunBody): Promise<NextResponse> {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  const direction: Direction = isDirection(body.direction)
    ? body.direction
    : "q1-to-q2";
  const sender = SENDER[direction];
  const receiver = sender === "q1" ? "q2" : "q1";
  const mottakerId = MOTTAKER[direction];

  const fnrInput = typeof body.fnr === "string" ? body.fnr.trim() : "";
  if (fnrInput && !FNR_REGEX.test(fnrInput)) {
    return NextResponse.json(
      { ok: false, error: "Ugyldig fnr — må være 11 sifre." },
      { status: 400 },
    );
  }
  const fnr = fnrInput || DEFAULT_FNR;

  const cfg = resolveConfig(sender);
  if (!cfg) {
    return NextResponse.json(
      {
        ok: false,
        error: `Portalen er ikke konfigurert til å snakke med eux-rina-api-${sender} i dette miljøet.`,
      },
      { status: 503 },
    );
  }

  let token: string;
  try {
    token = await getClientCredentialsToken(cfg.scope);
  } catch (err) {
    log.warn({ err, sender }, "smoke-test: kunne ikke hente Azure AD-token");
    return NextResponse.json(
      {
        ok: false,
        error: `Kunne ikke hente Azure AD-token for eux-rina-api-${sender}. Se loggene til portalen for detaljer.`,
      },
      { status: 502 },
    );
  }

  const createBody = substituteFnr(H001_NAV, fnr);
  const updateBody = substituteFnr(H001_NAV_UPDATE, fnr);

  const steps: Step[] = [];
  let caseId: string | null = null;
  let documentId: string | null = null;
  let oversikt: Oversikt | null = null;
  const verifications: Verification[] = [];

  // Steg 1: opprett RINA-sak + første H001 SED i ett atomisk kall.
  const createCaseAndSed = await runStep(cfg.base, token, 1, {
    id: "create-case-and-sed",
    title: "Opprett RINA-sak med en H001 SED",
    description:
      `Ber eux-rina-api-${sender} opprette en ny ${BUC_TYPE}-sak med ${mottakerId} ` +
      `som mottaker og en H001 (request-for-information) SED for fnr ${fnr} som ` +
      `første dokument. SED-en har to adresser (bosted + opphold) slik at vi senere ` +
      `kan bekrefte at de overlevde NAV→EU→NAV-rundturen gjennom CPI.`,
    method: "POST",
    path:
      `/cpi/buc/sed?BucType=${encodeURIComponent(BUC_TYPE)}` +
      `&MottakerId=${encodeURIComponent(mottakerId)}`,
    body: createBody,
  });
  steps.push(createCaseAndSed);
  if (createCaseAndSed.status === "ok") {
    let raw: unknown = createCaseAndSed.responseBody;
    if (typeof raw === "string") {
      try {
        raw = JSON.parse(raw);
      } catch {
        // behold som streng
      }
    }
    if (raw && typeof raw === "object") {
      const obj = raw as {
        caseId?: unknown;
        documentId?: unknown;
        sedId?: unknown;
        id?: unknown;
      };
      if (typeof obj.caseId === "string") caseId = obj.caseId;
      const docCandidate = obj.documentId ?? obj.sedId ?? obj.id;
      if (typeof docCandidate === "string") documentId = docCandidate;
    }
    createCaseAndSed.message =
      caseId && documentId
        ? `Opprettet RINA-sak ${caseId} med SED ${documentId}`
        : caseId
          ? `Opprettet RINA-sak ${caseId} (ingen documentId i body)`
          : "API svarte 2xx, men ingen sak-id i body";
  } else {
    createCaseAndSed.message = `Kunne ikke opprette RINA-sak + SED (${createCaseAndSed.httpStatus ?? "ingen respons"})`;
  }

  // Steg 2: poll oversikt til saken + SED-en dukker opp.
  let verifyAfterCreate: Step;
  if (!caseId) {
    verifyAfterCreate = skip(
      2,
      {
        id: "verify-after-create",
        title: "Verifiser sak i /v5/rinasaker/{caseId}/oversikt",
        description:
          "Leser sak-oversikten for å bekrefte sakId, BUC-type, fnr, mottaker og SED-liste. RINA sin read-side er eventually consistent, så vi poller noen sekunder.",
        method: "GET",
        path: `/v5/rinasaker/{caseId}/oversikt`,
      },
      "Hoppet over — ingen sak-id å verifisere",
    );
  } else {
    const pollResult = await pollOversikt(cfg.base, token, 2, caseId, documentId, {
      id: "verify-after-create",
      title: "Verifiser sak i /v5/rinasaker/{caseId}/oversikt",
      description:
        "Leser sak-oversikten og kontrollerer en lang rekke felter: sakId, sakType, sakTittel, internasjonalSakId, cdmVersjon, sakUrl, sensitiv, erSakseier, sakshandlinger; fnr; motpart (id, navn, ISO-2 land, ISO-3 landkode); sedListe-lengde, sedType, sedTittel, status, sedHandlinger, sedIdParent==null, vedlegg==[]. RINA sin read-side er eventually consistent, så vi poller noen sekunder.",
    });
    verifyAfterCreate = pollResult.step;
    oversikt = pollResult.oversikt;
    if (oversikt) {
      const oversiktChecks = verifyOversikt(caseId, documentId, fnr, mottakerId, oversikt);
      verifications.push(...oversiktChecks);
      const failed = oversiktChecks.filter((v) => !v.ok);
      if (failed.length > 0) {
        verifyAfterCreate.status = "fail";
        verifyAfterCreate.message = failedChecksMessage("Oversikt", failed, oversiktChecks.length);
      } else {
        verifyAfterCreate.message = `Oversikt matcher alle ${oversiktChecks.length} forventede felter`;
      }
    }
  }
  steps.push(verifyAfterCreate);

  // Steg 3: les NAV-formatert SED tilbake og bekreft at begge adressene overlevde.
  let readNavSedAfterCreate: Step;
  if (!caseId || !documentId) {
    readNavSedAfterCreate = skip(
      3,
      {
        id: "read-nav-sed-after-create",
        title: "Les NAV-format SED — overlevde begge adressene?",
        description:
          "Kaller GET /cpi/buc/{caseId}/sed/{documentId} som kjører EU→NAV-transformen. Vi bekrefter at både bosted og opphold gjorde rundturen intakt gjennom CPI.",
        method: "GET",
        path: `/cpi/buc/{caseId}/sed/{documentId}`,
      },
      caseId
        ? "Hoppet over — ingen documentId fra opprettings-steget"
        : "Hoppet over — ingen sak-id fra opprettings-steget",
    );
  } else {
    readNavSedAfterCreate = await runStep(cfg.base, token, 3, {
      id: "read-nav-sed-after-create",
      title: "Les NAV-format SED — overlevde begge adressene?",
      description:
        "Kaller GET /cpi/buc/{caseId}/sed/{documentId} som kjører den mal-drevne EU→NAV-transformen. Vi bekrefter person-pin + begge bosted-/opphold-adresser gikk intakt gjennom CPI.",
      method: "GET",
      path: `/cpi/buc/${encodeURIComponent(caseId)}/sed/${encodeURIComponent(documentId)}`,
    });
    if (readNavSedAfterCreate.status === "ok") {
      const navSed = readNavSedAfterCreate.responseBody as NavSed | null;
      const sedChecks = verifyNavSed(G.SED_CREATE, fnr, navSed, EXPECTED_ADDR_CREATE);
      verifications.push(...sedChecks);
      const failed = sedChecks.filter((v) => !v.ok);
      if (failed.length > 0) {
        readNavSedAfterCreate.status = "fail";
        readNavSedAfterCreate.message = failedChecksMessage("NAV-SED-en", failed, sedChecks.length);
      } else {
        readNavSedAfterCreate.message = `NAV-SED gjenspeiler alle ${sedChecks.length} forventede felter (inkl. begge adressene)`;
      }
    } else {
      readNavSedAfterCreate.message = `Kunne ikke lese NAV-SED (${readNavSedAfterCreate.httpStatus ?? "ingen respons"})`;
    }
  }
  steps.push(readNavSedAfterCreate);

  // Steg 4: oppdater SED.
  let updateSed: Step;
  if (!caseId || !documentId) {
    updateSed = skip(
      4,
      {
        id: "update-sed",
        title: "Oppdater H001 SED — bytt adressene",
        description:
          "Sender en modifisert versjon av SED-en. Vi bytter de to adressene (bosted ⇄ opphold) og endrer request-teksten slik at diffen blir synlig i steg 6.",
        method: "PUT",
        path: `/cpi/buc/{caseId}/sed/{documentId}`,
      },
      caseId
        ? "Hoppet over — ingen documentId fra opprettings-steget"
        : "Hoppet over — ingen sak-id fra opprettings-steget",
    );
  } else {
    updateSed = await runStep(cfg.base, token, 4, {
      id: "update-sed",
      title: "Oppdater H001 SED — bytt adressene",
      description:
        "Sender en modifisert versjon av SED-en via Update-handlingen. Vi bytter de to adressene (bosted=Storgata 1, opphold=Karl Johans gate 22) og endrer request-teksten slik at diffen blir synlig i steg 6.",
      method: "PUT",
      path: `/cpi/buc/${encodeURIComponent(caseId)}/sed/${encodeURIComponent(documentId)}`,
      body: updateBody,
    });
    if (updateSed.status === "ok") {
      updateSed.message = `Oppdaterte SED ${documentId} på sak ${caseId}`;
    } else {
      updateSed.message = `Kunne ikke oppdatere SED (${updateSed.httpStatus ?? "ingen respons"})`;
    }
  }
  steps.push(updateSed);

  // Steg 5: verifiser oversikt på nytt — sistEndretDatoTid skal ha gått framover.
  let verifyAfterUpdate: Step;
  if (!caseId) {
    verifyAfterUpdate = skip(
      5,
      {
        id: "verify-after-update",
        title: "Verifiser oversikt etter oppdatering",
        description:
          "Leser sak-oversikten igjen og sjekker at sistEndretDatoTid har gått framover.",
        method: "GET",
        path: `/v5/rinasaker/{caseId}/oversikt`,
      },
      "Hoppet over — ingen sak-id å verifisere",
    );
  } else {
    const beforeTs = oversikt?.sistEndretDatoTid ?? null;
    const pollResult = await pollOversikt(cfg.base, token, 5, caseId, documentId, {
      id: "verify-after-update",
      title: "Verifiser oversikt etter oppdatering",
      description:
        "Leser sak-oversikten igjen og sjekker at sistEndretDatoTid er senere enn før oppdateringen — det beviser at oppdateringen nådde read-siden.",
    });
    verifyAfterUpdate = pollResult.step;
    if (pollResult.oversikt) {
      oversikt = pollResult.oversikt;
      if (verifyAfterUpdate.status === "ok") {
        const afterTs = pollResult.oversikt.sistEndretDatoTid ?? null;
        if (
          updateSed.status === "ok" &&
          beforeTs &&
          afterTs &&
          afterTs <= beforeTs
        ) {
          verifyAfterUpdate.status = "fail";
          verifyAfterUpdate.message = `sistEndretDatoTid endret seg ikke (${beforeTs} → ${afterTs})`;
        } else if (updateSed.status === "ok" && afterTs && beforeTs) {
          verifyAfterUpdate.message = `sistEndretDatoTid gikk ${beforeTs} → ${afterTs}`;
        }
      }
    }
  }
  steps.push(verifyAfterUpdate);

  // Steg 6: les NAV-SED på nytt — bekreft at nye adresser kom på plass.
  let readNavSedAfterUpdate: Step;
  if (!caseId || !documentId) {
    readNavSedAfterUpdate = skip(
      6,
      {
        id: "read-nav-sed-after-update",
        title: "Les NAV-format SED — kom de nye adressene fram?",
        description:
          "Kaller GET /cpi/buc/{caseId}/sed/{documentId} en gang til. Vi bekrefter at adressene matcher oppdaterings-payloaden.",
        method: "GET",
        path: `/cpi/buc/{caseId}/sed/{documentId}`,
      },
      caseId
        ? "Hoppet over — ingen documentId fra opprettings-steget"
        : "Hoppet over — ingen sak-id fra opprettings-steget",
    );
  } else if (updateSed.status !== "ok") {
    readNavSedAfterUpdate = skip(
      6,
      {
        id: "read-nav-sed-after-update",
        title: "Les NAV-format SED — kom de nye adressene fram?",
        description:
          "Hoppet over fordi oppdaterings-steget ikke gikk gjennom; en ny lesning ville ikke vise den nye tilstanden.",
        method: "GET",
        path: `/cpi/buc/${caseId}/sed/${documentId}`,
      },
      "Hoppet over — oppdaterings-steget gikk ikke gjennom",
    );
  } else {
    readNavSedAfterUpdate = await runStep(cfg.base, token, 6, {
      id: "read-nav-sed-after-update",
      title: "Les NAV-format SED — kom de nye adressene fram?",
      description:
        "Kaller GET /cpi/buc/{caseId}/sed/{documentId} en gang til. Vi bekrefter at adressene matcher oppdaterings-payloaden (bosted=Storgata 1, opphold=Karl Johans gate 22) — det beviser at oppdateringen nådde CPI.",
      method: "GET",
      path: `/cpi/buc/${encodeURIComponent(caseId)}/sed/${encodeURIComponent(documentId)}`,
    });
    if (readNavSedAfterUpdate.status === "ok") {
      const navSed = readNavSedAfterUpdate.responseBody as NavSed | null;
      const sedChecks = verifyNavSed(G.SED_UPDATE, fnr, navSed, EXPECTED_ADDR_UPDATE);
      verifications.push(...sedChecks);
      const failed = sedChecks.filter((v) => !v.ok);
      if (failed.length > 0) {
        readNavSedAfterUpdate.status = "fail";
        readNavSedAfterUpdate.message = failedChecksMessage("NAV-SED-en", failed, sedChecks.length);
      } else {
        readNavSedAfterUpdate.message = `NAV-SED gjenspeiler de oppdaterte adressene (${sedChecks.length} sjekker)`;
      }
    } else {
      readNavSedAfterUpdate.message = `Kunne ikke lese NAV-SED (${readNavSedAfterUpdate.httpStatus ?? "ingen respons"})`;
    }
  }
  steps.push(readNavSedAfterUpdate);

  // Steg 7: send SED-en til mottaker via Send-handlingen.
  let sendSed: Step;
  if (!caseId || !documentId) {
    sendSed = skip(
      7,
      {
        id: "send-sed",
        title: "Send SED til mottaker",
        description:
          "Kaller POST /cpi/buc/{caseId}/sed/{documentId}/send for å trigge Send-handlingen mot mottaker via NIE.",
        method: "POST",
        path: `/cpi/buc/{caseId}/sed/{documentId}/send`,
      },
      caseId
        ? "Hoppet over — ingen documentId fra opprettings-steget"
        : "Hoppet over — ingen sak-id fra opprettings-steget",
    );
  } else {
    sendSed = await runStep(cfg.base, token, 7, {
      id: "send-sed",
      title: `Send SED til ${mottakerId}`,
      description:
        `Kaller POST /cpi/buc/${caseId}/sed/${documentId}/send som trigger Send-handlingen i RINA. ` +
        `eux-rina-api venter på at handlingen fullføres (ventePaAksjon=true) før den svarer, ` +
        `slik at SED-status kan verifiseres i neste steg.`,
      method: "POST",
      path: `/cpi/buc/${encodeURIComponent(caseId)}/sed/${encodeURIComponent(documentId)}/send`,
    });
    if (sendSed.status === "ok") {
      sendSed.message = `Send-handlingen for SED ${documentId} ble fullført av eux-rina-api`;
    } else {
      sendSed.message = `Kunne ikke sende SED (${sendSed.httpStatus ?? "ingen respons"})`;
    }
  }
  steps.push(sendSed);

  // Steg 8: verifiser at SED-en har gått til status "sent" på oversikten.
  let verifyAfterSend: Step;
  if (!caseId || !documentId) {
    verifyAfterSend = skip(
      8,
      {
        id: "verify-after-send",
        title: "Verifiser at SED er sendt",
        description:
          "Leser sak-oversikten og bekrefter at SED-statusen er \"sent\".",
        method: "GET",
        path: `/v5/rinasaker/{caseId}/oversikt`,
      },
      "Hoppet over — ingen sak-id å verifisere",
    );
  } else if (sendSed.status !== "ok") {
    verifyAfterSend = skip(
      8,
      {
        id: "verify-after-send",
        title: "Verifiser at SED er sendt",
        description:
          "Hoppet over fordi Send-steget ikke gikk gjennom.",
        method: "GET",
        path: `/v5/rinasaker/${caseId}/oversikt`,
      },
      "Hoppet over — Send-steget gikk ikke gjennom",
    );
  } else {
    const pollResult = await pollOversikt(cfg.base, token, 8, caseId, documentId, {
      id: "verify-after-send",
      title: "Verifiser at SED er sendt",
      description:
        "Leser sak-oversikten en siste gang og bekrefter at SED-en har gått til status \"sent\". " +
        "Read-siden er eventually consistent, så vi poller noen sekunder.",
    });
    verifyAfterSend = pollResult.step;
    if (pollResult.oversikt) {
      oversikt = pollResult.oversikt;
      const sed = pollResult.oversikt.sedListe?.find((s) => s?.sedId === documentId);
      const sentCheck = eq(
        "SED-liste · etter send",
        `[sedId=${documentId}].status`,
        "sent",
        sed?.status ?? null,
      );
      verifications.push(sentCheck);
      if (!sentCheck.ok) {
        verifyAfterSend.status = "fail";
        verifyAfterSend.message =
          `SED-status er fortsatt "${sed?.status ?? "(ukjent)"}" — forventet "sent"`;
      } else {
        verifyAfterSend.message = `SED ${documentId} har status "sent" på oversikten`;
      }
    }
  }
  steps.push(verifyAfterSend);

  const finishedAt = new Date().toISOString();
  const ok = steps.every((s) => s.status !== "fail");
  const links = buildLinks(oversikt);
  const verificationOk =
    verifications.length > 0 && verifications.every((v) => v.ok);

  const response: RunResponse = {
    startedAt,
    finishedAt,
    durationMs: Date.now() - t0,
    ok,
    direction,
    sender,
    receiver,
    caseId,
    documentId,
    fnr,
    bucType: BUC_TYPE,
    sedType: SED_TYPE,
    mottakerId,
    verifications,
    verificationOk,
    links,
    steps,
  };

  log.info(
    {
      direction,
      sender,
      receiver,
      caseId,
      documentId,
      ok,
      verificationOk,
      durationMs: response.durationMs,
    },
    "smoke-test: kjøring ferdig",
  );

  return NextResponse.json(response, { status: ok ? 200 : 207 });
}
