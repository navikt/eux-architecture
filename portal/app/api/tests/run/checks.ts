import type { Verification } from "@/app/tests/smokeTest";

/** What the smoke test creates, and what it expects to read back from eux-rina-api. */
export const BUC_TYPE = "H_BUC_01";
export const SED_TYPE = "H001";

type Address = { type: string; gate: string; postnummer: string; by: string; land: string };

const ADDRESS_FIELDS = ["type", "gate", "postnummer", "by", "land"] as const;

/** The addresses in lib/seds/H001-NAV.json. */
export const EXPECTED_ADDR_CREATE: readonly Address[] = [
  { type: "bosted", gate: "Karl Johans gate 22", postnummer: "0026", by: "Oslo", land: "NO" },
  { type: "opphold", gate: "Møllergata 5", postnummer: "0179", by: "Oslo", land: "NO" },
];

/** The addresses in lib/seds/H001-NAV-update.json. */
export const EXPECTED_ADDR_UPDATE: readonly Address[] = [
  { type: "bosted", gate: "Storgata 1", postnummer: "0155", by: "Oslo", land: "NO" },
  { type: "opphold", gate: "Karl Johans gate 22", postnummer: "0026", by: "Oslo", land: "NO" },
];

export const GROUP = {
  CASE: "Sak (oversikt)",
  PERSON: "Person (oversikt)",
  MOTPART: "Motparter (oversikt)",
  SEDLIST: "SED-liste (oversikt)",
  SED_CREATE: "NAV-SED · etter opprettelse",
  SED_UPDATE: "NAV-SED · etter oppdatering",
  SED_SENT: "SED-liste · etter send",
} as const;

