import Link from "next/link";
import type { WardSpendVsNeed } from "@/lib/priority/types";
import { formatInr, formatInrShort } from "@/lib/rupee/format";
import { wardSlug } from "@/lib/rupee/slug";

type Props = {
  wards: WardSpendVsNeed[];
};

function StatusBadge({ status }: { status: WardSpendVsNeed["status"] }) {
  switch (status) {
    case "critical_deficit":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[0.6875rem] font-semibold font-mono bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
          Critical Deficit
        </span>
      );
    case "moderate_deficit":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[0.6875rem] font-semibold font-mono bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
          Moderate Deficit
        </span>
      );
    case "surplus":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[0.6875rem] font-semibold font-mono bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
          Over-Allocated
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[0.6875rem] font-semibold font-mono bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
          Equitable
        </span>
      );
  }
}

export function WardDisparityTable({ wards }: Props) {
  if (!wards.length) {
    return (
      <div className="p-8 text-center rounded-xl border border-[var(--rule)] bg-[var(--card)] text-[var(--mist)] text-sm shadow-xs">
        No wards match the selected filters.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="ux4g-heading-s-strong text-[var(--ink)]">
          Ward Spend vs Need Rankings
        </h2>
        <span className="text-xs text-[var(--mist)] font-mono">
          {wards.length} of 24 Wards Listed
        </span>
      </div>

      <div className="rb-table-wrap border border-[var(--rule)] rounded-xl bg-[var(--card)] overflow-hidden shadow-xs">
        <table className="rb-data-table rb-stack w-full">
          <thead>
            <tr>
              <th scope="col" className="text-center w-12">Rank</th>
              <th scope="col">Ward & Zone</th>
              <th scope="col" className="text-center">Need Score</th>
              <th scope="col" className="text-right">Need Share %</th>
              <th scope="col" className="text-right">Spend Share %</th>
              <th scope="col" className="text-center">Spend/Need Ratio</th>
              <th scope="col" className="text-right">Disparity Gap</th>
              <th scope="col" className="text-center">Allocation Posture</th>
              <th scope="col" className="text-right">Billed Spend INR</th>
              <th scope="col" className="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {wards.map((w) => {
              const disparityColor =
                w.disparityIndex < -1.0
                  ? "text-rose-600 dark:text-rose-400 font-semibold"
                  : w.disparityIndex > 1.0
                    ? "text-blue-600 dark:text-blue-400 font-semibold"
                    : "text-[var(--mist)]";

              return (
                <tr key={w.wardCode} className="hover:bg-[var(--sheet)] transition-colors">
                  <td className="text-center font-bold text-xs text-[var(--mist)] font-mono" data-label="Rank">
                    #{w.disparityRank}
                  </td>
                  <td data-label="Ward">
                    <Link
                      href={`/wards/${wardSlug(w.wardCode)}`}
                      className="font-semibold text-xs text-[#064E4B] hover:underline block"
                    >
                      Ward {w.wardCode} — {w.wardName}
                    </Link>
                    <span className="text-[0.6875rem] text-[var(--mist)] font-mono">
                      {w.zone} Zone · {w.roadsCount} roads
                    </span>
                  </td>
                  <td className="text-center" data-label="Need Score">
                    <div className="inline-flex items-center gap-1 font-mono text-xs font-bold text-[var(--ink)]">
                      <span>{w.needScore}</span>
                      <span className="text-[0.6875rem] text-[var(--mist)] font-normal">/100</span>
                    </div>
                  </td>
                  <td className="text-right font-mono text-xs text-[var(--ink)]" data-label="Need Share">
                    {w.needSharePct.toFixed(1)}%
                  </td>
                  <td className="text-right font-mono text-xs text-[var(--ink)]" data-label="Spend Share">
                    {w.spendSharePct.toFixed(1)}%
                  </td>
                  <td className="text-center font-mono text-xs" data-label="Spend/Need Ratio">
                    <span className={`px-1.5 py-0.5 rounded font-mono ${
                      w.spendToNeedRatio < 0.75
                        ? "bg-rose-50 text-rose-700 font-bold border border-rose-200"
                        : w.spendToNeedRatio > 1.25
                          ? "bg-blue-50 text-blue-700 font-bold border border-blue-200"
                          : "text-[var(--ink)]"
                    }`}>
                      {w.spendToNeedRatio.toFixed(2)}x
                    </span>
                  </td>
                  <td className={`text-right font-mono text-xs ${disparityColor}`} data-label="Disparity Gap">
                    {w.disparityIndex > 0 ? `+${w.disparityIndex.toFixed(1)}%` : `${w.disparityIndex.toFixed(1)}%`}
                  </td>
                  <td className="text-center" data-label="Status">
                    <StatusBadge status={w.status} />
                  </td>
                  <td className="text-right font-mono text-xs text-[var(--ink)]" data-label="Billed Spend">
                    <div className="font-semibold">{formatInrShort(w.spentInr)}</div>
                    <div className="text-[0.625rem] text-[var(--mist)]" title={`Full amount: ${formatInr(w.spentInr)}`}>
                      Exp: {formatInrShort(w.expectedSpendInr)}
                    </div>
                  </td>
                  <td className="text-right" data-label="Action">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/wards/${wardSlug(w.wardCode)}`}
                        className="ux4g-btn ux4g-btn-xs ux4g-btn-outline-primary touch-target text-xs inline-flex items-center"
                      >
                        Inspect
                      </Link>
                      {(w.status === "critical_deficit" || w.status === "moderate_deficit") && (
                        <Link
                          href={`/spend-vs-need?ward=${w.wardCode}`}
                          className="ux4g-btn ux4g-btn-xs ux4g-btn-primary touch-target text-xs inline-flex items-center whitespace-nowrap"
                          title={`Simulate forward capital allocation for underfunded Ward ${w.wardCode}`}
                        >
                          Simulate →
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Stage 2 Directing Callout */}
      <div className="p-3.5 rounded-xl border border-[var(--teal-deep)] bg-[#064E4B]/5 text-xs flex flex-wrap items-center justify-between gap-2">
        <span className="text-[var(--ink)]">
          <strong>Stage 1 Diagnosis Complete?</strong> Proceed to Stage 2 to simulate forward capital allocations across road corridors.
        </span>
        <Link
          href="/spend-vs-need"
          className="text-[var(--teal-deep)] font-semibold hover:underline inline-flex items-center gap-1"
        >
          Open Stage 2 Simulator →
        </Link>
      </div>
    </div>
  );
}
