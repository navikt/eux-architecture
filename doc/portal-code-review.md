# Portal tasks: follow-up from the code review

This is a task list for `portal/` (Next.js) and `portal-core/` (Kotlin/Spring Boot). The items came out of a code review. The small issues were fixed in that review; these need more work.

## How to use this file (instructions for the AI)

When the user writes **`doc/portal-code-review.md next`**, do this:

1. **Pick** the first task whose heading starts with `[ ]`, top to bottom. Skip `[x]` (done) and `[!]` (blocked).
2. **Read** `README.md`, `.github/copilot-instructions.md` and every file listed under **Where**. Line references may be out of date, so search for the symbols named. If the code has changed and the problem no longer exists, mark the task `[x]`, note "Already resolved", and stop.
3. **Decide.** If the task says **Decision needed**, ask the user with the options given before changing anything. If the task turns out much bigger than its **Effort**, do a coherent first slice. Then add a new `[ ]` task right below it for the rest.
4. **Fix** only this task. Keep changes surgical, follow the existing code style, and do not start other tasks. Update docs that describe the code you changed (for example `portal/README.md`).
5. **Verify** with the commands for the area you touched, and make sure everything in **Done when** holds:
   - portal: `cd portal && pnpm typecheck && pnpm lint && pnpm test && pnpm build`
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

### [x] 17 · Port `TestsClient` to Aksel
- **Area:** portal · **Effort:** M
- **Where:** `app/tests/TestsClient.tsx`
- **Problem:** it uses styled-jsx, hex colours and raw `<button>` elements, so it does not follow dark mode or the house style.
- **Fix:** use Aksel components and `--ax-*` tokens. Check token names against `@navikt/ds-css`.
- **Done when:** there is no styled-jsx or hex colour left in the file and it works in light and dark mode.
- **Fixed:** 2026-10-21: done together with 18. The 816-line client is split into `TestsClient` (form and layout), `ResultSummary` (Aksel `Alert`, facts list, "Åpne i RINA" as a `Button` link), `Verifications` (Aksel `Accordion` and `Table`; groups with failures open by default) and `StepCard` (`aria-expanded`/`aria-controls` toggle, method `Tag`, payloads with Aksel `CopyButton`), plus `format.ts`. All styling is in a `tst-*` section of `globals.css` that uses only `--ax-*` tokens; there is no styled-jsx, hex colour or raw `<button>` left in `app/tests`. Compared with screenshots of the old page in headless Chrome, in light and dark mode.

### [x] 18 · Simplify the smoke-test route
- **Area:** portal · **Effort:** M · **Depends on:** 02
- **Where:** `app/api/tests/run/route.ts`
- **Problem:** every step repeats the same try, check and record code. One check compares timestamps as strings (`afterTs <= beforeTs`).
- **Fix:** write a `step(name, fn)` helper, and compare timestamps with `Date.parse`.
- **Done when:** the route is noticeably shorter, its behaviour and response shape are unchanged, and the build is green.
- **Fixed:** 2026-10-21: `route.ts` went from 1056 to 344 lines. The step plumbing moved to `runner.ts` (`SmokeRun.call`, `pollOversikt` and `verify` handle the timeout, try, record and skip logic), and the field checks moved to `checks.ts` (`verifyOversikt` and `verifyNavSed` loop over the address fields). `isLater` compares `sistEndretDatoTid` with `Date.parse` and returns null if either value is missing or invalid. Dead re-parsing of a string response in step 1 is removed. Tested against a fake eux-rina-api and token endpoint in 15 scenarios (happy path, failures in create/update/send, oversikt down, missing ids, text response, field mismatch, unchanged timestamp, SED not sent, bad or custom fnr, missing Q2 config, empty body, 415). Every executed step's JSON and every HTTP status is byte-identical to the old route. The only intended differences are in skipped steps: each step keeps one title and description, and step 8's skip reason names the id that is actually missing.

