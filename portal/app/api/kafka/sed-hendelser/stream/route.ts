import { proxyPortalCoreStream } from "@/lib/portalCore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request: Request) {
  return proxyPortalCoreStream(request, "/api/kafka/sed-hendelser/stream");
}
