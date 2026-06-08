# Step 4c — Build FamilieSed mapping (for F003, F026, F027)

These SEDs use the shared `FamilieSed` class (at `src/main/java/no/nav/eux/neessi/model/sed/f/FamilieSed.java` in `navikt/eux-neessi`).

## FamilieSed fields

- `sedType` — String
- `sedVersjon` — String
- `bruker` — PersonTypeF
- `ektefelle` — PersonTypeF
- `annenPerson` — PersonTypeF
- `andrePersoner` — List<PersonTypeF>
- `barnListe` — List<Barn> (JSON: `barn`)
- `anmodningsperioder` — List<Periode>
- `formaalListe` — List<String>
- `krav` — Krav
- `endredeForholdListe` — List<String>
- `utbetalingTilInstitusjon` — UtbetalingTilInstitusjon
- `familie` — Familie
- `vedtak` — Vedtak
- `ytterligereInfo` — String
- `refusjonskrav` — String
- `anmodningOmMerInformasjon` — AnmodningOmMerInformasjon
- `erKravEllerSvarPaaKrav` — String

## Supporting classes

Located in `src/main/java/no/nav/eux/neessi/model/sed/f/`:

- `PersonTypeF.java` — extends PersonType (personInfo), adds adresser, telefoner, epost
- `Barn.java` — extends PersonType, adds adresser, relasjoner, barnetsStatus, etc.
- `Familie.java` — familiemedlemmer, sivilstand, etc.
- `Krav.java` — kravdato, kravtype
- `Vedtak.java` — vedtaksperioder, beloep, etc.
- `AnmodningOmMerInformasjon.java` — sections for different info requests
- `UtbetalingTilInstitusjon.java` — kontoinformasjon

**Field path format:** `FamilieSed.<field>.<subfield>...` e.g. `FamilieSed.bruker.personInfo.etternavn`

## Steps

1. Fetch `FamilieSed.java` and its supporting classes from GitHub.
2. Map aclSedSti paths to `FamilieSed` field paths based on the JSON structure these classes serialize to/from.
3. Build a dict: `{ aclSedSti: FamilieSed_field_path }`.

## Key mapping rules

- `$nav.bruker.*` → `FamilieSed.bruker.*` (PersonTypeF with PersonInfo, Adresse, etc.)
- `$nav.ektefelle.*` → `FamilieSed.ektefelle.*`
- `$nav.barn[x].*` → `FamilieSed.barnListe[].*`
- `$familie.*` → `FamilieSed.familie.*`, `FamilieSed.anmodningOmMerInformasjon.*`, etc. (varies by SED)
- `$nav.ytterligereinformasjon` → `FamilieSed.ytterligereInfo`
