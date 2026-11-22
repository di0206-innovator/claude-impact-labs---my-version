import type { Metadata } from "next";

import { SceneHero } from "@/components/landing/SceneHero";
import { SceneMetrics } from "@/components/landing/SceneMetrics";
import { SceneManifesto } from "@/components/landing/SceneManifesto";
import { ScenePillars } from "@/components/landing/ScenePillars";
import { SceneLifecycle } from "@/components/landing/SceneLifecycle";
import { SceneLedgerPreview } from "@/components/landing/SceneLedgerPreview";
import { SceneInsights } from "@/components/landing/SceneInsights";
import { formatInrShort, getRupee } from "@/lib/rupee";
import "@/styles/landing.css";

export const metadata: Metadata = {
  title: "Rastabaaz — Mumbai Monsoon Road Accountability",
  description:
    "Follow every rupee across Mumbai's 24 BMC wards — from pothole report to work order audit and 30-day road durability.",
};

export default function HomePage() {
  const rupee = getRupee();
  const { overview, flags } = rupee;
  const billedInrFormatted = formatInrShort(overview.spentInr);

  return (
    <div className="rb-landing-wrapper">
      <SceneHero
        wardsCount={overview.wards.length}
        ordersCount={overview.orders}
        billedInrFormatted={billedInrFormatted}
        flaggedCount={flags.length}
      />

      <SceneMetrics
        wardsCount={overview.wards.length}
        ordersCount={overview.orders}
        billedInrFormatted={billedInrFormatted}
        flaggedCount={flags.length}
      />

      <SceneManifesto />

      <ScenePillars />

      <SceneLifecycle />

      <SceneLedgerPreview wards={overview.wards} />

      <SceneInsights />
    </div>
  );
}
