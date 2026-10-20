import { proxyPortalCoreJson } from "@/lib/portalCore";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return proxyPortalCoreJson(request, "/api/kafka/sed-hendelser", ["environment", "direction"]);
}
