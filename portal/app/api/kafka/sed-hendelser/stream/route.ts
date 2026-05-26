export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const portalCoreUrl = process.env.EUX_PORTAL_CORE_BASE_URL;
  if (!portalCoreUrl) {
    return new Response("portal-core not configured", { status: 503 });
  }

  try {
    const upstream = await fetch(
      `${portalCoreUrl}/api/kafka/sed-hendelser/stream`,
      {
        headers: { Accept: "text/event-stream" },
        signal: request.signal,
      },
    );

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
