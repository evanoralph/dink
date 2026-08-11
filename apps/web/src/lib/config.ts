import { logInfo } from "./logger";

/** Server BFF → Meteor. Prefer METEOR_API_URL; public fallback for local only. */
export const METEOR_API_URL =
  process.env.METEOR_API_URL || process.env.NEXT_PUBLIC_METEOR_API_URL || "http://localhost:3001";

/** httpOnly cookie name for Meteor resume login token (not HMAC-signed). */
export const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "dink_auth_token";

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// P0-06: AUTH_COOKIE_SECRET and NEXT_PUBLIC_METEOR_DDP_URL intentionally not read.
declare global {
  // eslint-disable-next-line no-var
  var __dinkConfigLogged: boolean | undefined;
}

if (!globalThis.__dinkConfigLogged) {
  globalThis.__dinkConfigLogged = true;
  logInfo("config.web.env", {
    meteorApiUrl: METEOR_API_URL,
    appUrl: APP_URL,
    authCookieName: AUTH_COOKIE_NAME,
    debug: process.env.DEBUG === "1",
    unusedRemoved: ["AUTH_COOKIE_SECRET", "NEXT_PUBLIC_METEOR_DDP_URL"],
  });
}
