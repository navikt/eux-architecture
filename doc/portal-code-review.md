# Portal tasks: follow-up from the code review

This is a task list for `portal/` (Next.js) and `portal-core/` (Kotlin/Spring Boot). The items came out of a code review. The small issues were fixed in that review; these need more work.

## How to use this file (instructions for the AI)

When the user writes **`doc/portal-code-review.md next`**, do this:

1. **Pick** the first task whose heading starts with `[ ]`, top to bottom. Skip `[x]` (done) and `[!]` (blocked).
2. **Read** `README.md`, `.github/copilot-instructions.md` and every file listed under **Where**. Line references may be out of date, so search for the symbols named. If the code has changed and the problem no longer exists, mark the task `[x]`, note "Already resolved", and stop.
3. **Decide.** If the task says **Decision needed**, ask the user with the options given before changing anything. If the task turns out much bigger than its **Effort**, do a coherent first slice. Then add a new `[ ]` task right below it for the rest.
4. **Fix** only this task. Keep changes surgical, follow the existing code style, and do not start other tasks. Update docs that describe the code you changed (for example `portal/README.md`).
5. **Verify** with the commands for the area you touched, and make sure everything in **Done when** holds:
   - portal: `cd portal && pnpm typecheck && pnpm lint && pnpm test:search && pnpm build`
   - portal-core: `cd portal-core && mvn -q verify`
   - workflows or NAIS YAML: parse the files (for example with `ruby -ryaml` or `yq`)
   - If verification fails, fix it. Never mark a task done while checks are red.
6. **Update this file:**
   - Change the heading from `[ ]` to `[x]`.
   - Add a line `- **Fixed:** YYYY-MM-DD: <one sentence on what changed, and the main files>`.
   - If the task is blocked, use `[!]` and add `- **Blocked:** <reason>`.
   - Do not renumber or delete tasks.
7. **Do not commit or push** unless the user asks. Finish with a short report: the task, what changed, the verification results, and the next open task.

Statuses: `[ ]` open · `[x]` done · `[!]` blocked. Effort: **S** < ½ day · **M** 1–2 days · **L** > 2 days. Tasks are ordered by priority.

---

## Security and data exposure

### [x] 01 · Close the unauthenticated portal-core ingress
- **Area:** portal-core · **Effort:** S–M · **Decision needed:** remove the ingress (recommended) or add Azure AD token validation
- **Where:** `portal-core/.nais/nais.yaml` (`ingresses`, `azure`, `accessPolicy`), `portal-core/.nais/dev.yaml` (`ingress`), `portal-core/src/main/kotlin/no/nav/eux/portal/core/api/*Controller.kt`, `.github/workflows/portal-core-build-deploy.yaml`
- **Problem:** `https://eux-portal-core.intern.dev.nav.no` serves `/api/kafka/**` and `/api/nav-rinasak/**`, including `navBruker`/fnr, to anyone on naisdevice. `azure.application.enabled` is set, but no tokens are validated. `accessPolicy.inbound` only restricts traffic inside the cluster, not the ingress.
- **Fix:**
  - **Option A:** remove the ingress. The portal calls portal-core inside the cluster through `EUX_PORTAL_CORE_BASE_URL` (check `portal/.nais/nais.yaml`).
  - **Option B:** add a Spring Security OAuth2 resource server that validates Azure AD tokens, and have the portal send an on-behalf-of or client-credentials token.
- **Done when:** the portal-core API can't be reached without auth from outside the cluster, the portal live pages still work, and the build is green.
- **Fixed:** 2026-10-20: chose option A and removed the ingress from `portal-core/.nais/nais.yaml` and `dev.yaml`. The `azure` block stays for client-credentials calls to eux-nav-rinasak. Noted in `portal/README.md`.