### [x] 19 · Use the same stats scope on every live page
- **Area:** portal · **Effort:** S
- **Where:** stats or summary blocks in the three live pages
- **Problem:** some pages count every row, others only the filtered rows.
- **Fix:** pick one rule (counting filtered rows is suggested), apply it on every page, and label it clearly.
- **Done when:** the pages are consistent.
- **Fixed:** 2026-10-20: done together with 15. All three heroes now count the filtered rows (search and toggles), and `LiveHero` takes a `filtered` flag that shows "Tallene under gjelder bare det som passer søket og filtrene." while a filter is active. The "av N" sub-line says "i utvalget" instead of "i minnet" when filtered. Checked in headless Chrome with `?miljo=q1` and `?status=sendt`.

### [x] 20 · Deduplicate the process pages
- **Area:** portal · **Effort:** L
- **Where:** `components/{avslutning,sletting,journalfoering,adresse}/*` (SystemFlow, StatusMachine, CaseJourney/Journey, `SlackReport`, `osloNow`/`until`/`r2`, schedule helpers, simulator ladder/presets) and `app/prosesser/*/page.tsx`
- **Problem:** the playback, time and schedule helpers, the Slack report and the page scaffolding are copied across four features.
- **Fix:** start with `components/process/time.ts` and the `SlackReport` component, then a generic flow and state-machine player. Do one slice per run and add the remaining slices as new tasks.
- **Done when:** the slice is extracted, every page using it looks the same as before, and the build is green.
- **Fixed:** 2026-10-21: first slice. `components/process/time.ts` now holds the only `r2`, `hhmm`, `klokke`, `until`, `MONTHS`, `osloNow` and the "next run" math (`nextDaily`, `nextOnDay`), and `useOsloNow()` replaces four copies of the ticking-clock effect in `NightPipeline`, `NightStrip`, `NightJobs` and `NightTimeline`. `components/process/Slack.tsx` (`SlackFigure`, `SlackMessage`, `SlackCode`) is used by both `SlackReport`s and the journalføring page's Slack feed, and its classes were renamed from `avs-slack*` to `proc-slack*`. Old and new helpers gave identical results for 33 544 timestamps over a year, and the prerendered HTML is identical apart from the class rename and the journalføring Slack caption, which now has the same subtle colour as the other two. The rest is task 20b.

### [x] 20b · Share the flow and state-machine players across the process pages
- **Area:** portal · **Effort:** L · **Depends on:** 20
- **Where:** `components/{avslutning,sletting,journalfoering,adresse}/` `SystemFlow.tsx`, `StatusMachine.tsx`, `CaseJourney.tsx`/`Journey.tsx`/`CaseStory.tsx`, the simulators (`DecisionSimulator.tsx`, `journalfoering/Simulator.tsx`) and the page scaffolding in `app/prosesser/*/page.tsx`
- **Problem:** the playback (play/pause/step, reduced motion), the state-machine layout and the simulator ladder/presets are still copied per feature.
- **Fix:** extract a generic player into `components/process/`, one component per run, and add the remaining slices as new tasks.
- **Done when:** the slice is extracted, every page using it looks the same as before, and the build is green.
- **Fixed:** 2026-10-21: second slice, the case-journey player. `useJourneyPlayer()` (`components/process/useJourneyPlayer.ts`) replaces the two copies of the rAF play/pause/scrub/reset/reduced-motion logic, with an optional `JourneyScale` so sletting's broken axis still plays at an even speed along x. `JourneyBar` (play button, scrubber and status readout) and `JourneyToken` live in `components/process/Journey.tsx`. Both `CaseJourney`s lost about 70 lines each, and their shared classes were renamed from `avs-journey__*`, `avs-status-pill` and `avs-breathe` to `proc-journey__*`, `proc-status-pill` and `proc-breathe`. The prerendered HTML of all 15 pages is identical apart from the renames and avslutning's scrubber `aria-valuetext`, which now reads "dag 520" like the visible label. In headless Chrome the bar, scrubber, readout and pill have the same position, size and colours as before in light and dark mode at 1280 and 600 px. Play, pause, resume, scrub, reset when the scenario changes, and the reduced-motion jump to the end all behave as before. The rest is task 20c.

