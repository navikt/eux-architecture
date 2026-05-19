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

## K101.2 – Overføring av personopplysninger til utlandet må være lovlig

- [ ] **Bekreftelse på at EESSI-kretsen ikke omfatter tredjeland uten
      tilstrekkelig beskyttelsesnivå.** Antagelsen er at EESSI er begrenset til
      EU/EØS pluss Sveits og Storbritannia, og at disse er dekket av
      adekvansbeslutninger og/eller egne trygdekoordineringsavtaler. Bekreftes
      med personvernombud / Juridisk avdeling.
- [ ] **Eventuell sjekklisteutfylling i Public 360.** Vurder om det likevel
      skal fylles ut en sjekkliste i Public 360 for nEESSI som dokumentasjon
      på at vurderingen er gjort, selv om konklusjonen er at det ikke er
      overføring til tredjeland. Personvernombud.

## K109.1 – Fødselsnummer og andre identifikasjonsmidler

- [ ] **Behandlingskatalogen dokumenterer bruk av fødselsnummer per
      nEESSI-behandling.** Bekreft at fagansvarlig per ytelse / PDL-eier har
      registrert at fødselsnummer er nødvendig for behandlingen.
      Fagansvarlige + personvernombud.
- [ ] **EESSI-nettverkets transportsikkerhet er formelt dokumentert.**
      Antagelsen er at EESSI er et lukket, kryptert nettverk drevet av
      EU-kommisjonen. Hent formell dokumentasjon (driftsdokumentasjon /
      EU-kilde) som kan refereres ved tilsyn. Team eessibasis / SIF.

## K102.3 – Det må fastsettes et klart formål før innsamling og behandling

- [ ] **Behandlingskatalogen dekker alle aktive nEESSI-behandlinger med
      formål.** Bekreft at hver aktive BUC/ytelse som nEESSI støtter har en
      registrert behandling i Behandlingskatalogen med spesifikt og uttrykkelig
      angitt formål, og hent referanser. Overlapper med K111.1-punktet om
      Behandlingskatalogen – avklares samlet. Personvernombud + fagansvarlige
      per ytelse.
- [ ] **Forenelighetsvurdering for adresseoppdatering mot PDL er gjort av
      PDL-eier.** Bekreft at forvaltningsansvaret for PDL har dokumentert
      forenelighetsvurdering for at adresser fra innkommende SED-er brukes til
      å oppdatere folkeregisteret. nEESSI er teknisk leverandør, ikke
      vurderingsansvarlig. Eier av PDL-behandling + personvernombud.
- [ ] **Forenelighetsvurdering for oppdatering av utenlandske identifikatorer i
      PDL er gjort av PDL-eier.** Tilsvarende bekreftelse for at utenlandske
      personnumre/trygdenumre fra SED-er supplerer PDL. Eier av PDL-behandling
      + personvernombud.
- [ ] **Rutine for å varsle fagområde/PDL-eier ved nye BUC-er eller endrede
      videreflyter.** Bekreft at team eessibasis har en omforent rutine for å
      melde fra til riktig behandlingseier når en ny BUC, SED-type eller
      videreflyt i plattformen kan utvide formålet, slik at eier kan revidere
      Behandlingskatalogen. Team eessibasis + personvernombud.

## K107.2 – Behandling av personopplysninger må være lovlig

- [ ] **Behandlingsgrunnlag dokumentert per nEESSI-behandling i
      Behandlingskatalogen.** Bekreft at hver aktive BUC/ytelse som nEESSI
      støtter har registrert behandlingsgrunnlag (med hjemmelhenvisning) og
      eventuelt særlig grunnlag for særlige kategorier. Overlapper med
      K102.3- og K111.1-punktene om Behandlingskatalogen. Personvernombud +
      fagansvarlige per ytelse.
- [ ] **Behandlingsgrunnlag for PDL-oppdatering (adresse og utenlandske
      identifikatorer) dokumentert av PDL-eier.** Bekreft at forvalter av
      PDL-behandlingen har skriftlig vurdering av grunnlaget for maskinell
      oppdatering basert på SED-data. Eier av PDL-behandling + personvernombud.
- [ ] **Avklart om noen aktiv BUC behandler opplysninger om straffedommer og
      lovovertredelser.** Antagelsen er nei, men bekreft med personvernombud
      slik at vi unngår at en sjelden BUC krever særskilt grunnlag uten at vi
      har fanget det opp.

## K103.2 – Personopplysninger skal kunne rettes

- [ ] **Sentral rutine for retting/sletting/begrensning dekker EESSI-saker.**
      Bekreft at Nav sin retningslinje for retting, sletting og begrensning er
      oppdatert mot personvernforordningen og at den faktisk dekker
      EESSI-flyten (rinasaker, SED-er, journalposter fra nEESSI). Personvernombud
      / Juridisk.
- [ ] **Rutine for å sende rettelses-SED når Nav oppdager feil.** Bekreft hvilke
      X-/rettelses-SED-er som faktisk brukes per BUC når Nav oppdager at tidligere
      utvekslede opplysninger var feil, og at saksbehandlere er kjent med
      rutinen. Domeneansvarlig for EESSI + fagansvarlige per ytelse.
