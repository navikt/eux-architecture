import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/currentUser";

export const dynamic = "force-dynamic";

/**
 * Returns the logged-in employee, or `{ user: null }` when there is no valid
 * session. Excluded from autologin in `.nais/nais.yaml` so anonymous visitors
 * get a JSON answer instead of a 401 from the login proxy.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser(request.headers.get("authorization"));
  return NextResponse.json(
    { user },
    { headers: { "Cache-Control": "no-store, private" } },
  );
}
