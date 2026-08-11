# Dink Design System

Dink is a pickleball brand: a mobile app for finding games and keeping score, a marketing site, and a paddle line. The system is built around one idea — **the ball is always in play**. Motion is not decoration here; a screen without a bouncing ball, a swinging paddle, or a score that pops is off-brand.

## Sources

Four reference images were supplied (`uploads/`): an underwater ball photograph, a Vatic Pro paddle ad, a CRBN paddle poster, and a "Gameday Open Play" flier. They were used as **mood and colour reference only**. Vatic Pro, CRBN and the other marks in those files belong to their owners; none of their logos, wordmarks or layouts were reproduced. No codebase, Figma file or slide deck was provided.

**There is no supplied logo.** The brand name is set in plain type (Anton, uppercase, with a volt full stop) wherever a mark would go — see `guidelines/brand-wordmark.card.html`. Do not draw or invent a mark.

Font files were not supplied either. Anton, Archivo and JetBrains Mono are loaded from Google Fonts as the closest available match to the poster typography (heavy condensed display + sturdy grotesque + tabular mono). **If Dink has licensed typefaces, send them and the substitution can be swapped out in `tokens/fonts.css`.**

---

## Content fundamentals

**Voice.** Confident, plain, a little sporting. Short declaratives. Says the thing and stops.

- Headlines: two or three words per line, uppercase, full stops used as punctuation for rhythm — "PLAY MORE. ENJOY MORE." / "GAMEDAY STARTS TONIGHT."
- Body: second person, present tense — "Find a court, join a game at your level, and keep score without leaving the app."
- Never first-person plural marketing ("We believe…"). Never exclamation marks.

**Casing.** Display type and labels are UPPERCASE. Body is sentence case. Buttons are uppercase with wide tracking ("BOOK A COURT"). Never Title Case Every Word.

**Numbers.** Always numerals, always mono: `11–9`, `4.25 DUPR`, `6:00–9:00 PM`, `₱200`. En dash for scores and ranges.

**Specificity beats enthusiasm.** "2 spots left at Gameville" over "Join the fun". Facts — time, level, price, distance — do the persuading.

**Emoji: never.** The ball, the paddle and the volt colour carry the energy. Unicode is limited to `–` `·` `₱`.

**Sample microcopy.** Empty state: "No games near you tonight. Start one?" · Confirmation: "You're in. Court 3, 7:00 PM." · Error: "Ratings top out at 5.0." · Loading: "Finding courts…"

---

## Visual foundations

**Colour.** One loud accent — **volt** `--volt-400 #C6E82A`, the outdoor-ball yellow-green — on **court green** `--court-900 #0A1C13` or **warm cream** `--cream-50 #FBF8EF`. Carbon `#111110` for type and hard shadows. Baseline blue and kitchen orange are accents only (live state, heat, alerts), never backgrounds. Neutrals are warm; there is no pure grey and no pure black anywhere. Max two background colours per screen or deck.

**Type.** Anton for display (uppercase, `0.88` leading, tight); Archivo 400–800 for everything interface and prose (`1.5` leading); JetBrains Mono for scores, ratings, times and money (tabular figures). Labels and eyebrows are Archivo 700 at 12px with `0.14em` tracking, uppercase.

**Backgrounds.** Flat colour first. Two brand textures: the **ball-hole dot grid** (`--ball-dots`, a drilled-ball pattern used at 25–50% opacity over volt or court green) and a soft radial volt glow behind hero objects. Full-bleed court-green sections alternate with cream ones. Gradients are limited to those two uses — no decorative multi-hue gradients, ever.

**Imagery.** None supplied. Where photography would sit, use court-green fields with the dot texture or the CSS ball/paddle. If real photography is added later, it should be high-contrast and warm-lit — bright volt ball against deep green, a shallow depth of field, no cool blue casts, no grain filters.

**Motion — the core of the brand.**
- Arrivals bounce: `--ease-bounce` (overshoot then settle) for anything appearing — dialogs, toasts, checkmarks, score digits.
- Hits swing: `--ease-swing` (slow load, fast strike, slight recoil) for paddles, toggles and buttons under press.
- Everything else eases out: `--ease-out` for colour, opacity and hover.
- Durations: 90ms press, 160ms hover, 260ms enter/exit, 420ms sheets. Brand loops run longer — 900ms rally, 1400ms spin.
- Named keyframes ship in `tokens/motion.css`: `ds-bounce` (squash-and-stretch arc), `ds-swing`, `ds-rally-x`, `ds-arc-y`, `ds-pulse-ring`, `ds-pop-in`, `ds-marquee`.
- Rule of thumb: **one live brand object per screen** — a bouncing ball, a swinging paddle, or a ticker. Two is noise.
- Loading is never a spinner. It is `RallyLoader`.

