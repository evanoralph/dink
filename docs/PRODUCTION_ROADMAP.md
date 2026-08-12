# Dink — Full-Cycle Production Roadmap

> **Document type:** Gap analysis + phased task list to production and beyond  
> **Scope:** Full product vision (MVP production → community → competition → intelligence → SEA)  
> **Date:** August 12, 2026  
> **Brand in code:** Dink  
> **PRD working name:** Project Rally  

This is a living engineering/product checklist. Convert task IDs into GitHub Issues when you start execution.

**Primary sources**

- Code: `apps/web`, `apps/api`, `packages/shared`
- Deploy: [DEPLOY.md](./DEPLOY.md)
- PRD: `Pickleball enthusiast website-handoff/.../project-rally-pickleball-app-master-idea.md`

---

## 1. Executive snapshot

**Dink** is a Philippines-first pickleball marketplace MVP:

| Layer | Stack |
|-------|--------|
| Web | Next.js 15 App Router, React 19, Tailwind 4 |
| API | Meteor 3 (Methods + REST `/api/v1`) |
| DB | MongoDB 7 (Docker local / Atlas for cloud) |
| Auth | Meteor accounts-password + roles; Next httpOnly cookie + BFF proxy |
| Payments today | **Stub only** (`PAYMENT_PROVIDER=stub`) |

**North-star cycle (product purpose)**

```text
Discover courts → book / join game → pay share → get confirmation & reminders
→ show up → play → record score → build reliability/rating → invite & play again
→ (later) groups, leagues, tournaments, coaching, AI
```

**Current status:** Strong **demo / pilot skeleton**. Multi-role UI and core Mongo models exist. It is **not** production-ready against PRD MVP acceptance (real pay, notifications, coordination, hardened auth, tests/CI, monitoring).

**Honesty gap:** Marketing copy claims GCash/Maya, split pay, chat, coaching, and skill progression that are not end-to-end in code. Phase 0 fixes messaging; Phase 1 builds the real loop.

---

## 2. What already exists (inventory)

### 2.1 Player

| Capability | Status | Notes / paths |
|------------|--------|----------------|
| Signup / login / logout | Partial | Cookie auth works; logout does not revoke Meteor resume token |
| Onboarding + profile | Done (soft) | `/onboarding`, `/me` — onboarding not hard-gated |
| Court discovery map/list | Done | `/courts`, Google Maps when API key set |
| Venue detail + reviews | Done | `/courts/[id]`, review create |
| Availability slots | Done (read) | From `AvailabilityRules` + booking overlap |
| Book court | Done | Create booking → pending payment |
| Checkout / pay | Stub | Instant “paid” via stub provider |
| Bookings list | Partial | Display; cancel API exists, weak UX |
| Create / join game | Done | `/play`, `/games/[id]` |
| Invite code display | Partial | Code shown; no dedicated join-by-code flow |
| Leave game | Partial | REST exists; no clear player UI |
| Match result submit | Partial | Form exists; team IDs can be `"unknown"` |
| Match confirm | Partial | REST exists; no confirm UI |
| Play again | Partial | Method only; not in REST / UI |
| Match history | Done (basic) | On `/me` |
| Password reset / OAuth | Missing | — |
| Game chat | Missing | Marketed only |
| Split pay | Missing | `paymentShare` stored; checkout pays whole booking |
| Push / email / SMS | Missing | — |

### 2.2 Venue ops (`/venue/*`)

| Capability | Status | Notes |
|------------|--------|--------|
| Dashboard KPIs | Done | — |
| Calendar | Done | — |
| Courts CRUD / toggle | Done | — |
| Bookings list / manage | Done (basic) | Manual booking path present |
| Payments list | Done (read) | Refunds deferred to admin |
| Staff add/remove | Done | — |
| Reports | Done (basic) | Recharts aggregates |
| Settings | Done (basic) | — |
| Availability rules CRUD | Missing UI/API | Seeded / read for slots only |
| Pricing rules CRUD | Missing UI/API | Seeded / read for price only |
| Venue onboarding wizard | Thin | Not full PRD setup wizard |
| Events / coaches / memberships | Missing | PRD later |

### 2.3 Admin (`/admin/*`)