### [x] 02 · Stop leaking Azure/RINA error text to the browser
- **Area:** portal · **Effort:** S
- **Where:** `portal/app/api/tests/run/route.ts`, `portal/app/tests/smokeTest.ts`
- **Problem:** the smoke-test route returns raw error messages from the token and RINA calls in its JSON response.
- **Fix:** log the details on the server with the existing logger (`lib/log.ts`), and return a generic message per step.
- **Done when:** no upstream error body or exception message reaches the response, the server logs still have the details, and the build is green.
- **Fixed:** 2026-10-20: `runStep` now logs non-2xx bodies and exceptions with pino and returns `responseBody: null` plus a generic message. The token failure returns a generic 502 text. `Step.error` was removed from `smokeTest.ts` and `TestsClient.tsx`. Checked against a fake upstream: no error text in the response, full details in the logs.

### [x] 03 · Guard the smoke-test POST
- **Area:** portal · **Effort:** S
- **Where:** `portal/app/api/tests/run/route.ts`
- **Problem:** there is no Content-Type check and no limit on concurrent runs. One user can start many RINA case creations in parallel.
- **Fix:** require `application/json` (otherwise return 415). Allow one run at a time with an in-memory lock, and return 409 while a run is in progress.
- **Done when:** a second parallel POST gets 409, a wrong Content-Type gets 415, and a normal run is unchanged.
- **Fixed:** 2026-10-20: `POST` in `app/api/tests/run/route.ts` is now a thin guard (415 unless `application/json`, a per-pod `runInProgress` lock that returns 409 and is released in `finally`) around the unchanged `runSmokeTest`. The body is read with `req.text()`, so chunked requests work too. Noted in `portal/README.md`. Checked against a fake upstream: 415, 409, and the lock is released after each run.

### [x] 04 · Remove third-party requests from `missoc.html`
- **Area:** portal · **Effort:** S–M · **Decision needed:** delete the page (nothing links to it) or self-host its assets
- **Where:** `portal/public/missoc.html` (Google Fonts `<link>` tags, flagcdn.com image URLs)
- **Problem:** the page loads Google Fonts and flagcdn.com images, which leaks visitor IPs and may conflict with a CSP.
- **Fix:** delete the file, or self-host the fonts and flags (or swap the fonts for system fonts).
- **Done when:** the page makes no requests to third-party hosts, or the page is gone.
- **Fixed:** 2026-10-20: kept the page (it is intentionally hidden) and self-hosted its assets in `portal/public/missoc/`: Inter and Fraunces variable woff2 from Fontsource (SIL OFL) with a local `fonts.css`, and 4:3 SVG flags from `flag-icons` (MIT), with licence files. Added `/missoc/**` to `autoLoginIgnorePaths` in `portal/.nais/nais.yaml`, made buttons inherit the page font, and noted it in `portal/README.md`. Checked in headless Chrome: no third-party requests, both fonts and all flags load.

## Build and deploy

### [x] 05 · Build the portal once
- **Area:** CI · **Effort:** S
- **Where:** `.github/workflows/portal-build-deploy.yaml`, `portal/Dockerfile`
- **Problem:** CI runs `pnpm build`, and the Dockerfile installs and builds everything again, which doubles CI time.
- **Fix:** make the Dockerfile a runtime-only image that copies the CI `.next/standalone`, `.next/static` and `public` output. Or remove the CI build step and let Docker build. Keep `--frozen-lockfile`.
- **Done when:** the workflow runs one build, the image starts with `node server.js`, and `/api/internal/health/ready` returns 200.
- **Fixed:** 2026-10-20: `portal/Dockerfile` is now a single runtime stage that copies the CI build output, a new `portal/.dockerignore` allowlists only that output (context 52 MB, `node_modules` no longer sent), and the unused `READER_TOKEN` build secret was dropped from the workflow. Noted in `portal/README.md`. Ran the image locally (with a public Chainguard base, since the NAV registry needs auth): `ready`, `/`, static assets and `public/` all return 200.

