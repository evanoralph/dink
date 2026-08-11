import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/config";
import { logInfo } from "@/lib/logger";

export async function POST() {
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