| Capability | Status | Notes |
|------------|--------|--------|
| Dashboard | Done | — |
| Users / roles | Done | `admin.grantRole` not fully REST-exposed |
| Venue approval | Done | — |
| Courts / bookings / payments / games / matches | Done | Lookup + status tools |
| Notifications list | Shell | Collection + list; **no inserts/senders** |
| Audit log | Done | Critical ops |
| Feature flags CRUD | Partial | Admin UI exists; **runtime does not read flags** |
| Reports + CSV export | Done | — |
| Refunds via PSP | Missing | Status toggle only |
| Content moderation product | Thin | Status toggles, not a moderation workflow |

### 2.4 Platform plumbing

| Capability | Status | Notes |
|------------|--------|--------|
| REST `/api/v1/*` | Done | Auth, venues, bookings, games, matches, payments webhook, venue*, admin* |
| Meteor publications | Unused by web | `games.*`, `venues.courtBoard` — no DDP client |
| Shared Zod (`@dink/shared`) | Underused | Schemas exist; apps often skip imports |
| Seed users + 3 PH venues | Done | Clark, Pampanga, Helios |
| Expire unpaid bookings job | Done | ~1 min interval |
| Structured JSON logging | Done | API + Next `logger` |
| Health checks | Done | `/api/v1/health`, `/api/health` |
| Deploy checklist | Done | [DEPLOY.md](./DEPLOY.md) — still assumes stub pay |
| Docker Mongo RS | Done | `docker-compose.yml` |
| CI/CD | Missing | No `.github/` workflows |
| Automated tests | Missing | No app `*.test` / Playwright / Jest |
| Error tracking / APM | Missing | Console JSON only |
| S3 media upload | Env only | Not wired |
| Email (`MAIL_URL`) | Env only | Unused |
| Mobile apps | Missing | Web only |

---

## 3. Gap matrix (modules missing or incomplete)

Status legend: **Missing** | **Stub** | **Partial** | **Exists unused** | **Done**

### 3.1 Critical path (blocks “complete cycle”)

| Module | Status | Evidence |
|--------|--------|----------|
| Real PH payments (GCash / Maya / card) | Stub | `apps/api/imports/modules/bookings/methods.ts`, `BookingActions.tsx` |
| Idempotent payment webhooks | Partial | Webhook route; secret defaults to `dev-webhook-secret` |
| Payment refunds / voids (PSP) | Partial | Admin status only |
| Booking confirmation delivery | Missing | No email/SMS/push send path |
| Notification inserts + worker | Exists unused | `Notifications` collection; admin list only |
| Cancel booking UX + policy | Partial | API yes; player UX weak |
| Venue availability owner CRUD | Partial | Data model yes; no owner API/UI |
| Venue pricing owner CRUD | Partial | Same |
| Game coordination (chat or equivalent) | Missing | Marketing only |
| Invite-by-code join | Partial | Code generated; no join-by-code UX |
| Split payments | Partial | `BookingParticipants.paymentShare`; no invite-to-pay |
| Match confirm + skill update | Partial | Backend partial; UI/marketing ahead |
| Play again loop | Partial | Method only |

### 3.2 Auth, security, trust

| Module | Status | Evidence |
|--------|--------|----------|
| Server-side logout / token revoke | Partial | Best-effort; cookie clear only |
| Forgot / reset password | Missing | — |
| Email verification | Missing | — |
| OAuth (Google/Apple) | Missing | Optional later |
| Shared Zod enforcement | Partial | `packages/shared` not wired into API/web consistently |
| Next middleware auth gate | Missing | Layout-level only |
| Rate limiting (auth/REST) | Missing | — |
| `AUTH_COOKIE_SECRET` | Exists unused | Documented; never read |
| Account deletion / data export | Missing | Privacy NFR |
| Reliability / no-show score | Missing | PRD matchmaking input |

### 3.3 Product surface vs marketing

| Module | Status | Evidence |
|--------|--------|----------|
| Feature flags at runtime | Exists unused | Seeded `payments_stub`, `show_pricing`, `show_testimonials` |
| Coaching marketplace | Missing | Static cards on `MarketingHome.tsx` |
| Leagues / standings / playoffs | Missing | Marketing copy only |
| Groups / communities | Missing | — |
| Friends / social graph | Missing | — |
| Ratings engine | Missing | Basic skill fields only |
| Tournaments / brackets | Missing | — |
| Media upload (S3) | Missing | Env placeholders |
| DDP realtime client | Exists unused | `NEXT_PUBLIC_METEOR_DDP_URL` unused |

