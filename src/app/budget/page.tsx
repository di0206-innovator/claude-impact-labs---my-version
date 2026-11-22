import type { Metadata } from "next";
import Link from "next/link";
import { BudgetFilterBar } from "@/components/budget/BudgetFilterBar";
import { DisparitySummaryCards } from "@/components/budget/DisparitySummaryCards";
import { RoadNeedTable } from "@/components/budget/RoadNeedTable";
import { WardDisparityTable } from "@/components/budget/WardDisparityTable";
import { getSpendVsNeedReport } from "@/lib/priority/score";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ward Spend vs Need & Fiscal Equity — Rasta Hisaab 2.0",
  description:
    "Deterministic analysis of municipal road repair spend allocation vs multi-factor citizen need across Mumbai's 24 administrative wards.",
};

type PageProps = {
  searchParams: Promise<{ filter?: string; zone?: string; sort?: string }>;
};

export default async function BudgetPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const currentFilter = params.filter ?? "all";
  const currentZone = params.zone ?? "all";
  const currentSort = params.sort ?? "disparity";

  const report = getSpendVsNeedReport();

  let filteredWards = [...report.wards];

  // Apply Status Filter
  if (currentFilter === "deficit") {
    filteredWards = filteredWards.filter(
      (w) => w.status === "critical_deficit" || w.status === "moderate_deficit",
    );
  } else if (currentFilter === "surplus") {
    filteredWards = filteredWards.filter((w) => w.status === "surplus");
  } else if (currentFilter === "equitable") {
    filteredWards = filteredWards.filter((w) => w.status === "equitable");
  }

  // Apply Zone / Region Filter
  if (currentZone !== "all") {
    if (currentZone === "City") {
      filteredWards = filteredWards.filter((w) => w.zone === "Zone 1" || w.zone === "Zone 2");
    } else if (currentZone === "Western") {
      filteredWards = filteredWards.filter(
        (w) => w.zone === "Zone 3" || w.zone === "Zone 4" || w.zone === "Zone 7",
      );
    } else if (currentZone === "Eastern") {
      filteredWards = filteredWards.filter((w) => w.zone === "Zone 5" || w.zone === "Zone 6");
    } else {
      filteredWards = filteredWards.filter((w) => w.zone === currentZone);
    }
  }

  // Apply Sorting
  if (currentSort === "need") {
    filteredWards.sort((a, b) => b.needScore - a.needScore);
  } else if (currentSort === "spend") {
    filteredWards.sort((a, b) => b.spentInr - a.spentInr);
  } else {
    // Default: disparity (most underfunded first)
    filteredWards.sort((a, b) => a.disparityIndex - b.disparityIndex);
  }

  return (
    <article className="shell rb-page py-6 sm:py-10 space-y-8 rb-motion-fade-in">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rb-chip rb-chip-neutral">Fiscal Equity Matrix</span>
            <span className="rb-chip rb-chip-held">Deterministic 6-Factor Model</span>
            <span className="rb-chip rb-chip-neutral">Gini Disparity Index</span>
          </div>
          <Link
            href="/spend-vs-need"
            className="ux4g-btn ux4g-btn-xs ux4g-btn-outline-primary touch-target text-xs inline-flex items-center gap-1"
          >
            Budget Scenarios & Simulation →
          </Link>
        </div>

        <h1 className="ux4g-display-xs-strong text-[var(--ink)]">
          Ward Spend vs Need & Fiscal Equity
        </h1>
        <p className="ux4g-body-l-default text-[var(--mist)] rb-measure">
          Objective evaluation of municipal monsoon road repair expenditure against empirical citizen need.
          Identifies under-allocated wards and prioritises roads where public investment has lagged behind infrastructure distress.
        </p>
      </header>

      {/* Disparity Summary Cards */}
      <section aria-labelledby="disparity-overview-heading" className="space-y-3">
        <h2 id="disparity-overview-heading" className="sr-only">
          Disparity Overview
        </h2>
        <DisparitySummaryCards metrics={report.metrics} />
      </section>

      {/* Interactive Controls & Ward Rankings */}
      <section aria-labelledby="ward-rankings-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="ward-rankings-heading" className="ux4g-heading-s-strong text-[var(--ink)]">
            Ward Allocations & Disparity Table
          </h2>
          <span className="text-xs text-[var(--mist)]">
            Ranked by allocation deficit (underfunded wards first)
          </span>
        </div>

        <BudgetFilterBar
          currentFilter={currentFilter}
          currentZone={currentZone}
          currentSort={currentSort}
        />

        <WardDisparityTable wards={filteredWards} />
      </section>

      {/* High-Need Deficit Corridors */}
      <RoadNeedTable roads={report.roads} />

      {/* Transparency & Methodology Disclosure */}
      <footer className="p-4 rounded border border-[var(--rule)] bg-[var(--card)] space-y-2 text-xs text-[var(--mist)]">
        <div className="font-semibold text-[var(--ink)]">Methodology & Civic Data Semantics</div>
        <p className="leading-relaxed">
          Need scores are deterministically derived from: citizen complaint volume (30%), 30-day rework failures (25%),
          recorded road accidents (15%), chronic flood hotspots (15%), traffic intensity (10%), and hospital emergency routes (5%).
        </p>
        <p className="leading-relaxed italic">
          * Work order amounts represent billed figures rather than confirmed fiscal disbursements. All calculations are executed deterministically in TypeScript.
          Simulated and synthetic research figures are used for demonstration.
        </p>
      </footer>
    </article>
  );
}
