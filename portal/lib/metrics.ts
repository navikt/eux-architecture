import "server-only";

import { collectDefaultMetrics, Registry, type Metric } from "prom-client";

declare global {
  var __PORTAL_METRICS_REGISTRY__: Registry | undefined;
}

function createRegistry(): Registry {
  const registry = new Registry();
  registry.setDefaultLabels({
    app: "eux-architecture-portal",
    env: process.env.NEXT_PUBLIC_ENV ?? "local",
  });
  collectDefaultMetrics({ register: registry });
  return registry;
}

export const registry: Registry =
  globalThis.__PORTAL_METRICS_REGISTRY__ ??
  (globalThis.__PORTAL_METRICS_REGISTRY__ = createRegistry());

export function register(metric: Metric): void {
  registry.registerMetric(metric);
}