### [x] 20c · Share the remaining process-page building blocks
- **Area:** portal · **Effort:** L · **Depends on:** 20b
- **Where:** `components/{avslutning,sletting,journalfoering,adresse}/SystemFlow.tsx` (`Port`, `Topic`, `Box` and the selection/hover props), the three `StatusMachine.tsx` (layout, detail panel), the simulators (`avslutning/DecisionSimulator.tsx`, `journalfoering/Simulator.tsx`: ladder and presets), the step players in `journalfoering/CaseStory.tsx` and `architecture/RequestFlow.tsx`, and the page scaffolding in `app/prosesser/*/page.tsx`
- **Problem:** these are still copied per feature with small differences.
- **Fix:** extract one building block per run into `components/process/` (start with the `SystemFlow` SVG primitives), and add the remaining slices as new tasks.
- **Done when:** the slice is extracted, every page using it looks the same as before, and the build is green.
- **Fixed:** 2026-10-21: third slice, the system-flow diagrams. `components/process/FlowCanvas.tsx` holds the SVG pieces: `FlowCanvas` (surface, SVG and arrow marker), `FlowEdge`, `EdgeLabel`, `Packets`, `Zone`, `Port`, `Topic` and `Box`. `useNodeSelection()` (`useNodeSelection.ts`) holds the click/hover/keyboard selection and dimming props, and `flowFilter()` the per-flow toggle. `FlowPanel.tsx` holds `FlowToolbar`, `DetailPanel`, `DetailHint` and `NodeDetail`. The four `SystemFlow`s went from 524/547/740/613 to 370/404/549/453 lines, and the shared classes were renamed from `avs-toolbar*`, `avs-hint`, `avs-detail*` and `avs-surface` to `proc-*`. The toolbar's `aria-live` text is no longer re-mounted on every toggle, so screen readers announce the change once. In headless Chrome, all 242 states (every toggle, node click, Enter and Lukk, in light and dark mode) have the same position, size, computed styles and SVG attributes as before. The prerendered HTML of all 15 pages is identical apart from the renames, `useId` values and the unstyled `avs-sys`/`adr-sys` wrapper class, which was removed. The rest is task 20d.

### [x] 20d · Share the state machines, simulators and step players
- **Area:** portal · **Effort:** L · **Depends on:** 20c
- **Where:** the three `StatusMachine.tsx` (layout; the detail panel can now use `DetailPanel`/`DetailHint` from `components/process/FlowPanel.tsx`), the simulators (`avslutning/DecisionSimulator.tsx`, `journalfoering/Simulator.tsx`: ladder and presets), the step players in `journalfoering/CaseStory.tsx` and `architecture/RequestFlow.tsx`, the near-identical Kafka-intake layout in the avslutning and sletting `SystemFlow`s, and the page scaffolding in `app/prosesser/*/page.tsx`
- **Problem:** these are still copied per feature with small differences.
- **Fix:** extract one building block per run into `components/process/`, and add the remaining slices as new tasks.
- **Done when:** the slice is extracted, every page using it looks the same as before, and the build is green.
- **Fixed:** 2026-10-21: fourth slice, the status machines. `components/process/StateMachine.tsx` holds `StateEdge` with one style table per edge kind (`plain`, `back`, `error`, `event`, `manual`), `stateFocus()` (which edges and nodes are lit or dimmed for a selection or filter), `StateCanvas` (surface, SVG and one marker per kind), `StateEdges` (path, flow, packet and origin dot), `StateLabels`, `StateNode`, `Lane`, `JobBadge`, `ActorList`/`toActors()` and `UnusedStatuses`. The three `StatusMachine`s went from 306/324/391 to 180/193/225 lines. The job badges are keyed by job id instead of a separate number table, avslutning's final statuses are a `final` flag in `data.ts`, and the avslutning and sletting detail panels use `DetailPanel`/`DetailHint`, so they gained the same "Lukk" button as journalføring. `avs-sm__badge`/`jfr-sm__badge` became `proc-sm__badge`, and `jfr-no--f`/`jfr-legend__f` became `data-tone="accent"`. In headless Chrome all 124 states (every node, filter and unused chip, in light and dark mode) are pixel-identical to before, except the "kaller RINA" lane pills in avslutning (width now follows the label, 5 px wider) and the origin dots, which now fade with their dimmed edge. The text is identical apart from "Lukk", and Lukk clears the selection. The rest is task 20e.

