# Step 4b — Build model class mapping (if model class exists but no DTO)

If `<SED>.java` exists (e.g. `H001.java`):

1. Read the model class and identify its fields and parent class hierarchy.
2. Trace the constructor (which reads from navSed JSON) and `lagNavSed()` (which writes to navSed JSON) to determine which ACL paths each field reads/writes.
3. Follow the class hierarchy — typically: `<SED>` → `<Letter>Sed` → `Sed`, plus model classes like `PersonInfo`, `Pin`, `Statsborgerskap`, `PinMangler`, `Adresse`, `Anmodning`, etc.
4. Build a dict: `{ aclSedSti: model_field_path }`.

## How to trace ACL paths to fields

- `lesVerdiNode(sedNode, "/horisontal/bruker/ytterligereinfo")` → ACL path `$horisontal.bruker.ytterligereinfo`
- `sedNode.at("/nav/bruker")` used as context → fields read relative to that become `$nav.bruker.<relative_path>`
- Array iteration (`.forEach`) → `[x]` in ACL, `[]` in field path

**Field path format:** `<SED>.<field>.<subfield>...` e.g. `H001.bruker.personInfo.pinListe[].landkode`

## Key model classes

Located in `navikt/eux-neessi` at `src/main/java/no/nav/eux/neessi/model/`:

- `PersonInfo.java` — fornavn, etternavn, kjoenn, foedselsdato, statsborgerskap, pinListe, pinMangler, adressebeskyttelse
- `Pin.java` — landkode, sektor, identifikator, institusjonsid, institusjonsnavn
- `Statsborgerskap.java` — land, landkode, fraDato
- `PinMangler.java` — etternavnVedFoedsel, fornavnVedFoedsel, foedested (by/region/land/landkode), far, mor
- `Adresse.java` — type, gate, postnummer, by, land, landkode, bygning, region
- `sed/h/Anmodning.java` — dokumentasjon (informasjon/dokument/sed), adresse (adresseTyper)
- `sed/h/BrukerH.java` — extends PersonType, adds adresser list

## Key mapping gotchas for model classes

- nyAclMal_basis uses `.land` but `Pin.java` only has field `landkode` — map anyway (same logical data).
- `Statsborgerskap`, `Adresse`, `PinMangler.Foedested` have BOTH `.land` and `.landkode` fields.
- The model class may read from a slightly different JSON path than what the ACL maps to (e.g. H001 reads adresser from `/nav/bruker/adresse` but ACL maps to `$nav.bruker.meldinger[x].adresser[x].*`). Map these based on field correspondence.
- Model classes often handle only a subset of the SED fields (e.g. H001 handles person/anmodning/ytterligereInfo but NOT employer, reimbursement, or notification sections).