**Hover.** Cards lift 3px and deepen their shadow. Buttons lift 1–2px and their hard shadow grows from 4px to 6px. Ghost controls fill with `--cream-100`. Links shift from court green to volt-600. Never opacity-only hovers.

**Press.** Buttons translate `+3px, +3px` into their own shadow, which collapses to zero — the control physically lands. Chips and tiles use a 0.96 scale.

**Focus.** 2px carbon border plus a 3px blue (`--focus-ring`) halo. Never remove it.

**Borders.** Hairline `1px --border-hairline` on quiet surfaces; `2px` carbon on anything interactive; `3px` carbon on the one loud volt block per page. Dark surfaces use `rgba(255,255,255,0.14)`.

**Shadows.** Two systems. Ambient (`--shadow-sm/md/lg`) for surfaces — soft, warm-black, low opacity. **Hard offset** (`--shadow-hard`, `4px 4px 0`) is reserved for buttons and the odd sticker-like tile; it is what makes the brand feel sporting rather than corporate. `--glow-volt` only on carbon.

**Radii.** Nothing is square. Controls and chips are pills; cards are 22px; small tiles 14px; the ball is a circle. `--radius-paddle` echoes the paddle silhouette.

**Cards.** White (or court green in dark contexts), 22px radius, 1px hairline border, near-flat shadow at rest, lift on hover. The volt card is loud and appears at most once per screen.

**Transparency and blur.** Only two places: the sticky site header (`--glass-light` + `--blur-glass`) and status capsules over imagery or court fields (`--glass-dark`). Never blur behind body text; use `--scrim-bottom` for legibility over images.

**Layout.** 1200px max content width, 64px desktop gutters, 24px mobile. 4px spacing base — 16 and 24 do most of the work. Card padding 24. Controls are 34/44/56px tall; nothing tappable goes below 44px. The mobile tab bar and the site header are the only fixed elements.

---

## Iconography

**Lucide** (v0.460, CDN) at 2px stroke, 20px default, 16px inside buttons, 22px in the tab bar. Rounded caps and joins, matching Archivo's soft-but-sturdy feel. No icon assets were supplied, so Lucide is a **flagged substitution** — swap it if Dink has a house set.

Rules: icons never appear without a label except in the tab bar and icon buttons (which carry an accessible `label`). Icons inherit `currentColor`. No filled/duotone mixing. No emoji, ever. Custom brand objects — the ball and the paddle — are components (`Ball`, `Paddle`), not icons, and are never shrunk below 16px.

The `Icon` helper in `ui_kits/app/kit-utils.jsx` renders any Lucide glyph as inline SVG.

---

## Index

| Path | What |
| --- | --- |
| `styles.css` | The one file consumers link; imports everything below |
| `tokens/colors.css` | Ramps + semantic aliases |
| `tokens/typography.css` | Display / text / label / data scales |
| `tokens/spacing.css` | 4px scale, gutters, control heights |
| `tokens/effects.css` | Radii, borders, shadows, glass, ball texture |
| `tokens/motion.css` | Durations, easing curves, all brand keyframes |
| `tokens/fonts.css` | Google Fonts loader + family tokens |
| `guidelines/*.card.html` | 18 foundation specimen cards (Colors, Type, Spacing, Effects, Motion, Brand) |
| `components/brand/` | `Ball`, `Paddle`, `RallyLoader`, `ScoreCounter`, `Marquee` |
| `components/core/` | `Button`, `IconButton`, `Card`, `Badge`, `Tag` |
| `components/forms/` | `Input`, `Select`, `Checkbox`, `Radio`, `Switch` |
| `components/feedback/` | `Dialog`, `Toast`, `Tooltip` |
| `components/navigation/` | `Tabs` |
| `ui_kits/app/` | Mobile app — play feed, court booking, live scoring, profile |
| `ui_kits/web/` | Marketing home page |
| `SKILL.md` | Agent-skill entry point |

**Intentional additions.** No source defined a component inventory, so the standard primitive set was authored. The `brand/` group (Ball, Paddle, RallyLoader, ScoreCounter, Marquee) exists because the brief asks for ball-and-paddle motion to carry the excitement — those five are what make a Dink screen recognisable.
