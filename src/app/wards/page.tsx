import type { Metadata } from "next";
import Link from "next/link";

import { OutcomeBar } from "@/components/rupee/OutcomeBar";
import { ScoreHow } from "@/components/rupee/ScoreHow";
import { WardRankList } from "@/components/rupee/WardRankList";
import { formatInrShort, getRupee, nextRupee } from "@/lib/rupee";
import type { NextRupeeItem } from "@/lib/rupee/types";
import { moneyScore } from "@/lib/rupee/slug";

export const metadata: Metadata = {
  title: "Ward money trail",
  description:
    "Mumbai's 24 wards: what each spent on monsoon road repairs, how much held up, and how much needs an explanation.",
};

const SORTS = [
  { key: "best", label: "Best first" },
  { key: "worst", label: "Worst first" },
  { key: "code", label: "A–Z" },
] as const;

type Sort = (typeof SORTS)[number]["key"];

type Props = { searchParams: Promise<{ sort?: string }> };

export default async function WardsPage({ searchParams }: Props) {
  const { overview, ds, flags } = getRupee();
  const asked = (await searchParams).sort;
  const sort: Sort = SORTS.some((option) => option.key === asked)
    ? (asked as Sort)
    : "best";
  const byScore = [...overview.wards].sort(
    (x, y) => moneyScore(y) - moneyScore(x),
  );
  const rankOf = new Map(byScore.map((row, i) => [row.code, i + 1]));
  const fixFirst = new Map<string, NextRupeeItem>();
  for (const row of overview.wards) {
    const top = nextRupee(ds, flags, row.code, 1)[0];
    if (top) fixFirst.set(row.code, top);
  }
  const wards =
    sort === "best"
      ? byScore
      : sort === "worst"
        ? [...byScore].reverse()
        : overview.wards;

  return (
    <div className="shell rb-page rb-motion-fade-in">
      <h1 className="ux4g-display-xs-strong">
        Where the monsoon road money went
      </h1>
      <p className="ux4g-body-l-default ux4g-text-neutral-secondary ux4g-mt-xs rb-measure">
        Mumbai&apos;s wards spent {formatInrShort(overview.spentInr)} on{" "}
        {overview.orders.toLocaleString("en-IN")} road and drain repairs this
        monsoon, against a budget of {formatInrShort(overview.budgetInr)}.
      </p>

      <div className="rb-wards-layout ux4g-mt-l">
        <section
          className="ux4g-card ux4g-card-solid ux4g-card-vertical rb-wards-city"
          aria-labelledby="city-heading"
        >
          <div className="ux4g-card-header">
            <h2 id="city-heading" className="ux4g-heading-xs-strong">
              All wards together
            </h2>
          </div>
          <div className="ux4g-card-body">
            <OutcomeBar
              outcome={overview.outcome}
              spentInr={overview.spentInr}
              budgetInr={overview.budgetInr}
              label="Citywide monsoon road spend by outcome"
            />
          </div>
        </section>

        <section className="rb-wards-list" aria-labelledby="all-heading">
          <div className="rb-list-head">
            <h2 id="all-heading" className="ux4g-title-l-strong">
              {overview.wards.length} wards, ranked
            </h2>
            <nav className="rb-sort" aria-label="Sort wards">
              {SORTS.map((option) => (
                <Link
                  key={option.key}
                  href={
                    option.key === "best"
                      ? "/wards"
                      : `/wards?sort=${option.key}`
                  }
                  className={
                    sort === option.key
                      ? "ux4g-filter-chip-m active touch-target"
                      : "ux4g-filter-chip-m touch-target"
                  }
                  aria-current={sort === option.key ? "true" : undefined}
                  scroll={false}
                >
                  {option.label}
                </Link>
              ))}
            </nav>
          </div>
          <p className="ux4g-body-s-default ux4g-text-neutral-secondary ux4g-mt-2xs rb-measure">
            Tap a ward to see where its money went and the first road to fix.
          </p>
          <ScoreHow kind="ward" className="ux4g-mt-xs ux4g-mb-s" />
          <WardRankList rows={wards} rankOf={rankOf} fixFirst={fixFirst} />
        </section>
      </div>
    </div>
  );
}
