# syntax=docker/dockerfile:1.10

# ---------- Build stage ----------
FROM node:22-alpine AS builder

ENV CI=true \
    NEXT_TELEMETRY_DISABLED=1 \
    PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH

RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /app

COPY package.json .npmrc ./
COPY pnpm-lock.yaml* ./
RUN --mount=type=secret,id=READER_TOKEN,env=READER_TOKEN \
    pnpm install --no-frozen-lockfile

COPY . .
RUN pnpm build

# ---------- Runtime stage ----------
FROM gcr.io/distroless/nodejs22-debian12:nonroot

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    TZ=Europe/Oslo \
    NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

COPY --from=builder --chown=nonroot:nonroot /app/.next/standalone ./
COPY --from=builder --chown=nonroot:nonroot /app/.next/static ./.next/static
COPY --from=builder --chown=nonroot:nonroot /app/public ./public

USER nonroot
EXPOSE 3000

CMD ["server.js"]
