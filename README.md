# Dink

Philippines-first pickleball marketplace MVP.

- **Web:** Next.js 15 (`apps/web`) — marketing + player + venue + admin
- **API:** Meteor 3 headless (`apps/api`) — Methods + REST `/api/v1` + MongoDB
- **DB local:** Docker Mongo 7 with replica set (`docker-compose.yml`)

## Quick start

### Prerequisites

- Node.js 20+
- pnpm 9+
- [Meteor](https://www.meteor.com/developers/install) 3.x (`meteor --version`)
- Docker Desktop (optional — preferred for shared Mongo; otherwise Meteor uses its local Mongo)

### One-command start / stop

```bash
pnpm install
pnpm start
pnpm down
```

If a new PowerShell says `pnpm` is not recognized, either:

1. Close the terminal and open a **new** one (PATH refresh after Node/pnpm install), or
2. Run the root launchers that bootstrap PATH:

```powershell
.\start.cmd
.\down.cmd
```

`pnpm start` will:
1. Start Docker Mongo when Docker is available (otherwise Meteor local Mongo)
2. Start Meteor API on `:3001`
3. Start Next.js on `:3000`

Logs and PIDs live in `.run/`.

Or run the scripts directly:

```powershell
.\scripts\start.ps1
.\scripts\down.ps1
```

Open [http://localhost:3000](http://localhost:3000)  
API health: [http://localhost:3001/api/v1/health](http://localhost:3001/api/v1/health)  
Web health: [http://localhost:3000/api/health](http://localhost:3000/api/health)

### Manual (optional)

```powershell
pnpm run dev:mongo
pnpm run dev:api
pnpm run dev:web
```

## Seed accounts

| Role   | Email              | Password    |
|--------|--------------------|-------------|
| Admin  | admin@dink.local   | Admin123!   |
| Owner  | owner@dink.local   | Owner123!   |
| Player | player@dink.local  | Player123!  |

Seed venues: Clark Paddle Club, Pampanga Pickle Center, Helios Courts Pasig.

## MVP loops

1. Sign up → onboarding → browse `/courts` → book + stub pay → see `/bookings`
2. Create/join game on `/play` → log score on game detail
3. Venue owner: `/venue` calendar, courts, staff, manual booking
4. Admin: `/admin/venues` approve + payments/bookings/flags

## Docs

| Doc | Purpose |
|-----|---------|
| [docs/DEPLOY.md](docs/DEPLOY.md) | Staging + production deploy (Vercel, Meteor, Atlas) |
| [docs/GIT.md](docs/GIT.md) | Git init, secrets ignore, protect `main` |
| [docs/MVP_ACCEPTANCE.md](docs/MVP_ACCEPTANCE.md) | **Pilot gate** — Journeys A–E + role checklist (P0-10) |
| [docs/PRODUCTION_ROADMAP.md](docs/PRODUCTION_ROADMAP.md) | Full phased roadmap |
| [.env.example](.env.example) | Local env contract |
| [.env.staging.example](.env.staging.example) | Staging env template |

## Cloud deploy

See [docs/DEPLOY.md](docs/DEPLOY.md) for staging first, then production (Vercel + Meteor + Atlas).

## Monorepo layout

```text
apps/web          Next.js App Router
apps/api          Meteor 3 API
packages/shared   Shared Zod schemas / API paths
packages/config   Shared TS baselines
```

## Logging

API Methods and REST routes emit JSON logs (`method.ok`, `rest.hit`, `bookings.create.ok`, …).
Next.js BFF/auth/pages log with the same style via `src/lib/logger.ts`.
