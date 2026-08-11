import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, METEOR_API_URL } from "@/lib/config";
import { logError, logInfo } from "@/lib/logger";

async function proxy(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const targetPath = `/api/v1/${path.join("/")}`;
  const url = new URL(targetPath, METEOR_API_URL);
  req.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  const jar = await cookies();
  const token = jar.get(AUTH_COOKIE_NAME)?.value;
  const started = Date.now();

  const init: RequestInit = {
    method: req.method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text();
  }

  try {
    const upstream = await fetch(url, init);
    const text = await upstream.text();
    logInfo("proxy.ok", {
      path: targetPath,
      status: upstream.status,
      durationMs: Date.now() - started,
    });
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logError("proxy.fail", {
      path: targetPath,
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "upstream_unavailable", message: "Meteor API unreachable" },
      { status: 502 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
