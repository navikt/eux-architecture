# EUX Architecture Portal

A small Next.js / React / TypeScript / Aksel web app that explains the EUX (EESSI) platform: what the services are, how they talk to each other, and where to find Swagger/OpenAPI specs and other developer resources.

Ingress (dev): https://architecture.intern.dev.nav.no

## Stack

- Next.js 16 (App Router, standalone output)
- React 19
- TypeScript 5.7
- [@navikt/ds-react](https://aksel.nav.no/) 8 (Aksel)
- pino + @navikt/next-logger
- prom-client (Prometheus metrics on `/api/internal/metrics`)

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
