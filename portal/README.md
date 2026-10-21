# EUX Architecture Portal

A small Next.js / React / TypeScript / Aksel web app that explains the EUX (EESSI) platform: what the services are, how they talk to each other, and where to find Swagger/OpenAPI specs and other developer resources.

Ingress (dev): https://eux-docs.intern.dev.nav.no

## Stack

- Next.js 16 (App Router, standalone output)
- React 19
- TypeScript
- [@navikt/ds-react](https://aksel.nav.no/) 8 (Aksel)
- pino + @navikt/next-logger
- prom-client (Prometheus metrics on `/api/internal/metrics`)

## Live monitors

Besides the static architecture docs, the portal hosts a few live monitors backed by
**portal-core** (Kotlin/Spring Boot). The frontend proxies to portal-core via
`EUX_PORTAL_CORE_BASE_URL` and streams updates over SSE. portal-core has no
ingress; it is reachable only from the portal inside the cluster.

| Page | Route | Source | Purpose |
|---|---|---|---|
| SED-hendelser | `/kafka/sed-hendelser` | Kafka (`sedmottatt`/`sedsendt` Q1/Q2) | Live feed of SED events sent/received. |
| SED-kobling | `/kafka/sed-kobling` | Kafka (same topics) | Pairs the Q1→Q2 round-trip of a SED. |
| SED-er i nEESSI | `/nav-rinasak/sed-er` | Polls **eux-nav-rinasak** (Q1/Q2) | SEDs *created* in nEESSI, highlighting those **not yet sent**. Sent-status is correlated (best-effort) against the `sedsendt` Kafka events. |

Each live page gets its data from `useLiveFeed` (`components/live/hooks.ts`):
the snapshot plus the SSE stream, with the snapshot refetched after every
reconnect. Stream events that arrive while a snapshot is loading are replayed
after it, so the event handlers must be idempotent. The table, with its
loading, error, empty and no-hits states and day grouping, is the generic
`LiveTable` in `components/live/LiveTable.tsx`, driven by a column list. The
hero stats count only the rows that match the current search and filters, and
say so while a filter is active.

Screen-reader announcements live in `components/live/announce.tsx`. New rows
that pass the filters are announced as one summary ("3 nye hendelser"): a
burst within a second is one announcement, and a steady stream gives at most
one every 5 s. The toolbar hit count is announced only after the search or a
filter changes, never because rows streamed in.

The **SED-er i nEESSI** page relies on portal-core polling
`eux-nav-rinasak`'s `GET /api/v1/rinasaker/nyeste` per environment (Azure AD
client-credentials). This requires the outbound access policy + `NAVRINASAK_*`
env vars in `portal-core/.nais/nais.yaml` and a matching inbound rule on
eux-nav-rinasak.

## Smoke test

`/tests` runs a round trip against eux-rina-api through
`POST /api/tests/run` (`app/api/tests/run/route.ts`). Each run creates a real
RINA case, so the route requires `Content-Type: application/json` (otherwise
415) and allows one run at a time per pod (otherwise 409). Upstream error
details are logged on the server and never returned to the browser.

The route is split in three: `route.ts` holds the guard and the eight steps,
`runner.ts` (`SmokeRun`) runs the HTTP calls, polling and recording, and
`checks.ts` holds the field checks. To add a step, call `run.call(...)` or
`run.pollOversikt(...)` and then `run.verify(...)`. The page
(`app/tests/TestsClient.tsx` plus `ResultSummary`, `Verifications` and
`StepCard`) uses Aksel components and the `tst-*` classes in `globals.css`.

## Portal frame

The left sidebar (`components/Sidebar.tsx`) holds the brand, the navigation and,
at the bottom, the profile area (`components/UserMenu.tsx`). On small screens it
collapses into a compact bar with a menu button.

`lib/navigation.ts` is the single list of pages (`NAVIGATION`). The sidebar
renders it, the search index is generated from it, and `start: true` puts a
page in the command menu's start list. The home page cards refer to pages by
`page: PageHref`, so a typo or a removed page fails typecheck. To add a page,
add it to `NAVIGATION` and, if it should appear on the home page, to `AREAS`
in `app/page.tsx`.

### Command search

Open **Søk i portalen** in the sidebar, or press **Cmd+K** (macOS) /
**Ctrl+K**. Search page content, documentation sections and services, with
typo tolerance and Norwegian/ASCII equivalents (`journalføring` /
`journalforing`). Use the arrow keys and Enter to navigate; Escape or a click
outside closes the menu. Category filters, contextual previews and direct
section links help narrow down results. The menu supports small screens,
both themes and reduced-motion preferences.

