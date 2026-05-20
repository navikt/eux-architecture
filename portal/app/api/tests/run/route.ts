import "server-only";

import { NextResponse } from "next/server";
import { getClientCredentialsToken, AzureTokenError } from "@/lib/azureToken";
import { log } from "@/lib/log";
import H001_NAV from "@/lib/seds/H001-NAV.json";
import H001_NAV_UPDATE from "@/lib/seds/H001-NAV-update.json";

export const dynamic = "force-dynamic";

type GatewayEnv = "q1" | "q2";

const BUC_TYPE = "H_BUC_01";
const SED_TYPE = "H001";
const MOTTAKER_ID = "NO:NAVAT07";
const FNR = "23478743041";

const EXPECTED = {
  fnr: FNR,
  fornavn: "AKUSTISK",
  etternavn: "GULLMYNT",
  foedselsdato: "1987-07-23",
  kjoenn: "K",
} as const;

const EXPECTED_ADDR_CREATE = [
  {
    type: "bosted",
    gate: "Karl Johans gate 22",
    postnummer: "0026",
    by: "Oslo",
    land: "NO",
    landkode: "NOR",
  },
  {
    type: "opphold",
    gate: "Møllergata 5",
    postnummer: "0179",
    by: "Oslo",
    land: "NO",
    landkode: "NOR",
  },
] as const;

const EXPECTED_ADDR_UPDATE = [
  {
    type: "bosted",
    gate: "Storgata 1",
    postnummer: "0155",
    by: "Oslo",
    land: "NO",
    landkode: "NOR",
  },
  {
    type: "opphold",
    gate: "Karl Johans gate 22",
    postnummer: "0026",
    by: "Oslo",
    land: "NO",
    landkode: "NOR",
  },
] as const;

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

type RunBody = {
  env?: string;
  cleanup?: boolean;
};

type Links = {
  neessi: string | null;
  rina: string | null;
};

type RunResponse = {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  ok: boolean;
  env: GatewayEnv;
  cleanup: boolean;
  caseId: string | null;
  documentId: string | null;
  fnr: string;
  bucType: string;
  sedType: string;
  mottakerId: string;
  expected: typeof EXPECTED;
  verifications: Verification[];
  verificationOk: boolean;
  links: Links;
  steps: Step[];
};

type GatewayConfig = {
  base: string;
  scope: string;
  neessi: string | null;
};

function resolveConfig(env: GatewayEnv): GatewayConfig | null {
  const upper = env.toUpperCase();
  const base = process.env[`EUX_RINA_GATEWAY_${upper}_BASE_URL`];
  const scope = process.env[`EUX_RINA_GATEWAY_${upper}_SCOPE`];
  const neessi = process.env[`EUX_NEESSI_${upper}_BASE_URL`] ?? null;
  if (!base || !scope) return null;
  return {
    base: base.replace(/\/+$/, ""),
    scope,
    neessi: neessi ? neessi.replace(/\/+$/, "") : null,
  };
}

function tryParseJson(raw: string): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw.length > 8000 ? raw.slice(0, 8000) + "…" : raw;
  }
}

