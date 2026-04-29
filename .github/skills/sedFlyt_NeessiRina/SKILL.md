---
name: sedFlyt_NeessiRina
description: >-
  Generates a file showing how the content of a SED is mapped between Neessi-dto, ACL-SED and RINA-SED. Input: SED type (e.g. H120).
---

# sedFlyt_NeessiRina — SED Flow Mapping Generator

Generates a tab-aligned mapping file for a given SED type showing the relationship between:
- **indeks** — field position from dokumentasjon (Rina)
- **neessi-felt** — eux-neessi field path (Neessi-dto)
- **aclSedSti** — ACL SED path from eux-acl-generator (Acl-sed)
- **Rina path** — full Rina path (Rina-sed)

Output file: `doc/<SED>_sedFlyt_NeessiRina.txt` in the eux-architecture repo.

## Input

The user provides any SED type, e.g. `H065`, `H120`, `F001`, `U001`, `X008`.

## Source data locations

All source files are in the local clone at `~/github/eux-acl-generator`:

- **nyAclMal_basis.txt**: `src/main/resources/endringer/cdmAclMaler/v44/<letter>/<SED>/nyAclMal_basis.txt`
  where `<letter>` is the first letter(s) of the SED type (H, F, X, etc.)
- **dokumentasjon JSON**: `src/main/resources/resultater/dokumentasjon/v44/<letter-lowercase>/<SED>_dokumentasjon.json`

DTO, Service, and model class files (if they exist) are in `~/github/eux-neessi`:

- **DTO**: `src/main/java/no/nav/eux/neessi/restapi/sed/dto/<SED>Dto.java`
- **Service**: `src/main/java/no/nav/eux/neessi/service/sed/<SED>Service.java`
- **Model class**: `src/main/java/no/nav/eux/neessi/model/sed/<letter>/<SED>.java`

## Steps

### 1. Locate source files

```
acl_dir = ~/github/eux-acl-generator/src/main/resources/endringer/cdmAclMaler/v44
acl_file = <acl_dir>/<LETTER>/<SED>/nyAclMal_basis.txt
dok_file = ~/github/eux-acl-generator/src/main/resources/resultater/dokumentasjon/v44/<letter>/<SED>_dokumentasjon.json
dto_file = ~/github/eux-neessi/src/main/java/no/nav/eux/neessi/restapi/sed/dto/<SED>Dto.java  (may not exist)
svc_file = ~/github/eux-neessi/src/main/java/no/nav/eux/neessi/service/sed/<SED>Service.java  (may not exist)
model_file = ~/github/eux-neessi/src/main/java/no/nav/eux/neessi/model/sed/<letter>/<SED>.java  (may not exist)
```

Verify that `acl_file` and `dok_file` exist. If not, abort with an error message.
The `dto_file`, `svc_file`, and `model_file` are optional — many SED types have neither.

**Priority**: If `dto_file` exists, use the DTO approach (step 4a). Otherwise, if `model_file` exists, use the model class approach (step 4b). If neither exists, produce a 3-column output (indeks, aclSedSti, ACL path).

### 2. Parse nyAclMal_basis.txt

Each line has one of these formats:
- `H120.Some.Path: $acl.sed.sti` — ACL path with aclSedSti mapping
- `H120.Some.Path: : EnumTypeName` — ACL path with enum type (no aclSedSti)
- `H120.Some.Path` — ACL path without mapping (structural/intermediate node)

Parse into a dict: `{ ACL_path: aclSedSti_or_empty }`.

### 3. Parse dokumentasjon JSON

The JSON is keyed by ACL path. Each entry has:
- `indeks` — hierarchical field position (e.g. "1.1.7.1.4.2.")
- `aclSedSti` — ACL SED path (may differ from nyAclMal_basis — dokumentasjon uses `.landkode` where nyAclMal_basis uses `.land`)
- `required` — boolean
- `ledetekst`, `verdiType`, `cdmType` — metadata (not used in output)

Use this to get the `indeks` for each ACL path. If nyAclMal_basis has no aclSedSti for a path, fall back to dokumentasjon's `aclSedSti`.

### 4a. Build DTO mapping (if DTO exists)

If `<SED>Dto.java` exists:

1. Parse the record hierarchy to extract all leaf field paths (e.g. `H120Dto.bruker.personInfo.etternavn`).
2. Read `<SED>Service.java` to understand the mapping between aclSedSti and DTO fields.
   The Service has `tilDto()` and `tilEuxRinaApiDto()` methods that show the field-by-field mapping.
3. Build a dict: `{ aclSedSti: DTO_field_path }`.

**Key mapping gotchas:**
- nyAclMal_basis uses `.land` but DTOs use `.landkode` — handle both variants.
- `[x]` in aclSedSti corresponds to `[]` in DTO paths.
- Some DTO fields map to multiple ACL paths (e.g. `dekningKostnader` maps to both 4.1.2 and 4.2.1).
- Some DTO fields have no ACL mapping (metadata, PDL enrichment, backend-set fields).

### 4b. Build model class mapping (if model class exists but no DTO)

If `<SED>.java` exists (e.g. `H001.java`):