### 3.4 Production operations

| Module | Status | Evidence |
|--------|--------|----------|
| Git remote / VCS at root | Unclear / missing | No reliable `.git` workflow assumed |
| CI lint + build | Missing | Root has `lint:web` / `build:web` only |
| E2E smoke tests | Missing | — |
| Staging environment | Missing | Deploy doc is prod-shaped |
| Dockerfiles for web/API | Missing | Compose is Mongo only |
| Sentry / metrics / alerts | Missing | — |
| `error.tsx` / `global-error.tsx` | Missing | — |
| Secrets management | Partial | Env files; weak defaults |
| CORS documented | Partial | Used; not in `.env.example` |

---

## 4. Critical user journeys (definition of done)

Use these as acceptance gates. A phase is “complete” only when checks pass in staging with non-stub dependencies where required.

### Journey A — Book a court (PRD Flow A)

1. Register / login  
2. Find venue on map or list  
3. Open venue → see **correct** availability  
4. Book open slot → cannot double-book  
5. Pay with **real** provider (or sandbox of real PSP)  
6. Receive confirmation (email at minimum)  
7. See booking under `/bookings`  
8. Cancel per policy when allowed  

**Done when:** Player + venue + admin can investigate payment/booking; unpaid holds expire; webhook is idempotent.

### Journey B — Find a game (PRD Flow B)

1. Browse open games with skill filters  
2. Join game within capacity  
3. See roster / lobby state  
4. Coordinate (chat **or** reliable invite + notifications)  
5. Play → submit result → peer confirm  
6. History updates  

**Done when:** Two distinct users can fill a game and complete scoring without admin intervention.

### Journey C — Create a game and fill it (PRD Flow C)

1. Create public or invite game  
2. Share invite code / link  
3. Others join by code or listing  
4. Optional: attach or create court booking + split pay  
5. Reminders before start  
6. Play again with same group  

**Done when:** Organizer can refill a completed game in ≤3 taps (play-again) and invitees get notified.

### Journey D — Venue operate

1. Owner approved by admin  
2. Configure courts, hours, prices  
3. See calendar truth  
4. Manual booking / block time  
5. See payment status  
6. Staff can operate without owner account  

**Done when:** Owner never needs seed scripts or Mongo shell for daily ops.

### Journey E — Platform admin

1. Approve / suspend venues  
2. Lookup booking + payment  
3. Refund / void where policy allows  
4. Deactivate abusive users  
5. Audit trail for critical actions  
6. Toggle feature flags that **actually change runtime**  

**Done when:** Support can resolve a failed payment ticket using admin UI alone.

---

## 5. Phased task list

Each task: **ID**, area (`API` / `Web` / `Ops` / `Product` / `Mobile`), and **Done when**.

---

### Phase 0 — Foundation & honesty (≈1–2 weeks)

Goal: Safe repo hygiene, stop overselling, make env/docs match code.

| ID | Area | Task | Done when |
|----|------|------|-----------|
| P0-01 | Ops | Initialize git remote; protect `main`; ignore secrets | Repo pushable; `.env*` not committed |
| P0-02 | Product | Audit marketing copy vs shipped features | Landing does not claim GCash/chat/coaching/leagues unless live |
| P0-03 | Web | Gate marketing sections behind flags or remove static coach/league claims | `MarketingHome` reflects truth |
| P0-04 | API/Web | Wire feature flags into runtime **or** delete unused flag keys | Checkout/marketing read `FeatureFlags` |
| P0-05 | Ops | Document `CORS_ORIGINS`, `DEBUG` in `.env.example` | Example matches real env contract |
| P0-06 | Ops | Decide fate of `AUTH_COOKIE_SECRET` and `NEXT_PUBLIC_METEOR_DDP_URL` | Implement or remove from docs |
| P0-07 | Ops | Force `SEED_ON_STARTUP=false` in prod checklist; rotate seed passwords for any shared envs | Deploy checklist updated |
| P0-08 | Ops | Add CI: `pnpm lint:web` + `pnpm build:web` + Meteor typecheck/build smoke | Green pipeline on PR |
| P0-09 | Ops | Create staging project (Atlas + API + Vercel preview/staging) | Staging URLs in DEPLOY.md |
| P0-10 | Product | Freeze MVP acceptance checklist from §4 Journeys A–E | Shared doc linked from README |

