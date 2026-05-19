# Fødselsnummer på Kafka-topic i nEESSI/EUX

Analyse av om det er forsvarlig å fortsette å sende fødselsnummer (fnr/dnr)
på Kafka-topics i eessibasis-domenet, og hva som må være på plass før vi
eventuelt utvider mønsteret til flere topics.

> Dette er et internt arbeidsdokument for team eessibasis. Det er **ikke**
> paste-klar portaltekst. Bruk det som grunnlag for samtale med
> personvernombud, sikkerhetsarkitekt og platform-teamet, og som vedlegg
> til en eventuell oppdatering av PVK v1.3.

---

## 1. Hva vi gjør i dag

### Topics som inneholder fnr

To topics i pool `nav-prod`, namespace `eessibasis`:

- `eessibasis.sedmottatt-v1`
- `eessibasis.sedsendt-v1`

Topic-navn og pool er bekreftet i
[`eux-fagmodul-journalfoering/.nais/prod.yaml`](https://github.com/navikt/eux-fagmodul-journalfoering/blob/main/.nais/prod.yaml).

Begge produseres av Nav sin RINA→Kafka-bro
([`navikt/eux-all-rina-events`](https://github.com/navikt/eux-all-rina-events) /
[`navikt/eux-legacy-rina-events`](https://github.com/navikt/eux-legacy-rina-events))
hver gang en SED sendes til eller mottas fra et EU/EØS-land.

### Meldingsformatet

Meldingen `SedHendelse`
([`SedHendelse.java`](https://github.com/navikt/eux-fagmodul-journalfoering/blob/main/src/main/java/no/nav/eux/fagmodul/api/kafka/SedHendelse.java))
har feltet `navBruker`, som settes til søkers fødsels-/D-nummer i klartekst:

```java
public class SedHendelse {
    private long id;
    private String sedId;
    private String sektorKode;
    private String bucType;
    private String rinaSakId;
    private String avsenderId;
    private String avsenderNavn;
    private String avsenderLand;
    private String mottakerId;
    private String mottakerNavn;
    private String mottakerLand;
    private String rinaDokumentId;
    private String rinaDokumentVersjon;
    private String sedType;
    private String navBruker;        // ← fnr/dnr i klartekst

    public void validateAndUpdateNavBruker() {
        if (this.navBruker != null) {
            this.navBruker = this.navBruker.trim().replaceAll("[^0-9]", "");
        }
    }
}
```

Feltet er fnr/dnr — bekreftet av at det normaliseres til kun siffer før
bruk.

### Hvorfor feltet er der

[`eux-fagmodul-journalfoering`](https://github.com/navikt/eux-fagmodul-journalfoering)
lytter på begge topics
([`SedSendtKafkaConsumer.java`](https://github.com/navikt/eux-fagmodul-journalfoering/blob/main/src/main/java/no/nav/eux/fagmodul/api/kafka/SedSendtKafkaConsumer.java))
og bruker fnr til å:

1. slå opp aktørId i PDL,
2. finne korrekt fagsak i Arena/Infotrygd,
3. journalføre SED-en på riktig person og opprette oppgave.

Uten en personidentifikator i meldingen ville konsumenten måtte slå opp
SED-en i RINA via CPI for hver hendelse. Det er funksjonelt mulig, men
flytter belastningen og krever fortsatt at konsumenten henter ut fnr i
neste steg.

### Tilgang og transport

- Topicene ligger i namespace `eessibasis`. ACL settes via NAIS
  `Topic`-ressurser — kun apper som er eksplisitt allowlistet kan
  produsere/konsumere.
- All Kafka-trafikk i Aiven (NAIS sin Kafka) er TLS-kryptert end-to-end
  med klientsertifikater.
- Konsumenter er per i dag (verifiseres):
  [`eux-fagmodul-journalfoering`](https://github.com/navikt/eux-fagmodul-journalfoering),
  [`eux-journalfoering`](https://github.com/navikt/eux-journalfoering),
  sannsynligvis
  [`eux-journalarkivar`](https://github.com/navikt/eux-journalarkivar)
  og noen hjelpe-tjenester i eessibasis.

---

## 2. Hva PVK v1.3 sier (og ikke sier)

PVK-en for Familieområdet i EESSI
(`etterlevelse/pvk/EESSI - PVKV Familieområdet v1.3REV_NAIS.html`) nevner
ikke ordet "Kafka", "topic" eller "meldingskø". Den ble sist revidert
15.08.23 i forbindelse med flytting til NAIS/GCP, men beskriver Kafka kun
implisitt gjennom mikrotjenestearkitekturen.

PVK-prinsippene som likevel dekker Kafka som transportlag:

- **Tilgangsstyring nær datakilden.** "Tilgangskontroll og datafiltrering
  håndheves nær datakilden med bruk av attributtbasert tilgangskontroll
  (ABAC)" og "identitets- og tilgangskontroll for alle endepunkter".
- **Kryptering i transitt.** "Personopplysningene er krypterte til de
  forlater aksesspunktet."
- **Logging.** "Personopplysninger er planlagt fjernet fra
  driftsloggene." Personinformasjon skal filtreres ut av applikasjons-
  og driftslogger.
- **Risikobildet.** Hovedrisikoen i EESSI-PVK-en er *uberettigede oppslag*
  (snoking) av saksbehandlere som har lovlig RINA-tilgang. Transport
  mellom interne tjenester er ikke et identifisert risikoscenario.

**Konklusjon:** Prinsippene i PVK-en *dekker* dagens praksis, men PVK-en
adresserer ikke Kafka eksplisitt. Det er et hull som bør tettes før vi
utvider mønsteret eller før eksterne (revisorer, personvernombud) ser
nærmere på løsningen.

---

## 3. Praksis ellers i Nav

Fnr på interne Kafka-topics er **utbredt og veletablert i Nav** — ikke et
særtilfelle for eessibasis. Aiven Kafka i NAIS er eksplisitt designet av
plattform-/`@nais`-teamet til å bære personopplysninger inkludert fnr,
og dokumentert på
[docs.nais.io/persistence/kafka/](https://docs.nais.io/persistence/kafka/).

### Verifiserte eksempler

#### PDL — `pdl.leesah-v1`

Den kanoniske personhendelse-strømmen i Nav. Avro-skjemaet
`Personhendelse` har feltet `array<string> personidenter`, som inneholder
fnr/dnr/aktørId for personen hendelsen gjelder.

- Skjemadefinisjon (mirror i VTP):
  [`navikt/vtp – Personhendelse.avdl`](https://github.com/navikt/vtp/blob/master/server/src/main/resources/avro/leesah/Personhendelse.avdl)
- Eier: [`navikt/pdl`](https://github.com/navikt/pdl)
- Topic-navnet `pdl.leesah-v1` er referert i over 30 produksjonsrepoer på
  tvers av Nav (verifisert via
  [`org:navikt "pdl.leesah-v1"`-søk](https://github.com/search?q=org%3Anavikt+%22pdl.leesah-v1%22&type=code)),
  blant annet:
  - [`navikt/pensjon-etterlatte-saksbehandling`](https://github.com/navikt/pensjon-etterlatte-saksbehandling)
  - [`navikt/familie-baks-mottak`](https://github.com/navikt/familie-baks-mottak)
  - [`navikt/familie-ef-personhendelse`](https://github.com/navikt/familie-ef-personhendelse)
  - [`navikt/dp-saksbehandling`](https://github.com/navikt/dp-saksbehandling)
  - [`navikt/sokos-skattekort`](https://github.com/navikt/sokos-skattekort)
  - [`navikt/amt-person-service`](https://github.com/navikt/amt-person-service)
  - [`navikt/pensjon-opptjening-hendelse-pdl`](https://github.com/navikt/pensjon-opptjening-hendelse-pdl)
  - [`navikt/oebs-pdlhendelser`](https://github.com/navikt/oebs-pdlhendelser)
  - [`navikt/hm-personhendelse`](https://github.com/navikt/hm-personhendelse)

Dette er den klareste presedensen vi har: en sentral Nav-eid topic som
distribuerer fnr i payload til mange titalls konsumenter på tvers av
domener.

#### Arbeidssøkerregisteret (PAW)

[`navikt/paw-arbeidssoekerregisteret-monorepo-intern`](https://github.com/navikt/paw-arbeidssoekerregisteret-monorepo-intern)
har `Identitetsnummer.kt` som førsteklasses domeneobjekt
([`domain/felles/src/main/kotlin/no/nav/paw/felles/model/Identitetsnummer.kt`](https://github.com/navikt/paw-arbeidssoekerregisteret-monorepo-intern/blob/main/domain/felles/src/main/kotlin/no/nav/paw/felles/model/Identitetsnummer.kt))
og topicen `paw.arbeidssoker-hendelseslogg-v1` brukes som
hendelsesstrøm. Identifikasjonsnummer er bærende felt i hendelsene.

### Nav-rettesnoren slik den brukes i praksis

På tvers av disse eksemplene er det samme mønsteret som går igjen:

1. **fnr i payload, ikke i Kafka-key.** Keys er synlige i flere
   operasjonelle verktøy (Kafka UI, Aiven console, mirror-makers,
   reaktorer for replay) og bør være en funksjonell nøkkel som
   `rinaSakId`/`rinaDokumentId`/`aktørId-hash` — ikke direkte
   identifiserende. PDL bruker f.eks. `aktørId` som key på leesah; PAW
   bruker arbeidssøker-id.
2. **ACL-styrt topic.** Allowlist via `Topic`-ressurs i NAIS; ingen
   "open" topics i Nav-tenant.
3. **TLS i transitt** (default i Aiven).
4. **Ingen logging av meldingsverdier** som inneholder fnr (gjelder
   applikasjonslogg, Slack-varsler, MDC).
5. **Funksjonelt begrunnet retention.** Compaction med fnr i key er en
   antipattern; tidsbasert retention med kort/funksjonelt vindu er
   foretrukket.
6. **Ny konsument utenfor team-namespace = utlevering.** Når et nytt
   team skal subscribe, behandles det som en utlevering av
   personopplysninger og skal gjennom personvernombud — uavhengig av at
   transporten teknisk sett er Kafka.

For eessibasis følger vi pkt. 2 og 3 i dag, og i hovedsak pkt. 6 (alle
konsumenter er internt i eessibasis så vidt vi vet). Pkt. 1, 4 og 5 må
verifiseres per topic.

---

## 4. Risikobildet for eessibasis-topicene

| Risiko | Status i dag | Kommentar |
|---|---|---|
| Avlytting i transitt | Lav | mTLS i Aiven Kafka. |
| Uautorisert konsument fra annet team | Lav | NAIS Topic-ACL begrenser til allowlist. Bør verifiseres at listen er minimal. |
| fnr i Kafka-key | **Ukjent — må verifiseres** | Konsument-koden bruker `ConsumerRecord<String, SedHendelse>`. Hva produsent setter som key i `eux-all-rina-events` er ikke verifisert. |
| fnr i applikasjons- eller driftslogger | **Ukjent — må verifiseres** | `MdcLogger.initialize(consumerRecord)` kan i ytterste fall logge `navBruker` til MDC. Trenger gjennomgang. |
| fnr i Slack-varsler | **Reell risiko** | `SedSendtKafkaConsumer` poster `sedHendelse` til Slack ved feil. Hvis hele objektet serialiseres ender fnr i Slack-historikk. Bør strippes/redigeres før posting. |
| Lang retention med fnr | Ukjent | Topic-konfigurasjon (retention.ms / cleanup.policy) bør sjekkes. |
| Bredere konsumentkrets i fremtiden (datavarehus, analyse) | Ikke aktivt, men en fallgruve | Skal håndteres som utlevering om/når det kommer. |

---

## 5. Konsekvens for fortsatt bruk og eventuell utvidelse

### Fortsatt bruk av eksisterende topics

Det er **ingen prinsipiell sperre** mot å fortsette å sende fnr på
`eessibasis.sedsendt-v1` og `eessibasis.sedmottatt-v1`. Praksisen er i
tråd med Nav-mønsteret — særlig PDL leesah er en åpenbar presedens — og
fjerning av fnr ville flyttet kompleksiteten til et ekstra CPI-oppslag
uten reell personvernsgevinst.

Men før vi kan kalle dette "godkjent for videre drift" bør vi rydde de
fem punktene under § 4 — særlig Slack-varsel-saken, som er en konkret
utglidning av personopplysninger ut av Kafka-laget vi har under
kontroll.

### Nye topics med fnr

Greenlight, men hver ny topic bør behandles som en egen liten
dataminimerings-vurdering:

1. **Trenger konsumenten faktisk fnr**, eller holder `rinaSakId` +
   oppslag i nEESSI? Hvis sistnevnte holder, bruk det.
2. **Hvis fnr må med:** følg de seks Nav-rettesnorene i § 3.
3. **Konsumentkrets:** kun apper i eessibasis, eller kun apper i
   tydelig avgrensede partner-team. Bredere krets utløser
   utleverings-vurdering.
4. **Retention:** sett funksjonelt begrunnet retention. Default kort
   (timer/døgn) hvis det er rene "fire-and-forget"-hendelser; lengre
   bare hvis reprosessering krever det.
5. **Dokumenter i PVK.** Når vi først tar denne runden bør PVK v1.4
   inneholde et avsnitt som beskriver Kafka-mønsteret én gang for alle —
   da slipper vi denne diskusjonen for hver nye topic.

### Pseudonymisering for analyse-/dataplattform-bruk

Hvis fremtidig behov er statistikk eller analyse (BigQuery, Spark,
datavarehus), er en parallell, fnr-fri topic (kun aktørId eller hash)
sterkt foretrukket fremfor å åpne `eessibasis.sed*-v1`-topicene.
Mønsteret er kjent — flere team i Nav publiserer "domain-event-topic"
for konsumenter i eget namespace og en "analytics-topic" for
dataplattform.

---

## 6. Anbefalte oppfølgingspunkter

Ført opp i [`etterlevelse/apne-sporsmal.md`](../apne-sporsmal.md) (under
K267.1 – sikkerhetsoppfølging) som ett samlet punkt. Konkrete
delpunkter:

1. **Verifiser at Kafka-key i `eessibasis.sed*-v1` ikke er fnr.** Sjekk
   produsent-koden i
   [`navikt/eux-all-rina-events`](https://github.com/navikt/eux-all-rina-events)
   og legacy-bridgen
   [`navikt/eux-legacy-rina-events`](https://github.com/navikt/eux-legacy-rina-events).
2. **Strip `navBruker` fra Slack-varsler.** Endre
   [`SedSendtKafkaConsumer`](https://github.com/navikt/eux-fagmodul-journalfoering/blob/main/src/main/java/no/nav/eux/fagmodul/api/kafka/SedSendtKafkaConsumer.java)
   og tilsvarende `SedMottattKafkaConsumer` slik at Slack får en
   redigert versjon (f.eks. kun `rinaSakId`, `sedType`,
   `rinaDokumentId`).
3. **Verifiser at MDC ikke logger fnr.** Gjennomgå
   `MdcLogger.initialize(consumerRecord)` i `eux-fagmodul-journalfoering`
   og tilsvarende i `eux-journalfoering`.
4. **Verifiser topic-ACL.** Hent ut faktisk allowlist for begge topics
   og kontroller at ingen apper utenfor eessibasis er allowlistet uten
   eksplisitt vurdering.
5. **Verifiser retention.** Sjekk `retention.ms` og `cleanup.policy` for
   begge topics.
6. **PVK-oppdatering.** Få lagt til et Kafka-avsnitt i PVK ved neste
   revisjon. Ta opp med personvernombud.

---

## Kilder

- [`navikt/eux-fagmodul-journalfoering`](https://github.com/navikt/eux-fagmodul-journalfoering) —
  `SedSendtKafkaConsumer.java`, `SedHendelse.java`, `.nais/prod.yaml`
  (main, sha 83d1d2b).
- [`navikt/eux-all-rina-events`](https://github.com/navikt/eux-all-rina-events)
  og [`navikt/eux-legacy-rina-events`](https://github.com/navikt/eux-legacy-rina-events) —
  produsent av `eessibasis.sed*-v1`.
- `etterlevelse/pvk/EESSI - PVKV Familieområdet v1.3REV_NAIS.html`.
- [Nav `@nais`-plattformens Kafka-dokumentasjon](https://docs.nais.io/persistence/kafka/).
- [PDL `Personhendelse.avdl` (mirror i VTP)](https://github.com/navikt/vtp/blob/master/server/src/main/resources/avro/leesah/Personhendelse.avdl) —
  bekrefter at `pdl.leesah-v1` bærer `personidenter` (fnr/dnr/aktørId).
- [PAW `Identitetsnummer.kt`](https://github.com/navikt/paw-arbeidssoekerregisteret-monorepo-intern/blob/main/domain/felles/src/main/kotlin/no/nav/paw/felles/model/Identitetsnummer.kt) —
  bekrefter at PAW arbeidssøkerregisteret behandler identifikasjonsnummer
  som førsteklasses domenefelt på sine hendelses-topics.
- GitHub-søk
  [`org:navikt "pdl.leesah-v1"`](https://github.com/search?q=org%3Anavikt+%22pdl.leesah-v1%22&type=code) —
  liste over Nav-repoer som konsumerer/refererer leesah-topicen.
