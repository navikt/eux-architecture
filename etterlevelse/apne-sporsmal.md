# Åpne spørsmål og antagelser – etterlevelse

Samling av antagelser og påstander i etterlevelsesbesvarelsene våre som vi ikke
har verifisert fullt ut. Dokumentet brukes av team eessibasis til å følge opp
punkter sammen med relevante fagmiljøer før besvarelsene sendes inn i
Støtte til etterlevelse (etterlevelse.ansatt.nav.no).

Punktene er gruppert per krav. Hvert punkt har en kort beskrivelse av hva som
må bekreftes og hvem vi sannsynligvis må snakke med.

---

## Tverrgående antagelser

Flere krav lener seg på de samme underliggende antagelsene. Disse bør avklares
én gang og deretter brukes som felles grunnlag.

- [ ] **Nav sitt arkiv (Joark) er Noark 5-godkjent.** Påvirker K222.1 SK1 og
      K226.1 SK3. Avklares med eier av Joark / Seksjon informasjonsforvaltning
      (SIF). Få formell henvisning til godkjenningsdokumentasjon.
- [ ] **Joark lagrer data i Norge.** Påvirker K130.2 SK1. Standard antagelse i
      kraveierveilederen, men bør ha formell kilde fra arkivet.
- [ ] **Formatkonvertering til PDF/A håndteres sentralt av arkivet.** Påvirker
      K226.1 SK4 og K223.1 SK1. Bekreft at verken eux-journal eller andre
      EUX-tjenester gjør konverteringen selv. Team dokumentløsninger.
- [ ] **Arkivet bevarer original versjon når det lages skjermet versjon.**
      Påvirker K222.1 SK3. Standard Noark-oppførsel, men verifiser for vår
      journalføringsflyt. Team dokumentløsninger / SIF.
- [ ] **Nav sin felles backup-løsning dekker nEESSI-databaser og Kafka til
      Norge.** Påvirker K130.2 SK1. Bekreft at det faktisk finnes en
      fungerende backup fra GCP til on-prem for nEESSI sine PostgreSQL-baser
      og Kafka-topics – ikke bare at fellesløsningen "finnes". Plattform /
      team eessibasis.
- [ ] **Begreper for roller utenfor teamet ("fagansvarlig"):** Avklar hvilke
      begreper som faktisk brukes på EESSI-fagområdene – fagansvarlig,
      fagkoordinator, linjeleder eller annet. Brukt i K128.1 SK3 og SK5,
      K230.1 SK2 og SK3, K231.1.

---

## K220.1 – Dokumentasjonen skal være autentisk

- [ ] **Verifisering av elektroniske signaturer på vedlegg.** Besvarelsen
      sier at nEESSI ikke foretar egen verifisering og baserer seg på
      EESSI-plattformens meldingsintegritet. Bekreft at dette er riktig, eller
      beskriv hvilke tilfeller som krever egen verifisering og hvordan
      metadata da lagres. Team eessibasis + domeneansvarlig for EESSI.

## K221.1 – Dokumentasjonen skal være pålitelig

- [ ] **Avgrensning mot fagsystemene i SK4.** Besvarelsen sier at
      vilkårsvurdering, regelkjøring og vedtaksutfall dokumenteres i
      fagsystemene (Pesys m.fl.), ikke i nEESSI. Bekreft at kraveier godtar
      denne avgrensningen. Hvis ikke: koordiner med fagsystem-teamene slik at
      hele kjeden dekkes samlet. Kraveier / SIF.

## K222.1 – Dokumentasjonen skal være integritetssikret

- [ ] **Logging i nEESSI – omfang og oppbevaring.** Bekreft at pålogging,
      oppslag og handlinger faktisk logges på en måte som kan brukes til
      uautoriserte-tilgang-kontroller i ettertid, og hvor lenge loggene
      oppbevares. Team eessibasis / sikkerhet.
- [ ] **Skjerming i arkivet fungerer for EESSI-dokumenter.** Bekreft at
      skjerming med lovhjemmel registreres riktig i arkivet for dokumenter som
      kommer fra nEESSI, ikke bare for dokumenter fra andre kilder som Gosys.
      Team dokumentløsninger.
- [ ] Se også tverrgående punkter om Noark 5-godkjenning, versjonering og
      arkivformat.

## K223.1 – Dokumentasjonen skal være anvendelig

- [ ] **Tilgjengelighet av SED-datamodeller.** Besvarelsen sier at modellene
      er "åpent beskrevet av EU-kommisjonen". Dette stemmer i prinsippet, men
      tilgjengeligheten er delvis begrenset til medlemsland og tilknyttede
      organer. Vurder om formuleringen bør nyanseres og om vi skal lenke til
      en offentlig tilgjengelig kilde. Domeneansvarlig for EESSI.

