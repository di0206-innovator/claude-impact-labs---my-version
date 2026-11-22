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
      {/* 1. Spatial Disparity Index Card */}
      <div className="p-4 sm:p-5 rounded-xl border border-[var(--rule)] hover:border-[#064E4B] bg-[var(--card)] flex flex-col justify-between transition-all shadow-xs hover:shadow-md rb-interactive-card group">
        <div>
          <div className="flex items-center justify-between text-xs text-[var(--mist)] mb-1.5">
            <span className="font-medium">Spatial Disparity Index</span>
            <span className="font-mono font-bold text-[var(--ink)] bg-[var(--sheet)] px-1.5 py-0.5 rounded border border-[var(--rule)]">
              Gini
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl sm:text-3xl font-mono font-bold text-[var(--ink)]">
              {metrics.giniCoefficient.toFixed(3)}
            </span>
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-[var(--sheet)] text-[var(--ink)] border border-[var(--rule)]">
              {giniLabel}
            </span>
          </div>
          <p className="text-xs text-[var(--mist)] mt-2.5 leading-relaxed">
            Distribution spread of repair expenditure relative to empirical road need across all 24 wards.
          </p>
        </div>
        <div className="mt-4 pt-3 border-t border-[var(--rule)] text-[0.6875rem] text-[var(--mist)] flex items-center justify-between font-mono">
          <span>Spread Delta:</span>
          <strong className="text-[var(--ink)]">{metrics.disparitySpread}% points</strong>
        </div>
      </div>

      {/* 2. Deficit Ward Shortfall (Highlighted Active Card) */}
      <div className="p-4 sm:p-5 rounded-xl border border-[#064E4B] bg-[var(--card)] flex flex-col justify-between transition-all shadow-sm ring-1 ring-[#064E4B]/30 rb-interactive-card group">
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-medium text-[var(--mist)]">Deficit Ward Shortfall</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[var(--vermilion)] uppercase">
              <span className="w-2 h-2 rounded-full bg-[var(--vermilion)] inline-block animate-pulse" />
              Gap
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl sm:text-3xl font-mono font-bold text-[#E85D4A]">
              {formatInrShort(metrics.totalUnderfundedQuantumInr)}
            </span>
          </div>
          <p className="text-xs text-[var(--mist)] mt-2.5 leading-relaxed">
            Cumulative expenditure deficit across wards receiving less than their proportional need share.
          </p>
        </div>
        <div className="mt-4 pt-3 border-t border-[var(--rule)] text-[0.6875rem] text-[var(--mist)] flex items-center justify-between font-mono">
          <span>Total Shortfall:</span>
          <strong className="text-[var(--ink)]">{formatInr(metrics.totalUnderfundedQuantumInr)}</strong>
        </div>
      </div>

      {/* 3. Ward Allocations Card */}
      <div className="p-4 sm:p-5 rounded-xl border border-[var(--rule)] hover:border-[#064E4B] bg-[var(--card)] flex flex-col justify-between transition-all shadow-xs hover:shadow-md rb-interactive-card group">
        <div>
          <div className="flex items-center justify-between text-xs text-[var(--mist)] mb-1.5">
            <span className="font-medium">Ward Allocations</span>
            <span className="font-mono font-bold text-[var(--ink)] bg-[var(--sheet)] px-1.5 py-0.5 rounded border border-[var(--rule)]">
              24 Wards
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900">
              <span className="text-[0.6875rem] text-rose-700 dark:text-rose-300 block font-medium">Critical Deficit</span>
              <strong className="text-base font-mono text-rose-800 dark:text-rose-200">
                {metrics.criticalDeficitWardsCount}
              </strong>
            </div>
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
              <span className="text-[0.6875rem] text-amber-700 dark:text-amber-300 block font-medium">Moderate Deficit</span>
              <strong className="text-base font-mono text-amber-800 dark:text-amber-200">
                {metrics.moderateDeficitWardsCount}
              </strong>
            </div>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
              <span className="text-[0.6875rem] text-emerald-700 dark:text-emerald-300 block font-medium">Equitable</span>
              <strong className="text-base font-mono text-emerald-800 dark:text-emerald-200">
                {metrics.equitableWardsCount}
              </strong>
            </div>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
              <span className="text-[0.6875rem] text-blue-700 dark:text-blue-300 block font-medium">Surplus</span>
              <strong className="text-base font-mono text-blue-800 dark:text-blue-200">
                {metrics.surplusWardsCount}
              </strong>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-[var(--rule)] text-[0.6875rem] text-[var(--mist)] flex items-center justify-between font-mono">
          <span>Deficit Posture:</span>
          <strong className="text-rose-700 dark:text-rose-400 font-bold">
            {metrics.criticalDeficitWardsCount + metrics.moderateDeficitWardsCount} wards
          </strong>
        </div>
      </div>

      {/* 4. Allocation Extremes Card */}
      <div className="p-4 sm:p-5 rounded-xl border border-[var(--rule)] hover:border-[#064E4B] bg-[var(--card)] flex flex-col justify-between transition-all shadow-xs hover:shadow-md rb-interactive-card group">
        <div>
          <div className="flex items-center justify-between text-xs text-[var(--mist)] mb-1.5">
            <span className="font-medium">Allocation Extremes</span>
            <span className="font-mono font-bold text-[var(--ink)] bg-[var(--sheet)] px-1.5 py-0.5 rounded border border-[var(--rule)]">
              Polarity
            </span>
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
            <div className="text-xs pt-1.5 border-t border-[var(--rule)]">
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
        <div className="mt-4 pt-3 border-t border-[var(--rule)] text-[0.6875rem] text-[var(--mist)] flex items-center justify-between font-mono">
          <span>Max Shortfall:</span>
          <strong className="text-rose-600 font-bold">{formatInrShort(metrics.maxDeficitWard.shortfallInr)}</strong>
        </div>
      </div>
    </div>
  );
}
