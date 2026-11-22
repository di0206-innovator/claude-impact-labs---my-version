import Link from "next/link";
import type { CityDisparityMetrics } from "@/lib/priority/types";
import { formatInr, formatInrShort } from "@/lib/rupee/format";
import { wardSlug } from "@/lib/rupee/slug";

type Props = {
  metrics: CityDisparityMetrics;
};

export function DisparitySummaryCards({ metrics }: Props) {
  const giniLabel =
    metrics.giniCoefficient < 0.15
      ? "Low Inequity"
      : metrics.giniCoefficient < 0.25
        ? "Moderate Inequity"
        : "Significant Inequity";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Gini Coefficient Card */}
      <div className="p-4 rounded border border-[var(--rule)] bg-[var(--card)] flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-[var(--mist)] mb-1">
            <span>Spatial Disparity Index</span>
            <span className="font-semibold text-[var(--ink)]">Gini</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="ux4g-display-xs-strong font-mono text-[var(--ink)]">
              {metrics.giniCoefficient.toFixed(3)}
            </span>
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-[var(--sheet)] text-[var(--ink)] border border-[var(--rule)]">
              {giniLabel}
            </span>
          </div>
          <p className="text-xs text-[var(--mist)] mt-2 leading-relaxed">
            Distribution spread of repair expenditure relative to empirical road need across all 24 wards.
          </p>
        </div>
        <div className="mt-3 pt-3 border-t border-[var(--rule)] text-[0.6875rem] text-[var(--mist)]">
          Spread: {metrics.disparitySpread}% point delta
        </div>
      </div>

      {/* 2. Unfunded Need Quantum */}
      <div className="p-4 rounded border border-[var(--rule)] bg-[var(--card)] flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-[var(--mist)] mb-1">
            <span>Deficit Ward Shortfall</span>
            <span className="font-semibold text-rose-600 dark:text-rose-400">Gap</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="ux4g-display-xs-strong font-mono text-rose-600 dark:text-rose-400">
              {formatInrShort(metrics.totalUnderfundedQuantumInr)}
            </span>
          </div>
          <p className="text-xs text-[var(--mist)] mt-2 leading-relaxed">
            Cumulative expenditure deficit across wards receiving less than their proportional need share.
          </p>
        </div>
        <div className="mt-3 pt-3 border-t border-[var(--rule)] text-[0.6875rem] text-[var(--mist)] font-mono">
          Total: {formatInr(metrics.totalUnderfundedQuantumInr)}
        </div>
      </div>

      {/* 3. Ward Status Counts */}
      <div className="p-4 rounded border border-[var(--rule)] bg-[var(--card)] flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-[var(--mist)] mb-1">
            <span>Ward Allocations</span>
            <span className="font-semibold text-[var(--ink)]">24 Wards</span>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="p-2 rounded bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900">
              <span className="text-[0.6875rem] text-rose-700 dark:text-rose-300 block">Critical Deficit</span>
              <strong className="text-sm font-mono text-rose-800 dark:text-rose-200">
                {metrics.criticalDeficitWardsCount}
              </strong>
            </div>
            <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
              <span className="text-[0.6875rem] text-amber-700 dark:text-amber-300 block">Moderate Deficit</span>
              <strong className="text-sm font-mono text-amber-800 dark:text-amber-200">
                {metrics.moderateDeficitWardsCount}
              </strong>
            </div>
            <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
              <span className="text-[0.6875rem] text-emerald-700 dark:text-emerald-300 block">Equitable</span>
              <strong className="text-sm font-mono text-emerald-800 dark:text-emerald-200">
                {metrics.equitableWardsCount}
              </strong>
            </div>
            <div className="p-2 rounded bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
              <span className="text-[0.6875rem] text-blue-700 dark:text-blue-300 block">Surplus</span>
              <strong className="text-sm font-mono text-blue-800 dark:text-blue-200">
                {metrics.surplusWardsCount}
              </strong>
            </div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-[var(--rule)] text-[0.6875rem] text-[var(--mist)]">
          {metrics.criticalDeficitWardsCount + metrics.moderateDeficitWardsCount} wards in deficit posture
        </div>
      </div>

      {/* 4. Extremes Spotlight */}
      <div className="p-4 rounded border border-[var(--rule)] bg-[var(--card)] flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-[var(--mist)] mb-1">
            <span>Allocation Extremes</span>
            <span className="font-semibold text-[var(--ink)]">Polarity</span>
          </div>
          <div className="space-y-2 mt-2">
            <div className="text-xs">
              <span className="text-[var(--mist)] block text-[0.6875rem]">Greatest Deficit:</span>
              <Link
                href={`/wards/${wardSlug(metrics.maxDeficitWard.wardCode)}`}
                className="font-semibold text-rose-600 dark:text-rose-400 hover:underline inline-flex items-center gap-1"
              >
                Ward {metrics.maxDeficitWard.wardCode} ({metrics.maxDeficitWard.wardName})
              </Link>
              <div className="font-mono text-[0.6875rem] text-[var(--mist)]">
                {metrics.maxDeficitWard.deficitPct > 0 ? `+${metrics.maxDeficitWard.deficitPct}%` : `${metrics.maxDeficitWard.deficitPct}%`} disparity ({formatInrShort(metrics.maxDeficitWard.shortfallInr)} deficit)
              </div>
            </div>
            <div className="text-xs pt-1 border-t border-[var(--rule)]">
              <span className="text-[var(--mist)] block text-[0.6875rem]">Greatest Surplus:</span>
              <Link
                href={`/wards/${wardSlug(metrics.maxSurplusWard.wardCode)}`}
                className="font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
              >
                Ward {metrics.maxSurplusWard.wardCode} ({metrics.maxSurplusWard.wardName})
              </Link>
              <div className="font-mono text-[0.6875rem] text-[var(--mist)]">
                +{metrics.maxSurplusWard.surplusPct}% disparity ({formatInrShort(metrics.maxSurplusWard.excessInr)} excess)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
