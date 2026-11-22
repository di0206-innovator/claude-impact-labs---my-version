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
    <div className="shell rb-page rb-contractors rb-motion-fade-in">
      <h1 className="ux4g-display-xs-strong">Who did the work, and did it hold?</h1>
      <p className="ux4g-body-l-default ux4g-text-neutral-secondary ux4g-mt-xs rb-measure">
        {cards.length} contractors, scored against what is fair for the same work in the same conditions. 50 means
        exactly as expected.
      </p>

      <dl className="rb-city-facts ux4g-mt-m">
        <div>
          <dt>Jobs</dt>
          <dd>{city.jobs.toLocaleString("en-IN")}</dd>
        </div>
        <div>
          <dt>Came back in 30 days</dt>
          <dd>{pct(city.reopenRate)}</dd>
        </div>
        <div>
          <dt>Missed the time limit</dt>
          <dd>{pct(city.slaMissRate)}</dd>
        </div>
      </dl>

      <ScoreHow kind="contractor" className="ux4g-mt-m" />

      <div className="ux4g-mt-m">
        <ContractorRankList cards={cards} flagsById={flagsById} />
      </div>
    </div>
  );
}
