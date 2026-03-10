# Lessons learned – Vibe coding 10.03.2026

## 1. Manglende API-definisjon for eux-rina-api

Enum-verdiene som trengs for å integrere mot `eux-rina-api` er ikke dokumentert.
Workaround var at Arild sendte enum-verdier på Slack – en lite skalerbar løsning.
Vi trenger en formell API-definisjon (f.eks. OpenAPI) for `eux-rina-api`.

## 2. Upresis frontend-spesifikasjon

AI-en tok kun utgangspunkt i payload-strukturen når den genererte frontend.
For å få bedre skjermbilder og UI trenger vi en mer presis spesifikasjon som beskriver ønsket brukeropplevelse, ikke bare datamodellen.

## 3. OpenAPI-kontrakt mellom frontend og backend

Spesifikasjonen mellom frontend og backend burde vært en generert OpenAPI-kontrakt, ikke bare et payload-eksempel.
En veldefinert kontrakt gir AI bedre grunnlag for å generere korrekt kode i begge ender.

## 4. Teknisk gjeld forplanter seg via AI

Backend har mye teknisk gjeld. Når AI følger eksisterende mønstre, reproduserer og forsterker den gjelden.
Vi bør rydde opp i kjernemønstre før vi lar AI generere ny kode basert på dem.

## 5. Behov for ende-til-ende-tester

Vi mangler tester som verifiserer at vi kan sende inn en komplett SED og få hele SED-en tilbake.
Slike tester ville gitt raskere tilbakemelding på om integrasjonen faktisk fungerer.