Search runs entirely in the browser; queries are not sent to a server or saved.
`scripts/search-index.mjs` generates `lib/search-index.json` before dev, build
and typecheck from the internal routes in `lib/navigation.ts`, page text and allowlisted
documentation components. Service entries reuse the architecture model.
Hidden pages and live/user data are not indexed; protected pages are listed
only by their navigation labels and marked as requiring login.
When adding a documentation component directory, add it to `componentFolders`
in the generator. Page sections use the shared `Section` from
`components/page/Section.tsx`; each `<Section>` with literal `id` and `title`
props becomes its own search hit linking to `#id`. Exported string constants
imported with `@/…` (such as `PLATFORM_INTRO`) are indexed where they are
rendered as `{CONSTANT}`. Restart dev (or run
`pnpm search:index`) to refresh the index after editing documentation.

### Page building blocks

Documentation pages share their scaffolding from `components/page/`:
`Section`, `JumpNav` (the sticky "Innhold på siden" bar with scroll spy),
`HeroStats` (the key figures in the hero), `FurtherReading` (the "Videre"
link cards, typed by `FurtherLink`) and `ExtLink` (an inline link that opens
in a new tab).

The process pages (`app/prosesser/*`) and the night timeline share
`components/process/`: `time.ts` (Oslo clock, `klokke`/`hhmm`, `until`, and
`nextDaily`/`nextOnDay` for "next run" labels), `useOsloNow()` (a ticking
Oslo clock that is null until hydration), `Slack.tsx` (`SlackFigure`,
`SlackMessage` and `SlackCode` for the Slack mocks, styled by `proc-slack*`),
`useJourneyPlayer()` with `Journey.tsx` (`JourneyBar` and `JourneyToken`) for
the play/pause/scrub case journeys (`proc-journey*`), and `StatusChips.tsx`
(`StatusChip`, `StatusChips`; `proc-chip`). The system-flow diagrams are
built from `FlowCanvas.tsx` (`FlowCanvas`, `FlowEdge`, `EdgeLabel`, `Packets`,
`Zone`, `Port`, `Topic`, `Box`), `useNodeSelection()`/`flowFilter()` for
selection and flow toggles, and `FlowPanel.tsx` (`FlowToolbar`, `DetailPanel`,
`DetailHint`, `NodeDetail`; `proc-toolbar`, `proc-detail`). Avslutning and
sletting draw the same system figure, so their `SystemFlow`s are built from
`JobServiceFlow.tsx`: `useJobFlow()` (flow picker, selection and lit/dim
state), `JobFlowCanvas` (Kafka zone, edges from `jobFlowEdges()` and edge
labels), `RinaSystem`, `KafkaIntake`, `ServiceBox`, `JobsBox`, `TerminatorBox`
and `SlackBox`, plus `jobPath()` and `JOB_PACKETS`. Each page passes in only
its job rows, terminator calls and texts. The step-by-step players (the
journalføring case story and the request flow on `/architecture`) use
`useStepPlayer()` with `StepButtons` («Forrige», «Spill av», «Neste»). The status machines
are built from `StateMachine.tsx` (`StateCanvas`, `StateEdges`, `StateLabels`,
`StateNode`, `Lane`, `JobBadge` (`proc-sm__badge`), `ActorList`,
`UnusedStatuses`, and `stateFocus()` for which edges and nodes to light up).
The four simulators are built from `Simulator.tsx`: `SimPresets` (the "Prøv"
examples, typed by `SimPreset`; the pressed one is found with `deepEqual` from
`lib/equal.ts`), `SimForm` and `SimGroup` for the inputs, `Ladder`, `Rung` and
`RungText` for the steps or criteria, and `SimResult`, `ResultStatus`,
`ResultLabel`, `ResultFacts` and `ResultCaveat` for the result card
(`proc-sim*`, `proc-presets`, `proc-ladder`, `proc-rung*`, `proc-result*`).
New styles shared between process pages use the `proc-` prefix rather than
another feature's prefix.

### Logged-in user

The portal is open to anyone with the URL. Only the smoke test (`/tests`) and
the live pages (`/kafka/**`, `/nav-rinasak/**`) and their APIs require login;
everything else is listed under `autoLoginIgnorePaths` in `.nais/nais.yaml`.
New public pages must be added there, and protected pages get
`requiresLogin: true` in `lib/navigation.ts`, which shows a padlock in the
sidebar and on the home page.

