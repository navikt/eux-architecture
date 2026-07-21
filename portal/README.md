# EUX Architecture Portal

A small Next.js / React / TypeScript / Aksel web app that explains the EUX (EESSI) platform: what the services are, how they talk to each other, and where to find Swagger/OpenAPI specs and other developer resources.

Ingress (dev): https://eux-docs.intern.dev.nav.no

## Stack

- Next.js 16 (App Router, standalone output)
- React 19
- TypeScript 5.7
- [@navikt/ds-react](https://aksel.nav.no/) 8 (Aksel)
- pino + @navikt/next-logger
- prom-client (Prometheus metrics on `/api/internal/metrics`)

## Live monitors

Besides the static architecture docs, the portal hosts a few live monitors backed by
**portal-core** (Kotlin/Spring Boot). The frontend proxies to portal-core via
`EUX_PORTAL_CORE_BASE_URL` and streams updates over SSE.

| Page | Route | Source | Purpose |
|---|---|---|---|
| SED-hendelser | `/kafka/sed-hendelser` | Kafka (`sedmottatt`/`sedsendt` Q1/Q2) | Live feed of SED events sent/received. |
| SED-kobling | `/kafka/sed-kobling` | Kafka (same topics) | Pairs the Q1→Q2 round-trip of a SED. |
| SED-er i nEESSI | `/nav-rinasak/sed-er` | Polls **eux-nav-rinasak** (Q1/Q2) | SEDs *created* in nEESSI, highlighting those **not yet sent**. Sent-status is correlated (best-effort) against the `sedsendt` Kafka events. |

The **SED-er i nEESSI** page relies on portal-core polling
`eux-nav-rinasak`'s `GET /api/v1/rinasaker/nyeste` per environment (Azure AD
client-credentials). This requires the outbound access policy + `NAVRINASAK_*`
env vars in `portal-core/.nais/nais.yaml` and a matching inbound rule on
eux-nav-rinasak.

## Theming (light / dark)

The portal supports light, dark and system themes, switchable from the header
(`components/ThemeToggle.tsx`, an Aksel `ToggleGroup`).

- `components/ThemeProvider.tsx` holds the preference in `localStorage`
  (`portal-theme`) and exposes it via `useSyncExternalStore` (hydration-safe, no
  setState-in-effect). It renders Aksel's `<Theme>` with the resolved theme.
- An inline boot script in `app/layout.tsx` sets the `light`/`dark` class on
  `<html>` before first paint, so the Aksel design tokens cascade with no flash.
- **Diagrams/figures are theme-aware.** Every SVG fill, stroke and text colour is
  driven from Aksel `--ax-*` tokens (e.g. `var(--ax-bg-accent-soft)`,
  `var(--ax-border-accent)`, `var(--ax-text-default)`), so figures re-theme
  themselves in dark mode. `components/DiagramSurface.tsx` is just a neutral,
  theme-aware card that frames them. Arrow labels use a `var(--ax-bg-raised)`
  halo and arrowheads use `fill="context-stroke"` to match their line colour.
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

## Deployment

Single deployment in `dev-gcp` (no q1/q2/prod) — this is a documentation portal.

- Workflow: `.github/workflows/portal-build-deploy.yaml`
- NAIS manifest: `portal/.nais/nais.yaml`
- Env overrides: `portal/.nais/dev.yaml`

The build pushes a container image to GAR and deploys it to NAIS on every push to `main` that touches `portal/**`.