1. Read the model class and identify its fields and parent class hierarchy.
2. Trace the constructor (which reads from navSed JSON) and `lagNavSed()` (which writes to navSed JSON) to determine which ACL paths each field reads/writes.
3. Follow the class hierarchy — typically: `<SED>` → `<Letter>Sed` → `Sed`, plus model classes like `PersonInfo`, `Pin`, `Statsborgerskap`, `PinMangler`, `Adresse`, `Anmodning`, etc.
4. Build a dict: `{ aclSedSti: model_field_path }`.

**How to trace ACL paths to fields:**
- `lesVerdiNode(sedNode, "/horisontal/bruker/ytterligereinfo")` → ACL path `$horisontal.bruker.ytterligereinfo`
- `sedNode.at("/nav/bruker")` used as context → fields read relative to that become `$nav.bruker.<relative_path>`
- Array iteration (`.forEach`) → `[x]` in ACL, `[]` in field path

**Field path format:** `<SED>.<field>.<subfield>...` e.g. `H001.bruker.personInfo.pinListe[].landkode`

**Key model classes** (in `~/github/eux-neessi/src/main/java/no/nav/eux/neessi/model/`):
- `PersonInfo.java` — fornavn, etternavn, kjoenn, foedselsdato, statsborgerskap, pinListe, pinMangler, adressebeskyttelse
- `Pin.java` — landkode, sektor, identifikator, institusjonsid, institusjonsnavn
- `Statsborgerskap.java` — land, landkode, fraDato
- `PinMangler.java` — etternavnVedFoedsel, fornavnVedFoedsel, foedested (by/region/land/landkode), far, mor
- `Adresse.java` — type, gate, postnummer, by, land, landkode, bygning, region
- `sed/h/Anmodning.java` — dokumentasjon (informasjon/dokument/sed), adresse (adresseTyper)
- `sed/h/BrukerH.java` — extends PersonType, adds adresser list

**Key mapping gotchas for model classes:**
- nyAclMal_basis uses `.land` but `Pin.java` only has field `landkode` — map anyway (same logical data).
- `Statsborgerskap`, `Adresse`, `PinMangler.Foedested` have BOTH `.land` and `.landkode` fields.
- The model class may read from a slightly different JSON path than what the ACL maps to (e.g. H001 reads adresser from `/nav/bruker/adresse` but ACL maps to `$nav.bruker.meldinger[x].adresser[x].*`). Map these based on field correspondence.
- Model classes often handle only a subset of the SED fields (e.g. H001 handles person/anmodning/ytterligereInfo but NOT employer, reimbursement, or notification sections).

### 5. Handle `.land` / `.landkode` variants

For classes that have BOTH `.land` and `.landkode` fields (Statsborgerskap, Adresse, PinMangler.Foedested):
- Show both variants as separate rows.
- The `.landkode` sibling row has **empty indeks** (do not repeat).
- Fill in the `.landkode` ACL path in column 3 if it exists in dokumentasjon.

For `Pin` (which only has `.landkode`): show a sibling row with the `.landkode` ACL path if it exists in dokumentasjon.

### 6. Assemble rows

For each entry in nyAclMal_basis (and any extra entries from dokumentasjon with aclSedSti):

```
(indeks, neessi_field_path_or_empty, aclSedSti, acl_path)
```

Sort by indeks using **natural numeric sort** on the hierarchical parts:
- Split indeks by `.`, parse each part as integer
- Sort as tuple: `(1, 1, 7, 1, 4, 2)` for "1.1.7.1.4.2."

After sorting, insert `.landkode` sibling rows immediately after the corresponding `.land` row.

### 7. Add unmapped neessi fields

Find fields in the DTO/model class not covered by any ACL row. Add them at the bottom with:
- Empty indeks (column 1)
- Field path (column 2)
- Explanation in parentheses (column 3), e.g. `(metadata, ikkje i ACL)`, `(beriking frå PDL, ikkje i ACL)`, `(sett av backend, ikkje i ACL)`, `(ikkje i <SED> ACL)`, `(les frå <path>, ikkje i <SED> ACL)`
- Empty column 4

### 8. Format output

**Columns** (tab-separated) — always 4 columns when a DTO or model class exists:

| # | Column | Description |
|---|---|---|
| 1 | indeks | Field position from dokumentasjon |
| 2 | neessi field path | `<SED>Dto.*` or `<SED>.*` field path |
| 3 | aclSedSti | ACL SED path (`$nav.*` / `$horisontal.*`) |
| 4 | ACL path | Full RINA ACL path (`<SED>.Notification...`) |

If neither DTO nor model class exists, use 3 columns (indeks, aclSedSti, ACL path).

**Tab alignment:**
- `tab_size = 8`
- For each column, compute minimum fixed width: `target = ((max_width // 8) + 1) * 8`
- Tabs needed per cell: `max(1, ceil((target - cell_length) / 8))`
- This gives the narrowest possible fixed column widths with tab alignment.

**Section separators:** Insert a blank line between rows where the first digit of the indeks changes (i.e. between sections 1, 2, 3, etc.).

### 9. Write output

Write to `doc/<SED>_sedFlyt_NeessiRina.txt` in the eux-architecture repo (current working directory).

Report:
- Number of ACL rows
- Number of rows with neessi mapping
- Number of `.landkode` sibling rows added
- Number of unmapped neessi fields (if applicable)
- Total lines written