async function runStep(
  base: string,
  token: string,
  index: number,
  spec: {
    id: string;
    title: string;
    description: string;
    method: "GET" | "POST" | "PUT" | "DELETE";
    path: string;
    body?: unknown;
    contentType?: string;
    accept?: string;
  },
): Promise<Step> {
  const url = `${base}${spec.path}`;
  const started = Date.now();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: spec.accept ?? "application/json",
  };
  let body: BodyInit | undefined;
  if (spec.body !== undefined) {
    headers["Content-Type"] = spec.contentType ?? "application/json";
    body =
      typeof spec.body === "string" ? spec.body : JSON.stringify(spec.body);
  }
  try {
    const res = await fetch(url, {
      method: spec.method,
      cache: "no-store",
      headers,
      body,
    });
    const text = await res.text();
    const ct = res.headers.get("content-type") ?? "";
    const responseBody =
      ct.includes("application/json") ||
      text.trim().startsWith("{") ||
      text.trim().startsWith("[")
        ? tryParseJson(text)
        : text;
    return {
      id: spec.id,
      index,
      title: spec.title,
      description: spec.description,
      method: spec.method,
      url: spec.path,
      requestBody: spec.body ?? null,
      status: res.ok ? "ok" : "fail",
      httpStatus: res.status,
      responseBody,
      durationMs: Date.now() - started,
      message: `Gateway svarte ${res.status} ${res.statusText}`,
    };
  } catch (err) {
    return {
      id: spec.id,
      index,
      title: spec.title,
      description: spec.description,
      method: spec.method,
      url: spec.path,
      requestBody: spec.body ?? null,
      status: "fail",
      httpStatus: null,
      responseBody: null,
      durationMs: Date.now() - started,
      message: "Nettverks- eller transportfeil før gateway-en rakk å svare",
      error: (err as Error).message,
    };
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
  fornavn?: string | null;
  etternavn?: string | null;
  foedselsdato?: string | null;
  kjoenn?: string | null;
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
  o: Oversikt | null,
): Verification[] {
  const v: Verification[] = [];
  const motpart = o?.motparter?.find((m) => m?.motpartId === MOTTAKER_ID);
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
    Array.isArray(o?.sakshandlinger) && (o!.sakshandlinger!.length > 0),
  ));

  v.push(eq(G.PERSON, "fnr", EXPECTED.fnr, o?.fnr ?? null));
  v.push(eq(G.PERSON, "fornavn", EXPECTED.fornavn, o?.fornavn ?? null));
  v.push(eq(G.PERSON, "etternavn", EXPECTED.etternavn, o?.etternavn ?? null));
  v.push(eq(G.PERSON, "foedselsdato", EXPECTED.foedselsdato, o?.foedselsdato ?? null));
  v.push(eq(G.PERSON, "kjoenn", EXPECTED.kjoenn, o?.kjoenn ?? null));

  v.push(check(
    G.MOTPART,
    "motparter har nøyaktig 1 element",
    "1",
    o?.motparter?.length ?? 0,
    (o?.motparter?.length ?? 0) === 1,
  ));
  v.push(eq(G.MOTPART, "[0].motpartId", MOTTAKER_ID, motpart?.motpartId ?? null));
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
    G.MOTPART,
    "[0].formatertNavn er satt",
    "ikke-tom streng",
    motpart?.formatertNavn ?? null,
    typeof motpart?.formatertNavn === "string" && motpart!.formatertNavn!.length > 0,
  ));

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
    Array.isArray(sed?.sedHandlinger) && (sed!.sedHandlinger!.length > 0),
  ));
  v.push(check(
    G.SEDLIST,
    "[0].vedlegg er tom liste",
    "[]",
    sed?.vedlegg ?? null,
    Array.isArray(sed?.vedlegg) && (sed!.vedlegg!.length === 0),
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
        fornavn?: string;
        etternavn?: string;
        foedselsdato?: string;
        kjoenn?: string;
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
  landkode: string;
};

function verifyNavSed(
  group: string,
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

  v.push(eq(group, "person.fornavn", EXPECTED.fornavn, person?.fornavn ?? null));
  v.push(eq(group, "person.etternavn", EXPECTED.etternavn, person?.etternavn ?? null));
  v.push(eq(group, "person.foedselsdato", EXPECTED.foedselsdato, person?.foedselsdato ?? null));
  v.push(eq(group, "person.kjoenn", EXPECTED.kjoenn, person?.kjoenn ?? null));
  v.push(eq(group, "person.pin[0].identifikator", FNR, person?.pin?.[0]?.identifikator ?? null));

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
    v.push(eq(group, `adresse[${i}].landkode`, expected.landkode, actual?.landkode ?? null));
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

function buildLinks(
  oversikt: Oversikt | null,
  caseId: string | null,
  neessiBase: string | null,
): Links {
  return {
    neessi:
      caseId && neessiBase
        ? `${neessiBase}/svarsed/view/sak/${encodeURIComponent(caseId)}`
        : null,
    rina:
      typeof oversikt?.sakUrl === "string" && oversikt.sakUrl.startsWith("http")
        ? oversikt.sakUrl
        : null,
  };
}

export async function POST(req: Request) {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  let body: RunBody = {};
  try {
    const contentLength = req.headers.get("content-length");
    if (contentLength && Number(contentLength) > 0) {
      body = (await req.json()) as RunBody;
    }
  } catch {
    // ignore — tom body
  }

  const env: GatewayEnv = body.env === "q2" ? "q2" : "q1";
  const cleanup = body.cleanup ?? true;

  const cfg = resolveConfig(env);
  if (!cfg) {
    return NextResponse.json(
      {
        ok: false,
        error: `Portalen er ikke konfigurert til å snakke med eux-rina-gateway-${env} i dette miljøet.`,
      },
      { status: 503 },
    );
  }

  let token: string;
  try {
    token = await getClientCredentialsToken(cfg.scope);
  } catch (err) {
    const message =
      err instanceof AzureTokenError
        ? err.message
        : "Kunne ikke hente Azure AD client_credentials-token";
    log.warn({ err: (err as Error).message }, "smoke-test: token-feil");
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }

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
      `Ber gateway-en opprette en helt ny ${BUC_TYPE}-sak med NO:NAVAT07 ` +
      `som mottaker og en H001 (request-for-information) SED for fnr ${FNR} som ` +
      `første dokument. SED-en har TO adresser (bosted + opphold) slik at vi senere ` +
      `kan bekrefte at de overlevde NAV→EU→NAV-rundturen gjennom CPI.`,
    method: "POST",
    path:
      `/cpi/buc/sed?BucType=${encodeURIComponent(BUC_TYPE)}` +
      `&MottakerId=${encodeURIComponent(MOTTAKER_ID)}`,
    body: H001_NAV,
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
          : "Gateway svarte 2xx, men ingen sak-id i body";
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
        title: "Verifiser sak i /v5/rinasaker/oversikt",
        description:
          "Leser sak-oversikten for å bekrefte sakId, BUC-type, person-identifikatorer, mottaker og SED-liste. RINA sin read-side er eventually consistent, så vi poller noen sekunder.",
        method: "GET",
        path: `/v5/rinasaker/{caseId}/oversikt`,
      },
      "Hoppet over — ingen sak-id å verifisere",
    );
  } else {
    const pollResult = await pollOversikt(cfg.base, token, 2, caseId, documentId, {
      id: "verify-after-create",
      title: "Verifiser sak i /v5/rinasaker/oversikt",
      description:
        "Leser sak-oversikten og kontrollerer 25+ feltforventninger: sakId, sakType, sakTittel, internasjonalSakId, cdmVersjon, sakUrl, sensitiv, erSakseier, sakshandlinger; person-identifikatorer; motparter (inkl. ISO-2 land + ISO-3 landkode); sedListe-lengde, sedType, sedTittel, status, sedHandlinger, sedIdParent==null, vedlegg==[]. RINA sin read-side er eventually consistent, så vi poller noen sekunder.",
    });
    verifyAfterCreate = pollResult.step;
    oversikt = pollResult.oversikt;
    if (oversikt) {
      const oversiktChecks = verifyOversikt(caseId, documentId, oversikt);
      verifications.push(...oversiktChecks);
      const failed = oversiktChecks.filter((v) => !v.ok);
      if (failed.length > 0) {
        verifyAfterCreate.status = "fail";
        verifyAfterCreate.message =
          `Oversikt kom tilbake, men ${failed.length} av ${oversiktChecks.length} ` +
          `feltsjekk(er) feilet: ${failed.map((f) => f.label).slice(0, 5).join(", ")}` +
          (failed.length > 5 ? ` (+${failed.length - 5} til)` : "");
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
        "Kaller GET /cpi/buc/{caseId}/sed/{documentId} som kjører den mal-drevne EU→NAV-transformen. Vi bekrefter person-identifikatorer + begge bosted-/opphold-adresser gikk intakt gjennom CPI.",
      method: "GET",
      path: `/cpi/buc/${encodeURIComponent(caseId)}/sed/${encodeURIComponent(documentId)}`,
    });
    if (readNavSedAfterCreate.status === "ok") {
      const navSed = readNavSedAfterCreate.responseBody as NavSed | null;
      const sedChecks = verifyNavSed(G.SED_CREATE, navSed, EXPECTED_ADDR_CREATE);
      verifications.push(...sedChecks);
      const failed = sedChecks.filter((v) => !v.ok);
      if (failed.length > 0) {
        readNavSedAfterCreate.status = "fail";
        readNavSedAfterCreate.message =
          `NAV-SED-en kom tilbake, men ${failed.length} av ${sedChecks.length} ` +
          `feltsjekk(er) feilet: ${failed.map((f) => f.label).slice(0, 5).join(", ")}` +
          (failed.length > 5 ? ` (+${failed.length - 5} til)` : "");
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
          "Sender en modifisert versjon av SED-en via Update-handlingen. Vi bytter de to adressene (bosted ⇄ opphold) og endrer request-teksten slik at diffen blir synlig i steg 6.",
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
      body: H001_NAV_UPDATE,
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
          "Kaller GET /cpi/buc/{caseId}/sed/{documentId} en gang til. Vi bekrefter at adressene matcher oppdaterings-payloaden (bosted=Storgata 1, opphold=Karl Johans gate 22) — det beviser at oppdateringen nådde CPI.",
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
      const sedChecks = verifyNavSed(G.SED_UPDATE, navSed, EXPECTED_ADDR_UPDATE);
      verifications.push(...sedChecks);
      const failed = sedChecks.filter((v) => !v.ok);
      if (failed.length > 0) {
        readNavSedAfterUpdate.status = "fail";
        readNavSedAfterUpdate.message =
          `NAV-SED-en kom tilbake, men ${failed.length} av ${sedChecks.length} ` +
          `feltsjekk(er) feilet: ${failed.map((f) => f.label).slice(0, 5).join(", ")}` +
          (failed.length > 5 ? ` (+${failed.length - 5} til)` : "");
      } else {
        readNavSedAfterUpdate.message = `NAV-SED gjenspeiler de oppdaterte adressene (${sedChecks.length} sjekker)`;
      }
    } else {
      readNavSedAfterUpdate.message = `Kunne ikke lese NAV-SED (${readNavSedAfterUpdate.httpStatus ?? "ingen respons"})`;
    }
  }
  steps.push(readNavSedAfterUpdate);

  // Steg 7: opprydding.
  let cleanupStep: Step;
  if (!caseId) {
    cleanupStep = skip(
      7,
      {
        id: "cleanup",
        title: cleanup
          ? "Slett RINA-saken (opprydding)"
          : "Hopp over opprydding (behold saken)",
        description: cleanup
          ? "Best-effort DELETE så vi ikke lar testsaker bli liggende i CPI."
          : "Du slo av auto-opprydding — saken blir liggende i CPI til den slettes manuelt.",
        method: "DELETE",
        path: `/cpi/buc/{caseId}`,
      },
      "Hoppet over — ingen sak å slette",
    );
  } else if (!cleanup) {
    cleanupStep = skip(
      7,
      {
        id: "cleanup",
        title: "Hopp over opprydding (behold saken)",
        description: `Auto-opprydding var slått av. RINA-saken ${caseId} blir liggende i CPI til den slettes manuelt.`,
        method: "DELETE",
        path: `/cpi/buc/${caseId}`,
      },
      `Beholdt sak ${caseId} i CPI etter ønske`,
    );
  } else {
    cleanupStep = await runStep(cfg.base, token, 7, {
      id: "cleanup",
      title: "Slett RINA-saken (opprydding)",
      description: `Best-effort DELETE så vi ikke lar testsaker bli liggende i CPI for fnr ${FNR}.`,
      method: "DELETE",
      path: `/cpi/buc/${encodeURIComponent(caseId)}`,
    });
    if (cleanupStep.status === "ok") {
      cleanupStep.message = `Slettet RINA-sak ${caseId}`;
    } else if (cleanupStep.status === "fail") {
      cleanupStep.message = `Opprydding feilet (${cleanupStep.httpStatus ?? "ingen respons"}) — sak ${caseId} kan fortsatt eksistere`;
    }
  }
  steps.push(cleanupStep);

  const finishedAt = new Date().toISOString();
  const ok = steps.every((s) => s.status !== "fail");
  const links = buildLinks(oversikt, caseId, cfg.neessi);
  const verificationOk =
    verifications.length > 0 && verifications.every((v) => v.ok);

  const response: RunResponse = {
    startedAt,
    finishedAt,
    durationMs: Date.now() - t0,
    ok,
    env,
    cleanup,
    caseId,
    documentId,
    fnr: FNR,
    bucType: BUC_TYPE,
    sedType: SED_TYPE,
    mottakerId: MOTTAKER_ID,
    expected: EXPECTED,
    verifications,
    verificationOk,
    links,
    steps,
  };

  return NextResponse.json(response, {
    headers: { "Cache-Control": "no-store" },
  });
}
