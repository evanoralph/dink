import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, METEOR_API_URL } from "@/lib/config";
import { logError, logInfo, logWarn } from "@/lib/logger";

export async function POST() {
  const jar = await cookies();
  const token = jar.get(AUTH_COOKIE_NAME)?.value;

  // P1-16: revoke resume token on API before clearing cookie.
  if (token) {
    try {
      const upstream = await fetch(`${METEOR_API_URL}/api/v1/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: "{}",
      });
      if (!upstream.ok) {
        logWarn("auth.logout.upstream_fail", { status: upstream.status });
      } else {
        logInfo("auth.logout.revoked");
      }
    } catch (error) {
      // Still clear cookie so the browser session ends even if API is down.
      logError("auth.logout.upstream_error", {
        message: error instanceof Error ? error.message : "unknown",
      });
    }
  } else {
    logInfo("auth.logout.no_token");
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  logInfo("auth.logout.ok");
  return res;
}