### [x] 06 · Stop deploying from the stale branch `portal-sed-er-i-neessi`
- **Area:** CI · **Effort:** S · **Decision needed:** merge or delete the branch
- **Where:** `on.push.branches` in `.github/workflows/portal-build-deploy.yaml` and `.github/workflows/portal-core-build-deploy.yaml`
- **Problem:** the branch is unmerged but still triggers deploys to dev, so pushing to it can overwrite main's deployment.
- **Fix:** remove it from both workflows. Ask the user whether the branch should also be deleted with `gh`.
- **Done when:** only `main` (plus any intentional branches) triggers deploys and the YAML parses.
- **Fixed:** 2026-10-20: the branch was already squash-merged as PR #16 (`ddc6bf4`), so it was removed from `on.push.branches` in `portal-build-deploy.yaml` and `portal-core-build-deploy.yaml` (now `[ main ]`) and deleted locally and on origin. Both files parse.

## portal-core

### [x] 07 · Use one source for `receivedAt`
- **Area:** portal-core · **Effort:** S
- **Where:** `kafka/consumer/SedHendelseConsumer.kt`, `kafka/consumer/SedHendelseBackfill.kt`, `kafka/model/SedHendelseRecord.kt` (`SedHendelseRecord.of`)
- **Problem:** the listener sets `receivedAt` to `Instant.now()`, while the backfill uses the Kafka record timestamp. Rows on the live page sort and fade differently depending on how they arrived.
- **Fix:** derive `receivedAt` from `record.timestamp()` in `SedHendelseRecord.of` for both paths, and drop the parameter. Add a unit test.
- **Done when:** both paths produce the same `receivedAt` for the same record and `mvn -q verify` is green.
- **Fixed:** 2026-10-20: `SedHendelseRecord.of` now takes `receivedAt` from the Kafka record timestamp (falling back to now only for `NO_TIMESTAMP`) and no longer has the parameter, so `SedHendelseConsumer` and `SedHendelseBackfill` agree. Added `SedHendelseRecordTest`.

### [x] 08 · Detect dead SSE clients sooner
- **Area:** portal-core · **Effort:** S
- **Where:** `sse/AbstractSseEmitterRegistry.kt`, `sse/SseHeartbeatScheduler.kt`
- **Problem:** a client that has disconnected stays registered until the next failed write, up to 30 s later. This is harmless at today's scale.
- **Fix:** lower the heartbeat interval (for example to 15 s), or close this task as "won't fix" with a reason.
- **Done when:** a decision is recorded here, and any code change is green.
- **Fixed:** 2026-10-20: lowered the heartbeat to 15 s (`HEARTBEAT_INTERVAL_MS`). The heartbeat now lives in `AbstractSseEmitterRegistry.heartbeat()` and `SseHeartbeatScheduler` calls it on every registry bean, so a new stream needs no scheduler change. Added `AbstractSseEmitterRegistryTest`. Checked against a running instance: a killed client was pruned on the second heartbeat after it left (≤ 30 s, was ≤ 60 s).

## portal: shared UI structure

### [x] 09 · Move shared link and tone helpers out of `avslutning/`
- **Area:** portal · **Effort:** S
- **Where:** `components/avslutning/tones.ts` (`archHref`, `ghHref`, tone maps), `components/architecture/ArchitectureMap.tsx`, `components/architecture/RequestFlow.tsx`
- **Problem:** many pages unrelated to avslutning use helpers that live in that feature folder. Three tone-to-colour maps overlap.
- **Fix:** move the helpers to `lib/` or `components/shared/`, keep a single tone map, and update the imports.
- **Done when:** no non-avslutning file imports from `components/avslutning/tones`, one tone map remains, and the build is green.
- **Fixed:** 2026-10-20: moved `archHref`/`ghHref` to `lib/links.ts` and replaced the three tone maps with one generated `TONE` map and a shared `Tone` type in `lib/tones.ts` (with a `strokeSubtle` border for `ArchitectureMap`, whose tones were renamed to Aksel names). `components/avslutning/tones.ts` is gone, and every feature `data.ts` takes `Tone` from `lib/tones`. The prerendered HTML of all 15 pages is identical to before, apart from build hashes.