## K226.1 – Vi skal journalføre saksdokumentasjon

- Se tverrgående punkter om Noark 5-godkjenning og arkivformat (PDF/A).

## K130.2 – Dokumentasjonen og databasen er lagret i Norge

- Se tverrgående punkter om Joark-lokasjon og Nav sin backup-løsning til
  Norge.

## K230.1 – Avlevering og sletting til rett tid

- [ ] **Dekning i 2019-bevarings- og kassasjonsvedtaket.** Bekreft at alle
      EESSI-relevante informasjonstyper (SED-er, vedlegg, BUC-metadata,
      sakstyper) er dekket av Nav sitt 2019-vedtak, eller om noe må meldes
      inn på nytt. Gjennomgang av Nav sitt vedtak/oversikt på Navet. SIF.
- [ ] **Lagringstider i Behandlingskatalogen.** Bekreft at lagringstidene for
      hver ytelse som behandles i EESSI (pensjon, uføretrygd, sykepenger,
      familieytelser m.fl.) faktisk er lagt inn og oppdatert i
      Behandlingskatalogen. Fagansvarlige per ytelse.
- [ ] **Avslutningssignal fra nEESSI til arkivet for kassering.** Bekreft om
      det er fagsystemene alene som sender avslutningssignal til arkivet, eller
      om nEESSI / EUX også sender noe. Har betydning for når arkivet kan
      kassere EESSI-dokumenter. Team eessibasis + team dokumentløsninger.
- [ ] **Sletting av driftsdata med personopplysninger.** Jobbene
      eux-avslutt-rinasaker og eux-slett-usendte-rinasaker rydder i
      RINA-saker. Bekreft at disse (pluss evt. andre) faktisk dekker kravet
      til sletting av *alle* ikke-arkivpliktige data med personopplysninger,
      inkludert Kafka-meldinger og statuslagring. Definer dokumenterte
      oppbevaringstider per datatype. Team eessibasis.
- [ ] **Arkivuttrekk fra EUX-databaser hvis Arkivverket krever det.** I dag
      finnes ingen etablert løsning for å produsere arkivuttrekk fra EUX sine
      egne databaser (utover det som ligger i arkivet). Bekreft med SIF om
      dette forventes, og planlegg eksport-kapabilitet i så fall. SIF.

## K231.1 – Språket i løsningen er klart, korrekt og brukertilpasset

- [ ] **Norskspråklige støttetekster rundt SED-feltene.** Besvarelsen antyder
      at nEESSI gir støttende forklaringer på norsk rundt EESSI-feltene.
      Bekreft hvor omfattende dette er i dagens UI, og nyanser teksten hvis
      det er begrenset. UX / produkteier.
- [ ] **Strukturert brukertesting av språk og UX.** Kravet forventer reell
      brukertesting. Besvarelsen beskriver løpende dialog med saksbehandlere,
      men ikke formelle brukertester. Avklar om teamet skal etablere en rutine
      for strukturert brukertesting, eller om eksisterende praksis kan
      dokumenteres tydeligere. Produkteier / UX.
- [ ] **Etablert kanal til fagansvarlig for klarspråk.** Bekreft om teamet
      faktisk har en aktiv kanal mot Nav sin klarspråksressurs, eller om dette
      er en intensjon. Produkteier.

## K128.1 – Sak-/arkivsystemer skal dokumentere ansvar, rutiner og sikkerhet

- [ ] **Team eessibasis sin tilgang til produksjon.** Besvarelsen sier at
      teamet ikke har tilgang til saksinnhold i produksjon ut over det som er
      nødvendig for feilretting etter etablerte rutiner. Verifiser at dette
      stemmer med faktisk tilgangsmodell og praksis. Tech lead + sikkerhet.
- [ ] **Godkjenningsflyt før SED-forsendelse.** Besvarelsen antyder at enkelte
      sakstyper krever at en ekstra saksbehandler eller leder godkjenner før
      en SED sendes. Bekreft om dette faktisk er implementert i nEESSI, eller
      om det er et fagområdekrav utenfor systemet. Fjern formuleringen hvis
      det ikke stemmer. Produkteier + fagansvarlige.
- [ ] **Skjerming (kode 6/7, egne ansatte, fortrolig) i nEESSI-visning.**
      eux-adresse-oppdatering og eux-person-oppdatering håndterer deler av
      skjermingsinformasjonen mot PDL. Bekreft at nEESSI i visning respekterer
      og videreformidler skjerming riktig, slik at sensitive opplysninger
      ikke vises til saksbehandlere uten tilgang. Team eessibasis + sikkerhet.

