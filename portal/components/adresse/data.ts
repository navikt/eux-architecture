/**
 * Verified model of address updates from SED to PDL, used by
 * /prosesser/adresseoppdatering. The logic is a direct port of
 * eux-adresse-oppdatering: EuxRinaCaseEventsKafkaListener, AdresseService,
 * FinnIdent, Adressetransformering, Ordbok, EksisterendeAdresseSammenligning,
 * PdlService, PdlVegadresse, PdlPostboksadresse, PdlUtenlandskAdresse,
 * PdlApiClient and PdlMottakClient. Topics are checked against
 * eux-all-rina-events (.nais/topics).
 */

import type { Tone } from "@/components/avslutning/data";

export type { Tone };

/* ------------------------------------------------------------------ */
/* Filteret i Kafka-lytteren                                           */
/* ------------------------------------------------------------------ */

export const SEKTORER: { id: string; label: string; behandlingsnummer: string }[] = [
  { id: "H", label: "Horisontale", behandlingsnummer: "B139, B271, B284, B286, B287, B299" },
  { id: "UB", label: "Arbeidsledighet", behandlingsnummer: "B286" },
  { id: "FB", label: "Familieytelser", behandlingsnummer: "B284" },
  { id: "S", label: "Sykdom", behandlingsnummer: "B139" },
];

/** SED-typer AdresseService hopper over, med begrunnelsen fra koden. */
export const UNNTAK_SED: { sed: string; why: string }[] = [
  { sed: "H020", why: "«pga. feil»" },
  { sed: "U020", why: "«manglende støtte i ACL»" },
  { sed: "U020_Master", why: "«manglende støtte i ACL»" },
];

export const TEST_RINASAK = 1451402;

/* ------------------------------------------------------------------ */
/* Ordbok                                                              */
/* ------------------------------------------------------------------ */

/** Ordbok.kt: ordForUkjent (dubletter fjernet). Sammenlignes eksakt med feltet i små bokstaver. */
export const ORD_FOR_UKJENT = Array.from(
  new Set([
    "ukjent", "vet ikke", "nn", "ikke sikker", "usikker", "uvisst", "ingen anelse", "ikke relevant", "irrelevant",
    "tom", "ingen opplysning", "ikke oppgitt", "mangler", "uavklart", "ikke tilgjengelig", "n/a", "null", "blankt",
    "ingen kommentar", "vet ikke nå", "kommer senere", "unknown", "don't know", "unsure", "not sure", "undefined",
    "uncertain", "no idea", "not applicable", "empty", "no information", "not provided", "missing", "unavailable",
    "none", "not determined", "to be decided", "to be updated", "blank", "not recorded", "no response", "pending",
    "okänd", "vet inte", "osäker", "ingen aning", "oavsett", "ingen uppgift", "ej tillgänglig", "saknas", "vet ej",
    "kommer senare", "inte bestämt", "oidentifierad", "ukendt", "ved ikke", "uafklaret", "ingen oplysning",
    "ikke angivet", "ikke tilgængelig", "ikke besluttet", "ubestemt", "ikke oplyst",
  ]),
);

/** Ordbok.kt: ordForPostboks. Det holder at gate-feltet inneholder ett av dem. */
export const ORD_FOR_POSTBOKS = ["postboks", "pb", "p.b.", "postb.", "postbox", "po.box"];

/* ------------------------------------------------------------------ */
/* Tegnklasser som i Kotlin                                            */
/* ------------------------------------------------------------------ */

const isLetter = (c: string) => /\p{L}/u.test(c);
const isDigit = (c: string) => /\p{Nd}/u.test(c);
const isLetterOrDigit = (c: string) => isLetter(c) || isDigit(c);
const chars = (s: string) => Array.from(s);
const none = (s: string, p: (c: string) => boolean) => !chars(s).some(p);
const all = (s: string, p: (c: string) => boolean) => chars(s).every(p);
const any = (s: string, p: (c: string) => boolean) => chars(s).some(p);
const isBlank = (s: string | null | undefined): s is null | undefined | "" => s == null || s.trim() === "";
const tokens = (s: string) => s.trim().replace(/\s+/g, " ").split(" ");

