import type { Metadata } from "next";
import Link from "next/link";
import { BudgetFilterBar } from "@/components/budget/BudgetFilterBar";
import { DisparitySummaryCards } from "@/components/budget/DisparitySummaryCards";
import { RoadNeedTable } from "@/components/budget/RoadNeedTable";
import { WardDisparityTable } from "@/components/budget/WardDisparityTable";
import { getSpendVsNeedReport } from "@/lib/priority/score";
import { formatInrShort } from "@/lib/rupee/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ward Spend vs Need & Fiscal Equity — Rastabaaz",
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
      {/* Unified #064E4B Editorial Hero Header */}
      <header className="relative overflow-hidden rounded-2xl bg-[#064E4B] text-white p-6 sm:p-10 shadow-xl rb-parallax-hero">
        <div className="relative z-10 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-white/10 text-[#DDF4F1] border border-white/15">
                Fiscal Equity Matrix
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-[#0E7C66]/40 text-[#DDF4F1] border border-[#0E7C66]/50">
                Deterministic 6-Factor Model
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-white/10 text-[#DDF4F1] border border-white/15">
                Gini Disparity Index
              </span>
            </div>
            <Link
              href="/spend-vs-need"
              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-medium text-white/90 bg-white/10 hover:bg-white/20 border border-white/20 transition-all touch-target"
            >
              Budget Scenarios & Simulation →
            </Link>
          </div>

          <div className="space-y-3 max-w-3xl">
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-white leading-[1.12]">
              Ward Spend vs Need & Fiscal Equity
            </h1>
            <p className="text-sm sm:text-base text-[#DDF4F1]/90 leading-relaxed max-w-2xl">
              Objective evaluation of municipal monsoon road repair expenditure against empirical citizen need.
              Identifies under-allocated wards and prioritises roads where public investment has lagged behind infrastructure distress.
            </p>
          </div>

          {/* Frosted Hairline KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-white/15">
            <div className="p-3.5 rounded-xl bg-white/[0.07] border border-white/15 backdrop-blur-md">
              <span className="text-[0.6875rem] font-medium tracking-wide uppercase text-[#DDF4F1]/80 block">
                Inequality Spread Delta
              </span>
              <span className="text-xl sm:text-2xl font-mono font-bold text-white mt-0.5 block">
                {report.metrics.disparitySpread}%
              </span>
              <span className="text-[0.625rem] text-white/60">Gini coefficient: {report.metrics.giniCoefficient.toFixed(3)}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-white/[0.07] border border-white/15 backdrop-blur-md">
              <span className="text-[0.6875rem] font-medium tracking-wide uppercase text-[#DDF4F1]/80 block">
                Cumulative Funding Gap
              </span>
              <span className="text-xl sm:text-2xl font-mono font-bold text-[#E85D4A] mt-0.5 block">
                {formatInrShort(report.metrics.totalUnderfundedQuantumInr)}
              </span>
              <span className="text-[0.625rem] text-white/60">Underfunded quantum</span>
            </div>
            <div className="p-3.5 rounded-xl bg-white/[0.07] border border-white/15 backdrop-blur-md">
              <span className="text-[0.6875rem] font-medium tracking-wide uppercase text-[#DDF4F1]/80 block">
                Deficit Posture Count
              </span>
              <span className="text-xl sm:text-2xl font-mono font-bold text-white mt-0.5 block">
                {report.metrics.criticalDeficitWardsCount + report.metrics.moderateDeficitWardsCount} / 24
              </span>
              <span className="text-[0.625rem] text-white/60">{report.metrics.criticalDeficitWardsCount} critical deficit</span>
            </div>
            <div className="p-3.5 rounded-xl bg-white/[0.07] border border-white/15 backdrop-blur-md">
              <span className="text-[0.6875rem] font-medium tracking-wide uppercase text-[#DDF4F1]/80 block">
                Downtown Corridor Hub
              </span>
              <span className="text-xl sm:text-2xl font-mono font-bold text-white mt-0.5 block">
                Zone 1 & Zone 2
              </span>
              <span className="text-[0.625rem] text-white/60">A through G/S wards</span>
            </div>
          </div>
        </div>
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
          <span className="text-xs text-[var(--mist)] font-mono">
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
      <footer className="p-4 rounded-xl border border-[var(--rule)] bg-[var(--card)] space-y-2 text-xs text-[var(--mist)] shadow-xs">
        <div className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#064E4B]" />
          Methodology & Civic Data Semantics
        </div>
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
