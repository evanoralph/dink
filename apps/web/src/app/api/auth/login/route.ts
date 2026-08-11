import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, METEOR_API_URL } from "@/lib/config";
import { logError, logInfo } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const upstream = await fetch(`${METEOR_API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await upstream.json();
    if (!upstream.ok) {
      logError("auth.login.fail", { status: upstream.status, error: data.error });
      return NextResponse.json(data, { status: upstream.status });
    }

    const res = NextResponse.json({ user: data.user });
    res.cookies.set(AUTH_COOKIE_NAME, data.loginToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    logInfo("auth.login.ok", { userId: data.user?._id });
    return res;
  } catch (error) {
    logError("auth.login.error", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "upstream_unavailable", message: "Meteor API unreachable" },
      { status: 502 },
    );
  }
}