/* ------------------------------------------------------------------ */
/* Adresse og vask (Adressetransformering.kt)                           */
/* ------------------------------------------------------------------ */

export type AdresseType = "kontakt" | "opphold" | "bosted";

/** Adressen slik den står i SED-en (EuxRinaApiDokument.Adresse). */
export interface SedAdresse {
  type: AdresseType;
  gate: string | null;
  bygning: string | null;
  by: string | null;
  postnummer: string | null;
  region: string | null;
  landkode: string | null;
}

/** Den interne modellen (model/Adresse.kt). Feltnavnene følger PDL. */
export interface Adresse {
  adressenavnNummer: string | null;
  postboksNummerNavn: string | null;
  bygningEtasjeLeilighet: string | null;
  bySted: string | null;
  postkode: string | null;
  regionDistriktOmraade: string | null;
  landkode: string | null;
}

export type FieldKey = keyof Adresse;

export const FIELD_MAP: { sed: Exclude<keyof SedAdresse, "type">; pdl: FieldKey; text: string }[] = [
  { sed: "gate", pdl: "adressenavnNummer", text: "Gate og husnummer" },
  { sed: "bygning", pdl: "bygningEtasjeLeilighet", text: "Bygning, etasje, leilighet" },
  { sed: "by", pdl: "bySted", text: "By eller sted" },
  { sed: "postnummer", pdl: "postkode", text: "Postnummer" },
  { sed: "region", pdl: "regionDistriktOmraade", text: "Region, distrikt, område" },
  { sed: "landkode", pdl: "landkode", text: "Landkode med tre bokstaver" },
];

export const PDL_FIELDS: FieldKey[] = [
  "adressenavnNummer",
  "postboksNummerNavn",
  "bygningEtasjeLeilighet",
  "bySted",
  "postkode",
  "regionDistriktOmraade",
  "landkode",
];

export type VaskRule = "ukjent" | "ingen-bokstav" | "tomt" | "ingen-tegn" | "postboks" | "bygning" | "tegn";

export interface Vaskesteg {
  field: FieldKey;
  from: string;
  to: string | null;
  rule: VaskRule;
  /** Verdien er flyttet til dette feltet. */
  moved?: FieldKey;
}

export const RULE_TEXT: Record<VaskRule, string> = {
  ukjent: "betyr «ukjent»",
  "ingen-bokstav": "har ingen bokstaver",
  tomt: "er tomt",
  "ingen-tegn": "har verken bokstaver eller tall",
  postboks: "inneholder et ord for postboks",
  bygning: "har verken bokstaver eller tall, og legges til gaten",
  tegn: "ulovlige tegn er byttet ut",
};

export const tilAdresse = (a: SedAdresse): Adresse => ({
  adressenavnNummer: a.gate,
  postboksNummerNavn: null,
  bygningEtasjeLeilighet: a.bygning,
  bySted: a.by,
  postkode: a.postnummer,
  regionDistriktOmraade: a.region,
  landkode: a.landkode,
});

const erUkjent = (v: string) => ORD_FOR_UKJENT.includes(v.toLowerCase());

