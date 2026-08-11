# Deploy: Vercel + Meteor host + MongoDB Atlas

Also see:

- Git / branch protection: [GIT.md](./GIT.md)
- Staging env template: [../.env.staging.example](../.env.staging.example)
- MVP acceptance (pilot gate): [MVP_ACCEPTANCE.md](./MVP_ACCEPTANCE.md)

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

## 5) Seed policy (P0-07) — required in prod / shared envs

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

## 6) Post-deploy smoke test

1. Confirm API logs show `seed.skipped` with `reason: prod_default_off` or `explicit_false`
2. `GET https://api…/api/v1/health`
3. `GET https://www…/api/health`
4. Sign up → book court → stub checkout → create game → submit score
5. Owner login → venue calendar
6. Admin login → approve venue / view payments
7. Confirm demo seed emails are not usable with default passwords (or do not exist)

## Rollback

- Vercel: promote previous deployment
- Meteor: redeploy previous bundle
- Atlas: no schema migrations required for MVP (document model)
