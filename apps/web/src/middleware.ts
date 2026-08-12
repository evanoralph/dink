import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE = process.env.AUTH_COOKIE_NAME || "dink_auth_token";

/** P1-19: protect authenticated app prefixes; public marketing/auth stay open. */
const PROTECTED_PREFIXES = [
  "/bookings",
  "/me",
  "/onboarding",
  "/venue",
  "/admin",
  "/notifications",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const needsAuth = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (!needsAuth) return NextResponse.next();

  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (token) return NextResponse.next();

  const login = new URL("/login", req.url);
  login.searchParams.set("next", pathname);
  // Edge-safe: avoid importing logger (keep middleware tiny).
  console.info(
    JSON.stringify({
      level: "info",
      event: "middleware.auth.redirect",
      path: pathname,
    }),
  );
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/bookings/:path*",
    "/me/:path*",
    "/onboarding/:path*",
    "/venue/:path*",
    "/admin/:path*",
    "/notifications/:path*",
  ],
};