/** transformertOgValidert(): samme ledd i samme rekkefølge som i Kotlin. */
export function vask(input: Adresse): { adresse: Adresse; steg: Vaskesteg[] } {
  const steg: Vaskesteg[] = [];
  const a = { ...input };

  const validate = (field: FieldKey, rule: (v: string) => VaskRule | null) => {
    const v = a[field];
    if (v == null) return;
    const hit = erUkjent(v) ? "ukjent" : rule(v);
    if (hit) {
      steg.push({ field, from: v, to: null, rule: hit });
      a[field] = null;
    }
  };

  validate("adressenavnNummer", (v) => (none(v, isLetter) ? "ingen-bokstav" : null));
  validate("bygningEtasjeLeilighet", (v) => (isBlank(v) ? "tomt" : null));
  validate("bySted", (v) => (none(v, isLetterOrDigit) ? "ingen-tegn" : null));
  validate("postkode", (v) => (none(v, isLetterOrDigit) ? "ingen-tegn" : null));
  validate("regionDistriktOmraade", (v) => (none(v, isLetterOrDigit) ? "ingen-tegn" : null));

  const gate = a.adressenavnNummer;
  if (gate != null && ORD_FOR_POSTBOKS.some((o) => gate.toLowerCase().includes(o))) {
    steg.push({ field: "adressenavnNummer", from: gate, to: null, rule: "postboks", moved: "postboksNummerNavn" });
    a.postboksNummerNavn = gate;
    a.adressenavnNummer = null;
  }

  const bygning = a.bygningEtasjeLeilighet;
  if (bygning != null && none(bygning, isLetterOrDigit)) {
    steg.push({ field: "bygningEtasjeLeilighet", from: bygning, to: null, rule: "bygning", moved: "adressenavnNummer" });
    a.adressenavnNummer = a.adressenavnNummer == null ? bygning : `${a.adressenavnNummer} ${bygning}`;
    a.bygningEtasjeLeilighet = null;
  }

  if (a.adressenavnNummer != null) {
    const ny = a.adressenavnNummer.replaceAll("№", "No").replaceAll("${quotationMARK}", "").replaceAll("{quotationMARK}", "");
    if (ny !== a.adressenavnNummer) {
      steg.push({ field: "adressenavnNummer", from: a.adressenavnNummer, to: ny, rule: "tegn" });
      a.adressenavnNummer = ny;
    }
  }

  return { adresse: a, steg };
}

/* ------------------------------------------------------------------ */
/* Norsk vegadresse (PdlVegadresse.kt)                                  */
/* ------------------------------------------------------------------ */

export function toAdressenavn(s: string | null): string | null {
  if (isBlank(s)) return null;
  const out: string[] = [];
  for (const t of tokens(s)) {
    if (!all(t, isLetter)) break;
    out.push(t);
  }
  return out.join(" ");
}

export function toHusnummer(s: string | null): string | null {
  if (isBlank(s)) return null;
  const lastTwo = tokens(s).slice(-2);
  const last = lastTwo[lastTwo.length - 1];
  if (all(last, isDigit)) return last;
  if (any(last, isDigit)) return chars(last).filter(isDigit).join("") || null;
  const secondLast = lastTwo[0];
  if (all(secondLast, isDigit)) return secondLast;
  return null;
}

export function toHusbokstav(s: string | null): string | null {
  if (isBlank(s)) return null;
  const lastTwo = tokens(s).slice(-2);
  if (lastTwo.length < 2) return null;
  const [secondLast, last] = lastTwo;
  if (any(last, isDigit)) return chars(last).filter(isLetter).join("") || null;
  if (any(secondLast, isDigit)) return chars(secondLast).filter(isLetter).join("") || last;
  return null;
}

export function toTilleggsnavn(s: string | null): string | null {
  if (isBlank(s)) return null;
  return chars(s.trim().replace(/\s+/g, " ")).filter(isLetter).join("") || null;
}

/* ------------------------------------------------------------------ */
/* Simulator                                                           */
/* ------------------------------------------------------------------ */

export type IPdl = "ingen" | "annen" | "lik-utenlandsk" | "lik-norsk";

export const I_PDL: { value: IPdl; label: string }[] = [
  { value: "ingen", label: "Ingen adresse av typen" },
  { value: "annen", label: "En annen adresse" },
  { value: "lik-utenlandsk", label: "Samme adresse, som utenlandsk" },
  { value: "lik-norsk", label: "Samme adresse, som norsk" },
];

export const LANDKODER: { kode: string; land: string }[] = [
  { kode: "SWE", land: "Sverige" },
  { kode: "DNK", land: "Danmark" },
  { kode: "FIN", land: "Finland" },
  { kode: "DEU", land: "Tyskland" },
  { kode: "POL", land: "Polen" },
  { kode: "ESP", land: "Spania" },
  { kode: "NOR", land: "Norge" },
];
export const landnavn = (kode: string | null) => LANDKODER.find((l) => l.kode === kode)?.land;

export interface SimInput {
  adresse: SedAdresse;
  /** Landkoden til første motpart i RINA-saken. Tom streng: ingen motpart. */
  motpart: string;
  doed: boolean;
  iPdl: IPdl;
}

