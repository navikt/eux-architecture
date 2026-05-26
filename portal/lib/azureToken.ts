import "server-only";

import { log } from "./log";

/**
 * Minimal Azure AD client_credentials helper for outbound calls from
 * the portal to other NAIS-internal apps. Mirrors what
 * `eux-rina-gateway-api-test`'s `GatewayConfig` does in Kotlin.
 *
 * Reads the standard NAIS-injected env vars
 * (`AZURE_OPENID_CONFIG_TOKEN_ENDPOINT`, `AZURE_APP_CLIENT_ID`,
 * `AZURE_APP_CLIENT_SECRET`) and posts a `grant_type=client_credentials`
 * request with `client_secret_basic` authentication. The returned
 * access token is cached in-memory until ~60 s before expiry.
 */
type CachedToken = {
  token: string;
  expiresAt: number;
};

const cache = new Map<string, CachedToken>();

export class AzureTokenError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AzureTokenError";
  }
}

export async function getClientCredentialsToken(scope: string): Promise<string> {
  const now = Date.now();
  const hit = cache.get(scope);
  if (hit && hit.expiresAt > now) return hit.token;

  const tokenUrl = process.env.AZURE_OPENID_CONFIG_TOKEN_ENDPOINT;
  const clientId = process.env.AZURE_APP_CLIENT_ID;
  const clientSecret = process.env.AZURE_APP_CLIENT_SECRET;
  if (!tokenUrl || !clientId || !clientSecret) {
    throw new AzureTokenError(
      "Azure AD client_credentials env vars missing — running outside NAIS?",
    );
  }

  const body = new URLSearchParams();
  body.set("grant_type", "client_credentials");
  body.set("scope", scope);

  const basic = Buffer.from(
    `${encodeURIComponent(clientId)}:${encodeURIComponent(clientSecret)}`,
  ).toString("base64");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(tokenUrl, {
      method: "POST",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new AzureTokenError(
        `Azure AD token endpoint returned ${res.status}: ${text.slice(0, 300)}`,
      );
    }
    const json = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!json.access_token) {
      throw new AzureTokenError("Azure AD token endpoint returned no access_token");
    }
    const ttl = (json.expires_in ?? 3600) * 1000;
    cache.set(scope, {
      token: json.access_token,
      expiresAt: now + ttl - 60_000,
    });
    return json.access_token;
  } catch (err) {
    log.warn(
      { err: (err as Error).message, scope },
      "client_credentials token failed",
    );
    throw err instanceof AzureTokenError
      ? err
      : new AzureTokenError("client_credentials token request failed", err);
  } finally {
    clearTimeout(timeout);
  }
}