### [x] 20e · Share the simulators and step players
- **Area:** portal · **Effort:** L · **Depends on:** 20d
- **Where:** the simulators (`avslutning/DecisionSimulator.tsx`, `journalfoering/Simulator.tsx`: ladder and presets), the step players in `journalfoering/CaseStory.tsx` and `architecture/RequestFlow.tsx`, the near-identical Kafka-intake layout in the avslutning and sletting `SystemFlow`s, and the page scaffolding in `app/prosesser/*/page.tsx`
- **Problem:** these are still copied per feature with small differences.
- **Fix:** extract one building block per run into `components/process/`, and add the remaining slices as new tasks.
- **Done when:** the slice is extracted, every page using it looks the same as before, and the build is green.
- **Fixed:** 2026-10-21: fifth slice, the simulators. `components/process/Simulator.tsx` holds `SimPresets` (typed by `SimPreset<I>`), `SimForm`, `SimGroup`, `Ladder`, `Rung` (with an optional step number, value pill and status text), `RungText`, `SimResult`, `ResultStatus`, `ResultLabel`, `ResultFacts` and `ResultCaveat`. It is used by avslutning's `DecisionSimulator`, journalføring's `Simulator` and adresse's `AddressLab` and `NameMatch`, which went from 235/329/262/172 to 209/258/214/140 lines. The journalføring and adresse presets are `SimPreset[]` in `data.ts`, so their own `sameInput` copies are gone. The shared CSS is one "Simulator kit" block in `globals.css` that uses `proc-sim*`, `proc-preset*`, `proc-ladder`, `proc-rung*`, `proc-result*` and `proc-pop`. It replaces the `avs-sim`/`avs-ladder`/`avs-rung`/`avs-result` and `jfr-preset`/`jfr-sim__form`/`jfr-sim__group`/`jfr-rung`/`jfr-result` copies, along with their dark, responsive and reduced-motion overrides. The avslutning hit-rung and result-status pops now also stop under reduced motion. In headless Chrome, all 300 states (every preset, switch, select option, radio, button and the name-distance slider, in light and dark mode at 1280 px and light at 600 px) have the same position, size, computed styles and text as before, apart from the animation name. The rest is task 20f.

### [x] 20f · Share the step players, Kafka intake and page scaffolding
- **Area:** portal · **Effort:** L · **Depends on:** 20e
- **Where:** the step players in `journalfoering/CaseStory.tsx` and `architecture/RequestFlow.tsx`, the near-identical Kafka-intake layout in the avslutning and sletting `SystemFlow`s, and the page scaffolding in `app/prosesser/*/page.tsx`
- **Problem:** these are still copied per feature with small differences.
- **Fix:** extract one building block per run into `components/process/`, and add the remaining slices as new tasks.
- **Done when:** the slice is extracted, every page using it looks the same as before, and the build is green.
- **Fixed:** 2026-10-21: sixth and seventh slices, the step players and the job-service figure. `useStepPlayer()` (`components/process/useStepPlayer.ts`) replaces the two copies of the index/play/pause/auto-advance logic, and `StepButtons` (`StepButtons.tsx`) the two sets of «Forrige»/«Spill av»/«Neste» buttons, with an `emphasis` prop for the neutral journalføring variant. The avslutning and sletting `SystemFlow`s turned out to share the whole figure, not just the Kafka intake, so `JobServiceFlow.tsx` holds `useJobFlow()` (one flow/node-id set and lit-node table for both), `JobFlowCanvas` (Kafka zone, edges and labels), `jobFlowEdges()`, `jobPath()`, `JOB_PACKETS`, `RinaSystem` (with an optional crossed-out case for sletting), `KafkaIntake`, `ServiceBox`, `JobsBox`, `TerminatorBox` and `SlackBox`. The two `SystemFlow`s went from 370/404 to 231/243 lines and now hold only their job rows, terminator calls and texts; avslutning's service node id is `app` like sletting's. The prerendered HTML of all 15 pages is identical apart from build hashes. In headless Chrome all 302 states (every flow toggle, node click, Enter and Lukk on both figures, and Neste/Forrige/step clicks, variant switches, play, auto-advance and pause on both step players, in light and dark mode with reduced motion, and light with motion) match the old build, apart from animation frames caught mid-transition. The page scaffolding is task 20g.

