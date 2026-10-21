import "server-only";

import { NextResponse } from "next/server";
import { getClientCredentialsToken } from "@/lib/azureToken";
import { log } from "@/lib/log";
import H001_NAV from "@/lib/seds/H001-NAV.json";
import H001_NAV_UPDATE from "@/lib/seds/H001-NAV-update.json";
import { DEFAULT_FNR, FNR_REGEX, MOTTAKER, SENDER, type Direction, type RunResponse } from "@/app/tests/smokeTest";
import {
  BUC_TYPE,
  EXPECTED_ADDR_CREATE,
  EXPECTED_ADDR_UPDATE,
  GROUP,
  SED_TYPE,
  eq,
  verifyNavSed,
  verifyOversikt,
  type NavSed,
  type Oversikt,
} from "./checks";
import { SmokeRun, type StepSpec } from "./runner";

export const dynamic = "force-dynamic";

// Fnr som ligger i SED-malene under lib/seds/ — byttes ut med brukerens fnr
// før vi sender SED-en til eux-rina-api.
const TEMPLATE_FNR = "23478743041";

type RunBody = {
  direction?: unknown;
  fnr?: unknown;
};

function resolveConfig(env: "q1" | "q2"): { base: string; scope: string } | null {
  const upper = env.toUpperCase();
  const base = process.env[`EUX_RINA_API_${upper}_BASE_URL`];
  const scope = process.env[`EUX_RINA_API_${upper}_SCOPE`];
  if (!base || !scope) return null;
  return { base: base.replace(/\/+$/, ""), scope };
}

