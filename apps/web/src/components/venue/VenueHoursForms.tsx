"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApiFetch } from "@/lib/api-client";
import { logInfo } from "@/lib/logger";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Court = { _id: string; name: string };
type AvailabilityRule = {
  _id: string;
  courtId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMin: number;
};
type PricingRule = {
  _id: string;
  courtId?: string;
  days: number[];
  startTime: string;
  endTime: string;
  price: number;
  pricingType: string;
};
type Blackout = {
  _id: string;
  courtId: string;
  startsAt: string;
  endsAt: string;
  reason?: string;
};

export function VenueHoursForms({
  venueId,
  courts,
  availability,
  pricing,
  blackouts,
}: {
  venueId: string;
  courts: Court[];
  availability: AvailabilityRule[];
  pricing: PricingRule[];
  blackouts: Blackout[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(path: string, body: unknown, event: string) {
    setBusy(true);
    setMessage(null);
    try {
      await clientApiFetch(path, { method: "POST", body });
      logInfo(event, body as Record<string, unknown>);
      setMessage("Saved.");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  const courtName = (id: string) => courts.find((c) => c._id === id)?.name || id.slice(0, 8);

  return (
    <div style={{ display: "grid", gap: 28 }}>
      {message && <p className="card" style={{ padding: 14 }}>{message}</p>}

      <section className="card" style={{ padding: 20 }}>
        <h2 style={{ margin: "0 0 12px", font: "400 22px/1 var(--font-display)", textTransform: "uppercase" }}>
          Hours & slot length
        </h2>
        <form
          style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", alignItems: "end" }}
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            void run(
              "/venue/availability-rules",
              {
                venueId,
                courtId: String(fd.get("courtId")),
                dayOfWeek: Number(fd.get("dayOfWeek")),
                startTime: String(fd.get("startTime")),
                endTime: String(fd.get("endTime")),
                slotDurationMin: Number(fd.get("slotDurationMin")),
              },
              "venue.availability.upsert",
            );
            e.currentTarget.reset();
          }}
        >
          <label>
            Court
            <select name="courtId" required defaultValue={courts[0]?._id}>
              {courts.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label>
            Day
            <select name="dayOfWeek" defaultValue={1}>
              {DAYS.map((d, i) => (
                <option key={d} value={i}>{d}</option>
              ))}
            </select>
          </label>
          <label>
            Start
            <input name="startTime" type="time" required defaultValue="06:00" />
          </label>
          <label>
            End
            <input name="endTime" type="time" required defaultValue="22:00" />
          </label>
          <label>
            Slot (min)
            <input name="slotDurationMin" type="number" min={15} max={240} step={15} defaultValue={60} required />
          </label>
          <button className="btn-primary" disabled={busy || !courts.length} style={{ height: 36 }}>
            Add hours
          </button>
        </form>
        <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
          {availability.map((r) => (
            <div key={r._id} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14 }}>
              <span>
                {courtName(r.courtId)} · {DAYS[r.dayOfWeek]} · {r.startTime}–{r.endTime} · {r.slotDurationMin}m
              </span>
              <button
                className="btn-secondary"
                disabled={busy}
                style={{ height: 28, padding: "0 10px", fontSize: 11 }}
                onClick={() =>
                  void run("/venue/availability-rules/remove", { ruleId: r._id }, "venue.availability.remove")
                }
              >
                Remove
              </button>
            </div>
          ))}
          {availability.length === 0 && <p className="admin-muted">No availability rules yet.</p>}
        </div>
      </section>

      <section className="card" style={{ padding: 20 }}>
        <h2 style={{ margin: "0 0 12px", font: "400 22px/1 var(--font-display)", textTransform: "uppercase" }}>
          Pricing
        </h2>
        <form
          style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", alignItems: "end" }}
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const days = DAYS.map((_, i) => i).filter((i) => fd.get(`d${i}`) === "on");
            void run(
              "/venue/pricing-rules",
              {
                venueId,
                courtId: String(fd.get("courtId")) || undefined,
                days: days.length ? days : [0, 1, 2, 3, 4, 5, 6],
                startTime: String(fd.get("startTime")),
                endTime: String(fd.get("endTime")),
                price: Number(fd.get("price")),
                pricingType: String(fd.get("pricingType")),
              },
              "venue.pricing.upsert",
            );
            e.currentTarget.reset();
          }}
        >
          <label>
            Court
            <select name="courtId" defaultValue={courts[0]?._id}>
              {courts.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label>
            Type
            <select name="pricingType" defaultValue="hourly">
              <option value="hourly">Hourly</option>
              <option value="peak">Peak</option>
              <option value="offpeak">Off-peak</option>
            </select>
          </label>
          <label>
            Start
            <input name="startTime" type="time" required defaultValue="06:00" />
          </label>
          <label>
            End
            <input name="endTime" type="time" required defaultValue="22:00" />
          </label>
          <label>
            Price (₱/hr)
            <input name="price" type="number" min={0} step={50} defaultValue={500} required />
          </label>
          <div style={{ gridColumn: "1 / -1", display: "flex", flexWrap: "wrap", gap: 10 }}>
            {DAYS.map((d, i) => (
              <label key={d} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}>
                <input type="checkbox" name={`d${i}`} defaultChecked /> {d}
              </label>
            ))}
          </div>
          <button className="btn-primary" disabled={busy || !courts.length} style={{ height: 36 }}>
            Add price rule
          </button>
        </form>
        <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
          {pricing.map((r) => (
            <div key={r._id} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14 }}>
              <span>
                {r.courtId ? courtName(r.courtId) : "All courts"} · {r.pricingType} ·{" "}
                {r.days.map((d) => DAYS[d]).join(" ")} · {r.startTime}–{r.endTime} · ₱{r.price}
              </span>
              <button
                className="btn-secondary"
                disabled={busy}
                style={{ height: 28, padding: "0 10px", fontSize: 11 }}
                onClick={() => void run("/venue/pricing-rules/remove", { ruleId: r._id }, "venue.pricing.remove")}
              >
                Remove
              </button>
            </div>
          ))}
          {pricing.length === 0 && <p className="admin-muted">No pricing rules yet.</p>}
        </div>
      </section>

      <section className="card" style={{ padding: 20 }}>
        <h2 style={{ margin: "0 0 12px", font: "400 22px/1 var(--font-display)", textTransform: "uppercase" }}>
          Block time
        </h2>
        <p className="admin-muted" style={{ marginTop: 0 }}>
          Blocked windows are hidden from player booking slots.
        </p>
        <form
          style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", alignItems: "end" }}
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            void run(
              "/venue/blackouts",
              {
                venueId,
                courtId: String(fd.get("courtId")),
                startsAt: new Date(String(fd.get("startsAt"))).toISOString(),
                endsAt: new Date(String(fd.get("endsAt"))).toISOString(),
                reason: String(fd.get("reason") || "") || undefined,
              },
              "venue.blackout.create",
            );
            e.currentTarget.reset();
          }}
        >
          <label>
            Court
            <select name="courtId" required defaultValue={courts[0]?._id}>
              {courts.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label>
            Starts
            <input name="startsAt" type="datetime-local" required />
          </label>
          <label>
            Ends
            <input name="endsAt" type="datetime-local" required />
          </label>
          <label>
            Reason
            <input name="reason" type="text" placeholder="Maintenance" />
          </label>
          <button className="btn-primary" disabled={busy || !courts.length} style={{ height: 36 }}>
            Block
          </button>
        </form>
        <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
          {blackouts.map((b) => (
            <div key={b._id} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14 }}>
              <span>
                {courtName(b.courtId)} · {new Date(b.startsAt).toLocaleString()} →{" "}
                {new Date(b.endsAt).toLocaleString()}
                {b.reason ? ` · ${b.reason}` : ""}
              </span>
              <button
                className="btn-secondary"
                disabled={busy}
                style={{ height: 28, padding: "0 10px", fontSize: 11 }}
                onClick={() =>
                  void run("/venue/blackouts/remove", { blackoutId: b._id }, "venue.blackout.remove")
                }
              >
                Remove
              </button>
            </div>
          ))}
          {blackouts.length === 0 && <p className="admin-muted">No blackouts.</p>}
        </div>
      </section>
    </div>
  );
}
