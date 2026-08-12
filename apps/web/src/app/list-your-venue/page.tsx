import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { VenueOnboardWizard } from "@/components/venue/VenueOnboardWizard";
import { getCurrentUser } from "@/lib/auth";
import { logInfo } from "@/lib/logger";

export default async function ListYourVenuePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/list-your-venue");
  }
  logInfo("page.listYourVenue", { userId: user._id });

  return (
    <>
      <AppNav />
      <main
        className="app-shell"
        style={{ minHeight: "80vh", display: "grid", placeItems: "center", padding: "40px 16px" }}
      >
        <div>
          <VenueOnboardWizard />
          <p style={{ marginTop: 16, textAlign: "center", color: "var(--text-muted)" }}>
            Already listed?{" "}
            <Link href="/venue" style={{ color: "var(--court-500)", fontWeight: 700 }}>
              Venue dashboard
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
