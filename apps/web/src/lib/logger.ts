type Fields = Record<string, unknown>;

export function logInfo(event: string, fields: Fields = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), level: "info", event, ...fields }));
}

export function logWarn(event: string, fields: Fields = {}) {
  console.warn(JSON.stringify({ ts: new Date().toISOString(), level: "warn", event, ...fields }));
}

export function logError(event: string, fields: Fields = {}) {
  console.error(JSON.stringify({ ts: new Date().toISOString(), level: "error", event, ...fields }));
}

export function logDebug(event: string, fields: Fields = {}) {
  // P0-05: DEBUG=1 forces debug logs; otherwise debug only outside production.
  if (process.env.DEBUG === "1" || process.env.NODE_ENV !== "production") {
    console.log(JSON.stringify({ ts: new Date().toISOString(), level: "debug", event, ...fields }));
  }
}
