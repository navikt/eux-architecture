import "server-only";

import pino from "pino";

const isProd = process.env.NODE_ENV === "production";

export const log = pino({
  level: process.env.LOG_LEVEL ?? (isProd ? "info" : "debug"),
  base: {
    app: "eux-architecture-portal",
    env: process.env.NEXT_PUBLIC_ENV ?? "local",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
});