function substituteFnr<T>(payload: T, fnr: string): T {
  return JSON.parse(JSON.stringify(payload).replaceAll(TEMPLATE_FNR, fnr)) as T;
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

const error = (status: number, message: string) => NextResponse.json({ ok: false, error: message }, { status });

/** Ids from the create step's response: `caseId`, and `documentId` (or `sedId`/`id`). */
function createdIds(body: unknown): { caseId: string | null; documentId: string | null } {
  const obj = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const doc = obj.documentId ?? obj.sedId ?? obj.id;
  return {
    caseId: typeof obj.caseId === "string" ? obj.caseId : null,
    documentId: typeof doc === "string" ? doc : null,
  };
}

/** A path segment, or the placeholder when the id is missing (for skipped steps). */
const segment = (id: string | null, placeholder: string) => (id ? encodeURIComponent(id) : placeholder);

/** Whether `after` is later than `before`, or null if either is missing or unparseable. */
function isLater(after: string | null | undefined, before: string | null | undefined): boolean | null {
  const a = Date.parse(after ?? "");
  const b = Date.parse(before ?? "");
  return Number.isNaN(a) || Number.isNaN(b) ? null : a > b;
}

// Hver kjøring oppretter en ekte RINA-sak, så vi tillater bare én om gangen.
// Låsen gjelder per pod; portalen kjører med få replicas.
let runInProgress = false;

export async function POST(req: Request) {
  if (!isJson(req)) return error(415, "Content-Type må være application/json.");
  if (runInProgress) return error(409, "En smoke-test kjører allerede. Prøv igjen når den er ferdig.");

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

  const direction: Direction = isDirection(body.direction) ? body.direction : "q1-to-q2";
  const sender = SENDER[direction];
  const receiver = sender === "q1" ? "q2" : "q1";
  const mottakerId = MOTTAKER[direction];

  const fnrInput = typeof body.fnr === "string" ? body.fnr.trim() : "";
  if (fnrInput && !FNR_REGEX.test(fnrInput)) return error(400, "Ugyldig fnr — må være 11 sifre.");
  const fnr = fnrInput || DEFAULT_FNR;

  const cfg = resolveConfig(sender);
  if (!cfg) {
    return error(503, `Portalen er ikke konfigurert til å snakke med eux-rina-api-${sender} i dette miljøet.`);
  }

  let token: string;
  try {
    token = await getClientCredentialsToken(cfg.scope);
  } catch (err) {
    log.warn({ err, sender }, "smoke-test: kunne ikke hente Azure AD-token");
    return error(
      502,
      `Kunne ikke hente Azure AD-token for eux-rina-api-${sender}. Se loggene til portalen for detaljer.`,
    );
  }

  const run = new SmokeRun(cfg.base, token);

  // Steg 1: opprett RINA-sak + første H001 SED i ett atomisk kall.
  const create = await run.call(
    {
      id: "create-case-and-sed",
      title: "Opprett RINA-sak med en H001 SED",
      description:
        `Ber eux-rina-api-${sender} opprette en ny ${BUC_TYPE}-sak med ${mottakerId} ` +
        `som mottaker og en H001 (request-for-information) SED for fnr ${fnr} som ` +
        `første dokument. SED-en har to adresser (bosted + opphold) slik at vi senere ` +
        `kan bekrefte at de overlevde NAV→EU→NAV-rundturen gjennom CPI.`,
      method: "POST",
      path: `/cpi/buc/sed?BucType=${encodeURIComponent(BUC_TYPE)}&MottakerId=${encodeURIComponent(mottakerId)}`,
      body: substituteFnr(H001_NAV, fnr),
    },
    { failed: "Kunne ikke opprette RINA-sak + SED" },
  );
  const { caseId, documentId } = createdIds(create.status === "ok" ? create.responseBody : null);
  if (create.status === "ok") {
    create.message = !caseId
      ? "API svarte 2xx, men ingen sak-id i body"
      : documentId
        ? `Opprettet RINA-sak ${caseId} med SED ${documentId}`
        : `Opprettet RINA-sak ${caseId} (ingen documentId i body)`;
  }

  // Steg som trenger saken eller SED-en hoppes over når opprettelsen ikke ga dem.
  const noCase = caseId ? null : "Hoppet over — ingen sak-id å verifisere";
  const noIds = !caseId
    ? "Hoppet over — ingen sak-id fra opprettings-steget"
    : !documentId
      ? "Hoppet over — ingen documentId fra opprettings-steget"
      : null;
  const oversiktPath = `/v5/rinasaker/${segment(caseId, "{caseId}")}/oversikt`;
  const sedPath = `/cpi/buc/${segment(caseId, "{caseId}")}/sed/${segment(documentId, "{documentId}")}`;
  let oversikt: Oversikt | null = null;

  const readNavSed = (spec: Omit<StepSpec, "method" | "path">, skip: string | null) =>
    run.call({ ...spec, method: "GET", path: sedPath }, { skip, failed: "Kunne ikke lese NAV-SED" });

  // Steg 2: poll oversikt til saken + SED-en dukker opp, og sjekk feltene.
  const afterCreate = await run.pollOversikt(
    {
      id: "verify-after-create",
      title: "Verifiser sak i /v5/rinasaker/{caseId}/oversikt",
      description:
        "Leser sak-oversikten og kontrollerer en lang rekke felter: sakId, sakType, sakTittel, internasjonalSakId, cdmVersjon, sakUrl, sensitiv, erSakseier, sakshandlinger; fnr; motpart (id, navn, ISO-2 land, ISO-3 landkode); sedListe-lengde, sedType, sedTittel, status, sedHandlinger, sedIdParent==null, vedlegg==[]. RINA sin read-side er eventually consistent, så vi poller noen sekunder.",
      path: oversiktPath,
    },
    { skip: noCase, caseId, documentId },
  );
  oversikt = afterCreate.oversikt;
  if (oversikt) {
    const checks = verifyOversikt(caseId, documentId, fnr, mottakerId, oversikt);
    run.verify(afterCreate.step, checks, {
      what: "Oversikt",
      ok: `Oversikt matcher alle ${checks.length} forventede felter`,
    });
  }

  // Steg 3: les NAV-formatert SED tilbake og bekreft at begge adressene overlevde.
  const readAfterCreate = await readNavSed(
    {
      id: "read-nav-sed-after-create",
      title: "Les NAV-format SED — overlevde begge adressene?",
      description:
        "Kaller GET /cpi/buc/{caseId}/sed/{documentId} som kjører den mal-drevne EU→NAV-transformen. Vi bekrefter person-pin + begge bosted-/opphold-adresser gikk intakt gjennom CPI.",
    },
    noIds,
  );
  if (readAfterCreate.status === "ok") {
    const checks = verifyNavSed(GROUP.SED_CREATE, fnr, readAfterCreate.responseBody as NavSed | null, EXPECTED_ADDR_CREATE);
    run.verify(readAfterCreate, checks, {
      what: "NAV-SED-en",
      ok: `NAV-SED gjenspeiler alle ${checks.length} forventede felter (inkl. begge adressene)`,
    });
  }

  // Steg 4: oppdater SED.
  const update = await run.call(
    {
      id: "update-sed",
      title: "Oppdater H001 SED — bytt adressene",
      description:
        "Sender en modifisert versjon av SED-en via Update-handlingen. Vi bytter de to adressene (bosted=Storgata 1, opphold=Karl Johans gate 22) og endrer request-teksten slik at diffen blir synlig i steg 6.",
      method: "PUT",
      path: sedPath,
      body: substituteFnr(H001_NAV_UPDATE, fnr),
    },
    { skip: noIds, ok: `Oppdaterte SED ${documentId} på sak ${caseId}`, failed: "Kunne ikke oppdatere SED" },
  );

  // Steg 5: verifiser oversikt på nytt — sistEndretDatoTid skal ha gått framover.
  const beforeTs = oversikt?.sistEndretDatoTid ?? null;
  const afterUpdate = await run.pollOversikt(
    {
      id: "verify-after-update",
      title: "Verifiser oversikt etter oppdatering",
      description:
        "Leser sak-oversikten igjen og sjekker at sistEndretDatoTid er senere enn før oppdateringen — det beviser at oppdateringen nådde read-siden.",
      path: oversiktPath,
    },
    { skip: noCase, caseId, documentId },
  );
  oversikt = afterUpdate.oversikt ?? oversikt;
  if (update.status === "ok" && afterUpdate.step.status === "ok") {
    const afterTs = afterUpdate.oversikt?.sistEndretDatoTid ?? null;
    const advanced = isLater(afterTs, beforeTs);
    if (advanced === false) {
      afterUpdate.step.status = "fail";
      afterUpdate.step.message = `sistEndretDatoTid endret seg ikke (${beforeTs} → ${afterTs})`;
    } else if (advanced) {
      afterUpdate.step.message = `sistEndretDatoTid gikk ${beforeTs} → ${afterTs}`;
    }
  }

  // Steg 6: les NAV-SED på nytt — bekreft at nye adresser kom på plass.
  const readAfterUpdate = await readNavSed(
    {
      id: "read-nav-sed-after-update",
      title: "Les NAV-format SED — kom de nye adressene fram?",
      description:
        "Kaller GET /cpi/buc/{caseId}/sed/{documentId} en gang til. Vi bekrefter at adressene matcher oppdaterings-payloaden (bosted=Storgata 1, opphold=Karl Johans gate 22) — det beviser at oppdateringen nådde CPI.",
    },
    noIds ?? (update.status === "ok" ? null : "Hoppet over — oppdaterings-steget gikk ikke gjennom"),
  );
  if (readAfterUpdate.status === "ok") {
    const checks = verifyNavSed(GROUP.SED_UPDATE, fnr, readAfterUpdate.responseBody as NavSed | null, EXPECTED_ADDR_UPDATE);
    run.verify(readAfterUpdate, checks, {
      what: "NAV-SED-en",
      ok: `NAV-SED gjenspeiler de oppdaterte adressene (${checks.length} sjekker)`,
    });
  }

  // Steg 7: send SED-en til mottaker via Send-handlingen.
  const send = await run.call(
    {
      id: "send-sed",
      title: `Send SED til ${mottakerId}`,
      description:
        `Kaller POST ${sedPath}/send som trigger Send-handlingen i RINA. ` +
        `eux-rina-api venter på at handlingen fullføres (ventePaAksjon=true) før den svarer, ` +
        `slik at SED-status kan verifiseres i neste steg.`,
      method: "POST",
      path: `${sedPath}/send`,
    },
    {
      skip: noIds,
      ok: `Send-handlingen for SED ${documentId} ble fullført av eux-rina-api`,
      failed: "Kunne ikke sende SED",
    },
  );

  // Steg 8: verifiser at SED-en har gått til status "sent" på oversikten.
  const afterSend = await run.pollOversikt(
    {
      id: "verify-after-send",
      title: "Verifiser at SED er sendt",
      description:
        'Leser sak-oversikten en siste gang og bekrefter at SED-en har gått til status "sent". ' +
        "Read-siden er eventually consistent, så vi poller noen sekunder.",
      path: oversiktPath,
    },
    {
      skip: noIds ?? (send.status === "ok" ? null : "Hoppet over — Send-steget gikk ikke gjennom"),
      caseId,
      documentId,
    },
  );
  if (afterSend.oversikt) {
    oversikt = afterSend.oversikt;
    const status = afterSend.oversikt.sedListe?.find((s) => s?.sedId === documentId)?.status;
    run.verify(afterSend.step, [eq(GROUP.SED_SENT, `[sedId=${documentId}].status`, "sent", status)], {
      what: "SED-status",
      ok: `SED ${documentId} har status "sent" på oversikten`,
      failed: `SED-status er fortsatt "${status ?? "(ukjent)"}" — forventet "sent"`,
    });
  }

  const { steps, verifications } = run;
  const ok = steps.every((s) => s.status !== "fail");
  const verificationOk = verifications.length > 0 && verifications.every((v) => v.ok);
  const sakUrl = oversikt?.sakUrl;

  const response: RunResponse = {
    startedAt,
    finishedAt: new Date().toISOString(),
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
    links: { rina: typeof sakUrl === "string" && sakUrl.startsWith("http") ? sakUrl : null },
    steps,
  };

  log.info(
    { direction, sender, receiver, caseId, documentId, ok, verificationOk, durationMs: response.durationMs },
    "smoke-test: kjøring ferdig",
  );

  return NextResponse.json(response, { status: ok ? 200 : 207 });
}