export type StepState = "done" | "warn" | "stop" | "skip";
export type StepId = "sjekk" | "vask" | "doed" | "norsk" | "finnes" | "motpart" | "lag";

export const STEP_TITLE: Record<StepId, string> = {
  sjekk: "Landkode og postnummer",
  vask: "Vask",
  doed: "Lever personen?",
  norsk: "Norsk bostedsadresse?",
  finnes: "Finnes i PDL fra før?",
  motpart: "Samme land som motparten?",
  lag: "Lag endringsmelding",
};

export interface Step {
  id: StepId;
  state: StepState;
  value?: string;
  text: string;
}

export type Outcome = "sendt" | "stopp" | "feil";
export type PdlAdressetype = "UTENLANDSK_ADRESSE" | "VEGADRESSE" | "POSTBOKSADRESSE";
export type Opplysningstype = "KONTAKTADRESSE" | "OPPHOLDSADRESSE" | "BOSTEDSADRESSE";

export interface SimResult {
  steps: Step[];
  vasket: Adresse;
  vaskesteg: Vaskesteg[];
  outcome: Outcome;
  headline: string;
  text: string;
  log: { level: "INFO" | "ERROR"; msg: string };
  opplysningstype?: Opplysningstype;
  adressetype?: PdlAdressetype;
  /** Endringsmeldingen som sendes til PDL-mottak. */
  melding?: Record<string, unknown>;
}

const LABEL: Record<AdresseType, string> = { kontakt: "kontaktadresse", opphold: "oppholdsadresse", bosted: "bostedsadresse" };

const STEP_ORDER: Record<AdresseType, StepId[]> = {
  kontakt: ["sjekk", "vask", "finnes", "lag"],
  opphold: ["sjekk", "vask", "doed", "finnes", "lag"],
  bosted: ["sjekk", "vask", "doed", "norsk", "finnes", "motpart", "lag"],
};

const plusFemAar = (iso: string) => `${Number(iso.slice(0, 4)) + 5}${iso.slice(4)}`;

function melding(type: Opplysningstype, adresse: Record<string, unknown>, kilde: string, today: string, fra: boolean, til: boolean) {
  return {
    personopplysninger: [
      {
        endringsmelding: {
          kilde,
          "@type": type,
          gyldigFraOgMed: fra ? today || "<i dag>" : null,
          gyldigTilOgMed: til ? (today ? plusFemAar(today) : "<om fem år>") : null,
          adresse,
        },
        ident: "<fnr eller dnr>",
        endringstype: "OPPRETT",
        opplysningstype: type,
      },
    ],
  };
}

const utenlandsk = (a: Adresse) => ({
  adressenavnNummer: a.adressenavnNummer,
  bygningEtasjeLeilighet: a.bygningEtasjeLeilighet,
  postboksNummerNavn: a.postboksNummerNavn,
  postkode: a.postkode,
  bySted: a.bySted,
  regionDistriktOmraade: a.regionDistriktOmraade,
  landkode: a.landkode,
  "@type": "UTENLANDSK_ADRESSE",
});

function vegadresse(a: Adresse) {
  const adressenavn = toAdressenavn(a.adressenavnNummer);
  const husnummer = toHusnummer(a.adressenavnNummer);
  if (adressenavn == null || husnummer == null) return null;
  return {
    matrikkelId: null,
    bruksenhetsnummer: null,
    adressenavn,
    husnummer,
    husbokstav: toHusbokstav(a.adressenavnNummer),
    tilleggsnavn: toTilleggsnavn(a.bygningEtasjeLeilighet),
    postnummer: a.postkode,
    "@type": "VEGADRESSE",
  };
}

const postboksadresse = (a: Adresse) =>
  a.postboksNummerNavn == null || a.postkode == null
    ? null
    : { postbokseier: null, postboks: a.postboksNummerNavn, postnummer: a.postkode, "@type": "POSTBOKSADRESSE" };

