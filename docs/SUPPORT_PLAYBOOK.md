# Support playbook (pilot)

Use this when onboarding real venues in Angeles / Clark / Metro Manila.

Also see: [DEPLOY.md](./DEPLOY.md), [OBSERVABILITY.md](./OBSERVABILITY.md), [MVP_ACCEPTANCE.md](./MVP_ACCEPTANCE.md).

## 1) Onboard a venue (no engineer required)

1. Owner signs up → `/list-your-venue`
2. Wizard: name/city → add courts → default hours/pricing (06:00–22:00, ₱/hr)
3. Venue status is **pending**
4. Admin → `/admin/venues?status=pending` → **approved**
5. Owner can still edit Courts / Hours / Staff under `/venue`

If they already have a player account, wizard grants `venue_owner` automatically.

## 2) Seed / demo inventory (P2-09)

Local/dev seed (`SEED_ON_STARTUP=true`) upserts by **name**:

| Venue | City |
|-------|------|
| Clark Paddle Club | Angeles City |
| Pampanga Pickle Center | Angeles City |
| The Pickle Yard Clark | Angeles City |
| Helios Courts Pasig | Pasig |
| Ortigas Rec Courts | Pasig |

**Production:** keep `SEED_ON_STARTUP=false`. Add real venues via wizard + admin approve.

## 3) Payments

- Local/demo: `PAYMENT_PROVIDER=stub` — checkout confirms instantly for solo pay
- Staging: PayMongo test keys + webhook (see DEPLOY §5)
- Split pay: organizer invites a second Dink user on `/bookings/:id`; booking confirms when all shares paid

## 4) Common tickets

| Ticket | What to check |
|--------|----------------|
| Slot already booked | `/api/v1/health` → `metrics["booking.conflicts"]`; logs `booking.conflict.alert` |
| Unpaid hold vanished | Expire job (~15 min, `BOOKING_HOLD_MINUTES`); status `expired` |
| Venue not in search | Still `pending` / `suspended`? Only `approved` is public |
| Forgot password | `/forgot-password`; without `MAIL_URL` check API log `auth.forgotPassword.dev_link` |
| Account suspended | Admin Moderation → dismiss or leave suspended; login returns 403 `suspended` |
| Reminder not received | Inbox `/notifications`; SMS only if `TWILIO_*` + `profile.phone` |

## 5) Reminder channel (P2-08)

- Inbox + email (`MAIL_URL`) ~2 hours before confirmed booking / upcoming game
- Optional SMS: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` + user phone on profile

## 6) Analytics funnel (P2-11)

Search logs for `analytics.<event>`:

`onboarding_completed`, `venue_viewed`, `booking_started`, `booking_payment_started`, `booking_completed`, `booking_cancelled`, `game_created`, `game_joined`, `match_result_submitted`, `match_result_confirmed`, `invite_sent`, `venue_created`

Optional PostHog: `ANALYTICS_WRITE_KEY` / `POSTHOG_KEY` (API) and `NEXT_PUBLIC_POSTHOG_KEY` (web).

## 7b) Community (Phase 3)

- Groups: `/groups` → join → post open play (repeat next week + waitlist when full)
- Chat: game lobby + group page (polls ~4s)
- Friends: `/friends` + Follow on lobby / “players you play with”
- Coaches: `/coaches` (seed demo player is also a coach) → request → accept → review after session time
- Invites: `/me` invite link `?invite=CODE` → signup increments inviter count
- Match card: `/matches/:id/share`

## 7) Load test (P2-10)

With Meteor + seed running:

```bash
METEOR_API_URL=http://localhost:3001 pnpm load:bookings
```

Expect exactly **one** successful hold on the same court+start; others `slot-taken`.