**Phase 0 exit:** Marketing honest; CI green; staging boots; env docs accurate.

---

### Phase 1 — Production MVP blockers (must ship for real users)

Goal: Prove PRD MVP loop with real money path and confirmations. Aligns with PRD §33 MVP + §62 acceptance + build priority P0.

#### 1A — Payments

| ID | Area | Task | Done when |
|----|------|------|-----------|
| P1-01 | API | Integrate PH PSP (e.g. PayMongo / Maya / Xendit) behind `PAYMENT_PROVIDER` | Stub optional via flag only |
| P1-02 | API | Create checkout session; store provider IDs; leave booking `pending_payment` until webhook | No instant paid without provider confirm |
| P1-03 | API | Idempotent webhook handler + signature verify; reject weak default secrets in prod | Duplicate webhooks safe |
| P1-04 | API/Web | Payment failure / expire UX | User sees retry; slot released on expire |
| P1-05 | API/Admin | Refund / void via provider API + audit | Admin refund updates PSP + booking |
| P1-06 | Ops | Webhook URL, secrets, sandbox→live runbook | Documented in DEPLOY.md |

#### 1B — Notifications & booking lifecycle

| ID | Area | Task | Done when |
|----|------|------|-----------|
| P1-07 | API | Notification service: insert `Notifications` + email sender (`MAIL_URL` or ESP) | Booking confirm email received |
| P1-08 | API | Triggers: booking confirmed, cancelled, expired, game joined, match submitted | Events create rows + send |
| P1-09 | Web | Player notification inbox (minimal) | User sees recent notices |
| P1-10 | Web | Booking cancel button + policy copy | Cancel works end-to-end |
| P1-11 | API | Cancellation / refund policy rules server-side | Illegal cancels rejected |

#### 1C — Venue configuration

| ID | Area | Task | Done when |
|----|------|------|-----------|
| P1-12 | API | CRUD for `AvailabilityRules` (owner/staff) | REST + authz |
| P1-13 | API | CRUD for `PricingRules` (owner/staff) | REST + authz |
| P1-14 | Web | Venue UI for hours, slot length, peak/off-peak prices | Owner changes reflect on `/courts/[id]` |
| P1-15 | Web/API | Block time / blackout on calendar | Slots disappear for players |

#### 1D — Auth & security hardening

| ID | Area | Task | Done when |
|----|------|------|-----------|
| P1-16 | API | Revoke resume tokens on logout; Next calls API logout | ✅ Stolen cookie useless after logout |
| P1-17 | API/Web | Forgot + reset password email flow | ✅ User recovers account |
| P1-18 | API/Web | Enforce `@dink/shared` Zod on auth + booking + game payloads | ✅ Invalid bodies 400 |
| P1-19 | Web | `middleware.ts` for protected route prefixes | ✅ Unauth redirected consistently |
| P1-20 | API | Rate limit login/signup/checkout | ✅ Brute force slowed |
| P1-21 | Ops | Prod secret policy: no default webhook/seed passwords | ✅ Startup fails if insecure in prod |

#### 1E — Finish half-built play loop

| ID | Area | Task | Done when |
|----|------|------|-----------|
| P1-22 | Web | Leave game control | ✅ Player can leave open game |
| P1-23 | Web/API | Join by invite code (deep link `/games/join?code=`) | ✅ Second user joins without listing |
| P1-24 | Web | Match confirm UI for opponents | ✅ Confirm flips match state |
| P1-25 | API/Web | Expose `games.playAgain` on REST + button | ✅ New game created from completed |
| P1-26 | Web | Fix match team IDs (no `"unknown"`) | ✅ Only real user ids submitted |
| P1-27 | Web | Create-game form: editable skill/capacity/price | ✅ Not hardwired defaults only |

#### 1F — Observability, quality, deploy