### [x] 10 · Define `LAYERS` once
- **Area:** portal · **Effort:** S
- **Where:** `components/architecture/Catalogue.tsx` (`LAYERS`), `app/applications/page.tsx` (`LAYERS`)
- **Problem:** the same zone grouping exists twice with different types.
- **Fix:** export one typed `LAYERS` from `components/architecture/data.ts` and use it in both places.
- **Done when:** there is a single definition, both pages render the same as before, and the build is green.
- **Fixed:** 2026-10-20: `LAYERS` (`id`, `title`, `zones`, `tone`) and `LayerId` now live in `components/architecture/data.ts` and are used by `Catalogue.tsx` and `app/applications/page.tsx`. The applications page keeps only its own `short`/`lead` copy in a `Record<LayerId, …>`, so a missing layer fails typecheck. Both pages render identical HTML. The six layer titles are no longer in the `/applications` search content (they are still indexed under `/architecture`).

### [x] 11 · Extract a shared `Section` component
- **Area:** portal · **Effort:** M
- **Where:** local `Section` in `app/page.tsx`, `app/architecture/page.tsx`, `app/applications/page.tsx`, `app/environments/page.tsx`, `components/ny-i-teamet/NyITeamet.tsx`, `components/nytt-i-neessi/NyttINeessi.tsx` and the 4 `app/prosesser/*/page.tsx` pages
- **Problem:** the component is copied about 10 times with small prop differences.
- **Fix:** create `components/page/Section.tsx` with optional `aside` and `className` props. **Keep the JSX tag name `Section`:** `scripts/search-index.mjs` finds sections by it.
- **Done when:** there is one `Section`, `pnpm test:search` passes, and the search index has the same number of sections as before (it is printed during `pnpm typecheck`).
- **Fixed:** 2026-10-20: the 10 copies are replaced by `components/page/Section.tsx` (optional `aside` and `className`), and the home page's `home-section__head` is now the `arch-section__head--aside` modifier. The search index is byte-identical (84 entries). Home sections now get their `id`, so the existing `/#flyter`, `/#finn-fram` and `/#begreper` search links work, and the unstyled `ny-section` class is gone. Measured in headless Chrome: headings sit at the same place and size as before.

### [x] 12 · Extract the shared page scaffolding
- **Area:** portal · **Effort:** M · **Depends on:** 11
- **Where:** `arch-jumpnav`, `arch-stats`, `FURTHER` and `Ext` in the architecture, applications, environments, ny-i-teamet, nytt-i-neessi and prosesser pages
- **Problem:** the jump-nav, hero stats, "Videre lesing" cards and external links are written by hand on each page.
- **Fix:** create `JumpNav`, `HeroStats`, `FurtherReading` and `ExtLink` components in `components/page/`.
- **Done when:** the pages use the shared components and look the same as before.
- **Fixed:** 2026-10-20: added `JumpNav` (which now owns `useScrollSpy`, so pages lost `SECTION_IDS`/`active`), `HeroStats`, `FurtherReading` with a `FurtherLink` type, and `ExtLink` in `components/page/`. They are used by all 9 pages and by `LiveFurther` in `components/live/ui.tsx`. Adresseoppdatering keeps its own stats because they show item lists instead of a sub-line. The environments links now announce "åpnes i ny fane" instead of hiding the icon. Measured in headless Chrome on five pages: every stat, jump-nav link, card and external link has the same position and size as before, and the scroll spy still highlights the current section. The search index only lost the stray "åpnes i ny fane" text that came from the old local `Ext`.

### [x] 13 · Keep the page list in one place
- **Area:** portal · **Effort:** M
- **Where:** `components/Sidebar.tsx` (`NAV_SECTIONS`), `app/page.tsx` (`AREAS`), `components/CommandMenu.tsx` (`START_PAGES`), `scripts/search-index.mjs`
- **Problem:** adding a page means editing four lists.
- **Fix:** move the list to `lib/navigation.ts`, and update the `NAV_SECTIONS` parser in `scripts/search-index.mjs` in the same change.
- **Done when:** there is one page list, `pnpm test:search` passes, and the search index has the same pages.
- **Fixed:** 2026-10-20: `lib/navigation.ts` now holds the only page list (`NAVIGATION`, exported as `NAV_SECTIONS`) with a typed `PageHref`, `navPage()` and a `start` flag that replaces the command menu's `START_PAGES`. The sidebar renders it, and the home page cards refer to pages by `page: PageHref` and keep only their own blurb and meta, so a typo or removed page fails typecheck. `scripts/search-index.mjs` parses the new file and resolves `page:` references to their labels. The search index is byte-identical (84 entries), and the visible prerendered HTML of all 15 pages is identical.

