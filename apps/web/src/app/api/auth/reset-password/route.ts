import { NextRequest, NextResponse } from "next/server";
import { METEOR_API_URL } from "@/lib/config";
import { logError, logInfo } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const upstream = await fetch(`${METEOR_API_URL}/api/v1/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await upstream.json();
    if (!upstream.ok) {
      logError("auth.reset.fail", { status: upstream.status, error: data.error });
      return NextResponse.json(data, { status: upstream.status });
    }
    logInfo("auth.reset.ok");
    return NextResponse.json(data);
  } catch (error) {
    logError("auth.reset.error", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "upstream_unavailable", message: "Meteor API unreachable" },
      { status: 502 },
    );
  }
}