| ID | Area | Task | Done when |
|----|------|------|-----------|
| P1-28 | Ops | Sentry (or equivalent) on web + API | ✅ Errors searchable |
| P1-29 | Web | `error.tsx` / `global-error.tsx` | ✅ Friendly failure UI |
| P1-30 | Ops | Uptime checks on health endpoints + payment alert channel | ✅ Pager/Slack on down/fail spike |
| P1-31 | Ops | Playwright (or similar) smoke: signup→book→pay(sandbox)→game→score | ✅ CI gate |
| P1-32 | Ops | Complete staging→prod promote steps; disable seed | ✅ DEPLOY.md post-deploy checklist green |
| P1-33 | API | Booking conflict metrics / log alerts | ✅ Double-book attempts visible |

**Phase 1 exit:** Journeys A–E pass on staging with sandbox PSP + email. Ready for closed pilot with real venues.

---

### Phase 2 — Pilot hardening (first city launch)

Goal: Raise completion and trust for Angeles/Clark or Metro Manila pilot. Aligns with PRD Phase 5 Pilot + P1 items (invites, chat, reliability).

| ID | Area | Task | Done when |
|----|------|------|-----------|
| P2-01 | API/Web | Split pay: each participant pays `paymentShare` | ✅ Booking confirms when all required paid (policy) |
| P2-02 | API/Web | Invite-to-pay links / reminders for unpaid shares | ✅ Organizer sees who paid |
| P2-03 | API/Web | Game lobby coordination v1 (minimal chat **or** structured RSVP + notify) | ✅ Players coordinate in-app |
| P2-04 | API | Reliability / no-show signals from completes vs cancels | ✅ Score stored on profile |
| P2-05 | Admin | Moderation queue: report user/venue/review | ✅ Admin can hide + suspend |
| P2-06 | API/Web | Account deletion + minimal data export | ✅ Privacy path works |
| P2-07 | Web/API | Venue onboarding wizard (courts → hours → pricing → submit) | ✅ New venue live without eng help |
| P2-08 | Web | SMS or push reminder before booking/game (optional second channel) | ✅ Reminder delivered |
| P2-09 | Ops | Support playbook + seed real court inventory for pilot city | ✅ Ops can onboard N venues |
| P2-10 | Ops | Load test availability + booking under peak | ✅ No slot corruption under load |
| P2-11 | Product | Instrument analytics events (PRD §51 subset) | ✅ Funnel visible in dashboard/tool |
| P2-12 | API | Temporary slot hold during checkout (PRD §48) | ✅ Concurrent checkouts don’t clash |

**Phase 2 exit:** Pilot metrics: booking completion, game fill rate, no-shows, venue staff workload (PRD §60 Phase 5).

---

### Phase 3 — Community (PRD Q2 — repeat play)

Goal: Increase repeat sessions via social graph and open play.

| ID | Area | Task | Done when |
|----|------|------|-----------|
| P3-01 | API/Web | Groups / communities CRUD + membership | ✅ Users join local groups |
| P3-02 | API/Web | Group feed of open plays / games | ✅ Group can post recurring open play |
| P3-03 | API/Web | Enhanced chat (game + group channels) | ✅ Realtime or near-realtime messages |
| P3-04 | API/Web | Friends / follow + “players you play with” | ✅ Social graph queryable |
| P3-05 | API/Web | Open-play management for organizers | ✅ Recurring sessions + waitlist |
| P3-06 | API/Web | Coaching discovery v1 (real coach profiles, not static cards) | ✅ Search coaches by city |
| P3-07 | API/Web | Coach booking request (manual confirm OK) | ✅ Player requests session |
| P3-08 | Web | Richer match history + share card | ✅ Shareable result link |
| P3-09 | Product | Invite growth loop (Loop A): reward or UX for invites | ✅ Measurable invite→signup |
| P3-10 | Web | Reviews for coaches (after sessions) | ✅ Ratings on coach profile |

**Phase 3 exit:** Repeat play up; organizers run weekly open play inside Dink.

---

### Phase 4 — Competition (PRD Q3)

Goal: Become infrastructure for organized play.

