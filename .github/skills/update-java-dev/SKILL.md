---
name: update-java-dev
description: >-
  Syncs eux-java-dev.agent.md with current Java/Spring Boot versions, patterns,
  and dependencies from EUX Java repositories. Run when frameworks or patterns change.
---

# Update Java Dev Agent

Syncs `.github/agents/eux-java-dev.agent.md` with the actual state of EUX Java projects.

## When to run

- Java or Spring Boot version changes
- New patterns or libraries adopted across Java projects
- eux-parent-pom updated with new dependency versions

## Steps

1. **Read the current agent file** at `.github/agents/eux-java-dev.agent.md`.

2. **Browse eux-parent-pom** (`navikt/eux-parent-pom`, file `pom.xml`):
   - Extract: Spring Boot version, Java compiler target, Kotlin version, key dependency versions.

3. **Browse eux-neessi** (`navikt/eux-neessi`, file `pom.xml`):
   - Check Java version override (`maven.compiler.source`).
   - Check if Lombok is still used.
   - Check Resilience4j and other key dependencies.
   - Look at a few source files for current coding patterns.

4. **Browse eux-rina-api** (`navikt/eux-rina-api`, file `pom.xml`):
   - Check Java version, key dependencies.
   - Check if Lombok is still used.

5. **Browse one more Java project** (e.g. `navikt/eux-journalfoering` or `navikt/eux-all-rina-events`):
   - Verify patterns are consistent.

6. **Update the agent file** with findings. Keep it compact. Specifically update:
   - Java version in tech stack section.
   - Spring Boot version reference.
   - Lombok status (is it used in existing projects? for new code?).
   - Key patterns section if patterns changed.
   - Pitfalls section if new issues discovered.
   - Remove any information that is no longer accurate.

7. **Do not change**: Domain terminology, architecture reference link, or the agent's coding principles unless specifically wrong.

8. **Commit** with message describing what changed and why.