- [ ] **Identifisering av berørte mottakerland ved retting i PDL.** Når en
      personopplysning rettes i PDL, har vi i dag ingen automatisk kobling som
      finner alle tidligere SED-mottakere for personen og varsler dem. Avklar
      om dette skal håndteres manuelt av saksbehandler/fagansvarlig, eller om
      det skal etableres støtte i nEESSI. Team eessibasis + fagansvarlige.
- [ ] **Frist (én måned) for tilbakemelding på rettingskrav.** Bekreft at den
      sentrale rutinen faktisk måler og rapporterer på fristen, og at
      EESSI-spesifikke krav fanges opp i samme spor. Personvernombud.
- [ ] **Validering av SED-innhold før utsending.** Besvarelsen sier at SED-er
      valideres mot EESSI sine datamodeller før utsending. Bekreft hvor
      omfattende denne valideringen faktisk er (skjema, obligatoriske felt,
      konsistens) og om det er gap som bør tettes. Team eessibasis.

## K116.1 – Behandling av personopplysninger må kunne begrenses

- [ ] **Egen merke-/skjermfunksjon i nEESSI for begrensning.** nEESSI har i dag
      ingen UI-funksjon som markerer en person eller en rinasak som "begrenset"
      på tvers av saker. Dagens tiltak er stansing av pågående saksbehandling,
      fritekstnotat i rinasaken og tilgangsstyring. Bekreft med personvernombud
      / Juridisk om dette er tilstrekkelig, eller om vi må bygge eksplisitt
      støtte. Team eessibasis + personvernombud.
- [ ] **Stansing av pågående saksbehandling ved begrensningskrav.** Bekreft
      hvilken konkret rutine saksbehandler skal følge i nEESSI når Juridisk
      avdeling har besluttet begrensning – sette oppgaver på vent, ikke sende
      utkast-SED, flytte sak til skjermet enhet – og at rutinen er dokumentert
      og kjent. Team eessibasis + fagansvarlige per ytelse.
- [ ] **Sentral rutine for begrensning dekker EESSI-saker.** Samme antagelse
      som for K103.2: bekreft at Nav sin retningslinje for retting, sletting og
      begrensning faktisk dekker rinasaker og SED-er, og at frister måles for
      EESSI-spesifikke krav. Personvernombud / Juridisk.
- [ ] **Varsling av mottakerland ved begrensning.** Vi antar at samme
      rettelses-/X-SED-mekanisme som ved retting brukes for å varsle andre lands
      myndigheter om begrensning. Bekreft hvilke SED-typer som faktisk brukes
      per BUC når formålet er begrensning (ikke ren retting). Domeneansvarlig
      EESSI + fagansvarlige.
- [ ] **Identifisering av berørte mottakere ved begrensningskrav.** Som for
      K103.2: ingen automatisk kobling som finner alle tidligere SED-mottakere
      for en person. Avklar om manuell identifisering er akseptabelt, eller om
      det bør bygges støtte i nEESSI. Team eessibasis + fagansvarlige.
- [ ] **Heving av begrensning – varsel til den registrerte.** Veilederen sier
      at den registrerte alltid skal ha beskjed før en begrensning heves.
      Bekreft at den sentrale rutinen ivaretar dette, og hvem som faktisk sender
      varselet. Personvernombud / Juridisk.

## K111.1 – Behandling av personopplysninger skal være nødvendig og proporsjonal

- [ ] **Formell PVK/DPIA for nEESSI-behandlinger.** Bekreft at nødvendighets-
      og proporsjonalitetsvurderingen for behandling av personopplysninger i
      EESSI faktisk er dokumentert (Behandlingskatalogen / Public 360) per
      ytelse/BUC, og hent referanse til riktig dokument-ID. Personvernombud +
      Juridisk + fagansvarlige per ytelse.
- [ ] **Avgrensning av SED-felt mot BUC-krav.** Besvarelsen sier at nEESSI
      ikke sender flere felt enn BUC-en forutsetter. Bekreft at dette stemmer i
      praksis – at saksbehandler ikke har mulighet til å fylle ut og sende
      "ekstra" personopplysninger som ikke er påkrevd. Domeneansvarlig for EESSI
      + team eessibasis.
- [ ] **Særlige kategorier i SED-er.** Bekreft og dokumenter hvilke BUC-er som
      faktisk håndterer særlige kategorier av personopplysninger (helse, barn,
      fagforening m.v.) og at det rettslige grunnlaget for disse er på plass.
      Personvernombud + fagansvarlige per ytelse.
- [ ] **Behandlingskatalogen oppdatert for EESSI.** Bekreft at alle aktive
      EESSI-behandlinger er registrert i Behandlingskatalogen med riktig formål,
      rettslig grunnlag og lagringstid. Personvernombud + fagansvarlige.

## K113.2 – Den registrerte har krav på innsyn i hvilke personopplysninger Nav har registrert

