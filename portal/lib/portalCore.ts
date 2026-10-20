import "server-only";

/**
 * Proxies for the live monitor APIs served by portal-core
 * (`EUX_PORTAL_CORE_BASE_URL`).
 */

function portalCoreBaseUrl(): string | undefined {
  return process.env.EUX_PORTAL_CORE_BASE_URL;
}

/** Forwards a JSON GET, passing through only the allowlisted query params. */
export async function proxyPortalCoreJson(
  request: Request,
  path: string,
  allowedParams: readonly string[],
): Promise<Response> {
  const baseUrl = portalCoreBaseUrl();
  if (!baseUrl) {
    return Response.json({ error: "portal-core ikke konfigurert" }, { status: 503 });
  }

  const incoming = new URL(request.url).searchParams;
  const params = new URLSearchParams();
  for (const name of allowedParams) {
    const value = incoming.get(name);
    if (value) params.set(name, value);
  }

  try {
    const res = await fetch(`${baseUrl}${path}?${params}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      return Response.json({ error: "Feil fra portal-core" }, { status: res.status });
    }
    return Response.json(await res.json());
  } catch {
    return Response.json({ error: "Kan ikke nå portal-core" }, { status: 502 });
  }
}

/** Pipes a server-sent events stream through to the browser. */
export async function proxyPortalCoreStream(request: Request, path: string): Promise<Response> {
  const baseUrl = portalCoreBaseUrl();
  if (!baseUrl) {
    return new Response("portal-core not configured", { status: 503 });
  }

  try {
    const upstream = await fetch(`${baseUrl}${path}`, {
      cache: "no-store",
      headers: { Accept: "text/event-stream" },
      signal: request.signal,
    });
    if (!upstream.ok || !upstream.body) {
      return new Response("upstream unavailable", { status: 502 });
    }
    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch {
    return new Response("upstream connection failed", { status: 502 });
  }
}