## K196.6 – WCAG 2.1 A og AA

- [ ] **Full WCAG 2.1 A/AA-revisjon av nEESSI.** Vi bruker Aksel-komponenter
      som gir baseline, men har ikke gjennomført en systematisk revisjon av
      hele saksbehandlerløsningen mot alle A- og AA-kriterier. Avklar om det
      skal bestilles ekstern uu-revisjon, eller gjennomføres internt med
      fagmiljø for universell utforming i Nav. Team eessibasis + uu-fagmiljø.
- [ ] **Automatiserte uu-tester i byggeprosessen.** Ingen axe/jest-axe/
      lighthouse-tester i eux-web-app i dag. Beslutt om vi skal innføre
      oppsettet fra navikt/uu-testing som del av byggepipelinen, og hvilket
      nivå av feil som skal blokkere bygg. Team eessibasis.
- [ ] **Registrering av uu-feil på a11y-statement.nav.no.** Ikke pålagt for
      interne flater, men avklar om team eessibasis likevel skal registrere
      kjente uu-feil der, eller om det holder med eget avviksspor.
      Team eessibasis + uu-fagmiljø.
- [ ] **Egen tilgjengelighetserklæring (K157).** Relevant dersom nEESSI på
      sikt eksponeres utenfor interne flater. Følges opp hvis tilgangsmodellen
      endres. Team eessibasis.

## K197.1 – Testing for flest mulig i praksis

- [ ] **Testing med skjermleser og hjelpemidler.** nEESSI har ikke blitt
      testet systematisk med skjermleser, forstørrelse eller andre
      hjelpemidler. Avklar om vi skal kjøre intern testing, eller bestille
      ekspert-testing fra uu-fagmiljøet i Nav. Team eessibasis + uu-fagmiljø.
- [ ] **Brukertesting med personer med nedsatt funksjonsevne.** Ordinær
      brukertesting med saksbehandlere skjer løpende, men ikke med variert
      funksjonsnivå. Avklar om vi skal ta i bruk "test min løsning" og på
      hvilke flyter det er mest verdifullt. Team eessibasis + uu-fagmiljø.
- [ ] **Bekreft omfang av eksisterende brukertesting.** Dokumenter hvilken
      form for brukertesting teamet faktisk gjør i dag (demoer, superbruker-
      tilbakemeldinger, observasjon) slik at besvarelsen ikke underselger det
      vi gjør. Team eessibasis.

## K267.1 – Forsvarlig sikkerhetsnivå

- [ ] **Skriftlig rutine for sårbarhetshåndtering.** Bekreft om teamet har
      (eller skal etablere) en skriftlig rutine som eksplisitt dekker
      "neste arbeidsdag for CVSS > 9" og "3 måneder for øvrige". I praksis
      håndteres kritiske saker raskt, men dokumentasjonen mangler.
      Team eessibasis.
- [ ] **Dekning av sikkerhetsskanning.** Bekreft at alle aktive EUX-repoer
      faktisk er omfattet av Salsa / NAIS sin sårbarhetsskanning, og at
      teamet mottar og følger opp varslene. Team eessibasis + ISOC.
- [ ] **Samlet oversikt over input/output-validering.** Vi har ikke en
      gjennomgått liste over alle integrasjonspunkter med hvilke
      valideringsregler som gjelder. Team eessibasis.
- [ ] **Rotasjon av delt hemmelighet mot RINA.** Bekreft hvordan og hvor ofte
      den delte hemmeligheten mellom nEESSI og RINA roteres. Team eessibasis
      + domeneansvarlig for EESSI.
- [ ] **Gjenopprettingsplan og øvelse.** Ingen formell, skriftlig
      gjenopprettingsplan per nEESSI-tjeneste, og ingen utført
      gjenopprettingsøvelse. Beslutt omfang og kadens. Team eessibasis.
- [ ] **Behandling av fødselsnummer i logger.** Bekreft at ingen aktive
      nEESSI-tjenester logger fødselsnummer i fellesloggene (kun i egne
      logger teamet kontrollerer), og at fødselsnummer ikke havner i URL
      eller header-felt. Team eessibasis.
- [ ] **Compliant device / phishing-resistent MFA.** Bekreft at Nav sin
      felles identitetsløsning håndhever dette kravet for nEESSI, og at vi
      kan henvise til fellesløsningen i besvarelsen. Team eessibasis +
      identitet/plattform.