### [x] 20g · Share the process-page scaffolding
- **Area:** portal · **Effort:** M · **Depends on:** 20f
- **Where:** `app/prosesser/*/page.tsx` (714/531/580/835 lines)
- **Problem:** the pages already use `Section`, `JumpNav` and `FurtherReading`, but each still has its own copy of `Snippet` (the `avs-snippet` copy-code block), the `PITFALLS` accordion ("Fallgruver"), the `GLOSSARY` list, the `REPOS` → GitHub "Videre" links, and the `{ group, items }`/`{ term, full, text }` types behind them.
- **Fix:** move these into shared components in `components/process/` (with a `proc-` class for the snippet), and add any remaining slices as new tasks.
- **Done when:** the scaffolding is shared, every process page looks the same as before, and the build is green.
- **Fixed:** 2026-10-22: `Pitfalls` (typed by `PitfallGroup`) and `Glossary` (typed by `GlossaryEntry`, moved from `components/architecture/glossary.ts`) live in `components/page/`, since `app/architecture/page.tsx` had the same copies, and `repoLinks()` in `FurtherReading.tsx` builds the GitHub "Videre" cards. `Snippet` (`proc-snippet`) and journalføring's `SubHead` (`proc-subhead`, now also used by avslutning's "Alle BUC-ene") live in `components/process/`, and `useScrollTo()` in `components/architecture/hooks.ts` replaces three copies of the reduced-motion-aware scroll callback. `avs-pitfalls` became `proc-pitfalls`. The four pages went from 714/531/580/835 to 676/485/538/779 lines and the architecture page from 563 to 535. The prerendered HTML of all 15 pages is identical apart from the three class renames and build ids, and the search index only lost the repeated "Kildekoden på GitHub." text (the repo names are still indexed).

