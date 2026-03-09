---
name: update-full-stack-dev
description: >-
  Syncs eux-full-stack-dev.agent.md with current frontend and backend versions,
  patterns, and dependencies. Run when any part of the EUX stack changes.
---

# Update Full-Stack Dev Agent

Syncs `.github/agents/eux-full-stack-dev.agent.md` with the actual state of EUX projects.

## When to run

- Frontend dependencies updated (React, Aksel, Vite, Redux, etc.)
- Backend frameworks updated (Spring Boot, Java, Kotlin)
- eux-parent-pom updated
- UI component patterns change (new Aksel version)

## Steps

1. **Read the current agent file** at `.github/agents/eux-full-stack-dev.agent.md`.

2. **Browse eux-web-app** (`navikt/eux-web-app`):
   - Check `package.json` for current versions: React, TypeScript, Vite, Redux Toolkit, Aksel (`@navikt/ds-react`), React Router, i18next, Express.
   - Check `vite.config.ts` for build configuration changes.
   - Check `tsconfig.json` for TypeScript config changes.
   - Check `server.mjs` for BFF changes (auth flow, proxy routes).
   - Look at a few components in `src/components/` and `src/pages/` for current UI patterns.
   - Check if Aksel component usage has changed (e.g. new primitives, deprecated components).
   - Check `.github/agents/aksel.agent.md` for Aksel design system updates.

3. **Browse eux-parent-pom** (`navikt/eux-parent-pom`, file `pom.xml`):
   - Extract: Spring Boot version, Java target, Kotlin version.

4. **Browse eux-neessi** (`navikt/eux-neessi`, file `pom.xml`):
   - Check Java version override, Lombok status, key dependencies.

5. **Browse one Kotlin project** (e.g. `navikt/eux-nav-rinasak`, file `pom.xml`):
   - Check Java target version, module structure.

6. **Update the agent file** with findings. Keep it compact. Specifically update:
   - Frontend tech stack versions (React, Vite, Aksel, TypeScript, etc.).
   - Backend tech stack versions (Java, Kotlin, Spring Boot).
   - Aksel sections if component API changed.
   - Frontend patterns if component structure changed.
   - Backend patterns if changed.
   - Pitfalls section if new issues discovered.
   - Remove any information that is no longer accurate.

7. **Do not change**: Domain terminology, architecture reference link, or core coding principles unless specifically wrong.

8. **Commit** with message describing what changed and why.
