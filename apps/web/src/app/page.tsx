import { MarketingHome } from "@/components/marketing/MarketingHome";
import { getPublicFeatureFlags } from "@/lib/feature-flags";
import { logInfo } from "@/lib/logger";

export default async function HomePage() {
  const flags = await getPublicFeatureFlags();

  // P0-04: marketing sections follow runtime FeatureFlags (with safe defaults).
  const marketingFlags = {
    city: "Angeles City",
    showPricing: flags.show_pricing,
    showTestimonials: flags.show_testimonials,
    showCompete: flags.show_compete,
    showCoaching: flags.show_coaching,
    paymentsStub: flags.payments_stub,
  } as const;

  logInfo("page.home.render", {
    ...marketingFlags,
    note: "P0-04 feature flags wired into marketing",
  });

  return <MarketingHome {...marketingFlags} />;
}
