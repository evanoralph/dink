# Deploy: Vercel + Meteor host + MongoDB Atlas

Also see:

- Git / branch protection: [GIT.md](./GIT.md)
- Staging env template: [../.env.staging.example](../.env.staging.example)
- MVP acceptance (pilot gate): [MVP_ACCEPTANCE.md](./MVP_ACCEPTANCE.md)
- Observability (Sentry / uptime / alerts): [OBSERVABILITY.md](./OBSERVABILITY.md)

## 0) Staging first (P0-09)

Create a **staging** stack before production. Fill real URLs into the table below after provision.

| Layer | Staging target | Example URL (replace) |
|-------|----------------|------------------------|
| Web | Vercel Preview project or `staging` alias | `https://staging.yourdomain.com` |
| API | Separate Meteor host / service | `https://api-staging.yourdomain.com` |
| DB | Atlas DB `dink_staging` (same cluster OK) | `mongodb+srv://…/dink_staging` |

### Staging provision checklist

1. Atlas: create database user (or reuse) + DB name `dink_staging`
2. Meteor host: deploy API with env from `.env.staging.example`
   - `SEED_ON_STARTUP=false`
   - `CORS_ORIGINS=<staging web URL>`
   - `ROOT_URL=<staging api URL>`
3. Vercel: set **Root Directory** `apps/web`
   - Staging/Preview env: `METEOR_API_URL`, `NEXT_PUBLIC_APP_URL` pointing at staging
4. DNS: `staging` → Vercel, `api-staging` → Meteor host
5. Smoke:
   - `GET https://api-staging…/api/v1/health`
   - `GET https://staging…/api/health`
   - Sign up → book (stub) → create game
6. Record live URLs here once created:

```text
STAGING_WEB_URL=
STAGING_API_URL=
STAGING_MONGO_DB=dink_staging
```

Promote to prod only after staging smoke is green and [MVP_ACCEPTANCE.md](./MVP_ACCEPTANCE.md) gates for the current phase pass.

## 1) MongoDB Atlas

1. Create a free/shared cluster.
2. Create DB user + network access (Vercel + Meteor host IPs, or `0.0.0.0/0` for early MVP).
3. Connection string:

```text
mongodb+srv://USER:PASS@CLUSTER.mongodb.net/dink?retryWrites=true&w=majority
```

For booking transactions, prefer a replica set (Atlas default). If you skip transactions locally, overlap re-check still protects slots.

Copy into Meteor host env as `MONGO_URL`.

## 2) Meteor API host

Options: Galaxy, Railway, Fly.io, Render, or a Node VPS.

Build (from `apps/api`):

```bash
meteor build ../.build --directory --server-only
```

Deploy the Node bundle with:

```text
ROOT_URL=https://api.yourdomain.com
MONGO_URL=<atlas>
PORT=3001
SEED_ON_STARTUP=false
PAYMENT_PROVIDER=stub
PAYMENT_WEBHOOK_SECRET=<strong-secret>
CORS_ORIGINS=https://www.yourdomain.com,https://yourdomain.com
DEBUG=0
```

Health check path: `/api/v1/health`

Notes:

- `CORS_ORIGINS` is a comma-separated allowlist read by the REST router.
- `DEBUG=1` enables API debug logs in production; leave `0` in prod unless diagnosing.
- Auth is REST + Meteor resume tokens; there is **no** DDP client in the web app yet (do not set `NEXT_PUBLIC_METEOR_DDP_URL`).

## 3) Next.js on Vercel

1. Import the monorepo; set **Root Directory** to `apps/web`.
2. Framework: Next.js.
3. Environment variables:

```text
METEOR_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_APP_URL=https://www.yourdomain.com
AUTH_COOKIE_NAME=dink_auth_token
```

Optional:

```text
DEBUG=0
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<maps-key>
```

Do **not** set:

- `AUTH_COOKIE_SECRET` — unused; cookie stores the Meteor resume token as httpOnly (P0-06).
- `NEXT_PUBLIC_METEOR_DDP_URL` — unused until a realtime DDP client ships (P0-06).

