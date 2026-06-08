---
name: sed-flyt-neessi-rina
description: >-
  Generates a file showing how the content of a SED is mapped between
  Neessi-dto, ACL-SED and RINA-SED. Use this when asked to generate
  a SED flow mapping, sedFlyt, or field mapping for any SED type
  (e.g. H120, F001, H065).
allowed-tools: github-mcp-server-get_file_contents
license: "Internal / NAV"
---

# sed-flyt-neessi-rina — SED Flow Mapping Generator

Generates a tab-aligned mapping file for a given SED type showing the relationship between:
- **indeks** — field position from dokumentasjon (Rina)
- **neessi-felt** — eux-neessi field path (Neessi-dto)
- **aclSedSti** — ACL SED path from eux-acl-generator (Acl-sed)
- **Rina path** — full Rina path (Rina-sed)

Output file: `doc/<SED>_sedFlyt_NeessiRina.txt` in the eux-architecture repo.

## Input

The user provides any SED type, e.g. `H065`, `H120`, `F001`, `U001`, `X008`.

## Source data locations

All source files are fetched from GitHub (organization: `navikt`). Use the `github-mcp-server-get_file_contents` tool to retrieve them.

**From `navikt/eux-acl-generator`:**

- **nyAclMal_basis.txt**: `src/main/resources/endringer/cdmAclMaler/v44/<letter>/<SED>/nyAclMal_basis.txt`
  where `<letter>` is the first letter(s) of the SED type (H, F, X, etc.)
- **dokumentasjon JSON**: `src/main/resources/resultater/dokumentasjon/v44/<letter-lowercase>/<SED>_dokumentasjon.json`

**From `navikt/eux-neessi`** (these are optional — many SED types have neither):

- **DTO**: `src/main/java/no/nav/eux/neessi/restapi/sed/dto/<SED>Dto.java`
- **Service**: `src/main/java/no/nav/eux/neessi/service/sed/<SED>Service.java`
- **Model class**: `src/main/java/no/nav/eux/neessi/model/sed/<letter>/<SED>.java`

## Steps

### 1. Locate source files

Fetch the following from GitHub using `github-mcp-server-get_file_contents` (owner: `navikt`):

```
# From repo: eux-acl-generator
acl_file = src/main/resources/endringer/cdmAclMaler/v44/<LETTER>/<SED>/nyAclMal_basis.txt
dok_file = src/main/resources/resultater/dokumentasjon/v44/<letter>/<SED>_dokumentasjon.json

# From repo: eux-neessi (all optional — may not exist)
dto_file = src/main/java/no/nav/eux/neessi/restapi/sed/dto/<SED>Dto.java
svc_file = src/main/java/no/nav/eux/neessi/service/sed/<SED>Service.java
model_file = src/main/java/no/nav/eux/neessi/model/sed/<letter>/<SED>.java
```

Verify that `acl_file` and `dok_file` exist (the GitHub tool returns an error for missing files). If not, abort with an error message.
The `dto_file`, `svc_file`, and `model_file` are optional — many SED types have neither.

**Priority**: If `dto_file` exists, use the DTO approach (step 4a). Otherwise, if `model_file` exists, use the model class approach (step 4b, see `model-classes.md`). Otherwise, if the SED is one of **F003, F026, F027**, use the `FamilieSed` class approach (step 4c, see `familiesed-mapping.md`). If none of the above apply, produce a 3-column output (indeks, aclSedSti, ACL path).

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

See `model-classes.md` for the full model class hierarchy, field tracing rules, and mapping gotchas.

### 4c. Build FamilieSed mapping (for F003, F026, F027)

See `familiesed-mapping.md` for FamilieSed fields, supporting classes, and mapping rules.

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

**Tab alignment:** Use the `format-output.py` script in this skill's directory. It reads tab-separated rows from stdin and applies correct tab alignment:
- `tab_size = 8`
- For each column, compute minimum fixed width: `target = ((max_width // 8) + 1) * 8`
- Tabs needed per cell: `max(1, ceil((target - cell_length) / 8))`

**Section separators:** Insert a blank line between rows where the first digit of the indeks changes (i.e. between sections 1, 2, 3, etc.).

### 9. Write output

Write to `doc/<SED>_sedFlyt_NeessiRina.txt` in the eux-architecture repo (current working directory).

Report:
- Number of ACL rows
- Number of rows with neessi mapping
- Number of `.landkode` sibling rows added
- Number of unmapped neessi fields (if applicable)
- Total lines written