### [x] 21 · Stop sharing CSS prefixes across features
- **Area:** portal · **Effort:** M · **Best after:** 20
- **Where:** `app/globals.css`, and the journalføring and adresse components that use `sl-*`, `avs-*` and `jfr-*` classes from other features
- **Problem:** changing one page's styles can break another page.
- **Fix:** rename the shared classes to a neutral prefix (for example `proc-*`).
- **Done when:** each feature uses only its own prefix or `proc-*`.
- **Note:** the Slack mock already uses `proc-slack*` (done in 20). The case journeys use `proc-journey__*`, `proc-status-pill` and `proc-breathe` (done in 20b), and the status chips use `proc-chip` and `proc-unused` (done with 22's `StatusChip` point). The toolbar, hint, detail panel and surface use `proc-toolbar*`, `proc-hint`, `proc-detail*` and `proc-surface` (done in 20c). The status-machine job badges use `proc-sm__badge`, and the fagmodul badge uses `data-tone="accent"` instead of `jfr-no--f`/`jfr-legend__f` (done in 20d). The simulators use `proc-sim*`, `proc-preset*`, `proc-ladder`, `proc-rung*`, `proc-result*` and `proc-pop` instead of the `avs-sim`/`avs-ladder`/`avs-rung`/`avs-result`/`avs-pop` and `jfr-preset`/`jfr-sim__form`/`jfr-sim__group`/`jfr-rung`/`jfr-result` classes (done in 20e). The copy snippet, subhead and pitfalls use `proc-snippet`, `proc-subhead` and `proc-pitfalls` (done in 20g). The `avs-legend*`, `avs-ops*`, `avs-note`, `avs-job__meta` and the `sl-*`/`jfr-*` classes used across features remain.
- **Fixed:** 2026-10-22: the rest of the cross-feature classes are `proc-*`: `proc-page`, `proc-errors`/`proc-err*`, `proc-code`, `proc-cron`, `proc-diffcell`, `proc-jobtable`, `proc-note`, `proc-topics`, `proc-ops*`, `proc-legend*`, `proc-facts` (was `avs-job__meta`), `proc-jobno` (was `avs-night__no`), `proc-jobflow` (was `avs-job__flow`), `proc-jobs`/`proc-job*` and `proc-night__now`/`__job` (were `sl-*`), and `proc-seq__*` with the `proc-step-in`/`proc-packet`/`proc-ping` keyframes (were `sl-seq__*`/`sl-*`). All `proc-*` rules, including their dark, responsive and reduced-motion overrides, now sit in one «Process pages (proc-*)» section of `globals.css` before the feature sections, which keep only their own prefix and their overrides of `proc-*` classes. The repeated markup behind these classes is now shared: `Jobs.tsx` (`JobCard`, `JobNo`, `JobFlow`) for the sletting and journalføring job lists and the avslutning pipeline, `Facts.tsx` (`Facts`, `Fact`) for the nine labelled lists, `Ops.tsx` (`OpsGrid`, `OpsColumn`, `OpsCard`, `OpsValues`) for the four «Drift» sections, and `StateLegend`/`LegendItem`/`LegendBadge`/`LegendMark` in `StateMachine.tsx` for the three status-machine keys. The search index also reads `term=` attributes, so the metric names and fact labels are still indexed. In headless Chrome all 128 states (every job hover, accordion, status-machine node and sequence step on the four pages, in light and dark mode at 1280 px and light at 600 px) have the same position, size, computed styles and text as before. No class from the rename list is used outside the process pages, and no feature uses another feature's prefix.

### [x] 22 · Clean up leftovers in the process pages
- **Area:** portal · **Effort:** S–M · **Best after:** 20
- **Where:** `components/{journalfoering,adresse,sletting}/*`
- **Problem:**
  - ~~an inline `StatusChip` copy~~ (done 2026-10-21: `components/process/StatusChips.tsx` has `StatusChip` and a generic `StatusChips`; the three feature `StatusChips` are thin wrappers that bind their `STATUS_BY_ID`, the unused `active` prop is gone, and the inline chips in `journalfoering/CaseStory`, `sletting/RinaSequence` and both "brukes ikke" rows in the status machines use `StatusChip`. All 61 chips on the three pages have the same position, size and colours in light and dark mode.)
  - ~~`SET_BY_ACTOR`~~ (done 2026-10-21 in 20d: journalføring's `ACTORS` table holds each actor's name and title, and the edges list their actor ids in `by`, so `ACTOR_TEXT` and `SET_BY_ACTOR` are gone.)
  - ~~three `JSON.stringify` comparators~~ (done 2026-10-21 in 20e: `lib/equal.ts` has a structural `deepEqual` that ignores key order. `SimPresets` uses it to mark the pressed preset, and journalføring's `CaseStory` uses it to compare inputs, so the journalføring and adresse `sameInput` and the `CaseStory` `same` are gone.)
  - ~~sletting copy that describes the deletion rules inaccurately~~ (done 2026-10-22, see below.)
  - ~~Journey rendering each scene twice~~ (done 2026-10-22, see below.)
- **Fix:** handle each point; check the sletting copy against `eux-slett-usendte-rinasaker` in README.md.
- **Done when:** every point is handled.
- **Fixed:** 2026-10-22: checked every sletting text against `origin/main` of eux-slett-usendte-rinasaker, its naisjob and eux-rina-terminator-api. The sletting page itself was accurate. The inaccurate copy was outside it: the summary in `components/architecture/data.ts`, the `EventMetro` station and the four «Videre» cards (architecture, avslutning, journalføring, adresse) said a case is deleted when no SED is *sent*, but `SENT_DOCUMENT` and `RECEIVE_DOCUMENT` both stop it. They now say «sendt eller mottatt», and `EventMetro` adds that RINA must allow it (Delete_Case). README.md had the same wording and is fixed too. The adresse `Journey` no longer renders each scene twice: the new `useMediaQuery()` in `components/architecture/hooks.ts` (which `useReducedMotion` now uses) returns `null` until hydration, so the server HTML still has both layouts and CSS picks one, and after hydration only the sticky stage (wide) or the inline scenes (≤ 1000 px) are rendered. In headless Chrome there are 8 stage scenes and 0 inline scenes at 1280 px and the reverse at 800 px, and the scroll-linked active step and stage still match. The search index still has 84 entries.

## portal: data that can drift

### [x] 23 · Validate the node ids in `ENV_SERVICES`
- **Area:** portal · **Effort:** S
- **Where:** `components/miljoer/data.ts` (`ENV_SERVICES`), `components/architecture/data.ts` (`NODE_BY_ID`)
- **Problem:** the keys are plain strings, so a typo or a renamed node fails silently.
- **Fix:** type the keys as node ids, or add a test next to the existing search tests.
- **Done when:** an invalid id fails typecheck or tests.
- **Fixed:** 2026-10-22: new `scripts/data.test.mjs` (`pnpm test:data`) checks that every `ENV_SERVICES` id is an app in `NODE_BY_ID` and is listed once. The new `pnpm test` runs every `scripts/*.test.mjs`, and CI and the verify step above now use it. Renaming `eux-journal` to `eux-jornal` fails with "eux-jornal is not a node in components/architecture/data.ts".

### [x] 24 · Make the "previous job" logic explicit
- **Area:** portal · **Effort:** S
- **Where:** `components/architecture/NightTimeline.tsx` (`g.chain && idx > 1 && idx < 6`)
- **Problem:** the logic depends on the jobs' positions, so adding or reordering a job breaks it silently.
- **Fix:** add an `after?: jobId` field to each job and use it.
- **Done when:** the hardcoded index range is gone and the timeline looks the same as before.
- **Fixed:** 2026-10-22: the four chained avslutt-rinasaker jobs name their predecessor in `after`, and `Group.chain`, the row index and the index range are gone. Each group's jobs go through a `jobs()` helper that types `after` as `NoInfer<N>`, so a misspelt job name fails typecheck. The arrow now starts at the predecessor's actual row, not always the row above. The prerendered `/architecture` HTML is identical to before.

### [x] 25 · Keep the hero text in one place
- **Area:** portal · **Effort:** S
- **Where:** the hero paragraphs in `app/page.tsx` and `app/architecture/page.tsx`
- **Problem:** the same text is maintained twice.
- **Fix:** move it into a shared constant.
- **Done when:** the text has a single source.
- **Fixed:** 2026-10-20: both heroes render `PLATFORM_INTRO` from `components/architecture/data.ts`. `scripts/search-index.mjs` now resolves exported string constants imported with `@/…`, so the search index stays byte-identical and the visible prerendered HTML is unchanged.

### [x] 26 · Stop hardcoding the copy-link URL
- **Area:** portal · **Effort:** S
- **Where:** `components/nytt-i-neessi/NyttINeessi.tsx` (`PAGE_URL`)
- **Problem:** the copy-link button always copies the dev URL.
- **Fix:** build the URL from `window.location.origin` when the button is clicked.
- **Done when:** the copied link matches the current host.
- **Fixed:** 2026-10-22: `PAGE_URL` is replaced by `PAGE_PATH`, and the button gets `new URL(PAGE_PATH, window.location.origin)` through `useSyncExternalStore` (the server renders the path). In headless Chrome the button copied `http://localhost:3917/nytt-i-neessi` and `http://127.0.0.1:3917/nytt-i-neessi` on the two hosts, without the `#tidslinje` the page was opened with.

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
