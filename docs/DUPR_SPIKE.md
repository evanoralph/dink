# DUPR export/import spike (P4-09)

**Date:** 2026-08-12  
**Status:** Decision only — no product integration in Phase 4  
**Owner:** Product + API

## Question

Should Dink import/export ratings or match results with [DUPR](https://www.dupr.com/) (Dynamic Universal Pickleball Rating)?

## Findings

- DUPR is a **proprietary** rating network. There is no stable public club API we can depend on for automated import/export.
- Club/partner programs, if any, require a commercial agreement and change without notice.
- Dink already has an internal **Elo** (start 1000, K=32, doubles = team average). Mixing DUPR numbers into the same `profile.rating` field would silently break leagues, ladders, and leaderboards.
- Players who care about DUPR typically **self-report** match scores in the DUPR app. A CSV of confirmed Dink matches is enough for that workflow.

## Options

| Option | Pros | Cons |
|--------|------|------|
| A. Do nothing | No legal/API risk; Elo stays simple | Serious tournament players still use DUPR elsewhere |
| B. Opt-in CSV export of confirmed matches | Players can self-report; no DUPR dependency | Manual; not a “sync” |
| C. Full DUPR OAuth/API sync | Marketing claim | No public API; rating collision; vendor lock-in |

## Decision

**Ship A now. Optionally add B later (opt-in, not default).**

- Keep Dink Elo as the only in-app rating (`ratings.me`, history, leaderboard).
- Do **not** import DUPR numbers into `profile.rating`.
- Do **not** auto-push matches to DUPR.
- If we add export later: confirmed, non-voided matches only; player opt-in; include names, date, format, set scores; no emails/phones in the file by default.
- Revisit only if DUPR (or another federation) offers a documented partner API **and** we can store their ID separately from Elo.

## Out of scope

- Replacing Elo with DUPR
- Displaying a “DUPR” badge that we cannot verify
- Bulk PII dumps for third-party rating sites

## Related code

- Elo apply/reverse: `apps/api/imports/lib/rating.ts`
- History UI: `/me`, `/compete`
- Disputes void ratings: `admin.disputes.resolve` → `void_ratings`
