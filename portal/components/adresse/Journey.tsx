"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { BodyLong, Detail, Heading } from "@navikt/ds-react";
import { CheckmarkIcon, XMarkIcon } from "@navikt/aksel-icons";
import { useMediaQuery } from "@/components/architecture/hooks";
import { SEKTORER, UNNTAK_SED, type Tone } from "./data";

/** Below this width the sticky stage is hidden and each scene sits under its step (see `.adr-journey` in globals.css). */
const NARROW = "(max-width: 1000px)";

type StationId = "rina" | "kafka" | "app" | "rinaapi" | "pdl";

const STATIONS: { id: StationId; label: string; tone: Tone }[] = [
  { id: "rina", label: "RINA", tone: "meta-purple" },
  { id: "kafka", label: "Kafka", tone: "info" },
  { id: "app", label: "eux-adresse-oppdatering", tone: "accent" },
  { id: "rinaapi", label: "eux-rina-api", tone: "meta-purple" },
  { id: "pdl", label: "PDL", tone: "success" },
];

const C = ({ children }: { children: ReactNode }) => <code>{children}</code>;

const Ok = () => <CheckmarkIcon aria-hidden className="adr-ok" />;
const No = () => <XMarkIcon aria-hidden className="adr-no" />;

/* ---------- Scener ---------- */

function SceneMessage() {
  return (
    <div className="adr-scene__card adr-code" data-tone="info">
      <div className="adr-scene__label">eessibasis.eux-rina-document-events-v1</div>
      <pre>
        {`{
  "documentEventType": "…",
  "buc": "H_BUC_01",
  "payLoad": {
    "DOCUMENT_METADATA": {
      "id": "…",
      "type": "H001",
      "caseId": 1234567,
      "direction": "IN",
      …
    }
  }
}`}
      </pre>
    </div>
  );
}

function SceneFilter() {
  const sektorer: [string, boolean][] = [
    ...SEKTORER.map((s): [string, boolean] => [s.id, true]),
    ["P", false],
    ["LA", false],
    ["AW", false],
  ];
  return (
    <div className="adr-scene__stack">
      <div className="adr-gate" style={{ "--i": 0 } as CSSProperties}>
        <span className="adr-gate__q">Retning</span>
        <span className="adr-pill" data-tone="success">
          IN <Ok />
        </span>
        <span className="adr-pill" data-tone="neutral">
          OUT <No />
        </span>
      </div>
      <div className="adr-gate" style={{ "--i": 1 } as CSSProperties}>
        <span className="adr-gate__q">Sektor</span>
        {sektorer.map(([s, ok]) => (
          <span key={s} className="adr-pill" data-tone={ok ? "success" : "neutral"}>
            {s} {ok ? <Ok /> : <No />}
          </span>
        ))}
      </div>
      <div className="adr-gate" style={{ "--i": 2 } as CSSProperties}>
        <span className="adr-gate__q">Unntak</span>
        {["UB_BUC_04", ...UNNTAK_SED.map((u) => u.sed)].map((s) => (
          <span key={s} className="adr-pill" data-tone="neutral">
            {s} <No />
          </span>
        ))}
      </div>
    </div>
  );
}