/** Én adresse gjennom AdresseService.oppdaterPdl og PdlService. */
export function simulate(input: SimInput, today: string): SimResult {
  const { adresse: sed, doed, iPdl } = input;
  const motpart = input.motpart || null;
  const type = sed.type;
  const steps: Step[] = [];
  const raw = tilAdresse(sed);

  const finish = (res: Omit<SimResult, "steps" | "vasket" | "vaskesteg">, vasket: Adresse, vaskesteg: Vaskesteg[]): SimResult => {
    for (const id of STEP_ORDER[type]) if (!steps.some((s) => s.id === id)) steps.push({ id, state: "skip", text: "" });
    return { ...res, steps, vasket, vaskesteg };
  };

  // kanSendesTilPdl: på de rå verdiene, før vasken
  if (isBlank(sed.landkode) || isBlank(sed.postnummer)) {
    const felt = isBlank(sed.landkode) ? "Landkode" : "Postnummer";
    steps.push({ id: "sjekk", state: "stop", value: "mangler", text: `${felt} er tomt i SED-en, så adressen filtreres bort.` });
    return finish(
      {
        outcome: "stopp",
        headline: "Ikke sendt",
        text: "Adressen blir verken vasket, sammenlignet eller sendt.",
        log: { level: "INFO", msg: `${felt} er null, adresse blir ikke sendt til PDL` },
      },
      raw,
      [],
    );
  }
  steps.push({ id: "sjekk", state: "done", text: "Begge har en verdi. Sjekken skjer før vasken, så «ukjent» og «-» slipper gjennom." });

  const { adresse: a, steg } = vask(raw);
  steps.push({
    id: "vask",
    state: steg.length ? "warn" : "done",
    value: steg.length ? `${steg.length} endring${steg.length > 1 ? "er" : ""}` : undefined,
    text: steg.length ? "Endrede felt er markert i adressekortet." : "Ingen felt ble endret.",
  });

  const norsk = a.landkode === "NOR";

  const stopp = (id: StepId, value: string, text: string, log: string, why: string): SimResult => {
    steps.push({ id, state: "stop", value, text });
    return finish({ outcome: "stopp", headline: "Ikke sendt", text: why, log: { level: "INFO", msg: log } }, a, steg);
  };

  if (type !== "kontakt") {
    if (doed)
      return stopp("doed", "død", "PDL har en dødsdato for personen.", `Oppdaterer ikke ${LABEL[type]} for død person`, "Opphold og bosted sendes ikke for døde. Kontaktadresser gjør det.");
    steps.push({ id: "doed", state: "done", text: "PDL har ingen dødsdato." });
  }

  if (type === "bosted") {
    if (norsk) return stopp("norsk", "NOR", "Landkoden er NOR.", "Oppdaterer ikke norsk bostedsadresse", "Norske bostedsadresser sendes aldri herfra.");
    steps.push({ id: "norsk", state: "done", text: "Adressen er utenlandsk." });
  }

  if (iPdl === "lik-utenlandsk") {
    return stopp(
      "finnes",
      "lik",
      "Den første adressen av typen i PDL er utenlandsk, med lik by, gate, postboks og landkode.",
      type === "bosted"
        ? "Bostedsadresse er ikke sendt til PDL, da adresse allerede er registrert"
        : "Kontaktadresse er ikke sendt til PDL, da adresse allerede er registrert",
      "PDL har adressen fra før. Postkode, region og bygning er ikke med i sammenligningen.",
    );
  }
  steps.push({
    id: "finnes",
    state: iPdl === "lik-norsk" ? "warn" : "done",
    value: iPdl === "lik-norsk" ? "sendes likevel" : undefined,
    text: {
      ingen: "PDL har ingen slik adresse.",
      annen: "Den første adressen av typen i PDL er en annen.",
      "lik-norsk": "Bare utenlandske adresser sammenlignes. En norsk adresse regnes alltid som ny.",
    }[iPdl],
  });

  if (type === "bosted") {
    if (!motpart)
      return stopp("motpart", "ingen motpart", "RINA-saken har ingen motpart.", "Bostedsadresse er ikke sendt til PDL, da motpartLandkode er null", "En utenlandsk bostedsadresse sendes bare når motparten er i samme land.");
    if (motpart !== a.landkode)
      return stopp(
        "motpart",
        `${a.landkode} ≠ ${motpart}`,
        `Adressen er i ${landnavn(a.landkode) ?? a.landkode}, motparten i ${landnavn(motpart) ?? motpart}.`,
        "Bostedsadresse er ikke sendt til PDL, da landkode ikke er lik motpartLandkode",
        "En utenlandsk bostedsadresse sendes bare når motparten er i samme land som adressen.",
      );
    steps.push({ id: "motpart", state: "done", value: motpart, text: "Motparten er i samme land som adressen." });
  }

  const kanIkkeMappe = (hva: string, text: string): SimResult => {
    steps.push({ id: "lag", state: "stop", value: "kan ikke mappes", text });
    return finish(
      {
        outcome: "stopp",
        headline: "Ikke sendt",
        text: "Ingen feil, bare en linje i loggen. Resten av SED-en behandles videre.",
        log: { level: "INFO", msg: `Kunne ikke mappe norsk ${LABEL[type]} til ${hva}` },
      },
      a,
      steg,
    );
  };

  const sendt = (opplysningstype: Opplysningstype, adressetype: PdlAdressetype, adr: Record<string, unknown>, fra: boolean, til: boolean, text: string) => {
    steps.push({ id: "lag", state: "done", value: adressetype, text });
    return finish(
      {
        outcome: "sendt",
        headline: "Sendes til PDL",
        text:
          type === "opphold" && opplysningstype === "KONTAKTADRESSE"
            ? "Merk: En norsk oppholdsadresse sendes som KONTAKTADRESSE, uten sluttdato."
            : "Endringsmeldingen postes til PDL-mottak. Etterpå spør tjenesten om status hvert sekund til den er ferdig.",
        log: {
          level: "INFO",
          msg: `Endringsmelding for ${adressetype !== "UTENLANDSK_ADRESSE" ? "norsk " : type === "opphold" ? "utenlandsk " : ""}${LABEL[type]}${adressetype === "POSTBOKSADRESSE" ? " av type postboksadresse" : ""} sendt til PDL`,
        },
        opplysningstype,
        adressetype,
        melding: melding(opplysningstype, adr, motpart ? `<motpartens navn> (${landnavn(motpart) ?? motpart})` : "EESSI (ukjent motpart)", today, fra, til),
      },
      a,
      steg,
    );
  };

  if (type !== "bosted" && norsk && a.adressenavnNummer != null) {
    const v = vegadresse(a);
    if (!v) return kanIkkeMappe("vegadresse", "Fant ikke noe husnummer på slutten av gate-feltet.");
    return sendt("KONTAKTADRESSE", "VEGADRESSE", v, true, type === "kontakt", "Norsk adresse med gate blir vegadresse. Navn, nummer og bokstav leses ut av gate-feltet.");
  }
  if (type !== "bosted" && norsk && a.postboksNummerNavn != null) {
    const p = postboksadresse(a);
    if (!p) return kanIkkeMappe("postboksadresse", "Vasken fjernet postnummeret, og en postboksadresse må ha det.");
    return sendt("KONTAKTADRESSE", "POSTBOKSADRESSE", p, true, type === "kontakt", "Norsk adresse med postboks blir postboksadresse.");
  }

  if (a.postkode == null) {
    steps.push({ id: "lag", state: "stop", value: "IllegalArgumentException", text: "En utenlandsk adresse må ha postkode, og vasken fjernet den." });
    return finish(
      {
        outcome: "feil",
        headline: "Hele SED-en feiler",
        text: "Feilen fanges ikke. SED-en prøves tre ganger med 15 sekunders mellomrom og havner så på DLT. Adresser som står senere i SED-en, blir ikke behandlet.",
        log: { level: "ERROR", msg: "Feil ved behandling av dokument · Kan ikke opprette utenlandsk adresse uten postkode" },
      },
      a,
      steg,
    );
  }
  const opplysningstype: Opplysningstype = type === "kontakt" ? "KONTAKTADRESSE" : type === "opphold" ? "OPPHOLDSADRESSE" : "BOSTEDSADRESSE";
  return sendt(
    opplysningstype,
    "UTENLANDSK_ADRESSE",
    utenlandsk(a),
    type === "kontakt",
    type === "kontakt",
    norsk ? "Uten gate og postboks blir også en norsk adresse sendt som utenlandsk, med landkode NOR." : "Feltene sendes slik de er etter vasken.",
  );
}

