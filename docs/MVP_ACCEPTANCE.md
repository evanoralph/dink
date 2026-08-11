# MVP acceptance checklist (pilot gate)

> **Source of truth for P0-10.** Frozen from [PRODUCTION_ROADMAP.md](./PRODUCTION_ROADMAP.md) §4 Journeys A–E and §7.  
> A phase/pilot is complete only when checks pass on **staging** (sandbox PSP + email where required).

Related:

- Deploy / staging: [DEPLOY.md](./DEPLOY.md)
- Roadmap: [PRODUCTION_ROADMAP.md](./PRODUCTION_ROADMAP.md)

---

## Journey gates

### Journey A — Book a court

| # | Check | Status |
|---|--------|--------|
| A1 | Register / login | [ ] |
| A2 | Find venue on map or list | [ ] |
| A3 | Open venue → see **correct** availability | [ ] |
| A4 | Book open slot → cannot double-book | [ ] |
| A5 | Pay with real provider (or PSP sandbox) | [ ] |
| A6 | Receive confirmation (email at minimum) | [ ] |
| A7 | See booking under `/bookings` | [ ] |
| A8 | Cancel per policy when allowed | [ ] |

**Done when:** Player + venue + admin can investigate payment/booking; unpaid holds expire; webhook is idempotent.

### Journey B — Find a game

| # | Check | Status |
|---|--------|--------|
| B1 | Browse open games with skill filters | [ ] |
| B2 | Join game within capacity | [ ] |
| B3 | See roster / lobby state | [ ] |
| B4 | Coordinate (chat **or** reliable invite + notifications) | [ ] |
| B5 | Play → submit result → peer confirm | [ ] |
| B6 | History updates | [ ] |

**Done when:** Two distinct users can fill a game and complete scoring without admin intervention.

### Journey C — Create a game and fill it

| # | Check | Status |
|---|--------|--------|
| C1 | Create public or invite game | [ ] |
| C2 | Share invite code / link | [ ] |
| C3 | Others join by code or listing | [ ] |
| C4 | Optional: attach or create court booking + split pay | [ ] |
| C5 | Reminders before start | [ ] |
| C6 | Play again with same group | [ ] |

**Done when:** Organizer can refill a completed game in ≤3 taps (play-again) and invitees get notified.

### Journey D — Venue operate

| # | Check | Status |
|---|--------|--------|
| D1 | Owner approved by admin | [ ] |
| D2 | Configure courts, hours, prices | [ ] |
| D3 | See calendar truth | [ ] |
| D4 | Manual booking / block time | [ ] |
| D5 | See payment status | [ ] |
| D6 | Staff can operate without owner account | [ ] |

**Done when:** Owner never needs seed scripts or Mongo shell for daily ops.

### Journey E — Platform admin

| # | Check | Status |
|---|--------|--------|
| E1 | Approve / suspend venues | [ ] |
| E2 | Lookup booking + payment | [ ] |
| E3 | Refund / void where policy allows | [ ] |
| E4 | Deactivate abusive users | [ ] |
| E5 | Audit trail for critical actions | [ ] |
| E6 | Toggle feature flags that **actually change runtime** | [ ] |

**Done when:** Support can resolve a failed payment ticket using admin UI alone.

---

## Role checklist (PRD §62 adapted)

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

## Pilot gate rule

Do **not** market open pilot until **all** Journey A–E done-whens and the role checklist are true on staging.

Phase 0 honesty items (marketing, flags, seed off, CI) are prerequisites; Phase 1 builds the remaining payment/notify/venue/auth/play gaps.