function SceneFetch() {
  return (
    <div className="adr-scene__stack">
      {[
        { path: "/cpi/buc/{rinasakId}/sed/{sedId}", gives: ["personer", "PIN-er", "adresser"] },
        { path: "/v3/buc/{rinasakId}/oversikt", gives: ["fnr", "navn", "fødselsdato", "sakType", "motparter"] },
      ].map((r, i) => (
        <div key={r.path} className="adr-req" style={{ "--i": i } as CSSProperties}>
          <div className="adr-req__line">
            <span className="adr-verb">GET</span>
            <span className="arch-mono">{r.path}</span>
          </div>
          <div className="adr-req__gives">
            {r.gives.map((g) => (
              <span key={g} className="adr-tag">
                {g}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SceneIdent() {
  const rows: { k: string; a: string; b: string; note: string }[] = [
    { k: "Født", a: "1953-10-25", b: "1953-10-25", note: "lik" },
    { k: "Etternavn", a: "Hansen", b: "Hansen", note: "0 endringer" },
    { k: "Fornavn", a: "Jonh", b: "John", note: "2 endringer" },
  ];
  return (
    <div className="adr-scene__stack">
      <div className="adr-gate">
        <span className="adr-gate__q">PIN med landkode NOR</span>
        <span className="adr-pill" data-tone="neutral">
          mangler <No />
        </span>
      </div>
      <div className="adr-compare">
        <span className="adr-compare__h">SED-en</span>
        <span />
        <span className="adr-compare__h">RINA-saken</span>
        {rows.map((r, i) => (
          <div key={r.k} className="adr-compare__row" style={{ "--i": i } as CSSProperties}>
            <span className="adr-compare__k">{r.k}</span>
            <span className="arch-mono">{r.a}</span>
            <span className="adr-compare__eq">
              <Ok />
              <small>{r.note}</small>
            </span>
            <span className="arch-mono">{r.b}</span>
          </div>
        ))}
      </div>
      <div className="adr-arrowline">
        fnr fra RINA-saken brukes
      </div>
    </div>
  );
}

function ScenePick() {
  const paths: { who: string; path: string; note?: string }[] = [
    { who: "Bruker", path: "nav.bruker.adresse[]", note: "F-SED fra v4.4: nav.bruker.person.adresser[]" },
    { who: "Bruker", path: "horisontal.anmodningominformasjon.fastslaabosted.bruker.adresse[]" },
    { who: "Bruker", path: "nav.bruker.bostedsadresse", note: "bare S048 og S055" },
    { who: "Ektefelle", path: "nav.ektefelle.adresse[]" },
    { who: "Annen person", path: "nav.annenperson.adresse[]" },
  ];
  return (
    <div className="adr-scene__stack">
      <ul className="adr-tree">
        {paths.map((p, i) => (
          <li key={p.path} style={{ "--i": i } as CSSProperties}>
            <span className="adr-tag">{p.who}</span>
            <span className="arch-mono">{p.path}</span>
            {p.note && <small>{p.note}</small>}
          </li>
        ))}
      </ul>
      <div className="adr-arrowline">landkode og postnummer må ha en verdi</div>
    </div>
  );
}

function SceneVask() {
  const rows: { k: string; from: string; to: string | null; why: string }[] = [
    { k: "gate", from: "Nørregade 7", to: "Nørregade 7 -", why: "får bygning-feltet" },
    { k: "bygning", from: "-", to: null, why: "bare tegn" },
    { k: "by", from: "København K", to: "København K", why: "" },
    { k: "region", from: "ukendt", to: null, why: "betyr «ukjent»" },
  ];
  return (
    <div className="adr-scene__card adr-envelope">
      <div className="adr-scene__label">Oppholdsadresse fra Danmark</div>
      <dl className="adr-vask">
        {rows.map((r, i) => (
          <div key={r.k} style={{ "--i": i } as CSSProperties} data-changed={r.from !== r.to || undefined}>
            <dt>{r.k}</dt>
            <dd>
              {r.from !== r.to && <s>{r.from}</s>}
              {r.to == null ? <em>null</em> : <span>{r.to}</span>}
              {r.why && <small>{r.why}</small>}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function SceneCheck() {
  return (
    <div className="adr-scene__stack">
      <div className="adr-scene__card adr-code" data-tone="success">
        <div className="adr-scene__label">pdl-api · Behandlingsnummer for H: B139,B271,B284,B286,B287,B299</div>
        <pre>{`hentPerson(ident: $ident) {
  bostedsadresse   { … }
  oppholdsadresse  { … }
  kontaktadresse   { … }
  doedsfall        { doedsdato }
}`}</pre>
      </div>
      <ul className="adr-checks">
        <li style={{ "--i": 0 } as CSSProperties}>
          <Ok /> Lever personen?
        </li>
        <li style={{ "--i": 1 } as CSSProperties}>
          <Ok /> Står adressen der fra før?
        </li>
        <li style={{ "--i": 2 } as CSSProperties}>
          <Ok /> Bosted: samme land som motparten?
        </li>
      </ul>
    </div>
  );
}

function SceneSend() {
  return (
    <div className="adr-scene__stack">
      <div className="adr-req">
        <div className="adr-req__line">
          <span className="adr-verb" data-verb="post">
            POST
          </span>
          <span className="arch-mono">/api/v1/endringer</span>
        </div>
        <div className="adr-req__gives">
          <span className="adr-tag">OPPRETT</span>
          <span className="adr-tag">KONTAKTADRESSE</span>
          <span className="adr-tag">UTENLANDSK_ADRESSE</span>
        </div>
      </div>
      <div className="adr-req">
        <div className="adr-req__line">
          <span className="adr-verb">GET</span>
          <span className="arch-mono">Location</span>
          <span className="arch-subtle">hvert sekund</span>
        </div>
        <ol className="adr-poll" aria-label="Statuser">
          {["PENDING", "PENDING", "PENDING", "DONE"].map((s, i) => (
            <li key={i} data-status={s} style={{ "--i": i } as CSSProperties}>
              {s}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/* ---------- Stegene ---------- */

interface JourneyStep {
  id: string;
  station: StationId;
  eyebrow: string;
  title: string;
  body: ReactNode;
  scene: ReactNode;
}

const STEPS: JourneyStep[] = [
  {
    id: "hendelse",
    station: "kafka",
    eyebrow: "RINA → Kafka",
    title: "En SED kommer inn",
    body: (
      <>
        Et annet land sender en SED i en RINA-sak. RINA varsler eux-all-rina-events, som legger en dokumenthendelse på{" "}
        <C>eessibasis.eux-rina-document-events-v1</C>. Lytteren bruker bare metadataene: sak, SED-type, BUC og retning.
      </>
    ),
    scene: <SceneMessage />,
  },
  {
    id: "filter",
    station: "app",
    eyebrow: "Filter",
    title: "Gjelder den oss?",
    body: (
      <>
        Bare innkommende SED-er i sektorene H, UB, FB og S blir behandlet. UB_BUC_04, H020, U020 og U020_Master hoppes over.
        Alt annet blir kvittert ut uten at noe skjer.
      </>
    ),
    scene: <SceneFilter />,
  },
  {
    id: "hent",
    station: "rinaapi",
    eyebrow: "eux-rina-api",
    title: "SED og sak hentes",
    body: (
      <>
        Innholdet hentes fra RINA gjennom eux-rina-api: SED-en med personene og adressene, og en oversikt over saken med
        brukerens fødselsnummer og motparten.
      </>
    ),
    scene: <SceneFetch />,
  },
  {
    id: "ident",
    station: "app",
    eyebrow: "Ident",
    title: "Hvem gjelder det?",
    body: (
      <>
        Har brukeren en norsk PIN i SED-en, brukes den. Ellers lånes fødselsnummeret fra RINA-saken, men bare hvis
        fødselsdatoen er lik og navnene er nesten like. Ektefelle og annen person må ha egen norsk PIN.
      </>
    ),
    scene: <SceneIdent />,
  },
  {
    id: "plukk",
    station: "app",
    eyebrow: "Adresser",
    title: "Adressene plukkes ut",
    body: (
      <>
        Adressene leses fra faste steder i SED-en, for opptil tre personer. Hver adresse har en type: kontakt, opphold eller
        bosted. En adresse uten landkode eller postnummer blir lagt til side med en gang.
      </>
    ),
    scene: <ScenePick />,
  },
  {
    id: "vask",
    station: "app",
    eyebrow: "Vask",
    title: "Adressen vaskes",
    body: (
      <>
        Felt som betyr «ukjent» på norsk, engelsk, svensk eller dansk blir fjernet. Det samme gjør felt som bare består av tegn,
        og en gate uten bokstaver. Står det postboks i gaten, flyttes den til postboksfeltet.
      </>
    ),
    scene: <SceneVask />,
  },
  {
    id: "pdl",
    station: "pdl",
    eyebrow: "PDL",
    title: "Sjekk mot PDL",
    body: (
      <>
        Adressene personen har i PDL hentes med et behandlingsnummer som passer sektoren. Er adressen registrert fra før, eller
        er personen død, stopper det her. En bostedsadresse må i tillegg være i samme land som motparten.
      </>
    ),
    scene: <SceneCheck />,
  },
  {
    id: "send",
    station: "pdl",
    eyebrow: "PDL-mottak",
    title: "Endringsmelding",
    body: (
      <>
        Adressen sendes som en endringsmelding til PDL-mottak. Svaret peker på en status, som tjenesten spør etter hvert
        sekund, i opptil ett minutt, til PDL har behandlet den.
      </>
    ),
    scene: <SceneSend />,
  },
];

export function Journey() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLLIElement | null)[]>([]);
  // Until hydration both layouts are rendered and CSS picks one; after that only the visible one.
  const narrow = useMediaQuery(NARROW);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const mid = window.innerHeight / 2;
      let next = 0;
      refs.current.forEach((el, i) => {
        if (el && el.getBoundingClientRect().top <= mid) next = i;
      });
      setActive(next);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const step = STEPS[active];
  const stationIndex = STATIONS.findIndex((s) => s.id === step.station);

  return (
    <div className="adr-journey" style={{ "--adr-step": active, "--adr-station": stationIndex } as CSSProperties}>
      <ol className="adr-journey__steps">
        {STEPS.map((s, i) => (
          <li
            key={s.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className="adr-step"
            data-active={i === active || undefined}
          >
            <div className="adr-step__text">
              <span className="adr-step__no" aria-hidden>
                {i + 1}
              </span>
              <Detail className="arch-eyebrow">{s.eyebrow}</Detail>
              <Heading level="3" size="small" spacing>
                {s.title}
              </Heading>
              <BodyLong size="small">{s.body}</BodyLong>
            </div>
            {narrow !== false && <div className="adr-step__scene">{s.scene}</div>}
          </li>
        ))}
      </ol>

      <div className="adr-journey__stage" aria-hidden>
        <div className="adr-stage__bg" />
        <ol className="adr-stations">
          {STATIONS.map((s, i) => (
            <li key={s.id} data-tone={s.tone} data-on={i === stationIndex || undefined} data-past={i < stationIndex || undefined}>
              <span className="adr-stations__dot" />
              <span className="adr-stations__label">{s.label}</span>
            </li>
          ))}
          <li className="adr-stations__token" />
        </ol>
        <div className="adr-scenes">
          {narrow !== true &&
            STEPS.map((s, i) => (
              <div key={s.id} className="adr-scene" data-active={i === active || undefined}>
                {s.scene}
              </div>
            ))}
        </div>
        <div className="adr-stage__foot">
          <span className="arch-mono">
            {String(active + 1).padStart(2, "0")} / {String(STEPS.length).padStart(2, "0")}
          </span>
          <span className="adr-stage__bar">
            <span />
          </span>
          <span>{step.title}</span>
        </div>
      </div>
    </div>
  );
}
