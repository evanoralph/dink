import { NextResponse } from "next/server";
import { METEOR_API_URL } from "@/lib/config";
import { logInfo } from "@/lib/logger";

export async function GET() {
  let api: unknown = null;
  try {
    const res = await fetch(`${METEOR_API_URL}/api/v1/health`, { cache: "no-store" });
    api = await res.json();
  } catch (error) {
    api = { ok: false, error: error instanceof Error ? error.message : "unreachable" };
  }
  logInfo("web.health", { apiOk: Boolean((api as { ok?: boolean })?.ok) });
  return NextResponse.json({
    ok: true,
    service: "dink-web",
    meteorApiUrl: METEOR_API_URL,
    api,
  });
}
