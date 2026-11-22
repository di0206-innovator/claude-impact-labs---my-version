import type { Metadata } from "next";

import { SceneHero } from "@/components/landing/SceneHero";
import { SceneMetrics } from "@/components/landing/SceneMetrics";
import { SceneManifesto } from "@/components/landing/SceneManifesto";
import { ScenePillars } from "@/components/landing/ScenePillars";
import { SceneLifecycle } from "@/components/landing/SceneLifecycle";
import { SceneLedgerPreview } from "@/components/landing/SceneLedgerPreview";
import { SceneInsights } from "@/components/landing/SceneInsights";
import { ReportForm } from "@/components/report/ReportForm";
import { parseIssueType } from "@/lib/issue-type-param";
import { formatInrShort, getRupee } from "@/lib/rupee";
import "@/styles/landing.css";

export const metadata: Metadata = {
  title: "Report a road problem",
  description:
    "Photograph a pothole, waterlogging or open manhole in Mumbai. Your report joins the ward's repair money trail.",
};

type HomePageProps = {
  searchParams: Promise<{ type?: string | string[] }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const { type } = await searchParams;
  const initialIssueType = parseIssueType(type);
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

      {/* Accessible above-the-fold citizen intake fold */}
      <div id="report-entry" className="rb-landing-report-fold">
        <div className="shell-narrow rb-home rb-motion-fade-in">
          <h1 className="rb-flow-title rb-landing-report-title">Report a road problem</h1>
          <p className="sr-only">
            Photograph a pothole, waterlogging or open manhole in Mumbai. Your report joins the ward&apos;s repair money trail.
          </p>
          <ReportForm initialIssueType={initialIssueType} />
        </div>
      </div>

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