4. Cookie notes:
   - Auth cookie is set by Next route handlers (`/api/auth/login|signup`) as **httpOnly**.
   - In production, `secure: true` is enabled automatically when `NODE_ENV=production`.
   - Keep web + API on related domains (`www` + `api`) and use `SameSite=Lax`.

## 4) DNS / CORS checklist

- `www` / apex → Vercel
- `api` → Meteor host
- Meteor `CORS_ORIGINS` includes the Vercel URL(s)
- Payment webhooks (later) point to `https://api.yourdomain.com/api/v1/payments/webhook`

## 5) Payments — PayMongo sandbox → live (P1-01…P1-06)

Default local: `PAYMENT_PROVIDER=stub` (instant confirm).

### Sandbox (staging)

1. Create PayMongo account → **Test mode** keys
2. Meteor env:

```text
PAYMENT_PROVIDER=paymongo
PAYMONGO_SECRET_KEY=sk_test_...
PAYMENT_WEBHOOK_SECRET=<strong-random-≥16-chars>
APP_URL=https://staging.yourdomain.com
```

3. Feature flag: set `payments_stub` **false** in admin (optional; env provider already prefers PayMongo)
4. PayMongo Dashboard → Webhooks → endpoint:

```text
https://api-staging.yourdomain.com/api/v1/payments/webhook
```

Subscribe at least to `checkout_session.payment.paid` (and failed if available). Use the same signing secret as `PAYMENT_WEBHOOK_SECRET` / `PAYMONGO_WEBHOOK_SECRET`.

5. Smoke:
   - Book a court → redirect to PayMongo → pay with test method
   - Confirm API log `payments.webhook.ok` and booking status `confirmed`
   - Replay webhook → `payments.webhook.idempotent` (no double side-effects)

### Live

- Switch to `sk_live_...` keys and live webhook URL on prod API
- Never ship `PAYMENT_WEBHOOK_SECRET=dev-webhook-secret` (startup/webhook rejects weak secrets when `ROOT_URL` is https / `NODE_ENV=production`)

### Stub webhook (local only)

```bash
curl -X POST http://localhost:3001/api/v1/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{"providerPaymentId":"stub_xxx","status":"paid","secret":"dev-webhook-secret"}'
```

### Failure / expire / refund (P1-04 / P1-05)

- Unpaid `pending_payment` bookings expire after `BOOKING_HOLD_MINUTES` (default 15, min 5; job every 60s) → status `expired`, pending payments → `failed`, slot freed. Concurrent creates on the same court+start return `slot-taken` (`bookings_active_slot` unique index).
- Player `/bookings` shows **Pay now / Retry payment** while pending; **Book again** after expire.
- Admin **Refund** on a PayMongo `paid` payment calls PayMongo Refunds API (`pay_…` id from webhook), cancels booking, writes audit. Stub paid payments refund locally only.

## 5b) Auth hardening (P1-16…P1-21)

- Logout: Next `/api/auth/logout` calls Meteor `POST /api/v1/auth/logout` with Bearer token, then clears cookie (resume token revoked).
- Password reset: `POST /api/v1/auth/forgot-password` + `/reset-password`; emails via `MAIL_URL` / `MAIL_FROM`. Without `MAIL_URL`, API logs `auth.forgotPassword.dev_link` (link redacted in production).
- Reset links use `APP_URL` (fallback `ROOT_WEB_URL` / `http://localhost:3000`).
- Rate limits (in-memory, per IP): login/signup/forgot/reset/checkout.
- Prod-like boot (`NODE_ENV=production` or `https` `ROOT_URL`) fails if webhook secret is weak, PayMongo missing secret when selected, or seed uses default passwords with `SEED_ON_STARTUP=true`.

## 6) Seed policy (P0-07) — required in prod / shared envs

**Always set on Meteor host:**

```text
SEED_ON_STARTUP=false
```

Runtime enforcement (also in code):

- If `ROOT_URL` is `https://…` or `NODE_ENV=production`, seed is **off** unless `SEED_ON_STARTUP=true`.
- If you must bootstrap a shared/staging DB once with seed, set `SEED_ON_STARTUP=true` **and** rotate all of:
  - `SEED_ADMIN_PASSWORD`
  - `SEED_OWNER_PASSWORD`
  - `SEED_PLAYER_PASSWORD`
  away from the local defaults (`Admin123!`, `Owner123!`, `Player123!`).
