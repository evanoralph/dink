# Observability (Phase 1F)

## Sentry (P1-28)

Optional. When unset, reporters no-op (local stays quiet).

| App | Env | Notes |
|-----|-----|--------|
| API | `SENTRY_DSN` | Unexpected REST errors posted to Sentry store API |
| Web | `SENTRY_DSN` or `NEXT_PUBLIC_SENTRY_DSN` | `error.tsx` captures client boundary errors |
| Both | `SENTRY_ENVIRONMENT` / `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | e.g. `staging`, `production` |
| API | `SENTRY_RELEASE` | optional release tag |

Create a Sentry project (Node + Browser can share one project for MVP). Paste the DSN into staging/prod env only.

## Uptime + payment alerts (P1-30)

### Health endpoints

- Web: `GET /api/health` (also probes Meteor)
- API: `GET /api/v1/health` (includes in-memory `metrics`, e.g. `booking.conflicts`)

### Suggested uptime checks

Use Better Stack, Checkly, UptimeRobot, or GitHub scheduled workflow:

1. Poll `https://www…/api/health` every 1–5 minutes — alert if `ok !== true` or HTTP ≠ 200
2. Poll `https://api…/api/v1/health` — same
3. Optional: alert if `metrics["booking.conflicts"]` jumps unusually (log-based) or on Slack from app alerts

### Ops alert webhook

Set `ALERT_WEBHOOK_URL` on the Meteor host to a Slack Incoming Webhook (or Discord-compatible JSON `{ content }` / `{ text }`).

Fired for:

- Booking conflict spikes (`booking.conflict.alert` — first + every 10th)
- Payment webhook `failed` status

## Booking conflict metrics (P1-33)

- Log event: `booking.conflict.alert` (structured JSON)
- Counter: `booking.conflicts` on `/api/v1/health` → `metrics`
- Search logs / Sentry / Slack for double-book attempts

## Error UI (P1-29)

- `apps/web/src/app/error.tsx` — route errors
- `apps/web/src/app/global-error.tsx` — root layout failures

## Smoke tests (P1-31)

```bash
# UI smoke (builds on CI after next build + next start)
pnpm --filter web exec playwright test

# Full API journey (needs Meteor + seed venues, stub payments)
METEOR_API_URL=http://localhost:3001 node scripts/e2e-journey.mjs

# Fail CI if journey required (staging job)
REQUIRE_E2E_JOURNEY=1 METEOR_API_URL=https://api-staging… node scripts/e2e-journey.mjs

# Concurrent slot hold (P2-10; Meteor + seed running)
METEOR_API_URL=http://localhost:3001 node scripts/load-test-bookings.mjs
```

## Analytics funnel (P2-11)

Log-first: search `analytics.<event>` (API + web). Optional PostHog when `ANALYTICS_WRITE_KEY` / `POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_KEY` is set.

Core events: `onboarding_completed`, `venue_viewed`, `booking_started`, `booking_payment_started`, `booking_completed`, `booking_cancelled`, `game_created`, `game_joined`, `match_result_submitted`, `match_result_confirmed`, `invite_sent`, `venue_created`.

## Reminders (P2-08)

Inbox + email ~2h before confirmed booking / upcoming game. Optional SMS: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` + `profile.phone`.

Unpaid checkout hold: `BOOKING_HOLD_MINUTES` (default 15, min 5) + unique index `bookings_active_slot`.
