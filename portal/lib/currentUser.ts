import "server-only";

import { log } from "./log";

/**
 * The employee logged in through the NAIS login proxy (Wonderwall, Entra ID).
 *
 * Wonderwall forwards the user's access token in the `Authorization` header on
 * every request once a session exists — also on paths excluded from autologin.
 * The token is validated through Texas' introspection endpoint
 * (`NAIS_TOKEN_INTROSPECTION_ENDPOINT`), which also returns its claims.
 */
export type CurrentUser = {
  name: string;
  email: string | null;
  navIdent: string | null;
  /** True when served by the local development fallback (not a real login). */
  mock?: boolean;
};

type IntrospectionResponse = {
  active: boolean;
  error?: string;
  name?: string;
  preferred_username?: string;
  NAVident?: string;
};

const DEV_USER: CurrentUser = {
  name: "Lokal Utvikler",
  email: "utvikler@nav.no",
  navIdent: "Z999999",
  mock: true,
};

function bearerToken(authorization: string | null): string | null {
  if (!authorization) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return match?.[1] ?? null;
}

export async function getCurrentUser(
  authorization: string | null,
): Promise<CurrentUser | null> {
  const endpoint = process.env.NAIS_TOKEN_INTROSPECTION_ENDPOINT;
  if (!endpoint) {
    // Outside NAIS there is no login proxy; show a placeholder user in dev only.
    return process.env.NODE_ENV === "production" ? null : DEV_USER;
  }

  const token = bearerToken(authorization);
  if (!token) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        identity_provider: "entra_id",
        token,
      }).toString(),
    });
    if (!res.ok) {
      log.warn({ status: res.status }, "token introspection failed");
      return null;
    }
    const claims = (await res.json()) as IntrospectionResponse;
    if (!claims.active) {
      log.info({ error: claims.error }, "inactive user token");
      return null;
    }
    const email = claims.preferred_username ?? null;
    return {
      name: claims.name ?? email ?? claims.NAVident ?? "Ukjent bruker",
      email,
      navIdent: claims.NAVident ?? null,
    };
  } catch (err) {
    log.warn({ err: (err as Error).message }, "token introspection error");
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