/* ------------------------------------------------------------------ */
/* Eksempler                                                           */
/* ------------------------------------------------------------------ */

const adr = (type: AdresseType, gate: string, bygning: string, by: string, postnummer: string, region: string, landkode: string): SedAdresse => ({
  type,
  gate: gate || null,
  bygning: bygning || null,
  by: by || null,
  postnummer: postnummer || null,
  region: region || null,
  landkode: landkode || null,
});

export const PRESETS: { id: string; label: string; input: SimInput }[] = [
  {
    id: "svensk",
    label: "Svensk kontaktadresse",
    input: { adresse: adr("kontakt", "Storgatan 12", "lgh 1102", "Malmö", "211 34", "Skåne", "SWE"), motpart: "SWE", doed: false, iPdl: "annen" },
  },
  {
    id: "ukendt",
    label: "Felt med «ukendt»",
    input: { adresse: adr("opphold", "Nørregade 7", "-", "København K", "1165", "ukendt", "DNK"), motpart: "DNK", doed: false, iPdl: "ingen" },
  },
  {
    id: "vegadresse",
    label: "Norsk vegadresse",
    input: { adresse: adr("kontakt", "Storgata 5 B", "H0201", "Oslo", "0155", "", "NOR"), motpart: "SWE", doed: false, iPdl: "ingen" },
  },
  {
    id: "postboks",
    label: "Norsk postboks",
    input: { adresse: adr("kontakt", "Postboks 5 Sentrum", "", "Oslo", "0101", "", "NOR"), motpart: "DNK", doed: false, iPdl: "ingen" },
  },
  {
    id: "opphold-norge",
    label: "Norsk oppholdsadresse",
    input: { adresse: adr("opphold", "Kirkegata 3", "", "Bergen", "5003", "", "NOR"), motpart: "POL", doed: false, iPdl: "lik-norsk" },
  },
  {
    id: "pb",
    label: "«pb» midt i gatenavnet",
    input: { adresse: adr("kontakt", "Lappbyvägen 3", "", "Lappfjärd", "64300", "", "FIN"), motpart: "FIN", doed: false, iPdl: "ingen" },
  },
  {
    id: "bosted-motpart",
    label: "Bosted i et annet land",
    input: { adresse: adr("bosted", "Calle Mayor 4", "", "Madrid", "28013", "", "ESP"), motpart: "SWE", doed: false, iPdl: "ingen" },
  },
  {
    id: "unknown",
    label: "Postnummer «unknown»",
    input: { adresse: adr("kontakt", "Hauptstraße 1", "", "Berlin", "unknown", "", "DEU"), motpart: "DEU", doed: false, iPdl: "ingen" },
  },
];

