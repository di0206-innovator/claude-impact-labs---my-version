import type { Metadata } from "next";
import Link from "next/link";

import { generateBudgetScenarios, rankRoadPriorities } from "@/lib/passport/scenarios";
import { formatInr, formatInrShort } from "@/lib/rupee/format";
import { wardSlug } from "@/lib/rupee/slug";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Spend vs Need & Next Rupee — Rasta Hisaab 2.0",
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

  const rankedRoads = rankRoadPriorities(undefined, params.ward);

  return (
    <article className="shell rb-page py-6 sm:py-10 space-y-8 rb-motion-fade-in">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rb-chip rb-chip-neutral">Decision Support Matrix</span>
            <span className="rb-chip rb-chip-held">5 Weighted Dimensions</span>
          </div>
          <Link
            href="/budget"
            className="ux4g-btn ux4g-btn-xs ux4g-btn-outline-primary touch-target text-xs inline-flex items-center gap-1"
          >
            Ward Disparity & Fiscal Equity →
          </Link>
        </div>
        <h1 className="ux4g-display-xs-strong text-[var(--ink)]">Spend vs Need & Next Rupee</h1>
        <p className="ux4g-body-l-default text-[var(--mist)] rb-measure">
          Objective, multi-criteria infrastructure prioritization. Avoid opaque single scores by viewing explicit dimension contributions.
        </p>
      </header>

      <section aria-labelledby="scenarios-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="scenarios-heading" className="ux4g-heading-s-strong text-[var(--ink)]">
            Budget Scenario Simulations
          </h2>
          <span className="text-xs text-[var(--mist)]">Hypothetical Fiscal Envelopes</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 rb-motion-stagger">
          {scenarios.map((sc) => (
            <Link
              key={sc.id}
              href={`/spend-vs-need?scenario=${sc.id}`}
              className={`p-4 rounded border transition-colors text-left flex flex-col justify-between rb-interactive-card ${activeScenario.id === sc.id ? "border-[var(--enamel)] bg-[var(--card)] shadow-sm" : "border-[var(--rule)] bg-[var(--card)] hover:border-[var(--rule-firm)]"}`}
            >
              <div>
                <span className="text-xs font-semibold text-[var(--enamel)] block mb-1">
                  Envelope: {formatInrShort(sc.budgetEnvelopeInr)}
                </span>
                <h3 className="ux4g-body-m-strong text-[var(--ink)]">{sc.title}</h3>
                <p className="text-xs text-[var(--mist)] mt-1 line-clamp-2 leading-relaxed">
                  {sc.description}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[var(--rule)] flex justify-between text-xs">
                <span className="text-[var(--mist)]">Roads Funded:</span>
                <strong className="text-[var(--ink)]">{sc.roadsFundedCount}</strong>
              </div>
            </Link>
          ))}
        </div>

        <div className="p-4 rounded border border-[var(--rule)] bg-[var(--card)] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="ux4g-body-m-strong text-[var(--ink)]">
                Selected Scenario: {activeScenario.title}
              </h3>
              <p className="text-xs text-[var(--mist)]">{activeScenario.description}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-[var(--mist)] block">Projected Allocation:</span>
              <strong className="text-sm font-mono text-[var(--ink)]">
                {formatInr(activeScenario.allocatedInr)} / {formatInr(activeScenario.budgetEnvelopeInr)}
              </strong>
            </div>
          </div>

          <div className="text-xs text-[var(--mist)] italic">
            * Estimates generated via deterministic constraint ranking. Scenarios do not represent approved municipal appropriations.
          </div>
        </div>
      </section>

      <section aria-labelledby="ranking-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="ranking-heading" className="ux4g-heading-s-strong text-[var(--ink)]">
            Corridor Prioritisation Table (Next Rupee)
          </h2>
          <span className="text-xs text-[var(--mist)]">Showing {rankedRoads.length} ranked segments</span>
        </div>

        <div className="rb-table-wrap">
          <table className="rb-data-table">
            <thead>
              <tr>
                <th scope="col" className="text-center">Rank</th>
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
                  <td className="text-center font-bold text-xs text-[var(--mist)]">#{road.rank}</td>
                  <td>
                    <div className="font-semibold text-xs text-[var(--ink)]">{road.roadName}</div>
                    <Link href={`/wards/${wardSlug(road.ward)}`} className="text-[0.6875rem] text-[var(--enamel)] hover:underline">
                      Ward {road.ward}
                    </Link>
                  </td>
                  <td className="text-center">
                    <span className="inline-block px-2 py-0.5 rounded font-bold font-mono text-xs bg-[var(--sheet)] text-[var(--ink)]">
                      {road.compositeScore} / 100
                    </span>
                  </td>
                  <td className="text-[0.6875rem] text-[var(--mist)]">
                    <div>Vuln: {road.dimensions.infrastructureVulnerability.score}, Safety: {road.dimensions.publicSafety.score}</div>
                    <div>Deficit: {road.dimensions.serviceDeficit.score}, Burden: {road.dimensions.maintenanceBurden.score}</div>
                  </td>
                  <td className="text-xs font-medium text-[var(--ink)] max-w-xs">{road.recommendedIntervention}</td>
                  <td className="text-right font-mono text-xs text-[var(--ink)]">{formatInr(road.estCostInr)}</td>
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