/** The parts of GET /v5/rinasaker/{caseId}/oversikt that the test checks. */
export type Oversikt = {
  sakId?: string | null;
  sakType?: string | null;
  sakTittel?: string | null;
  internasjonalSakId?: string | null;
  cdmVersjon?: string | null;
  sakUrl?: string | null;
  sensitiv?: boolean | null;
  erSakseier?: boolean | null;
  fnr?: string | null;
  sistEndretDatoTid?: string | null;
  sakshandlinger?: string[] | null;
  motparter?: Array<{
    motpartId?: string | null;
    motpartNavn?: string | null;
    motpartLand?: string | null;
    motpartLandkode?: string | null;
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

/** The parts of the NAV-format SED from GET /cpi/buc/{caseId}/sed/{documentId} that the test checks. */
export type NavSed = {
  sed?: string;
  sedVer?: string;
  sedGVer?: string;
  nav?: {
    bruker?: {
      person?: { pin?: Array<{ identifikator?: string; land?: string }> };
      adresse?: Array<Partial<Address>>;
    };
  };
};

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

function check(group: string, label: string, expected: string, actual: unknown, ok: boolean): Verification {
  return { group, label, expected, actual: fmt(actual), ok };
}

export function eq(group: string, label: string, expected: unknown, actual: unknown): Verification {
  return check(group, label, fmt(expected), actual, fmt(expected) === fmt(actual));
}

function nonEmptyString(group: string, label: string, actual: unknown, expected = "ikke-tom streng"): Verification {
  return check(group, label, expected, actual, typeof actual === "string" && actual.length > 0);
}

function nonEmptyList(group: string, label: string, actual: unknown, expected = "ikke-tom liste"): Verification {
  return check(group, label, expected, actual, Array.isArray(actual) && actual.length > 0);
}

/** Step message for a response that came back but failed some field checks. */
export function failedChecksMessage(what: string, failed: Verification[], total: number): string {
  const labels = failed.map((f) => f.label).slice(0, 5).join(", ");
  const more = failed.length > 5 ? ` (+${failed.length - 5} til)` : "";
  return `${what} kom tilbake, men ${failed.length} av ${total} feltsjekk(er) feilet: ${labels}${more}`;
}

export function verifyOversikt(
  caseId: string | null,
  documentId: string | null,
  fnr: string,
  mottakerId: string,
  o: Oversikt,
): Verification[] {
  const motpart = o.motparter?.find((m) => m?.motpartId === mottakerId);
  const sed = o.sedListe?.find((s) => s?.sedId === documentId) ?? o.sedListe?.[0];
  const { CASE, PERSON, MOTPART, SEDLIST } = GROUP;
  const sakUrl = o.sakUrl;

  return [
    eq(CASE, "sakId matcher caseId", caseId, o.sakId),
    eq(CASE, "sakType", BUC_TYPE, o.sakType),
    nonEmptyString(CASE, "sakTittel er satt", o.sakTittel),
    nonEmptyString(CASE, "internasjonalSakId er satt", o.internasjonalSakId),
    nonEmptyString(CASE, "cdmVersjon er satt", o.cdmVersjon, "ikke-tom streng (f.eks. 4.3 eller 4.4)"),
    check(CASE, "sakUrl peker på RINA", "starter med https://", sakUrl, typeof sakUrl === "string" && sakUrl.startsWith("https://")),
    eq(CASE, "sensitiv", false, o.sensitiv),
    eq(CASE, "erSakseier (vi opprettet saken)", true, o.erSakseier),
    nonEmptyList(CASE, "sakshandlinger er ikke tom", o.sakshandlinger),

    eq(PERSON, "fnr matcher input", fnr, o.fnr),

    eq(MOTPART, "motparter har nøyaktig 1 element", 1, o.motparter?.length ?? 0),
    eq(MOTPART, "[0].motpartId", mottakerId, motpart?.motpartId),
    nonEmptyString(MOTPART, "[0].motpartNavn er satt", motpart?.motpartNavn),
    eq(MOTPART, "[0].motpartLand (ISO-2)", "NO", motpart?.motpartLand),
    eq(MOTPART, "[0].motpartLandkode (ISO-3)", "NOR", motpart?.motpartLandkode),

    eq(SEDLIST, "sedListe har nøyaktig 1 element", 1, o.sedListe?.length ?? 0),
    eq(SEDLIST, "[0].sedId", documentId ?? "(documentId mangler)", sed?.sedId),
    eq(SEDLIST, "[0].sedType", SED_TYPE, sed?.sedType),
    nonEmptyString(SEDLIST, "[0].sedTittel er satt", sed?.sedTittel),
    nonEmptyString(SEDLIST, "[0].status er satt", sed?.status),
    eq(SEDLIST, "[0].sedIdParent er null (ingen parent)", null, sed?.sedIdParent),
    eq(SEDLIST, "[0].svarsedType er null", null, sed?.svarsedType),
    eq(SEDLIST, "[0].svarsedId er null", null, sed?.svarsedId),
    nonEmptyList(SEDLIST, "[0].sedHandlinger er ikke tom", sed?.sedHandlinger, "ikke-tom liste (Update m.fl.)"),
    check(SEDLIST, "[0].vedlegg er tom liste", "[]", sed?.vedlegg, Array.isArray(sed?.vedlegg) && sed.vedlegg.length === 0),
  ];
}

export function verifyNavSed(
  group: string,
  fnr: string,
  navSed: NavSed | null,
  expectedAddresses: readonly Address[],
): Verification[] {
  const pin = navSed?.nav?.bruker?.person?.pin?.[0];
  const addrs = navSed?.nav?.bruker?.adresse ?? [];

  return [
    eq(group, "sed", SED_TYPE, navSed?.sed),
    nonEmptyString(group, "sedVer er satt", navSed?.sedVer),
    nonEmptyString(group, "sedGVer er satt", navSed?.sedGVer),
    eq(group, "person.pin[0].identifikator", fnr, pin?.identifikator),
    eq(group, "person.pin[0].land", "NO", pin?.land),
    // Vi sjekker bevisst ikke `landkode` (ISO-3), verken på pin eller adresser —
    // den blir ikke populert av NAV-format-transformen på vei tilbake gjennom CPI,
    // kun ISO-2 `land`. Det er en kjent egenskap ved ACL-mappingen, ikke en regresjon.
    eq(group, `adresse[] har nøyaktig ${expectedAddresses.length} elementer`, expectedAddresses.length, addrs.length),
    ...expectedAddresses.flatMap((expected, i) =>
      ADDRESS_FIELDS.map((key) => eq(group, `adresse[${i}].${key}`, expected[key], addrs[i]?.[key])),
    ),
  ];
}