### [x] 14 · Use unique SVG ids
- **Area:** portal · **Effort:** S
- **Where:** `<marker>`, `<linearGradient>` and `<filter>` ids in `components/{avslutning,sletting,journalfoering,adresse}/*`
- **Problem:** fixed ids collide when two diagrams are on the same page.
- **Fix:** generate the ids with React `useId()`.
- **Done when:** no hardcoded SVG `id="..."` remains in those folders.
- **Fixed:** 2026-10-20: added `useSvgIds()` (`id`, `url`, `href` helpers on top of `useId()`) to `components/architecture/hooks.ts` and used it in all 18 inline SVGs with defs: the four process folders plus `ArchitectureMap`, `EventMetro`, `RequestFlow`, `NightTimeline` and the `ny-i-teamet` `HeroArt` motion paths. The feature prefixes (`avs-sm-`, `sl-seq-`, …) are gone from the def names. Documented in `portal/README.md`. The prerendered HTML of all 15 pages is identical apart from the ids, and in headless Chrome every `url(#…)`/`mpath` reference resolves after hydration with no duplicate ids or console errors.

### [x] 15 · Build one generic `LiveTable` for the live pages
- **Area:** portal · **Effort:** M
- **Where:** `app/kafka/sed-hendelser/page.tsx`, `app/kafka/sed-kobling/page.tsx`, `app/nav-rinasak/sed-er/page.tsx`, `components/live/*`
- **Problem:** the table, empty and error states, and filters are copied three times. On first load, an SSE event can arrive before the snapshot and get overwritten by it.
- **Fix:** create a generic `LiveTable` component, and in `useSnapshot` merge stream events that arrive while the snapshot is loading.
- **Done when:** all three pages use it, there is no race on first load, and the build is green.
- **Fixed:** 2026-10-20: added a column-driven `LiveTable<T>` in `components/live/LiveTable.tsx` (skeleton, error, empty and no-hits states, day rows, expandable rows, per-row `rowProps`) and a shared `EnvToggle` in `ui.tsx`. `useLiveStream` and `useSnapshot` are merged into `useLiveFeed`, which buffers stream events while a snapshot is in flight and replays them after it. Against a fake portal-core with a slow snapshot, the old build lost an early event, a status update, a new case and a removal; the new build keeps all four. The kobling page's error state now keys on pairs instead of raw records, and its skeleton has the same seven columns as the others.

### [x] 16 · Make live-region announcements less noisy
- **Area:** portal · **Effort:** S
- **Where:** `components/live/ui.tsx` and the live pages (`aria-live`)
- **Problem:** every new row is announced, which floods screen readers.
- **Fix:** announce a summary such as "3 nye hendelser", throttled to at most one announcement every few seconds.
- **Done when:** a burst of rows triggers one announcement.
- **Fixed:** 2026-10-21: new `components/live/announce.tsx` with one sr-only `Announcer` and two hooks. `LiveTable` (which now takes `all` rows instead of `total`, plus a `newUnit`) sums new rows that pass the filters into one message, after a 1 s settle and at most every 5 s. `LiveToolbar` dropped `aria-live` from its count and announces the hit count 0.8 s after the search or its new `filters` prop changes. `LiveStatus` keeps `role="status"` on the label only, so the per-event ping no longer re-announces "Live". Checked in headless Chrome against a fake portal-core: a burst of 6 rows gave one "6 nye hendelser", three rows a second apart gave one "3 nye hendelser" 5 s after the previous, rows hidden by the filter were not counted, and typing a search gave one "2 av 15 hendelser". Noted in `portal/README.md`.