export const DEFAULT_INPUT = PRESETS[0].input;

export const sameInput = (a: SimInput, b: SimInput) => JSON.stringify(a) === JSON.stringify(b);

/* ------------------------------------------------------------------ */
/* Samme person? (FinnIdent.kt)                                         */
/* ------------------------------------------------------------------ */

export type EditOp = { op: "match" | "sub" | "ins" | "del"; a?: string; b?: string };

/** Levenshtein-avstand, med én billigste vei for å vise endringene. */
export function levenshtein(a: string, b: string): { distance: number; ops: EditOp[] } {
  const A = chars(a);
  const B = chars(b);
  const d: number[][] = Array.from({ length: A.length + 1 }, (_, i) =>
    Array.from({ length: B.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= A.length; i++)
    for (let j = 1; j <= B.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (A[i - 1] === B[j - 1] ? 0 : 1));
  const ops: EditOp[] = [];
  let i = A.length;
  let j = B.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (A[i - 1] === B[j - 1] ? 0 : 1)) {
      ops.unshift({ op: A[i - 1] === B[j - 1] ? "match" : "sub", a: A[i - 1], b: B[j - 1] });
      i--;
      j--;
    } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
      ops.unshift({ op: "del", a: A[i - 1] });
      i--;
    } else {
      ops.unshift({ op: "ins", b: B[j - 1] });
      j--;
    }
  }
  return { distance: d[A.length][B.length], ops };
}

