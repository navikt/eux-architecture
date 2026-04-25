# etterlevelse/

Arbeidskatalog for dokumentering av etterlevelse i Nav sitt verktøy
**Støtte til etterlevelse** (etterlevelse.ansatt.nav.no) for team eessibasis.

## Struktur

```
etterlevelse/
├── status.md            Tabell over alle krav vi har dokumentert, med status (Ja / Ja delvis / Nei delvis / Nei)
├── apne-sporsmal.md     Oppfølgingsliste for uavklarte antagelser i besvarelsene
├── agent-output/        Paste-klare .txt-filer generert for hvert krav
└── doc/                 Kildemateriale: veiledere, tema-intro, eksempler fra andre team
```

### `status.md`

Presentabel oversikt over alle krav teamet har dokumentert, med status,
antall suksesskriterier og lenke til underlag. Oppdateres automatisk av
agenten når nye krav besvares eller eksisterende vurderinger endres.

### `apne-sporsmal.md`

Samler antagelser og påstander i besvarelsene våre som ikke er fullt ut
verifisert. Brukes til å følge opp punkter sammen med andre fagmiljøer (Team
dokumentløsninger, SIF, plattform, fagansvarlige per ytelse) før besvarelsene
sendes inn i portalen. Team eessibasis eier og vedlikeholder dokumentet.

### `agent-output/`

Tekster som er paste-klare for Støtte til etterlevelse. Ett krav kan ha flere
filer – typisk én per suksesskriterium. Filnavnkonvensjon:

- `<kravid>-suksesskriterium<n>-<kort-navn>.txt`
- `<kravid>-besvarelse-<kort-navn>.txt`
- `<kravid>-hensikt.txt`, `<kravid>-kilder.txt` osv.

Filene inneholder ren tekst (ingen markdown-header) slik at de kan limes rett
inn i feltene i portalen.

### `doc/`

Kildemateriale som brukes som grunnlag når vi skriver besvarelser:

- `Veileder for kravbeskrivelser v. 1.0.txt` – offisiell veileder.
- Tema-introduksjoner per område (arkiv, personvern, interoperabilitet,
  likestilling).
- `etterlevelseskrav (fra pvkv 2019).html` – tidligere PVKV-dokumentasjon som
  gir kontekst og formuleringer som kan gjenbrukes etter tilpasning.
- `eksempler-andre-team/` – konkrete besvarelser fra andre team som referanse.

## AI-assistent

Copilot-agenten `eux-etterlevelse` (se
`.github/agents/eux-etterlevelse.agent.md`) bistår med å skrive tekstene.
Agenten skriver output til `agent-output/` og oppdaterer `apne-sporsmal.md`
automatisk når den gjør antagelser som ikke kan verifiseres fra kodebasen.
