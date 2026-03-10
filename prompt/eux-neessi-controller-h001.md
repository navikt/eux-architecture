## Goal

Create a GitHub issue that describes a new design pattern in `eux-neessi` for SED handling, starting with **H001** as the first SED type to adopt it. The outcome is only the issue — no code changes.

## Background

The current SED endpoints in `eux-neessi` are generic and untyped. We want to introduce **SED-specific controllers** using modern Java (Records, immutable DTOs) as a new pattern. H001 is the pilot. The new endpoints will live **side by side** with the existing ones — the frontend can migrate gradually. `eux-rina-api` will not change.

## Architecture

```
Controller layer (new)
  no.nav.eux.neessi.restapi.sed.H001Controller
  no.nav.eux.neessi.restapi.dto.H001Dto          ← Java Record, matches current frontend payload exactly

        ↓

Service layer (new)
  no.nav.eux.neessi.service.sed.H001Service
  Maps H001Dto → H001EuxRinaApiDto

        ↓

Integration layer (existing client, new DTO)
  no.nav.eux.neessi.integration.eux.rina.EuxRinaApiClient        (existing)
  no.nav.eux.neessi.integration.eux.rina.H001EuxRinaApiDto       (new Java Record, matching existing payload being send to H001 exactly)
```

## Existing endpoints to replace

These generic endpoints will be replaced by typed H001-specific ones (both old and new will coexist during migration):

| Method   | Path                                                  |
|----------|-------------------------------------------------------|
| `GET`    | `/api/rinasak/{rinaSakId}/sed/{sedId}`                |
| `PUT`    | `/api/rinasak/{rinaSakId}/sed/{sedId}`                |
| `GET`    | `/api/rinasak/{rinaSakId}/sed/{sedId}/svarsed/{sedType}` |
| `POST`   | `/api/rinasak/{rinaSakId}/sed`                        |
| `DELETE` | `/v2/rina/sak/{rinaSakId}/sed/{sedId}`                |

## Endpoint design

Design new endpoint paths for `H001Controller`. Suggested base path: `/api/rinasaker/{rinaSakId}/h001`.

Analyze what is good practice based on the EESSI domain and REST/international standards. Do not carry over naming conventions from the current endpoints if they are inconsistent.

## Requirements for the issue

- Deep-analyze the current payload structure for each endpoint listed above. The `H001Dto` Record must represent the frontend payload exactly (the frontend will only change the path, not the payload shape).
- Define the `H001EuxRinaApiDto` Record for the integration layer. This has to match what we send to RINA today for H001.
- Define the mapping logic in `H001Service`.
- Propose clean, consistent endpoint paths.
- Document that this is the new pattern — future SED types should follow the same structure.
- what is being sent to `eux-rina-api` should be exactly as with the endpoints. tripple check this.

## The Issue

The issue should be created in the `eux-neessi` project