### [ ] 17 · Port `TestsClient` to Aksel
- **Area:** portal · **Effort:** M
- **Where:** `app/tests/TestsClient.tsx`
- **Problem:** it uses styled-jsx, hex colours and raw `<button>` elements, so it does not follow dark mode or the house style.
- **Fix:** use Aksel components and `--ax-*` tokens. Check token names against `@navikt/ds-css`.
- **Done when:** there is no styled-jsx or hex colour left in the file and it works in light and dark mode.

### [ ] 18 · Simplify the smoke-test route
- **Area:** portal · **Effort:** M · **Depends on:** 02
- **Where:** `app/api/tests/run/route.ts`
- **Problem:** every step repeats the same try, check and record code. One check compares timestamps as strings (`afterTs <= beforeTs`).
- **Fix:** write a `step(name, fn)` helper, and compare timestamps with `Date.parse`.
- **Done when:** the route is noticeably shorter, its behaviour and response shape are unchanged, and the build is green.

### [x] 19 · Use the same stats scope on every live page
- **Area:** portal · **Effort:** S
- **Where:** stats or summary blocks in the three live pages
- **Problem:** some pages count every row, others only the filtered rows.
- **Fix:** pick one rule (counting filtered rows is suggested), apply it on every page, and label it clearly.
- **Done when:** the pages are consistent.
- **Fixed:** 2026-10-20: done together with 15. All three heroes now count the filtered rows (search and toggles), and `LiveHero` takes a `filtered` flag that shows "Tallene under gjelder bare det som passer søket og filtrene." while a filter is active. The "av N" sub-line says "i utvalget" instead of "i minnet" when filtered. Checked in headless Chrome with `?miljo=q1` and `?status=sendt`.

### [ ] 20 · Deduplicate the process pages
- **Area:** portal · **Effort:** L
- **Where:** `components/{avslutning,sletting,journalfoering,adresse}/*` (SystemFlow, StatusMachine, CaseJourney/Journey, `SlackReport`, `osloNow`/`until`/`r2`, schedule helpers, simulator ladder/presets) and `app/prosesser/*/page.tsx`
- **Problem:** the playback, time and schedule helpers, the Slack report and the page scaffolding are copied across four features.
- **Fix:** start with `components/process/time.ts` and the `SlackReport` component, then a generic flow and state-machine player. Do one slice per run and add the remaining slices as new tasks.
- **Done when:** the slice is extracted, every page using it looks the same as before, and the build is green.

### [ ] 21 · Stop sharing CSS prefixes across features
- **Area:** portal · **Effort:** M · **Best after:** 20
- **Where:** `app/globals.css`, and the journalføring and adresse components that use `sl-*`, `avs-*` and `jfr-*` classes from other features
- **Problem:** changing one page's styles can break another page.
- **Fix:** rename the shared classes to a neutral prefix (for example `proc-*`).
- **Done when:** each feature uses only its own prefix or `proc-*`.

### [ ] 22 · Clean up leftovers in the process pages
- **Area:** portal · **Effort:** S–M · **Best after:** 20
- **Where:** `components/{journalfoering,adresse,sletting}/*`
- **Problem:**
  - an inline `StatusChip` copy
  - `SET_BY_ACTOR`
  - three `JSON.stringify` comparators
  - sletting copy that describes the deletion rules inaccurately
  - Journey rendering each scene twice
- **Fix:** handle each point; check the sletting copy against `eux-slett-usendte-rinasaker` in README.md.
- **Done when:** every point is handled.

## portal: data that can drift

### [ ] 23 · Validate the node ids in `ENV_SERVICES`
- **Area:** portal · **Effort:** S
- **Where:** `components/miljoer/data.ts` (`ENV_SERVICES`), `components/architecture/data.ts` (`NODE_BY_ID`)
- **Problem:** the keys are plain strings, so a typo or a renamed node fails silently.
- **Fix:** type the keys as node ids, or add a test next to the existing search tests.
- **Done when:** an invalid id fails typecheck or tests.

