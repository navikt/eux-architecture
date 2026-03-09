---
name: update-kotlin-dev
description: >-
  Syncs eux-kotlin-dev.agent.md with current Kotlin/Spring Boot versions, patterns,
  and dependencies from EUX Kotlin repositories. Run when frameworks or patterns change.
---

# Update Kotlin Dev Agent

Syncs `.github/agents/eux-kotlin-dev.agent.md` with the actual state of EUX Kotlin projects.

## When to run

- Kotlin or Spring Boot version changes
- New patterns or libraries adopted across Kotlin projects
- eux-parent-pom updated with new dependency versions

## Steps

1. **Read the current agent file** at `.github/agents/eux-kotlin-dev.agent.md`.

2. **Browse eux-parent-pom** (`navikt/eux-parent-pom`, file `pom.xml`):
   - Extract: Spring Boot version, Kotlin version, key dependency versions (Kotest, kotlin-logging, etc.).

3. **Browse eux-nav-rinasak** (`navikt/eux-nav-rinasak`):
   - Check `pom.xml` for Java target version, parent-pom version, module structure.
   - Look at a few Kotlin source files for current coding patterns (data classes, extension functions, service structure).

4. **Browse eux-oppgave** (`navikt/eux-oppgave`):
   - Check for Spring Retry patterns, OpenAPI codegen usage.
   - Verify coding style matches agent description.

5. **Browse one more Kotlin project** (e.g. `navikt/eux-avslutt-rinasaker` or `navikt/eux-journal`):
   - Verify patterns are consistent across projects.

6. **Update the agent file** with findings. Keep it compact. Specifically update:
   - Kotlin version in tech stack section.
   - Java target version.
   - Spring Boot version reference.
   - Key patterns section if patterns changed.
   - Test framework (Kotest vs JUnit) if changed.
   - Pitfalls section if new issues discovered.
   - Remove any information that is no longer accurate.

7. **Do not change**: Domain terminology, architecture reference link, or the strict "follow existing patterns" principle.

8. **Commit** with message describing what changed and why.