- [ ] **Melding til Nav Kontaktsenter om nEESSI som innsynskilde.** Send e-post
      til nav.kontaktsenter.styringsenhet@nav.no med emne "K113.2 Innsyn" og
      beskrivelse av nEESSI og hvilke typer personopplysninger som lagres i
      plattformens egne baser (utover det som ligger i Joark). Team eessibasis
      + personvernombud.
- [ ] **Skriftlig rutine for uttrekk per innbygger fra nEESSI-baser.** Etabler
      og dokumenter hvordan teamet henter ut personopplysninger om én bestemt
      innbygger fra rinasaks-kobling, journaltreff, oppgaver, søkeindeks,
      PDL-mappinger og eux-adresse-oppdatering – inkludert frist på én måned.
      Team eessibasis.
- [ ] **Avklaring av elektronisk innsynsomfang i nEESSI-interne data.** Avklar
      hvilke nEESSI-spesifikke driftsopplysninger (utover SED-innhold på
      "Min sak") som er meningsbærende for innbygger og kan eksponeres
      elektronisk uten å gå på bekostning av sikkerhet eller andre personers
      rettigheter. Team eessibasis + personvernombud.

## K198.1 – Bruk av samtykke må oppfylle særskilte krav

- [ ] **Ingen EESSI-behandling bruker samtykke som behandlingsgrunnlag.**
      Besvarelsen forutsetter at samtykke ikke er listet som rettslig grunnlag
      for noen aktiv EESSI-behandling i Behandlingskatalogen, og at ingen
      fagsystemer som nEESSI integrerer mot benytter samtykke i en flyt som
      involverer SED-utveksling. Bekreft med personvernombud + fagansvarlige
      per ytelse.

## K229.1 – Bruk av berettiget interesse må oppfylle særskilte krav

- [ ] **Ingen EESSI-behandling bruker berettiget interesse som behandlingsgrunnlag.**
      Besvarelsen forutsetter at berettiget interesse ikke er listet som
      rettslig grunnlag for noen aktiv EESSI-behandling i Behandlingskatalogen,
      og at all behandling i nEESSI hjemles i rettslig forpliktelse / offentlig
      myndighet etter EØS-trygdeforordningene og nasjonal trygdelovgivning.
      Bekreft med personvernombud.

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

## K262.1 – Behandling av personopplysninger må kunne protesteres mot

- [ ] **Behandlingsgrunnlag per behandling i Behandlingskatalogen.** For å
      avgjøre hvilke nEESSI-relaterte behandlinger som faktisk gir grunnlag
      for protest (art. 6 nr. 1 bokstav e eller f), må vi gå gjennom
      behandlingene per ytelse/BUC og bekrefte hvilket grunnlag som er
      registrert. Fagansvarlige per ytelse + personvernombud.
- [ ] **Sentral rutine dekker protest.** Bekreft at Nav sin retningslinje for
      retting, sletting og begrensning også eksplisitt dekker protest etter
      art. 21, og at frister måles for EESSI-spesifikke krav. Personvernombud /
      Juridisk.
- [ ] **Stansing av pågående saksbehandling ved tatt-til-følge-protest.**
      Samme antagelse som for K116.1: bekreft konkret rutine for hvordan
      saksbehandler stanser pågående utveksling i nEESSI og dokumenterer
      stansingen. Team eessibasis + fagansvarlige.
- [ ] **Varsling av mottakerland ved protest.** Antar at samme rettelses-/
      X-SED-mekanisme som ved retting/begrensning brukes. Bekreft hvilke
      SED-typer som faktisk brukes når formålet er protest. Domeneansvarlig
      EESSI + fagansvarlige.
- [ ] **Informasjonsplikt – uttrykkelig og atskilt.** Bekreft at Nav sin
      sentrale personvernerklæring og kommunikasjonen i de berørte ytelsene
      faktisk fremhever retten til å protestere uttrykkelig og atskilt fra
      annen informasjon, senest ved første kommunikasjon. Personvernombud +
      kommunikasjonsavdeling + fagansvarlige per ytelse.
- [ ] **Avgrensning mot profilering i fagsystemer.** nEESSI gjør ikke
      profilering selv, men formidler opplysninger til fagsystemer som
      eventuelt gjør det. Bekreft at protest mot profilering håndteres i
      fagsystemets eget løp og ikke faller mellom to stoler. Fagansvarlige +
      personvernombud.

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
- [ ] **Fødselsnummer på Kafka-topics.** PVK v1.3 omtaler ikke Kafka eller
      meldingstopics eksplisitt. Bekreft med personvernombud at fnr på
      interne Kafka-topics (RINA-events m.fl.) er dekket av eksisterende
      PVK gjennom prinsippene om tilgangskontroll nær datakilden,
      kryptering i transitt og logge-filtrering – eller om PVK må
      oppdateres. Vurder samtidig om dataminimering og topic-retention er
      satt riktig, og om konsumentkretsen er begrenset til EUX-tjenester.
      Personvernombud + team eessibasis.