| ID | Area | Task | Done when |
|----|------|------|-----------|
| P4-01 | API | Ratings v1 (post-match updates; transparent rules) | ✅ Rating history on profile |
| P4-02 | API/Web | Leagues: seasons, standings, schedule | ✅ League page live |
| P4-03 | API/Web | Ladders: challenge / accept / result | ✅ Ladder ranks update |
| P4-04 | API/Web | Tournament registration + payments | ✅ Player registers + pays |
| P4-05 | API/Web | Basic bracket / round-robin engine | ✅ Bracket advances from results |
| P4-06 | Web/API | Advanced venue reports (utilization, GMV, peak) | ✅ Owner exports useful CSV/PDF |
| P4-07 | API/Web | Memberships / packs for venues | ✅ Member price applied at booking |
| P4-08 | Admin | Competition moderation + dispute tools | ✅ Admin resolves score disputes |
| P4-09 | Product | Optional DUPR export/import research spike | ✅ Decision doc only |

**Phase 4 exit:** A local league or small tournament runs fully on Dink.

---

### Phase 5 — Intelligence + mobile (PRD Q4 + mobile-first)

Goal: Mobile clients + differentiated improvement features (AI without delaying marketplace).

| ID | Area | Task | Done when |
|----|------|------|-----------|
| P5-01 | Mobile | React Native (or Expo) app sharing API contracts | iOS/Android TestFlight/Internal |
| P5-02 | Mobile | Push notifications (FCM/APNs) for booking/game | Push received on device |
| P5-03 | Mobile | Parity for Journeys A–C on mobile | Pilot users can leave web |
| P5-04 | API | Media upload to S3 (avatars, venue photos, match video) | Upload + CDN URL stored |
| P5-05 | API/Product | AI recap v1 — no computer vision (text insights from scores/stats) | Post-match recap generated |
| P5-06 | API/Web | Video upload + consent flags (PRD §64) | Consent stored separately |
| P5-07 | Product | Highlight experiment pipeline (manual/assisted OK) | One experiment shipped |
| P5-08 | API | Advanced matchmaking (skill + reliability + distance + time) | Better fill rate vs v1 |
| P5-09 | Ops | App Store / Play Store listing, privacy questionnaire | Store apps submitted |

**Phase 5 exit:** Mobile pilot live; AI v1 optional behind flag; matchmaking improved.

---

### Phase 6 — Scale & Southeast Asia

Goal: Multi-market operating network (PRD Phase 2 markets).

| ID | Area | Task | Done when |
|----|------|------|-----------|
| P6-01 | Product | Trademark / domain / handle finalization for brand | Legal clearance recorded |
| P6-02 | API | Multi-currency + per-country PSP routing | SG/MY/TH sandbox configs |
| P6-03 | Web/Mobile | i18n framework + first second language | Locale switch works |
| P6-04 | Ops | Privacy/compliance per market (data residency notes) | Checklist per country |
| P6-05 | Ops | Tax / invoicing research for platform fees | Finance decision doc |
| P6-06 | Product | City launch playbook (venue densify → organizers → players) | Repeatable GTM |
| P6-07 | API | Featured placement / promo inventory (labeled) | Paid promo without ranking lies |
| P6-08 | Product | Player premium + venue SaaS tiers (PRD §32) | Billing plans live |
| P6-09 | API | AI v2+ video analysis only after consent + demand | Gated roadmap, not blocker |

**Phase 6 exit:** Second country pilot possible without rewriting core booking.

---

## 6. Priority legend & dependencies

```text
Phase 0  →  Phase 1  →  Phase 2  →  (pilot launch)
                              ↘
                          Phase 3 (community) ──→ Phase 4 (competition)
                                                      ↘
                                                   Phase 5 (mobile + AI)
                                                      ↘
                                                   Phase 6 (SEA + monetization scale)
```

**Critical path for purpose cycle**

1. Real payments (P1-01…P1-06)  
2. Notifications (P1-07…P1-09)  
3. Venue hours/pricing CRUD (P1-12…P1-15)  
4. Finish play loop UI (P1-22…P1-27)  
5. Auth hardening (P1-16…P1-21)  
6. Split pay + lobby (P2-01…P2-03) for full “pay share + coordinate” story  

**Parallelizable**

- CI/Sentry/docs (P0/P1F) alongside payment integration  
- Mobile (P5) after REST contracts stabilize (end of Phase 1)  
- Coaching/leagues must not block Phase 1 pilot  

