import Image from "next/image";
import Link from "next/link";
import { logDebug } from "@/lib/logger";

type Props = {
  city?: string;
  showPricing?: boolean;
  showTestimonials?: boolean;
  /** Unshipped — keep off until leagues exist (P4). */
  showCompete?: boolean;
  /** Coaching marketplace ships in P3; still flag-gated for marketing. */
  showCoaching?: boolean;
  /** From FeatureFlags.payments_stub — honest checkout copy. */
  paymentsStub?: boolean;
};

const FOOTER_MARQUEE_ITEMS = [
  "Find a court",
  "Join a game",
  "Book a slot",
  "Log your score",
] as const;

export function MarketingHome({
  city = "Angeles City",
  showPricing = true,
  showTestimonials = true,
  showCompete = false,
  showCoaching = false,
  paymentsStub = true,
}: Props) {
  // P0-02/P0-03/P0-04: landing reflects shipped surface + runtime flags.
  logDebug("marketing.home.render", {
    city,
    showPricing,
    showTestimonials,
    showCompete,
    showCoaching,
    paymentsStub,
    honesty: "shipped-only",
  });
  logDebug("marketing.footer_marquee.render", {
    items: FOOTER_MARQUEE_ITEMS.length,
    singleLine: true,
  });

  const navItems: Array<[string, string]> = [
    ["#courts", "Courts"],
    ["#games", "Games"],
    ["#venues", "For venues"],
  ];
  if (showCompete) navItems.splice(2, 0, ["#compete", "Compete"]);
  if (showCoaching) navItems.splice(showCompete ? 3 : 2, 0, ["#coaching", "Coaching"]);

  return (
    <div style={{ background: "var(--bg-page)", minHeight: "100vh" }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "var(--glass-light)",
          backdropFilter: "var(--blur-glass)",
          borderBottom: "1px solid var(--border-hairline)",
        }}
      >
        <div
          style={{
            maxWidth: "var(--max-content)",
            margin: "0 auto",
            padding: "0 var(--gutter-page-lg)",
            height: 68,
            display: "flex",
            alignItems: "center",
            gap: 40,
          }}
        >
          <a
            href="#top"
            style={{
              font: "400 30px/1 var(--font-display)",
              textTransform: "uppercase",
              color: "var(--carbon-900)",
              letterSpacing: "0.01em",
            }}
          >
            Dink<span style={{ color: "var(--volt-500)" }}>.</span>
          </a>
          <nav style={{ display: "flex", gap: 26, alignItems: "center", flex: 1 }}>
            {navItems.map(([href, label]) => (
              <a
                key={href}
                href={href}
                style={{
                  font: "700 var(--text-sm)/1 var(--font-sans)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--carbon-800)",
                }}
              >
                {label}
              </a>
            ))}
          </nav>
          <Link href="/signup" className="btn-primary" style={{ height: "var(--control-h-sm)", padding: "0 20px" }}>
            Sign up
          </Link>
        </div>
      </header>

      <section
        id="top"
        style={{
          position: "relative",
          background: "var(--court-900)",
          color: "var(--cream-50)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(90% 70% at 76% 18%, rgba(198,232,42,0.22), transparent 65%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "var(--ball-dots)",
            backgroundSize: "var(--ball-dots-size)",
            opacity: 0.3,
          }}
        />
        <div
          style={{
            position: "relative",
            maxWidth: "var(--max-content)",
            margin: "0 auto",
            padding: "96px var(--gutter-page-lg) 104px",
            display: "grid",
            gridTemplateColumns: "1.1fr 0.9fr",
            gap: 48,
            alignItems: "center",
          }}
          className="hero-grid"
        >
          <div>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 14px",
                borderRadius: "var(--radius-pill)",
                background: "var(--volt-400)",
                color: "var(--carbon-900)",
                font: "var(--label-weight) var(--label-size)/1 var(--font-sans)",
                letterSpacing: "var(--label-tracking)",
                textTransform: "uppercase",
              }}
            >
              Pilot in {city}
            </span>
            <h1
              style={{
                margin: "24px 0 0",
                font: "400 var(--display-xl)/var(--display-leading) var(--font-display)",
                textTransform: "uppercase",
                letterSpacing: "var(--display-tracking)",
              }}
            >
              Find a court.
              <br />
              Find <span style={{ color: "var(--volt-400)" }}>your people.</span>
            </h1>
            <p
              style={{
                margin: "24px 0 0",
                font: "400 var(--text-lg)/var(--text-leading) var(--font-sans)",
                maxWidth: "48ch",
                opacity: 0.84,
              }}
            >
              Browse venues, book a court slot, join a game at your level, and log the score in one
              place. Built for pickleball players in the Philippines.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 34, flexWrap: "wrap" }}>
              <Link href="/play" className="btn-primary" style={{ height: "var(--control-h-lg)", padding: "0 30px" }}>
                Find a game
              </Link>
              <Link
                href="/courts"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  height: "var(--control-h-lg)",
                  padding: "0 30px",
                  borderRadius: "var(--radius-pill)",
                  border: "2px solid rgba(255,255,255,0.3)",
                  font: "700 var(--text-md)/1 var(--font-sans)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "var(--cream-50)",
                }}
              >
                Browse courts
              </Link>
            </div>
            <p
              style={{
                margin: "40px 0 0",
                font: "500 var(--text-sm)/1.5 var(--font-sans)",
                opacity: 0.65,
                maxWidth: "42ch",
              }}
            >
              Early pilot — courts, bookings, and open games are live. Split pay, chat, leagues, and
              coaching are on the roadmap.
            </p>
          </div>
          <div
            style={{
              position: "relative",
              height: 540,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                position: "absolute",
                width: 340,
                height: 340,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(198,232,42,0.24), transparent 66%)",
              }}
            />
            <Image
              src="/marketing/paddle.png"
              alt="Dink paddle"
              width={320}
              height={520}
              style={{
                position: "relative",
                height: 520,
                width: "auto",
                transform: "rotate(-16deg)",
                filter: "drop-shadow(0 26px 40px rgba(10,28,19,0.55))",
              }}
              priority
            />
            <Image
              src="/marketing/ball.png"
              alt="Pickleball"
              width={116}
              height={116}
              style={{
                position: "absolute",
                left: -6,
                top: 50,
                animation: "ds-bounce var(--dur-rally) var(--ease-in-out) infinite",
                filter: "drop-shadow(0 14px 20px rgba(10,28,19,0.5))",
              }}
            />
          </div>
        </div>
      </section>

      <section style={{ maxWidth: "var(--max-content)", margin: "0 auto", padding: "92px var(--gutter-page-lg) 0" }}>
        <div className="label">How it works</div>
        <h2 className="display" style={{ margin: "18px 0 0", maxWidth: "22ch" }}>
          Open Dink.
          <br />
          Get on court.
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginTop: 44 }} className="steps-grid">
          {[
            ["01", "Find a game", "Browse open games by time and skill band, or create one and share the invite code."],
            [
              "02",
              "Reserve the court",
              paymentsStub
                ? "See venue availability, pick a slot, and book. Checkout currently uses pilot (stub) payments."
                : "See venue availability, pick a slot, and book. Live payment checkout is required to confirm.",
            ],
            ["03", "Show up & play", "Meet your group at the court. Roster and booking details stay in the app."],
            ["04", "Log the score", "Enter the result after the match and keep it on your history."],
          ].map(([n, title, body]) => (
            <div key={n} className="card" style={{ padding: "var(--space-6)" }}>
              <div style={{ font: "700 var(--data-md)/1 var(--font-mono)", color: "var(--volt-600)" }}>{n}</div>
              <div style={{ font: "400 24px/0.95 var(--font-display)", textTransform: "uppercase", marginTop: 16 }}>{title}</div>
              <p style={{ margin: "10px 0 0", font: "400 var(--text-sm)/var(--text-leading) var(--font-sans)", color: "var(--text-muted)" }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="courts" style={{ marginTop: 92, background: "var(--surface-sunken)", borderTop: "1px solid var(--border-hairline)", borderBottom: "1px solid var(--border-hairline)" }}>
        <div style={{ maxWidth: "var(--max-content)", margin: "0 auto", padding: "80px var(--gutter-page-lg)" }}>
          <div className="label">Book</div>
          <h2 className="display" style={{ margin: "16px 0 0" }}>Courts near {city}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginTop: 34 }} className="cards-3">
            {[
              ["Clark Paddle Club", "Indoor · 4 courts · 1.3 km", "2 slots", "₱500/hr", "var(--court-500)", "var(--court-900)"],
              ["Pampanga Pickle Center", "Covered · 6 courts · 3.8 km", "5 slots", "₱450/hr", "var(--court-300)", "var(--court-700)"],
              ["Helios Courts Pasig", "Indoor · 8 courts · 9.1 km", "Booked", "₱600/hr", "var(--court-500)", "var(--carbon-900)"],
            ].map(([name, meta, badge, price, c1, c2]) => (
              <Link key={name} href="/courts" className="card" style={{ overflow: "hidden" }}>
                <div style={{ height: 140, background: `linear-gradient(160deg, ${c1}, ${c2})` }} />
                <div style={{ padding: 22 }}>
                  <div style={{ font: "400 24px/0.95 var(--font-display)", textTransform: "uppercase" }}>{name}</div>
                  <div style={{ font: "500 var(--text-sm)/1.5 var(--font-sans)", color: "var(--text-muted)", marginTop: 6 }}>{meta}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18 }}>
                    <span style={{ padding: "6px 12px", borderRadius: "var(--radius-pill)", background: badge === "Booked" ? "var(--cream-200)" : "var(--volt-400)", font: "700 var(--text-xs)/1 var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{badge}</span>
                    <span style={{ font: "700 16px/1 var(--font-mono)" }}>{price}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="games" style={{ position: "relative", background: "var(--court-900)", color: "var(--cream-50)", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "var(--ball-dots)", backgroundSize: "var(--ball-dots-size)", opacity: 0.22 }} />
        <div style={{ position: "relative", maxWidth: "var(--max-content)", margin: "0 auto", padding: "88px var(--gutter-page-lg)", display: "grid", gridTemplateColumns: "1fr 0.85fr", gap: 56, alignItems: "center" }} className="split">
          <div>
            <div style={{ font: "var(--label-weight) var(--label-size)/1 var(--font-sans)", letterSpacing: "var(--label-tracking)", textTransform: "uppercase", color: "var(--volt-400)" }}>Open games</div>
            <h2 style={{ margin: "16px 0 0", font: "400 var(--display-lg)/var(--display-leading) var(--font-display)", textTransform: "uppercase" }}>See who is<br />playing tonight.</h2>
            <p style={{ margin: "20px 0 0", font: "400 var(--text-lg)/var(--text-leading) var(--font-sans)", maxWidth: "46ch", opacity: 0.84 }}>Browse public games with skill band and open spots, join when there is room, or create your own and share an invite code.</p>
            <Link href="/play" className="btn-primary" style={{ marginTop: 30 }}>Join a game</Link>
          </div>
          <div style={{ background: "var(--surface-card-dark)", border: "1px solid var(--border-dark)", borderRadius: "var(--radius-lg)", padding: "var(--space-6)" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--volt-400)", font: "var(--label-weight) var(--label-size)/1 var(--font-sans)", letterSpacing: "var(--label-tracking)", textTransform: "uppercase" }}>Tonight · 7:00 PM</span>
              <span style={{ font: "700 var(--data-sm)/1 var(--font-mono)", color: "var(--kitchen-300)" }}>2 SPOTS</span>
            </div>
            <div style={{ font: "400 30px/0.95 var(--font-display)", textTransform: "uppercase", marginTop: 16 }}>Clark Paddle Club</div>
            <div style={{ opacity: 0.7, marginTop: 6, font: "500 var(--text-sm)/1.5 var(--font-sans)" }}>Doubles · 3.0–3.5 · Court 3</div>
            <div style={{ marginTop: 26, font: "700 var(--text-xl)/1 var(--font-mono)", color: "var(--volt-400)" }}>₱250 <span style={{ font: "500 var(--text-sm)/1 var(--font-sans)", opacity: 0.65, color: "var(--cream-50)" }}>per player</span></div>
          </div>
        </div>
      </section>

      {showCompete && (
        <section id="compete" style={{ maxWidth: "var(--max-content)", margin: "0 auto", padding: "88px var(--gutter-page-lg) 0" }}>
          <div className="label">Compete</div>
          <h2 className="display" style={{ margin: "16px 0 0" }}>Leagues that run<br />without spreadsheets.</h2>
          <p style={{ margin: "20px 0 0", color: "var(--text-muted)", maxWidth: "46ch", font: "400 var(--text-lg)/var(--text-leading) var(--font-sans)" }}>Seasons, divisions, match windows, standings and playoffs in one place.</p>
          <Link href="/compete" className="btn-primary" style={{ marginTop: 28, display: "inline-flex" }}>
            Open compete hub
          </Link>
        </section>
      )}

      {showCoaching && (
        <section id="coaching" style={{ maxWidth: "var(--max-content)", margin: "0 auto", padding: "88px var(--gutter-page-lg) 0" }}>
          <div className="label">Coaching</div>
          <h2 className="display" style={{ margin: "16px 0 0" }}>Book a coach<br />in your city.</h2>
          <p style={{ margin: "20px 0 0", color: "var(--text-muted)", maxWidth: "46ch", font: "400 var(--text-lg)/var(--text-leading) var(--font-sans)" }}>
            Real coach profiles, session requests, and reviews — not placeholder cards.
          </p>
          <Link href="/coaches" className="btn-primary" style={{ marginTop: 28, display: "inline-flex" }}>
            Browse coaches
          </Link>
        </section>
      )}

      <section id="venues" style={{ marginTop: 92, position: "relative", background: "var(--court-900)", color: "var(--cream-50)", overflow: "hidden" }}>
        <div style={{ position: "relative", maxWidth: "var(--max-content)", margin: "0 auto", padding: "88px var(--gutter-page-lg)" }}>
          <div style={{ font: "var(--label-weight) var(--label-size)/1 var(--font-sans)", letterSpacing: "var(--label-tracking)", textTransform: "uppercase", color: "var(--volt-400)" }}>For venue owners</div>
          <h2 style={{ margin: "16px 0 0", font: "400 var(--display-lg)/var(--display-leading) var(--font-display)", textTransform: "uppercase" }}>Fill the empty<br />hours.</h2>
          <p style={{ margin: "20px 0 0", maxWidth: "44ch", opacity: 0.84, font: "400 var(--text-lg)/var(--text-leading) var(--font-sans)" }}>Manage courts, calendar, bookings, and staff from one venue dashboard.</p>
          <Link href="/list-your-venue" className="btn-primary" style={{ marginTop: 34, display: "inline-flex" }}>List your courts</Link>
        </div>
      </section>

      {showPricing && (
        <section style={{ maxWidth: "var(--max-content)", margin: "0 auto", padding: "88px var(--gutter-page-lg) 0" }}>
          <div className="label">Pricing</div>
          <h2 className="display" style={{ margin: "16px 0 0" }}>Playing is free.</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20, marginTop: 40 }} className="cards-3">
            {[
              ["Player", "Free", "Court search, booking, open games, scores, and match history."],
              ["Venue", "Pilot", "Court inventory, calendar, bookings, payments view, and staff accounts."],
            ].map(([title, price, body]) => (
              <div
                key={title}
                className="card"
                style={{
                  padding: 30,
                  background: "var(--surface-card)",
                  border: "1px solid var(--border-hairline)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div style={{ font: "400 28px/0.95 var(--font-display)", textTransform: "uppercase" }}>{title}</div>
                <div style={{ font: "700 var(--data-lg)/1 var(--font-mono)", marginTop: 18 }}>{price}</div>
                <p style={{ margin: "12px 0 0", font: "400 var(--text-sm)/var(--text-leading) var(--font-sans)", color: "var(--text-muted)" }}>{body}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {showTestimonials && (
        <section style={{ maxWidth: "var(--max-content)", margin: "0 auto", padding: "88px var(--gutter-page-lg) 0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }} className="cards-3">
            {[
              ['"I used to juggle group chats just to fill a game. Posting once in Dink is already simpler."', "Ralph, 3.5 · Angeles City"],
              ['"Booking a court and seeing tonight’s open games in one place is what we needed."', "Jenny, 3.0 · Pampanga"],
              ['"Our weekday slots were quiet. Listing courts here helps players find us."', "Marco · Clark Paddle Club"],
            ].map(([quote, by]) => (
              <div key={by} style={{ background: "var(--surface-sunken)", borderRadius: "var(--radius-lg)", padding: 30 }}>
                <p style={{ margin: 0, font: "400 var(--text-lg)/1.45 var(--font-sans)" }}>{quote}</p>
                <div style={{ font: "700 var(--text-sm)/1 var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 22, color: "var(--text-muted)" }}>{by}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section id="download" style={{ maxWidth: "var(--max-content)", margin: "0 auto", padding: "88px var(--gutter-page-lg)" }}>
        <div style={{ position: "relative", background: "var(--volt-400)", border: "3px solid var(--carbon-900)", borderRadius: "var(--radius-xl)", padding: "60px 52px", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: "var(--ball-dots)", backgroundSize: "var(--ball-dots-size)", opacity: 0.35 }} />
          <div style={{ position: "relative" }}>
            <h2 style={{ margin: 0, font: "400 var(--display-lg)/var(--display-leading) var(--font-display)", textTransform: "uppercase" }}>Gameday<br />starts tonight.</h2>
            <p style={{ margin: "18px 0 0", font: "500 var(--text-lg)/1.5 var(--font-sans)", maxWidth: "42ch" }}>Create an account, find a court or an open game near {city}, and get on court.</p>
            <div style={{ display: "flex", gap: 12, marginTop: 30, flexWrap: "wrap" }}>
              <Link href="/signup" style={{ display: "inline-flex", alignItems: "center", height: "var(--control-h-lg)", padding: "0 30px", borderRadius: "var(--radius-pill)", background: "var(--carbon-900)", color: "var(--cream-50)", border: "2px solid var(--carbon-900)", font: "700 var(--text-md)/1 var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Sign up</Link>
              <Link href="/login" className="btn-secondary">Log in</Link>
            </div>
          </div>
        </div>
      </section>

      <footer style={{ background: "var(--carbon-900)", color: "var(--cream-50)" }}>
        <div
          style={{
            background: "var(--volt-400)",
            color: "var(--carbon-900)",
            height: 48,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            borderTop: "2px solid var(--carbon-900)",
            borderBottom: "2px solid var(--carbon-900)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "nowrap",
              alignItems: "center",
              gap: 48,
              width: "max-content",
              height: "100%",
              paddingLeft: 48,
              animation: "ds-marquee 18s linear infinite",
              font: "700 var(--text-sm)/1 var(--font-sans)",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              whiteSpace: "nowrap",
              // Override global `text-wrap: pretty` so the ticker stays one line.
              textWrap: "nowrap",
            }}
          >
            {Array.from({ length: 3 }).flatMap((_, copy) =>
              FOOTER_MARQUEE_ITEMS.flatMap((label, i) => [
                <span
                  key={`m-${copy}-${i}`}
                  style={{ flex: "none", whiteSpace: "nowrap", textWrap: "nowrap", lineHeight: 1 }}
                >
                  {label}
                </span>,
                <span key={`d-${copy}-${i}`} style={{ flex: "none", lineHeight: 1 }} aria-hidden>
                  ·
                </span>,
              ]),
            )}
          </div>
        </div>
        <div style={{ maxWidth: "var(--max-content)", margin: "0 auto", padding: "60px var(--gutter-page-lg)" }}>
          <div style={{ font: "400 34px/1 var(--font-display)", textTransform: "uppercase" }}>Dink<span style={{ color: "var(--volt-400)" }}>.</span></div>
          <p style={{ margin: "14px 0 0", opacity: 0.6, maxWidth: "34ch", font: "400 var(--text-sm)/1.6 var(--font-sans)" }}>Courts and games for pickleball players. Starting in {city}.</p>
        </div>
      </footer>

      <style>{`
        @media (max-width: 960px) {
          .hero-grid, .split, .steps-grid, .cards-3 { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