- Startup **refuses** to seed prod-like envs when those defaults are still present.
- Immediately after bootstrap: set `SEED_ON_STARTUP=false`, restart API, and change any accounts that used temporary seed passwords.

Local Docker/dev may keep `SEED_ON_STARTUP=true` with the demo passwords.

## 7) Post-deploy smoke test

1. Confirm API logs show `seed.skipped` with `reason: prod_default_off` or `explicit_false`
2. `GET https://api…/api/v1/health`
3. `GET https://www…/api/health`
4. Sign up → book court → stub checkout → create game → submit score
5. Owner: `/list-your-venue` wizard (or seed owner) → venue calendar; admin approves pending venues
6. Admin login → approve venue / view payments
7. Ops: [SUPPORT_PLAYBOOK.md](./SUPPORT_PLAYBOOK.md) + optional `node scripts/load-test-bookings.mjs`
8. Confirm demo seed emails are not usable with default passwords (or do not exist)

## Rollback

- Vercel: promote previous deployment
- Meteor: redeploy previous bundle
- Atlas: no schema migrations required for MVP (document model)

## 8) Staging → production promote (P1-32)

Do **not** promote until staging smoke is green and [MVP_ACCEPTANCE.md](./MVP_ACCEPTANCE.md) gates for Phase 1 pass.

### Pre-promote checklist

1. Staging API logs: `seed.skipped` (`prod_default_off` or `explicit_false`)
2. Staging: `SEED_ON_STARTUP=false` permanently
3. Staging PayMongo sandbox journey (or stub) + email (`MAIL_URL`) verified
4. Staging uptime checks green for 24h (or at least consecutive smoke runs)
5. Sentry DSNs configured on staging (optional but recommended) — see [OBSERVABILITY.md](./OBSERVABILITY.md)
6. `ALERT_WEBHOOK_URL` pointed at ops Slack channel
7. Rotate any temporary seed passwords; confirm demo accounts cannot use `Admin123!` defaults

### Promote steps

1. **Atlas**: create/use prod DB `dink` (not staging). New user or scoped credentials.
2. **Meteor prod env** (copy from staging, change URLs/secrets):

```text
ROOT_URL=https://api.yourdomain.com
MONGO_URL=mongodb+srv://…/dink?…
SEED_ON_STARTUP=false
PAYMENT_PROVIDER=paymongo   # or stub for soft launch
PAYMONGO_SECRET_KEY=sk_live_…   # live when ready
PAYMENT_WEBHOOK_SECRET=<unique-strong-≥16>
PAYMONGO_WEBHOOK_SECRET=<same-or-dashboard-secret>
CORS_ORIGINS=https://www.yourdomain.com,https://yourdomain.com
APP_URL=https://www.yourdomain.com
MAIL_URL=…
MAIL_FROM=Dink <noreply@yourdomain.com>
SENTRY_DSN=…
SENTRY_ENVIRONMENT=production
ALERT_WEBHOOK_URL=…
DEBUG=0
```

3. Deploy Meteor bundle; confirm boot logs `prodSecrets.ok` and `seed.skipped`.
4. PayMongo Dashboard: live webhook → `https://api…/api/v1/payments/webhook`
5. **Vercel Production** env: `METEOR_API_URL`, `NEXT_PUBLIC_APP_URL`, optional `NEXT_PUBLIC_SENTRY_DSN`
6. Promote/deploy web; DNS cutover for `www` / apex
7. Post-deploy smoke (section 7) + `REQUIRE_E2E_JOURNEY=1 METEOR_API_URL=https://api… node scripts/e2e-journey.mjs` if seed/demo data allows (or manual journey)
8. Watch Slack alerts + Sentry for 1 hour after cutover

### Hard rules

- Never enable `SEED_ON_STARTUP=true` on production after bootstrap
- Never reuse staging `PAYMENT_WEBHOOK_SECRET` / PayMongo keys on prod
- Rollback = previous Vercel deployment + previous Meteor bundle (section Rollback)