`public/missoc.html` is a hidden, standalone static page. It makes no
third-party requests: its fonts (Inter and Fraunces from Fontsource, SIL OFL)
and flags (4:3 SVGs from `flag-icons`, MIT) are self-hosted in
`public/missoc/` with their licence files. To add a country, copy its
`flags/4x3/<iso>.svg` from the `flag-icons` npm package into
`public/missoc/flags/`.

Login is handled by the NAIS login proxy (Wonderwall, Entra ID). Once a session
exists, Wonderwall forwards the user's access token in the `Authorization`
header on every request — also on paths excluded from autologin.

- `GET /api/me` (`app/api/me/route.ts`) validates that token through Texas'
  introspection endpoint (`NAIS_TOKEN_INTROSPECTION_ENDPOINT`,
  `lib/currentUser.ts`) and returns `name`, `email` (`preferred_username`) and
  `navIdent` (`NAVident`), or `{ "user": null }`. It is listed under
  `autoLoginIgnorePaths` so anonymous visitors get JSON instead of a 401.
- The profile area shows the user (initials, name, NAV-ident) with a menu for
  copying the NAV-ident, switching account (`/oauth2/login?prompt=select_account`)
  and logging out (`/oauth2/logout`). The session end time comes from
  `/oauth2/session`. Anonymous visitors get a "Logg inn" link.
- Locally (no `NAIS_TOKEN_INTROSPECTION_ENDPOINT`, `NODE_ENV !== production`)
  `/api/me` returns a placeholder user marked "lokal".

## Theming (light / dark)

The portal supports light, dark and system themes, switchable from the small
icon button next to the user in the bottom of the sidebar
(`components/ThemeToggle.tsx`, an Aksel `ActionMenu` with a radio group).

- `components/ThemeProvider.tsx` holds the preference in `localStorage`
  (`portal-theme`) and exposes it via `useSyncExternalStore` (hydration-safe, no
  setState-in-effect). It renders Aksel's `<Theme>` with the resolved theme.
- An inline boot script in `app/layout.tsx` sets the `light`/`dark` class on
  `<html>` before first paint, so the Aksel design tokens cascade with no flash.
- **Diagrams/figures are theme-aware.** Every SVG fill, stroke and text colour is
  driven from Aksel `--ax-*` tokens (e.g. `var(--ax-bg-accent-soft)`,
  `var(--ax-border-accent)`, `var(--ax-text-default)`), so figures re-theme
  themselves in dark mode. Diagrams are framed by the shared `portal-diagram`
  CSS class. Arrow labels use a `var(--ax-bg-raised)`
  halo and arrowheads use `fill="context-stroke"` to match their line colour.
- **SVG ids are scoped per diagram.** Markers, gradients, clip paths and motion
  paths get their ids from `useSvgIds()` in `components/architecture/hooks.ts`
  (`svg.id("arrow")`, `svg.url("arrow")`, `svg.href("route-1")`), which builds
  on React `useId()`. Never hardcode `id="…"`/`url(#…)` in an inline SVG: two
  diagrams on one page would resolve each other's defs.
- Prefer Aksel `--ax-*` tokens over hardcoded colours so UI adapts automatically.
  Verify token names against `@navikt/ds-css/dist/global/tokens.css` first — a
  non-existent token (e.g. `--ax-bg-subtle`) silently falls back to its light
  hex and breaks dark mode. Real subtle-surface tokens: `--ax-bg-neutral-soft`,
  `--ax-bg-raised`, `--ax-bg-sunken`.

## Local development

```bash
pnpm install
pnpm dev
```

Then open http://localhost:3000.

To resolve `@navikt/*` packages from GitHub Packages locally, set `READER_TOKEN` to a PAT with `read:packages`:

```bash
export READER_TOKEN=ghp_xxx
pnpm install
```

## Scripts

| Script | What it does |
|---|---|
| `pnpm dev` | Run the dev server |
| `pnpm build` | Production build (`.next/standalone`) |
| `pnpm start` | Run the production build |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm test:search` | Search ranking, typo tolerance, content indexing and privacy checks |

## Deployment

Single deployment in `dev-gcp` (no q1/q2/prod) — this is a documentation portal.

- Workflow: `.github/workflows/portal-build-deploy.yaml`
- NAIS manifest: `portal/.nais/nais.yaml`
- Env overrides: `portal/.nais/dev.yaml`

The build pushes a container image to GAR and deploys it to NAIS on every push to `main` that touches `portal/**`.

CI runs `pnpm build` once. `portal/Dockerfile` is runtime-only: it copies `.next/standalone`, `.next/static` and `public` from that build (`.dockerignore` excludes everything else), so run `pnpm build` before `docker build` locally.