export interface Person {
  fornavn: string;
  etternavn: string;
  foedselsdato: string;
}

export interface MatchInput {
  norPin: boolean;
  sed: Person;
  sak: Person;
}

export type MatchCheckId = "pin" | "dato" | "etternavn" | "fornavn";
export type MatchCheck = { id: MatchCheckId; ok: boolean | null; distance?: number; ops?: EditOp[] };

/** identNor() og sammePerson(): sjekkene i samme rekkefølge som i koden. */
export function samePerson(input: MatchInput): { checks: MatchCheck[]; ident: "pin" | "sak" | null } {
  if (input.norPin)
    return {
      checks: [{ id: "pin", ok: true }, { id: "dato", ok: null }, { id: "etternavn", ok: null }, { id: "fornavn", ok: null }],
      ident: "pin",
    };
  const checks: MatchCheck[] = [{ id: "pin", ok: false }];
  let ok = input.sed.foedselsdato === input.sak.foedselsdato;
  checks.push({ id: "dato", ok });
  for (const id of ["etternavn", "fornavn"] as const) {
    if (!ok) {
      checks.push({ id, ok: null });
      continue;
    }
    const a = input.sed[id];
    const b = input.sak[id];
    const l = levenshtein(a.toLowerCase(), b.toLowerCase());
    ok = l.distance <= 2;
    checks.push({ id, ok, distance: l.distance, ops: l.ops });
  }
  return { checks, ident: ok ? "sak" : null };
}

export const MATCH_PRESETS: { id: string; label: string; input: MatchInput }[] = [
  {
    id: "skrivefeil",
    label: "Ombyttede bokstaver",
    input: {
      norPin: false,
      sed: { fornavn: "Jonh", etternavn: "Hansen", foedselsdato: "1953-10-25" },
      sak: { fornavn: "John", etternavn: "Hansen", foedselsdato: "1953-10-25" },
    },
  },
  {
    id: "aa",
    label: "Aa, å, o og ø",
    input: {
      norPin: false,
      sed: { fornavn: "Soren", etternavn: "Aasen", foedselsdato: "1980-02-14" },
      sak: { fornavn: "Søren", etternavn: "Åsen", foedselsdato: "1980-02-14" },
    },
  },
  {
    id: "dobbelt",
    label: "Dobbelt etternavn",
    input: {
      norPin: false,
      sed: { fornavn: "Kari", etternavn: "Nordmann Berg", foedselsdato: "1975-06-01" },
      sak: { fornavn: "Kari", etternavn: "Nordmann", foedselsdato: "1975-06-01" },
    },
  },
  {
    id: "dato",
    label: "Dag og måned byttet om",
    input: {
      norPin: false,
      sed: { fornavn: "Ola", etternavn: "Nordmann", foedselsdato: "1990-01-12" },
      sak: { fornavn: "Ola", etternavn: "Nordmann", foedselsdato: "1990-12-01" },
    },
  },
  {
    id: "pin",
    label: "Norsk PIN i SED-en",
    input: {
      norPin: true,
      sed: { fornavn: "Ola", etternavn: "Nordmann", foedselsdato: "1990-01-12" },
      sak: { fornavn: "Ola", etternavn: "Nordmann", foedselsdato: "1990-01-12" },
    },
  },
];

/* ------------------------------------------------------------------ */
/* Kafka og miljøer                                                     */
/* ------------------------------------------------------------------ */

export const ENVS: { env: "prod" | "q2"; cluster: string; app: string; topic: string }[] = [
  { env: "prod", cluster: "prod-gcp", app: "eux-adresse-oppdatering", topic: "eessibasis.eux-rina-document-events-v1" },
  { env: "q2", cluster: "dev-gcp", app: "eux-adresse-oppdatering-q2", topic: "eessibasis.eux-rina-document-events-v1-q2" },
];

export const CONSUMER_GROUP = "eux-adresse-oppdatering-document";
