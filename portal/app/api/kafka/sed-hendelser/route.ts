import "server-only";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const portalCoreUrl = process.env.EUX_PORTAL_CORE_BASE_URL;
  if (!portalCoreUrl) {
    return Response.json(
      { error: "portal-core ikke konfigurert" },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const params = new URLSearchParams();
  const env = url.searchParams.get("environment");
  const direction = url.searchParams.get("direction");
  if (env) params.set("environment", env);
  if (direction) params.set("direction", direction);

  try {
    const res = await fetch(
      `${portalCoreUrl}/api/kafka/sed-hendelser?${params}`,
      { cache: "no-store" },
    );
    if (!res.ok) {
      return Response.json(
        { error: "Feil fra portal-core" },
        { status: res.status },
      );
    }
    return Response.json(await res.json());
  } catch {
    return Response.json(
      { error: "Kan ikke nå portal-core" },
      { status: 502 },
    );
  }
}
