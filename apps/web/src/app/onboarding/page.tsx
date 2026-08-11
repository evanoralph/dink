import { OnboardingForm } from "@/components/OnboardingForm";
import { AppNav } from "@/components/AppNav";

export default function OnboardingPage() {
  return (
    <>
      <AppNav />
      <main className="app-shell" style={{ display: "grid", placeItems: "center", minHeight: "70vh" }}>
        <OnboardingForm />
      </main>
    </>
  );
}