### [ ] 24 · Make the "previous job" logic explicit
- **Area:** portal · **Effort:** S
- **Where:** `components/architecture/NightTimeline.tsx` (`g.chain && idx > 1 && idx < 6`)
- **Problem:** the logic depends on the jobs' positions, so adding or reordering a job breaks it silently.
- **Fix:** add an `after?: jobId` field to each job and use it.
- **Done when:** the hardcoded index range is gone and the timeline looks the same as before.

### [x] 25 · Keep the hero text in one place
- **Area:** portal · **Effort:** S
- **Where:** the hero paragraphs in `app/page.tsx` and `app/architecture/page.tsx`
- **Problem:** the same text is maintained twice.
- **Fix:** move it into a shared constant.
- **Done when:** the text has a single source.
- **Fixed:** 2026-10-20: both heroes render `PLATFORM_INTRO` from `components/architecture/data.ts`. `scripts/search-index.mjs` now resolves exported string constants imported with `@/…`, so the search index stays byte-identical and the visible prerendered HTML is unchanged.

### [ ] 26 · Stop hardcoding the copy-link URL
- **Area:** portal · **Effort:** S
- **Where:** `components/nytt-i-neessi/NyttINeessi.tsx` (`PAGE_URL`)
- **Problem:** the copy-link button always copies the dev URL.
- **Fix:** build the URL from `window.location.origin` when the button is clicked.
- **Done when:** the copied link matches the current host.

### [ ] 27 · Derive the numbers written in prose
- **Area:** portal · **Effort:** S–M
- **Where:**
  - `app/architecture/page.tsx` ("De ni tjenestene med database", "15 dager")
  - `components/architecture/data.ts` ("sju jobber")
  - `components/architecture/EventMetro.tsx` ("15 dager")
  - `components/nytt-i-neessi/NyttINeessi.tsx` (the month range, the "X013 laget" text)
  - `journalfoering/NightJobs` (schedule hours)
- **Problem:** these numbers go stale silently. For example, "15 dager" should come from `GRENSE_DAGER`.
- **Fix:** compute them from the data. Add `db?: boolean` to `ArchNode` and verify each value against the source repos.
- **Done when:** none of the listed numbers is hardcoded.

### [ ] 28 · Derive the service facts from `data.ts`
- **Area:** portal · **Effort:** L · **Best after:** 27
- **Where:** `components/architecture/PatternMatrix.tsx` (the OpenAPI, Caffeine, retry and starter-parent sets), `NightTimeline.tsx` (`GROUPS`), `RequestFlow.tsx` (`LOW`), `EventMetro.tsx` (`LINES`, `STATIONS`)
- **Problem:** these lists repeat facts that `data.ts` and the process data already hold, so the copies drift apart.
- **Fix:** add structured fields (`patterns`, `schedule`, `consumers`) to `ArchNode` and derive the lists from them. Verify the facts against the source repos.
- **Done when:** the listed constants are derived and the pages look the same as before.

## Minor accessibility and cleanup

### [ ] 29 · Fill keyboard-accessibility gaps
- **Area:** portal · **Effort:** S
- **Where:**
  - `components/architecture/EventMetro.tsx` (legend items with `tabIndex={0}` but no role)
  - `SlackMock.tsx` (tablist without Home/End)
  - hover-only highlights in the adresse and journalføring flows
- **Problem:** some interactions need a mouse.
- **Fix:** give the legend items a role or turn them into buttons, add Home/End key handling, and pair `onMouseEnter` with `onFocus`.
- **Done when:** everything is reachable and usable from the keyboard.

### [ ] 30 · Remove the unused `resolvedTheme`
- **Area:** portal · **Effort:** S
- **Where:** `components/ThemeProvider.tsx` (`resolvedTheme`, `ResolvedTheme`), the boot script in `app/layout.tsx`
- **Problem:** nothing reads `resolvedTheme`, and the boot script repeats the theme-resolve logic.
- **Fix:** remove the unused API, or share one resolver function with the boot script.
- **Done when:** there is no unused export left and the theme still has no flash on load.
