import type { Metadata } from "next";

import { ContractorRankList } from "@/components/rupee/ContractorRankList";
import { ScoreHow } from "@/components/rupee/ScoreHow";
import { getRupee } from "@/lib/rupee";
import { getScorecards } from "@/lib/rupee/scorecard";
import { pct } from "@/lib/rupee/slug";

export const metadata: Metadata = {
  title: "Contractor scorecards",
  description:
    "Each road contractor scored on whether repairs lasted, whether bills matched the rate card, and whether work finished on time, against what is fair for the work and conditions they took on.",
};

export default function ContractorsPage() {
  const { cards, city } = getScorecards();
  const { flags } = getRupee();
  const flagsById = new Map<string, number>();
  for (const flag of flags) flagsById.set(flag.contractorId, (flagsById.get(flag.contractorId) ?? 0) + 1);

  return (
    <div className="shell rb-page py-6 sm:py-10 space-y-8 rb-contractors rb-motion-fade-in">
      <header className="rb-editorial-hero space-y-6 rb-parallax-hero">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="rb-chip-dark">
              <span className="rb-status-dot rb-status-dot-vermilion" aria-hidden="true" />
              Civic Procurement Audit
            </span>
            <span className="rb-chip-dark rb-chip-dark-held">{cards.length} Empanelled Contractors</span>
            <span className="rb-chip-dark">Bayesian Performance Tiers</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif text-white font-normal tracking-tight">
            Who did the work, and did it hold?
          </h1>
          <p className="rb-editorial-lead text-sm sm:text-base">
            {cards.length} road contractors evaluated on whether repairs held, rate-card fidelity, and completion speed,
            benchmarked against what is fair for the same work in equivalent ward flood environments.
          </p>
        </div>

        <dl className="rb-kpi-strip grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/10 rb-motion-stagger">
          <div className="rb-kpi-item">
            <dt className="rb-kpi-label">Monitored Jobs</dt>
            <dd className="rb-kpi-val">{city.jobs.toLocaleString("en-IN")}</dd>
          </div>
          <div className="rb-kpi-item pt-3 sm:pt-0">
            <dt className="rb-kpi-label">30-Day Reopening Rate</dt>
            <dd className="rb-kpi-val">{pct(city.reopenRate)}</dd>
          </div>
          <div className="rb-kpi-item pt-3 sm:pt-0">
            <dt className="rb-kpi-label">City SLA Miss Rate</dt>
            <dd className="rb-kpi-val">{pct(city.slaMissRate)}</dd>
          </div>
          <div className="rb-kpi-item pt-3 sm:pt-0">
            <dt className="rb-kpi-label">Empanelled Contractors</dt>
            <dd className="rb-kpi-val">{cards.length}</dd>
          </div>
        </dl>
      </header>

      <section className="space-y-4">
        <ScoreHow kind="contractor" />
        <div className="pt-2">
          <ContractorRankList cards={cards} flagsById={flagsById} />
        </div>
      </section>
    </div>
  );
}
