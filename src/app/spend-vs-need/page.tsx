import type { Metadata } from "next";
import Link from "next/link";

import { WardQuadrantMatrix } from "@/components/budget/WardQuadrantMatrix";
import { generateBudgetScenarios, rankRoadPriorities } from "@/lib/passport/scenarios";
import { getSpendVsNeedReport } from "@/lib/priority/score";
import { formatInr, formatInrShort } from "@/lib/rupee/format";
import { wardSlug } from "@/lib/rupee/slug";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Spend vs Need & Next Rupee — Rastabaaz",
  description:
    "Transparent 5-dimension infrastructure prioritisation and budget scenario simulations for Mumbai's roads.",
};

type PageProps = {
  searchParams: Promise<{ scenario?: string; ward?: string }>;
};

export default async function SpendVsNeedPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const scenarios = generateBudgetScenarios();
  const selectedScenarioId = params.scenario || "balanced";
  const activeScenario = scenarios.find((s) => s.id === selectedScenarioId) ?? scenarios[1];

  const report = getSpendVsNeedReport();
  const rankedRoads = rankRoadPriorities(undefined, params.ward);

  return (
    <article className="shell rb-page py-6 sm:py-10 space-y-8 rb-motion-fade-in">
      {/* Editorial #064E4B Dark Teal Hero Header */}
      <header className="relative overflow-hidden rounded-2xl bg-[#064E4B] text-white p-6 sm:p-10 shadow-xl rb-parallax-hero">
        <div className="relative z-10 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-white/10 text-[#DDF4F1] border border-white/15">
                Decision Support Matrix
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-[#0E7C66]/40 text-[#DDF4F1] border border-[#0E7C66]/50">
                5 Weighted Dimensions
              </span>
            </div>
            <Link
              href="/budget"
              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-medium text-white/90 bg-white/10 hover:bg-white/20 border border-white/20 transition-all touch-target"
            >
              Ward Disparity & Fiscal Equity →
            </Link>
          </div>

          <div className="space-y-3 max-w-3xl">
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-white leading-[1.12]">
              Spend vs Need & Next Rupee
            </h1>
            <p className="text-sm sm:text-base text-[#DDF4F1]/90 leading-relaxed max-w-2xl">
              Objective, multi-criteria infrastructure prioritisation. Avoid opaque single scores by viewing explicit dimension contributions and simulated fiscal envelopes.
            </p>
          </div>

          {/* Frosted Hairline KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-white/15">
            <div className="p-3.5 rounded-xl bg-white/[0.07] border border-white/15 backdrop-blur-md">
              <span className="text-[0.6875rem] font-medium tracking-wide uppercase text-[#DDF4F1]/80 block">
                Evaluated Segments
              </span>
              <span className="text-xl sm:text-2xl font-mono font-bold text-white mt-0.5 block">
                {rankedRoads.length}
              </span>
              <span className="text-[0.625rem] text-white/60">Ranked by 5-axis need</span>
            </div>
            <div className="p-3.5 rounded-xl bg-white/[0.07] border border-white/15 backdrop-blur-md">
              <span className="text-[0.6875rem] font-medium tracking-wide uppercase text-[#DDF4F1]/80 block">
                Active Envelope
              </span>
              <span className="text-xl sm:text-2xl font-mono font-bold text-[#DDF4F1] mt-0.5 block">
                {formatInrShort(activeScenario.budgetEnvelopeInr)}
              </span>
              <span className="text-[0.625rem] text-white/60">{activeScenario.title}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-white/[0.07] border border-white/15 backdrop-blur-md">
              <span className="text-[0.6875rem] font-medium tracking-wide uppercase text-[#DDF4F1]/80 block">
                Projected Funded
              </span>
              <span className="text-xl sm:text-2xl font-mono font-bold text-white mt-0.5 block">
                {activeScenario.roadsFundedCount} Roads
              </span>
              <span className="text-[0.625rem] text-white/60">Deterministic allocation</span>
            </div>
            <div className="p-3.5 rounded-xl bg-white/[0.07] border border-white/15 backdrop-blur-md">
              <span className="text-[0.6875rem] font-medium tracking-wide uppercase text-[#DDF4F1]/80 block">
                Gini Disparity Index
              </span>
              <span className="text-xl sm:text-2xl font-mono font-bold text-white mt-0.5 block">
                {report.metrics.giniCoefficient.toFixed(3)}
              </span>
              <span className="text-[0.625rem] text-white/60">{report.metrics.disparitySpread}% Spread Delta</span>
            </div>
          </div>
        </div>
      </header>

      {/* Clinical Alabaster Quadrant & Scatter Breakdown */}
      <WardQuadrantMatrix wards={report.wards} />

      {/* Budget Scenario Simulations */}
      <section aria-labelledby="scenarios-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="scenarios-heading" className="ux4g-heading-s-strong text-[var(--ink)]">
            Budget Scenario Simulations
          </h2>
          <span className="text-xs text-[var(--mist)]">Hypothetical Fiscal Envelopes</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 rb-motion-stagger">
          {scenarios.map((sc) => {
            const isActive = activeScenario.id === sc.id;
            return (
              <Link
                key={sc.id}
                href={`/spend-vs-need?scenario=${sc.id}`}
                className={`p-4 rounded-xl border transition-all text-left flex flex-col justify-between rb-interactive-card ${
                  isActive
                    ? "border-[#064E4B] bg-[var(--card)] shadow-md ring-1 ring-[#064E4B]"
                    : "border-[var(--rule)] bg-[var(--card)] hover:border-[var(--rule-firm)]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono font-semibold text-[#064E4B] block">
                      Envelope: {formatInrShort(sc.budgetEnvelopeInr)}
                    </span>
                    {isActive ? (
                      <span className="inline-flex items-center gap-1 text-[0.625rem] font-bold text-[var(--vermilion)] uppercase">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--vermilion)] inline-block" /> Active
                      </span>
                    ) : null}
                  </div>
                  <h3 className="ux4g-body-m-strong text-[var(--ink)]">{sc.title}</h3>
                  <p className="text-xs text-[var(--mist)] mt-1 line-clamp-2 leading-relaxed">
                    {sc.description}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[var(--rule)] flex justify-between text-xs">
                  <span className="text-[var(--mist)]">Roads Funded:</span>
                  <strong className="text-[var(--ink)] font-mono">{sc.roadsFundedCount}</strong>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="p-4 rounded-xl border border-[var(--rule)] bg-[var(--card)] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="ux4g-body-m-strong text-[var(--ink)] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--vermilion)]" />
                Selected Scenario: {activeScenario.title}
              </h3>
              <p className="text-xs text-[var(--mist)] mt-0.5">{activeScenario.description}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-[var(--mist)] block">Projected Allocation:</span>
              <strong className="text-sm font-mono text-[var(--ink)]">
                {formatInr(activeScenario.allocatedInr)} / {formatInr(activeScenario.budgetEnvelopeInr)}
              </strong>
            </div>
          </div>

          <div className="text-xs text-[var(--mist)] italic pt-2 border-t border-[var(--rule)]">
            * Estimates generated via deterministic constraint ranking. Scenarios do not represent approved municipal appropriations.
          </div>
        </div>
      </section>

      {/* Hairline Corridor Prioritisation Table */}
      <section aria-labelledby="ranking-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="ranking-heading" className="ux4g-heading-s-strong text-[var(--ink)]">
            Corridor Prioritisation Table (Next Rupee)
          </h2>
          <span className="text-xs text-[var(--mist)] font-mono">Showing {rankedRoads.length} ranked segments</span>
        </div>

        <div className="rb-table-wrap border border-[var(--rule)] rounded-xl bg-[var(--card)] overflow-hidden">
          <table className="rb-data-table w-full">
            <thead>
              <tr>
                <th scope="col" className="text-center w-12">Rank</th>
                <th scope="col">Road & Ward</th>
                <th scope="col" className="text-center">Priority Score</th>
                <th scope="col">Dimension Contribution</th>
                <th scope="col">Recommended Method</th>
                <th scope="col" className="text-right">Est Cost INR</th>
                <th scope="col" className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rankedRoads.slice(0, 25).map((road) => (
                <tr key={road.roadId} className="hover:bg-[var(--sheet)] transition-colors">
                  <td className="text-center font-bold text-xs text-[var(--mist)] font-mono">#{road.rank}</td>
                  <td>
                    <div className="font-semibold text-xs text-[var(--ink)]">{road.roadName}</div>
                    <Link href={`/wards/${wardSlug(road.ward)}`} className="text-[0.6875rem] text-[#064E4B] hover:underline font-mono">
                      Ward {road.ward}
                    </Link>
                  </td>
                  <td className="text-center">
                    <span className="inline-block px-2 py-0.5 rounded font-bold font-mono text-xs bg-[var(--sheet)] text-[var(--ink)] border border-[var(--rule)]">
                      {road.compositeScore} / 100
                    </span>
                  </td>
                  <td className="text-[0.6875rem] text-[var(--mist)] font-mono">
                    <div>Vuln: {road.dimensions.infrastructureVulnerability.score}, Safety: {road.dimensions.publicSafety.score}</div>
                    <div>Deficit: {road.dimensions.serviceDeficit.score}, Burden: {road.dimensions.maintenanceBurden.score}</div>
                  </td>
                  <td className="text-xs font-medium text-[var(--ink)] max-w-xs">{road.recommendedIntervention}</td>
                  <td className="text-right font-mono text-xs text-[var(--ink)] font-semibold">{formatInr(road.estCostInr)}</td>
                  <td className="text-right">
                    <Link
                      href={`/roads/${road.roadId}`}
                      className="ux4g-btn ux4g-btn-s ux4g-btn-outline-primary touch-target text-xs inline-flex items-center"
                    >
                      View Passport
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </article>
  );
}
