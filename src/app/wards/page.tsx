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
    <div className="shell rb-page py-6 sm:py-10 space-y-8 rb-motion-fade-in">
      <header className="rb-editorial-hero space-y-6 rb-parallax-hero">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="rb-chip-dark">
              <span className="rb-status-dot rb-status-dot-vermilion" aria-hidden="true" />
              Ward Directory &amp; Intelligence
            </span>
            <span className="rb-chip-dark rb-chip-dark-held">24 Administrative Wards</span>
            <span className="rb-chip-dark">Monsoon 2025</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif text-white font-normal tracking-tight">
            Where the monsoon road money went
          </h1>
          <p className="rb-editorial-lead text-sm sm:text-base">
            Mumbai&apos;s 24 administrative wards spent {formatInrShort(overview.spentInr)} on{" "}
            {overview.orders.toLocaleString("en-IN")} road and drain repairs this monsoon, against a
            budget allocation of {formatInrShort(overview.budgetInr)}.
          </p>
        </div>

        <dl className="rb-kpi-strip grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/10 rb-motion-stagger">
          <div className="rb-kpi-item">
            <dt className="rb-kpi-label">Wards Monitored</dt>
            <dd className="rb-kpi-val">{overview.wards.length}</dd>
          </div>
          <div className="rb-kpi-item pt-3 sm:pt-0">
            <dt className="rb-kpi-label">Total Amount Billed</dt>
            <dd className="rb-kpi-val">{formatInrShort(overview.spentInr)}</dd>
          </div>
          <div className="rb-kpi-item pt-3 sm:pt-0">
            <dt className="rb-kpi-label">Repair Jobs Count</dt>
            <dd className="rb-kpi-val">{overview.orders.toLocaleString("en-IN")}</dd>
          </div>
          <div className="rb-kpi-item pt-3 sm:pt-0">
            <dt className="rb-kpi-label">Total Budget Allocation</dt>
            <dd className="rb-kpi-val">{formatInrShort(overview.budgetInr)}</dd>
          </div>
        </dl>
      </header>

      <div className="rb-wards-layout">
        <section
          className="bg-[var(--card)] rounded-xl border border-[var(--rule)] p-6 shadow-[var(--card-shadow)] rb-wards-city space-y-4"
          aria-labelledby="city-heading"
        >
          <div className="flex items-center justify-between pb-2 border-b border-[var(--rule)]">
            <h2 id="city-heading" className="ux4g-heading-xs-strong text-[var(--ink)]">
              All wards together
            </h2>
            <span className="text-xs text-[var(--mist)] font-mono">24 Wards</span>
          </div>
          <div>
            <OutcomeBar
              outcome={overview.outcome}
              spentInr={overview.spentInr}
              budgetInr={overview.budgetInr}
              label="Citywide monsoon road spend by outcome"
            />
          </div>
          <div className="pt-2 text-xs text-[var(--mist)] border-t border-[var(--rule)] flex items-center justify-between">
            <span>Audit flags screened</span>
            <span className="font-mono font-semibold text-[var(--ink)]">{flags.length}</span>
          </div>
        </section>

        <section className="rb-wards-list space-y-4" aria-labelledby="all-heading">
          <div className="rb-list-head">
            <h2 id="all-heading" className="ux4g-title-l-strong text-[var(--ink)]">
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
                  className={`touch-target transition-colors text-xs font-semibold px-3 py-1.5 rounded-full border ${
                    sort === option.key
                      ? "rb-pill-vermilion"
                      : "bg-[var(--sheet)] text-[var(--mist)] border-[var(--rule)] hover:border-[var(--rule-firm)]"
                  }`}
                  aria-current={sort === option.key ? "true" : undefined}
                  scroll={false}
                >
                  {option.label}
                </Link>
              ))}
            </nav>
          </div>
          <p className="ux4g-body-s-default text-[var(--mist)] rb-measure">
            Tap a ward to see where its money went and the first road to fix.
          </p>
          <ScoreHow kind="ward" className="ux4g-mt-xs ux4g-mb-s" />
          <WardRankList rows={wards} rankOf={rankOf} fixFirst={fixFirst} />
        </section>
      </div>
    </div>
  );
}
