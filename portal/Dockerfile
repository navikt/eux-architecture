# syntax=docker/dockerfile:1.10

# Runtime-only image. CI runs `pnpm build` once and this image copies the
# standalone output, so nothing is installed or built here.
FROM europe-north1-docker.pkg.dev/cgr-nav/pull-through/nav.no/node:22-slim

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    TZ=Europe/Oslo \
    NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

COPY --chown=nonroot:nonroot .next/standalone ./
COPY --chown=nonroot:nonroot .next/static ./.next/static
COPY --chown=nonroot:nonroot public ./public

USER nonroot
EXPOSE 3000

CMD ["server.js"]