**Do not delay launch for (PRD §34)**

- Full AI video, advanced proprietary rating, live streaming, NFT/gamification, smart courts, full SEA rollout  

---

## 7. MVP acceptance checklist (pilot gate)

Copy of PRD §62 adapted to Dink — all must be **true** before open pilot marketing.

### Player

- [ ] Can register and log in securely  
- [ ] Can find a venue and see correct availability  
- [ ] Can book an available court; cannot double-book  
- [ ] Can pay via real (or PSP sandbox) checkout  
- [ ] Receives confirmation notification  
- [ ] Can cancel according to policy  
- [ ] Can create a public game; another user can join  
- [ ] Can join via invite code  
- [ ] Can coordinate (chat or notify+RSVP)  
- [ ] Can submit and confirm match result  
- [ ] Can see history and play again  

### Venue

- [ ] Can manage courts  
- [ ] Can set availability and prices without eng  
- [ ] Can block time  
- [ ] Can view / manual-create bookings  
- [ ] Can see payment status  
- [ ] Can cancel/refund where allowed (with admin/PSP)  
- [ ] Staff accounts work  

### Platform

- [ ] Can investigate booking/payment issues  
- [ ] Audit logs for critical operations  
- [ ] Can deactivate abusive accounts  
- [ ] Can approve/manage venues  
- [ ] Feature flags affect runtime  
- [ ] Staging + prod deploy with seed off  
- [ ] Smoke E2E green in CI  

---

## 8. Suggested tracking

1. Create GitHub Project columns: `Phase 0` … `Phase 6`, plus `Pilot Blockers`.  
2. One issue per task ID (`P1-01`, …). Label by area: `api`, `web`, `ops`, `mobile`, `product`.  
3. Keep this file as the source of truth; update Status column mentally via issue state.  
4. Link PRD sections in issues when useful (`§33 MVP`, `§39 Payments`, `§48 Slot hold`).  
5. Key code anchors for implementers:

| Domain | Paths |
|--------|--------|
| REST router | `apps/api/imports/api/rest/router.ts` |
| Collections | `apps/api/imports/collections/index.ts` |
| Bookings / pay | `apps/api/imports/modules/bookings/methods.ts`, `payments/methods.ts` |
| Games / matches | `apps/api/imports/modules/games/methods.ts`, `matches/methods.ts` |
| Accounts | `apps/api/imports/modules/accounts/methods.ts` |
| Seed / jobs / flags | `apps/api/imports/startup/seed.ts`, `jobs.ts` |
| Web BFF | `apps/web/src/app/api/proxy/[...path]/route.ts` |
| Auth routes | `apps/web/src/app/api/auth/*` |
| Marketing claims | `apps/web/src/components/marketing/MarketingHome.tsx` |
| Shared contracts | `packages/shared/src/{schemas,paths,roles,types}.ts` |

---

## 9. Effort sketch (planning only, not a commitment)

| Phase | Focus | Rough calendar |
|-------|--------|----------------|
| 0 | Honesty + CI + staging | 1–2 weeks |
| 1 | Payments, notify, venue CRUD, auth, loop finish | 4–8 weeks |
| 2 | Split pay, lobby, pilot ops | 3–5 weeks |
| 3 | Community / coaching discovery | 6–10 weeks |
| 4 | Leagues / tournaments / memberships | 8–12 weeks |
| 5 | Mobile + AI v1 | 10–16 weeks (mobile can start earlier) |
| 6 | SEA + monetization scale | Ongoing |

Pilot-ready ≈ end of Phase 2. Full vision ≈ Phase 6 ongoing.

---

## 10. Immediate next actions (start here)

1. **P0-02 / P0-03** — Stop claiming GCash/chat/coaching until built.  
2. **P0-08 / P0-09** — CI + staging.  
3. **P1-01** — Choose PSP and spike sandbox checkout + webhook.  
4. **P1-07** — Email confirmation path (unblocks trust).  
5. **P1-12…P1-14** — Venue hours/pricing UI (unblocks real inventory).  
6. Convert Phase 0–1 rows into issues and assign owners.

---

## 11. Document history

| Date | Change |
|------|--------|
| 2026-08-12 | Initial full-vision roadmap from codebase + PRD gap analysis |
